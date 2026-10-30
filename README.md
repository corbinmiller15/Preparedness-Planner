# Northroom

Northroom is a free beta preparedness planner for one person or the people they live with. This slice has the calculation engine, the database migration, and a placeholder home page. Planning screens are not built yet.

It is not an official alert source. In an emergency, call 911.

## What the engine does

Facts live in `lib/facts` with the ids from the preparedness facts sheet (`WTR-`, `CAL-`, `KIT-`, `TIER-`, `FS-`, `HAZ-`, `GAP-`). Every calculated line points at those ids.

- **Water.** 1 gallon per person per day, times the tier length. Go-bag and 72-hour use 3 days. A 1-month tier uses 30 planner days. Very hot conditions use the published factor of 2. Children, pregnancy, breastfeeding, and special needs add a note, not an extra number (`GAP-03`).
- **Calories.** USDA Estimated Calorie Needs by age, sex, and activity, plus the pregnancy and breastfeeding adders. A household total is the sum of the people who have a row, times the tier days. Under age 2 (`GAP-02`), missing sex or activity, and a go-bag food quantity (`GAP-04`) come back as `no_source_data` instead of a guessed number.
- **72-hour kit.** The Ready.gov basic and additional items.
- **Hazards.** Postal code, then region, then a country hazard provider. The US path maps a ZIP to a county FIPS and reads National Risk Index style ratings. Ready.gov before / during / after actions are attached only for US regions. The shipped ratings are a **fixture**, not live FEMA scores. `createFemaNriHazardProvider` can query the public county layer when you pass it in.

Home type, budget level, and storage space are stored and echoed onto each item. They do not change quantities. There is no sourced storage limit or price. Each tier offers `free`, `low_cost`, and `standard` budget paths with empty item lists until a fact assigns items to a path. Item `budgetPath` stays `null`.

Units default to US gallons. Pass `unitSystem: "metric"` for litres. The source quantity stays in gallons.

## Countries and copy

The US ZIP resolver and fixture risk provider are the live launch path. UK postcodes are recognized and then return unavailable. There is no UK hazard content.

User-facing copy is in `lib/i18n`. `en-US` is the default. `en-GB` is a stub that falls back to `en-US`, except litre spelling.

## Sources

Calculation text comes from FEMA Ready.gov, CDC, USDA, and Be Ready Utah. Red Cross, Church, and BYU pages are stored only as further-reading links in `lib/facts/sources.ts`. They are not copied into engine output. Utah State University booklet links are treated the same way.

## Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

The dev server in this environment uses port 38471. `npm run dev` uses Next's default port unless you pass one.

Apply `supabase/migrations/0001_init.sql` in the Supabase SQL editor, or with the Supabase CLI, before using auth. The app boots without Supabase keys. Browser and server clients throw only when called without `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

Row level security limits `profiles`, `household_members`, `plans`, and `reminders` to `auth.uid()`. A new auth user gets a profile row from `handle_new_user`.

`RESEND_API_KEY` and `GEMINI_API_KEY` are optional. Email and rewording skip the network when the key is missing. Gemini is for rewording only and is not called by the engine.

## Scripts

```bash
npm run lint
npm run format:check
npm run typecheck
npm run test
npm run test:e2e
npm run build
```

`npm run test` is Vitest. `npm run test:e2e` is a Playwright smoke test of the placeholder page.
