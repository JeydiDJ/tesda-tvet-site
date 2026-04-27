export type AreaLevel = "country" | "region" | "province" | "city";

export type ProgramStat = {
  name: string;
  category: string;
  scholars: number;
  nonScholars: number;
  completionRate: number;
};

export type AreaMetrics = {
  provinces: number;
  cities: number;
  municipalities: number;
  institutions: number;
  tvetTrainers?: number;
  assessmentCenters?: number;
  competencyAssessors?: number;
  enrolledScholars: number;
  enrolledNonScholars: number;
  registeredPrograms: number;
  tvetGraduates: number;
};

export type MapView = {
  lng: number;
  lat: number;
  zoom: number;
};

export type StageGeometry = {
  x: number;
  y: number;
  width: number;
  height: number;
  labelX: number;
  labelY: number;
  color: string;
  accent: string;
  points: string;
};

export type AreaNode = {
  id: string;
  code: string;
  name: string;
  level: AreaLevel;
  parentId?: string;
  heroLabel: string;
  summary: string;
  spotlight: string;
  metrics: AreaMetrics;
  programs: ProgramStat[];
  mapView: MapView;
  geometry?: StageGeometry;
  children?: AreaNode[];
};
