import { SOURCES } from "@/lib/facts/sources";
import type { FoodSafetyFact } from "@/lib/facts/types";

export const FOOD_SAFETY_FACTS = [
  {
    id: "FS-001",
    kind: "food_safety",
    text: "Refrigerator keeps food cold about 4 hours unopened; full freezer about 48 hours (half-full about 24 hours, per USDA)",
    sources: [SOURCES.readyFood, SOURCES.fsis],
    furtherReading: [],
  },
  {
    id: "FS-002",
    kind: "food_safety",
    text: "Discard perishables above 40 °F for 2 hours or more",
    sources: [SOURCES.readyFood],
    furtherReading: [],
  },
  {
    id: "FS-003",
    kind: "food_safety",
    text: "Do not eat from swollen, dented or corroded cans",
    sources: [SOURCES.readyFood],
    furtherReading: [],
  },
  {
    id: "FS-004",
    kind: "food_safety",
    text: "25 lb of dry ice keeps a 10 cu ft freezer below freezing for 3 to 4 days",
    sources: [SOURCES.readyFood],
    furtherReading: [],
  },
  {
    id: "FS-005",
    kind: "food_safety",
    text: "Charcoal grills and camp stoves are for outdoor use only",
    sources: [SOURCES.readyFood],
    furtherReading: [],
  },
] as const satisfies readonly FoodSafetyFact[];
