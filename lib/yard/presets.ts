import type { YardBlueprint } from "./blueprint";

/**
 * 3 Official starter blueprints for Ember Yard
 */

export const YARD_PRESETS: Record<string, { id: string; name: string; desc: string; blueprint: YardBlueprint }> = {
  cantilever: {
    id: "cantilever",
    name: "基础悬臂",
    desc: "地锚悬臂梁结构，测试重载与落锤韧性",
    blueprint: {
      version: 1,
      savedAt: 1700000000000,
      parts: [
        {
          instanceId: "ground-anchor",
          catalogId: "ground-anchor",
          position: [0, 0.1, 0],
          rotation: [0, 0, 0, 1],
        },
        {
          instanceId: "beam",
          catalogId: "beam",
          position: [0, 1.2, 0],
          // rotated 90 deg around X so port socket faces down to ground-anchor top
          rotation: [0.7071068, 0, 0, 0.7071068],
        },
        {
          instanceId: "plate",
          catalogId: "plate",
          position: [0, 2.24, 0],
          rotation: [0, 0, 0, 1],
        },
        {
          instanceId: "counterweight",
          catalogId: "counterweight",
          position: [0, 2.555, 0],
          rotation: [0, 0, 0, 1],
        },
      ],
      joints: [
        {
          aId: "beam",
          aSocketId: "port",
          bId: "ground-anchor",
          bSocketId: "top",
          anchor: [0, 0.2, 0],
        },
        {
          aId: "plate",
          aSocketId: "bottom",
          bId: "beam",
          bSocketId: "starboard",
          anchor: [0, 2.2, 0],
        },
        {
          aId: "counterweight",
          aSocketId: "base",
          bId: "plate",
          bSocketId: "top",
          anchor: [0, 2.28, 0],
        },
      ],
    },
  },
  rover: {
    id: "rover",
    name: "工业小车",
    desc: "底盘平台与推进喷口，测试水平推力与滑行",
    blueprint: {
      version: 1,
      savedAt: 1700000000000,
      parts: [
        {
          instanceId: "chassis",
          catalogId: "chassis",
          position: [0, 0.6, 0],
          rotation: [0, 0, 0, 1],
        },
        {
          instanceId: "plate",
          catalogId: "plate",
          position: [0, 0.99, 0],
          rotation: [0, 0, 0, 1],
        },
        {
          instanceId: "nozzle",
          catalogId: "nozzle",
          position: [0, 0.6, 0.65],
          // nozzle pointed backward along Z
          rotation: [0.7071068, 0, 0, 0.7071068],
        },
        {
          instanceId: "counterweight",
          catalogId: "counterweight",
          position: [0, 1.305, 0],
          rotation: [0, 0, 0, 1],
        },
      ],
      joints: [
        {
          aId: "plate",
          aSocketId: "bottom",
          bId: "chassis",
          bSocketId: "top",
          anchor: [0, 0.95, 0],
        },
        {
          aId: "nozzle",
          aSocketId: "top",
          bId: "chassis",
          bSocketId: "front",
          anchor: [0, 0.6, 0.4],
        },
        {
          aId: "counterweight",
          aSocketId: "base",
          bId: "plate",
          bSocketId: "top",
          anchor: [0, 1.03, 0],
        },
      ],
    },
  },
  spinner: {
    id: "spinner",
    name: "疯狂转轮",
    desc: "地锚轴承与偏心喷口，点火产生极高速旋转",
    blueprint: {
      version: 1,
      savedAt: 1700000000000,
      parts: [
        {
          instanceId: "ground-anchor",
          catalogId: "ground-anchor",
          position: [0, 0.1, 0],
          rotation: [0, 0, 0, 1],
        },
        {
          instanceId: "hinge",
          catalogId: "hinge",
          position: [0, 0.41, 0],
          // rotated around Z so port socket connects to ground-anchor top
          rotation: [0, 0, 0.7071068, 0.7071068],
        },
        {
          instanceId: "beam",
          catalogId: "beam",
          position: [0, 0.62, 1.0],
          rotation: [0, 0, 0, 1],
        },
        {
          instanceId: "nozzle",
          catalogId: "nozzle",
          position: [0, 0.62, 2.25],
          // nozzle at beam starboard socket
          rotation: [0, 0.7071068, 0, 0.7071068],
        },
      ],
      joints: [
        {
          aId: "hinge",
          aSocketId: "port",
          bId: "ground-anchor",
          bSocketId: "top",
          anchor: [0, 0.2, 0],
        },
        {
          aId: "beam",
          aSocketId: "port",
          bId: "hinge",
          bSocketId: "starboard",
          anchor: [0, 0.62, 0],
        },
        {
          aId: "nozzle",
          aSocketId: "base",
          bId: "beam",
          bSocketId: "starboard",
          anchor: [0, 0.62, 2.0],
        },
      ],
    },
  },
};
