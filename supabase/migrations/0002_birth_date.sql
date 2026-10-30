-- Birth month and day, so household age is not taken from the year alone.
-- birth_day is accepted only when it is a real calendar day in birth_month of birth_year.

alter table public.household_members
  add column birth_month integer,
  add column birth_day integer;

alter table public.household_members
  add constraint household_members_birth_month_check
  check (birth_month is null or birth_month between 1 and 12);

alter table public.household_members
  add constraint household_members_birth_day_requires_month_year
  check (birth_day is null or (birth_month is not null and birth_year is not null));

alter table public.household_members
  add constraint household_members_birth_day_calendar_check
  check (
    birth_day is null
    or birth_day between 1 and (
      case birth_month
        when 1 then 31
        when 2 then
          case
            when birth_year % 400 = 0 or (birth_year % 4 = 0 and birth_year % 100 <> 0) then 29
            else 28
          end
        when 3 then 31
        when 4 then 30
        when 5 then 31
        when 6 then 30
        when 7 then 31
        when 8 then 31
        when 9 then 30
        when 10 then 31
        when 11 then 30
        when 12 then 31
        else 0
      end
    )
  );

comment on column public.household_members.birth_month is
  '1-12. With birth_year, completed age is exact except during the birth month.';

comment on column public.household_members.birth_day is
  'Day of birth. With birth_year and birth_month, completed age is exact.';
