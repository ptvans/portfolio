// Google Maps JavaScript API loader.
//
// One shared script tag for the whole app, loaded on demand the first time a
// map mounts rather than up front — the Routes pages are the only ones that
// need it, and nothing else should pay for it.
//
// The key comes from VITE_GOOGLE_MAPS_API_KEY. A checkout without a local
// .env.local has no key, so `mapsKeyPresent()` lets the map render a schematic
// fallback instead of an empty grey box.

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

export function mapsKeyPresent(): boolean {
  return Boolean(API_KEY);
}

export type MapsStatus = "idle" | "loading" | "ready" | "no_key" | "error";

let loadPromise: Promise<typeof google.maps> | null = null;

// The API signals readiness by calling a global of our choosing. This is the
// documented handshake, and it's the only reliable one: with `loading=async` the
// bootstrap script's own `onload` fires before google.maps.Map exists, so
// resolving there hands back a half-built API.
const READY_CALLBACK = "__brickRouteMapsReady";

export function loadGoogleMaps(): Promise<typeof google.maps> {
  if (!API_KEY) return Promise.reject(new Error("no_key"));
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    // Another mount may already have loaded the API — don't add a second tag.
    if (typeof google !== "undefined" && google.maps?.Map) {
      resolve(google.maps);
      return;
    }

    (window as unknown as Record<string, () => void>)[READY_CALLBACK] = () => {
      resolve(google.maps);
    };

    const script = document.createElement("script");
    // `loading=async` is what the API asks for when the tag is injected at
    // runtime; without it the console fills with performance warnings.
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      API_KEY,
    )}&loading=async&callback=${READY_CALLBACK}&v=weekly`;
    script.async = true;
    script.onerror = () => {
      // Let the next mount retry — a failed load is usually the network, not
      // the key.
      loadPromise = null;
      reject(new Error("script_error"));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}

// Basemap styling: keep the streets legible — they're what the routes are read
// against — and take off the layers that compete with the polylines and pins.
// Business and transit icons are the noisiest of those at delivery-route zoom.
export const ROUTE_MAP_STYLES: google.maps.MapTypeStyle[] = [
  { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "poi.business", stylers: [{ visibility: "off" }] },
  { featureType: "transit", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
];

// The dark basemap, in the dark theme's own slate-navy: land a step above
// the page background, roads lifted from it, no points of interest. In light
// mode the maps use ROUTE_MAP_STYLES instead.
export const ROUTE_MAP_STYLES_DARK: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#141b29" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0e131e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#6c7b91" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#29334a" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#29334a" }] },
  { featureType: "road", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#3b475d" }] },
  { featureType: "road.local", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0a0e17" }] },
  { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#121925" }] },
];
