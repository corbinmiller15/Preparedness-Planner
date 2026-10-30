import { FURTHER_READING, SOURCES } from "@/lib/facts/sources";
import type { KitFact } from "@/lib/facts/types";

const basic = [
  "Water: 1 gallon per person per day for several days",
  "Food: at least a several-day supply of non-perishable food",
  "Battery-powered or hand-crank radio and a NOAA Weather Radio with tone alert",
  "Flashlight",
  "First aid kit",
  "Extra batteries",
  "Whistle",
  "Dust mask",
  "Plastic sheeting, scissors and duct tape",
  "Moist towelettes, garbage bags and plastic ties",
  "Wrench or pliers",
  "Manual can opener",
  "Local maps",
  "Cell phone with chargers and a backup battery",
];

const additional = [
  "Soap, hand sanitizer and disinfecting wipes",
  "Prescription medications",
  "Non-prescription medications",
  "Prescription eyeglasses and contact lens solution",
  "Infant formula, bottles, diapers, wipes, diaper rash cream",
  "Pet food and extra water",
  "Cash or traveler's checks",
  "Important family documents (electronic or in a waterproof container)",
  "Sleeping bag or warm blanket per person",
  "Change of clothing and sturdy shoes",
  "Fire extinguisher",
  "Matches in a waterproof container",
  "Feminine supplies and personal hygiene items",
  "Mess kits, paper cups, plates, towels, plastic utensils",
  "Paper and pencil",
  "Books, games, puzzles for children",
];

export const KIT_FACTS: readonly KitFact[] = [
  ...basic.map((text, index): KitFact => ({
    id: `KIT-B${String(index + 1).padStart(2, "0")}`,
    kind: "kit",
    group: "basic",
    text,
    sources: [SOURCES.readyKit],
    furtherReading: [],
  })),
  ...additional.map((text, index): KitFact => ({
    id: `KIT-A${String(index + 1).padStart(2, "0")}`,
    kind: "kit",
    group: "additional",
    text,
    sources: [SOURCES.readyKit],
    furtherReading: [],
  })),
];

/** Collection-level links. Not copied onto each kit item. */
export const KIT_FURTHER_READING = [
  FURTHER_READING.redCrossKit,
  FURTHER_READING.redCrossChecklist,
] as const;

export const KIT_MAINTENANCE = {
  text: "Keep canned food cool and dry, store boxed food in closed containers, replace expired items, and re-check needs every year. Keep kits at home, at work (24-hour shelter-in-place), and in the car. Be Ready Utah adds one kit per family member, checked twice a year.",
  sources: [SOURCES.readyKit, SOURCES.bruKit],
  relatedFactIds: KIT_FACTS.map((fact) => fact.id),
};
