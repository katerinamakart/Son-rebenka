/* Published reference data only. Questionnaire matching never makes requests. */
(function () {
  'use strict';

  const columns = {
    sources: 'id,title,publisher,publication_year,url,is_published',
    age_norms: 'id,age_min_months,age_max_months_exclusive,min_minutes,max_minutes,source_id,is_published',
    guidance: 'id,title,age_min_months,age_max_months_exclusive,trigger_key,parent_explanation,recommendation,caveat,source_ids,evidence_kind,priority,is_published'
  };
  const boundaries = [0, 4, 12, 36, 72, 132];

  function safeSourceUrl(value) {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && !url.username && !url.password ? url.href : null;
    } catch {
      return null;
    }
  }

  async function readPublished(projectUrl, key, table, signal) {
    const url = new URL('/rest/v1/sleep_kb_' + table, projectUrl);
    url.search = new URLSearchParams({select: columns[table], is_published: 'eq.true'});
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      headers: {apikey: key, Accept: 'application/json'},
      signal
    });
    if (!response.ok) throw new Error('Knowledge data unavailable');
    const rows = await response.json();
    if (!Array.isArray(rows)) throw new Error('Unexpected knowledge data');
    return rows.filter(row => row?.is_published === true);
  }

  function validAgeBand(row) {
    return Number.isInteger(row.age_min_months) &&
      Number.isInteger(row.age_max_months_exclusive) &&
      row.age_min_months >= 0 && row.age_max_months_exclusive <= 132 &&
      row.age_min_months < row.age_max_months_exclusive;
  }

  function coversAge(row, months) {
    return months >= row.age_min_months && months < row.age_max_months_exclusive;
  }

  function compile(sourceRows, normRows, ruleRows) {
    const sources = new Map();
    for (const row of sourceRows) {
      const url = safeSourceUrl(row.url);
      if (url && typeof row.id === 'string' && typeof row.title === 'string' && row.title.trim()) {
        const name = [row.publisher || row.title, row.publication_year].filter(Boolean).join(', ');
        sources.set(row.id, {title: row.title, name, url});
      }
    }
    const norms = normRows.filter(row => validAgeBand(row) && sources.has(row.source_id) &&
      Number.isInteger(row.min_minutes) && Number.isInteger(row.max_minutes) &&
      row.min_minutes > 0 && row.max_minutes >= row.min_minutes && row.max_minutes <= 1440)
      .sort((a, b) => a.age_min_months - b.age_min_months);
    const complete = norms.length === boundaries.length - 1 &&
      norms.every((row, i) => row.age_min_months === boundaries[i] &&
        row.age_max_months_exclusive === boundaries[i + 1]);
    const rules = ruleRows.filter(row => validAgeBand(row) && typeof row.id === 'string' &&
      [row.title, row.parent_explanation, row.recommendation].every(value => typeof value === 'string' && value.trim()) &&
      Number.isFinite(row.priority) && Array.isArray(row.source_ids) &&
      row.source_ids.some(id => sources.has(id)));
    if (!complete || !rules.length) throw new Error('Incomplete knowledge data');
    return {sources, norms, rules};
  }

  function matchingTriggers(a, state, mode) {
    const triggers = new Set();
    if (state.breathing === 'yes') triggers.add('sleep_breathing_warning');
    if (state.issue === 'nightcry') triggers.add('night_cry_or_confusion');
    if (state.years === '' || !Number.isInteger(a.m)) {
      triggers.add('sleep_fields_missing');
      return triggers;
    }

    const {d, m} = a;
    if (m < 4) triggers.add('age_under_4_months');
    if (m < 12) triggers.add('infant_safe_sleep_info');
    if (!Number.isFinite(d.total)) triggers.add('sleep_fields_missing');
    else if (m >= 4) {
      if (a.shortage > 0) triggers.add('total_sleep_below');
      else if (a.excess > 0) triggers.add('total_sleep_above');
      else if (state.breathing !== 'yes' && state.issue !== 'nightcry') triggers.add('total_sleep_in_range');
    }
    if (state.issue === 'night' || (m >= 12 && Number(state.nightWakings) >= 3)) {
      triggers.add('frequent_night_wakings');
    }
    if (a.longSettling || state.issue === 'long' || state.settling === 'long') {
      triggers.add('repeated_long_settling');
    }
    if (state.issue === 'separation') triggers.add('parent_presence_needed');
    if (mode === 'intervals' && !d.napError && d.napRows?.length &&
        Number.isFinite(d.beforeSettling) && d.beforeSettling >= 0 && d.beforeSettling <= 120 && d.settling >= 30) {
      triggers.add('late_nap_with_bedtime_delay');
    }
    if (mode === 'none' || (state.issue === 'naps' && d.napRows?.length && !d.napError)) {
      triggers.add('preschool_day_nap_pattern');
    }
    if (a.tired || (Array.isArray(state.eveningMood) && state.eveningMood.includes('tired'))) {
      triggers.add('tired_day_mood');
    }
    if (state.routine === 'no' || (Array.isArray(state.rituals) && state.rituals.includes('none'))) {
      triggers.add('ritual_absent_or_inconsistent');
    }
    if (['late', 'yes', 'often'].includes(state.screenTime)) triggers.add('screens_close_to_bedtime');
    return triggers;
  }

  // Medical warnings precede habit suggestions, independent of editorial priority.
  const warningOrder = new Map([['sleep_breathing_warning', 2], ['night_cry_or_confusion', 1]]);
  const priority = rule => warningOrder.get(rule.trigger_key) || 0;

  let data;
  let request;
  window.SonSleepKnowledge = {
    load(projectUrl, publicKey) {
      if (request) return request;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      request = Promise.all(Object.keys(columns).map(table =>
        readPublished(projectUrl, publicKey, table, controller.signal)))
        .then(rows => {
          data = compile(...rows);
          return true;
        })
        .catch(() => {
          controller.abort();
          return false;
        })
        .finally(() => clearTimeout(timeout));
      return request;
    },

    normForAge(months) {
      const row = data?.norms.find(item => coversAge(item, months));
      if (!row) return null;
      return {
        min: row.min_minutes / 60,
        max: row.max_minutes / 60,
        minMinutes: row.min_minutes,
        maxMinutes: row.max_minutes,
        citation: data.sources.get(row.source_id)
      };
    },

    suggestions(assessment, state, mode) {
      if (!data) return [];
      const triggers = matchingTriggers(assessment, state, mode);
      return data.rules.filter(rule =>
        coversAge(rule, assessment.m) && triggers.has(rule.trigger_key))
        .sort((a, b) => priority(b) - priority(a) || b.priority - a.priority || a.id.localeCompare(b.id))
        .slice(0, 3)
        .map(rule => ({
          ...rule,
          sources: [...new Set(rule.source_ids)].map(id => data.sources.get(id)).filter(Boolean)
        }));
    }
  };
})();
