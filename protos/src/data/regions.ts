import type { Region } from "../types/domain";

export const regions: Region[] = [
  {
    id: "region-bay-area",
    name: "Bay Area",
    country: "USA",
    status: "active",
    networkOperatorIds: ["no-golojix", "no-skyline"],
  },
  {
    // Brick City Ops' real market — Newark / Jersey City, NJ. Serves both Free
    // Bean Coffee and Stack out of the Jersey City Depot.
    id: "region-newark",
    name: "Newark, NJ",
    country: "USA",
    status: "active",
    networkOperatorIds: ["no-brickcity"],
  },
  {
    id: "region-chicago",
    name: "Chicago Metro",
    country: "USA",
    status: "active",
    networkOperatorIds: ["no-midwest"],
  },
  {
    // Stack's real Chicago market (prod region "Chicago - O'Hare"), where
    // 1 HOUR MAIDS LLC runs the box dropoff/pickup cycle.
    id: "region-chicago-ohare",
    name: "Chicago - O'Hare",
    country: "USA",
    status: "active",
    networkOperatorIds: ["no-onehourmaids"],
  },
  {
    id: "region-austin",
    name: "Austin",
    country: "USA",
    status: "active",
    networkOperatorIds: ["no-lonestar", "no-gcroman"],
    // Autolane supervision shifts land here; G&C Roman staffs them.
    liveNetworkOperatorId: "no-gcroman",
  },
  {
    // Autolane's dispatch runs across every merchant rather than in a market,
    // so it gets its own region whose live BRNO is Brick itself.
    id: "region-autolane-dispatch",
    name: "Autolane Dispatch",
    country: "USA",
    status: "active",
    networkOperatorIds: ["no-brick-dispatch"],
    liveNetworkOperatorId: "no-brick-dispatch",
  },
  {
    id: "region-seattle",
    name: "Seattle",
    country: "USA",
    status: "launching",
    networkOperatorIds: ["no-raincity"],
  },
  {
    id: "region-denver",
    name: "Denver",
    country: "USA",
    status: "active",
    networkOperatorIds: ["no-edge"],
  },
  {
    id: "region-la",
    name: "Los Angeles",
    country: "USA",
    status: "active",
    networkOperatorIds: ["no-castillo"],
  },
  {
    id: "region-greenville",
    name: "Greenville, SC",
    country: "USA",
    status: "active",
    networkOperatorIds: ["no-kingsway"],
  },
  {
    id: "region-elp",
    name: "El Paso",
    country: "USA",
    status: "active",
    networkOperatorIds: ["no-elite"],
  },
  // --- Markets for the sample NO accounts pulled from prod (see
  // scripts/shape-no-sample.mjs). Dallas and San Antonio carry no operator of
  // their own: they are where Roblas' Texas work orders land. ---
  {
    id: "region-hollywood",
    name: "Los Angeles - Hollywood",
    country: "USA",
    status: "active",
    networkOperatorIds: ["no-alphafleet"],
  },
  {
    id: "region-fortworth",
    name: "Fort Worth, TX",
    country: "USA",
    status: "active",
    networkOperatorIds: ["no-roblas"],
  },
  {
    id: "region-houston",
    name: "Houston, TX",
    country: "USA",
    status: "active",
    networkOperatorIds: ["no-tera"],
  },
  {
    id: "region-phoenix",
    name: "Phoenix, AZ",
    country: "USA",
    status: "active",
    networkOperatorIds: ["no-elitephx"],
  },
  {
    // Brick City crosses the river for a handful of stops; no operator is based
    // here, so its work is served out of Newark.
    id: "region-nyc",
    name: "New York City, NY",
    country: "USA",
    status: "active",
    networkOperatorIds: [],
  },
  {
    id: "region-dallas",
    name: "Dallas, TX",
    country: "USA",
    status: "active",
    networkOperatorIds: [],
  },
  {
    id: "region-sanantonio",
    name: "San Antonio, TX",
    country: "USA",
    status: "active",
    networkOperatorIds: [],
  },
];
