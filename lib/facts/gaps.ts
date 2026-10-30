import { SOURCES } from "@/lib/facts/sources";
import type { GapFact } from "@/lib/facts/types";

export const GAP_FACTS = [
  {
    id: "GAP-01",
    kind: "gap",
    text: "There is no federal per-person food quantity (pounds or calories) for any tier beyond several days. The month tiers rest on Be Ready Utah plus the calorie method.",
    sources: [SOURCES.bruFood, SOURCES.usdaCalories],
    furtherReading: [],
  },
  {
    id: "GAP-02",
    kind: "gap",
    text: "The current Dietary Guidelines (2025-2030) have no age-by-sex calorie table. The USDA Food Patterns table is used instead, and children under 2 are not included.",
    sources: [SOURCES.usdaPatterns, SOURCES.dietaryGuidelines, SOURCES.usdaCalories],
    furtherReading: [],
  },
  {
    id: "GAP-03",
    kind: "gap",
    text: "Special-group water needs have no numeric multiplier, except that needs can double in very hot temperatures.",
    sources: [SOURCES.readyWater, SOURCES.cdcWater],
    furtherReading: [],
  },
  {
    id: "GAP-04",
    kind: "gap",
    text: "There is no government go-bag food quantity.",
    sources: [SOURCES.readyKit],
    furtherReading: [],
  },
  {
    id: "GAP-05",
    kind: "gap",
    text: "We found no government shelf-life table for a rotating pantry (the USDA FoodKeeper was not checked).",
    sources: [],
    furtherReading: [],
  },
  {
    id: "GAP-06",
    kind: "gap",
    text: "Rotation sources differ: CDC and Ready.gov say replace self-filled water every 6 months, while Be Ready Utah cites USU saying properly stored potable water has an indefinite shelf life. Default to 6 months.",
    sources: [SOURCES.cdcWater, SOURCES.readyWater, SOURCES.bruWater],
    furtherReading: [],
  },
  {
    id: "GAP-07",
    kind: "gap",
    text: "We have not checked Be Ready sites for other states, or local government sites.",
    sources: [],
    furtherReading: [],
  },
] as const satisfies readonly GapFact[];
