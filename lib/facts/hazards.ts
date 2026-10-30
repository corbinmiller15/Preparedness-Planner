import { SOURCES } from "@/lib/facts/sources";
import type { FactSource, HazardActionFact, HazardPhase } from "@/lib/facts/types";

const rows: ReadonlyArray<{
  hazard: string;
  source: FactSource;
  before: string;
  during: string;
  after: string;
}> = [
  {
    hazard: "Hurricane",
    source: SOURCES.readyHurricanes,
    before:
      "Know your evacuation zone; have several ways to get alerts; update insurance and documents; clear gutters and bring in outdoor furniture; charge phones; gather supplies including medication and pet supplies",
    during:
      "Evacuate immediately if told to; for wind, use a storm shelter or interior room; for flooding, go to the highest level but not a closed attic; never walk, swim or drive through floodwater",
    after:
      "Follow local officials; wear protective gear for cleanup; children should not do cleanup; avoid wet electrical equipment and floodwater; text instead of calling; photograph damage",
  },
  {
    hazard: "Flood",
    source: SOURCES.readyFloods,
    before:
      "Check FEMA flood maps; sign up for warnings; get NFIP flood insurance (about 30 days to take effect); plan evacuation routes; keep documents waterproof; move valuables up; install check valves",
    during:
      "Evacuate if told to; never drive around barricades; stay off bridges over fast water; 6 inches of moving water can knock you down and 1 foot can sweep a car away; if a car is in rising water, get on the roof",
    after:
      "Return only when authorities say it is safe; wear gloves and boots; watch for animals; risk of electrocution; run generators only outdoors",
  },
  {
    hazard: "Wildfire",
    source: SOURCES.readyWildfires,
    before:
      "Get alerts, including air quality; plan evacuation; use fire-resistant materials; keep a 30-foot debris-free zone; set up a clean-air room with a portable air cleaner; store an N95 mask",
    during:
      "Evacuate immediately if told to; if trapped, call 911 and turn on lights; use an N95 or clean-air room; set HVAC to recirculate",
    after:
      "Return only when authorities say it is safe; avoid hot ash and embers; wear protective clothing and a respirator; wet debris to reduce dust; photograph damage",
  },
  {
    hazard: "Earthquake",
    source: SOURCES.readyEarthquakes,
    before:
      "Practice Drop, Cover, Hold On; sign up for earthquake alerts; set an out-of-state contact; secure heavy items; consider earthquake insurance (homeowners policies don't cover it)",
    during:
      "Drop, Cover, Hold On; stay inside and avoid doorways; in bed, cover head with a pillow; in a car, pull over and set the brake; outside, move away from buildings and lines",
    after:
      "Expect aftershocks; leave damaged buildings; if trapped, text or bang on pipes and use a whistle; in tsunami zones, move to higher ground immediately; text rather than call",
  },
  {
    hazard: "Tornado",
    source: SOURCES.readyTornadoes,
    before:
      "Know the signs (rotating cloud, debris cloud, freight-train roar); sign up for alerts and learn siren tones; identify a FEMA safe room, ICC 500 shelter, or small interior windowless room on the lowest level",
    during:
      "Go to your safe location; cover head and neck and pad yourself with furniture or blankets; in a car, stay buckled and keep your head below the windows, or lie in a lower area; do not shelter under bridges",
    after:
      "Monitor EAS and NOAA radio; avoid fallen power lines; text instead of calling; wear protective gear for cleanup",
  },
  {
    hazard: "Winter storm",
    source: SOURCES.readyWinter,
    before:
      "Insulate and weather-strip; prevent frozen pipes; test smoke and CO alarms; gather supplies for several days without power; car kit with jumper cables, sand, flashlight, warm clothes, blankets, water and snacks; keep a full tank",
    during:
      "Run generators and grills only outdoors, never heat with a gas stove or oven; stay off roads and stay in a stuck car; limit time outside; avoid overexertion when shoveling",
    after:
      "Frostbite: warm room, warm water, no massage. Hypothermia (below 95 °F) is an emergency: warm the body's core first",
  },
  {
    hazard: "Extreme heat",
    source: SOURCES.readyHeat,
    before:
      "Learn heat-illness signs; don't rely on fans; identify cooling centers; add shades, weather-stripping and insulation; LIHEAP can help with cooling costs",
    during:
      "Never leave people or pets in a car; go to a cooling center; cool showers; drink plenty of fluids; avoid midday exertion; check on others",
    after:
      "Heat stroke (over 103 °F, hot dry skin): call 911 and cool the person. Heat exhaustion: move somewhere cooler and sip water; call a provider if symptoms last over 1 hour",
  },
  {
    hazard: "Power outage",
    source: SOURCES.readyPower,
    before:
      "List items that need electricity; get batteries and power banks; a flashlight per person; a medical-device and refrigerated-medicine plan; battery CO detectors on every level",
    during:
      "Keep fridge and freezer closed (fridge about 4 hours, full freezer about 48 hours); run generators and grills outdoors, at least 20 feet from windows; unplug electronics against surges",
    after:
      "Discard food at 40 °F or above for 2 hours or more; discard refrigerated medicine after more than a day without power unless the label says otherwise",
  },
];

const phases: ReadonlyArray<{
  suffix: "B" | "D" | "A";
  phase: HazardPhase;
  key: "before" | "during" | "after";
}> = [
  { suffix: "B", phase: "before", key: "before" },
  { suffix: "D", phase: "during", key: "during" },
  { suffix: "A", phase: "after", key: "after" },
];

export const HAZARD_ACTION_FACTS: readonly HazardActionFact[] = rows.flatMap((row, index) => {
  const id = `HAZ-${String(index + 1).padStart(2, "0")}`;
  return phases.map((phase) => ({
    id: `${id}-${phase.suffix}` as HazardActionFact["id"],
    kind: "hazard_action" as const,
    hazard: row.hazard,
    phase: phase.phase,
    text: row[phase.key],
    sources: [row.source],
    furtherReading: [],
  }));
});

export const HAZARD_NAMES = rows.map((row) => row.hazard);

export function hazardActions(hazard: string): HazardActionFact[] {
  return HAZARD_ACTION_FACTS.filter((fact) => fact.hazard === hazard);
}
