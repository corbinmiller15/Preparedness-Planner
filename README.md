# Northroom

Northroom is a free beta preparedness planner for one person or the people they live with. This slice has the calculation engine, the database migration, and a placeholder home page. Planning screens are not built yet.

It is not an official alert source. In an emergency, call 911.

## What the engine does

Facts live in `lib/facts` with the ids from the preparedness facts sheet (`WTR-`, `CAL-`, `KIT-`, `TIER-`, `FS-`, `HAZ-`, `GAP-`). Every calculated line points at those ids.

- **Tiers.** `go_bag`, `72_hour`, `1_month`, `3_month`, `6_month`, and `12_month`. Go-bag and 72-hour are 3 days. The month tiers use 30, 90, 180, and 365 days as planner definitions tied to the `TIER-` facts.
- **Water.** 1 gallon per person per day inside the sourced window: 3 days for a go-bag or 72-hour tier, and 14 days when the tier is longer. Very hot conditions use the published factor of 2 on that stored amount. Children, pregnancy, breastfeeding, and special needs add a note, not an extra number (`GAP-03`).
- **Food.** USDA daily calories times every day in the tier, including a go-bag. Under age 2 (`GAP-02`) and missing sex or activity stay blank. Pound quantities stay `no_source_data`.
- **Assumptions.** Water treatment for the rest of a long tier, and extra non-food supplies past about two weeks, are `kind: "assumption"` in `lib/assumptions/assumptions.ts`. They are not cited figures.
- **72-hour kit.** The Ready.gov basic and additional items. On a longer tier the same list stays sourced, and the extra duration is the supplies assumption.
- **Hazards.** Postal code, then region, then a country hazard provider. The US path maps a ZIP to a county FIPS and reads National Risk Index ratings. Ready.gov before / during / after actions are attached only for US regions. The shipped ZIP list and ratings are a **fixture**, and that fixture is the default. Set `HAZARD_PROVIDER=fema_nri` to use the live FEMA county layer and the Census ZIP crosswalk below. With the variable unset, behavior stays on the fixture.

Home type, budget level, storage space, and activity level are saved with the household. Home type, budget, and storage do not change quantities. There is no sourced storage limit or price. Each tier offers `free`, `low_cost`, and `standard` paths. Budget level chooses the default path: minimal shows free, moderate shows low cost, and comfortable shows standard. Item `budgetPath` stays `null` until a fact assigns one.

Units default to US gallons. Pass `unitSystem: "metric"` for litres. The source quantity stays in gallons.

## Countries and copy

The US ZIP resolver and fixture risk provider are the default launch path. UK postcodes are recognized and then return unavailable. There is no UK hazard content.

User-facing copy is in `lib/i18n`. `en-US` is the default. `en-GB` is a stub that falls back to `en-US`, except litre spelling.

## Sources

Calculation text comes from FEMA Ready.gov, CDC, USDA, and Be Ready Utah. Red Cross, Church, and BYU pages are stored only as further-reading links in `lib/facts/sources.ts`. They are not copied into engine output. Utah State University booklet links are treated the same way.

### ZIP to county

The committed file is `data/zip-county-crosswalk.json`. Each ZCTA maps to county FIPS codes and one weight per match. `p` is a population share. `l` is a land-area share. The file header records the 2020 vintage, the 2022 Connecticut vintage, and the source URLs. `npm run build` does not download it. `npm run data:zip-county` rebuilds it from Census and is not part of the build.

- Land: https://www2.census.gov/geo/docs/maps-data/data/rel2020/zcta520/tab20_zcta520_county20_natl.txt
- Tracts used to allocate population: https://www2.census.gov/geo/docs/maps-data/data/rel2020/zcta520/tab20_zcta520_tract20_natl.txt
- Population: 2020 Census P.L. 94-171 geographic header, https://www2.census.gov/programs-surveys/decennial/2020/data/01-Redistricting_File--PL_94-171/
- Documentation: https://www.census.gov/geographies/reference-files/time-series/geo/relationship-files.2020.html
- License: public domain, U.S. government work (17 U.S.C. § 105). Cite the U.S. Census Bureau. There is no API key.

A ZIP in several counties comes back as the full list, highest weight first. The tie break is the lower county FIPS. The weight is the estimated share of 2020 Census population when that total is positive: each tract's population is split across the ZIP by the land area of the overlap, then summed to the county. When that population is missing or zero, the weight is the land-area share (`AREALAND_PART` divided by the ZCTA's land). 57719 returns Pennington County and Meade County, with Pennington first by population. 42223 returns Christian County, Kentucky ahead of Montgomery County, Tennessee, also by population.

Connecticut's retired county codes (09001–09015) are not in the FEMA layer. Those ZIPs use the 2022 planning regions (09110–09190) from the Census Connecticut relationship file https://www2.census.gov/geo/docs/maps-data/data/rel2022/acs22_cousub22_zcta520_st09.txt and the town crosswalk https://www2.census.gov/geo/docs/reference/ct_change/ct_cou_to_cousub_crosswalk.txt. 06511 is the South Central Connecticut Planning Region, 09170. Town population is allocated by the land area of the ZCTA-town overlap.

ZCTAs approximate USPS ZIP codes. A well-formed ZIP that is not a ZCTA, including PO Box ZIP 73301, returns `not_found` with `engine.hazard.enter_home_zip`.

HUD's USPS ZIP-county crosswalk publishes a residential-address ratio (`RES_RATIO`) at https://www.huduser.gov/portal/datasets/usps_crosswalk.html. The bulk files require a HUD User login, and the HUD API requires a token, so this generator uses the Census files instead.

### FEMA National Risk Index

`HAZARD_PROVIDER=fema_nri` queries the public county feature service. No API key. Tract-level data is not requested.

- Query: https://services.arcgis.com/XG15cJAlne2vxtgt/arcgis/rest/services/National_Risk_Index_Counties/FeatureServer/0/query
- About: https://www.fema.gov/flood-maps/products-tools/national-risk-index
- Open data and citation: https://www.fema.gov/about/openfema/data-sets/national-risk-index-data
- Ratings and scores are passed through from FEMA. Cite FEMA National Risk Index when you show a live rating.
- A missing county returns `not_found`. A timeout, a network failure, an HTTP error, or a response that cannot be read returns `unavailable` with a `reason` of `timeout`, `network`, `http`, or `invalid_response`. The timeout covers the response body as well as the headers. Live mode keeps that failure visible.
- A composite of Insufficient Data, No Rating, or Not Applicable is returned with a null rating and `engine.hazard.insufficient_data`. That is not a low-risk result. Puerto Rico and several territories use this label.
- Successful county responses are kept in an in-memory LRU for 24 hours (`HAZARD_PROVIDER_CACHE_TTL_MS`, `0` disables it). The crosswalk file is read once per process.
- Optional `HAZARD_PROVIDER_TIMEOUT_MS` defaults to 8000.

To try one ZIP against the live layer:

```bash
npm run hazard:lookup -- 70112
```

`npm run data:zip-county` rebuilds the committed crosswalk. It is not required to look up a ZIP, and `npm run build` does not run it.

`buildPreparednessPlan` reads the same flag through `defaultHazardDependencies()`. Unset, empty, or `fixture` keeps the sample ZIP list and sample ratings. `fema_nri` uses the generated crosswalk and the county layer. The placeholder home page stays a static page. Start the dev server with the flag when a later caller should use live data:

```bash
HAZARD_PROVIDER=fema_nri npm run dev
```

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
npm run data:zip-county
npm run hazard:lookup -- 70112
```

`npm run test` is Vitest. `npm run test:e2e` is a Playwright smoke test of the placeholder page.
