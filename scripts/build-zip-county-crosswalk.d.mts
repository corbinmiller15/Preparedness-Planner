export type CensusCrosswalkTuple = [string, string, number, string, string, string];

export function parseCensusZctaCounty(text: string): CensusCrosswalkTuple[];

export function crosswalkDocument(
  rows: CensusCrosswalkTuple[],
  generatedAt?: string,
): {
  format: 1;
  source: string;
  sourceUrl: string;
  documentationUrl: string;
  vintage: string;
  license: string;
  attribution: string;
  ratio: "land_area";
  ratioDefinition: string;
  generatedAt: string;
  rowCount: number;
  rows: CensusCrosswalkTuple[];
};
