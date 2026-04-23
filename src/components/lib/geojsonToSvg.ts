type GeoJsonGeometry =
  | {
      type: "Polygon";
      coordinates: number[][][];
    }
  | {
      type: "MultiPolygon";
      coordinates: number[][][][];
    };

type GeoJsonFeature = {
  geometry: GeoJsonGeometry;
};

type GeoJsonFeatureCollection = {
  type: "FeatureCollection";
  features: GeoJsonFeature[];
};

type Point = {
  x: number;
  y: number;
};

type Bounds = {
  minLon: number;
  maxLon: number;
  minLat: number;
  maxLat: number;
};

function collectRings(geometry: GeoJsonGeometry): number[][][] {
  if (geometry.type === "Polygon") {
    return geometry.coordinates;
  }

  return geometry.coordinates.flat();
}

function getBounds(collection: GeoJsonFeatureCollection): Bounds {
  let minLon = Infinity;
  let maxLon = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;

  collection.features.forEach((feature) => {
    collectRings(feature.geometry).forEach((ring) => {
      ring.forEach(([lon, lat]) => {
        minLon = Math.min(minLon, lon);
        maxLon = Math.max(maxLon, lon);
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
      });
    });
  });

  return { minLon, maxLon, minLat, maxLat };
}

function projectPoint(
  lon: number,
  lat: number,
  bounds: Bounds,
  width: number,
  height: number,
  padding: number,
): Point {
  const dataWidth = bounds.maxLon - bounds.minLon || 1;
  const dataHeight = bounds.maxLat - bounds.minLat || 1;

  const scale = Math.min(
    (width - padding * 2) / dataWidth,
    (height - padding * 2) / dataHeight,
  );

  const projectedWidth = dataWidth * scale;
  const projectedHeight = dataHeight * scale;
  const offsetX = (width - projectedWidth) / 2;
  const offsetY = (height - projectedHeight) / 2;

  return {
    x: offsetX + (lon - bounds.minLon) * scale,
    y: offsetY + (bounds.maxLat - lat) * scale,
  };
}

export function geoJsonToSvgPaths(
  collection: GeoJsonFeatureCollection,
  width: number,
  height: number,
  padding = 24,
) {
  const bounds = getBounds(collection);

  return collection.features.map((feature) => {
    const path = collectRings(feature.geometry)
      .map((ring) => {
        return ring
          .map(([lon, lat], index) => {
            const point = projectPoint(lon, lat, bounds, width, height, padding);
            return `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
          })
          .join(" ")
          .concat(" Z");
      })
      .join(" ");

    return path;
  });
}
