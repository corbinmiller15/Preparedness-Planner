-- Northroom initial schema.
-- A person planning only for themselves is one household_members row.
-- home_type, budget_level, and storage_space are onboarding answers.
-- They are stored on the profile and copied onto each plan. The engine does not
-- invent storage limits or prices from them.

create extension if not exists pgcrypto;

create type public.home_type as enum (
  'apartment_renter',
  'house_owner',
  'house_renter',
  'mobile_home',
  'other'
);

create type public.budget_level as enum (
  'minimal',
  'moderate',
  'comfortable'
);

create type public.storage_space as enum (
  'very_limited',
  'some',
  'plenty'
);

create type public.plan_tier as enum (
  'go_bag',
  '72_hour',
  '1_month'
);

create type public.unit_system as enum (
  'imperial',
  'metric'
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  home_type public.home_type,
  budget_level public.budget_level,
  storage_space public.storage_space,
  unit_system public.unit_system not null default 'imperial',
  locale text not null default 'en-US',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_locale_check check (locale in ('en-US', 'en-GB'))
);

comment on table public.profiles is
  'Account owner. One person can plan for themselves or for the people they live with.';

comment on column public.profiles.storage_space is
  'Onboarding answer. The engine records it and does not invent a storage limit from it.';

create table public.household_members (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.profiles (id) on delete cascade,
  label text not null,
  age integer,
  birth_year integer,
  sex text,
  pregnancy_status text,
  is_child boolean not null default false,
  special_needs text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint household_members_label_check check (char_length(label) between 1 and 80),
  constraint household_members_age_range check (age is null or (age >= 0 and age <= 130)),
  constraint household_members_birth_year_range check (
    birth_year is null or (birth_year >= 1900 and birth_year <= 2100)
  ),
  constraint household_members_age_or_birth_year check (age is not null or birth_year is not null),
  constraint household_members_sex_check check (
    sex is null or sex in ('female', 'male', 'unspecified')
  ),
  constraint household_members_pregnancy_check check (
    pregnancy_status is null
    or pregnancy_status in (
      'none',
      'pregnant_t1',
      'pregnant_t2',
      'pregnant_t3',
      'pregnant_unspecified',
      'breastfeeding_0_6',
      'breastfeeding_6_12',
      'breastfeeding_unspecified'
    )
  )
);

comment on table public.household_members is
  'People covered by the account. A solo plan has one row.';

create index household_members_account_id_idx on public.household_members (account_id);

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.profiles (id) on delete cascade,
  country_code text not null default 'US',
  postal_code text not null,
  home_type public.home_type not null,
  budget_level public.budget_level not null,
  storage_space public.storage_space not null,
  unit_system public.unit_system not null default 'imperial',
  locale text not null default 'en-US',
  tier public.plan_tier not null,
  generated jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint plans_country_code_check check (country_code ~ '^[A-Z]{2}$'),
  constraint plans_postal_code_check check (char_length(btrim(postal_code)) between 1 and 16),
  constraint plans_locale_check check (locale in ('en-US', 'en-GB'))
);

comment on column public.plans.country_code is
  'ISO 3166-1 alpha-2. US is the live launch country. GB is reserved and not resolved yet.';

comment on column public.plans.postal_code is
  'Postal code for the plan location. US values are ZIP codes.';

create index plans_account_id_idx on public.plans (account_id);

create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null,
  next_due timestamptz not null,
  created_at timestamptz not null default now(),
  constraint reminders_kind_check check (char_length(kind) between 1 and 80)
);

create index reminders_account_id_idx on public.reminders (account_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger household_members_set_updated_at
  before update on public.household_members
  for each row execute function public.set_updated_at();

create trigger plans_set_updated_at
  before update on public.plans
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.household_members enable row level security;
alter table public.plans enable row level security;
alter table public.reminders enable row level security;

create policy profiles_select_own on public.profiles
  for select to authenticated
  using (id = auth.uid());

create policy profiles_insert_own on public.profiles
  for insert to authenticated
  with check (id = auth.uid());

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy household_members_own on public.household_members
  for all to authenticated
  using (account_id = auth.uid())
  with check (account_id = auth.uid());

create policy plans_own on public.plans
  for all to authenticated
  using (account_id = auth.uid())
  with check (account_id = auth.uid());

create policy reminders_own on public.reminders
  for all to authenticated
  using (account_id = auth.uid())
  with check (account_id = auth.uid());

grant usage on schema public to anon, authenticated;

revoke all on table public.profiles from anon;
revoke all on table public.household_members from anon;
revoke all on table public.plans from anon;
revoke all on table public.reminders from anon;

grant select, insert, update, delete on table public.profiles to authenticated;
grant select, insert, update, delete on table public.household_members to authenticated;
grant select, insert, update, delete on table public.plans to authenticated;
grant select, insert, update, delete on table public.reminders to authenticated;
