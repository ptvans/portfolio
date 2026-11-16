import type { FieldOperator, NetworkOperator, Trip, Vehicle, Warehouse } from "../types/domain";

export const networkOperators: NetworkOperator[] = [
  {
    id: "no-golojix",
    name: "GoLojix Bay Area",
    regionId: "region-bay-area",
    warehouseIds: ["wh-golojix-oakland"],
    fieldOperatorIds: ["fo-1", "fo-2", "fo-3", "fo-4"],
    vehicleIds: ["veh-1", "veh-2"],
    contactName: "Priya Anand",
    contactEmail: "priya@golojix.com",
    status: "active",
  },
  {
    id: "no-midwest",
    name: "Midwest Movers Co",
    regionId: "region-chicago",
    warehouseIds: ["wh-midwest-cicero"],
    fieldOperatorIds: ["fo-5", "fo-6", "fo-7"],
    vehicleIds: ["veh-3"],
    contactName: "Derek Voss",
    contactEmail: "derek@midwestmovers.com",
    status: "active",
  },
  {
    id: "no-lonestar",
    name: "Lone Star Logistics",
    regionId: "region-austin",
    warehouseIds: ["wh-lonestar-austin"],
    fieldOperatorIds: ["fo-8", "fo-9"],
    vehicleIds: ["veh-4"],
    contactName: "Marisol Reyes",
    contactEmail: "marisol@lonestarlogistics.com",
    status: "active",
  },
  {
    id: "no-raincity",
    name: "Rain City Fulfillment",
    regionId: "region-seattle",
    warehouseIds: ["wh-raincity-seattle"],
    fieldOperatorIds: ["fo-10"],
    vehicleIds: ["veh-5"],
    contactName: "Sam Okafor",
    contactEmail: "sam@raincityfulfillment.com",
    status: "onboarding",
  },

  // --- Demo NO accounts (surfaced in the role/account switcher) ---
  // These simulate different Network Operators that perform work for different
  // Brands. Work orders / tasks are intentionally left to be filled in later.
  {
    // Free Bean Coffee + Stack. Business name and primary contact are the real
    // prod values (`networkoperator_3e7e21cb-…`); NO contact names are not
    // synthesized — see docs/sample-data-generation.md.
    id: "no-brickcity",
    name: "Brick City Ops LLC",
    regionId: "region-newark",
    warehouseIds: ["wh-brickcity-jerseycity"],
    fieldOperatorIds: ["fo-bc-1", "fo-bc-2"],
    vehicleIds: ["veh-bc-1", "veh-bc-2", "veh-bc-3"],
    contactName: "Rene Woodhead",
    contactEmail: "brickcitylogisticsolutions@gmail.com",
    status: "active",
  },
  {
    id: "no-moises",
    name: "Moises",
    regionId: "region-austin",
    warehouseIds: [],
    fieldOperatorIds: ["fo-mo-1", "fo-mo-2"],
    vehicleIds: [],
    contactName: "Moises Delgado",
    contactEmail: "moises@moiseslogistics.com",
    status: "active",
  },
  {
    id: "no-quicksilver",
    // Coco's real Chicago operator (business name real; contact name synthesized).
    name: "QuickSilver solutions",
    regionId: "region-chicago",
    warehouseIds: ["wh-quicksilver-chicago"],
    fieldOperatorIds: ["fo-qs-1", "fo-qs-2"],
    vehicleIds: ["veh-qs-1", "veh-qs-2", "veh-qs-3"],
    contactName: "Dana Fields",
    contactEmail: "ops@quicksilversolutions.com",
    status: "active",
  },
  {
    // Brick runs Autolane's dispatch itself, so it is the live BRNO on the
    // dispatch region. Members are Brick staff and contractors.
    id: "no-brick-dispatch",
    name: "Brick Dispatch",
    regionId: "region-autolane-dispatch",
    warehouseIds: [],
    fieldOperatorIds: ["fo-bd-1", "fo-bd-2", "fo-bd-3"],
    vehicleIds: [],
    contactName: "Michael Bencic",
    contactEmail: "dispatch@brickdynamics.com",
    status: "active",
  },
  {
    // Austin. Business name and primary contact are the real prod values
    // (`networkoperator_094daa0f-…`); George Roman is the secondary contact the
    // account is known by internally.
    id: "no-gcroman",
    name: "G&C Roman",
    regionId: "region-austin",
    warehouseIds: ["wh-gcroman-austin"],
    fieldOperatorIds: ["fo-gc-1", "fo-gc-2", "fo-gc-3", "fo-gc-4", "fo-gc-5", "fo-gc-6", "fo-gc-7", "fo-gc-8", "fo-gc-9", "fo-gc-10", "fo-gc-11"],
    vehicleIds: ["veh-gc-1"],
    contactName: "Christina Roman",
    contactEmail: "christina.a.roman@gmail.com",
    status: "active",
  },
  {
    id: "no-gilberto",
    name: "Gilberto",
    regionId: "region-bay-area",
    warehouseIds: [],
    fieldOperatorIds: ["fo-gi-1", "fo-gi-2"],
    vehicleIds: [],
    contactName: "Gilberto Nunez",
    contactEmail: "gilberto@gilbertofield.com",
    status: "active",
  },

  // --- Real operators pulled from prod for the archetype sample brands ---
  // (business name is real per the sample-data policy; contact name is synthesized).
  {
    id: "no-kingsway", // Husqvarna (Gardena) — Trade Show Retainer
    name: "Kingsway International, LLC",
    regionId: "region-greenville",
    warehouseIds: ["wh-kingsway-greenville"],
    fieldOperatorIds: ["fo-kw-1", "fo-kw-2"],
    vehicleIds: ["veh-kw-1", "veh-kw-2"],
    contactName: "Gavin Hollis",
    contactEmail: "ops@kingswayintl.com",
    status: "active",
  },
  {
    id: "no-castillo", // FIGS — Distributed Inventory
    name: "Castillo Box",
    regionId: "region-la",
    warehouseIds: ["wh-castillo-la"],
    fieldOperatorIds: ["fo-ca-1", "fo-ca-2"],
    vehicleIds: ["veh-ca-1", "veh-ca-2"],
    contactName: "Marco Serrano",
    contactEmail: "ops@castillobox.com",
    status: "active",
  },
  {
    id: "no-skyline", // Infinite Machine — Equipment Deployment
    name: "Skyline Moving Service, LLC",
    regionId: "region-bay-area",
    warehouseIds: ["wh-skyline-sf"],
    fieldOperatorIds: ["fo-sk-1", "fo-sk-2"],
    vehicleIds: ["veh-sk-1", "veh-sk-2"],
    contactName: "Andre Bell",
    contactEmail: "ops@skylinemovingservice.com",
    status: "active",
  },
  {
    id: "no-edge", // Promobile — Mixed / Custom
    name: "EDGE USA INC",
    regionId: "region-denver",
    warehouseIds: ["wh-edge-denver"],
    fieldOperatorIds: ["fo-ed-1", "fo-ed-2"],
    vehicleIds: ["veh-ed-1", "veh-ed-2"],
    contactName: "Victor Marek",
    contactEmail: "ops@edgeusa.com",
    status: "active",
  },
  {
    id: "no-elite", // Base Power — Residential Battery Deployment (El Paso)
    name: "Elite Delivery Service",
    regionId: "region-elp",
    warehouseIds: ["wh-elite-elpaso"],
    fieldOperatorIds: [],
    vehicleIds: [],
    contactName: "Ramon Delacruz",
    contactEmail: "ops@elitedeliveryservices.com",
    status: "active",
  },
  {
    // Stack — Chicago - O'Hare. Business name and primary contact are both the
    // real prod values (`networkoperator_2b542dcf-…`, " 1 HOUR MAIDS LLC /
    // GUARDIAN 1 LLC"). NO contact names are deliberately NOT synthesized here —
    // see the data-governance note in docs/sample-data-generation.md.
    id: "no-onehourmaids",
    name: "1 HOUR MAIDS LLC",
    regionId: "region-chicago-ohare",
    warehouseIds: ["wh-onehourmaids-parcel", "wh-onehourmaids-freight"],
    fieldOperatorIds: ["fo-hm-1", "fo-hm-2", "fo-hm-3"],
    vehicleIds: ["veh-hm-1", "veh-hm-2", "veh-hm-3", "veh-hm-4", "veh-hm-5"],
    contactName: "Anthony Ramirez",
    contactEmail: "hello@onehrmaids.com",
    status: "active",
  },

  // --- Sample NO accounts pulled from prod for the NO web + mobile prototypes.
  // Business names and primary-contact names/emails are the real prod values
  // (see the data-governance policy in docs/sample-data-generation.md); crews,
  // warehouses and vehicles below are synthesized. Their work orders and tasks
  // are generated into networkOperatorSample.ts. G&C Roman (above) is the fifth
  // of the set — it already existed in the roster. ---
  {
    // `networkoperator_95264cb8-…` — Stack's Hollywood operator.
    id: "no-alphafleet",
    name: "Alpha Fleet",
    regionId: "region-hollywood",
    warehouseIds: ["wh-alphafleet-hollywood"],
    fieldOperatorIds: ["fo-af-1", "fo-af-2", "fo-af-3"],
    vehicleIds: ["veh-af-1"],
    contactName: "Jack Mkhsyan",
    contactEmail: "alpha.fm.inc@gmail.com",
    status: "active",
  },
  {
    // `networkoperator_2b7045a2-…` — Fort Worth is the home market, but this is
    // the busiest of the five: its work orders run out across Dallas, Houston,
    // Austin and San Antonio, for Stack, Chewy and Sigma Pi Phi.
    id: "no-roblas",
    name: "Roblas Services LLC",
    regionId: "region-fortworth",
    warehouseIds: ["wh-roblas-fortworth"],
    fieldOperatorIds: ["fo-rb-1", "fo-rb-2", "fo-rb-3"],
    vehicleIds: ["veh-rb-1", "veh-rb-2"],
    contactName: "Roberto Diaz",
    contactEmail: "Rdiaz@roblasservicesllc.com",
    status: "active",
  },
  {
    // `networkoperator_97c5c3ad-…` — Stack's Houston operator.
    id: "no-tera",
    name: "Tera Moving Services",
    regionId: "region-houston",
    warehouseIds: ["wh-tera-houston"],
    fieldOperatorIds: ["fo-tm-1", "fo-tm-2", "fo-tm-3"],
    vehicleIds: ["veh-tm-1"],
    contactName: "Enrique Saavedra",
    contactEmail: "enrique@teramovingservices.com",
    status: "active",
  },
  {
    // `networkoperator_e43e2846-…` — the Phoenix account of Elite Delivery
    // Service (`no-elite` above is the same business in El Paso). Both carry the
    // real business name, so they read identically outside their region column;
    // `regionId` is what tells them apart. Prod names the business itself as the
    // primary contact; Sarah Maldonado is the named secondary and the person
    // this account is known by, so she is the contact here.
    id: "no-elitephx",
    name: "Elite Delivery Service",
    regionId: "region-phoenix",
    warehouseIds: ["wh-elitephx-phoenix"],
    fieldOperatorIds: ["fo-ep-1", "fo-ep-2", "fo-ep-3"],
    vehicleIds: ["veh-ep-1"],
    contactName: "Sarah Maldonado",
    contactEmail: "sarah@elitedeliveryservices.com",
    status: "active",
  },
];

// Network Operator accounts shown in the demo role/account switcher (mobile app
// and NO web UX). Add ids here as new sample accounts land. Mirrors the
// EXAMPLE_BRAND_IDS pattern used by the Brand prototype.
// The real operators behind the archetype sample brands (see
// docs/sample-data-generation.md). Drives the NO switcher in both the
// network-operator web app and the mobile app; both open on
// DEFAULT_DEMO_NETWORK_OPERATOR_ID below, not on the first entry.
export const DEMO_NETWORK_OPERATOR_IDS = [
  "no-brickcity", // Free Bean Coffee — Event Logistics Hub
  "no-kingsway", // Husqvarna (Gardena) — Trade Show Retainer
  "no-quicksilver", // Coco — Fleet Daily Cycle
  "no-castillo", // FIGS — Distributed Inventory
  "no-skyline", // Infinite Machine — Equipment Deployment
  "no-edge", // Promobile — Mixed / Custom
  "no-onehourmaids", // Stack — Chicago box dropoff/pickup cycle
  // Sample accounts shaped from a two-week prod pull around the prototype's
  // "now" (scripts/shape-no-sample.mjs), listed by home market.
  "no-alphafleet", // Hollywood, CA — Stack
  "no-roblas", // Fort Worth, TX — Stack, Chewy, Sigma Pi Phi
  "no-gcroman", // Austin, TX — Stack, AVRide, Autolane
  "no-tera", // Houston, TX — Stack
  "no-elitephx", // Phoenix, AZ — Stack, EngageMD
];

// The account both NO prototypes (web + mobile) open on. 1 HOUR MAIDS LLC has
// the fullest sample day — a real Chicago crew, shifts, and a dropoff/pickup
// cycle — so it is the best first impression of either app.
export const DEFAULT_DEMO_NETWORK_OPERATOR_ID = "no-onehourmaids";

export const warehouses: Warehouse[] = [
  {
    id: "wh-golojix-oakland",
    name: "Oakland Fulfillment Center",
    networkOperatorId: "no-golojix",
    address: "1440 Harbor Way, Oakland, CA",
    regionId: "region-bay-area",
    lat: 37.7955,
    lng: -122.2795,
  },
  {
    id: "wh-midwest-cicero",
    name: "Cicero Distribution Hub",
    networkOperatorId: "no-midwest",
    address: "220 W 25th St, Cicero, IL",
    regionId: "region-chicago",
    lat: 41.8425,
    lng: -87.754,
  },
  {
    id: "wh-lonestar-austin",
    name: "East Austin Warehouse",
    networkOperatorId: "no-lonestar",
    address: "900 Springdale Rd, Austin, TX",
    regionId: "region-austin",
    lat: 30.268,
    lng: -97.689,
  },
  {
    id: "wh-raincity-seattle",
    name: "SoDo Storage Depot",
    networkOperatorId: "no-raincity",
    address: "3100 1st Ave S, Seattle, WA",
    regionId: "region-seattle",
    lat: 47.576,
    lng: -122.3335,
  },
  {
    // Brick City Ops is really a Newark, NJ operator (prod warehouse "Jersey
    // City"). Address synthesized per the sample-data policy.
    id: "wh-brickcity-jerseycity",
    name: "Jersey City Depot",
    networkOperatorId: "no-brickcity",
    address: "260 Sip Ave, Jersey City, NJ",
    regionId: "region-newark",
    lat: 40.733,
    lng: -74.064,
  },
  {
    id: "wh-quicksilver-chicago",
    name: "Pilsen Depot",
    networkOperatorId: "no-quicksilver",
    address: "1840 S Racine Ave, Chicago, IL",
    regionId: "region-chicago",
    lat: 41.856,
    lng: -87.656,
  },
  {
    id: "wh-kingsway-greenville",
    name: "Greenville Freight Warehouse",
    networkOperatorId: "no-kingsway",
    address: "25 Woods Lake Rd, Greenville, SC",
    regionId: "region-greenville",
    lat: 34.843,
    lng: -82.332,
  },
  {
    id: "wh-castillo-la",
    name: "Vernon Storage",
    networkOperatorId: "no-castillo",
    address: "3200 E 26th St, Vernon, CA",
    regionId: "region-la",
    lat: 34.006,
    lng: -118.217,
  },
  {
    id: "wh-skyline-sf",
    name: "Bayview Service Depot",
    networkOperatorId: "no-skyline",
    address: "1601 Evans Ave, San Francisco, CA",
    regionId: "region-bay-area",
    lat: 37.7375,
    lng: -122.39,
  },
  {
    id: "wh-edge-denver",
    name: "Denver Tour Warehouse",
    networkOperatorId: "no-edge",
    address: "4800 Race St, Denver, CO",
    regionId: "region-denver",
    lat: 39.7855,
    lng: -104.966,
  },
  {
    // 1 HOUR MAIDS runs two Lincolnwood, IL buildings in prod (a parcel-delivery
    // and a freight-delivery warehouse). Names/addresses are synthesized — the
    // real ones are named after the operator's contact.
    id: "wh-onehourmaids-parcel",
    name: "Lincolnwood Parcel Warehouse",
    networkOperatorId: "no-onehourmaids",
    address: "6820 N Kostner Ave, Lincolnwood, IL",
    regionId: "region-chicago-ohare",
    lat: 42.0055,
    lng: -87.7395,
  },
  {
    id: "wh-onehourmaids-freight",
    name: "Lincolnwood Freight Warehouse",
    networkOperatorId: "no-onehourmaids",
    address: "7145 N Kilpatrick Ave, Lincolnwood, IL",
    regionId: "region-chicago-ohare",
    lat: 42.011,
    lng: -87.742,
  },
  {
    id: "wh-elite-elpaso",
    name: "El Paso",
    networkOperatorId: "no-elite",
    address: "2100 Lomaland Dr, El Paso, TX",
    regionId: "region-elp",
    lat: 31.769,
    lng: -106.335,
  },

  // --- Depots for the sample NO accounts. Each operator's tasks leave from and
  // return to its home depot; addresses are synthesized per the sample-data
  // policy, coordinates are the real metro so route maps land in the right city.
  {
    id: "wh-alphafleet-hollywood",
    name: "Hollywood Depot",
    networkOperatorId: "no-alphafleet",
    address: "1150 N Sycamore Ave, Los Angeles, CA",
    regionId: "region-hollywood",
    lat: 34.0906,
    lng: -118.3387,
  },
  {
    id: "wh-roblas-fortworth",
    name: "Fort Worth Yard",
    networkOperatorId: "no-roblas",
    address: "3400 E Lancaster Ave, Fort Worth, TX",
    regionId: "region-fortworth",
    lat: 32.7502,
    lng: -97.2749,
  },
  {
    id: "wh-tera-houston",
    name: "Houston Northwest Depot",
    networkOperatorId: "no-tera",
    address: "5600 Hempstead Rd, Houston, TX",
    regionId: "region-houston",
    lat: 29.8004,
    lng: -95.4322,
  },
  {
    id: "wh-gcroman-austin",
    name: "Austin East Depot",
    networkOperatorId: "no-gcroman",
    address: "4200 Airport Blvd, Austin, TX",
    regionId: "region-austin",
    lat: 30.2988,
    lng: -97.7075,
  },
  {
    id: "wh-elitephx-phoenix",
    name: "Phoenix Depot",
    networkOperatorId: "no-elitephx",
    address: "2840 W Buckeye Rd, Phoenix, AZ",
    regionId: "region-phoenix",
    lat: 33.4353,
    lng: -112.1183,
  },
];

export const fieldOperators: FieldOperator[] = [
  { id: "fo-1", name: "Marcus Lee", networkOperatorId: "no-golojix", skillIds: ["skill-lifting", "skill-box-truck"], status: "on_shift", avatarColor: "#d15a34" },
  { id: "fo-2", name: "Jenny Park", networkOperatorId: "no-golojix", skillIds: ["skill-lifting", "skill-customer-service"], status: "on_shift", avatarColor: "#23aa74" },
  { id: "fo-3", name: "Ola Adeyemi", networkOperatorId: "no-golojix", skillIds: ["skill-inventory"], status: "on_break", avatarColor: "#3a63e0" },
  { id: "fo-4", name: "Tyler Brooks", networkOperatorId: "no-golojix", skillIds: ["skill-box-truck", "skill-install"], status: "off_shift", avatarColor: "#8b5cf6" },
  { id: "fo-5", name: "Grace Kim", networkOperatorId: "no-midwest", skillIds: ["skill-lifting", "skill-box-truck"], status: "on_shift", avatarColor: "#d15a34" },
  { id: "fo-6", name: "Ben Ortiz", networkOperatorId: "no-midwest", skillIds: ["skill-install", "skill-customer-service"], status: "on_shift", avatarColor: "#23aa74" },
  { id: "fo-7", name: "Fatima Siddiqui", networkOperatorId: "no-midwest", skillIds: ["skill-inventory"], status: "off_shift", avatarColor: "#3a63e0" },
  { id: "fo-8", name: "Cole Whitfield", networkOperatorId: "no-lonestar", skillIds: ["skill-lifting", "skill-box-truck"], status: "on_shift", avatarColor: "#d15a34" },
  { id: "fo-9", name: "Ana Delgado", networkOperatorId: "no-lonestar", skillIds: ["skill-customer-service", "skill-install"], status: "on_break", avatarColor: "#23aa74" },
  { id: "fo-10", name: "Jordan Yee", networkOperatorId: "no-raincity", skillIds: ["skill-lifting"], status: "on_shift", avatarColor: "#d15a34" },

  // Demo NO account crews
  { id: "fo-bc-1", name: "Tomas Reyes", networkOperatorId: "no-brickcity", skillIds: ["skill-lifting", "skill-box-truck"], status: "on_shift", avatarColor: "#d15a34" },
  { id: "fo-bc-2", name: "Tasha Wynn", networkOperatorId: "no-brickcity", skillIds: ["skill-install", "skill-customer-service"], status: "on_shift", avatarColor: "#23aa74" },

  // Tso operation crew — supervisors & dispatchers for the shift schedule.
  { id: "fo-tso-1", name: "Patrick Mitchell", networkOperatorId: "no-brickcity", skillIds: ["skill-vehicle", "skill-box-truck"], status: "on_shift", avatarColor: "#23aa74" },
  { id: "fo-tso-2", name: "Bryan Hanley", networkOperatorId: "no-brickcity", skillIds: ["skill-vehicle", "skill-inventory"], status: "on_shift", avatarColor: "#d15a34" },
  { id: "fo-tso-3", name: "Michael Bencic", networkOperatorId: "no-brickcity", skillIds: ["skill-vehicle", "skill-box-truck"], status: "on_shift", avatarColor: "#3a63e0" },
  { id: "fo-tso-4", name: "Cole Murski", networkOperatorId: "no-brickcity", skillIds: ["skill-customer-service", "skill-install"], status: "on_shift", avatarColor: "#8b5cf6" },
  { id: "fo-tso-5", name: "George Roman III", networkOperatorId: "no-brickcity", skillIds: ["skill-customer-service", "skill-lifting"], status: "on_shift", avatarColor: "#0d9488" },
  { id: "fo-tso-6", name: "Cole Pestana", networkOperatorId: "no-brickcity", skillIds: ["skill-customer-service"], status: "on_shift", avatarColor: "#e35205" },
  { id: "fo-tso-7", name: "Paul Roman", networkOperatorId: "no-brickcity", skillIds: ["skill-customer-service", "skill-inventory"], status: "on_shift", avatarColor: "#002e30" },
  { id: "fo-tso-8", name: "Christina Roman", networkOperatorId: "no-brickcity", skillIds: ["skill-customer-service"], status: "on_shift", avatarColor: "#be185d" },
  { id: "fo-tso-9", name: "John Joste", networkOperatorId: "no-brickcity", skillIds: ["skill-customer-service", "skill-lifting"], status: "off_shift", avatarColor: "#b45309" },
  { id: "fo-tso-10", name: "William Ringstaff", networkOperatorId: "no-brickcity", skillIds: ["skill-customer-service"], status: "on_shift", avatarColor: "#6d28d9" },
  { id: "fo-tso-11", name: "Xavier Herrera", networkOperatorId: "no-brickcity", skillIds: ["skill-customer-service", "skill-install"], status: "off_shift", avatarColor: "#0e7490" },
  { id: "fo-tso-12", name: "George Roman Jr", networkOperatorId: "no-brickcity", skillIds: ["skill-customer-service"], status: "off_shift", avatarColor: "#4d7c0f" },
  { id: "fo-mo-1", name: "Moises Delgado", networkOperatorId: "no-moises", skillIds: ["skill-vehicle", "skill-customer-service"], status: "on_shift", avatarColor: "#3a63e0" },
  { id: "fo-mo-2", name: "Elena Ruiz", networkOperatorId: "no-moises", skillIds: ["skill-lifting"], status: "off_shift", avatarColor: "#8b5cf6" },
  { id: "fo-qs-1", name: "Dana Fields", networkOperatorId: "no-quicksilver", skillIds: ["skill-box-truck", "skill-inventory"], status: "on_shift", avatarColor: "#d15a34" },
  { id: "fo-qs-2", name: "Marcus Webb", networkOperatorId: "no-quicksilver", skillIds: ["skill-lifting", "skill-install"], status: "on_break", avatarColor: "#23aa74" },
  { id: "fo-gc-1", name: "Marisol Tovar", networkOperatorId: "no-gcroman", skillIds: ["skill-vehicle", "skill-customer-service"], status: "on_shift", avatarColor: "#0d9488" },
  { id: "fo-gc-2", name: "Sofia Marin", networkOperatorId: "no-gcroman", skillIds: ["skill-vehicle"], status: "on_shift", avatarColor: "#3a63e0" },
  { id: "fo-gc-3", name: "Dominic Pryor", networkOperatorId: "no-gcroman", skillIds: ["skill-lifting", "skill-inventory"], status: "on_shift", avatarColor: "#b4813a" },

  // Autolane supervision crew — G&C Roman staffs the Austin shifts.
  { id: "fo-gc-4", name: "Cole Murski", networkOperatorId: "no-gcroman", skillIds: ["skill-vehicle", "skill-customer-service"], status: "on_shift", avatarColor: "#8b5cf6" },
  { id: "fo-gc-5", name: "George Roman III", networkOperatorId: "no-gcroman", skillIds: ["skill-vehicle", "skill-customer-service"], status: "on_shift", avatarColor: "#0d9488" },
  { id: "fo-gc-6", name: "Cole Pestana", networkOperatorId: "no-gcroman", skillIds: ["skill-vehicle"], status: "on_shift", avatarColor: "#e35205" },
  { id: "fo-gc-7", name: "Paul Roman", networkOperatorId: "no-gcroman", skillIds: ["skill-vehicle", "skill-customer-service"], status: "on_shift", avatarColor: "#002e30" },
  { id: "fo-gc-8", name: "William Ringstaff", networkOperatorId: "no-gcroman", skillIds: ["skill-vehicle"], status: "on_shift", avatarColor: "#6d28d9" },
  { id: "fo-gc-9", name: "John Joste", networkOperatorId: "no-gcroman", skillIds: ["skill-vehicle", "skill-customer-service"], status: "off_shift", avatarColor: "#b45309" },
  { id: "fo-gc-10", name: "Xavier Herrera", networkOperatorId: "no-gcroman", skillIds: ["skill-vehicle"], status: "on_shift", avatarColor: "#0e7490" },
  { id: "fo-gc-11", name: "George Roman Jr", networkOperatorId: "no-gcroman", skillIds: ["skill-vehicle"], status: "off_shift", avatarColor: "#4d7c0f" },

  // Brick's own dispatchers, on the dispatch region's BRNO.
  { id: "fo-bd-1", name: "Patrick Mitchell", networkOperatorId: "no-brick-dispatch", skillIds: ["skill-vehicle", "skill-customer-service"], status: "on_shift", avatarColor: "#23aa74" },
  { id: "fo-bd-2", name: "Bryan Hanley", networkOperatorId: "no-brick-dispatch", skillIds: ["skill-vehicle"], status: "on_shift", avatarColor: "#d15a34" },
  { id: "fo-bd-3", name: "Michael Bencic", networkOperatorId: "no-brick-dispatch", skillIds: ["skill-vehicle", "skill-customer-service"], status: "on_shift", avatarColor: "#3a63e0" },
  { id: "fo-gi-1", name: "Gilberto Nunez", networkOperatorId: "no-gilberto", skillIds: ["skill-vehicle", "skill-customer-service"], status: "on_shift", avatarColor: "#d15a34" },
  { id: "fo-gi-2", name: "Priya Nair", networkOperatorId: "no-gilberto", skillIds: ["skill-vehicle", "skill-inventory"], status: "off_shift", avatarColor: "#8b5cf6" },

  // Crews for the archetype sample operators. NO primary contact names are real;
  // second crew members are synthetic (or the NO's real secondary contact).
  { id: "fo-kw-1", name: "Gavin Hollis", networkOperatorId: "no-kingsway", skillIds: ["skill-lifting", "skill-box-truck"], status: "on_shift", avatarColor: "#e35205" },
  { id: "fo-kw-2", name: "Dana Whitfield", networkOperatorId: "no-kingsway", skillIds: ["skill-inventory"], status: "off_shift", avatarColor: "#3a63e0" },
  { id: "fo-ca-1", name: "Marco Serrano", networkOperatorId: "no-castillo", skillIds: ["skill-lifting", "skill-box-truck", "skill-inventory"], status: "on_shift", avatarColor: "#0d9488" },
  { id: "fo-ca-2", name: "Marisol Vega", networkOperatorId: "no-castillo", skillIds: ["skill-install", "skill-customer-service"], status: "on_shift", avatarColor: "#8b5cf6" },
  { id: "fo-sk-1", name: "Andre Bell", networkOperatorId: "no-skyline", skillIds: ["skill-vehicle", "skill-install"], status: "on_shift", avatarColor: "#d15a34" },
  { id: "fo-sk-2", name: "Kofi Mensah", networkOperatorId: "no-skyline", skillIds: ["skill-vehicle", "skill-customer-service"], status: "on_shift", avatarColor: "#23aa74" },
  { id: "fo-ed-1", name: "Victor Marek", networkOperatorId: "no-edge", skillIds: ["skill-lifting", "skill-box-truck"], status: "on_shift", avatarColor: "#002e30" },
  { id: "fo-ed-2", name: "Sasha Milen", networkOperatorId: "no-edge", skillIds: ["skill-install", "skill-inventory"], status: "on_break", avatarColor: "#3a63e0" },

  // 1 HOUR MAIDS LLC (Stack — Chicago). `fo-hm-1` is the demo Field Operator
  // user: it is deliberately FIRST in this account's crew, because both the NO
  // web app and the mobile app resolve the acting Field Operator as crew[0].
  // Switching to "1 HOUR MAIDS LLC" + the Field Operator role signs you in as
  // this user, whose own queue is the account's Stack dropoff/pickup work.
  { id: "fo-hm-1", name: "Elias Vargas", networkOperatorId: "no-onehourmaids", skillIds: ["skill-lifting", "skill-box-truck", "skill-customer-service"], status: "on_shift", avatarColor: "#018e5a" },
  { id: "fo-hm-2", name: "Noor Haddad", networkOperatorId: "no-onehourmaids", skillIds: ["skill-lifting", "skill-box-truck"], status: "on_shift", avatarColor: "#d15a34" },
  { id: "fo-hm-3", name: "Terrence Boyle", networkOperatorId: "no-onehourmaids", skillIds: ["skill-inventory", "skill-lifting"], status: "off_shift", avatarColor: "#3a63e0" },

  // The wider Chicago roster: staff available to schedule on the shift
  // planner beyond the three who carry the seeded day's tasks.
  { id: "fo-hm-4", name: "Darnell Pruitt", networkOperatorId: "no-onehourmaids", skillIds: ["skill-box-truck", "skill-lifting"], status: "on_shift", avatarColor: "#be123c" },
  { id: "fo-hm-5", name: "Alina Sokolova", networkOperatorId: "no-onehourmaids", skillIds: ["skill-customer-service", "skill-inventory"], status: "on_shift", avatarColor: "#1d4ed8" },
  { id: "fo-hm-6", name: "Marcus Vidal", networkOperatorId: "no-onehourmaids", skillIds: ["skill-vehicle", "skill-box-truck"], status: "on_shift", avatarColor: "#047857" },
  { id: "fo-hm-7", name: "Jolene Whitfield", networkOperatorId: "no-onehourmaids", skillIds: ["skill-customer-service"], status: "off_shift", avatarColor: "#c2410c" },
  { id: "fo-hm-8", name: "Ibrahim Nasser", networkOperatorId: "no-onehourmaids", skillIds: ["skill-lifting", "skill-install"], status: "on_shift", avatarColor: "#a21caf" },
  { id: "fo-hm-9", name: "Grace Nakamura", networkOperatorId: "no-onehourmaids", skillIds: ["skill-customer-service", "skill-install"], status: "on_break", avatarColor: "#0f766e" },
  { id: "fo-hm-10", name: "Victor Salazar", networkOperatorId: "no-onehourmaids", skillIds: ["skill-vehicle", "skill-lifting"], status: "on_shift", avatarColor: "#4338ca" },
  { id: "fo-hm-11", name: "Bridget O\'Leary", networkOperatorId: "no-onehourmaids", skillIds: ["skill-inventory", "skill-customer-service"], status: "on_shift", avatarColor: "#b91c1c" },
  { id: "fo-hm-12", name: "Andre Kaminski", networkOperatorId: "no-onehourmaids", skillIds: ["skill-box-truck"], status: "off_shift", avatarColor: "#7c2d12" },
  { id: "fo-hm-13", name: "Thandiwe Moyo", networkOperatorId: "no-onehourmaids", skillIds: ["skill-customer-service", "skill-lifting"], status: "on_shift", avatarColor: "#15803d" },
  { id: "fo-hm-14", name: "Ruben Ochoa", networkOperatorId: "no-onehourmaids", skillIds: ["skill-vehicle", "skill-install"], status: "on_shift", avatarColor: "#9333ea" },
  { id: "fo-hm-15", name: "Carla Bianchi", networkOperatorId: "no-onehourmaids", skillIds: ["skill-inventory"], status: "on_break", avatarColor: "#0369a1" },
  { id: "fo-hm-16", name: "Desmond Ellery", networkOperatorId: "no-onehourmaids", skillIds: ["skill-lifting", "skill-box-truck"], status: "on_shift", avatarColor: "#db2777" },
  { id: "fo-hm-17", name: "Yara Khalil", networkOperatorId: "no-onehourmaids", skillIds: ["skill-customer-service"], status: "off_shift", avatarColor: "#854d0e" },
  { id: "fo-hm-18", name: "Trevor Lindgren", networkOperatorId: "no-onehourmaids", skillIds: ["skill-vehicle", "skill-customer-service"], status: "on_shift", avatarColor: "#0e7490" },

  // Crews for the sample NO accounts. Field-operator names are synthesized (the
  // governance policy keeps only NO business names and contacts real). As with
  // 1 HOUR MAIDS above, crew[0] is the account's demo Field Operator user —
  // switching to the account in the Field Operator role signs you in as them,
  // so it is the crew member the generated tasks lean on.
  { id: "fo-af-1", name: "Rafael Ocampo", networkOperatorId: "no-alphafleet", skillIds: ["skill-lifting", "skill-box-truck", "skill-customer-service"], status: "on_shift", avatarColor: "#7c6cf0" },
  { id: "fo-af-2", name: "Danielle Kwon", networkOperatorId: "no-alphafleet", skillIds: ["skill-lifting", "skill-box-truck"], status: "on_shift", avatarColor: "#d15a34" },
  { id: "fo-af-3", name: "Miles Ferreira", networkOperatorId: "no-alphafleet", skillIds: ["skill-inventory", "skill-lifting"], status: "off_shift", avatarColor: "#0d9488" },
  { id: "fo-rb-1", name: "Andres Padilla", networkOperatorId: "no-roblas", skillIds: ["skill-lifting", "skill-box-truck", "skill-customer-service"], status: "on_shift", avatarColor: "#018e5a" },
  { id: "fo-rb-2", name: "Kendra Salas", networkOperatorId: "no-roblas", skillIds: ["skill-inventory", "skill-lifting"], status: "on_shift", avatarColor: "#3a63e0" },
  { id: "fo-rb-3", name: "Theo Blackwell", networkOperatorId: "no-roblas", skillIds: ["skill-lifting", "skill-install"], status: "on_shift", avatarColor: "#b4813a" },
  { id: "fo-tm-1", name: "Luis Amador", networkOperatorId: "no-tera", skillIds: ["skill-lifting", "skill-box-truck", "skill-customer-service"], status: "on_shift", avatarColor: "#e35205" },
  { id: "fo-tm-2", name: "Bianca Ruelas", networkOperatorId: "no-tera", skillIds: ["skill-lifting", "skill-box-truck"], status: "on_shift", avatarColor: "#8b5cf6" },
  { id: "fo-tm-3", name: "Nate Okafor", networkOperatorId: "no-tera", skillIds: ["skill-inventory"], status: "off_shift", avatarColor: "#0d9488" },
  { id: "fo-ep-1", name: "Camila Estrada", networkOperatorId: "no-elitephx", skillIds: ["skill-lifting", "skill-box-truck", "skill-customer-service"], status: "on_shift", avatarColor: "#23aa74" },
  { id: "fo-ep-2", name: "Jonah Whitlock", networkOperatorId: "no-elitephx", skillIds: ["skill-inventory", "skill-lifting"], status: "on_shift", avatarColor: "#d15a34" },
  { id: "fo-ep-3", name: "Priya Raman", networkOperatorId: "no-elitephx", skillIds: ["skill-lifting"], status: "off_shift", avatarColor: "#3a63e0" },
];

// Fleet available to each operator. `modelLabel` + `capacityCuFt` are what the
// Route Planning equipment picker shows and what route generation packs
// against; the older sample vehicles carry them too so every account can plan.
export const vehicles: Vehicle[] = [
  { id: "veh-1", label: "Van 01", type: "van", networkOperatorId: "no-golojix", modelLabel: "Ford Transit 350 High Roof", capacityCuFt: 487 },
  { id: "veh-2", label: "Box Truck 01", type: "box_truck", networkOperatorId: "no-golojix", modelLabel: "16' Isuzu NPR Box Truck", capacityCuFt: 900 },
  { id: "veh-3", label: "Box Truck 01", type: "box_truck", networkOperatorId: "no-midwest", modelLabel: "16' Isuzu NPR Box Truck", capacityCuFt: 900 },
  { id: "veh-4", label: "Van 01", type: "van", networkOperatorId: "no-lonestar", modelLabel: "Mercedes Sprinter 2500", capacityCuFt: 469 },
  { id: "veh-5", label: "Cargo Bike 01", type: "cargo_bike", networkOperatorId: "no-raincity", modelLabel: "Urban Arrow Cargo XL", capacityCuFt: 42 },

  // --- Demo NO fleets (drive the Route Planning equipment picker) ---
  // 1 HOUR MAIDS LLC (Lincolnwood, IL) is the default demo account and carries
  // the fullest fleet: four box trucks plus a van, enough to split a full day of
  // deliveries several ways.
  { id: "veh-hm-1", label: "Truck 01", type: "box_truck", networkOperatorId: "no-onehourmaids", modelLabel: "26' Hino Box Truck", capacityCuFt: 1600 },
  { id: "veh-hm-2", label: "Truck 03", type: "box_truck", networkOperatorId: "no-onehourmaids", modelLabel: "26' Hino Box Truck", capacityCuFt: 1600 },
  { id: "veh-hm-3", label: "Truck 04", type: "box_truck", networkOperatorId: "no-onehourmaids", modelLabel: "26' Hino Box Truck", capacityCuFt: 1600 },
  { id: "veh-hm-4", label: "Truck 09", type: "box_truck", networkOperatorId: "no-onehourmaids", modelLabel: "16' Isuzu NPR Box Truck", capacityCuFt: 900 },
  { id: "veh-hm-5", label: "Van 02", type: "van", networkOperatorId: "no-onehourmaids", modelLabel: "Ford Transit 350 High Roof", capacityCuFt: 487 },

  { id: "veh-bc-1", label: "Truck 01", type: "box_truck", networkOperatorId: "no-brickcity", modelLabel: "26' Hino Box Truck", capacityCuFt: 1600 },
  { id: "veh-bc-2", label: "Truck 02", type: "box_truck", networkOperatorId: "no-brickcity", modelLabel: "16' Isuzu NPR Box Truck", capacityCuFt: 900 },
  { id: "veh-bc-3", label: "Van 01", type: "van", networkOperatorId: "no-brickcity", modelLabel: "Mercedes Sprinter 2500", capacityCuFt: 469 },

  { id: "veh-kw-1", label: "Truck 01", type: "box_truck", networkOperatorId: "no-kingsway", modelLabel: "26' Hino Box Truck", capacityCuFt: 1600 },
  { id: "veh-kw-2", label: "Truck 02", type: "box_truck", networkOperatorId: "no-kingsway", modelLabel: "26' Hino Box Truck", capacityCuFt: 1600 },

  { id: "veh-qs-1", label: "Truck 01", type: "box_truck", networkOperatorId: "no-quicksilver", modelLabel: "16' Isuzu NPR Box Truck", capacityCuFt: 900 },
  { id: "veh-qs-2", label: "Van 01", type: "van", networkOperatorId: "no-quicksilver", modelLabel: "Ford Transit 350 High Roof", capacityCuFt: 487 },
  { id: "veh-qs-3", label: "Van 02", type: "van", networkOperatorId: "no-quicksilver", modelLabel: "Ford Transit 350 High Roof", capacityCuFt: 487 },

  { id: "veh-ca-1", label: "Truck 01", type: "box_truck", networkOperatorId: "no-castillo", modelLabel: "26' Hino Box Truck", capacityCuFt: 1600 },
  { id: "veh-ca-2", label: "Truck 02", type: "box_truck", networkOperatorId: "no-castillo", modelLabel: "16' Isuzu NPR Box Truck", capacityCuFt: 900 },

  { id: "veh-sk-1", label: "Truck 01", type: "box_truck", networkOperatorId: "no-skyline", modelLabel: "26' Hino Box Truck", capacityCuFt: 1600 },
  { id: "veh-sk-2", label: "Van 01", type: "van", networkOperatorId: "no-skyline", modelLabel: "Mercedes Sprinter 2500", capacityCuFt: 469 },

  { id: "veh-ed-1", label: "Truck 01", type: "box_truck", networkOperatorId: "no-edge", modelLabel: "26' Hino Box Truck", capacityCuFt: 1600 },
  { id: "veh-ed-2", label: "Truck 02", type: "box_truck", networkOperatorId: "no-edge", modelLabel: "26' Hino Box Truck", capacityCuFt: 1600 },

  // Fleet for the sample NO accounts, sized to each one's daily volume.
  { id: "veh-af-1", label: "Truck 01", type: "box_truck", networkOperatorId: "no-alphafleet", modelLabel: "16' Isuzu NPR Box Truck", capacityCuFt: 900 },
  { id: "veh-rb-1", label: "Truck 01", type: "box_truck", networkOperatorId: "no-roblas", modelLabel: "26' Hino Box Truck", capacityCuFt: 1600 },
  { id: "veh-rb-2", label: "Truck 02", type: "box_truck", networkOperatorId: "no-roblas", modelLabel: "16' Isuzu NPR Box Truck", capacityCuFt: 900 },
  { id: "veh-tm-1", label: "Truck 01", type: "box_truck", networkOperatorId: "no-tera", modelLabel: "26' Hino Box Truck", capacityCuFt: 1600 },
  { id: "veh-gc-1", label: "Van 01", type: "van", networkOperatorId: "no-gcroman", modelLabel: "Ford Transit 350 High Roof", capacityCuFt: 487 },
  // The supervised fleet: a Model Y per concurrent supervision shift.
  { id: "veh-gc-my1", label: "Model Y 606125", type: "van", networkOperatorId: "no-gcroman", modelLabel: "Tesla Model Y", capacityCuFt: 76 },
  { id: "veh-gc-my2", label: "Model Y 606332", type: "van", networkOperatorId: "no-gcroman", modelLabel: "Tesla Model Y", capacityCuFt: 76 },
  { id: "veh-gc-my3", label: "Model Y 606472", type: "van", networkOperatorId: "no-gcroman", modelLabel: "Tesla Model Y", capacityCuFt: 76 },
  { id: "veh-gc-my4", label: "Model Y 606732", type: "van", networkOperatorId: "no-gcroman", modelLabel: "Tesla Model Y", capacityCuFt: 76 },
  { id: "veh-gc-my5", label: "Model Y 697036", type: "van", networkOperatorId: "no-gcroman", modelLabel: "Tesla Model Y", capacityCuFt: 76 },
  { id: "veh-gc-my6", label: "Model Y 699757", type: "van", networkOperatorId: "no-gcroman", modelLabel: "Tesla Model Y", capacityCuFt: 76 },
  { id: "veh-gc-my7", label: "Model Y 700581", type: "van", networkOperatorId: "no-gcroman", modelLabel: "Tesla Model Y", capacityCuFt: 76 },
  { id: "veh-gc-my8", label: "Model Y 700910", type: "van", networkOperatorId: "no-gcroman", modelLabel: "Tesla Model Y", capacityCuFt: 76 },
  { id: "veh-gc-my9", label: "Model Y 700982", type: "van", networkOperatorId: "no-gcroman", modelLabel: "Tesla Model Y", capacityCuFt: 76 },
  { id: "veh-ep-1", label: "Truck 01", type: "box_truck", networkOperatorId: "no-elitephx", modelLabel: "16' Isuzu NPR Box Truck", capacityCuFt: 900 },
];

export const trips: Trip[] = [
  {
    id: "trip-1",
    warehouseId: "wh-golojix-oakland",
    vehicleId: "veh-1",
    fieldOperatorIds: ["fo-1"],
    taskIds: ["task-1", "task-2"],
    status: "in_progress",
    scheduledAt: "2026-10-13T09:00:00-07:00",
  },
  {
    id: "trip-2",
    warehouseId: "wh-golojix-oakland",
    vehicleId: "veh-2",
    fieldOperatorIds: ["fo-2"],
    taskIds: ["task-3"],
    status: "delayed",
    scheduledAt: "2026-10-13T10:30:00-07:00",
  },
  {
    id: "trip-3",
    warehouseId: "wh-midwest-cicero",
    vehicleId: "veh-3",
    fieldOperatorIds: ["fo-5", "fo-6"],
    taskIds: ["task-9", "task-10"],
    status: "scheduled",
    scheduledAt: "2026-10-13T13:00:00-05:00",
  },
];
