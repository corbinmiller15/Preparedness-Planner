import { FURTHER_READING, SOURCES } from "@/lib/facts/sources";
import type { WaterFact } from "@/lib/facts/types";

const none: WaterFact["furtherReading"] = [];

export const WATER_FACTS = [
  {
    id: "WTR-001",
    kind: "water",
    field: "Base quantity",
    text: "At least 1 gallon per person per day, for drinking and sanitation",
    sources: [SOURCES.readyWater],
    furtherReading: [FURTHER_READING.redCrossKit],
  },
  {
    id: "WTR-002",
    kind: "water",
    field: "Drinking share",
    text: "A normally active person needs about 3/4 gallon of fluid per day",
    sources: [SOURCES.readyWater],
    furtherReading: none,
  },
  {
    id: "WTR-003",
    kind: "water",
    field: "Duration minimum",
    text: "3-day supply",
    sources: [SOURCES.cdcWater],
    furtherReading: [FURTHER_READING.redCrossKit],
  },
  {
    id: "WTR-004",
    kind: "water",
    field: "Duration target",
    text: "Try to store a 2-week supply if possible",
    sources: [SOURCES.cdcWater],
    furtherReading: [FURTHER_READING.redCrossKit],
  },
  {
    id: "WTR-005",
    kind: "water",
    field: "Duration (state)",
    text: "Minimum 2-week supply (14 gallons per person); a full month is a bonus goal",
    sources: [SOURCES.bruWater],
    furtherReading: none,
  },
  {
    id: "WTR-006",
    kind: "water",
    field: "Special groups",
    text: "Children, nursing mothers and sick people may need more; a medical emergency may need more",
    sources: [SOURCES.readyWater],
    furtherReading: none,
  },
  {
    id: "WTR-007",
    kind: "water",
    field: "Special groups",
    text: "Store more for pregnant women, sick people, pets, or hot climates",
    sources: [SOURCES.cdcWater],
    furtherReading: none,
  },
  {
    id: "WTR-008",
    kind: "water",
    field: "Climate multiplier",
    text: "In very hot temperatures, water needs can double (factor 2.0)",
    sources: [SOURCES.readyWater],
    furtherReading: none,
  },
  {
    id: "WTR-009",
    kind: "water",
    field: "Altitude / dry climate",
    text: "More needed at high altitude or in dry climates; no multiplier given",
    sources: [SOURCES.bruWater],
    furtherReading: none,
  },
  {
    id: "WTR-010",
    kind: "water",
    field: "Storage temperature",
    text: "Cool place, 50 to 70 °F, away from direct sunlight and toxic substances",
    sources: [SOURCES.cdcWater],
    furtherReading: none,
  },
  {
    id: "WTR-011",
    kind: "water",
    field: "Rotation",
    text: "Replace water that was not commercially bottled every 6 months",
    sources: [SOURCES.readyWater],
    furtherReading: none,
  },
  {
    id: "WTR-012",
    kind: "water",
    field: "Rotation",
    text: "Follow the expiration date on store-bought water",
    sources: [SOURCES.cdcWater],
    furtherReading: none,
  },
  {
    id: "WTR-013",
    kind: "water",
    field: "Containers",
    text: "FDA-approved food-grade containers; never containers that held toxic chemicals",
    sources: [SOURCES.cdcWater],
    furtherReading: none,
  },
  {
    id: "WTR-014",
    kind: "water",
    field: "Treatment",
    text: "Boil at a rolling boil for 1 minute, or add 1/8 tsp unscented bleach (5.25 to 6.0%) per gallon and wait 30 minutes",
    sources: [SOURCES.readyWater],
    furtherReading: none,
  },
] as const satisfies readonly WaterFact[];

export const GALLONS_PER_PERSON_PER_DAY = 1;
export const HOT_CLIMATE_WATER_FACTOR = 2;
