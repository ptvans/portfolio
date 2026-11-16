import type { OrderKind, TaskKind } from "../types/domain";

export const taskKinds: TaskKind[] = [
  {
    id: "task-kind-delivery",
    name: "Delivery",
    description: "Deliver the order to the customer's location.",
    requiredSkillIds: ["skill-lifting", "skill-box-truck"],
  },
  {
    id: "task-kind-pickup",
    name: "Pickup",
    description: "Pick up the order from the customer's location.",
    requiredSkillIds: ["skill-lifting", "skill-box-truck"],
  },
  {
    id: "task-kind-setup",
    name: "On-site Setup",
    description: "Assemble and set up rented equipment on-site.",
    requiredSkillIds: ["skill-install", "skill-customer-service"],
  },
  {
    id: "task-kind-breakdown",
    name: "Breakdown & Return",
    description: "Disassemble equipment and return it to the warehouse.",
    requiredSkillIds: ["skill-install", "skill-lifting"],
  },
  {
    id: "task-kind-audit",
    name: "Inventory Audit",
    description: "Count and reconcile warehouse inventory.",
    requiredSkillIds: ["skill-inventory"],
  },
  // --- Autolane — fleet supervision / staffing (pulled from prod) ---
  { id: "task-kind-al-bgcheck", name: "Run Background Checks and MVRs", description: "Record work performed running background checks and MVRs for supervisors.", requiredSkillIds: [] },
  { id: "task-kind-al-training", name: "Training", description: "Record time spent training and onboarding new supervisors.", requiredSkillIds: ["skill-customer-service"] },
  // Autolane's two shift kinds. `taskType: "shift"` is behaviour a kind opts
  // into: time and duration become required, the task renders as a shift
  // everywhere, and the Shifts page shows only these.
  { id: "task-kind-al-supervise", name: "Supervise Vehicle", description: "Attend and supervise a vehicle for a scheduled shift.", requiredSkillIds: ["skill-vehicle", "skill-customer-service"], taskType: "shift", timeRequirement: "required", durationRequirement: "required", regionId: "region-austin" },
  { id: "task-kind-al-dispatch", name: "Dispatch", description: "Cover dispatch for every merchant for a scheduled shift.", requiredSkillIds: ["skill-vehicle", "skill-customer-service"], taskType: "shift", timeRequirement: "required", durationRequirement: "required", regionId: "region-autolane-dispatch" },
  { id: "task-kind-al-parking", name: "Monthly Parking", description: "Record parking spots leased for the managed fleet for the upcoming month.", requiredSkillIds: ["skill-vehicle"] },
  { id: "task-kind-al-adhoc", name: "Hours of work completed", description: "Record hours of ad hoc work requested by Autolane.", requiredSkillIds: [] },
  {
    id: "task-kind-acknowledge",
    name: "Acknowledge",
    description: "Acknowledge and confirm the customer's request.",
    requiredSkillIds: [],
  },
  {
    id: "task-kind-kit-stage",
    name: "Kit & Stage",
    description: "Kit and stage equipment ahead of delivery.",
    requiredSkillIds: ["skill-inventory"],
  },
  {
    id: "task-kind-trash-pickup",
    name: "Trash Pick-Up",
    description: "Retrieve packaging and waste after the install.",
    requiredSkillIds: [],
  },

  // --- Free Bean Coffee (Event Logistics Hub archetype) ---
  {
    id: "task-kind-fb-acknowledge",
    name: "Acknowledgement",
    description: "Acknowledge and confirm the brand's request before work begins.",
    requiredSkillIds: [],
  },
  {
    id: "task-kind-fb-receive-parcel",
    name: "Receive Inventory — Parcel",
    description: "Receive inbound parcel shipments at the warehouse and check them in.",
    requiredSkillIds: ["skill-lifting", "skill-inventory"],
  },
  {
    id: "task-kind-fb-receive-pallet",
    name: "Receive Inventory — Pallet",
    description: "Receive inbound palletized freight at the warehouse and check it in.",
    requiredSkillIds: ["skill-lifting", "skill-inventory"],
  },
  {
    id: "task-kind-fb-storage",
    name: "Weekly Storage by Pallet",
    description: "Recurring weekly storage of the brand's pallets at the warehouse.",
    requiredSkillIds: ["skill-inventory"],
  },
  {
    id: "task-kind-fb-deliver-event",
    name: "Deliver to Event",
    description: "Deliver staged inventory to the event / activation site.",
    requiredSkillIds: ["skill-lifting", "skill-box-truck", "skill-customer-service"],
  },
  {
    id: "task-kind-fb-pickup-event",
    name: "Pick Up from Event",
    description: "Recover reusable inventory from the event site after the activation.",
    requiredSkillIds: ["skill-lifting", "skill-box-truck"],
  },
  {
    id: "task-kind-fb-outbound",
    name: "Outbound Shipment (LTL / Parcel)",
    description: "Stage and ship inventory outbound to a destination via LTL or parcel.",
    requiredSkillIds: ["skill-box-truck", "skill-inventory"],
  },
  {
    id: "task-kind-fb-stage-pickup",
    name: "Stage for Local Pickup",
    description: "Stage inventory for local courier pickup at the warehouse.",
    requiredSkillIds: ["skill-inventory"],
  },
  {
    id: "task-kind-fb-prep-label",
    name: "Prep & Stage for Labeling",
    description: "Pull and stage cans ahead of a labeling run.",
    requiredSkillIds: ["skill-inventory"],
  },
  {
    id: "task-kind-fb-label",
    name: "Label Cans",
    description: "Apply client-branded labels to a batch of coffee cans.",
    requiredSkillIds: [],
  },
  {
    id: "task-kind-fb-adhoc",
    name: "Ad Hoc Task",
    description: "Non-standard ad hoc work requested by the brand.",
    requiredSkillIds: [],
  },

  // --- Husqvarna (Gardena) — Trade Show Retainer ---
  { id: "task-kind-hg-shipping", name: "Shipping", description: "Ship show freight to the next trade-show destination.", requiredSkillIds: ["skill-box-truck", "skill-inventory"] },
  { id: "task-kind-hg-pickup", name: "Pre-Event Pickup", description: "Pick up product from a manufacturer or prior show.", requiredSkillIds: ["skill-lifting", "skill-box-truck"] },
  { id: "task-kind-hg-setup", name: "Event Setup Labor", description: "On-site booth setup hands at the show.", requiredSkillIds: ["skill-install", "skill-customer-service"] },

  // --- Coco — Fleet Daily Cycle ---
  { id: "task-kind-co-deploy", name: "Deployment", description: "Morning load-in and deploy of robots to the merchant route.", requiredSkillIds: ["skill-vehicle", "skill-lifting"] },
  { id: "task-kind-co-undeploy", name: "Undeployment", description: "Evening pickup and load-out of robots back to the depot.", requiredSkillIds: ["skill-vehicle", "skill-lifting"] },
  { id: "task-kind-co-battery", name: "Daily Battery Swap", description: "Swap depleted batteries and stage charged units.", requiredSkillIds: [] },
  { id: "task-kind-co-rescue", name: "Bot Rescue", description: "Recover a stranded robot (emergency rescues carry a 3-minute response SLA).", requiredSkillIds: ["skill-vehicle"] },
  { id: "task-kind-co-mech-drop", name: "Dropoff Bots at Mechanic", description: "Drive grounded bots to the mechanic facility.", requiredSkillIds: ["skill-vehicle"] },
  { id: "task-kind-co-mech-pick", name: "Pickup Bots at Mechanic", description: "Retrieve repaired bots from the mechanic facility.", requiredSkillIds: ["skill-vehicle"] },
  { id: "task-kind-co-adhoc", name: "Ad Hoc Task", description: "Ad hoc request made by Robot.", requiredSkillIds: [] },

  // --- FIGS — Distributed Inventory + Order Fulfillment ---
  { id: "task-kind-fg-ack", name: "Acknowledgement", description: "Acknowledge and confirm the request.", requiredSkillIds: [] },
  { id: "task-kind-fg-deliver-store", name: "Deliver to Store", description: "Deliver items from storage to the store.", requiredSkillIds: ["skill-lifting", "skill-box-truck"] },
  { id: "task-kind-fg-pickup-store", name: "Pickup from Store", description: "Pick up items from the store to return to storage.", requiredSkillIds: ["skill-lifting", "skill-box-truck"] },
  { id: "task-kind-fg-storage", name: "Monthly Storage", description: "Monthly storage of the brand's inventory.", requiredSkillIds: ["skill-inventory"] },
  { id: "task-kind-fg-ship-out", name: "Ship Out Items (Between Markets)", description: "Ship inventory out of a market to a destination market.", requiredSkillIds: ["skill-box-truck", "skill-inventory"] },
  { id: "task-kind-fg-receive", name: "Receive Inventory", description: "Receive and document inventory arriving to local storage.", requiredSkillIds: ["skill-lifting", "skill-inventory"] },
  { id: "task-kind-fg-deliver-event", name: "Deliver to Event", description: "Deliver inventory to an event/activation site.", requiredSkillIds: ["skill-lifting", "skill-box-truck", "skill-customer-service"] },
  { id: "task-kind-fg-setup", name: "Event Setup", description: "Set up the FIGS activation on-site.", requiredSkillIds: ["skill-install", "skill-customer-service"] },
  { id: "task-kind-fg-breakdown", name: "Event Breakdown & Pickup", description: "Break down the activation and recover inventory.", requiredSkillIds: ["skill-install", "skill-lifting"] },
  { id: "task-kind-fg-kitting", name: "Kitting", description: "Assemble kits out of inventory items.", requiredSkillIds: ["skill-inventory"] },

  // --- Infinite Machine — Equipment Deployment + Field Service ---
  { id: "task-kind-im-ack", name: "Acknowledge", description: "Acknowledge and confirm the delivery/service request.", requiredSkillIds: [] },
  { id: "task-kind-im-customer-dropoff", name: "Customer Dropoff", description: "Deliver a vehicle to the end customer and hand off.", requiredSkillIds: ["skill-vehicle", "skill-customer-service"] },
  { id: "task-kind-im-delivery", name: "Delivery", description: "Local delivery of up to a few vehicles.", requiredSkillIds: ["skill-vehicle", "skill-box-truck"] },
  { id: "task-kind-im-pickup", name: "Pick Up", description: "Pick up vehicle(s) from origin for delivery or service.", requiredSkillIds: ["skill-vehicle", "skill-lifting"] },
  { id: "task-kind-im-longhaul", name: "Long Haul Delivery", description: "Vehicle delivery over a long distance.", requiredSkillIds: ["skill-vehicle", "skill-box-truck"] },
  { id: "task-kind-im-warehouse-service", name: "Warehouse Service", description: "Inspect/repair a vehicle at the warehouse.", requiredSkillIds: ["skill-install", "skill-vehicle"] },
  { id: "task-kind-im-mobile-service", name: "Mobile Service", description: "Service an Infinite Machine vehicle in the field.", requiredSkillIds: ["skill-install", "skill-vehicle"] },
  { id: "task-kind-im-receiving", name: "Receiving", description: "Receive vehicles from the manufacturer into the warehouse.", requiredSkillIds: ["skill-lifting", "skill-inventory"] },

  // --- Promobile — Mixed / Custom ---
  { id: "task-kind-pm-willcall", name: "Will Call Pickup", description: "Hand off staged inventory for will-call pickup.", requiredSkillIds: ["skill-inventory"] },
  { id: "task-kind-pm-pickstage", name: "Pick and Stage", description: "Pick and stage inventory at the warehouse.", requiredSkillIds: ["skill-inventory"] },
  { id: "task-kind-pm-delivery", name: "Delivery", description: "Local delivery from warehouse to show venue.", requiredSkillIds: ["skill-lifting", "skill-box-truck"] },
  { id: "task-kind-pm-setup", name: "Event Setup", description: "On-site labor to setup booth for the event.", requiredSkillIds: ["skill-install", "skill-customer-service"] },
  { id: "task-kind-pm-breakdown", name: "Event Strike", description: "On-site labor to tear down and load out after the event.", requiredSkillIds: ["skill-install", "skill-lifting"] },
  { id: "task-kind-pm-pickup", name: "Pick Up", description: "Post-event local box truck pickup from show venue to warehouse.", requiredSkillIds: ["skill-lifting", "skill-box-truck"] },
  { id: "task-kind-pm-inspection", name: "Post-event Inspection", description: "Inspect returning crate condition post event.", requiredSkillIds: ["skill-inventory"] },
  { id: "task-kind-pm-pallets-out", name: "Pallets Outbound", description: "Prep and ship pallets via LTL or dedicated truck.", requiredSkillIds: ["skill-box-truck", "skill-inventory"] },
  { id: "task-kind-pm-freight", name: "Freight Shipping", description: "Move freight between Build markets.", requiredSkillIds: ["skill-box-truck", "skill-inventory"] },
  { id: "task-kind-pm-freight-receiving", name: "Receiving", description: "Receive freight arriving from another market.", requiredSkillIds: ["skill-inventory"] },
  { id: "task-kind-pm-ship-event", name: "Ship to Event", description: "Ship items to an event or other location via parcel.", requiredSkillIds: ["skill-inventory"] },
  { id: "task-kind-pm-storage", name: "Weekly Storage by Pallet", description: "Weekly storage of tour pallets and oversized items.", requiredSkillIds: ["skill-inventory"] },

  // --- Chewy — pet-brand experiential event logistics (pulled from prod) ---
  { id: "task-kind-cw-audit", name: "Audit Inventory", description: "Audit the inventory in the warehouse.", requiredSkillIds: ["skill-inventory"] },
  { id: "task-kind-cw-adhoc", name: "Ad Hoc Task", description: "Non standard ad hoc work.", requiredSkillIds: [] },
  { id: "task-kind-cw-monthly-storage", name: "Monthly Storage", description: "Monthly storage of Chewy inventory.", requiredSkillIds: ["skill-inventory"] },
  { id: "task-kind-cw-dispose", name: "Dispose", description: "Dispose of unneeded inventory items.", requiredSkillIds: ["skill-lifting"] },
  { id: "task-kind-cw-ack", name: "Acknowledgement", description: "Acknowledge and confirm the request.", requiredSkillIds: [] },
  { id: "task-kind-cw-pickup", name: "Pickup", description: "Pick up inventory from Chewy.", requiredSkillIds: ["skill-lifting", "skill-box-truck"] },
  { id: "task-kind-cw-dropoff", name: "Dropoff", description: "Drop off inventory to Chewy.", requiredSkillIds: ["skill-lifting", "skill-box-truck"] },
  { id: "task-kind-cw-kitting", name: "Kitting", description: "Create a kit out of a list of inventory items.", requiredSkillIds: ["skill-inventory"] },
  { id: "task-kind-cw-linen", name: "Clean linens (tablecloths, etc)", description: "Take fabric items to a dry clean or laundry service.", requiredSkillIds: [] },
  { id: "task-kind-cw-receiving", name: "Receiving", description: "Receive shipped products for Chewy events.", requiredSkillIds: ["skill-inventory", "skill-lifting"] },
  { id: "task-kind-cw-le-ack", name: "Acknowledgement", description: "Acknowledge and confirm the local event request.", requiredSkillIds: [] },
  { id: "task-kind-cw-le-dropoff", name: "Dropoff", description: "Deliver activation kit to the partner agency hosting the event.", requiredSkillIds: ["skill-lifting", "skill-box-truck", "skill-customer-service"] },
  { id: "task-kind-cw-le-pickup", name: "Pickup", description: "Recover the activation kit after the event.", requiredSkillIds: ["skill-lifting", "skill-box-truck"] },
  { id: "task-kind-cw-le-count", name: "Count Inventory", description: "Count returned inventory after the event.", requiredSkillIds: ["skill-inventory"] },
  // --- Stack — pulled from prod (brand_29f375ea-…). Real task-kind names and
  // descriptions; the "Stack Order" dropoff/pickup pair is the dominant flow. ---
  { id: "task-kind-st-dropoff", name: "Dropoff", description: "Drop off boxes to customer.", requiredSkillIds: ["skill-lifting", "skill-box-truck", "skill-customer-service"] },
  { id: "task-kind-st-pickup", name: "Pickup", description: "Pick up boxes from the customer.", requiredSkillIds: ["skill-lifting", "skill-box-truck"] },
  { id: "task-kind-st-restock-receive", name: "Stack Restock: Receive inventory", description: "Receive a delivery of stack boxes and dollies.", requiredSkillIds: ["skill-inventory", "skill-lifting"] },
  { id: "task-kind-st-transfer-receive", name: "Stack Inventory Transfer: Receive inventory", description: "Receive a stack inventory transfer.", requiredSkillIds: ["skill-inventory"] },
  { id: "task-kind-st-transfer-send", name: "Stack Inventory Transfer: Send inventory", description: "Send inventory to another network operator.", requiredSkillIds: ["skill-inventory", "skill-lifting"] },
  { id: "task-kind-st-freight", name: "Freight", description: "Freight work order.", requiredSkillIds: ["skill-box-truck"] },
  { id: "task-kind-st-storage", name: "Monthly Storage", description: "Monthly Storage.", requiredSkillIds: [] },
  { id: "task-kind-st-adhoc", name: "Ad hoc task", description: "Ad hoc task for Stack.", requiredSkillIds: [] },
  // --- Kinds reached through the sample NO accounts (AVRide, EngageMD,
  // Sigma Pi Phi). Names are the real prod task-kind names. ---
  { id: "task-kind-av-battery", name: "Battery swap and Clean", description: "Swap the battery on each bot in the round and clean it down.", requiredSkillIds: ["skill-vehicle"] },
  { id: "task-kind-av-rescue", name: "Bot Rescue", description: "Recover a grounded or stuck bot and return it to service.", requiredSkillIds: ["skill-vehicle", "skill-lifting"] },
  { id: "task-kind-av-rescue-ack", name: "Acknowledge Bot Rescue", description: "Acknowledge a rescue callout and commit to the response window.", requiredSkillIds: [] },
  { id: "task-kind-av-morning-deploy", name: "Morning battery swap, clean, deploy", description: "Start of day: swap batteries, clean the bots and put them out on route.", requiredSkillIds: ["skill-vehicle"] },
  { id: "task-kind-av-undeploy", name: "Undeployment", description: "End of day: collect the bots off route and return them to the depot.", requiredSkillIds: ["skill-vehicle"] },
  { id: "task-kind-em-outbound", name: "Outbound Shipping", description: "Pick, pack and ship a parcel out of the warehouse.", requiredSkillIds: ["skill-inventory"] },
  { id: "task-kind-em-inbound", name: "Inbound Receive", description: "Receive a returned parcel back into the warehouse.", requiredSkillIds: ["skill-inventory"] },
  { id: "task-kind-sp-pickup", name: "Pick Up", description: "Collect event materials from the venue.", requiredSkillIds: ["skill-lifting"] },
  { id: "task-kind-sp-strike", name: "Event Strike", description: "Break down the event build and load out.", requiredSkillIds: ["skill-lifting", "skill-install"] },
];

export const orderKinds: OrderKind[] = [
  {
    id: "order-kind-stackmoves-standard",
    brandId: "brand-stackmoves",
    name: "Standard Box Rental",
    description: "Delivery of rental boxes, then pickup once the customer is done.",
    taskKindIds: ["task-kind-delivery", "task-kind-pickup"],
  },
  {
    id: "order-kind-stackmoves-extended",
    brandId: "brand-stackmoves",
    name: "Extended Rental",
    description: "Long-term box rental with a scheduled mid-rental check-in.",
    taskKindIds: ["task-kind-delivery", "task-kind-audit", "task-kind-pickup"],
  },
  // --- Autolane — pulled from prod (real work order types) ---
  { id: "order-kind-al-shifts", brandId: "brand-autolane", name: "Shifts", description: "A day's shifts for one region. One work order per region per day.", taskKindIds: ["task-kind-al-supervise", "task-kind-al-dispatch"] },
  { id: "order-kind-al-training", brandId: "brand-autolane", name: "Supervisor Training", description: "Record time spent training and onboarding new supervisors.", taskKindIds: ["task-kind-al-training"] },
  { id: "order-kind-al-bgcheck", brandId: "brand-autolane", name: "Run Background Checks and MVRs", description: "Record work performed running background checks and MVRs for supervisors.", taskKindIds: ["task-kind-al-bgcheck"] },
  { id: "order-kind-al-parking", brandId: "brand-autolane", name: "Monthly Parking", description: "Record parking spots leased for the managed fleet for the upcoming month.", taskKindIds: ["task-kind-al-parking"] },
  { id: "order-kind-al-adhoc", brandId: "brand-autolane", name: "Ad Hoc Request", description: "For ad hoc work requested by Autolane.", taskKindIds: ["task-kind-al-adhoc"] },
  {
    id: "order-kind-crateco-event",
    brandId: "brand-crateco",
    name: "Event Crate Setup",
    description: "Delivery, on-site setup, and breakdown of modular event crates.",
    taskKindIds: ["task-kind-delivery", "task-kind-setup", "task-kind-breakdown"],
  },
  {
    id: "order-kind-basepower-delivery",
    brandId: "brand-basepower",
    name: "Battery Delivery",
    description: "Acknowledge, kit & stage, deliver, and trash pick-up for a residential battery install.",
    taskKindIds: [
      "task-kind-acknowledge",
      "task-kind-kit-stage",
      "task-kind-delivery",
      "task-kind-trash-pickup",
    ],
  },
  {
    id: "order-kind-basepower-cancellation",
    brandId: "brand-basepower",
    name: "Cancellation",
    description: "Acknowledge a cancellation and schedule equipment retrieval.",
    taskKindIds: ["task-kind-acknowledge", "task-kind-trash-pickup"],
  },

  // --- Free Bean Coffee — the Event Logistics Hub "four-pack" plus labeling ---
  {
    id: "order-kind-freebean-receiving",
    brandId: "brand-freebean",
    name: "Receiving",
    description: "Receive Free Bean inventory (parcel or pallet) at the origin warehouse.",
    taskKindIds: ["task-kind-fb-acknowledge", "task-kind-fb-receive-parcel", "task-kind-fb-receive-pallet"],
  },
  {
    id: "order-kind-freebean-storage",
    brandId: "brand-freebean",
    name: "Weekly Storage",
    description: "Recurring weekly storage of Free Bean pallets at the warehouse.",
    taskKindIds: ["task-kind-fb-storage"],
  },
  {
    id: "order-kind-freebean-delivery",
    brandId: "brand-freebean",
    name: "Delivery to Event",
    description: "Deliver inventory to an activation site, then recover reusables afterward.",
    taskKindIds: ["task-kind-fb-acknowledge", "task-kind-fb-deliver-event", "task-kind-fb-pickup-event"],
  },
  {
    id: "order-kind-freebean-outbound",
    brandId: "brand-freebean",
    name: "Outbound Shipping",
    description: "Ship Free Bean supply outbound to a destination, or stage it for local pickup.",
    taskKindIds: ["task-kind-fb-acknowledge", "task-kind-fb-outbound", "task-kind-fb-stage-pickup"],
  },
  {
    id: "order-kind-freebean-label",
    brandId: "brand-freebean",
    name: "Label Cans",
    description: "Prep, stage, and apply client-branded labels to a batch of cans.",
    taskKindIds: ["task-kind-fb-acknowledge", "task-kind-fb-prep-label", "task-kind-fb-label"],
  },
  {
    id: "order-kind-freebean-adhoc",
    brandId: "brand-freebean",
    name: "Ad Hoc Work",
    description: "Non-standard ad hoc work.",
    taskKindIds: ["task-kind-fb-adhoc"],
  },

  // --- Husqvarna (Gardena) — Trade Show Retainer (one dominant WO kind) ---
  { id: "order-kind-husqvarna-shipping", brandId: "brand-husqvarna", name: "Post-Event Shipping", description: "Ship show freight from the warehouse to the next trade show (the workhorse WO).", taskKindIds: ["task-kind-hg-shipping"] },
  { id: "order-kind-husqvarna-pickup", brandId: "brand-husqvarna", name: "Pre-Event Pickup", description: "Pick up product inbound from a manufacturer or prior show, with optional on-site setup.", taskKindIds: ["task-kind-hg-pickup", "task-kind-hg-setup"] },

  // --- Coco — Fleet Daily Cycle ---
  { id: "order-kind-coco-daily", brandId: "brand-coco", name: "Daily Deployment & Undeployment", description: "Daily morning deploy and evening undeploy of Robot robots.", taskKindIds: ["task-kind-co-deploy", "task-kind-co-undeploy"] },
  { id: "order-kind-coco-battery", brandId: "brand-coco", name: "Daily Battery Swaps", description: "Swap and stage robot batteries daily.", taskKindIds: ["task-kind-co-battery"] },
  { id: "order-kind-coco-rescue", brandId: "brand-coco", name: "Emergency Robot Rescue (3-min SLA)", description: "Recover a stranded robot under a 3-minute emergency response SLA.", taskKindIds: ["task-kind-co-rescue"] },
  { id: "order-kind-coco-mechanic", brandId: "brand-coco", name: "Mechanic Dropoff / Pickup", description: "Route grounded bots to the mechanic and return repaired units.", taskKindIds: ["task-kind-co-mech-drop", "task-kind-co-mech-pick"] },
  { id: "order-kind-coco-adhoc", brandId: "brand-coco", name: "Ad Hoc Request", description: "Ad hoc request made by Robot.", taskKindIds: ["task-kind-co-adhoc"] },

  // --- FIGS — Distributed Inventory + Order Fulfillment ---
  { id: "order-kind-figs-deliver-store", brandId: "brand-figs", name: "Store: Deliver to Store", description: "Deliver items from storage to the store.", taskKindIds: ["task-kind-fg-ack", "task-kind-fg-deliver-store"] },
  { id: "order-kind-figs-pickup-store", brandId: "brand-figs", name: "Store: Pickup from Store", description: "Pick up items from the store back to storage.", taskKindIds: ["task-kind-fg-pickup-store"] },
  { id: "order-kind-figs-storage", brandId: "brand-figs", name: "Monthly Storage", description: "Monthly storage of FIGS inventory at a local hub.", taskKindIds: ["task-kind-fg-storage"] },
  { id: "order-kind-figs-transfer", brandId: "brand-figs", name: "Send & Receive (Between Markets)", description: "Send inventory out of a market and receive it in a destination market.", taskKindIds: ["task-kind-fg-ship-out", "task-kind-fg-receive"] },
  { id: "order-kind-figs-event", brandId: "brand-figs", name: "Event Operations", description: "Delivery, setup, breakdown, and pickup for a FIGS activation.", taskKindIds: ["task-kind-fg-ack", "task-kind-fg-deliver-event", "task-kind-fg-setup", "task-kind-fg-breakdown"] },
  { id: "order-kind-figs-kitting", brandId: "brand-figs", name: "Kitting", description: "Assemble kits out of inventory items.", taskKindIds: ["task-kind-fg-kitting"] },
  { id: "order-kind-figs-receiving", brandId: "brand-figs", name: "Receiving", description: "Receive and document inventory arriving to local storage.", taskKindIds: ["task-kind-fg-receive"] },

  // --- Infinite Machine — Equipment Deployment + Field Service ---
  { id: "order-kind-infinite-customer-delivery", brandId: "brand-infinite", name: "Customer Delivery", description: "Deliver a vehicle to an end customer.", taskKindIds: ["task-kind-im-ack", "task-kind-im-customer-dropoff"] },
  { id: "order-kind-infinite-local-delivery", brandId: "brand-infinite", name: "Local Delivery (Up to 2 Vehicles)", description: "Local delivery of up to two vehicles.", taskKindIds: ["task-kind-im-ack", "task-kind-im-delivery"] },
  { id: "order-kind-infinite-longhaul", brandId: "brand-infinite", name: "Long Haul Delivery", description: "Long-distance vehicle delivery.", taskKindIds: ["task-kind-im-pickup", "task-kind-im-ack", "task-kind-im-longhaul"] },
  { id: "order-kind-infinite-warehouse-service", brandId: "brand-infinite", name: "Warehouse Service Request", description: "Inspect/repair vehicles at the warehouse.", taskKindIds: ["task-kind-im-warehouse-service"] },
  { id: "order-kind-infinite-mobile-service", brandId: "brand-infinite", name: "Mobile Service Request", description: "Service Infinite Machine vehicles in the field.", taskKindIds: ["task-kind-im-mobile-service"] },
  { id: "order-kind-infinite-receive-store", brandId: "brand-infinite", name: "Receive & Store", description: "Receive vehicles from the manufacturer and store them.", taskKindIds: ["task-kind-im-receiving"] },

  // --- Promobile — Mixed / Custom (split delivery by type/direction/venue) ---
  { id: "order-kind-promobile-willcall", brandId: "brand-promobile", name: "Will Call and Staging", description: "Will call pickup and pick and stage at the warehouse.", taskKindIds: ["task-kind-pm-willcall", "task-kind-pm-pickstage"] },
  { id: "order-kind-promobile-event", brandId: "brand-promobile", name: "Event Operations", description: "Request for event logistics such as delivery, setup, strike, and pickup.", taskKindIds: ["task-kind-pm-delivery", "task-kind-pm-setup", "task-kind-pm-breakdown", "task-kind-pm-pickup", "task-kind-pm-inspection"] },
  { id: "order-kind-promobile-outbound-pallet", brandId: "brand-promobile", name: "Outbound Palletized Shipments", description: "Prep and ship pallets via LTL or dedicated truck.", taskKindIds: ["task-kind-pm-pallets-out"] },
  { id: "order-kind-promobile-between-markets", brandId: "brand-promobile", name: "Between Markets Freight", description: "Freight shipping and receiving between Build markets.", taskKindIds: ["task-kind-pm-freight", "task-kind-pm-freight-receiving"] },
  { id: "order-kind-promobile-parcel", brandId: "brand-promobile", name: "Parcel Shipping", description: "Ship items to an event or other location via parcel.", taskKindIds: ["task-kind-pm-ship-event"] },
  { id: "order-kind-promobile-shipping-receiving", brandId: "brand-promobile", name: "Shipping and/or Receiving", description: "Inbound and outbound freight handled at the warehouse for Promobile.", taskKindIds: ["task-kind-pm-freight-receiving", "task-kind-pm-freight"] },
  { id: "order-kind-promobile-storage", brandId: "brand-promobile", name: "Weekly Storage", description: "Weekly storage of tour pallets and oversized items.", taskKindIds: ["task-kind-pm-storage"] },

  // --- Chewy — pet-brand experiential event logistics (pulled from prod) ---
  { id: "order-kind-chewy-audit", brandId: "brand-chewy", name: "Audit Inventory", description: "Audit the inventory in your warehouse.", taskKindIds: ["task-kind-cw-audit"] },
  { id: "order-kind-chewy-adhoc", brandId: "brand-chewy", name: "Ad-hoc work", description: "Non standard ad hoc work.", taskKindIds: ["task-kind-cw-adhoc"] },
  { id: "order-kind-chewy-monthly-storage", brandId: "brand-chewy", name: "Monthly Storage", description: "Monthly storage.", taskKindIds: ["task-kind-cw-monthly-storage"] },
  { id: "order-kind-chewy-dispose", brandId: "brand-chewy", name: "Dispose of items", description: "Disposing unneeded inventory items.", taskKindIds: ["task-kind-cw-dispose"] },
  { id: "order-kind-chewy-pickup-dropoff", brandId: "brand-chewy", name: "Inventory Pickup/Dropoff", description: "Pickup/Dropoff inventory from Chewy.", taskKindIds: ["task-kind-cw-ack", "task-kind-cw-pickup", "task-kind-cw-dropoff"] },
  { id: "order-kind-chewy-kitting", brandId: "brand-chewy", name: "Kitting", description: "Create a kit out of a list of inventory items.", taskKindIds: ["task-kind-cw-kitting"] },
  { id: "order-kind-chewy-linen", brandId: "brand-chewy", name: "Linen Cleaning", description: "Take fabric items to dry clean or laundry service.", taskKindIds: ["task-kind-cw-linen"] },
  { id: "order-kind-chewy-shipping-receiving", brandId: "brand-chewy", name: "Shipping & Receiving", description: "Shipping and receiving of products for Chewy events.", taskKindIds: ["task-kind-cw-receiving"] },
  { id: "order-kind-chewy-local-event", brandId: "brand-chewy", name: "Local Event Delivery", description: "Deliver to Hype Agency who will host the local event.", taskKindIds: ["task-kind-cw-le-ack", "task-kind-cw-le-dropoff", "task-kind-cw-le-pickup", "task-kind-cw-le-count"] },
  // --- Stack — real work-order kinds pulled from prod. "Stack Order" (a
  // dropoff + pickup pair for one customer) is ~95% of the volume. ---
  { id: "order-kind-stack-order", brandId: "brand-stackmoves", name: "Stack Order", description: "An order for Stack — boxes dropped off to a customer, then picked back up.", taskKindIds: ["task-kind-st-dropoff", "task-kind-st-pickup"] },
  { id: "order-kind-stack-restock", brandId: "brand-stackmoves", name: "Stack (re)stock", description: "Initial or restock delivery of boxes and dollies.", taskKindIds: ["task-kind-st-restock-receive"] },
  { id: "order-kind-stack-transfer", brandId: "brand-stackmoves", name: "Stack Inventory Transfer", description: "Transfer of boxes and dollies between NOs.", taskKindIds: ["task-kind-st-transfer-receive", "task-kind-st-transfer-send"] },
  { id: "order-kind-stack-freight", brandId: "brand-stackmoves", name: "Freight", description: "Freight work order — LTL and dedicated vans/trucks moving inventory between markets.", taskKindIds: ["task-kind-st-freight"] },
  { id: "order-kind-stack-storage", brandId: "brand-stackmoves", name: "Monthly Storage", description: "Monthly Storage.", taskKindIds: ["task-kind-st-storage"] },
  { id: "order-kind-stack-adhoc", brandId: "brand-stackmoves", name: "Ad Hoc Stack Work", description: "Ad hoc work for Stack.", taskKindIds: ["task-kind-st-adhoc"] },
  // --- Order kinds for the brands reached through the sample NO accounts. ---
  { id: "order-kind-av-battery", brandId: "brand-avride", name: "Daily Battery Swap and Clean", description: "The daily round: swap every bot's battery and clean it down.", taskKindIds: ["task-kind-av-battery"] },
  { id: "order-kind-av-rescue", brandId: "brand-avride", name: "Bot Rescue", description: "Callout to recover a grounded bot.", taskKindIds: ["task-kind-av-rescue-ack", "task-kind-av-rescue"] },
  { id: "order-kind-av-daily", brandId: "brand-avride", name: "Daily Deploy/Undeploy", description: "The daily cycle in a market: bots out in the morning, collected back in at night.", taskKindIds: ["task-kind-av-morning-deploy", "task-kind-av-undeploy"] },
  { id: "order-kind-em-parcel", brandId: "brand-engagemd", name: "Parcel Shipping from Warehouse", description: "Ship a parcel out of the warehouse, and receive it back if it returns.", taskKindIds: ["task-kind-em-outbound", "task-kind-em-inbound"] },
  { id: "order-kind-sp-event", brandId: "brand-sigmapiphi", name: "Event Operations", description: "On-site event support — pickup of materials and strike at the end of the run.", taskKindIds: ["task-kind-sp-pickup", "task-kind-sp-strike"] },
];
