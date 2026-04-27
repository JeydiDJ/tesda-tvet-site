"use client";

import type { Map as MapboxMap } from "mapbox-gl";
import { useEffect, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AreaNode, PsgcSelection } from "@/modules/shared/types/data";
import { getCompendiumSelection } from "@/modules/dashboard/data/compendium";
import bagongPilipinasLogo from "@/assets/logo/bagong-pilipinas-logo.png";
import tesdaLingapLogo from "@/assets/logo/tesda-lingap-logo.png";
import tesdaLogo from "@/assets/logo/tesda-logo.png";

type PhilippinesMapPanelProps = {
  activeArea: AreaNode;
  path: AreaNode[];
  onSelect: (id: string) => void;
  onInteractionStart: () => void;
  onPsgcSelectionChange?: (selection: PsgcSelection) => void;
};

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const BOUNDARY_SOURCE_ID = "tesda-boundaries";
const BOUNDARY_FILL_LAYER_ID = "tesda-boundary-fill";
const BOUNDARY_LINE_LAYER_ID = "tesda-boundary-line";
const BOUNDARY_EXTRUSION_LAYER_ID = "tesda-boundary-extrusion";
const BOUNDARY_EXTRUSION_SOURCE_ID = "tesda-boundary-extrusion-source";
const BOUNDARY_LABEL_LAYER_ID = "tesda-boundary-label";
const BOUNDARY_LABEL_SHADOW_LAYER_ID = "tesda-boundary-label-shadow";
const BOUNDARY_LABEL_GLOW_LAYER_ID = "tesda-boundary-label-glow";
const BOUNDARY_LABEL_SOURCE_ID = "tesda-boundary-label-source";
const CONTEXT_BOUNDARY_SOURCE_ID = "tesda-context-boundaries";
const CONTEXT_BOUNDARY_FILL_LAYER_ID = "tesda-context-boundary-fill";  
const CONTEXT_BOUNDARY_LINE_LAYER_ID = "tesda-context-boundary-line";
const PH_MASK_SOURCE_ID = "tesda-ph-mask";
const PH_MASK_LAYER_ID = "tesda-ph-mask-fill";
const PH_REGION_COUNT = 18;
const MUNICIPALITY_EXTRUSION_HEIGHT = 3000;
const MUNICIPALITY_EXTRUSION_OPACITY = 0.90;
const MUNICIPALITY_EXTRUSION_RISE_DURATION_MS = 260;
const MUNICIPALITY_EXTRUSION_DROP_DURATION_MS = 180;

const MUNICIPALITY_FILL_PALETTE = [
  "#2f6ee5",
  "#3f84ee",
  "#53a0f2",
  "#66b8f4",
  "#7bc6ec",
  "#5ca3d7",
  "#4c8fca",
  "#3f7ec0",
  "#5f95e0",
  "#7aa7e8",
] as const;

type DrillLevel = "country" | "region" | "province";

type DrillContext = {
  level: DrillLevel;
  selectedRegionPsgc: string | null;
  selectedProvincePsgc: string | null;
};

type StatisticsTabKey =
  | "overview"
  | "registeredPrograms"
  | "trainingInstitutions"
  | "statistics";

type MetricTheme = "blue" | "cyan" | "amber" | "rose" | "violet";

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
    return { top: 40, right: 40, bottom: 40, left: 480 };
  }

  const width = window.innerWidth;
  if (width < 640) {
    return { top: 24, right: 24, bottom: 24, left: 24 };
  }

  if (width < 1024) {
    return { top: 32, right: 32, bottom: 32, left: 560 };
  }

  return { top: 40, right: 40, bottom: 40, left: 780 };
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

function getOverviewHeading(level: AreaNode["level"]) {
  if (level === "country") return "TVET National Overview";
  if (level === "region") return "TVET Regional Overview";
  if (level === "province") return "TVET Provincial Overview";
  return "TVET Local Overview";
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
      .map((feature, index) => {
        const featureCode = getFeatureCode(feature.properties);
        const stableId =
          feature.id ??
          (featureCode ? `feature-${featureCode}` : `feature-index-${index}`);

        return {
          ...feature,
          id: stableId,
          properties: {
            ...(feature.properties ?? {}),
            featureName: getFeatureName(feature.properties),
            featureCode,
          },
        };
      }),
  };
}

function getBoundaryGeoJsonPath(drillContext: DrillContext) {
  if (drillContext.level === "region") {
    return drillContext.selectedRegionPsgc
      ? `/geojson/regions/provdists-region-${drillContext.selectedRegionPsgc}.0.01.json`
      : null;
  }

  if (drillContext.level === "province") {
    return drillContext.selectedProvincePsgc
      ? `/geojson/provdists/municities-provdist-${drillContext.selectedProvincePsgc}.0.01.json`
      : null;
  }

  return null;
}

function getExpectedChildLevelByDrillLevel(level: DrillLevel): "region" | "province" | "city" {
  if (level === "country") return "region";
  if (level === "region") return "province";
  return "city";
}

function areDrillContextsEqual(left: DrillContext, right: DrillContext) {
  return (
    left.level === right.level &&
    left.selectedRegionPsgc === right.selectedRegionPsgc &&
    left.selectedProvincePsgc === right.selectedProvincePsgc
  );
}

function resolveDrillContextFromArea(
  activeArea: AreaNode,
  path: AreaNode[],
  resolvedPsgcByAreaId: Record<string, string>,
): DrillContext {
  if (activeArea.level === "country") {
    return {
      level: "country",
      selectedRegionPsgc: null,
      selectedProvincePsgc: null,
    };
  }

  const regionArea =
    activeArea.level === "region"
      ? activeArea
      : path.find((item) => item.level === "region");
  const provinceArea =
    activeArea.level === "province" || activeArea.level === "city"
      ? path.find((item) => item.level === "province") ?? activeArea
      : null;

  const resolvedRegionPsgc =
    (regionArea ? resolvedPsgcByAreaId[regionArea.id] : "") ||
    (regionArea ? getRegionPsgcFromAreaCode(regionArea.code) : "");
  const resolvedProvincePsgc = provinceArea
    ? resolvedPsgcByAreaId[provinceArea.id] ?? ""
    : "";

  if (activeArea.level === "region") {
    return resolvedRegionPsgc
      ? {
          level: "region",
          selectedRegionPsgc: resolvedRegionPsgc,
          selectedProvincePsgc: null,
        }
      : {
          level: "country",
          selectedRegionPsgc: null,
          selectedProvincePsgc: null,
        };
  }

  if (activeArea.level === "province" || activeArea.level === "city") {
    if (resolvedProvincePsgc) {
      return {
        level: "province",
        selectedRegionPsgc: resolvedRegionPsgc || null,
        selectedProvincePsgc: resolvedProvincePsgc,
      };
    }

    if (resolvedRegionPsgc) {
      return {
        level: "region",
        selectedRegionPsgc: resolvedRegionPsgc,
        selectedProvincePsgc: null,
      };
    }
  }

  return {
    level: "country",
    selectedRegionPsgc: null,
    selectedProvincePsgc: null,
  };
}

function resolvePsgcSelectionFromArea(
  activeArea: AreaNode,
  path: AreaNode[],
  drillContext: DrillContext,
  resolvedPsgcByAreaId: Record<string, string>,
): PsgcSelection {
  const regionNode =
    activeArea.level === "region"
      ? activeArea
      : path.find((item) => item.level === "region");
  const provinceNode =
    activeArea.level === "province"
      ? activeArea
      : path.find((item) => item.level === "province");
  const cityNode = activeArea.level === "city" ? activeArea : null;

  const regionPsgc =
    (regionNode ? resolvedPsgcByAreaId[regionNode.id] : "") ||
    (regionNode ? getRegionPsgcFromAreaCode(regionNode.code) : "") ||
    drillContext.selectedRegionPsgc ||
    "";
  const provincePsgc =
    (provinceNode ? resolvedPsgcByAreaId[provinceNode.id] : "") ||
    drillContext.selectedProvincePsgc ||
    "";
  const cityMunicipalityPsgc = cityNode
    ? (resolvedPsgcByAreaId[cityNode.id] ?? "")
    : "";

  return {
    regionPsgc: regionPsgc || null,
    provincePsgc: provincePsgc || null,
    cityMunicipalityPsgc: cityMunicipalityPsgc || null,
  };
}

function applyMunicipalityColors(collection: GeoJsonFeatureCollection): GeoJsonFeatureCollection {
  const ordered = [...collection.features].sort((left, right) =>
    String(getFeatureCode(left.properties)).localeCompare(String(getFeatureCode(right.properties))),
  );

  const colorByCode = new Map<string, string>();
  ordered.forEach((feature, index) => {
    const code = String(getFeatureCode(feature.properties));
    if (!code) return;
    if (!colorByCode.has(code)) {
      colorByCode.set(code, MUNICIPALITY_FILL_PALETTE[index % MUNICIPALITY_FILL_PALETTE.length]);
    }
  });

  return {
    type: "FeatureCollection",
    features: collection.features.map((feature) => {
      const code = String(getFeatureCode(feature.properties));
      const areaColor = colorByCode.get(code);
      if (!areaColor) return feature;
      return {
        ...feature,
        properties: {
          ...(feature.properties ?? {}),
          areaColor,
        },
      };
    }),
  };
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

function getGeometryCenterPoint(
  geometry: GeoJSON.Geometry,
): GeoJSON.Point | null {
  const pairs = collectLngLatPairs(geometry);
  if (pairs.length === 0) {
    return null;
  }

  let minLng = pairs[0][0];
  let maxLng = pairs[0][0];
  let minLat = pairs[0][1];
  let maxLat = pairs[0][1];

  pairs.forEach(([lng, lat]) => {
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  });

  return {
    type: "Point",
    coordinates: [(minLng + maxLng) / 2, (minLat + maxLat) / 2],
  };
}

export function PhilippinesMapPanel({
  activeArea,
  path,
  onSelect,
  onInteractionStart,
  onPsgcSelectionChange,
}: PhilippinesMapPanelProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const interactionRef = useRef(onInteractionStart);
  const onSelectRef = useRef(onSelect);
  const onPsgcSelectionChangeRef = useRef(onPsgcSelectionChange);
  const initialViewRef = useRef(activeArea.mapView);
  const lastCameraAreaIdRef = useRef(activeArea.id);
  const rootAreaIdRef = useRef(path[0]?.id ?? "ph");
  const areaRef = useRef(activeArea);
  const selectedBoundaryIdsRef = useRef<Array<string | number>>([]);
  const selectedContextBoundaryIdsRef = useRef<Array<string | number>>([]);
  const hoveredBoundaryIdRef = useRef<string | number | null>(null);
  const hoveredContextBoundaryIdRef = useRef<string | number | null>(null);
  const resolvedPsgcByAreaIdRef = useRef<Record<string, string>>({});
  const boundaryFeaturesByIdRef = useRef<Map<string | number, GeoJsonFeature>>(new Map());
  const boundaryLoadRequestIdRef = useRef(0);
  const extrusionClearTimeoutRef = useRef<number | null>(null);
  const extrusionRiseTimeoutRef = useRef<number | null>(null);
  const [drillContext, setDrillContext] = useState<DrillContext>({
    level: "country",
    selectedRegionPsgc: null,
    selectedProvincePsgc: null,
  });
  const drillContextRef = useRef<DrillContext>(drillContext);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [selectedMapLabel, setSelectedMapLabel] = useState<{
    name: string;
    level: AreaNode["level"];
  } | null>(null);
  const [activeStatisticsTab, setActiveStatisticsTab] =
    useState<StatisticsTabKey>("overview");
  const [hoveredStatisticsTab, setHoveredStatisticsTab] = useState<StatisticsTabKey | null>(null);
  const [isMunicipalitySelected, setIsMunicipalitySelected] = useState(false);
  const [layerFeatureCount, setLayerFeatureCount] = useState<number | null>(null);
  const [programCharts, setProgramCharts] = useState<{
    sectors: Array<{ sector: string; totalPrograms: number }>;
    areas: Array<{ area: string; totalPrograms: number }>;
  }>({ sectors: [], areas: [] });
  const [chartsReady, setChartsReady] = useState(false);
  const [statisticsSlideIndex, setStatisticsSlideIndex] = useState(0);
  const statisticsSwipeStartXRef = useRef<number | null>(null);
  const statisticsSwipeDeltaXRef = useRef(0);
  const isMunicipalitySelectedRef = useRef(false);

  useEffect(() => {
    interactionRef.current = onInteractionStart;
  }, [onInteractionStart]);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    onPsgcSelectionChangeRef.current = onPsgcSelectionChange;
  }, [onPsgcSelectionChange]);

  useEffect(() => {
    rootAreaIdRef.current = path[0]?.id ?? "ph";
  }, [path]);

  useEffect(() => {
    areaRef.current = activeArea;
  }, [activeArea]);

  useEffect(() => {
    isMunicipalitySelectedRef.current = isMunicipalitySelected;
  }, [isMunicipalitySelected]);

  useEffect(() => {
    drillContextRef.current = drillContext;
  }, [drillContext]);

  useEffect(() => {
    setChartsReady(true);
  }, []);

  useEffect(() => {
    const nextDrillContext = resolveDrillContextFromArea(
      activeArea,
      path,
      resolvedPsgcByAreaIdRef.current,
    );
    const currentDrillContext = drillContextRef.current;
    if (!areDrillContextsEqual(currentDrillContext, nextDrillContext)) {
      setDrillContext(nextDrillContext);
    }

    // Selected labels should always follow the active area after level changes.
    setSelectedMapLabel(null);
  }, [activeArea.id, activeArea.level, activeArea.code, path]);

  useEffect(() => {
    setActiveStatisticsTab("overview");
    setStatisticsSlideIndex(0);
  }, [activeArea.id]);

  useEffect(() => {
    let cancelled = false;
    const selectedLevel =
      activeArea.level === "country"
        ? "nationwide"
        : activeArea.level === "region"
          ? "region"
          : activeArea.level === "province"
            ? "province"
            : "city_municipality";
    const selection = getCompendiumSelection(activeArea, path);

    fetch("/api/dashboard/charts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        selectedLevel,
        selection,
      }),
      cache: "no-store",
    })
      .then((response) => response.json() as Promise<{
        sectors: Array<{ sector: string; totalPrograms: number }>;
        areas: Array<{ area: string; totalPrograms: number }>;
      }>)
      .then((payload) => {
        if (cancelled) return;
        setProgramCharts({
          sectors: payload.sectors ?? [],
          areas: payload.areas ?? [],
        });
      })
      .catch(() => {
        if (cancelled) return;
        setProgramCharts({ sectors: [], areas: [] });
      });

    return () => {
      cancelled = true;
    };
  }, [activeArea.id, activeArea.level, path]);

  useEffect(() => {
    if (!onPsgcSelectionChangeRef.current) {
      return;
    }

    const selection = resolvePsgcSelectionFromArea(
      activeArea,
      path,
      drillContext,
      resolvedPsgcByAreaIdRef.current,
    );
    onPsgcSelectionChangeRef.current(selection);
  }, [activeArea.id, path, drillContext]);

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
        minZoom: 3.5,
        attributionControl: true,
        pitchWithRotate: false,
        dragRotate: false,
        renderWorldCopies: false,
      });
      map.setPadding(getMapCameraPadding());
      map.setProjection("mercator");

      map.on("load", () => {
        if (disposed) return;
        const styleLayers = map.getStyle().layers ?? [];
        styleLayers.forEach((layer) => {
          // Hide all base-style layers so only GeoJSON vector overlays are visible.
          map.setLayoutProperty(layer.id, "visibility", "none");
        });

        if (!map.getSource(BOUNDARY_SOURCE_ID)) {
          map.addSource(BOUNDARY_SOURCE_ID, {
            type: "geojson",
            data: { type: "FeatureCollection", features: [] },
          });
        }
        if (!map.getSource(BOUNDARY_EXTRUSION_SOURCE_ID)) {
          map.addSource(BOUNDARY_EXTRUSION_SOURCE_ID, {
            type: "geojson",
            data: { type: "FeatureCollection", features: [] },
          });
        }
        if (!map.getSource(BOUNDARY_LABEL_SOURCE_ID)) {
          map.addSource(BOUNDARY_LABEL_SOURCE_ID, {
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
                ["coalesce", ["get", "areaColor"], "#2e67f5"],
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

        if (!map.getLayer(BOUNDARY_EXTRUSION_LAYER_ID)) {
          map.addLayer({
            id: BOUNDARY_EXTRUSION_LAYER_ID,
            type: "fill-extrusion",
            source: BOUNDARY_EXTRUSION_SOURCE_ID,
            paint: {
              "fill-extrusion-color": ["coalesce", ["get", "areaColor"], "#1f4fd1"],
              "fill-extrusion-height": 0,
              "fill-extrusion-height-transition": {
                duration: MUNICIPALITY_EXTRUSION_RISE_DURATION_MS,
                delay: 0,
              },
              "fill-extrusion-base": 0,
              "fill-extrusion-opacity": 0,
              "fill-extrusion-opacity-transition": {
                duration: MUNICIPALITY_EXTRUSION_RISE_DURATION_MS,
                delay: 0,
              },
              "fill-extrusion-vertical-gradient": true,
            },
          });
        }

        const animateExtrusionDown = (clearAfter = true) => {
          const extrusionSource = map.getSource(BOUNDARY_EXTRUSION_SOURCE_ID) as
            | mapboxgl.GeoJSONSource
            | undefined;
          if (!extrusionSource) return;

          if (extrusionClearTimeoutRef.current !== null) {
            window.clearTimeout(extrusionClearTimeoutRef.current);
            extrusionClearTimeoutRef.current = null;
          }
          if (extrusionRiseTimeoutRef.current !== null) {
            window.clearTimeout(extrusionRiseTimeoutRef.current);
            extrusionRiseTimeoutRef.current = null;
          }

          map.setPaintProperty(BOUNDARY_EXTRUSION_LAYER_ID, "fill-extrusion-height-transition", {
            duration: MUNICIPALITY_EXTRUSION_DROP_DURATION_MS,
            delay: 0,
          });
          map.setPaintProperty(BOUNDARY_EXTRUSION_LAYER_ID, "fill-extrusion-opacity-transition", {
            duration: MUNICIPALITY_EXTRUSION_DROP_DURATION_MS,
            delay: 0,
          });
          map.setPaintProperty(BOUNDARY_EXTRUSION_LAYER_ID, "fill-extrusion-height", 0);
          map.setPaintProperty(BOUNDARY_EXTRUSION_LAYER_ID, "fill-extrusion-opacity", 0);

          if (clearAfter) {
            extrusionClearTimeoutRef.current = window.setTimeout(() => {
              extrusionSource.setData({ type: "FeatureCollection", features: [] });
              extrusionClearTimeoutRef.current = null;
            }, MUNICIPALITY_EXTRUSION_DROP_DURATION_MS + 40);
          }
        };

        const animateExtrusionUp = (
          geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon,
          areaColor: string,
          animateFromCurrentRaised = false,
        ) => {
          const extrusionSource = map.getSource(BOUNDARY_EXTRUSION_SOURCE_ID) as
            | mapboxgl.GeoJSONSource
            | undefined;
          if (!extrusionSource) return;

          if (extrusionClearTimeoutRef.current !== null) {
            window.clearTimeout(extrusionClearTimeoutRef.current);
            extrusionClearTimeoutRef.current = null;
          }
          if (extrusionRiseTimeoutRef.current !== null) {
            window.clearTimeout(extrusionRiseTimeoutRef.current);
            extrusionRiseTimeoutRef.current = null;
          }

          const rise = () => {
            map.setPaintProperty(BOUNDARY_EXTRUSION_LAYER_ID, "fill-extrusion-height-transition", {
              duration: MUNICIPALITY_EXTRUSION_RISE_DURATION_MS,
              delay: 0,
            });
            map.setPaintProperty(BOUNDARY_EXTRUSION_LAYER_ID, "fill-extrusion-opacity-transition", {
              duration: MUNICIPALITY_EXTRUSION_RISE_DURATION_MS,
              delay: 0,
            });
            map.setPaintProperty(BOUNDARY_EXTRUSION_LAYER_ID, "fill-extrusion-height", 0);
            map.setPaintProperty(BOUNDARY_EXTRUSION_LAYER_ID, "fill-extrusion-opacity", 0);

            extrusionSource.setData({
              type: "FeatureCollection",
              features: [
                {
                  type: "Feature",
                  properties: { areaColor },
                  geometry,
                },
              ],
            });

            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                map.setPaintProperty(
                  BOUNDARY_EXTRUSION_LAYER_ID,
                  "fill-extrusion-height",
                  MUNICIPALITY_EXTRUSION_HEIGHT,
                );
                map.setPaintProperty(
                  BOUNDARY_EXTRUSION_LAYER_ID,
                  "fill-extrusion-opacity",
                  MUNICIPALITY_EXTRUSION_OPACITY,
                );
              });
            });
          };

          if (animateFromCurrentRaised) {
            map.setPaintProperty(BOUNDARY_EXTRUSION_LAYER_ID, "fill-extrusion-height-transition", {
              duration: MUNICIPALITY_EXTRUSION_DROP_DURATION_MS,
              delay: 0,
            });
            map.setPaintProperty(BOUNDARY_EXTRUSION_LAYER_ID, "fill-extrusion-opacity-transition", {
              duration: MUNICIPALITY_EXTRUSION_DROP_DURATION_MS,
              delay: 0,
            });
            map.setPaintProperty(BOUNDARY_EXTRUSION_LAYER_ID, "fill-extrusion-height", 0);
            map.setPaintProperty(BOUNDARY_EXTRUSION_LAYER_ID, "fill-extrusion-opacity", 0);

            extrusionRiseTimeoutRef.current = window.setTimeout(() => {
              rise();
              extrusionRiseTimeoutRef.current = null;
            }, MUNICIPALITY_EXTRUSION_DROP_DURATION_MS + 10);
            return;
          }

          rise();
        };

        if (!map.getLayer(BOUNDARY_LABEL_GLOW_LAYER_ID)) {
          map.addLayer({
            id: BOUNDARY_LABEL_GLOW_LAYER_ID,
            type: "circle",
            source: BOUNDARY_LABEL_SOURCE_ID,
            paint: {
              "circle-radius": [
                "interpolate",
                ["linear"],
                ["zoom"],
                5,
                14,
                8,
                18,
                11,
                22,
              ],
              "circle-color": "#2b5ed3",
              "circle-opacity": 0.16,
              "circle-blur": 0.35,
              "circle-stroke-color": "#f8fbff",
              "circle-stroke-width": 1.2,
              "circle-stroke-opacity": 0.72,
            },
          });
        }

        if (!map.getLayer(BOUNDARY_LABEL_SHADOW_LAYER_ID)) {
          map.addLayer({
            id: BOUNDARY_LABEL_SHADOW_LAYER_ID,
            type: "symbol",
            source: BOUNDARY_LABEL_SOURCE_ID,
            layout: {
              "text-field": ["upcase", ["get", "featureName"]],
              "text-size": [
                "interpolate",
                ["linear"],
                ["zoom"],
                5,
                12,
                8,
                14,
                10,
                16,
              ],
              "text-letter-spacing": 0.07,
              "text-allow-overlap": true,
              "text-ignore-placement": true,
              "text-padding": 6,
              "text-justify": "center",
            },
            paint: {
              "text-color": "rgba(11, 31, 74, 0.34)",
              "text-translate": [0, 1.6],
              "text-translate-anchor": "viewport",
              "text-opacity": 1,
            },
          });
        }

        if (!map.getLayer(BOUNDARY_LABEL_LAYER_ID)) {
          map.addLayer({
            id: BOUNDARY_LABEL_LAYER_ID,
            type: "symbol",
            source: BOUNDARY_LABEL_SOURCE_ID,
            layout: {
              "text-field": ["upcase", ["get", "featureName"]],
              "text-font": ["DIN Pro Bold", "Arial Unicode MS Bold"],
              "text-size": [
                "interpolate",
                ["linear"],
                ["zoom"],
                5,
                12,
                8,
                14,
                10,
                16,
              ],
              "text-letter-spacing": 0.07,
              "text-allow-overlap": true,
              "text-ignore-placement": true,
              "text-padding": 6,
              "text-justify": "center",
            },
            paint: {
              "text-color": "#1949ba",
              "text-halo-color": "#f8fbff",
              "text-halo-width": 2.6,
              "text-halo-blur": 0.9,
              "text-opacity": 1,
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
          const currentDrillContext = drillContextRef.current;
          const expectedChildLevel = getExpectedChildLevelByDrillLevel(currentDrillContext.level);
          const featureName = String(feature.properties.featureName ?? "");
          const featureCode = String(feature.properties.featureCode ?? "");
          const regionPsgc = String(feature.properties.adm1_psgc ?? "");
          const provincePsgc = String(feature.properties.adm2_psgc ?? "");
          const cityPsgc = String(feature.properties.adm3_psgc ?? "");
          const clickedLabelName = String(
            feature.properties.featureName ?? getFeatureName(feature.properties),
          );
          const clickedLabelLevel = expectedChildLevel as AreaNode["level"];

          const targetChild = (currentArea.children ?? []).find((child) =>
            child.level === expectedChildLevel &&
            matchesAreaByFeature(
              child,
              expectedChildLevel,
              feature.properties ?? undefined,
              resolvedPsgcByAreaIdRef.current,
            ),
          );

          debugMapSelection("PRIMARY_CLICK", {
            currentAreaId: currentArea.id,
            currentAreaLevel: currentArea.level,
            mapDrillLevel: currentDrillContext.level,
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
            setIsMunicipalitySelected(false);
            if (expectedChildLevel) {
              const resolvedPsgc = getPsgcAtLevel(
                expectedChildLevel,
                feature.properties ?? undefined,
              );
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

          if (currentDrillContext.level === "country") {
            if (!regionPsgc) {
              return;
            }
            setIsMunicipalitySelected(false);
            debugMapSelection("COUNTRY_TO_REGION", {
              selectedRegionPsgc: regionPsgc,
            });
            setDrillContext({
              level: "region",
              selectedRegionPsgc: regionPsgc,
              selectedProvincePsgc: null,
            });
          } else if (currentDrillContext.level === "region") {
            const provinceCode = String(feature.properties.adm2_psgc ?? "");
            if (provinceCode) {
              setIsMunicipalitySelected(false);
              setDrillContext({
                level: "province",
                selectedRegionPsgc: currentDrillContext.selectedRegionPsgc,
                selectedProvincePsgc: provinceCode,
              });
              debugMapSelection("REGION_TO_PROVINCE", {
                selectedRegionPsgc: currentDrillContext.selectedRegionPsgc,
                selectedProvincePsgc: provinceCode,
              });
            }
          }

          const clickedId = feature.id;
          if (clickedId !== undefined && clickedId !== null) {
            const hadPreviousSelection = selectedBoundaryIdsRef.current.length > 0;
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

            const shouldRaiseMunicipality = currentDrillContext.level === "province";
            setIsMunicipalitySelected(shouldRaiseMunicipality);

            const fullFeatureGeometry =
              boundaryFeaturesByIdRef.current.get(clickedId)?.geometry ??
              (feature.geometry as GeoJSON.Geometry | undefined);
            if (
              shouldRaiseMunicipality &&
              fullFeatureGeometry &&
              (fullFeatureGeometry.type === "Polygon" ||
                fullFeatureGeometry.type === "MultiPolygon")
            ) {
              animateExtrusionUp(
                fullFeatureGeometry as GeoJSON.Polygon | GeoJSON.MultiPolygon,
                String(feature.properties?.areaColor ?? "") || "#1f4fd1",
                hadPreviousSelection && isMunicipalitySelectedRef.current,
              );
            } else {
              animateExtrusionDown(true);
            }
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
                pitch: currentDrillContext.level === "province" ? 46 : 0,
                duration: 850,
              });
            }
          }
        };

        const clearSelection = () => {
          const currentArea = areaRef.current;
          const currentDrillContext = drillContextRef.current;
          const rootAreaId = rootAreaIdRef.current;
          const shouldResetHierarchy = currentArea.id !== rootAreaId;
          const hadPrimarySelection = selectedBoundaryIdsRef.current.length > 0;
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
          setIsMunicipalitySelected(false);
          const labelSource = map.getSource(BOUNDARY_LABEL_SOURCE_ID) as
            | mapboxgl.GeoJSONSource
            | undefined;
          labelSource?.setData({ type: "FeatureCollection", features: [] });
          const extrusionSource = map.getSource(BOUNDARY_EXTRUSION_SOURCE_ID) as
            | mapboxgl.GeoJSONSource
            | undefined;
          if (extrusionSource) {
            animateExtrusionDown(true);
          }
          if (currentDrillContext.level === "province") {
            if (!hadPrimarySelection) {
              setDrillContext({
                level: "region",
                selectedRegionPsgc: currentDrillContext.selectedRegionPsgc,
                selectedProvincePsgc: null,
              });
              map.easeTo({
                zoom: Math.max(map.getZoom() - 0.8, 5.8),
                pitch: 0,
                padding: getMapCameraPadding(),
                essential: true,
                duration: 750,
              });
              debugMapSelection("SELECTION_CLEARED_TO_REGION", {
                areaId: currentArea.id,
                areaLevel: currentArea.level,
                mapDrillLevel: currentDrillContext.level,
                selectedRegionPsgc: currentDrillContext.selectedRegionPsgc,
              });
              return;
            }
            const currentZoom = map.getZoom();
            map.easeTo({
              zoom: Math.max(currentZoom - 0.9, 6.2),
              pitch: 0,
              padding: getMapCameraPadding(),
              essential: true,
              duration: 750,
            });
            debugMapSelection("SELECTION_CLEARED_MUNICIPALITY", {
              areaId: currentArea.id,
              areaLevel: currentArea.level,
              mapDrillLevel: currentDrillContext.level,
              zoomFrom: currentZoom,
              zoomTo: Math.max(currentZoom - 0.9, 6.2),
            });
            return;
          }
          setDrillContext({
            level: "country",
            selectedRegionPsgc: null,
            selectedProvincePsgc: null,
          });
          if (shouldResetHierarchy) {
            interactionRef.current();
            onSelectRef.current(rootAreaId);
          } else {
            map.flyTo({
              center: [currentArea.mapView.lng, currentArea.mapView.lat],
              zoom: currentArea.mapView.zoom,
              pitch: 0,
              padding: getMapCameraPadding(),
              essential: true,
              duration: 850,
            });
          }
          debugMapSelection("SELECTION_CLEARED", {
            areaId: currentArea.id,
            areaLevel: currentArea.level,
            mapDrillLevel: drillContextRef.current.level,
            resetToRoot: shouldResetHierarchy,
            rootAreaId,
          });
        };

        map.on("mousemove", (event) => {
          const interactiveLayers = [BOUNDARY_FILL_LAYER_ID, BOUNDARY_LINE_LAYER_ID];
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
            const labelSource = map.getSource(BOUNDARY_LABEL_SOURCE_ID) as
              | mapboxgl.GeoJSONSource
              | undefined;
            labelSource?.setData({ type: "FeatureCollection", features: [] });
            return;
          }

          const nextHoverId = topFeature.id;
          if (nextHoverId === undefined || nextHoverId === null) {
            const labelSource = map.getSource(BOUNDARY_LABEL_SOURCE_ID) as
              | mapboxgl.GeoJSONSource
              | undefined;
            labelSource?.setData({ type: "FeatureCollection", features: [] });
            return;
          }

          const labelSource = map.getSource(BOUNDARY_LABEL_SOURCE_ID) as
            | mapboxgl.GeoJSONSource
            | undefined;
          const labelName = String(
            (topFeature.properties as Record<string, unknown> | undefined)?.featureName ??
              "",
          );
          if (labelSource && topFeature.geometry && labelName) {
            const centerPoint = getGeometryCenterPoint(
              topFeature.geometry as GeoJSON.Geometry,
            );
            if (!centerPoint) {
              labelSource.setData({ type: "FeatureCollection", features: [] });
              return;
            }
            labelSource.setData({
              type: "FeatureCollection",
              features: [
                {
                  type: "Feature",
                  properties: {
                    featureName: labelName,
                  },
                  geometry: centerPoint,
                },
              ],
            });
          } else {
            labelSource?.setData({ type: "FeatureCollection", features: [] });
          }

          if (hoveredBoundaryIdRef.current !== nextHoverId) {
            if (hoveredBoundaryIdRef.current !== null) {
              map.setFeatureState(
                { source: BOUNDARY_SOURCE_ID, id: hoveredBoundaryIdRef.current },
                { hovered: false },
              );
            }
            map.setFeatureState(
              { source: BOUNDARY_SOURCE_ID, id: nextHoverId },
              { hovered: true },
            );
            hoveredBoundaryIdRef.current = nextHoverId;
          }
        });

        map.on("click", (event) => {
          const interactiveLayers = [BOUNDARY_FILL_LAYER_ID, BOUNDARY_LINE_LAYER_ID];
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

          handlePrimaryBoundaryClick(feature);
        });

        map.on("mouseleave", () => {
          map.getCanvas().style.cursor = "";
          if (hoveredBoundaryIdRef.current !== null) {
            map.setFeatureState(
              { source: BOUNDARY_SOURCE_ID, id: hoveredBoundaryIdRef.current },
              { hovered: false },
            );
            hoveredBoundaryIdRef.current = null;
          }
          const labelSource = map.getSource(BOUNDARY_LABEL_SOURCE_ID) as
            | mapboxgl.GeoJSONSource
            | undefined;
          labelSource?.setData({ type: "FeatureCollection", features: [] });
        });

        handleEscToClear = (event: KeyboardEvent) => {
          if (event.key !== "Escape") return;
          clearSelection();
        };
        window.addEventListener("keydown", handleEscToClear);

        fetch("/geojson/country/country.0.01.json")
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
      if (extrusionClearTimeoutRef.current !== null) {
        window.clearTimeout(extrusionClearTimeoutRef.current);
        extrusionClearTimeoutRef.current = null;
      }
      if (extrusionRiseTimeoutRef.current !== null) {
        window.clearTimeout(extrusionRiseTimeoutRef.current);
        extrusionRiseTimeoutRef.current = null;
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
    const loadRequestId = boundaryLoadRequestIdRef.current + 1;
    boundaryLoadRequestIdRef.current = loadRequestId;
    let cancelled = false;
    const isLatestBoundaryLoad = () =>
      !cancelled && boundaryLoadRequestIdRef.current === loadRequestId;

    if (map.getLayer(CONTEXT_BOUNDARY_FILL_LAYER_ID)) {
      map.setLayoutProperty(
        CONTEXT_BOUNDARY_FILL_LAYER_ID,
        "visibility",
        "none",
      );
    }

    if (lastCameraAreaIdRef.current !== activeArea.id) {
      map.flyTo({
        center: [activeArea.mapView.lng, activeArea.mapView.lat],
        zoom: activeArea.mapView.zoom,
        pitch: isMunicipalitySelectedRef.current ? 46 : 0,
        padding: getMapCameraPadding(),
        essential: true,
        duration: 1400,
      });
      lastCameraAreaIdRef.current = activeArea.id;
    }

    const boundaryPath = getBoundaryGeoJsonPath(drillContext);
    debugMapSelection("BOUNDARY_PATH_RESOLVED", {
      activeAreaId: activeArea.id,
      activeAreaLevel: activeArea.level,
      mapDrillLevel: drillContext.level,
      selectedRegionPsgc: drillContext.selectedRegionPsgc,
      selectedProvincePsgc: drillContext.selectedProvincePsgc,
      boundaryPath,
    });
    const source = map.getSource(BOUNDARY_SOURCE_ID) as
      | mapboxgl.GeoJSONSource
      | undefined;
    const contextSource = map.getSource(CONTEXT_BOUNDARY_SOURCE_ID) as
      | mapboxgl.GeoJSONSource
      | undefined;
    const labelSource = map.getSource(BOUNDARY_LABEL_SOURCE_ID) as
      | mapboxgl.GeoJSONSource
      | undefined;
    const extrusionSource = map.getSource(BOUNDARY_EXTRUSION_SOURCE_ID) as
      | mapboxgl.GeoJSONSource
      | undefined;
    labelSource?.setData({ type: "FeatureCollection", features: [] });
    if (drillContext.level !== "province" || !isMunicipalitySelectedRef.current) {
      extrusionSource?.setData({ type: "FeatureCollection", features: [] });
    }

    if (!source) {
      return () => {
        cancelled = true;
      };
    }

    selectedBoundaryIdsRef.current.forEach((previousId) => {
      map.setFeatureState(
        {
          source: BOUNDARY_SOURCE_ID,
          id: previousId,
        },
        { selected: false },
      );
    });
    if (hoveredBoundaryIdRef.current !== null) {
      map.setFeatureState(
        {
          source: BOUNDARY_SOURCE_ID,
          id: hoveredBoundaryIdRef.current,
        },
        { hovered: false },
      );
      hoveredBoundaryIdRef.current = null;
    }
    selectedBoundaryIdsRef.current = [];
    source.setData({ type: "FeatureCollection", features: [] });
    boundaryFeaturesByIdRef.current = new Map();
    setLayerFeatureCount(null);

    if (drillContext.level === "country") {
      fetch("/geojson/country/country.0.01.json")
        .then((response) => {
          if (!response.ok) {
            throw new Error("Unable to load boundary data from /geojson/country/country.0.01.json");
          }
          return response.json() as Promise<unknown>;
        })
        .then((data) => {
          if (!isLatestBoundaryLoad()) {
            return;
          }
          const normalized = normalizeGeoJson(data);
          setLayerFeatureCount(normalized.features.length);
          boundaryFeaturesByIdRef.current = new Map(
            normalized.features
              .filter((item): item is GeoJsonFeature & { id: string | number } =>
                item.id !== undefined && item.id !== null,
              )
              .map((item) => [item.id, item]),
          );
          source.setData(normalized as unknown as GeoJSON.FeatureCollection);
        })
        .catch((error) => {
          if (!isLatestBoundaryLoad()) {
            return;
          }
          setMapError((error as Error).message);
        });
    } else if (boundaryPath) {
      fetch(boundaryPath)
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Unable to load boundary data from ${boundaryPath}`);
          }

          return response.json() as Promise<unknown>;
        })
        .then((data) => {
          if (!isLatestBoundaryLoad()) {
            return;
          }
          const normalized = normalizeGeoJson(data);
          const styledCollection =
            drillContext.level === "province"
              ? applyMunicipalityColors(normalized)
              : normalized;
          setLayerFeatureCount(styledCollection.features.length);
          boundaryFeaturesByIdRef.current = new Map(
            styledCollection.features
              .filter((item): item is GeoJsonFeature & { id: string | number } =>
                item.id !== undefined && item.id !== null,
              )
              .map((item) => [item.id, item]),
          );
          source.setData(styledCollection as unknown as GeoJSON.FeatureCollection);

          // Re-apply feature-state after source data refresh so hover/selection
          // (including 3D extrusion on selected municipality) persists.
          selectedBoundaryIdsRef.current.forEach((selectedId) => {
            map.setFeatureState(
              {
                source: BOUNDARY_SOURCE_ID,
                id: selectedId,
              },
              { selected: true },
            );
          });
          if (hoveredBoundaryIdRef.current !== null) {
            map.setFeatureState(
              {
                source: BOUNDARY_SOURCE_ID,
                id: hoveredBoundaryIdRef.current,
              },
              { hovered: true },
            );
          }

          const expectedChildLevel = getExpectedChildLevelByDrillLevel(drillContext.level);
          styledCollection.features.forEach((feature) => {
            const matchingChild = (activeArea.children ?? []).find(
              (child) =>
                child.level === expectedChildLevel &&
                matchesAreaByFeature(
                  child,
                  expectedChildLevel,
                  feature.properties ?? undefined,
                  resolvedPsgcByAreaIdRef.current,
                ),
            );
            if (!matchingChild) {
              return;
            }

            const resolvedPsgc = getPsgcAtLevel(
              expectedChildLevel,
              feature.properties ?? undefined,
            );
            if (resolvedPsgc) {
              resolvedPsgcByAreaIdRef.current[matchingChild.id] = resolvedPsgc;
            }
          });
        })
        .catch((error) => {
          if (!isLatestBoundaryLoad()) {
            return;
          }
          setMapError((error as Error).message);
        });
    }

    if (contextSource) {
      if (hoveredContextBoundaryIdRef.current !== null) {
        map.setFeatureState(
          { source: CONTEXT_BOUNDARY_SOURCE_ID, id: hoveredContextBoundaryIdRef.current },
          { hovered: false },
        );
        hoveredContextBoundaryIdRef.current = null;
      }
      selectedContextBoundaryIdsRef.current = [];
      contextSource.setData({ type: "FeatureCollection", features: [] });
    }

    return () => {
      cancelled = true;
    };
  }, [activeArea, mapReady, drillContext]);

  useEffect(() => {
    if (!mapReady || !mapRef.current) {
      return;
    }

    if (!isMunicipalitySelected) {
      mapRef.current.easeTo({
        pitch: 0,
        duration: 650,
        essential: true,
      });
      return;
    }

    mapRef.current.easeTo({
      pitch: 46,
      duration: 650,
      essential: true,
    });
  }, [isMunicipalitySelected, mapReady]);

  const hasToken = Boolean(MAPBOX_TOKEN);
  const displayedMapLabel = selectedMapLabel ?? {
    name: activeArea.name,
    level: activeArea.level,
  };
  const displayHeading = getOverviewHeading(displayedMapLabel.level);
  const displayHeroLabel =
    displayedMapLabel.level === "country"
      ? activeArea.heroLabel
      : `${formatAreaLevel(displayedMapLabel.level)} focus`;
  const layerCountLabel =
    drillContext.level === "country"
      ? "Regions"
      : drillContext.level === "region"
        ? "Provinces"
        : "Municipalities";
  const layerCountValue =
    layerFeatureCount ??
    (drillContext.level === "country"
      ? PH_REGION_COUNT
      : drillContext.level === "region"
        ? activeArea.metrics.provinces
        : activeArea.metrics.municipalities);
  const statisticsTabs: Array<{ key: StatisticsTabKey; label: string }> = [
    { key: "overview", label: "Overview" },
    { key: "registeredPrograms", label: "Registered Programs" },
    { key: "trainingInstitutions", label: "Training Institutions" },
    { key: "statistics", label: "Statistics" },
  ];
  const primaryStatistic =
    activeStatisticsTab === "registeredPrograms"
      ? { label: "Registered Programs", value: activeArea.metrics.registeredPrograms }
      : activeStatisticsTab === "trainingInstitutions"
        ? { label: "Training Institutions", value: activeArea.metrics.institutions }
        : activeStatisticsTab === "statistics"
          ? { label: layerCountLabel, value: layerCountValue }
        : { label: layerCountLabel, value: layerCountValue };
  const visibleSecondaryCards =
    activeStatisticsTab === "overview" || activeStatisticsTab === "statistics"
      ? drillContext.level === "country"
        ? [
            { label: "Provinces", value: activeArea.metrics.provinces },
            { label: "Districts", value: 253 },
            { label: "Cities", value: activeArea.metrics.cities },
            { label: "Municipalities", value: activeArea.metrics.municipalities },
          ]
        : drillContext.level === "region"
          ? [
              { label: "Cities", value: activeArea.metrics.cities },
              { label: "Municipalities", value: activeArea.metrics.municipalities },
            ]
          : []
      : [
          { label: "TVET Graduates", value: activeArea.metrics.tvetGraduates },
          { label: "Enrolled Scholars", value: activeArea.metrics.enrolledScholars },
          { label: "Enrolled Non-scholars", value: activeArea.metrics.enrolledNonScholars },
        ];
  const statisticsSlideCount = 2;
  const handleStatisticsSwipeStart = (clientX: number) => {
    statisticsSwipeStartXRef.current = clientX;
    statisticsSwipeDeltaXRef.current = 0;
  };
  const handleStatisticsSwipeMove = (clientX: number) => {
    if (statisticsSwipeStartXRef.current === null) return;
    statisticsSwipeDeltaXRef.current = clientX - statisticsSwipeStartXRef.current;
  };
  const handleStatisticsSwipeEnd = () => {
    const deltaX = statisticsSwipeDeltaXRef.current;
    if (Math.abs(deltaX) > 48) {
      const direction = deltaX < 0 ? 1 : -1;
      setStatisticsSlideIndex((current) =>
        Math.max(0, Math.min(statisticsSlideCount - 1, current + direction)),
      );
    }
    statisticsSwipeStartXRef.current = null;
    statisticsSwipeDeltaXRef.current = 0;
  };

  return (
    <section className="relative h-[100dvh] overflow-hidden bg-[#edf5ff]">
      <div ref={mapContainerRef} className="absolute inset-0" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.98)_0%,rgba(255,255,255,0.92)_18%,rgba(255,255,255,0.76)_32%,rgba(239,247,255,0.32)_55%,rgba(239,247,255,0.08)_100%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_30%,rgba(255,255,255,0.74),transparent_28%)]" />

      <div
        className="pointer-events-auto absolute left-3 top-[clamp(74px,8.5vh,96px)] z-40 h-[calc(100dvh-clamp(104px,11vh,132px))] pr-2 pb-2 sm:left-5 lg:left-8"
        style={{ width: "45vw", minWidth: "320px", maxWidth: "45vw" }}
      >
          <div className="pointer-events-auto flex h-full min-h-0 flex-col rounded-[2rem] px-1.5 py-1.5">
            <h1
              className="mt-3 max-w-[700px] font-display uppercase text-[var(--tesda-blue)]"
              style={{
                fontSize: "clamp(2.7rem, 5.8vw, 5.6rem)",
                fontWeight: 900,
                lineHeight: 0.88,
                letterSpacing: "-0.07em",
              }}
            >
              {displayHeading}
            </h1>

            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
              <p className="text-[clamp(0.95rem,1.2vw,1.15rem)] font-bold text-slate-700">
                {displayedMapLabel.name}
              </p>
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#879bbd] sm:text-[11px]">
                {displayHeroLabel} | real-time analysis | 2026
              </p>
            </div>

            <div className="pointer-events-auto relative z-30 mt-3 flex flex-wrap gap-2">
              {statisticsTabs.map((tab) => {
                const isActive = activeStatisticsTab === tab.key;
                const isHovered = hoveredStatisticsTab === tab.key;
                const tabStyle = {
                  borderColor: isActive || isHovered ? "#7fa4e6" : "rgba(21,35,60,0.07)",
                  background: isActive
                    ? "linear-gradient(180deg,#eff5ff,#dfeaff)"
                    : isHovered
                      ? "linear-gradient(180deg,#f2f7ff,#e2ecff)"
                      : "rgba(255,255,255,0.96)",
                  color: isActive || isHovered ? "#2f5cbe" : "#92a4c1",
                  boxShadow: isActive
                    ? "0 12px 22px rgba(51,93,185,0.22)"
                    : isHovered
                      ? "0 12px 22px rgba(51,93,185,0.20)"
                      : "0 14px 24px rgba(72,94,146,0.10)",
                  transform: isHovered ? "translateY(-1px)" : "translateY(0)",
                } as const;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveStatisticsTab(tab.key)}
                    onMouseEnter={() => setHoveredStatisticsTab(tab.key)}
                    onMouseLeave={() => setHoveredStatisticsTab(null)}
                    onFocus={() => setHoveredStatisticsTab(tab.key)}
                    onBlur={() => setHoveredStatisticsTab(null)}
                    className="pointer-events-auto relative z-30 rounded-full border px-3 py-2 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7fa4e6] focus-visible:ring-offset-1 sm:px-3.5 sm:py-2.5"
                    style={tabStyle}
                  >
                    <span
                      className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] sm:text-[11px]"
                    >
                      {tab.label}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 space-y-3 pr-1 pb-2">
              {activeStatisticsTab !== "statistics" ? (
                <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-3">
                  <MetricCard label={primaryStatistic.label} value={primaryStatistic.value} emphasis />
                  {visibleSecondaryCards.map((card) => (
                    <MetricCard key={card.label} label={card.label} value={card.value} />
                  ))}
                </div>
              ) : (
                <>
              

                  <div
                    className="overflow-hidden rounded-[1.35rem]"
                    style={{ touchAction: "pan-y" }}
                    onMouseDown={(event) => {
                      if (event.button !== 0) return;
                      handleStatisticsSwipeStart(event.clientX);
                    }}
                    onMouseMove={(event) => {
                      if ((event.buttons & 1) !== 1) return;
                      handleStatisticsSwipeMove(event.clientX);
                    }}
                    onMouseUp={handleStatisticsSwipeEnd}
                    onMouseLeave={handleStatisticsSwipeEnd}
                    onTouchStart={(event) => {
                      if (event.touches.length === 0) return;
                      handleStatisticsSwipeStart(event.touches[0].clientX);
                    }}
                    onTouchMove={(event) => {
                      if (event.touches.length === 0) return;
                      handleStatisticsSwipeMove(event.touches[0].clientX);
                    }}
                    onTouchEnd={handleStatisticsSwipeEnd}
                    onTouchCancel={handleStatisticsSwipeEnd}
                  >
                    <div
                      className="flex transition-transform duration-300 ease-out"
                      style={{
                        transform: `translateX(-${statisticsSlideIndex * 100}%)`,
                      }}
                    >
                      <div className="w-full shrink-0 px-0.5 py-0.5">
                        <SectorSplitCard
                          rows={programCharts.sectors}
                          enabled={chartsReady}
                        />
                      </div>

                      <div className="w-full shrink-0 px-0.5 py-0.5">
                        <div style={{ width: "min(520px, 100%)" }}>
                          <BarChartCard
                            title="Programs by Selected Area"
                            rows={programCharts.areas}
                            enabled={chartsReady}
                            areaLabel={
                              activeArea.level === "country"
                                ? "Region"
                                : activeArea.level === "region"
                                  ? "Province"
                                  : "Municipality"
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                </>
              )}

              {activeStatisticsTab !== "statistics" ? (
                <div className="mx-auto mt-3 w-[480px] max-w-full rounded-[1.35rem] bg-[linear-gradient(180deg,#3159d3,#2248b2)] px-4 py-3.5 text-white shadow-[0_20px_46px_rgba(35,73,180,0.2)]">
                  <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-white/74 sm:text-sm">
                    Potential clients
                  </p>
                  <p className="mt-1.5 text-[clamp(2.2rem,3.3vw,3.2rem)] font-extrabold leading-none tracking-[-0.08em]">
                    35,327,005
                  </p>
                </div>
              ) : null}
            </div>
          </div>
      </div>

      <div className="pointer-events-none absolute bottom-4 right-4 z-30 sm:bottom-5 sm:right-6 lg:bottom-6 lg:right-8">
        <div className="pointer-events-auto flex items-center gap-2">
          <img src={tesdaLogo.src} alt="TESDA logo" style={{ height: 50, width: "auto", maxWidth: 250 }} />
          <img src={tesdaLingapLogo.src} alt="TESDA Lingap logo" style={{ height: 50, width: "auto", maxWidth: 250 }} />
          <img src={bagongPilipinasLogo.src} alt="Bagong Pilipinas logo" style={{ height: 50, width: "auto", maxWidth: 250 }} />
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
    <article className="group relative overflow-hidden rounded-[1.25rem] border border-[rgba(21,35,60,0.06)] bg-white/96 px-3.5 py-3.5 shadow-[0_14px_24px_rgba(72,94,146,0.1)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#b8caea] hover:shadow-[0_20px_30px_rgba(57,87,152,0.16)]">
      <span className="pointer-events-none absolute inset-0 -translate-x-[120%] bg-[linear-gradient(110deg,rgba(255,255,255,0)_15%,rgba(255,255,255,0.58)_48%,rgba(255,255,255,0)_82%)] opacity-0 transition-all duration-500 group-hover:translate-x-[120%] group-hover:opacity-100" />
      <p className="relative z-10 font-mono text-xs font-bold uppercase tracking-[0.16em] text-[#92a4c1] sm:text-sm">
        {label}
      </p>
      <p
        className={`relative z-10 mt-2.5 font-extrabold leading-none tracking-[-0.06em] text-[#22324d] ${
          emphasis ? "text-[2.2rem]" : "text-[2rem]"
        }`}
      >
        {new Intl.NumberFormat("en-PH").format(value)}
      </p>
    </article>
  );
}

function SectorSplitCard({
  rows,
  enabled,
}: {
  rows: Array<{ sector: string; totalPrograms: number }>;
  enabled: boolean;
}) {
  const palette = ["#2f6ee5", "#4a85ed", "#62a0f5", "#76b6f7", "#4d8fd8", "#86a8ef", "#6b8fd0"];
  const topRows = rows.slice(0, 7);
  const chartData = topRows.map((row) => ({
    name: row.sector,
    value: row.totalPrograms,
  }));
  return (
    <article className="w-[520px] max-w-full overflow-hidden rounded-[1.25rem] border border-[rgba(21,35,60,0.06)] bg-white/96 shadow-[0_14px_24px_rgba(72,94,146,0.1)]">
      <div className="grid min-h-[320px] grid-cols-[220px_1fr]">
        <section className="border-r border-[rgba(21,35,60,0.06)] px-3 py-3">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-[#92a4c1]">
            Programs by Sector
          </p>
          <div className="mt-2 flex items-center justify-center">
            <div className="relative h-48 w-48">
              {enabled ? (
                <PieChart width={192} height={192}>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={88}
                    paddingAngle={1}
                    stroke="rgba(255,255,255,0.9)"
                    strokeWidth={2}
                  >
                    {chartData.map((item, index) => (
                      <Cell key={`${item.name}-${index}`} fill={palette[index % palette.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) =>
                      new Intl.NumberFormat("en-PH").format(Number(value))
                    }
                  />
                </PieChart>
              ) : (
                <div className="h-48 w-48 rounded-full border border-[#d9e5fb] bg-[#f4f8ff]" />
              )}
            </div>
          </div>
        </section>

        <section className="px-4 py-3">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-[#92a4c1]">
            Sector Breakdown
          </p>
          <div className="mt-2 space-y-0.5">
            {topRows.length > 0 ? (
              topRows.map((row, index) => (
                <div
                  key={row.sector}
                  className="flex items-center justify-between gap-3 border-b border-[rgba(21,35,60,0.05)] py-1.5 last:border-b-0"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                      style={{ background: palette[index % palette.length] }}
                    />
                    <p className="truncate text-sm font-semibold text-[#5c7298]">{row.sector}</p>
                  </div>
                  <p className="text-sm font-extrabold tracking-[-0.02em] text-[#22324d]">
                    {new Intl.NumberFormat("en-PH").format(row.totalPrograms)}
                  </p>
                </div>
              ))
            ) : (
              <p className="py-2 text-xs font-semibold text-[#8da0c0]">No sector data yet.</p>
            )}
          </div>
        </section>
      </div>
    </article>
  );
}

function BarChartCard({
  title,
  rows,
  areaLabel,
  enabled,
}: {
  title: string;
  rows: Array<{ area: string; totalPrograms: number }>;
  areaLabel: string;
  enabled: boolean;
}) {
  const topRows = rows
    .filter((item) => String(item.area ?? "").trim().length > 0)
    .slice(0, 8);
  const chartData = topRows.map((row) => ({
    area: row.area,
    totalPrograms: row.totalPrograms,
  }));
  const chartHeight = Math.max(240, chartData.length * 34);
  const chartWidth = 460;

  return (
    <article className="mt-3 w-full max-w-full overflow-hidden rounded-[1.25rem] border border-[rgba(21,35,60,0.06)] bg-white/96 shadow-[0_14px_24px_rgba(72,94,146,0.1)]">
      <header className="border-b border-[rgba(21,35,60,0.06)] px-4 py-3">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-[#92a4c1]">
          {title}
        </p>
      </header>
      <div className="px-4 py-3">
        {enabled && topRows.length > 0 ? (
          <div className="w-full overflow-x-auto">
            <BarChart
              width={chartWidth}
              height={chartHeight}
              data={chartData}
              layout="vertical"
              margin={{ top: 4, right: 8, left: 8, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5edf9" />
              <XAxis
                type="number"
                tick={{ fill: "#6f86ad", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="area"
                width={120}
                tick={{ fill: "#5c7298", fontSize: 11, fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(value) =>
                  new Intl.NumberFormat("en-PH").format(Number(value))
                }
              />
              <Bar
                dataKey="totalPrograms"
                radius={[0, 6, 6, 0]}
                fill="url(#programBarGradient)"
              />
              <defs>
                <linearGradient id="programBarGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#3f72e0" />
                  <stop offset="100%" stopColor="#2e59c4" />
                </linearGradient>
              </defs>
            </BarChart>
          </div>
        ) : (
          <p className="text-xs font-semibold text-[#8da0c0]">
            {enabled
              ? `No ${areaLabel.toLowerCase()} breakdown data yet.`
              : "Loading chart..."}
          </p>
        )}
      </div>
    </article>
  );
}

type OverviewIcon =
  | "institutions"
  | "programs"
  | "trainers"
  | "assessmentCenters"
  | "competencyAssessors";

function getMetricThemeClasses(theme: MetricTheme) {
  if (theme === "cyan") {
    return {
      activePill: "bg-[#daf6ff] text-[#116579]",
      activeIcon: "bg-white/70 text-[#116579]",
      metricIcon: "bg-[linear-gradient(135deg,#3fc8de,#14738a)]",
      badge: "bg-[#e5fbff] text-[#0f6d82]",
      softBadge: "bg-[#effcff] text-[#3e8092]",
      metricRing: "ring-1 ring-[#d4f6ff]",
      dot: "bg-[#17a6c1]",
    };
  }
  if (theme === "amber") {
    return {
      activePill: "bg-[#fff0cf] text-[#865707]",
      activeIcon: "bg-white/70 text-[#865707]",
      metricIcon: "bg-[linear-gradient(135deg,#f1be52,#b97509)]",
      badge: "bg-[#fff7e4] text-[#93620f]",
      softBadge: "bg-[#fff9ea] text-[#9e762c]",
      metricRing: "ring-1 ring-[#f8e7bd]",
      dot: "bg-[#d69a21]",
    };
  }
  if (theme === "rose") {
    return {
      activePill: "bg-[#ffe1ea] text-[#9d2f59]",
      activeIcon: "bg-white/70 text-[#9d2f59]",
      metricIcon: "bg-[linear-gradient(135deg,#f2759f,#ba3f6c)]",
      badge: "bg-[#fff0f4] text-[#a63c65]",
      softBadge: "bg-[#fff4f7] text-[#af5b7a]",
      metricRing: "ring-1 ring-[#ffd9e5]",
      dot: "bg-[#d94f81]",
    };
  }
  if (theme === "violet") {
    return {
      activePill: "bg-[#efe4ff] text-[#6540a8]",
      activeIcon: "bg-white/70 text-[#6540a8]",
      metricIcon: "bg-[linear-gradient(135deg,#9b7cff,#6441c7)]",
      badge: "bg-[#f4edff] text-[#6947af]",
      softBadge: "bg-[#f7f2ff] text-[#7b60b0]",
      metricRing: "ring-1 ring-[#eadbff]",
      dot: "bg-[#7f5be0]",
    };
  }
  return {
    activePill: "bg-[#dce9ff] text-[#1f56af]",
    activeIcon: "bg-white/70 text-[#1f56af]",
    metricIcon: "bg-[linear-gradient(135deg,#2c63d4,#173f9d)]",
    badge: "bg-[#edf4ff] text-[#3464b3]",
    softBadge: "bg-[#f3f7ff] text-[#5a78b4]",
    metricRing: "ring-1 ring-[#d8e6ff]",
    dot: "bg-[#2c63d4]",
  };
}

function OverviewIconGlyph({ icon }: { icon: OverviewIcon }) {
  if (icon === "institutions") {
    return (
      <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="1.9">
        <path d="M3 9 12 4l9 5-9 5-9-5z" />
        <path d="M5 11v5M9 13v5M13 13v5M17 11v5M4 20h16" />
      </svg>
    );
  }
  if (icon === "programs") {
    return (
      <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="1.9">
        <path d="M5 4h11l3 3v13H5z" />
        <path d="M8 11h8M8 15h8" />
      </svg>
    );
  }
  if (icon === "trainers") {
    return (
      <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="1.9">
        <circle cx="8" cy="8" r="2.5" />
        <circle cx="16" cy="9" r="2.5" />
        <path d="M3.5 18.5c.8-2.6 2.6-4 4.5-4h.2c1.9 0 3.7 1.4 4.5 4M13 18.5c.7-2.2 2.1-3.4 3.8-3.4H17c1.7 0 3.1 1.2 3.8 3.4" />
      </svg>
    );
  }
  if (icon === "assessmentCenters") {
    return (
      <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="1.9">
        <path d="M4 5h16v14H4z" />
        <path d="M8 9h8M8 13h5M8 17h4" />
        <path d="m15 16 2 2 3-4" />
      </svg>
    );
  }
  if (icon === "competencyAssessors") {
    return (
      <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="1.9">
        <path d="M12 3 4 7v6c0 4.5 3.2 7.2 8 8 4.8-.8 8-3.5 8-8V7z" />
        <path d="m9.4 12.5 1.8 1.8 3.6-3.6" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="1.9">
      <path d="M4 20h16" />
    </svg>
  );
}

