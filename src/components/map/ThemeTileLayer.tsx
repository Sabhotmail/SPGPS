"use client";

import { TileLayer, useMap } from "react-leaflet";
import { useEffect } from "react";
import { getMapTiles } from "@/lib/map-tiles";
import { useThemeDark } from "@/hooks/use-theme-dark";

function MapChrome({ dark }: { dark: boolean }) {
  const map = useMap();

  useEffect(() => {
    const el = map.getContainer();
    el.dataset.mapTheme = dark ? "dark" : "light";
    el.style.background = dark ? "#0b1220" : "#e8eef3";
    requestAnimationFrame(() => {
      try {
        map.invalidateSize({ animate: false });
      } catch {
        // ignore teardown races
      }
    });
  }, [dark, map]);

  return null;
}

export function ThemeTileLayer() {
  const dark = useThemeDark();
  const tiles = getMapTiles(dark);

  return (
    <>
      <MapChrome dark={dark} />
      <TileLayer
        key={`${dark ? "dark" : "light"}:${tiles.url}`}
        attribution={tiles.attribution}
        url={tiles.url}
        maxZoom={20}
      />
    </>
  );
}
