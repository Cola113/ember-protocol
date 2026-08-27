export const YARD = {
  width: 40,
  depth: 30,
  height: 16,
} as const;

export type PartShape = "cuboid" | "cylinder";

export type YardPartDef = {
  id: string;
  label: string;
  shape: PartShape;
  /** cuboid: [w, h, d]; cylinder: [radius, height, 0] */
  size: [number, number, number];
  color: string;
  spawn: [number, number, number];
  density: number;
  restitution: number;
  /** Rotate cylinder collider/mesh so a hinge pin lies on X. */
  cylinderAlongX?: boolean;
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
    cylinderAlongX: true,
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
  },
];

export const DROP_CUBE: YardPartDef = {
  id: "drop-cube",
  label: "落锤试块",
  shape: "cuboid",
  size: [0.7, 0.7, 0.7],
  color: "#e0f2fe",
  spawn: [0, 7.2, 0],
  density: 3,
  restitution: 0.62,
};

export const ALL_YARD_PARTS: YardPartDef[] = [...RACK_PARTS, DROP_CUBE];
