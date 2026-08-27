export const YARD = {
  width: 40,
  depth: 30,
  height: 16,
} as const;

export type PartShape = "cuboid" | "cylinder";
export type YardPartShape = PartShape;

export type YardMaterialId =
  | "pin-alloy"
  | "light-alloy"
  | "sheet-steel"
  | "structural-steel"
  | "cast-iron"
  | "ceramic"
  | "bedrock";

export type YardSocket = {
  id: string;
  point: [number, number, number];
  normal: [number, number, number];
};

export type YardPartDef = {
  id: string;
  /** Stable catalog id; id remains the placed instance id. */
  catalogId?: string;
  label: string;
  shape: PartShape;
  /** cuboid: [w, h, d]; cylinder: [radius, height, 0] */
  size: [number, number, number];
  color: string;
  spawn: [number, number, number];
  density: number;
  restitution: number;
  material: YardMaterialId;
  /** Optional authored override; otherwise material × sizeFactor. */
  breakImpulse?: number;
  /** Rotate cylinder collider/mesh so a hinge pin lies on X. */
  cylinderAlongX?: boolean;
  sockets: YardSocket[];
};

/**
 * Six graybox stock parts on the port rack, plus one airborne drop mass
 * so Simulate immediately shows a bounce without a grab.
 */
export const RACK_PARTS: YardPartDef[] = [
  {
    id: "beam",
    label: "2m 梁",
    shape: "cuboid",
    size: [0.2, 0.2, 2],
    color: "#7dd3fc",
    spawn: [-17.2, 1.4, -6],
    density: 1.2,
    restitution: 0.22,
    material: "light-alloy",
    sockets: [
      { id: "port", point: [0, 0, -1], normal: [0, 0, -1] },
      { id: "starboard", point: [0, 0, 1], normal: [0, 0, 1] },
    ],
  },
  {
    id: "plate",
    label: "1×1 板",
    shape: "cuboid",
    size: [1, 0.08, 1],
    color: "#fbbf24",
    spawn: [-17.2, 1.34, -3.4],
    density: 1,
    restitution: 0.18,
    material: "sheet-steel",
    sockets: [
      { id: "left", point: [-0.5, 0, 0], normal: [-1, 0, 0] },
      { id: "right", point: [0.5, 0, 0], normal: [1, 0, 0] },
      { id: "top", point: [0, 0.04, 0], normal: [0, 1, 0] },
      { id: "bottom", point: [0, -0.04, 0], normal: [0, -1, 0] },
    ],
  },
  {
    id: "chassis",
    label: "底盘块",
    shape: "cuboid",
    size: [1.2, 0.35, 0.8],
    color: "#34d399",
    spawn: [-17.2, 1.48, -0.8],
    density: 1.4,
    restitution: 0.16,
    material: "structural-steel",
    sockets: [
      { id: "front", point: [0, 0, 0.4], normal: [0, 0, 1] },
      { id: "top", point: [0, 0.35, 0], normal: [0, 1, 0] },
      { id: "base", point: [0, -0.35, 0], normal: [0, -1, 0] },
    ],
  },
  {
    id: "counterweight",
    label: "配重立方",
    shape: "cuboid",
    size: [0.55, 0.55, 0.55],
    color: "#fb7185",
    spawn: [-17.2, 1.58, 1.6],
    density: 8,
    restitution: 0.12,
    material: "cast-iron",
    sockets: [
      { id: "top", point: [0, 0.275, 0], normal: [0, 1, 0] },
      { id: "base", point: [0, -0.275, 0], normal: [0, -1, 0] },
    ],
  },
  {
    id: "hinge",
    label: "铰链",
    shape: "cylinder",
    size: [0.08, 0.42, 0],
    color: "#c084fc",
    spawn: [-17.2, 1.5, 3.6],
    density: 2.2,
    restitution: 0.2,
    material: "pin-alloy",
    cylinderAlongX: true,
    sockets: [
      { id: "port", point: [-0.21, 0, 0], normal: [-1, 0, 0] },
      { id: "starboard", point: [0.21, 0, 0], normal: [1, 0, 0] },
    ],
  },
  {
    id: "nozzle",
    label: "喷口",
    shape: "cylinder",
    size: [0.16, 0.5, 0],
    color: "#fb923c",
    spawn: [-17.2, 1.54, 5.4],
    density: 1.6,
    restitution: 0.2,
    material: "ceramic",
    sockets: [
      { id: "top", point: [0, 0.25, 0], normal: [0, 1, 0] },
      { id: "base", point: [0, -0.25, 0], normal: [0, -1, 0] },
    ],
  },
];

const PLATE = RACK_PARTS.find((part) => part.id === "plate")!;
const CONSTRUCTION_PLATES: YardPartDef[] = [
  { ...PLATE, id: "plate-2", catalogId: "plate", spawn: [-17.2, 1.34, -10.2] },
  { ...PLATE, id: "plate-3", catalogId: "plate", spawn: [-17.2, 1.34, -12.4] },
];

export const GROUND_ANCHOR: YardPartDef = {
  id: "ground-anchor",
  catalogId: "ground-anchor",
  label: "地锚",
  shape: "cuboid",
  size: [1.8, 0.2, 1.8],
  color: "#22d3ee",
  spawn: [0, 0.1, 0],
  density: 1,
  restitution: 0.1,
  material: "bedrock",
  sockets: [{ id: "top", point: [0, 0.1, 0], normal: [0, 1, 0] }],
};

export const DROP_CUBE: YardPartDef = {
  id: "drop-cube",
  label: "落锤试块",
  shape: "cuboid",
  size: [0.7, 0.7, 0.7],
  color: "#e0f2fe",
  spawn: [0, 7.2, 0],
  density: 5,
  restitution: 0.62,
  material: "cast-iron",
  sockets: [
    { id: "top", point: [0, 0.35, 0], normal: [0, 1, 0] },
    { id: "base", point: [0, -0.35, 0], normal: [0, -1, 0] },
  ],
};

export const ALL_YARD_PARTS: YardPartDef[] = [...RACK_PARTS, ...CONSTRUCTION_PLATES, DROP_CUBE];

/** Repeating crate used by the D5 150-body chain-bomb layout. Not on the rack. */
export const STRESS_CRATE_TEMPLATE: Omit<YardPartDef, "id" | "spawn"> = {
  catalogId: "stress-crate",
  label: "压测块",
  shape: "cuboid",
  size: [0.48, 0.48, 0.48],
  color: "#94a3b8",
  density: 2.4,
  restitution: 0.08,
  material: "cast-iron",
  breakImpulse: 8,
  sockets: [
    { id: "top", point: [0, 0.24, 0], normal: [0, 1, 0] },
    { id: "base", point: [0, -0.24, 0], normal: [0, -1, 0] },
  ],
};

/**
 * Salvage nozzle sitting on the crashed ship outside the dock door.
 * Grabable special part — weld it onto a player construct.
 */
export const SALVAGE_THRUSTER: YardPartDef = {
  id: "salvage-thruster",
  catalogId: "salvage-thruster",
  label: "坠船主推",
  shape: "cylinder",
  size: [0.42, 1.6, 0],
  color: "#fb923c",
  spawn: [-3.4, 1.48, 68],
  density: 1.8,
  restitution: 0.16,
  material: "ceramic",
  sockets: [
    { id: "top", point: [0, 0.8, 0], normal: [0, 1, 0] },
    { id: "base", point: [0, -0.8, 0], normal: [0, -1, 0] },
  ],
};

export const YARD_CATALOG_BY_ID: Record<string, YardPartDef> = Object.fromEntries(
  [...RACK_PARTS, GROUND_ANCHOR, DROP_CUBE, SALVAGE_THRUSTER].map((part) => [part.catalogId ?? part.id, part])
);
