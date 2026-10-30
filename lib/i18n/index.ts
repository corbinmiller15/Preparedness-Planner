export const LOCALES = ["en-US", "en-GB"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en-US";

/**
 * User-facing strings. en-GB is a stub: missing keys fall back to en-US.
 * Sourced fact sentences stay in the fact catalog and are not rewritten here.
 */
const enUS = {
  "meta.title": "Northroom",
  "meta.description":
    "A free beta preparedness planner for one person or the people they live with. Not an official alert source.",
  "home.eyebrow": "Free beta",
  "home.title": "Northroom",
  "home.lede":
    "A preparedness planner for you, or for the people you live with. It will turn public federal and state guidance into water, calorie, kit, and hazard notes, and it will leave a blank where that guidance has no number.",
  "home.point.water":
    "Water is one gallon per person per day, for as many days as the tier calls for.",
  "home.point.calories":
    "Calories come from USDA tables. Pregnancy and breastfeeding adders are applied only when the table has a row. Missing rows stay blank.",
  "home.point.kit":
    "A 72-hour kit and hazard notes stay attached to the public-source fact they came from.",
  "home.pending":
    "Planning screens are waiting on design approval. There is nothing to fill in here yet.",
  "home.disclaimer": "Not an official alert source. In an emergency, call 911.",
  "home.footer":
    "This beta calculates from US federal pages and Be Ready Utah. UK locale and hazard lookups are stubbed and do not add local guidance. Not a government service.",
  "units.gal.one": "gallon",
  "units.gal.other": "gallons",
  "units.L.one": "liter",
  "units.L.other": "liters",
  "engine.plan.no_people": "Add at least one person. A plan can cover only you.",
  "engine.water.go_bag_days":
    "This uses 3 days, matching the CDC minimum water supply. The go-bag source does not give its own day count, and it also mentions a work kit of at least 24 hours.",
  "engine.water.month_days":
    "30 days is this planner's length for a 1-month tier. The state source calls for a month of food at home and does not print a day count.",
  "engine.water.special_group":
    "Children, pregnant or breastfeeding people, and people who are ill or have special needs may need more water. No numeric multiplier is published for that, so the total is not increased.",
  "engine.water.hot_climate":
    "Very hot temperatures can double water needs. This total uses that factor of 2.",
  "engine.food.go_bag":
    "No government go-bag food quantity was found, so this plan does not estimate calories or pounds for a go bag.",
  "engine.food.table_edition":
    "Calorie figures use the USDA Food Patterns age-by-sex table. The 2025-2030 Dietary Guidelines do not publish that table. Children under 2 are outside it.",
  "engine.food.under_two":
    "The USDA age-by-sex table used here starts at age 2. No figure is filled in for this person.",
  "engine.food.missing_age": "An age or birth year is required to use the USDA calorie table.",
  "engine.food.missing_as_of": "A birth year needs an as-of date before an age can be calculated.",
  "engine.food.invalid_age": "That age cannot be used with the USDA calorie table.",
  "engine.food.missing_sex":
    "The USDA table is split by male and female. No figure is filled in when sex is missing or unspecified.",
  "engine.food.missing_activity":
    "The USDA table is split by sedentary, moderate, and active. No activity level was given, so no figure is filled in.",
  "engine.food.inconsistent_pregnancy":
    "A pregnancy or breastfeeding status was set on a person recorded as male. No calorie figure is filled in.",
  "engine.food.pregnancy_stage":
    "The trimester changes the published calorie adder. No adder is applied until the trimester is known.",
  "engine.food.breastfeeding_stage":
    "The lactation adder differs for the first and second six months. No adder is applied until that period is known.",
  "engine.food.adjustment_scope":
    "The adder used here is published for women with a healthy pre-pregnancy weight.",
  "engine.food.month_mass":
    "No federal pounds-per-person food quantity was found for a month. Any calorie total is the USDA table times 30 planner days, with the state 1-month tier.",
  "engine.food.pounds_not_given":
    "No pound quantity is published for this tier. A calorie total, when one can be calculated, is the calorie method.",
  "engine.food.incomplete_household":
    "The household total counts only people with a sourced calorie figure.",
  "engine.adaptation.storage":
    "No federal or state fact in this set gives a storage limit for this home type or storage space. Quantities are unchanged.",
  "engine.adaptation.budget":
    "No federal or state fact in this set prices this item or offers a cheaper substitute.",
  "engine.budget_path.unassigned":
    "No source fact assigns items to a free, low-cost, or standard path. Each tier offers the paths, and the sourced list is not split across them.",
  "engine.hazard.fixture_disclaimer":
    "These ratings are sample rows for development. They are not FEMA National Risk Index scores.",
  "engine.hazard.live_sources":
    "Ratings come from the FEMA National Risk Index. Action text is the Ready.gov paraphrase stored with each fact id.",
  "engine.hazard.power_outage":
    "Power outage is not a National Risk Index hazard. The actions have no county rating.",
  "engine.hazard.gb_unavailable":
    "UK postal codes and hazard ratings are not available in this beta.",
  "engine.hazard.unsupported_country": "No region resolver is registered for this country.",
  "engine.hazard.invalid_country": "Country must be a two-letter code.",
  "engine.hazard.invalid_postal":
    "That postal code does not match the expected format for this country.",
  "engine.hazard.not_found": "That postal code is not in the loaded region set.",
  "engine.hazard.no_provider":
    "A region was found, and no hazard provider is registered for this country.",
  "engine.hazard.no_ratings": "The hazard provider has no ratings for this region.",
  "engine.hazard.provider_error": "The hazard provider did not return ratings.",
  "engine.hazard.actions_us_only":
    "Ready.gov action text is attached only for United States regions.",
} as const;

export type MessageKey = keyof typeof enUS;

export type LocalMessage = {
  key: MessageKey;
  params?: Record<string, string | number>;
};

/** Stub catalog. Add a key only when en-GB wording is intentionally different. */
const enGB: Partial<Record<MessageKey, string>> = {
  "units.L.one": "litre",
  "units.L.other": "litres",
};

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

export function resolveLocale(value: string | null | undefined): Locale {
  return value === "en-GB" ? "en-GB" : DEFAULT_LOCALE;
}

export function t(
  key: MessageKey,
  locale: Locale = DEFAULT_LOCALE,
  params?: Record<string, string | number>,
): string {
  const template = (locale === "en-GB" ? enGB[key] : undefined) ?? enUS[key];
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = params[name];
    return value === undefined ? match : String(value);
  });
}

export function translate(message: LocalMessage, locale: Locale = DEFAULT_LOCALE): string {
  return t(message.key, locale, message.params);
}

export const messages = { "en-US": enUS, "en-GB": enGB };
