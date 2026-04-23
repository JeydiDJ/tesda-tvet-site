"use client";

import type { Map as MapboxMap } from "mapbox-gl";
import { useEffect, useRef, useState } from "react";
import { AreaNode } from "@/components/types/data";

type PhilippinesMapPanelProps = {
  activeArea: AreaNode;
  path: AreaNode[];
  onSelect: (id: string) => void;
  onInteractionStart: () => void;
};

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const BOUNDARY_SOURCE_ID = "tesda-boundaries";
const BOUNDARY_FILL_LAYER_ID = "tesda-boundary-fill";
const BOUNDARY_LINE_LAYER_ID = "tesda-boundary-line";
const CONTEXT_BOUNDARY_SOURCE_ID = "tesda-context-boundaries";
const CONTEXT_BOUNDARY_FILL_LAYER_ID = "tesda-context-boundary-fill";  
const CONTEXT_BOUNDARY_LINE_LAYER_ID = "tesda-context-boundary-line";
const PH_MASK_SOURCE_ID = "tesda-ph-mask";
const PH_MASK_LAYER_ID = "tesda-ph-mask-fill";

const REGION_BOUNDARY_GEOJSON_PATHS = [
  "/geojson/regions/provdists-region-100000000.0.001.json",
  "/geojson/regions/provdists-region-200000000.0.001.json",
  "/geojson/regions/provdists-region-300000000.0.001.json",
  "/geojson/regions/provdists-region-400000000.0.001.json",
  "/geojson/regions/provdists-region-500000000.0.001.json",
  "/geojson/regions/provdists-region-600000000.0.001.json",
  "/geojson/regions/provdists-region-700000000.0.001.json",
  "/geojson/regions/provdists-region-800000000.0.001.json",
  "/geojson/regions/provdists-region-900000000.0.001.json",
  "/geojson/regions/provdists-region-1000000000.0.001.json",
  "/geojson/regions/provdists-region-1100000000.0.001.json",
  "/geojson/regions/provdists-region-1200000000.0.001.json",
  "/geojson/regions/provdists-region-1300000000.0.001.json",
  "/geojson/regions/provdists-region-1400000000.0.001.json",
  "/geojson/regions/provdists-region-1600000000.0.001.json",
  "/geojson/regions/provdists-region-1700000000.0.001.json",
  "/geojson/regions/provdists-region-1900000000.0.001.json",
] as const;

type GeoJsonFeature = {
  type: "Feature";
  id?: string | number;
  geometry: GeoJSON.Geometry;
  properties?: Record<string, unknown>;
};

type GeoJsonFeatureCollection = {
  type: "FeatureCollection";
  features: GeoJsonFeature[];
};

type LngLatPair = [number, number];

function getMapCameraPadding() {
  if (typeof window === "undefined") {
    return { top: 40, right: 40, bottom: 40, left: 320 };
  }

  const width = window.innerWidth;
  if (width < 640) {
    return { top: 24, right: 24, bottom: 24, left: 24 };
  }

  if (width < 1024) {
    return { top: 32, right: 32, bottom: 32, left: 400};
  }

  return { top: 40, right: 40, bottom: 40, left: 520 };
}

function safeName(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function canonicalLocationName(value: unknown) {
  return safeName(value)
    .replace(/[(),/-]/g, " ")
    .replace(
      /\b(city of|province of|municipality of|city|province|municipality|district|lone district)\b/g,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();
}

function toTokenSet(value: string) {
  return new Set(
    value
      .split(" ")
      .map((token) => token.trim())
      .filter((token) => token.length >= 3),
  );
}

function hasLooseNameMatch(left: string, right: string) {
  if (!left || !right) return false;
  if (left === right) return true;
  if (left.includes(right) || right.includes(left)) return true;

  const leftTokens = toTokenSet(left);
  const rightTokens = toTokenSet(right);
  if (leftTokens.size === 0 || rightTokens.size === 0) return false;

  let overlap = 0;
  leftTokens.forEach((token) => {
    if (rightTokens.has(token)) overlap += 1;
  });

  return overlap >= Math.min(leftTokens.size, rightTokens.size);
}

function getFeatureName(properties?: Record<string, unknown>) {
  return (
    String(
      properties?.adm3_en ??
        properties?.adm2_en ??
        properties?.adm1_en ??
        properties?.name ??
        "",
    ) || ""
  );
}

function getFeatureCode(properties?: Record<string, unknown>) {
  return String(
    properties?.adm3_psgc ??
      properties?.adm2_psgc ??
      properties?.adm1_psgc ??
      properties?.id ??
      "",
  );
}

function getPsgcAtLevel(
  level: "region" | "province" | "city",
  properties?: Record<string, unknown>,
) {
  if (!properties) {
    return "";
  }

  if (level === "region") {
    return String(properties.adm1_psgc ?? "");
  }
  if (level === "province") {
    return String(properties.adm2_psgc ?? "");
  }
  return String(properties.adm3_psgc ?? "");
}

function getExpectedChildLevel(
  level: AreaNode["level"],
): "region" | "province" | "city" | null {
  if (level === "country") return "region";
  if (level === "region") return "province";
  if (level === "province") return "city";
  return null;
}

function getRegionPsgcFromAreaCode(areaCode: string) {
  const normalizedCode = String(areaCode ?? "").trim().toUpperCase();
  if (!normalizedCode) return "";

  const directAliases: Record<string, string> = {
    NCR: "1300000000",
    CAR: "1400000000",
    BARMM: "1900000000",
    MIMAROPA: "1700000000",
    NIR: "1800000000",
  };
  if (directAliases[normalizedCode]) {
    return directAliases[normalizedCode];
  }

  const regionMatch = normalizedCode.match(/^R(\d{1,2})$/);
  if (!regionMatch) {
    return "";
  }

  const regionNumber = Number(regionMatch[1]);
  if (!Number.isFinite(regionNumber) || regionNumber < 1) {
    return "";
  }

  return `${regionNumber}00000000`;
}

function matchesAreaByFeature(
  area: AreaNode,
  expectedLevel: "region" | "province" | "city",
  featureProperties?: Record<string, unknown>,
  resolvedPsgcByAreaId?: Record<string, string>,
) {
  const areaName = canonicalLocationName(area.name);
  const featureName = canonicalLocationName(getFeatureName(featureProperties));
  const featureCode = String(getFeatureCode(featureProperties) ?? "");
  const levelPsgc = getPsgcAtLevel(expectedLevel, featureProperties);
  const cachedPsgc = resolvedPsgcByAreaId?.[area.id] ?? "";
  const byRegionDerivedCode =
    expectedLevel === "region" &&
    Boolean(levelPsgc) &&
    getRegionPsgcFromAreaCode(area.code) === levelPsgc;
  const byPsgc =
    Boolean(levelPsgc) &&
    (area.code === levelPsgc ||
      cachedPsgc === levelPsgc);

  return (
    byPsgc ||
    byRegionDerivedCode ||
    hasLooseNameMatch(areaName, featureName) ||
    area.code === featureCode ||
    area.code === levelPsgc
  );
}

function debugMapSelection(label: string, payload: Record<string, unknown>) {
  console.log(`[MapSelection] ${label}`, payload);
}

function formatAreaLevel(level: AreaNode["level"]) {
  if (level === "city") return "City / Municipality";
  return level.charAt(0).toUpperCase() + level.slice(1);
}

function getOuterRingsFromGeometry(geometry: GeoJSON.Geometry): LngLatPair[][] {
  if (geometry.type === "Polygon") {
    return geometry.coordinates.length > 0 ? [geometry.coordinates[0] as LngLatPair[]] : [];
  }

  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates
      .map((polygon) => (polygon.length > 0 ? (polygon[0] as LngLatPair[]) : null))
      .filter((ring): ring is LngLatPair[] => Boolean(ring));
  }

  return [];
}

function createOutsidePhilippinesMask(countryGeoJson: GeoJsonFeatureCollection): GeoJSON.FeatureCollection {
  const worldRing: LngLatPair[] = [
    [-180, -85],
    [180, -85],
    [180, 85],
    [-180, 85],
    [-180, -85],
  ];

  const philippinesOuterRings = countryGeoJson.features.flatMap((feature) =>
    getOuterRingsFromGeometry(feature.geometry),
  );

  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [worldRing, ...philippinesOuterRings],
        },
      },
    ],
  };
}

function normalizeGeoJson(raw: unknown): GeoJsonFeatureCollection {
  if (
    !raw ||
    typeof raw !== "object" ||
    !("features" in raw) ||
    !Array.isArray(raw.features)
  ) {
    return { type: "FeatureCollection", features: [] };
  }

  return {
    type: "FeatureCollection",
    features: (raw.features as GeoJsonFeature[])
      .filter((feature) => feature?.type === "Feature" && Boolean(feature.geometry))
      .map((feature) => ({
        ...feature,
        properties: {
          ...(feature.properties ?? {}),
          featureName: getFeatureName(feature.properties),
          featureCode: getFeatureCode(feature.properties),
        },
      })),
  };
}

function getBoundaryGeoJsonPath(
  activeArea: AreaNode,
  selectedCountryRegionPsgc: string | null,
  resolvedPsgcByAreaId: Record<string, string>,
) {
  if (activeArea.level === "country") {
    if (selectedCountryRegionPsgc) {
      return `/geojson/regions/provdists-region-${selectedCountryRegionPsgc}.0.001.json`;
    }
    return "/geojson/country/country.json";
  }

  if (activeArea.level === "region") {
    const psgc = resolvedPsgcByAreaId[activeArea.id] ?? selectedCountryRegionPsgc;
    return psgc ? `/geojson/regions/provdists-region-${psgc}.0.001.json` : null;
  }

  if (activeArea.level === "province") {
    const psgc = resolvedPsgcByAreaId[activeArea.id];
    return psgc ? `/geojson/province/municities-provdist-${psgc}.0.001.json` : null;
  }

  return null;
}

function getContextBoundaryGeoJsonPath(
  activeArea: AreaNode,
  selectedProvincePsgc: string | null,
) {
  if (activeArea.level === "region" && selectedProvincePsgc) {
    return `/geojson/province/municities-provdist-${selectedProvincePsgc}.0.001.json`;
  }

  return null;
}

function collectLngLatPairs(geometry: GeoJSON.Geometry): Array<[number, number]> {
  if (geometry.type === "Point") {
    return [[geometry.coordinates[0], geometry.coordinates[1]]];
  }

  if (geometry.type === "MultiPoint" || geometry.type === "LineString") {
    return geometry.coordinates.map((pair) => [pair[0], pair[1]]);
  }

  if (geometry.type === "MultiLineString" || geometry.type === "Polygon") {
    return geometry.coordinates.flatMap((line) =>
      line.map((pair) => [pair[0], pair[1]] as [number, number]),
    );
  }

  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.flatMap((polygon) =>
      polygon.flatMap((line) =>
        line.map((pair) => [pair[0], pair[1]] as [number, number]),
      ),
    );
  }

  return [];
}

export function PhilippinesMapPanel({
  activeArea,
  path,
  onSelect,
  onInteractionStart,
}: PhilippinesMapPanelProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const interactionRef = useRef(onInteractionStart);
  const onSelectRef = useRef(onSelect);
  const initialViewRef = useRef(activeArea.mapView);
  const lastCameraAreaIdRef = useRef(activeArea.id);
  const rootAreaIdRef = useRef(path[0]?.id ?? "ph");
  const areaRef = useRef(activeArea);
  const selectedBoundaryIdsRef = useRef<Array<string | number>>([]);
  const selectedContextBoundaryIdsRef = useRef<Array<string | number>>([]);
  const hoveredBoundaryIdRef = useRef<string | number | null>(null);
  const hoveredContextBoundaryIdRef = useRef<string | number | null>(null);
  const resolvedPsgcByAreaIdRef = useRef<Record<string, string>>({});
  const [drillContext, setDrillContext] = useState<{
    areaId: string;
    selectedProvincePsgc: string | null;
    selectedCountryRegionPsgc: string | null;
  }>({
    areaId: activeArea.id,
    selectedProvincePsgc: null,
    selectedCountryRegionPsgc: null,
  });
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [selectedMapLabel, setSelectedMapLabel] = useState<{
    name: string;
    level: AreaNode["level"];
  } | null>(null);

  useEffect(() => {
    interactionRef.current = onInteractionStart;
  }, [onInteractionStart]);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    rootAreaIdRef.current = path[0]?.id ?? "ph";
  }, [path]);

  useEffect(() => {
    areaRef.current = activeArea;
  }, [activeArea]);

  useEffect(() => {
    if (!MAPBOX_TOKEN || !mapContainerRef.current || mapRef.current) {
      return;
    }

    let disposed = false;
    let handleEscToClear: ((event: KeyboardEvent) => void) | null = null;

    async function initializeMap() {
      const mapboxgl = (await import("mapbox-gl")).default;

      if (disposed || !mapContainerRef.current) {
        return;
      }

      mapboxgl.accessToken = MAPBOX_TOKEN;

      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: "mapbox://styles/mapbox/light-v11",
        center: [initialViewRef.current.lng, initialViewRef.current.lat],
        zoom: initialViewRef.current.zoom,
        padding: getMapCameraPadding(),
        minZoom: 3.5,
        attributionControl: true,
        pitchWithRotate: false,
        dragRotate: false,
        renderWorldCopies: false,
      });
      map.setProjection("mercator");

      map.addControl(
        new mapboxgl.NavigationControl({
          visualizePitch: false,
        }),
        "bottom-right",
      );

      map.on("load", () => {
        if (disposed) return;
        const styleLayers = map.getStyle().layers ?? [];
        styleLayers.forEach((layer) => {
          if (layer.type === "symbol") {
            map.setLayoutProperty(layer.id, "visibility", "none");
          }
        });

        if (!map.getSource(BOUNDARY_SOURCE_ID)) {
          map.addSource(BOUNDARY_SOURCE_ID, {
            type: "geojson",
            data: { type: "FeatureCollection", features: [] },
          });
        }

        if (!map.getSource(PH_MASK_SOURCE_ID)) {
          map.addSource(PH_MASK_SOURCE_ID, {
            type: "geojson",
            data: { type: "FeatureCollection", features: [] },
          });
        }

        if (!map.getLayer(PH_MASK_LAYER_ID)) {
          map.addLayer({
            id: PH_MASK_LAYER_ID,
            type: "fill",
            source: PH_MASK_SOURCE_ID,
            paint: {
              "fill-color": "#edf5ff",
              "fill-opacity": 0.97,
            },
          });
        }

        if (!map.getLayer(BOUNDARY_FILL_LAYER_ID)) {
          map.addLayer({
            id: BOUNDARY_FILL_LAYER_ID,
            type: "fill",
            source: BOUNDARY_SOURCE_ID,
            paint: {
              "fill-color": [
                "case",
                ["boolean", ["feature-state", "selected"], false],
                "#1d4ed8",
                ["boolean", ["feature-state", "hovered"], false],
                "#4f7ef1",
                "#2e67f5",
              ],
              "fill-opacity": [
                "case",
                ["boolean", ["feature-state", "selected"], false],
                0.86,
                ["boolean", ["feature-state", "hovered"], false],
                0.55,
                0.22,
              ],
            },
          });
        }

        if (!map.getLayer(BOUNDARY_LINE_LAYER_ID)) {
          map.addLayer({
            id: BOUNDARY_LINE_LAYER_ID,
            type: "line",
            source: BOUNDARY_SOURCE_ID,
            paint: {
              "line-color": "#1f4fd1",
              "line-width": [
                "case",
                ["boolean", ["feature-state", "selected"], false],
                3.8,
                ["boolean", ["feature-state", "hovered"], false],
                2.6,
                1.3,
              ],
              "line-opacity": 1,
              "line-blur": [
                "case",
                ["boolean", ["feature-state", "selected"], false],
                1.4,
                ["boolean", ["feature-state", "hovered"], false],
                0.8,
                0,
              ],
            },
          });
        }

        if (!map.getSource(CONTEXT_BOUNDARY_SOURCE_ID)) {
          map.addSource(CONTEXT_BOUNDARY_SOURCE_ID, {
            type: "geojson",
            data: { type: "FeatureCollection", features: [] },
          });
        }

        if (!map.getLayer(CONTEXT_BOUNDARY_LINE_LAYER_ID)) {
          map.addLayer({
            id: CONTEXT_BOUNDARY_FILL_LAYER_ID,
            type: "fill",
            source: CONTEXT_BOUNDARY_SOURCE_ID,
            paint: {
              "fill-color": [
                "case",
                ["boolean", ["feature-state", "selected"], false],
                "#2148b7",
                ["boolean", ["feature-state", "hovered"], false],
                "#3f6bd1",
                "#0f285f",
              ],
              "fill-opacity": [
                "case",
                ["boolean", ["feature-state", "selected"], false],
                0.72,
                ["boolean", ["feature-state", "hovered"], false],
                0.44,
                0.02,
              ],
            },
          });
        }

        if (!map.getLayer(CONTEXT_BOUNDARY_LINE_LAYER_ID)) {
          map.addLayer({
            id: CONTEXT_BOUNDARY_LINE_LAYER_ID,
            type: "line",
            source: CONTEXT_BOUNDARY_SOURCE_ID,
            paint: {
              "line-color": "#0f285f",
              "line-width": [
                "case",
                ["boolean", ["feature-state", "selected"], false],
                3.2,
                ["boolean", ["feature-state", "hovered"], false],
                2.2,
                0.9,
              ],
              "line-opacity": [
                "case",
                ["boolean", ["feature-state", "selected"], false],
                1,
                ["boolean", ["feature-state", "hovered"], false],
                0.9,
                0.5,
              ],
              "line-blur": [
                "case",
                ["boolean", ["feature-state", "selected"], false],
                1.2,
                ["boolean", ["feature-state", "hovered"], false],
                0.7,
                0,
              ],
            },
          });
        }

        const handlePrimaryBoundaryClick = (feature: mapboxgl.MapboxGeoJSONFeature) => {
          if (!feature || !feature.properties) return;

          const currentArea = areaRef.current;
          const expectedChildLevel = getExpectedChildLevel(currentArea.level);
          const featureName = String(feature.properties.featureName ?? "");
          const featureCode = String(feature.properties.featureCode ?? "");
          const regionPsgc = String(feature.properties.adm1_psgc ?? "");
          const provincePsgc = String(feature.properties.adm2_psgc ?? "");
          const cityPsgc = String(feature.properties.adm3_psgc ?? "");
          const clickedLabelName = String(feature.properties.featureName ?? getFeatureName(feature.properties));
          const clickedLabelLevel = (expectedChildLevel ?? currentArea.level) as AreaNode["level"];

          const targetChild = (currentArea.children ?? []).find((child) =>
            expectedChildLevel &&
            child.level === expectedChildLevel &&
            matchesAreaByFeature(
              child,
              expectedChildLevel,
              feature.properties,
              resolvedPsgcByAreaIdRef.current,
            ),
          );

          debugMapSelection("PRIMARY_CLICK", {
            currentAreaId: currentArea.id,
            currentAreaLevel: currentArea.level,
            expectedChildLevel,
            featureId: feature.id ?? null,
            featureName,
            featureCode,
            regionPsgc,
            provincePsgc,
            cityPsgc,
            matchedChildId: targetChild?.id ?? null,
            matchedChildName: targetChild?.name ?? null,
            matchedChildLevel: targetChild?.level ?? null,
          });

          if (targetChild) {
            setSelectedMapLabel({
              name: targetChild.name,
              level: targetChild.level,
            });
            if (expectedChildLevel) {
              const resolvedPsgc = getPsgcAtLevel(expectedChildLevel, feature.properties);
              if (resolvedPsgc) {
                resolvedPsgcByAreaIdRef.current[targetChild.id] = resolvedPsgc;
                debugMapSelection("RESOLVED_PSGC_SET", {
                  areaId: targetChild.id,
                  areaLevel: targetChild.level,
                  resolvedPsgc,
                });
              }
            }

            interactionRef.current();
            onSelectRef.current(targetChild.id);
            return;
          }

          if (clickedLabelName) {
            setSelectedMapLabel({
              name: clickedLabelName,
              level: clickedLabelLevel,
            });
          }

          if (currentArea.level === "region") {
            const provinceCode = String(feature.properties.adm2_psgc ?? "");
            if (provinceCode) {
              debugMapSelection("REGION_DRILL_CONTEXT_SET", {
                areaId: currentArea.id,
                selectedProvincePsgc: provinceCode,
              });
              setDrillContext({
                areaId: currentArea.id,
                selectedProvincePsgc: provinceCode,
                selectedCountryRegionPsgc: null,
              });
            }
          }

          if (currentArea.level === "country") {
            const regionCode = String(feature.properties.adm1_psgc ?? "");
            if (regionCode) {
              debugMapSelection("COUNTRY_DRILL_CONTEXT_SET", {
                areaId: currentArea.id,
                selectedCountryRegionPsgc: regionCode,
              });
              setDrillContext({
                areaId: currentArea.id,
                selectedProvincePsgc: null,
                selectedCountryRegionPsgc: regionCode,
              });
            }
          }

          const clickedId = feature.id;
          if (clickedId !== undefined && clickedId !== null) {
            selectedBoundaryIdsRef.current.forEach((previousId) => {
              map.setFeatureState(
                {
                  source: BOUNDARY_SOURCE_ID,
                  id: previousId,
                },
                { selected: false },
              );
            });

            selectedBoundaryIdsRef.current = [clickedId];
            map.setFeatureState(
              {
                source: BOUNDARY_SOURCE_ID,
                id: clickedId,
              },
              { selected: true },
            );
          }

          if (feature.geometry) {
            const pairs = collectLngLatPairs(feature.geometry as GeoJSON.Geometry);
            if (pairs.length > 0) {
              const first = pairs[0];
              const bounds = pairs.slice(1).reduce(
                (acc, [lng, lat]) => acc.extend([lng, lat]),
                new mapboxgl.LngLatBounds(first, first),
              );

              map.fitBounds(bounds, {
                padding: getMapCameraPadding(),
                maxZoom: 11,
                duration: 850,
              });
            }
          }
        };

        const handleContextBoundaryClick = (feature: mapboxgl.MapboxGeoJSONFeature) => {
          const currentArea = areaRef.current;
          if (currentArea.level !== "region") {
            return;
          }

          if (!feature || !feature.properties) return;

          const featureName = safeName(feature.properties.featureName);
          const featureCode = String(feature.properties.featureCode ?? "");

          const targetChild = (currentArea.children ?? []).find((child) => {
            const byName = safeName(child.name) === featureName;
            const byCode = child.code === featureCode;
            return byName || byCode;
          });
          const clickedLabelName = String(feature.properties.featureName ?? getFeatureName(feature.properties));

          debugMapSelection("CONTEXT_CLICK", {
            currentAreaId: currentArea.id,
            currentAreaLevel: currentArea.level,
            featureId: feature.id ?? null,
            featureName,
            featureCode,
            featureProvincePsgc: String(feature.properties.adm2_psgc ?? ""),
            featureCityPsgc: String(feature.properties.adm3_psgc ?? ""),
            matchedChildId: targetChild?.id ?? null,
            matchedChildName: targetChild?.name ?? null,
            matchedChildLevel: targetChild?.level ?? null,
          });

          if (targetChild) {
            setSelectedMapLabel({
              name: targetChild.name,
              level: targetChild.level,
            });
            interactionRef.current();
            onSelectRef.current(targetChild.id);
            return;
          }

          if (clickedLabelName) {
            setSelectedMapLabel({
              name: clickedLabelName,
              level: "city",
            });
          }

          const clickedId = feature.id;
          if (clickedId !== undefined && clickedId !== null) {
            selectedContextBoundaryIdsRef.current.forEach((previousId) => {
              map.setFeatureState(
                {
                  source: CONTEXT_BOUNDARY_SOURCE_ID,
                  id: previousId,
                },
                { selected: false },
              );
            });

            selectedContextBoundaryIdsRef.current = [clickedId];
            map.setFeatureState(
              {
                source: CONTEXT_BOUNDARY_SOURCE_ID,
                id: clickedId,
              },
              { selected: true },
            );
          }

          if (feature.geometry) {
            const pairs = collectLngLatPairs(feature.geometry as GeoJSON.Geometry);
            if (pairs.length > 0) {
              const first = pairs[0];
              const bounds = pairs.slice(1).reduce(
                (acc, [lng, lat]) => acc.extend([lng, lat]),
                new mapboxgl.LngLatBounds(first, first),
              );

              map.fitBounds(bounds, {
                padding: getMapCameraPadding(),
                maxZoom: 12,
                duration: 850,
              });
            }
          }
        };

        const clearSelection = () => {
          const currentArea = areaRef.current;
          const rootAreaId = rootAreaIdRef.current;
          const shouldResetHierarchy = currentArea.id !== rootAreaId;
          selectedBoundaryIdsRef.current.forEach((previousId) => {
            map.setFeatureState(
              {
                source: BOUNDARY_SOURCE_ID,
                id: previousId,
              },
              { selected: false },
            );
          });
          selectedContextBoundaryIdsRef.current.forEach((previousId) => {
            map.setFeatureState(
              {
                source: CONTEXT_BOUNDARY_SOURCE_ID,
                id: previousId,
              },
              { selected: false },
            );
          });

          if (hoveredBoundaryIdRef.current !== null) {
            map.setFeatureState(
              { source: BOUNDARY_SOURCE_ID, id: hoveredBoundaryIdRef.current },
              { hovered: false },
            );
            hoveredBoundaryIdRef.current = null;
          }
          if (hoveredContextBoundaryIdRef.current !== null) {
            map.setFeatureState(
              { source: CONTEXT_BOUNDARY_SOURCE_ID, id: hoveredContextBoundaryIdRef.current },
              { hovered: false },
            );
            hoveredContextBoundaryIdRef.current = null;
          }

          selectedBoundaryIdsRef.current = [];
          selectedContextBoundaryIdsRef.current = [];
          setSelectedMapLabel(null);
          setDrillContext({
            areaId: currentArea.id,
            selectedProvincePsgc: null,
            selectedCountryRegionPsgc: null,
          });
          if (shouldResetHierarchy) {
            interactionRef.current();
            onSelectRef.current(rootAreaId);
          } else {
            map.flyTo({
              center: [currentArea.mapView.lng, currentArea.mapView.lat],
              zoom: currentArea.mapView.zoom,
              padding: getMapCameraPadding(),
              essential: true,
              duration: 850,
            });
          }
          debugMapSelection("SELECTION_CLEARED", {
            areaId: currentArea.id,
            areaLevel: currentArea.level,
            resetToRoot: shouldResetHierarchy,
            rootAreaId,
          });
        };

        map.on("mousemove", (event) => {
          const currentArea = areaRef.current;
          const interactiveLayers =
            currentArea.level === "region"
              ? [
                  CONTEXT_BOUNDARY_FILL_LAYER_ID,
                  CONTEXT_BOUNDARY_LINE_LAYER_ID,
                  BOUNDARY_FILL_LAYER_ID,
                  BOUNDARY_LINE_LAYER_ID,
                ]
              : [BOUNDARY_FILL_LAYER_ID, BOUNDARY_LINE_LAYER_ID];
          const existingLayers = interactiveLayers.filter((layerId) =>
            Boolean(map.getLayer(layerId)),
          );
          if (existingLayers.length === 0) {
            map.getCanvas().style.cursor = "";
            return;
          }
          const features = map.queryRenderedFeatures(event.point, {
            layers: existingLayers,
          });
          map.getCanvas().style.cursor = features.length > 0 ? "pointer" : "";

          const topFeature = features[0];
          if (!topFeature) {
            if (hoveredBoundaryIdRef.current !== null) {
              map.setFeatureState(
                { source: BOUNDARY_SOURCE_ID, id: hoveredBoundaryIdRef.current },
                { hovered: false },
              );
              hoveredBoundaryIdRef.current = null;
            }
            if (hoveredContextBoundaryIdRef.current !== null) {
              map.setFeatureState(
                { source: CONTEXT_BOUNDARY_SOURCE_ID, id: hoveredContextBoundaryIdRef.current },
                { hovered: false },
              );
              hoveredContextBoundaryIdRef.current = null;
            }
            return;
          }

          const isContextFeature =
            topFeature.layer.id === CONTEXT_BOUNDARY_FILL_LAYER_ID ||
            topFeature.layer.id === CONTEXT_BOUNDARY_LINE_LAYER_ID;

          const hoverSourceId = isContextFeature
            ? CONTEXT_BOUNDARY_SOURCE_ID
            : BOUNDARY_SOURCE_ID;
          const hoverRef = isContextFeature
            ? hoveredContextBoundaryIdRef
            : hoveredBoundaryIdRef;
          const otherRef = isContextFeature
            ? hoveredBoundaryIdRef
            : hoveredContextBoundaryIdRef;
          const otherSourceId = isContextFeature
            ? BOUNDARY_SOURCE_ID
            : CONTEXT_BOUNDARY_SOURCE_ID;

          if (otherRef.current !== null) {
            map.setFeatureState(
              { source: otherSourceId, id: otherRef.current },
              { hovered: false },
            );
            otherRef.current = null;
          }

          const nextHoverId = topFeature.id;
          if (nextHoverId === undefined || nextHoverId === null) {
            return;
          }

          if (hoverRef.current !== nextHoverId) {
            if (hoverRef.current !== null) {
              map.setFeatureState(
                { source: hoverSourceId, id: hoverRef.current },
                { hovered: false },
              );
            }
            map.setFeatureState(
              { source: hoverSourceId, id: nextHoverId },
              { hovered: true },
            );
            hoverRef.current = nextHoverId;
          }
        });

        map.on("click", (event) => {
          const currentArea = areaRef.current;
          const interactiveLayers =
            currentArea.level === "region"
              ? [
                  CONTEXT_BOUNDARY_FILL_LAYER_ID,
                  CONTEXT_BOUNDARY_LINE_LAYER_ID,
                  BOUNDARY_FILL_LAYER_ID,
                  BOUNDARY_LINE_LAYER_ID,
                ]
              : [BOUNDARY_FILL_LAYER_ID, BOUNDARY_LINE_LAYER_ID];
          const existingLayers = interactiveLayers.filter((layerId) =>
            Boolean(map.getLayer(layerId)),
          );
          if (existingLayers.length === 0) {
            return;
          }
          const feature = map.queryRenderedFeatures(event.point, {
            layers: existingLayers,
          })[0];
          if (!feature) {
            clearSelection();
            return;
          }

          if (
            feature.layer.id === CONTEXT_BOUNDARY_FILL_LAYER_ID ||
            feature.layer.id === CONTEXT_BOUNDARY_LINE_LAYER_ID
          ) {
            handleContextBoundaryClick(feature);
            return;
          }

          handlePrimaryBoundaryClick(feature);
        });

        handleEscToClear = (event: KeyboardEvent) => {
          if (event.key !== "Escape") return;
          clearSelection();
        };
        window.addEventListener("keydown", handleEscToClear);

        fetch("/geojson/country/country.json")
          .then((response) => {
            if (!response.ok) {
              throw new Error("Unable to load Philippines mask geometry.");
            }
            return response.json() as Promise<unknown>;
          })
          .then((data) => {
            const normalized = normalizeGeoJson(data);
            const maskSource = map.getSource(PH_MASK_SOURCE_ID) as
              | mapboxgl.GeoJSONSource
              | undefined;
            if (!maskSource) return;
            maskSource.setData(createOutsidePhilippinesMask(normalized));
          })
          .catch(() => {
            // Non-fatal: map remains usable even without outside-country masking.
          });

        requestAnimationFrame(() => map.resize());
        setMapReady(true);
        setMapError(null);
      });

      map.on("mousedown", () => interactionRef.current());
      map.on("error", (event) => {
        if (disposed) return;
        const message =
          event?.error?.message ?? "Mapbox failed to load the map resources.";
        setMapError(message);
      });

      mapRef.current = map;
    }

    initializeMap();

    const handleResize = () => {
      mapRef.current?.resize();
    };

    window.addEventListener("resize", handleResize);

    return () => {
      disposed = true;
      window.removeEventListener("resize", handleResize);
      if (handleEscToClear) {
        window.removeEventListener("keydown", handleEscToClear);
      }
      mapRef.current?.remove();
      mapRef.current = null;
      setMapReady(false);
      setMapError(null);
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) {
      return;
    }

    if (map.getLayer(CONTEXT_BOUNDARY_FILL_LAYER_ID)) {
      map.setLayoutProperty(
        CONTEXT_BOUNDARY_FILL_LAYER_ID,
        "visibility",
        activeArea.level === "region" ? "visible" : "none",
      );
    }

    if (lastCameraAreaIdRef.current !== activeArea.id) {
      map.flyTo({
        center: [activeArea.mapView.lng, activeArea.mapView.lat],
        zoom: activeArea.mapView.zoom,
        padding: getMapCameraPadding(),
        essential: true,
        duration: 1400,
      });
      lastCameraAreaIdRef.current = activeArea.id;
    }

    const selectedCountryRegionPsgc =
      activeArea.level === "country" && drillContext.areaId === activeArea.id
        ? drillContext.selectedCountryRegionPsgc
        : null;
    const boundaryPath = getBoundaryGeoJsonPath(
      activeArea,
      selectedCountryRegionPsgc,
      resolvedPsgcByAreaIdRef.current,
    );
    debugMapSelection("BOUNDARY_PATH_RESOLVED", {
      activeAreaId: activeArea.id,
      activeAreaLevel: activeArea.level,
      selectedCountryRegionPsgc,
      boundaryPath,
      resolvedPsgcForArea: resolvedPsgcByAreaIdRef.current[activeArea.id] ?? null,
    });
    const source = map.getSource(BOUNDARY_SOURCE_ID) as
      | mapboxgl.GeoJSONSource
      | undefined;
    const contextSource = map.getSource(CONTEXT_BOUNDARY_SOURCE_ID) as
      | mapboxgl.GeoJSONSource
      | undefined;

    if (!boundaryPath || !source) {
      return;
    }

    const selectedName = safeName(activeArea.name);
    const selectedCode = activeArea.code;

    fetch(boundaryPath)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Unable to load boundary data from ${boundaryPath}`);
        }

        return response.json() as Promise<unknown>;
      })
      .then((data) => {
        const normalized = normalizeGeoJson(data);
        source.setData(normalized as unknown as GeoJSON.FeatureCollection);

        normalized.features.forEach((feature) => {
          const id = feature.id;
          if (id === undefined || id === null) return;

          const properties = feature.properties;
          const currentName = safeName(properties?.featureName);
          const currentCode = String(properties?.featureCode ?? "");
          const isSelected = currentName === selectedName || currentCode === selectedCode;

          map.setFeatureState(
            {
              source: BOUNDARY_SOURCE_ID,
              id,
            },
            { selected: isSelected },
          );
        });

        const expectedChildLevel = getExpectedChildLevel(activeArea.level);
        if (expectedChildLevel) {
          normalized.features.forEach((feature) => {
            const matchingChild = (activeArea.children ?? []).find(
              (child) =>
                child.level === expectedChildLevel &&
                matchesAreaByFeature(
                  child,
                  expectedChildLevel,
                  feature.properties,
                  resolvedPsgcByAreaIdRef.current,
                ),
            );
            if (!matchingChild) {
              return;
            }

            const resolvedPsgc = getPsgcAtLevel(expectedChildLevel, feature.properties);
            if (resolvedPsgc) {
              resolvedPsgcByAreaIdRef.current[matchingChild.id] = resolvedPsgc;
              debugMapSelection("BOUNDARY_MATCH_RESOLVED_PSGC", {
                activeAreaId: activeArea.id,
                activeAreaLevel: activeArea.level,
                matchedChildId: matchingChild.id,
                matchedChildName: matchingChild.name,
                matchedChildLevel: matchingChild.level,
                expectedChildLevel,
                resolvedPsgc,
              });
            }
          });
        }

        selectedBoundaryIdsRef.current = normalized.features
          .filter((feature) => {
            const properties = feature.properties;
            const currentName = safeName(properties?.featureName);
            const currentCode = String(properties?.featureCode ?? "");
            return currentName === selectedName || currentCode === selectedCode;
          })
          .map((feature) => feature.id)
          .filter((id): id is string | number => id !== undefined && id !== null);
      })
      .catch((error) => {
        setMapError((error as Error).message);
      });

    const selectedProvincePsgc =
      activeArea.level === "region" && drillContext.areaId === activeArea.id
        ? drillContext.selectedProvincePsgc
        : null;
    const contextPath = getContextBoundaryGeoJsonPath(activeArea, selectedProvincePsgc);
    if (!contextSource) {
      return;
    }

    if (activeArea.level === "country") {
      Promise.all(
        REGION_BOUNDARY_GEOJSON_PATHS.map((path) =>
          fetch(path).then((response) => {
            if (!response.ok) {
              throw new Error(`Unable to load boundary data from ${path}`);
            }
            return response.json() as Promise<unknown>;
          }),
        ),
      )
        .then((datasets) => {
          const features = datasets.flatMap(
            (dataset) => normalizeGeoJson(dataset).features,
          );
          selectedContextBoundaryIdsRef.current = [];
          contextSource.setData({
            type: "FeatureCollection",
            features,
          } as GeoJSON.FeatureCollection);
        })
        .catch((error) => {
          setMapError((error as Error).message);
        });
      return;
    }

    if (!contextPath) {
      selectedContextBoundaryIdsRef.current = [];
      contextSource.setData({ type: "FeatureCollection", features: [] });
      return;
    }

    fetch(contextPath)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Unable to load boundary data from ${contextPath}`);
        }
        return response.json() as Promise<unknown>;
      })
      .then((data) => {
        const normalized = normalizeGeoJson(data);
        selectedContextBoundaryIdsRef.current = [];
        contextSource.setData(normalized as unknown as GeoJSON.FeatureCollection);
      })
      .catch((error) => {
        setMapError((error as Error).message);
      });
  }, [activeArea, mapReady, onInteractionStart, onSelect, drillContext]);

  const hasToken = Boolean(MAPBOX_TOKEN);
  const displayedMapLabel = selectedMapLabel ?? {
    name: activeArea.name,
    level: activeArea.level,
  };

  return (
    <section className="relative h-[100dvh] overflow-hidden bg-[#edf5ff]">
      <div ref={mapContainerRef} className="absolute inset-0" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.98)_0%,rgba(255,255,255,0.92)_18%,rgba(255,255,255,0.76)_32%,rgba(239,247,255,0.32)_55%,rgba(239,247,255,0.08)_100%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_30%,rgba(255,255,255,0.74),transparent_28%)]" />

      <div className="pointer-events-none absolute inset-0 z-20 mx-auto w-full max-w-[1900px] px-4 sm:px-6 lg:px-8">
        <div className="absolute left-3 top-[clamp(74px,8.5vh,96px)] w-[min(700px,42vw)] sm:left-5 lg:left-8">
          <div className="pointer-events-auto rounded-[2rem] px-1.5 py-1.5">
            <div className="inline-flex items-center gap-2.5  px-4 py-2 shadow-[0_10px_24px_rgba(0,0,0,0)]">
             
             
            </div>

            <h1 className="mt-3 max-w-[640px] font-display text-[clamp(2.1rem,4.2vw,3.8rem)] font-extrabold uppercase leading-[0.9] tracking-[-0.07em] text-[var(--tesda-blue)]">
              TVET National Overview
            </h1>

            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
              <p className="text-[clamp(0.95rem,1.2vw,1.15rem)] font-bold text-slate-700">
                {activeArea.name} interactive map data
              </p>
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#879bbd] sm:text-[11px]">
                {activeArea.heroLabel} • real-time analysis • 2026
              </p>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2.5 lg:grid-cols-3">
              <MetricCard label="Regions" value={activeArea.level === "country" ? 17 : activeArea.metrics.provinces} emphasis />
              <MetricCard label="Provinces" value={activeArea.metrics.provinces} />
              <MetricCard label="Districts" value={253} />
              <MetricCard label="Cities" value={activeArea.metrics.cities} />
              <MetricCard label="Municipalities" value={activeArea.metrics.municipalities} />
              <MetricCard label="Barangays" value={41464} />
            </div>

            <div className="mt-3 rounded-[1.35rem] bg-[linear-gradient(180deg,#3159d3,#2248b2)] px-4 py-3.5 text-white shadow-[0_20px_46px_rgba(35,73,180,0.2)]">
              <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-white/74 sm:text-sm">
                Potential clients
              </p>
              <p className="mt-1.5 text-[clamp(2.2rem,3.3vw,3.2rem)] font-extrabold leading-none tracking-[-0.08em]">
                35,327,005
              </p>
            </div>

          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute right-4 top-4 z-20 sm:right-6 sm:top-6 lg:right-8">
        <div className="rounded-2xl border border-[#b9caea] bg-white/95 px-4 py-3 shadow-[0_16px_38px_rgba(37,67,132,0.16)] backdrop-blur-[2px]">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[#7f93b6] sm:text-xs">
            Selected Area
          </p>
          <p className="mt-1 text-base font-extrabold leading-tight tracking-[-0.02em] text-[#1f3561] sm:text-lg">
            {displayedMapLabel.name}
          </p>
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#4e6fae] sm:text-xs">
            {formatAreaLevel(displayedMapLabel.level)}
          </p>
        </div>
      </div>

      {!hasToken || mapError ? (
        <div className="absolute inset-x-4 bottom-4 z-20 rounded-2xl bg-[#fff3f3] px-4 py-3 text-sm font-medium text-[#a33b3b] shadow-[0_18px_40px_rgba(163,59,59,0.12)] sm:left-auto sm:right-4 sm:max-w-md">
          {!hasToken
            ? "Mapbox token not found in `NEXT_PUBLIC_MAPBOX_TOKEN`."
            : mapError}
        </div>
      ) : null}
    </section>
  );
}

function MetricCard({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: number;
  emphasis?: boolean;
}) {
  return (
    <article className="rounded-[1.25rem] bg-white/96 px-3.5 py-3.5 shadow-[0_14px_24px_rgba(72,94,146,0.1)]">
      <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-[#92a4c1] sm:text-sm">
        {label}
      </p>
      <p
        className={`mt-2.5 font-extrabold leading-none tracking-[-0.06em] text-[#22324d] ${
          emphasis ? "text-[2.2rem]" : "text-[2rem]"
        }`}
      >
        {new Intl.NumberFormat("en-PH").format(value)}
      </p>
    </article>
  );
}
