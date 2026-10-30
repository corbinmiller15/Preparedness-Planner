export function rankCountyParts(
  parts: Array<{ countyFips: string; population: number | null; land: number }>,
): Array<[string, number, "p" | "l"]>;

export function parseCensusZctaCounty(
  text: string,
): Array<{ zip: string; countyFips: string; land: number }>;

export function parseConnecticutTownCrosswalk(text: string): Map<string, string>;

export function parseConnecticutPlanningParts(
  text: string,
  nextToOld: Map<string, string>,
  townPopulation: Map<string, number>,
): Map<string, Array<{ countyFips: string; population: number | null; land: number }>>;

export function buildRankedRows(
  landRows: Array<{ zip: string; countyFips: string; land: number }>,
  populationByZipCounty: Map<string, number>,
  connecticut: Map<string, Array<{ countyFips: string; population: number | null; land: number }>>,
): Array<[string, string, number, "p" | "l"]>;
