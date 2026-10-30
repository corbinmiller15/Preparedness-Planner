export type UsZipCountyRow = {
  zip: string;
  countyFips: string;
  countyName: string;
  stateAbbr: string;
  stateName: string;
};

/**
 * Sample ZIP to county rows for development.
 * A ZIP can span counties; each row is one county, not a Census relationship-file weight.
 * The generated Census crosswalk is used only when HAZARD_PROVIDER=fema_nri.
 */
export const US_ZIP_COUNTY_FIXTURE: readonly UsZipCountyRow[] = [
  {
    zip: "10001",
    countyFips: "36061",
    countyName: "New York County",
    stateAbbr: "NY",
    stateName: "New York",
  },
  {
    zip: "90210",
    countyFips: "06037",
    countyName: "Los Angeles County",
    stateAbbr: "CA",
    stateName: "California",
  },
  {
    zip: "33139",
    countyFips: "12086",
    countyName: "Miami-Dade County",
    stateAbbr: "FL",
    stateName: "Florida",
  },
  {
    zip: "60601",
    countyFips: "17031",
    countyName: "Cook County",
    stateAbbr: "IL",
    stateName: "Illinois",
  },
  {
    zip: "84101",
    countyFips: "49035",
    countyName: "Salt Lake County",
    stateAbbr: "UT",
    stateName: "Utah",
  },
  {
    zip: "70112",
    countyFips: "22071",
    countyName: "Orleans Parish",
    stateAbbr: "LA",
    stateName: "Louisiana",
  },
  {
    zip: "94102",
    countyFips: "06075",
    countyName: "San Francisco County",
    stateAbbr: "CA",
    stateName: "California",
  },
  {
    zip: "99501",
    countyFips: "02020",
    countyName: "Anchorage Municipality",
    stateAbbr: "AK",
    stateName: "Alaska",
  },
];
