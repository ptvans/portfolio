/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Optional override for the deployed prototype's password gate. When unset,
  // the fallback in PasswordGate.tsx is used.
  readonly VITE_SITE_PASSWORD?: string;
  // Google Maps JavaScript API key, used by the Network Operator route map.
  // Absent in a checkout without a local .env.local — the map falls back to a
  // schematic canvas rather than failing (see components/RouteMap.tsx).
  readonly VITE_GOOGLE_MAPS_API_KEY?: string;
}
