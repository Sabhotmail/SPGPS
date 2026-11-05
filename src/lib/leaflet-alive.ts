import type { Map as LeafletMap } from "leaflet";

/** True when the Leaflet map DOM is still mounted and safe to call size/pan APIs. */
export function isMapAlive(map: LeafletMap | null | undefined): boolean {
  if (!map) return false;
  try {
    const container = map.getContainer();
    if (!container?.isConnected) return false;
    const pane = map.getPane("mapPane");
    return Boolean(pane?.isConnected);
  } catch {
    return false;
  }
}
