import { AreaNode } from "@/modules/shared/types/data";

export const tesdaAtlas: AreaNode = {
  id: "ph",
  code: "PH",
  name: "Philippines",
  level: "country",
  mapView: {
    lng: 122.2,
    lat: 12.4,
    zoom: 4.6,
  },
  heroLabel: "National TESDA view",
  summary:
    "A concept dashboard for exploring TESDA activity from national level down to region, province, and city.",
  spotlight:
    "Placeholder metrics are structured to mirror the tables you can later serve from Supabase after importing Google Sheets.",
  metrics: {
    provinces: 82,
    cities: 149,
    municipalities: 1488,
    institutions: 489,
    enrolledScholars: 182340,
    enrolledNonScholars: 241880,
    registeredPrograms: 921,
    tvetGraduates: 158420,
  },
  programs: [
    {
      name: "Shielded Metal Arc Welding NC II",
      category: "Construction",
      scholars: 14520,
      nonScholars: 12080,
      completionRate: 88,
    },
    {
      name: "Bread and Pastry Production NC II",
      category: "Tourism",
      scholars: 11800,
      nonScholars: 17340,
      completionRate: 91,
    },
    {
      name: "Computer Systems Servicing NC II",
      category: "ICT",
      scholars: 12710,
      nonScholars: 22550,
      completionRate: 86,
    },
  ],
  children: [
    {
      id: "region-3",
      code: "R03",
      name: "Central Luzon",
      level: "region",
      parentId: "ph",
      mapView: {
        lng: 120.82,
        lat: 15.28,
        zoom: 7.25,
      },
      heroLabel: "Region III",
      summary:
        "Strong industrial and logistics base with high TVET demand across manufacturing, ICT, and hospitality.",
      spotlight:
        "Use this node later to bind region-level GeoJSON and filtered Supabase aggregations.",
      metrics: {
        provinces: 7,
        cities: 14,
        municipalities: 116,
        institutions: 78,
        enrolledScholars: 31840,
        enrolledNonScholars: 45520,
        registeredPrograms: 161,
        tvetGraduates: 28110,
      },
      geometry: {
        x: 90,
        y: 52,
        width: 210,
        height: 155,
        labelX: 195,
        labelY: 126,
        color: "#005f73",
        accent: "#94d2bd",
        points: "92,98 156,52 257,60 300,106 272,184 187,206 120,177 90,130",
      },
      programs: [
        {
          name: "Mechatronics Servicing NC II",
          category: "Manufacturing",
          scholars: 2440,
          nonScholars: 5310,
          completionRate: 87,
        },
        {
          name: "Visual Graphics Design NC III",
          category: "Creative ICT",
          scholars: 1300,
          nonScholars: 4090,
          completionRate: 93,
        },
        {
          name: "Food and Beverage Services NC II",
          category: "Hospitality",
          scholars: 1880,
          nonScholars: 3220,
          completionRate: 90,
        },
      ],
      children: [
        {
          id: "pampanga",
          code: "PAM",
          name: "Pampanga",
          level: "province",
          parentId: "region-3",
          mapView: {
            lng: 120.72,
            lat: 15.06,
            zoom: 9.1,
          },
          heroLabel: "Central Luzon province focus",
          summary:
            "A high-density training area anchored by Clark, San Fernando, and major hospitality and IT-business activity.",
          spotlight:
            "Province-level cards can later resolve from a `province_metrics` table and a province GeoJSON collection.",
          metrics: {
            provinces: 0,
            cities: 3,
            municipalities: 19,
            institutions: 21,
            enrolledScholars: 9150,
            enrolledNonScholars: 14200,
            registeredPrograms: 58,
            tvetGraduates: 7820,
          },
          geometry: {
            x: 78,
            y: 58,
            width: 100,
            height: 84,
            labelX: 128,
            labelY: 103,
            color: "#ca6702",
            accent: "#ee9b00",
            points: "80,79 111,58 165,64 178,96 156,138 106,142 78,118",
          },
          programs: [
            {
              name: "Barista NC II",
              category: "Hospitality",
              scholars: 520,
              nonScholars: 1160,
              completionRate: 92,
            },
            {
              name: "Computer Systems Servicing NC II",
              category: "ICT",
              scholars: 930,
              nonScholars: 2120,
              completionRate: 88,
            },
            {
              name: "Automotive Servicing NC I",
              category: "Transport",
              scholars: 640,
              nonScholars: 1510,
              completionRate: 84,
            },
          ],
          children: [
            {
              id: "city-san-fernando",
              code: "CSFP",
              name: "City of San Fernando",
              level: "city",
              parentId: "pampanga",
              mapView: {
                lng: 120.6846,
                lat: 15.0286,
                zoom: 11.3,
              },
              heroLabel: "Provincial capital node",
              summary:
                "Government, business, and service sector center with balanced TESDA enrollment across ICT and tourism tracks.",
              spotlight:
                "City-level records can later be bound to a `city_program_enrollments` table keyed by PSGC code.",
              metrics: {
                provinces: 0,
                cities: 0,
                municipalities: 0,
                institutions: 8,
                enrolledScholars: 3110,
                enrolledNonScholars: 4480,
                registeredPrograms: 21,
                tvetGraduates: 2580,
              },
              geometry: {
                x: 86,
                y: 66,
                width: 26,
                height: 26,
                labelX: 120,
                labelY: 78,
                color: "#bb3e03",
                accent: "#e9d8a6",
                points: "86,80 96,66 112,67 118,80 109,92 92,91",
              },
              programs: [
                {
                  name: "Events Management Services NC III",
                  category: "Tourism",
                  scholars: 210,
                  nonScholars: 380,
                  completionRate: 94,
                },
                {
                  name: "Bookkeeping NC III",
                  category: "Business",
                  scholars: 190,
                  nonScholars: 420,
                  completionRate: 89,
                },
              ],
            },
            {
              id: "city-angeles",
              code: "ANGE",
              name: "Angeles City",
              level: "city",
              parentId: "pampanga",
              mapView: {
                lng: 120.596,
                lat: 15.145,
                zoom: 11.3,
              },
              heroLabel: "Clark growth corridor",
              summary:
                "Tourism, aviation-support, and creative service demand make this one of the region's most dynamic city nodes.",
              spotlight:
                "Ideal future use case for filtering institutions, scholarship types, and program demand trends over time.",
              metrics: {
                provinces: 0,
                cities: 0,
                municipalities: 0,
                institutions: 7,
                enrolledScholars: 2840,
                enrolledNonScholars: 5190,
                registeredPrograms: 24,
                tvetGraduates: 2410,
              },
              geometry: {
                x: 122,
                y: 88,
                width: 30,
                height: 30,
                labelX: 160,
                labelY: 103,
                color: "#9b2226",
                accent: "#fefae0",
                points: "122,101 132,88 149,90 152,106 141,118 127,114",
              },
              programs: [
                {
                  name: "Front Office Services NC II",
                  category: "Hospitality",
                  scholars: 270,
                  nonScholars: 560,
                  completionRate: 91,
                },
                {
                  name: "2D Animation NC III",
                  category: "Creative ICT",
                  scholars: 165,
                  nonScholars: 345,
                  completionRate: 87,
                },
              ],
            },
            {
              id: "mabalacat",
              code: "MABA",
              name: "Mabalacat City",
              level: "city",
              parentId: "pampanga",
              mapView: {
                lng: 120.5711,
                lat: 15.223,
                zoom: 11,
              },
              heroLabel: "Airport and logistics edge",
              summary:
                "A logistics-heavy city profile with technical programs aligned to mobility, warehousing, and electrical work.",
              spotlight:
                "Another strong candidate for later map overlays tied to real city boundary geometry.",
              metrics: {
                provinces: 0,
                cities: 0,
                municipalities: 0,
                institutions: 6,
                enrolledScholars: 2010,
                enrolledNonScholars: 3180,
                registeredPrograms: 13,
                tvetGraduates: 1680,
              },
              geometry: {
                x: 108,
                y: 118,
                width: 26,
                height: 26,
                labelX: 142,
                labelY: 132,
                color: "#ae2012",
                accent: "#fdf0d5",
                points: "108,129 118,118 131,121 134,136 122,144 109,140",
              },
              programs: [
                {
                  name: "Electrical Installation and Maintenance NC II",
                  category: "Utilities",
                  scholars: 240,
                  nonScholars: 390,
                  completionRate: 86,
                },
                {
                  name: "Warehousing Services NC II",
                  category: "Logistics",
                  scholars: 140,
                  nonScholars: 330,
                  completionRate: 90,
                },
              ],
            },
          ],
        },
        {
          id: "bulacan",
          code: "BUL",
          name: "Bulacan",
          level: "province",
          parentId: "region-3",
          mapView: {
            lng: 120.87,
            lat: 14.93,
            zoom: 8.9,
          },
          heroLabel: "Manufacturing corridor",
          summary:
            "Large commuter and industrial province with strong construction and production-related skills demand.",
          spotlight:
            "Good fit for later province comparisons and rankable scorecards against other Region III provinces.",
          metrics: {
            provinces: 0,
            cities: 3,
            municipalities: 21,
            institutions: 19,
            enrolledScholars: 8040,
            enrolledNonScholars: 12380,
            registeredPrograms: 45,
            tvetGraduates: 6890,
          },
          geometry: {
            x: 176,
            y: 78,
            width: 104,
            height: 82,
            labelX: 227,
            labelY: 119,
            color: "#0a9396",
            accent: "#e9d8a6",
            points: "176,92 212,78 264,88 280,120 246,160 191,154 182,128",
          },
          programs: [
            {
              name: "Machining NC I",
              category: "Manufacturing",
              scholars: 480,
              nonScholars: 930,
              completionRate: 84,
            },
            {
              name: "Tile Setting NC II",
              category: "Construction",
              scholars: 390,
              nonScholars: 880,
              completionRate: 86,
            },
          ],
        },
      ],
    },
    {
      id: "ncr",
      code: "NCR",
      name: "National Capital Region",
      level: "region",
      parentId: "ph",
      mapView: {
        lng: 121.02,
        lat: 14.58,
        zoom: 9.2,
      },
      heroLabel: "Metro Manila",
      summary:
        "Dense urban training demand centered on digital, office, customer service, and service economy programs.",
      spotlight:
        "NCR offers a useful future case for high-volume institution and city aggregation dashboards.",
      metrics: {
        provinces: 0,
        cities: 16,
        municipalities: 1,
        institutions: 91,
        enrolledScholars: 26520,
        enrolledNonScholars: 39210,
        registeredPrograms: 204,
        tvetGraduates: 24150,
      },
      geometry: {
        x: 315,
        y: 84,
        width: 100,
        height: 88,
        labelX: 364,
        labelY: 130,
        color: "#bb3e03",
        accent: "#fefae0",
        points: "316,106 344,84 390,92 415,126 384,172 334,164 315,132",
      },
      programs: [
        {
          name: "Contact Center Services NC II",
          category: "BPM",
          scholars: 1620,
          nonScholars: 6940,
          completionRate: 90,
        },
        {
          name: "Bookkeeping NC III",
          category: "Business",
          scholars: 1050,
          nonScholars: 4880,
          completionRate: 88,
        },
      ],
    },
    {
      id: "region-7",
      code: "R07",
      name: "Central Visayas",
      level: "region",
      parentId: "ph",
      mapView: {
        lng: 123.9,
        lat: 10.34,
        zoom: 7.1,
      },
      heroLabel: "Region VII",
      summary:
        "Tourism and maritime-influenced regional training demand with strong city-led delivery in Cebu and nearby growth centers.",
      spotlight:
        "Use this region later to validate island-group navigation and non-contiguous geographies in the map experience.",
      metrics: {
        provinces: 4,
        cities: 16,
        municipalities: 116,
        institutions: 73,
        enrolledScholars: 24410,
        enrolledNonScholars: 36100,
        registeredPrograms: 147,
        tvetGraduates: 21940,
      },
      geometry: {
        x: 455,
        y: 188,
        width: 170,
        height: 176,
        labelX: 535,
        labelY: 278,
        color: "#0a9396",
        accent: "#ee9b00",
        points: "476,190 525,202 548,234 587,218 624,246 611,318 552,360 485,346 455,288 462,230",
      },
      programs: [
        {
          name: "Housekeeping NC II",
          category: "Tourism",
          scholars: 1340,
          nonScholars: 4290,
          completionRate: 92,
        },
        {
          name: "Ship's Catering NC III",
          category: "Maritime",
          scholars: 880,
          nonScholars: 1540,
          completionRate: 85,
        },
      ],
    },
  ],
};

export function flattenAreas(root: AreaNode): AreaNode[] {
  return [root, ...(root.children ?? []).flatMap(flattenAreas)];
}

export function buildAreaIndex(root: AreaNode): Map<string, AreaNode> {
  return new Map(flattenAreas(root).map((node) => [node.id, node]));
}

export function getAreaPath(root: AreaNode, activeId: string): AreaNode[] {
  const index = buildAreaIndex(root);
  const path: AreaNode[] = [];
  let current = index.get(activeId);

  while (current) {
    path.unshift(current);
    current = current.parentId ? index.get(current.parentId) : undefined;
  }

  return path;
}
