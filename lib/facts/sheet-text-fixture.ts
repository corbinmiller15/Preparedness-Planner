/**
 * Water, kit, tier, and hazard sentences copied from the preparedness facts sheet.
 * The catalog test compares `lib/facts` to these rows.
 */

export const SHEET_WATER = [
  ["WTR-001", "Base quantity", "At least 1 gallon per person per day, for drinking and sanitation"],
  ["WTR-002", "Drinking share", "A normally active person needs about 3/4 gallon of fluid per day"],
  ["WTR-003", "Duration minimum", "3-day supply"],
  ["WTR-004", "Duration target", "Try to store a 2-week supply if possible"],
  [
    "WTR-005",
    "Duration (state)",
    "Minimum 2-week supply (14 gallons per person); a full month is a bonus goal",
  ],
  [
    "WTR-006",
    "Special groups",
    "Children, nursing mothers and sick people may need more; a medical emergency may need more",
  ],
  [
    "WTR-007",
    "Special groups",
    "Store more for pregnant women, sick people, pets, or hot climates",
  ],
  [
    "WTR-008",
    "Climate multiplier",
    "In very hot temperatures, water needs can double (factor 2.0)",
  ],
  [
    "WTR-009",
    "Altitude / dry climate",
    "More needed at high altitude or in dry climates; no multiplier given",
  ],
  [
    "WTR-010",
    "Storage temperature",
    "Cool place, 50 to 70 °F, away from direct sunlight and toxic substances",
  ],
  ["WTR-011", "Rotation", "Replace water that was not commercially bottled every 6 months"],
  ["WTR-012", "Rotation", "Follow the expiration date on store-bought water"],
  [
    "WTR-013",
    "Containers",
    "FDA-approved food-grade containers; never containers that held toxic chemicals",
  ],
  [
    "WTR-014",
    "Treatment",
    "Boil at a rolling boil for 1 minute, or add 1/8 tsp unscented bleach (5.25 to 6.0%) per gallon and wait 30 minutes",
  ],
] as const;

export const SHEET_KIT = [
  ["KIT-B01", "basic", "Water: 1 gallon per person per day for several days"],
  ["KIT-B02", "basic", "Food: at least a several-day supply of non-perishable food"],
  [
    "KIT-B03",
    "basic",
    "Battery-powered or hand-crank radio and a NOAA Weather Radio with tone alert",
  ],
  ["KIT-B04", "basic", "Flashlight"],
  ["KIT-B05", "basic", "First aid kit"],
  ["KIT-B06", "basic", "Extra batteries"],
  ["KIT-B07", "basic", "Whistle"],
  ["KIT-B08", "basic", "Dust mask"],
  ["KIT-B09", "basic", "Plastic sheeting, scissors and duct tape"],
  ["KIT-B10", "basic", "Moist towelettes, garbage bags and plastic ties"],
  ["KIT-B11", "basic", "Wrench or pliers"],
  ["KIT-B12", "basic", "Manual can opener"],
  ["KIT-B13", "basic", "Local maps"],
  ["KIT-B14", "basic", "Cell phone with chargers and a backup battery"],
  ["KIT-A01", "additional", "Soap, hand sanitizer and disinfecting wipes"],
  ["KIT-A02", "additional", "Prescription medications"],
  ["KIT-A03", "additional", "Non-prescription medications"],
  ["KIT-A04", "additional", "Prescription eyeglasses and contact lens solution"],
  ["KIT-A05", "additional", "Infant formula, bottles, diapers, wipes, diaper rash cream"],
  ["KIT-A06", "additional", "Pet food and extra water"],
  ["KIT-A07", "additional", "Cash or traveler's checks"],
  ["KIT-A08", "additional", "Important family documents (electronic or in a waterproof container)"],
  ["KIT-A09", "additional", "Sleeping bag or warm blanket per person"],
  ["KIT-A10", "additional", "Change of clothing and sturdy shoes"],
  ["KIT-A11", "additional", "Fire extinguisher"],
  ["KIT-A12", "additional", "Matches in a waterproof container"],
  ["KIT-A13", "additional", "Feminine supplies and personal hygiene items"],
  ["KIT-A14", "additional", "Mess kits, paper cups, plates, towels, plastic utensils"],
  ["KIT-A15", "additional", "Paper and pencil"],
  ["KIT-A16", "additional", "Books, games, puzzles for children"],
] as const;

export const SHEET_TIERS = [
  [
    "TIER-GO",
    "Go-bag",
    "Ready.gov mentions a go bag (hurricane, wildfire pages) and a work kit for at least 24 hours",
    "No government food quantity found",
  ],
  [
    "TIER-72H",
    "72-hour kit",
    "CDC: 3-day water. Ready.gov: several-day supply. Be Ready Utah: 3 days, ideally up to 5",
    "Calories: no pounds given; use the calorie method",
  ],
  [
    "TIER-1M",
    "1 month",
    "Be Ready Utah: minimum 1-month food supply at home",
    "No federal quantity found",
  ],
  [
    "TIER-3M",
    "3 months",
    "Be Ready Utah: work toward a 3-month supply",
    "No federal quantity found",
  ],
  [
    "TIER-6M",
    "6 months",
    "Be Ready Utah: 6 months to a year or longer is recommended, without going into debt",
    "No quantity found",
  ],
  [
    "TIER-12M",
    "12 months",
    "Be Ready Utah: storing a year for the household is a bonus goal",
    "No government quantity found. Pound-based lists exist only in BYU/USU and Church materials (link only)",
  ],
  [
    "TIER-ROT",
    "Rotating pantry",
    "Be Ready Utah: maintain a rotation system; eat what you store; cool, dark, dry at 40 to 70 °F. Ready.gov: replace expired items, re-check needs yearly",
    "Not applicable",
  ],
] as const;

export const SHEET_HAZARDS = [
  [
    "Hurricane",
    "Know your evacuation zone; have several ways to get alerts; update insurance and documents; clear gutters and bring in outdoor furniture; charge phones; gather supplies including medication and pet supplies",
    "Evacuate immediately if told to; for wind, use a storm shelter or interior room; for flooding, go to the highest level but not a closed attic; never walk, swim or drive through floodwater",
    "Follow local officials; wear protective gear for cleanup; children should not do cleanup; avoid wet electrical equipment and floodwater; text instead of calling; photograph damage",
  ],
  [
    "Flood",
    "Check FEMA flood maps; sign up for warnings; get NFIP flood insurance (about 30 days to take effect); plan evacuation routes; keep documents waterproof; move valuables up; install check valves",
    "Evacuate if told to; never drive around barricades; stay off bridges over fast water; 6 inches of moving water can knock you down and 1 foot can sweep a car away; if a car is in rising water, get on the roof",
    "Return only when authorities say it is safe; wear gloves and boots; watch for animals; risk of electrocution; run generators only outdoors",
  ],
  [
    "Wildfire",
    "Get alerts, including air quality; plan evacuation; use fire-resistant materials; keep a 30-foot debris-free zone; set up a clean-air room with a portable air cleaner; store an N95 mask",
    "Evacuate immediately if told to; if trapped, call 911 and turn on lights; use an N95 or clean-air room; set HVAC to recirculate",
    "Return only when authorities say it is safe; avoid hot ash and embers; wear protective clothing and a respirator; wet debris to reduce dust; photograph damage",
  ],
  [
    "Earthquake",
    "Practice Drop, Cover, Hold On; sign up for earthquake alerts; set an out-of-state contact; secure heavy items; consider earthquake insurance (homeowners policies don't cover it)",
    "Drop, Cover, Hold On; stay inside and avoid doorways; in bed, cover head with a pillow; in a car, pull over and set the brake; outside, move away from buildings and lines",
    "Expect aftershocks; leave damaged buildings; if trapped, text or bang on pipes and use a whistle; in tsunami zones, move to higher ground immediately; text rather than call",
  ],
  [
    "Tornado",
    "Know the signs (rotating cloud, debris cloud, freight-train roar); sign up for alerts and learn siren tones; identify a FEMA safe room, ICC 500 shelter, or small interior windowless room on the lowest level",
    "Go to your safe location; cover head and neck and pad yourself with furniture or blankets; in a car, stay buckled and keep your head below the windows, or lie in a lower area; do not shelter under bridges",
    "Monitor EAS and NOAA radio; avoid fallen power lines; text instead of calling; wear protective gear for cleanup",
  ],
  [
    "Winter storm",
    "Insulate and weather-strip; prevent frozen pipes; test smoke and CO alarms; gather supplies for several days without power; car kit with jumper cables, sand, flashlight, warm clothes, blankets, water and snacks; keep a full tank",
    "Run generators and grills only outdoors, never heat with a gas stove or oven; stay off roads and stay in a stuck car; limit time outside; avoid overexertion when shoveling",
    "Frostbite: warm room, warm water, no massage. Hypothermia (below 95 °F) is an emergency: warm the body's core first",
  ],
  [
    "Extreme heat",
    "Learn heat-illness signs; don't rely on fans; identify cooling centers; add shades, weather-stripping and insulation; LIHEAP can help with cooling costs",
    "Never leave people or pets in a car; go to a cooling center; cool showers; drink plenty of fluids; avoid midday exertion; check on others",
    "Heat stroke (over 103 °F, hot dry skin): call 911 and cool the person. Heat exhaustion: move somewhere cooler and sip water; call a provider if symptoms last over 1 hour",
  ],
  [
    "Power outage",
    "List items that need electricity; get batteries and power banks; a flashlight per person; a medical-device and refrigerated-medicine plan; battery CO detectors on every level",
    "Keep fridge and freezer closed (fridge about 4 hours, full freezer about 48 hours); run generators and grills outdoors, at least 20 feet from windows; unplug electronics against surges",
    "Discard food at 40 °F or above for 2 hours or more; discard refrigerated medicine after more than a day without power unless the label says otherwise",
  ],
] as const;
