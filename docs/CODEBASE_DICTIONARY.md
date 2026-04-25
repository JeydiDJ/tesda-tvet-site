# TESDA Dashboard Codebase Dictionary

This is a dictionary for easier navigation when debugging / editing

## Quick Where-To-Edit Guide

- Change global page shell / app wrapper: `src/components/navigation/AppShell.tsx`
- Bring back or redesign sidebar: `src/components/navigation/AppSidebar.tsx` (currently not mounted)
- Change global theme colors/background/fonts: `src/app/globals.css` and `src/app/layout.tsx`
- Change landing page content/composition: `src/components/dashboard/TesdaDashboard.tsx`
- Change interactive Mapbox behavior and drilldown logic: `src/features/map/components/PhilippinesMapPanel.tsx`
- Change mock dataset (regions/provinces/cities/programs): `src/components/lib/data/mockData.ts`
- Change reusable page header layout for secondary routes: `src/components/pages/PageFrame.tsx`

## Route Dictionary (`src/app`)

- `src/app/layout.tsx`
  - Root layout. Loads fonts, metadata, global CSS, and wraps every route with `AppShell`.
- `src/app/page.tsx`
  - Home route (`/`). Renders `TesdaDashboard`.
- `src/app/locations/page.tsx`
  - Locations route scaffold with placeholder cards/content.
- `src/app/programs/page.tsx`
  - Programs route scaffold with placeholder table/content.
- `src/app/analytics/page.tsx`
  - Analytics route scaffold with placeholder chart cards.
- `src/app/data-pipeline/page.tsx`
  - Data pipeline route scaffold with placeholder stages/checklist.

## Main Feature Dictionary

- `src/components/dashboard/TesdaDashboard.tsx`
  - `TesdaDashboard()`: Main homepage composer. Wires selected area state, map panel, detail cards, program list, and blueprint section.
  - `DetailsPanel()`, `QuickCharts()`, `InsightCard()`, `ChartCard()`: Home-only presentational blocks.

- `src/features/map/components/PhilippinesMapPanel.tsx` (primary map engine)
  - `PhilippinesMapPanel(...)`: Main interactive map UI + drilldown behavior + hero overlay.
  - Key helper blocks:
    - `getMapCameraPadding()`: Responsive map fit padding.
    - `getExpectedChildLevel(...)`, `getExpectedChildLevelByDrillLevel(...)`: Drilldown level transitions.
    - `matchesAreaByFeature(...)`: Matching GeoJSON features to `AreaNode`.
    - `getBoundaryGeoJsonPath(...)`: Chooses which GeoJSON file set to load.
    - `applyMunicipalityColors(...)`: Assigns fill palette for municipality layer.
    - `getOverviewHeading(...)`: Hero heading text based on active level.
    - `createOutsidePhilippinesMask(...)`: Builds outside-mask geometry for focus styling.
    - `normalizeGeoJson(...)`: Runtime guard/normalizer for loaded GeoJSON.
  - If map behavior looks wrong, this is the first file to inspect.

- `src/components/lib/data/mockData.ts`
  - `tesdaAtlas`: Current source-of-truth mock hierarchy for all displayed metrics and nodes.
  - `flattenAreas(root)`: Flattens hierarchy to list.
  - `buildAreaIndex(root)`: Builds `id -> AreaNode` map.
  - `getAreaPath(root, activeId)`: Creates breadcrumb path from root to selected node.

- `src/components/pages/PageFrame.tsx`
  - `PageFrame(...)`: Shared frame wrapper for non-home routes (`eyebrow`, `title`, `description`, content slot).

- `src/components/dashboard/ProgramList.tsx`
  - `ProgramList(...)`: Renders the "Priority training tracks" cards.
  - `MetricBox(...)`: Small metric sub-card used inside each program card.

- `src/components/dashboard/DataBlueprint.tsx`
  - `DataBlueprint()`: Supabase migration teaser section.
  - `BlueprintCard(...)`: Reusable card block for each target table.

## Navigation Dictionary

- `src/components/navigation/AppShell.tsx`
  - `AppShell(...)`: Global shell wrapper.
  - Current state: sidebar removed, only renders children.

- `src/components/navigation/AppSidebar.tsx`
  - Full sidebar UI (icons, nav links, open/close controls), but currently not used because `AppShell` does not render it.

## Legacy / Compatibility Exports

- `src/components/dashboard/PhilippinesMapPanel.tsx`
  - Re-export shim to `src/features/map/components/PhilippinesMapPanel.tsx`.
  - Keep this only if older imports still rely on this path.

- `src/components/dashboard/Breadcrumbs.tsx`
  - Breadcrumb component for area path navigation.
  - Not currently used in active home composition.

- `src/components/dashboard/Header.tsx`
  - Alternate hero/header block.
  - Not currently used in active home composition.

- `src/components/dashboard/GeographyStage.tsx`
  - Older SVG polygon stage component.
  - Not currently used in active map flow.

- `src/components/dashboard/StatsCards.tsx`
  - Card-based metric layout helper.
  - Not currently used in active home composition.

## Empty Placeholder Files (safe to ignore for now)

These files exist but are currently empty (`0` bytes):

- `src/components/constants/index.ts`
- `src/components/types/geo.ts`
- `src/components/services/supabase/client.ts`
- `src/components/services/supabase/queries.ts`
- `src/components/store/useAppStore.ts`
- `src/components/lib/utils.ts`
- `src/components/lib/geo/region.ts`
- `src/components/lib/geo/provinces.ts`
- `src/components/lib/geo/cities.ts`
- `src/features/map/state/mapSlice.ts`
- `src/features/map/state/mapHook.ts`
- `src/features/map/ui/MapContainer.tsx`
- `src/features/map/ui/MapControls.tsx`
- `src/features/map/ui/layers/RegionLayer.tsx`
- `src/features/map/ui/layers/ProvinceLayer.tsx`
- `src/features/map/ui/layers/CityLater.tsx`

## Suggested Workflow For Future Edits

1. Identify route first (`src/app/...`).
2. Follow the route to its composed component (usually in `src/components/dashboard/...` or `src/features/...`).
3. If data-related, check `mockData.ts` or future Supabase files.
4. If style-related across pages, check `globals.css` and shared wrappers (`AppShell`, `PageFrame`).
