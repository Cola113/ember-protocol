"use client";

import { useMemo } from "react";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";

export function useYardTextures() {
  const textures = useTexture({
    steelFloorDiffuse: "/yard/pbr/steel_floor_diffuse.png",
    steelFloorRoughness: "/yard/pbr/steel_floor_roughness.png",
    steelFloorNormal: "/yard/pbr/steel_floor_normal.png",
    scratchedDiffuse: "/yard/pbr/scratched_steel_diffuse.png",
    scratchedRoughness: "/yard/pbr/scratched_steel_roughness.png",
    scratchedNormal: "/yard/pbr/scratched_steel_normal.png",
    paintedDiffuse: "/yard/pbr/painted_metal_diffuse.png",
    paintedRoughness: "/yard/pbr/painted_metal_roughness.png",
    paintedNormal: "/yard/pbr/painted_metal_normal.png",
    castIronDiffuse: "/yard/pbr/cast_iron_diffuse.png",
    castIronRoughness: "/yard/pbr/cast_iron_roughness.png",
    castIronNormal: "/yard/pbr/cast_iron_normal.png",
    concreteDiffuse: "/yard/pbr/concrete_diffuse.png",
    concreteRoughness: "/yard/pbr/concrete_roughness.png",
    rubberDiffuse: "/yard/pbr/rubber_diffuse.png",
    rubberRoughness: "/yard/pbr/rubber_roughness.png",
  });

  return useMemo(() => {
    // Configure repeat and color spaces
    const setup = (tex: THREE.Texture, isColor = false, repeatX = 1, repeatY = 1) => {
      const cloned = tex.clone();
      cloned.wrapS = THREE.RepeatWrapping;
      cloned.wrapT = THREE.RepeatWrapping;
      cloned.repeat.set(repeatX, repeatY);
      if (isColor) cloned.colorSpace = THREE.SRGBColorSpace;
      cloned.needsUpdate = true;
      return cloned;
    };

    return {
      floor: {
        map: setup(textures.steelFloorDiffuse, true, 8, 6),
        roughnessMap: setup(textures.steelFloorRoughness, false, 8, 6),
        normalMap: setup(textures.steelFloorNormal, false, 8, 6),
      },
      wall: {
        map: setup(textures.concreteDiffuse, true, 4, 2),
        roughnessMap: setup(textures.concreteRoughness, false, 4, 2),
      },
      scratchedSteel: {
        map: setup(textures.scratchedDiffuse, true, 1, 4),
        roughnessMap: setup(textures.scratchedRoughness, false, 1, 4),
        normalMap: setup(textures.scratchedNormal, false, 1, 4),
      },
      paintedMetal: {
        map: setup(textures.paintedDiffuse, true, 1, 1),
        roughnessMap: setup(textures.paintedRoughness, false, 1, 1),
        normalMap: setup(textures.paintedNormal, false, 1, 1),
      },
      castIron: {
        map: setup(textures.castIronDiffuse, true, 2, 2),
        roughnessMap: setup(textures.castIronRoughness, false, 2, 2),
        normalMap: setup(textures.castIronNormal, false, 2, 2),
      },
      rubber: {
        map: setup(textures.rubberDiffuse, true, 2, 2),
        roughnessMap: setup(textures.rubberRoughness, false, 2, 2),
      },
    };
  }, [textures]);
}
