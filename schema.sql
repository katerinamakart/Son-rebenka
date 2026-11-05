create table public.sleep_profiles (
 id uuid primary key,
 family_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 payload jsonb not null check (jsonb_typeof(payload) = 'object' and octet_length(payload::text) < 32768),
 updated_at timestamptz not null default now(),
 unique(id, family_id)
);
create table public.sleep_entries (
 profile_id uuid not null,
 family_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 entry_date date not null,
 payload jsonb not null check (jsonb_typeof(payload) = 'object' and octet_length(payload::text) < 8192),
 updated_at timestamptz not null default now(),
 primary key(profile_id, entry_date),
 foreign key(profile_id, family_id) references public.sleep_profiles(id, family_id) on delete cascade
);
create table public.sleep_statistics_consent (
 family_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
 allowed boolean not null default false,
 policy_version text not null default '2026-11-05',
 updated_at timestamptz not null default now()
);
alter table public.sleep_profiles enable row level security;
alter table public.sleep_entries enable row level security;
alter table public.sleep_statistics_consent enable row level security;
revoke all on public.sleep_profiles, public.sleep_entries, public.sleep_statistics_consent from anon;
grant select, insert, update, delete on public.sleep_profiles, public.sleep_entries, public.sleep_statistics_consent to authenticated;
create policy family_profiles on public.sleep_profiles for all to authenticated using ((select auth.uid()) = family_id) with check ((select auth.uid()) = family_id);
create policy family_entries on public.sleep_entries for all to authenticated using ((select auth.uid()) = family_id) with check ((select auth.uid()) = family_id);
create policy family_consent on public.sleep_statistics_consent for all to authenticated using ((select auth.uid()) = family_id) with check ((select auth.uid()) = family_id);
create index sleep_profiles_family_idx on public.sleep_profiles(family_id);
create index sleep_entries_family_idx on public.sleep_entries(family_id);
comment on table public.sleep_statistics_consent is 'Separate, revocable opt-in. No public statistics endpoint. Any future aggregate must exclude non-consenting families and identifying/free-text fields, suppress small groups.';
create function public.save_sleep_family(p_id uuid,p_payload jsonb,p_entries jsonb,p_expected timestamptz default null)
returns timestamptz language plpgsql security invoker set search_path = '' as $$
declare old_version timestamptz; next_version timestamptz := clock_timestamp(); item jsonb;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if jsonb_typeof(p_entries) <> 'array' or jsonb_array_length(p_entries)>10000 then raise exception 'Invalid entries'; end if;
 select updated_at into old_version from public.sleep_profiles where id=p_id and family_id=auth.uid() for update;
 if found then
  if p_expected is null or old_version<>p_expected then raise exception 'SYNC_CONFLICT'; end if;
  update public.sleep_profiles set payload=p_payload, updated_at=next_version where id=p_id and family_id=auth.uid();
 else
  if p_expected is not null then raise exception 'SYNC_CONFLICT'; end if;
  insert into public.sleep_profiles(id,family_id,payload,updated_at) values(p_id,auth.uid(),p_payload,next_version);
 end if;
 delete from public.sleep_entries where profile_id=p_id and family_id=auth.uid();
 for item in select value from jsonb_array_elements(p_entries) loop
  insert into public.sleep_entries(profile_id,family_id,entry_date,payload,updated_at)
  values(p_id,auth.uid(),(item->>'date')::date,item,next_version);
 end loop;
 return next_version;
end $$;
revoke all on function public.save_sleep_family(uuid,jsonb,jsonb,timestamptz) from public, anon;
grant execute on function public.save_sleep_family(uuid,jsonb,jsonb,timestamptz) to authenticated;
