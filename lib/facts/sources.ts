import type { FactSource, FurtherReading } from "@/lib/facts/types";

const ready = (path: string): FactSource => ({
  url: `https://www.ready.gov${path}`,
  publisher: "FEMA Ready.gov",
  jurisdiction: "federal",
});

export const SOURCES = {
  readyWater: ready("/water"),
  readyKit: ready("/kit"),
  readyFood: ready("/food"),
  readyHurricanes: ready("/hurricanes"),
  readyFloods: ready("/floods"),
  readyWildfires: ready("/wildfires"),
  readyEarthquakes: ready("/earthquakes"),
  readyTornadoes: ready("/tornadoes"),
  readyWinter: ready("/winter-weather"),
  readyHeat: ready("/heat"),
  readyPower: ready("/power-outages"),
  cdcWater: {
    url: "https://www.cdc.gov/water-emergency/about/how-to-create-and-store-an-emergency-water-supply.html",
    publisher: "CDC",
    jurisdiction: "federal",
  },
  bruWater: {
    url: "https://beready.utah.gov/family-preparedness/12-areas-of-preparedness/water/",
    publisher: "Be Ready Utah",
    jurisdiction: "state",
  },
  bruFood: {
    url: "https://beready.utah.gov/family-preparedness/12-areas-of-preparedness/food/",
    publisher: "Be Ready Utah",
    jurisdiction: "state",
  },
  bruKit: {
    url: "https://beready.utah.gov/family-preparedness/get-a-kit-family/",
    publisher: "Be Ready Utah",
    jurisdiction: "state",
  },
  usdaCalories: {
    url: "https://fns-prod.azureedge.us/sites/default/files/EstimatedCalorieNeedsPerDay.pdf",
    publisher: "USDA Food and Nutrition Service",
    jurisdiction: "federal",
  },
  dietaryGuidelines: {
    url: "https://www.dietaryguidelines.gov/sites/default/files/2021-03/Dietary_Guidelines_for_Americans-2020-2025.pdf",
    publisher: "Dietary Guidelines for Americans",
    jurisdiction: "federal",
  },
  usdaPatterns: {
    url: "https://www.fna.usda.gov/cnpp/dietary-patterns",
    publisher: "USDA",
    jurisdiction: "federal",
  },
  fsis: {
    url: "https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/emergencies/keep-your-food-safe-during-emergencies",
    publisher: "USDA FSIS",
    jurisdiction: "federal",
  },
} as const satisfies Record<string, FactSource>;

/**
 * Agreeing pages that are not copied into facts or engine output.
 * The BYU link keeps the sheet's path, with the broken `https:/` corrected to `https://`.
 */
export const FURTHER_READING = {
  redCrossKit: {
    id: "link:red-cross-kit",
    url: "https://www.redcross.org/get-help/how-to-prepare-for-emergencies/survival-kit-supplies.html",
    publisher: "American Red Cross",
    linkOnly: true,
  },
  redCrossChecklist: {
    id: "link:red-cross-checklist",
    url: "https://www.redcross.org/content/dam/redcross/get-help/pdfs/preparedness-essentials/Preparedness-Checklist-Update_ENG.pdf",
    publisher: "American Red Cross",
    linkOnly: true,
  },
  churchLongTerm: {
    id: "link:church-long-term",
    url: "https://www.churchofjesuschrist.org/topics/food-storage/longer-term-food-supply?lang=eng",
    publisher: "Church of Jesus Christ of Latter-day Saints",
    linkOnly: true,
  },
  churchFaq: {
    id: "link:church-faq",
    url: "https://www.churchofjesuschrist.org/topics/food-storage/frequently-asked-questions?lang=eng",
    publisher: "Church of Jesus Christ of Latter-day Saints",
    linkOnly: true,
  },
  byuFoodStorage: {
    id: "link:byu-food-storage",
    url: "https://ndfs.byu.edu/https://brightspotcdn.byu.edu/66/a8/0a18984741f6a699f6034adbbb30/an-approach-to-longer-term-food-storage-6june2024.pdf",
    publisher: "Brigham Young University",
    linkOnly: true,
  },
  usuBooklet: {
    id: "link:usu-booklet",
    url: "https://extension.usu.edu/preserve-the-harvest/files/Food-Storage-Booklet.pdf",
    publisher: "Utah State University Extension",
    linkOnly: true,
  },
  usuWheat: {
    id: "link:usu-wheat",
    url: "https://extension.usu.edu/preserve-the-harvest/research/storing-wheat",
    publisher: "Utah State University Extension",
    linkOnly: true,
  },
} as const satisfies Record<string, FurtherReading>;
