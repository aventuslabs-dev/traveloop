import type { ExpressionSpecification, StyleSpecification } from "maplibre-gl";

/**
 * The hero map's look: George Town at night, in Urban Sprint's navy.
 *
 * Tiles are OpenFreeMap's (OpenMapTiles schema; free, no key, no quota). The
 * style is our own and kept sparse on purpose: water, land, parks, streets,
 * buildings in 3D, and just enough labels to place the island. The monuments,
 * stations and hologram are drawn on top by GameEntrance.tsx, and they are
 * the only warm colours on the map, so the eye goes to them.
 */

const WATER = "#030b1a";
const LAND = "#0a1c3b";
const PARK = "#0c2a3a";
const ROAD = "#1d3a66";
const ROAD_MAJOR = "#2b5190";
const LABEL = "#8fa3c7";
const HALO = "#030b1a";

const NAME: ExpressionSpecification = ["coalesce", ["get", "name:en"], ["get", "name:latin"], ["get", "name"]];

export const MAP_STYLE: StyleSpecification = {
  version: 8,
  glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
  sources: {
    omt: {
      type: "vector",
      url: "https://tiles.openfreemap.org/planet",
      attribution:
        '<a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> ' +
        '<a href="https://www.openmaptiles.org/" target="_blank" rel="noopener">© OpenMapTiles</a> ' +
        'Data from <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
    },
  },
  light: { anchor: "viewport", color: "#ffffff", intensity: 0.32, position: [1.4, 200, 35] },
  layers: [
    { id: "land", type: "background", paint: { "background-color": LAND } },
    {
      id: "park",
      type: "fill",
      source: "omt",
      "source-layer": "park",
      paint: { "fill-color": PARK, "fill-opacity": 0.8 },
    },
    {
      id: "landcover",
      type: "fill",
      source: "omt",
      "source-layer": "landcover",
      filter: ["in", ["get", "class"], ["literal", ["grass", "wood", "farmland"]]],
      paint: { "fill-color": PARK, "fill-opacity": 0.55 },
    },
    {
      id: "water",
      type: "fill",
      source: "omt",
      "source-layer": "water",
      paint: { "fill-color": WATER },
    },
    {
      id: "roads-minor",
      type: "line",
      source: "omt",
      "source-layer": "transportation",
      minzoom: 12,
      filter: ["in", ["get", "class"], ["literal", ["minor", "service", "tertiary", "path", "pedestrian"]]],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": ROAD,
        "line-width": ["interpolate", ["exponential", 1.6], ["zoom"], 13, 0.5, 17, 5, 19, 14],
      },
    },
    {
      id: "roads-major",
      type: "line",
      source: "omt",
      "source-layer": "transportation",
      filter: ["in", ["get", "class"], ["literal", ["motorway", "trunk", "primary", "secondary"]]],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": ROAD_MAJOR,
        "line-width": ["interpolate", ["exponential", 1.6], ["zoom"], 9, 0.6, 14, 2.5, 17, 9, 19, 22],
      },
    },
    {
      id: "buildings",
      type: "fill-extrusion",
      source: "omt",
      "source-layer": "building",
      minzoom: 13.5,
      paint: {
        "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0],
        "fill-extrusion-height": [
          "interpolate", ["linear"], ["zoom"],
          13.5, 0,
          15, ["coalesce", ["get", "render_height"], 6],
        ],
        "fill-extrusion-color": [
          "interpolate", ["linear"], ["coalesce", ["get", "render_height"], 6],
          0, "#16305a",
          20, "#21457f",
          60, "#3561a8",
        ],
        "fill-extrusion-opacity": 0.92,
      },
    },
    {
      id: "street-names",
      type: "symbol",
      source: "omt",
      "source-layer": "transportation_name",
      minzoom: 15.5,
      layout: {
        "symbol-placement": "line",
        "text-field": NAME,
        "text-font": ["Noto Sans Regular"],
        "text-size": 11,
      },
      paint: { "text-color": "#6a80a8", "text-halo-color": HALO, "text-halo-width": 1.2 },
    },
    {
      id: "water-names",
      type: "symbol",
      source: "omt",
      "source-layer": "water_name",
      layout: {
        "text-field": NAME,
        "text-font": ["Noto Sans Italic"],
        "text-size": 12,
        "text-letter-spacing": 0.2,
      },
      paint: { "text-color": "#4a6391" },
    },
    {
      id: "places",
      type: "symbol",
      source: "omt",
      "source-layer": "place",
      filter: ["in", ["get", "class"], ["literal", ["city", "town", "suburb", "island"]]],
      maxzoom: 15,
      layout: {
        "text-field": NAME,
        "text-font": ["Noto Sans Bold"],
        "text-size": ["interpolate", ["linear"], ["zoom"], 9, 11, 14, 14],
        "text-transform": "uppercase",
        "text-letter-spacing": 0.18,
      },
      paint: { "text-color": LABEL, "text-halo-color": HALO, "text-halo-width": 1.5 },
    },
  ],
};
