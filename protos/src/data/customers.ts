import type { Customer } from "../types/domain";
import { sampleNoCustomers } from "./networkOperatorSample";

const baseCustomers: Customer[] = [
  { id: "cust-1", name: "Harold Jennings", brandId: "brand-stackmoves", email: "harold.j@example.com", address: "482 Elm St, Oakland, CA" },
  { id: "cust-2", name: "Priya Chandra", brandId: "brand-stackmoves", email: "priya.c@example.com", address: "119 5th Ave, San Francisco, CA" },
  { id: "cust-3", name: "Wells & Co Realty", brandId: "brand-stackmoves", email: "ops@wellsrealty.com", address: "2200 Broadway, Oakland, CA" },
  { id: "cust-4", name: "Meredith Tan", brandId: "brand-stackmoves", email: "meredith.tan@example.com", address: "77 Lincoln Ave, Berkeley, CA" },
  { id: "cust-5", name: "Chicago Loft Co", brandId: "brand-stackmoves", email: "moves@chicagoloftco.com", address: "410 W Grand Ave, Chicago, IL" },
  { id: "cust-6", name: "Sam Ridley", brandId: "brand-stackmoves", email: "sam.ridley@example.com", address: "88 Wells St, Cicero, IL" },
  { id: "cust-7", name: "Nova Events Group", brandId: "brand-crateco", email: "produce@novaevents.com", address: "300 Colorado St, Austin, TX" },
  { id: "cust-8", name: "SXSW Vendor Hall", brandId: "brand-crateco", email: "vendors@sxsw-hall.com", address: "500 E Cesar Chavez St, Austin, TX" },
  { id: "cust-9", name: "Pike Place Makers Market", brandId: "brand-crateco", email: "info@pikemakers.org", address: "85 Pike St, Seattle, WA" },
  { id: "cust-10", name: "Devon Marsh", brandId: "brand-stackmoves", email: "devon.marsh@example.com", address: "14 Alameda Dr, Oakland, CA" },
  { id: "cust-al-1", name: "Autolane Fleet Ops", brandId: "brand-autolane", email: "fleetops@autolane.com", address: "500 E 5th St, Austin, TX" },
  { id: "cust-al-2", name: "G&C Roman Dealerships", brandId: "brand-autolane", email: "dispatch@gcroman.com", address: "1820 Airport Blvd, Austin, TX" },
  // Free Bean Coffee clients (event activations). Synthetic identities.
  { id: "cust-fb-1", name: "Brightline Media", brandId: "brand-freebean", email: "events@brightlinemedia.com", address: "88 Bergen Ave, Jersey City, NJ" },
  { id: "cust-fb-2", name: "Meridian Group", brandId: "brand-freebean", email: "activations@meridiangroup.com", address: "744 Broad St, Newark, NJ" },
  { id: "cust-fb-3", name: "Folio Studio", brandId: "brand-freebean", email: "hello@foliostudio.co", address: "1201 16th St, Denver, CO" },
  { id: "cust-fb-4", name: "Vantage Retail", brandId: "brand-freebean", email: "ops@vantageretail.com", address: "500 S Grand Central Pkwy, Las Vegas, NV" },

  // Husqvarna — trade-show destinations (public show names; no personal data).
  { id: "cust-hg-1", name: "Lawn & Garden Expo Booth", brandId: "brand-husqvarna", email: "booth@lawngardenexpo.com", address: "1 Exposition Blvd, Louisville, KY" },
  { id: "cust-hg-2", name: "Hardware Trade Show", brandId: "brand-husqvarna", email: "logistics@hardwareshow.com", address: "3150 Paradise Rd, Las Vegas, NV" },

  // Coco — merchant routes / deployment zones (synthetic).
  { id: "cust-coco-1", name: "Loop Merchant Route", brandId: "brand-coco", email: "ops@loopmerchants.example.com", address: "State St & Madison, Chicago, IL" },
  { id: "cust-coco-2", name: "River North Route", brandId: "brand-coco", email: "ops@rivernorth.example.com", address: "Wells St & Hubbard, Chicago, IL" },

  // FIGS — stores (synthetic store identities).
  { id: "cust-figs-1", name: "FIGS Store — Century City", brandId: "brand-figs", email: "centurycity@figs.example.com", address: "10250 Santa Monica Blvd, Los Angeles, CA" },
  { id: "cust-figs-2", name: "FIGS Store — Abbot Kinney", brandId: "brand-figs", email: "abbotkinney@figs.example.com", address: "1200 Abbot Kinney Blvd, Venice, CA" },

  // Infinite Machine — end customers who bought a vehicle (synthetic people).
  { id: "cust-im-1", name: "Ava Nakamura", brandId: "brand-infinite", email: "ava.nakamura@example.com", address: "435 Valencia St, San Francisco, CA" },
  { id: "cust-im-2", name: "Diego Herrera", brandId: "brand-infinite", email: "diego.herrera@example.com", address: "1580 Folsom St, San Francisco, CA" },

  // Promobile — experiential-tour clients (synthetic brand identities).
  { id: "cust-pm-1", name: "Terra Verde", brandId: "brand-promobile", email: "tour@terraverde.example.com", address: "1601 Wewatta St, Denver, CO" },
  { id: "cust-pm-2", name: "Harbor Tea Co", brandId: "brand-promobile", email: "events@harbortea.example.com", address: "2500 Larimer St, Denver, CO" },

  // --- Added with the Jul 24–31 window pull (synthetic identities) ---
  { id: "cust-coco-3", name: "Miami Beach Route", brandId: "brand-coco", email: "ops@miamibeach.example.com", address: "Ocean Dr & 8th St, Miami Beach, FL" },
  { id: "cust-coco-4", name: "Capitol Hill Route", brandId: "brand-coco", email: "ops@capitolhill.example.com", address: "H St NE & 8th, Washington, DC" },
  { id: "cust-figs-3", name: "FIGS Pop-up — Ojai", brandId: "brand-figs", email: "ojai@figs.example.com", address: "210 E Ojai Ave, Ojai, CA" },
  { id: "cust-pm-3", name: "Coldwave Beverages", brandId: "brand-promobile", email: "tour@coldwave.example.com", address: "1200 W 38th Ave, Denver, CO" },
  { id: "cust-pm-4", name: "Summit Outdoor", brandId: "brand-promobile", email: "events@summitoutdoor.example.com", address: "900 W Fulton Market, Chicago, IL" },

  // --- Chewy (synthetic partner-agency identities) ---
  { id: "cust-cw-1", name: "Hype Agency", brandId: "brand-chewy", email: "events@hypeagency.example.com", address: "1444 Wazee St, Denver, CO" },
  { id: "cust-cw-2", name: "Paws in the Park Collective", brandId: "brand-chewy", email: "ops@pawsinthepark.example.com", address: "500 N Tampa St, Tampa, FL" },

  // --- Stack (Chicago - O'Hare / 1 HOUR MAIDS LLC) end-customers. Real Stack
  // orders are overwhelmingly residential movers; identities are synthesized.
  { id: "cust-st-1", name: "Marisa Ontiveros", brandId: "brand-stackmoves", email: "marisa.ontiveros@example.com", address: "412 N Walnut St, Elmhurst, IL", phone: "+1 (312) 555-0148" },
  { id: "cust-st-2", name: "Colin Whitaker", brandId: "brand-stackmoves", email: "colin.whitaker@example.com", address: "3218 N Seminary Ave, Chicago, IL", phone: "+1 (773) 555-0192" },
  { id: "cust-st-3", name: "Dana Petrossian", brandId: "brand-stackmoves", email: "dana.petrossian@example.com", address: "432 E Erie St, Chicago, IL", phone: "+1 (312) 555-0173" },
  { id: "cust-st-4", name: "Yusuf Amari", brandId: "brand-stackmoves", email: "yusuf.amari@example.com", address: "1744 W Foster Ave, Chicago, IL", phone: "+1 (773) 555-0126" },
  { id: "cust-st-5", name: "Erin Castellano", brandId: "brand-stackmoves", email: "erin.castellano@example.com", address: "3822 W Wellington Ave, Chicago, IL", phone: "+1 (773) 555-0119" },
  { id: "cust-st-6", name: "Priya Raghunathan", brandId: "brand-stackmoves", email: "priya.raghunathan@example.com", address: "921 Osterman Ave, Deerfield, IL", phone: "+1 (847) 555-0164" },
  { id: "cust-st-7", name: "Devin Osei", brandId: "brand-stackmoves", email: "devin.osei@example.com", address: "318 E Grand Ave, Chicago, IL", phone: "+1 (312) 555-0137" },
  { id: "cust-st-8", name: "Hannah Lindqvist", brandId: "brand-stackmoves", email: "hannah.lindqvist@example.com", address: "27 E Chestnut St, Chicago, IL", phone: "+1 (312) 555-0155" },
  { id: "cust-st-9", name: "Owen Marchetti", brandId: "brand-stackmoves", email: "owen.marchetti@example.com", address: "2210 W Sunnyside Ave, Chicago, IL", phone: "+1 (773) 555-0108" },
  { id: "cust-st-10", name: "Talia Rosenfeld", brandId: "brand-stackmoves", email: "talia.rosenfeld@example.com", address: "612 Ridgewood Dr, Highland Park, IL", phone: "+1 (847) 555-0131" },
  { id: "cust-st-11", name: "Stack Network Ops", brandId: "brand-stackmoves", email: "network-ops@stackmoves.com", address: "Lincolnwood Parcel Warehouse, Lincolnwood, IL", phone: "+1 (312) 555-0100" },
  { id: "cust-st-12", name: "Bryce Halloran", brandId: "brand-stackmoves", email: "bryce.halloran@example.com", address: "1420 S Michigan Ave, Chicago, IL", phone: "+1 (312) 555-0182" },
  { id: "cust-st-13", name: "Simone Devereaux", brandId: "brand-stackmoves", email: "simone.devereaux@example.com", address: "421 E Illinois St, Chicago, IL", phone: "+1 (312) 555-0166" },
  { id: "cust-st-14", name: "Ivy Nakashima", brandId: "brand-stackmoves", email: "ivy.nakashima@example.com", address: "935 W Diversey Pkwy, Chicago, IL", phone: "+1 (773) 555-0143" },
  { id: "cust-st-15", name: "Lakeside Community Hall", brandId: "brand-stackmoves", email: "ops@lakesidecommunityhall.com", address: "512 S Lapham St, Oconomowoc, WI", phone: "+1 (262) 555-0177" },
  { id: "cust-st-16", name: "Renata Villalobos", brandId: "brand-stackmoves", email: "renata.villalobos@example.com", address: "1330 W Randolph St, Chicago, IL", phone: "+1 (312) 555-0129" },
  { id: "cust-st-17", name: "Corbin Ashford", brandId: "brand-stackmoves", email: "corbin.ashford@example.com", address: "520 W Jackson Blvd, Chicago, IL", phone: "+1 (312) 555-0114" },
  { id: "cust-st-18", name: "Malik Toure", brandId: "brand-stackmoves", email: "malik.toure@example.com", address: "2416 N Sacramento Ave, Chicago, IL", phone: "+1 (773) 555-0158" },
  { id: "cust-st-19", name: "Elena Sokolova", brandId: "brand-stackmoves", email: "elena.sokolova@example.com", address: "318 W Evergreen Ave, Chicago, IL", phone: "+1 (312) 555-0171" },
  { id: "cust-st-20", name: "Grant Merriweather", brandId: "brand-stackmoves", email: "grant.merriweather@example.com", address: "6620 N Greenview Ave, Chicago, IL", phone: "+1 (773) 555-0135" },
  { id: "cust-st-21", name: "Sasha Feld", brandId: "brand-stackmoves", email: "sasha.feld@example.com", address: "2018 W Superior St, Chicago, IL", phone: "+1 (312) 555-0189" },
  { id: "cust-st-22", name: "Julian Okonkwo", brandId: "brand-stackmoves", email: "julian.okonkwo@example.com", address: "340 E Wacker Dr, Chicago, IL", phone: "+1 (312) 555-0121" },
  { id: "cust-st-23", name: "Bethany Kwon", brandId: "brand-stackmoves", email: "bethany.kwon@example.com", address: "430 W Lake St, Chicago, IL", phone: "+1 (312) 555-0147" },
  { id: "cust-st-24", name: "Northbrook Dental Group", brandId: "brand-stackmoves", email: "ops@northbrookdentalgroup.com", address: "615 Skokie Blvd, Northbrook, IL", phone: "+1 (847) 555-0193" },

  // --- Stack (Newark, NJ / Brick City Ops LLC) end-customers. Same residential
  // dropoff/pickup book of business as Chicago; identities are synthesized.
  { id: "cust-bcs-1", name: "Gretchen Vandermeer", brandId: "brand-stackmoves", email: "gretchen.vandermeer@example.com", address: "418 Rahway Ave, Westfield, NJ", phone: "+1 (908) 555-0142" },
  { id: "cust-bcs-2", name: "Emily Sandoval", brandId: "brand-stackmoves", email: "emily.sandoval@example.com", address: "820 Maxwell Ln, Hoboken, NJ", phone: "+1 (201) 555-0117" },
  { id: "cust-bcs-3", name: "Jonathan Aubrey", brandId: "brand-stackmoves", email: "jonathan.aubrey@example.com", address: "245 Ridgewood Ave, Glen Ridge, NJ", phone: "+1 (973) 555-0168" },
  { id: "cust-bcs-4", name: "Lori Mancuso", brandId: "brand-stackmoves", email: "lori.mancuso@example.com", address: "92 Glenwood Ave, Jersey City, NJ", phone: "+1 (201) 555-0193" },
  { id: "cust-bcs-5", name: "Dan Roskopf", brandId: "brand-stackmoves", email: "dan.roskopf@example.com", address: "614 Burgundy Way, Wayne, NJ", phone: "+1 (973) 555-0124" },
  { id: "cust-bcs-6", name: "Rafael Cardoso", brandId: "brand-stackmoves", email: "rafael.cardoso@example.com", address: "640 Monroe St, Hoboken, NJ", phone: "+1 (201) 555-0151" },
  { id: "cust-bcs-7", name: "Ashley Bonner", brandId: "brand-stackmoves", email: "ashley.bonner@example.com", address: "118 Arlington Ave, Bloomfield, NJ", phone: "+1 (973) 555-0136" },
  { id: "cust-bcs-8", name: "Gianni Castellano", brandId: "brand-stackmoves", email: "gianni.castellano@example.com", address: "210 Boyd Ave, Jersey City, NJ", phone: "+1 (201) 555-0179" },
  { id: "cust-bcs-9", name: "Monica Delacruz", brandId: "brand-stackmoves", email: "monica.delacruz@example.com", address: "318 Washington Blvd, Jersey City, NJ", phone: "+1 (201) 555-0105" },
  { id: "cust-bcs-10", name: "Christopher Whelan", brandId: "brand-stackmoves", email: "christopher.whelan@example.com", address: "126 Central Ave, Madison, NJ", phone: "+1 (973) 555-0188" },
  { id: "cust-bcs-11", name: "Carlos Paredes-Ruiz", brandId: "brand-stackmoves", email: "carlos.paredesruiz@example.com", address: "77 Summit Ave, Fords, NJ", phone: "+1 (732) 555-0163" },
  { id: "cust-bcs-12", name: "Paul Kiernan", brandId: "brand-stackmoves", email: "paul.kiernan@example.com", address: "144 Hudson St, Hoboken, NJ", phone: "+1 (201) 555-0129" },
  { id: "cust-bcs-13", name: "Desiree Lucarelli", brandId: "brand-stackmoves", email: "desiree.lucarelli@example.com", address: "512 McCarter Hwy, Newark, NJ", phone: "+1 (973) 555-0146" },
  { id: "cust-bcs-14", name: "Sarah Redmond", brandId: "brand-stackmoves", email: "sarah.redmond@example.com", address: "228 Monroe St, Hoboken, NJ", phone: "+1 (201) 555-0172" },
  { id: "cust-bcs-15", name: "Julie Yoon", brandId: "brand-stackmoves", email: "julie.yoon@example.com", address: "64 McWilliams Pl, Jersey City, NJ", phone: "+1 (201) 555-0134" },
  { id: "cust-bcs-16", name: "Veronica Hartigan", brandId: "brand-stackmoves", email: "veronica.hartigan@example.com", address: "53 Chestnut St, Chatham, NJ", phone: "+1 (973) 555-0157" },
  { id: "cust-bcs-17", name: "Megan Dunleavy", brandId: "brand-stackmoves", email: "megan.dunleavy@example.com", address: "307 Willow Ave, Hoboken, NJ", phone: "+1 (201) 555-0110" },
  { id: "cust-bcs-18", name: "Iliana Vallejo", brandId: "brand-stackmoves", email: "iliana.vallejo@example.com", address: "430 S 3rd St, Harrison, NJ", phone: "+1 (973) 555-0195" },
  { id: "cust-bcs-19", name: "Ashley Campos", brandId: "brand-stackmoves", email: "ashley.campos@example.com", address: "236 Grand St, Jersey City, NJ", phone: "+1 (201) 555-0148" },
  { id: "cust-bcs-20", name: "Douglas Amberly", brandId: "brand-stackmoves", email: "douglas.amberly@example.com", address: "260 Willow Ave, Hoboken, NJ", phone: "+1 (201) 555-0121" },
  { id: "cust-bcs-21", name: "Kaitlyn Swinton", brandId: "brand-stackmoves", email: "kaitlyn.swinton@example.com", address: "41 Broadview Ave, Maplewood, NJ", phone: "+1 (973) 555-0165" },
  { id: "cust-bcs-22", name: "Ravi Narayan", brandId: "brand-stackmoves", email: "ravi.narayan@example.com", address: "58 Heller Dr, Montclair, NJ", phone: "+1 (973) 555-0139" },
  { id: "cust-bcs-23", name: "Joao Simoes-Braga", brandId: "brand-stackmoves", email: "joao.simoesbraga@example.com", address: "219 Chestnut St, Newark, NJ", phone: "+1 (973) 555-0184" },
  { id: "cust-bcs-24", name: "Brendon Whitlock", brandId: "brand-stackmoves", email: "brendon.whitlock@example.com", address: "117 Riverbend Dr, Englewood Cliffs, NJ", phone: "+1 (201) 555-0113" },
  { id: "cust-bcs-25", name: "Anna Ilyina", brandId: "brand-stackmoves", email: "anna.ilyina@example.com", address: "640 Central Ave, Union City, NJ", phone: "+1 (201) 555-0176" },
  { id: "cust-bcs-26", name: "Rebecca McQuaid", brandId: "brand-stackmoves", email: "rebecca.mcquaid@example.com", address: "14 Park Ln N, Jersey City, NJ", phone: "+1 (201) 555-0158" },
  { id: "cust-bcs-27", name: "Ebonee Sawyer-Grant", brandId: "brand-stackmoves", email: "ebonee.sawyergrant@example.com", address: "330 Palisade Ave, Jersey City, NJ", phone: "+1 (201) 555-0102" },
  { id: "cust-bcs-28", name: "Amanda Campanella", brandId: "brand-stackmoves", email: "amanda.campanella@example.com", address: "162 Prospect St, Morristown, NJ", phone: "+1 (973) 555-0191" },
];

// The sample NO accounts bring their own end-customers, generated alongside
// their work orders (see networkOperatorSample.ts).
export const customers: Customer[] = [...baseCustomers, ...sampleNoCustomers];
