import type { Deployment, InventoryItem } from "../types/domain";
import teslaModelY from "../assets/tesla-model-y.webp";

export const inventoryItems: InventoryItem[] = [
  { id: "inv-1", brandId: "brand-stackmoves", warehouseId: "wh-golojix-oakland", sku: "SM-BOX-STD", name: "Standard Moving Box", quantity: 340, status: "in_stock", reorderThreshold: 150 },
  { id: "inv-2", brandId: "brand-stackmoves", warehouseId: "wh-golojix-oakland", sku: "SM-BOX-XL", name: "XL Moving Box", quantity: 80, status: "low_stock", reorderThreshold: 100 },
  { id: "inv-3", brandId: "brand-stackmoves", warehouseId: "wh-golojix-oakland", sku: "SM-DOLLY", name: "Hand Dolly", quantity: 22, status: "in_stock", reorderThreshold: 10 },
  { id: "inv-4", brandId: "brand-stackmoves", warehouseId: "wh-midwest-cicero", sku: "SM-BOX-STD", name: "Standard Moving Box", quantity: 60, status: "low_stock", reorderThreshold: 100 },
  { id: "inv-5", brandId: "brand-crateco", warehouseId: "wh-lonestar-austin", sku: "CC-CRATE-MOD", name: "Modular Event Crate", quantity: 140, status: "reserved", reorderThreshold: 40 },
  { id: "inv-6", brandId: "brand-crateco", warehouseId: "wh-lonestar-austin", sku: "CC-RAIL", name: "Display Rail Kit", quantity: 30, status: "in_stock", reorderThreshold: 15 },
  { id: "inv-7", brandId: "brand-stackmoves", warehouseId: "wh-raincity-seattle", sku: "SM-BOX-STD", name: "Standard Moving Box", quantity: 0, status: "low_stock", reorderThreshold: 80 },
  { id: "inv-8", brandId: "brand-crateco", warehouseId: "wh-golojix-oakland", sku: "CC-CRATE-MOD", name: "Modular Event Crate", quantity: 45, status: "deployed", reorderThreshold: 20 },
  // Stack's real inventory kinds (pulled from prod): a green plastic crate, a
  // rolling dolly, and removable labels — stocked at the Lincolnwood warehouse.
  // `image` is the inventory kind's real `primaryImage.thumbnailUrl` from
  // brick-core (public ImageKit CDN), same pattern as the Chewy items below.
  { id: "inv-st-box", brandId: "brand-stackmoves", warehouseId: "wh-onehourmaids-parcel", sku: "ST-BOX", name: "Box", quantity: 1240, status: "in_stock", reorderThreshold: 400, image: "./inventory/6902828e-1.png" },
  { id: "inv-st-dolly", brandId: "brand-stackmoves", warehouseId: "wh-onehourmaids-parcel", sku: "ST-DOLLY", name: "Dolly", quantity: 46, status: "in_stock", reorderThreshold: 25, image: "./inventory/2940e1a9-1.jpg" },
  { id: "inv-st-label", brandId: "brand-stackmoves", warehouseId: "wh-onehourmaids-parcel", sku: "ST-LABEL", name: "Label", quantity: 310, status: "low_stock", reorderThreshold: 500, image: "./inventory/bcf0d5ae-1.jpg" },
  { id: "inv-bcs-box", brandId: "brand-stackmoves", warehouseId: "wh-brickcity-jerseycity", sku: "ST-BOX", name: "Box", quantity: 980, status: "in_stock", reorderThreshold: 400, image: "./inventory/6902828e-1.png" },
  { id: "inv-bcs-dolly", brandId: "brand-stackmoves", warehouseId: "wh-brickcity-jerseycity", sku: "ST-DOLLY", name: "Dolly", quantity: 38, status: "in_stock", reorderThreshold: 25, image: "./inventory/2940e1a9-1.jpg" },
  // Autolane's assets are individually-tracked vehicles, all stored at the Austin warehouse.
  { id: "inv-al-606125", brandId: "brand-autolane", warehouseId: "wh-lonestar-austin", sku: "TMY", name: "Tesla Model Y", quantity: 1, status: "active", reorderThreshold: 0, unitId: "606125", image: teslaModelY, operator: "G&C Roman" },
  { id: "inv-al-606332", brandId: "brand-autolane", warehouseId: "wh-lonestar-austin", sku: "TMY", name: "Tesla Model Y", quantity: 1, status: "stored", reorderThreshold: 0, unitId: "606332", image: teslaModelY, operator: "G&C Roman" },
  { id: "inv-al-606472", brandId: "brand-autolane", warehouseId: "wh-lonestar-austin", sku: "TMY", name: "Tesla Model Y", quantity: 1, status: "stored", reorderThreshold: 0, unitId: "606472", image: teslaModelY, operator: "G&C Roman" },
  { id: "inv-al-606732", brandId: "brand-autolane", warehouseId: "wh-lonestar-austin", sku: "TMY", name: "Tesla Model Y", quantity: 1, status: "stored", reorderThreshold: 0, unitId: "606732", image: teslaModelY, operator: "G&C Roman" },
  { id: "inv-al-697036", brandId: "brand-autolane", warehouseId: "wh-lonestar-austin", sku: "TMY", name: "Tesla Model Y", quantity: 1, status: "stored", reorderThreshold: 0, unitId: "697036", image: teslaModelY, operator: "G&C Roman" },
  { id: "inv-al-699757", brandId: "brand-autolane", warehouseId: "wh-lonestar-austin", sku: "TMY", name: "Tesla Model Y", quantity: 1, status: "stored", reorderThreshold: 0, unitId: "699757", image: teslaModelY, operator: "G&C Roman" },
  { id: "inv-al-700581", brandId: "brand-autolane", warehouseId: "wh-lonestar-austin", sku: "TMY", name: "Tesla Model Y", quantity: 1, status: "stored", reorderThreshold: 0, unitId: "700581", image: teslaModelY, operator: "G&C Roman" },
  { id: "inv-al-700910", brandId: "brand-autolane", warehouseId: "wh-lonestar-austin", sku: "TMY", name: "Tesla Model Y", quantity: 1, status: "stored", reorderThreshold: 0, unitId: "700910", image: teslaModelY, operator: "G&C Roman" },
  { id: "inv-al-700982", brandId: "brand-autolane", warehouseId: "wh-lonestar-austin", sku: "TMY", name: "Tesla Model Y", quantity: 1, status: "decommission_scheduled", reorderThreshold: 0, unitId: "700982", image: teslaModelY, operator: "G&C Roman" },

  // Free Bean Coffee — event inventory: canned product (consumable) + reusables (banner/table kits).
  { id: "inv-fb-1", brandId: "brand-freebean", warehouseId: "wh-brickcity-jerseycity", sku: "FB-VL-CASE", name: "Vanilla Latte — Case (24)", quantity: 260, status: "in_stock", reorderThreshold: 120 },
  { id: "inv-fb-2", brandId: "brand-freebean", warehouseId: "wh-brickcity-jerseycity", sku: "FB-CB-CASE", name: "Cold Brew — Case (24)", quantity: 90, status: "low_stock", reorderThreshold: 120 },
  { id: "inv-fb-3", brandId: "brand-freebean", warehouseId: "wh-brickcity-jerseycity", sku: "FB-LABEL-VL", name: "Branded Labels — Vanilla Latte", quantity: 5000, status: "in_stock", reorderThreshold: 1000 },
  { id: "inv-fb-4", brandId: "brand-freebean", warehouseId: "wh-brickcity-jerseycity", sku: "FB-BANNER", name: "Event Banner Kit", quantity: 8, status: "reserved", reorderThreshold: 4 },
  { id: "inv-fb-5", brandId: "brand-freebean", warehouseId: "wh-brickcity-jerseycity", sku: "FB-TABLE", name: "Sampling Table Kit", quantity: 6, status: "in_stock", reorderThreshold: 3 },
  { id: "inv-fb-6", brandId: "brand-freebean", warehouseId: "wh-brickcity-jerseycity", sku: "FB-PALLET-MIX", name: "Mixed-SKU Storage Pallet", quantity: 6, status: "stored", reorderThreshold: 0 },

  // Husqvarna (Gardena) — trade-show freight held between shows.
  { id: "inv-hg-1", brandId: "brand-husqvarna", warehouseId: "wh-kingsway-greenville", sku: "HG-BOOTH", name: "Trade Show Booth Kit", quantity: 3, status: "stored", reorderThreshold: 0 },
  { id: "inv-hg-2", brandId: "brand-husqvarna", warehouseId: "wh-kingsway-greenville", sku: "HG-DISPLAY", name: "Product Display Pallet", quantity: 5, status: "in_stock", reorderThreshold: 2 },

  // Coco — bots are individually-tracked assets; batteries are fungible.
  { id: "inv-coco-bot-1", brandId: "brand-coco", warehouseId: "wh-quicksilver-chicago", sku: "COCO-BOT", name: "Robot Delivery Bot", quantity: 1, status: "active", reorderThreshold: 0, unitId: "CB-2041", operator: "QuickSilver solutions" },
  { id: "inv-coco-bot-2", brandId: "brand-coco", warehouseId: "wh-quicksilver-chicago", sku: "COCO-BOT", name: "Robot Delivery Bot", quantity: 1, status: "battery_failure", reorderThreshold: 0, unitId: "CB-2077", operator: "QuickSilver solutions" },
  { id: "inv-coco-bot-3", brandId: "brand-coco", warehouseId: "wh-quicksilver-chicago", sku: "COCO-BOT", name: "Robot Delivery Bot", quantity: 1, status: "decommissioned", reorderThreshold: 0, unitId: "CB-2098", operator: "QuickSilver solutions" },
  { id: "inv-coco-bot-4", brandId: "brand-coco", warehouseId: "wh-quicksilver-chicago", sku: "COCO-BOT", name: "Robot Delivery Bot", quantity: 1, status: "active", reorderThreshold: 0, unitId: "CB-2103", operator: "QuickSilver solutions" },
  { id: "inv-coco-bot-5", brandId: "brand-coco", warehouseId: "wh-quicksilver-chicago", sku: "COCO-BOT", name: "Robot Delivery Bot", quantity: 1, status: "stored", reorderThreshold: 0, unitId: "CB-2110", operator: "QuickSilver solutions" },
  { id: "inv-coco-bot-6", brandId: "brand-coco", warehouseId: "wh-quicksilver-chicago", sku: "COCO-BOT", name: "Robot Delivery Bot", quantity: 1, status: "active", reorderThreshold: 0, unitId: "CB-2115", operator: "QuickSilver solutions" },
  { id: "inv-coco-batt-1", brandId: "brand-coco", warehouseId: "wh-quicksilver-chicago", sku: "COCO-BATT-10", name: "1.0 kWh Battery", quantity: 24, status: "in_stock", reorderThreshold: 12 },
  { id: "inv-coco-batt-2", brandId: "brand-coco", warehouseId: "wh-quicksilver-chicago", sku: "COCO-BATT-05", name: "0.5 kWh Battery", quantity: 9, status: "low_stock", reorderThreshold: 12 },

  // FIGS — apparel/event SKUs held at the LA hub.
  { id: "inv-figs-1", brandId: "brand-figs", warehouseId: "wh-castillo-la", sku: "FIGS-COVER-4", name: "FIGS Table Cover (4ft)", quantity: 40, status: "in_stock", reorderThreshold: 15 },
  { id: "inv-figs-2", brandId: "brand-figs", warehouseId: "wh-castillo-la", sku: "FIGS-BACKDROP", name: "FIGS Backdrop", quantity: 12, status: "in_stock", reorderThreshold: 6 },
  { id: "inv-figs-3", brandId: "brand-figs", warehouseId: "wh-castillo-la", sku: "FIGS-CART", name: "FIGS Branded Cart", quantity: 6, status: "reserved", reorderThreshold: 3 },
  { id: "inv-figs-4", brandId: "brand-figs", warehouseId: "wh-castillo-la", sku: "FIGS-RUG", name: "Area Rug", quantity: 18, status: "in_stock", reorderThreshold: 8 },
  { id: "inv-figs-5", brandId: "brand-figs", warehouseId: "wh-castillo-la", sku: "FIGS-FLOWER", name: "Flower Stand", quantity: 4, status: "low_stock", reorderThreshold: 6 },
  { id: "inv-figs-6", brandId: "brand-figs", warehouseId: "wh-castillo-la", sku: "FIGS-CHAIR", name: "Accent Chair", quantity: 22, status: "in_stock", reorderThreshold: 10 },

  // Infinite Machine — vehicles are individually-tracked; batteries fungible.
  { id: "inv-im-p1-1", brandId: "brand-infinite", warehouseId: "wh-skyline-sf", sku: "IM-P1", name: "Infinite Machine P1", quantity: 1, status: "stored", reorderThreshold: 0, unitId: "P1-1000034", operator: "Skyline Moving Service, LLC" },
  { id: "inv-im-p1-2", brandId: "brand-infinite", warehouseId: "wh-skyline-sf", sku: "IM-P1", name: "Infinite Machine P1", quantity: 1, status: "deployed", reorderThreshold: 0, unitId: "P1-1000112", operator: "Skyline Moving Service, LLC" },
  { id: "inv-im-olto-1", brandId: "brand-infinite", warehouseId: "wh-skyline-sf", sku: "IM-OLTO", name: "Infinite Machine Olto", quantity: 1, status: "stored", reorderThreshold: 0, unitId: "OT-012511000028", operator: "Skyline Moving Service, LLC" },
  { id: "inv-im-batt-p1", brandId: "brand-infinite", warehouseId: "wh-skyline-sf", sku: "IM-BATT-P1", name: "P1 Battery", quantity: 14, status: "in_stock", reorderThreshold: 6 },
  { id: "inv-im-batt-olto", brandId: "brand-infinite", warehouseId: "wh-skyline-sf", sku: "IM-BATT-OLTO", name: "Olto Battery", quantity: 5, status: "low_stock", reorderThreshold: 6 },

  // Promobile — tour assets (client-branded product synthesized); van is tracked.
  { id: "inv-pm-1", brandId: "brand-promobile", warehouseId: "wh-edge-denver", sku: "PM-TENT", name: "10x10 Tour Tent", quantity: 16, status: "in_stock", reorderThreshold: 6 },
  { id: "inv-pm-2", brandId: "brand-promobile", warehouseId: "wh-edge-denver", sku: "PM-COOLER", name: "Party Bar Cooler", quantity: 10, status: "in_stock", reorderThreshold: 4 },
  { id: "inv-pm-3", brandId: "brand-promobile", warehouseId: "wh-edge-denver", sku: "PM-BACKPACK", name: "Sampling Backpacks", quantity: 120, status: "in_stock", reorderThreshold: 40 },
  { id: "inv-pm-4", brandId: "brand-promobile", warehouseId: "wh-edge-denver", sku: "PM-COCONUT", name: "Coconut Water — Pallet", quantity: 8, status: "reserved", reorderThreshold: 3 },
  { id: "inv-pm-van-1", brandId: "brand-promobile", warehouseId: "wh-edge-denver", sku: "PM-VAN", name: "Branded Tour Van", quantity: 1, status: "stored", reorderThreshold: 0, unitId: "TV-118", operator: "EDGE USA INC" },

  // Base Power — residential battery-system components (pulled from prod inventory
  // kinds / unique items at the El Paso warehouse; quantities are on-hand stock).
  { id: "inv-bp-1", brandId: "brand-basepower", warehouseId: "wh-elite-elpaso", sku: "000359.00.D", name: "KIT, GEN1 SINGLE GROUND MOUNT (25KWH), MOLEX CONNECTOR", quantity: 22, status: "in_stock", reorderThreshold: 10 },
  { id: "inv-bp-2", brandId: "brand-basepower", warehouseId: "wh-elite-elpaso", sku: "000390.00.D", name: "KIT, GEN1 PARALLEL GROUND MOUNT SUPPLEMENT (1/2) (50KWH) (DC GEN COMPATIBLE), MOLEX CONNECTOR", quantity: 13, status: "in_stock", reorderThreshold: 8 },
  { id: "inv-bp-3", brandId: "brand-basepower", warehouseId: "wh-elite-elpaso", sku: "000315.00.B", name: "5KWH LFP BATTERY MODULE, GROWATT, APX 5.0P-B1-US (MOLEX CONNECTOR)", quantity: 23, status: "in_stock", reorderThreshold: 12 },
  { id: "inv-bp-4", brandId: "brand-basepower", warehouseId: "wh-elite-elpaso", sku: "000318.00.C", name: "POWER MODULE, GROWATT, APX-PM W/ BASE INCLUDED, SA00.0004000 (MOLEX CONNECTOR)", quantity: 14, status: "in_stock", reorderThreshold: 8 },
  { id: "inv-bp-5", brandId: "brand-basepower", warehouseId: "wh-elite-elpaso", sku: "000317.00.A", name: "INVERTER, GROWATT, MIN 11400TL-XH-US", quantity: 4, status: "low_stock", reorderThreshold: 6 },
  { id: "inv-bp-6", brandId: "brand-basepower", warehouseId: "wh-elite-elpaso", sku: "000316.00.A", name: "MICROGRID INTERCONNECTION DEVICE, GROWATT, SYN 200-XH-US-11A", quantity: 2, status: "low_stock", reorderThreshold: 4 },

  // Chewy — event activation supplies (pulled from prod inventory kinds).
  { id: "inv-cw-1", brandId: "brand-chewy", warehouseId: "wh-edge-denver", name: "Pup Cups (Chewy Vet Care)", quantity: 210, status: "in_stock", reorderThreshold: 150, image: "./inventory/3448d387-1.jpg" },
  { id: "inv-cw-2", brandId: "brand-chewy", warehouseId: "wh-edge-denver", name: "Treat Bag - Treats to go", quantity: 219, status: "in_stock", reorderThreshold: 150, image: "./inventory/7df42100-1.jpg" },
  { id: "inv-cw-3", brandId: "brand-chewy", warehouseId: "wh-edge-denver", name: "Bandana - Blue & White Paisley Design 2025 (S)", quantity: 178, status: "in_stock", reorderThreshold: 100, image: "./inventory/df235d0d-1.jpg" },
  { id: "inv-cw-4", brandId: "brand-chewy", warehouseId: "wh-edge-denver", name: "Bandana - Blue & White Paisley Design 2025 (L)", quantity: 50, status: "low_stock", reorderThreshold: 100, image: "./inventory/a241fb59-1.jpg" },
  { id: "inv-cw-5", brandId: "brand-chewy", warehouseId: "wh-edge-denver", name: "Dog Treats", quantity: 106, status: "in_stock", reorderThreshold: 10, image: "./inventory/1648a949-6.jpg" },
  { id: "inv-cw-6", brandId: "brand-chewy", warehouseId: "wh-edge-denver", name: "Wagon", quantity: 33, status: "in_stock", reorderThreshold: 0, image: "./inventory/43dafa54-2.jpg" },
  { id: "inv-cw-7", brandId: "brand-chewy", warehouseId: "wh-edge-denver", name: "Cat Treats", quantity: 124, status: "in_stock", reorderThreshold: 10, image: "./inventory/ccee2aa1-5.jpg" },
  { id: "inv-cw-8", brandId: "brand-chewy", warehouseId: "wh-edge-denver", name: "Event Kit", quantity: 94, status: "reserved", reorderThreshold: 0, image: "./inventory/dc65cb57-1.jpg" },
  { id: "inv-cw-9", brandId: "brand-chewy", warehouseId: "wh-edge-denver", name: "Tennis Balls - Chewy Vet Care", quantity: 232, status: "in_stock", reorderThreshold: 100, image: "./inventory/d8624012-3.png" },
  { id: "inv-cw-10", brandId: "brand-chewy", warehouseId: "wh-edge-denver", name: "Tote Bag - CLOTH \"My Best Friend Has Paws\"", quantity: 241, status: "in_stock", reorderThreshold: 100, image: "./inventory/19ea96cb-5.jpg" },
  { id: "inv-cw-11", brandId: "brand-chewy", warehouseId: "wh-edge-denver", name: "Sticker Sheet - TX", quantity: 250, status: "in_stock", reorderThreshold: 100, image: "./inventory/0889fdb1-1.jpg" },
  { id: "inv-cw-12", brandId: "brand-chewy", warehouseId: "wh-edge-denver", name: "Earth Rated Poop Bag Dispenser", quantity: 209, status: "in_stock", reorderThreshold: 50, image: "./inventory/3f183fb2-2.jpg" },
  { id: "inv-cw-13", brandId: "brand-chewy", warehouseId: "wh-edge-denver", name: "Frisco Plus Unicorn Cat Teaser Wand", quantity: 218, status: "in_stock", reorderThreshold: 50, image: "./inventory/3b2ffdf7-1.jpg" },
  { id: "inv-cw-14", brandId: "brand-chewy", warehouseId: "wh-edge-denver", name: "Tablecloth - 6ft Stretch - Chewy Vet Care Generic", quantity: 33, status: "in_stock", reorderThreshold: 0, image: "./inventory/599a0a8c-4.jpg" },
  { id: "inv-cw-15", brandId: "brand-chewy", warehouseId: "wh-edge-denver", name: "Folding Table - 6ft", quantity: 38, status: "in_stock", reorderThreshold: 0, image: "./inventory/e7f6cd56-2.png" },
  { id: "inv-cw-16", brandId: "brand-chewy", warehouseId: "wh-edge-denver", name: "Bowl - Stainless Steel dog water bowl", quantity: 43, status: "in_stock", reorderThreshold: 0, image: "./inventory/bbe95497-3.jpg" },
  { id: "inv-cw-17", brandId: "brand-chewy", warehouseId: "wh-edge-denver", name: "Feather Flag Base Weight", quantity: 8, status: "in_stock", reorderThreshold: 0, image: "./inventory/98f10343-1.jpg" },
  { id: "inv-cw-18", brandId: "brand-chewy", warehouseId: "wh-edge-denver", name: "Feather Flag 10ft 5inch - Chewy Vet Care", quantity: 13, status: "in_stock", reorderThreshold: 0, image: "./inventory/ceba7c2f-1.jpg" },
  { id: "inv-cw-19", brandId: "brand-chewy", warehouseId: "wh-edge-denver", name: "35L  CVC Branded Wheeled Cooler", quantity: 18, status: "in_stock", reorderThreshold: 0, image: "./inventory/dd5f5ace-1.jpg" },
  { id: "inv-cw-20", brandId: "brand-chewy", warehouseId: "wh-edge-denver", name: "5x7 Postcard TX - Routine & Urgent Care (AUSA, IAHA, IAHD DFWA, DFWB)", quantity: 241, status: "in_stock", reorderThreshold: 150, image: "./inventory/f4660358-1.jpg" },
  { id: "inv-cw-21", brandId: "brand-chewy", warehouseId: "wh-edge-denver", name: "Cat Kicker Toy - Frisco Branded", quantity: 115, status: "reserved", reorderThreshold: 50, image: "./inventory/313a4fe1-1.jpg" },
  { id: "inv-cw-22", brandId: "brand-chewy", warehouseId: "wh-edge-denver", name: "Wooden rectangle tabletop container", quantity: 33, status: "in_stock", reorderThreshold: 0, image: "./inventory/c1d9a9ee-2.jpg" },
  { id: "inv-cw-23", brandId: "brand-chewy", warehouseId: "wh-edge-denver", name: "Tent Weight Set (4)  - Blue 40lbs", quantity: 38, status: "in_stock", reorderThreshold: 0, image: "./inventory/2caa5244-1.jpg" },
  { id: "inv-cw-24", brandId: "brand-chewy", warehouseId: "wh-edge-denver", name: "10' x 10' Tent - Generic \"There's a New Vet In Town\"", quantity: 43, status: "in_stock", reorderThreshold: 0, image: "./inventory/101e5e43-2.jpg" },
  { id: "inv-cw-25", brandId: "brand-chewy", warehouseId: "wh-edge-denver", name: "Staff Hat - Dog", quantity: 141, status: "in_stock", reorderThreshold: 5, image: "./inventory/b9c0d068-3.jpg" },
  { id: "inv-cw-26", brandId: "brand-chewy", warehouseId: "wh-edge-denver", name: "5x7 Postcard Atlanta, GA - Routine & Urgent Care (ATLA, ATLB, ATLC, ATLD)", quantity: 75, status: "low_stock", reorderThreshold: 150, image: "./inventory/250f945b-1.jpg" },
  { id: "inv-cw-27", brandId: "brand-chewy", warehouseId: "wh-edge-denver", name: "5x7 Postcard CO - High Altitude Adventure (DENA, DENB, DEND, DENE, DENI, COSA, COSB)", quantity: 254, status: "in_stock", reorderThreshold: 100, image: "./inventory/220eacb3-1.jpg" },
  { id: "inv-cw-28", brandId: "brand-chewy", warehouseId: "wh-edge-denver", name: "Non-Squeak Tennis Ball", quantity: 263, status: "in_stock", reorderThreshold: 100, image: "./inventory/b2228c1a-1.jpg" },
  { id: "inv-cw-29", brandId: "brand-chewy", warehouseId: "wh-edge-denver", name: "Sticker Sheet - CO", quantity: 322, status: "in_stock", reorderThreshold: 150, image: "./inventory/97f8f158-1.jpg" },
  { id: "inv-cw-30", brandId: "brand-chewy", warehouseId: "wh-edge-denver", name: "Sticker Sheet - FL", quantity: 281, status: "in_stock", reorderThreshold: 100, image: "./inventory/0cee153c-1.jpg" },
  { id: "inv-cw-31", brandId: "brand-chewy", warehouseId: "wh-edge-denver", name: "Staff Blue T-Shirt S (not for giveaway)", quantity: 195, status: "in_stock", reorderThreshold: 5, image: "./inventory/04b5fec5-2.jpg" },
  { id: "inv-cw-32", brandId: "brand-chewy", warehouseId: "wh-edge-denver", name: "Staff Blue T-Shirt M (not for giveaway)", quantity: 204, status: "in_stock", reorderThreshold: 5, image: "./inventory/c29f6ab0-2.jpg" },
  { id: "inv-cw-33", brandId: "brand-chewy", warehouseId: "wh-edge-denver", name: "Plinko Board", quantity: 8, status: "in_stock", reorderThreshold: 0, image: "./inventory/116bbb27-1.jpg" },
  { id: "inv-cw-34", brandId: "brand-chewy", warehouseId: "wh-edge-denver", name: "UPDATED Prize Sheet", quantity: 96, status: "reserved", reorderThreshold: 0, image: "./inventory/ca4d1036-1.jpg" },
  { id: "inv-cw-35", brandId: "brand-chewy", warehouseId: "wh-edge-denver", name: "Small Cart", quantity: 18, status: "in_stock", reorderThreshold: 0, image: "./inventory/f297581f-2.jpg" },
  { id: "inv-cw-36", brandId: "brand-chewy", warehouseId: "wh-edge-denver", name: "5\" x 7\" LCM Postcards for Each State (FL)", quantity: 245, status: "in_stock", reorderThreshold: 150, image: "./inventory/adfaab74-1.jpg" },
  { id: "inv-cw-37", brandId: "brand-chewy", warehouseId: "wh-edge-denver", name: "5x7 Postcard FL - Routine & Urgent Care (JAXA)", quantity: 50, status: "low_stock", reorderThreshold: 100, image: "./inventory/424b6d6f-1.jpg" },
  { id: "inv-cw-38", brandId: "brand-chewy", warehouseId: "wh-edge-denver", name: "Magnet - Austin, TX (AUSA)", quantity: 33, status: "in_stock", reorderThreshold: 0, image: "./inventory/91373a23-1.jpg" },
  { id: "inv-cw-39", brandId: "brand-chewy", warehouseId: "wh-edge-denver", name: "Bowl - Collapsible Water Bowl", quantity: 197, status: "in_stock", reorderThreshold: 75, image: "./inventory/fce2232f-2.png" },
  { id: "inv-cw-40", brandId: "brand-chewy", warehouseId: "wh-edge-denver", name: "Chewy Vet Care Decorative Sticker Sheet", quantity: 206, status: "in_stock", reorderThreshold: 75, image: "./inventory/1446ff05-1.jpg" },
  { id: "inv-cw-41", brandId: "brand-chewy", warehouseId: "wh-edge-denver", name: "CVC Fuji Instax Mini Easel Photo Frames", quantity: 8, status: "in_stock", reorderThreshold: 0, image: "./inventory/42e22db5-1.jpg" },
  { id: "inv-cw-42", brandId: "brand-chewy", warehouseId: "wh-edge-denver", name: "5x8 Brochure TX - Routine & Urgent Care (AUSA-IAHA-IAHD-DFWA-DFWB)", quantity: 299, status: "in_stock", reorderThreshold: 150, image: "./inventory/fd74fa5d-1.jpg" },
  { id: "inv-cw-43", brandId: "brand-chewy", warehouseId: "wh-edge-denver", name: "Sticker Sheet - GA", quantity: 258, status: "in_stock", reorderThreshold: 100, image: "./inventory/30bbea1c-1.jpg" },
  { id: "inv-cw-44", brandId: "brand-chewy", warehouseId: "wh-edge-denver", name: "Tote Bag - PREMIUM \"My Best Friend Has Paws\"", quantity: 267, status: "in_stock", reorderThreshold: 100, image: "./inventory/d162d2d5-1.jpg" },
  { id: "inv-cw-45", brandId: "brand-chewy", warehouseId: "wh-edge-denver", name: "ChewyVetCare- Cooling Sports Towel in Blue", quantity: 251, status: "in_stock", reorderThreshold: 75, image: "./inventory/0c66aebc-1.jpg" },
  { id: "inv-cw-46", brandId: "brand-chewy", warehouseId: "wh-edge-denver", name: "Igloo 5 gallon Water Cooler - Blue", quantity: 33, status: "in_stock", reorderThreshold: 0, image: "./inventory/b74fb5f2-1.jpg" },
  { id: "inv-cw-47", brandId: "brand-chewy", warehouseId: "wh-edge-denver", name: "White Bone Shape Basket", quantity: 68, status: "reserved", reorderThreshold: 1, image: "./inventory/9cca72c5-1.jpg" },
  { id: "inv-cw-48", brandId: "brand-chewy", warehouseId: "wh-edge-denver", name: "Staff Hat - Cat", quantity: 2, status: "low_stock", reorderThreshold: 5, image: "./inventory/5c05c0d9-3.jpg" },
];

export const deployments: Deployment[] = [
  { id: "dep-1", brandId: "brand-stackmoves", regionId: "region-bay-area", warehouseId: "wh-golojix-oakland", inventoryItemId: "inv-2", quantity: 150, status: "in_transit", requestedAt: "2026-10-10T09:00:00-07:00", eta: "2026-10-15T09:00:00-07:00" },
  { id: "dep-2", brandId: "brand-stackmoves", regionId: "region-chicago", warehouseId: "wh-midwest-cicero", inventoryItemId: "inv-4", quantity: 200, status: "planned", requestedAt: "2026-10-12T11:00:00-05:00", eta: "2026-10-19T11:00:00-05:00" },
  { id: "dep-3", brandId: "brand-stackmoves", regionId: "region-seattle", warehouseId: "wh-raincity-seattle", inventoryItemId: "inv-7", quantity: 300, status: "planned", requestedAt: "2026-10-13T08:00:00-07:00", eta: "2026-10-21T08:00:00-07:00" },
  { id: "dep-4", brandId: "brand-crateco", regionId: "region-austin", warehouseId: "wh-lonestar-austin", inventoryItemId: "inv-6", quantity: 20, status: "delivered", requestedAt: "2026-09-30T10:00:00-05:00", eta: "2026-10-05T10:00:00-05:00" },
  { id: "dep-5", brandId: "brand-crateco", regionId: "region-bay-area", warehouseId: "wh-golojix-oakland", inventoryItemId: "inv-8", quantity: 45, status: "delivered", requestedAt: "2026-09-23T09:00:00-07:00", eta: "2026-09-29T09:00:00-07:00" },
  { id: "dep-6", brandId: "brand-stackmoves", regionId: "region-bay-area", warehouseId: "wh-golojix-oakland", inventoryItemId: "inv-3", quantity: 15, status: "cancelled", requestedAt: "2026-09-15T09:00:00-07:00", eta: null },
];
