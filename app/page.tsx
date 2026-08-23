"use client";

import React, { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { CANON, PlanetDef, LandingSite, AnchorTruth } from "@/lib/canon";
import HudHeader from "@/components/ui/HudHeader";
import OpeningTerminal from "@/components/ui/OpeningTerminal";
import PlanetSurveyModal from "@/components/ui/PlanetSurveyModal";
import SurfaceStageView from "@/components/ui/SurfaceStageView";
import IndexDrawer from "@/components/ui/IndexDrawer";
import ShipInteriorView from "@/components/ui/ShipInteriorView";
import LandingCinematic from "@/components/ui/LandingCinematic";
import TruthUnlockOverlay from "@/components/ui/TruthUnlockOverlay";

// Dynamically import 3D R3F Galaxy Canvas with SSR disabled
const GalaxyScene = dynamic(() => import("@/components/galaxy/GalaxyScene"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-void text-holo-cyan font-mono text-xs">
      <span className="w-2 h-2 rounded-full bg-holo-cyan holo-pulse mr-2" />
      <span>INITIALIZING 3D EMBER SPUR SHADERS...</span>
    </div>
  ),
});

export default function HomePage() {
  const [currentView, setCurrentView] = useState<
    "opening" | "galaxy" | "ship" | "index" | "survey" | "landing_cinematic" | "surface"
  >("opening");

  const [selectedPlanet, setSelectedPlanet] = useState<PlanetDef | null>(null);
  const [activeSite, setActiveSite] = useState<LandingSite | null>(null);
  const [showInferenceLines, setShowInferenceLines] = useState(true);

  // Player state — starts empty so player explores Helix-7 first, collects propositions, and unlocks T1!
  const [collectedPropositions, setCollectedPropositions] = useState<string[]>([]);
  const [believedTruths, setBelievedTruths] = useState<string[]>([]);
  const [completedHotspotIds, setCompletedHotspotIds] = useState<string[]>([]);

  // Newly unlocked truth for cinematic overlay
  const [unlockedTruthOverlay, setUnlockedTruthOverlay] = useState<AnchorTruth | null>(null);

  // Derive unlocked planets from believed truths' unlocked_planets fields
  const unlockedPlanetIds = useMemo(
    () =>
      CANON.anchorTruths
        .filter((t) => believedTruths.includes(t.id))
        .flatMap((t) => t.unlocked_planets),
    [believedTruths]
  );

  const handleCompleteHotspot = (hotspotId: string) => {
    if (!completedHotspotIds.includes(hotspotId)) {
      setCompletedHotspotIds((prev) => [...prev, hotspotId]);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        e.preventDefault();
        if (currentView === "opening" || currentView === "landing_cinematic") return;
        setCurrentView((prev) => (prev === "index" ? "galaxy" : "index"));
      }
      if (e.key === "Escape") {
        if (currentView === "survey") {
          setSelectedPlanet(null);
          setCurrentView("galaxy");
        } else if (currentView === "index") {
          setCurrentView("galaxy");
        }
      }
      if (e.key === "l" || e.key === "L") {
        if (currentView === "galaxy") {
          setShowInferenceLines((prev) => !prev);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentView]);

  const handleSelectPlanet = (planet: PlanetDef) => {
    setSelectedPlanet(planet);
    setCurrentView("survey");
  };

  const handleInitiateLanding = (planet: PlanetDef, site: LandingSite) => {
    setSelectedPlanet(planet);
    setActiveSite(site);
    setCurrentView("landing_cinematic");
  };

  const handleCollectProp = (code: string, text: string) => {
    if (!collectedPropositions.includes(code)) {
      setCollectedPropositions((prev) => [...prev, code]);
    }
  };

  const handleTruthBelieved = (truthId: string) => {
    const truthObj = CANON.anchorTruths.find((t) => t.id === truthId);
    if (!truthObj) return;

    // Defensive guard: confirm all required propositions are collected before believing
    const hasAllRequired = truthObj.required_propositions.every((p) =>
      collectedPropositions.includes(p)
    );
    if (!hasAllRequired) {
      console.warn(`Truth ${truthId} synthesis rejected: missing required propositions`);
      return;
    }

    if (!believedTruths.includes(truthId)) {
      setBelievedTruths((prev) => [...prev, truthId]);
      setUnlockedTruthOverlay(truthObj);
    }
  };

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-void">
      {/* Persistent 3D Galaxy Canvas */}
      <div
        className={`absolute inset-0 transition-opacity duration-700 ${
          currentView === "galaxy" || currentView === "survey"
            ? "opacity-100 pointer-events-auto"
            : "opacity-25 pointer-events-none"
        }`}
      >
        <GalaxyScene
          onSelectPlanet={handleSelectPlanet}
          selectedPlanet={selectedPlanet}
          showInferenceLines={showInferenceLines}
          unlockedPlanetIds={unlockedPlanetIds}
        />
      </div>

      {/* Top Astral Noir HUD */}
      {currentView !== "opening" && currentView !== "landing_cinematic" && (
        <HudHeader
          currentView={currentView}
          onNavigate={(view) => {
            if (view === "galaxy") setSelectedPlanet(null);
            setCurrentView(view);
          }}
          showInferenceLines={showInferenceLines}
          onToggleInference={() => setShowInferenceLines((prev) => !prev)}
        />
      )}

      {/* View 1: Opening Cinematic Terminal */}
      {currentView === "opening" && (
        <OpeningTerminal onComplete={() => setCurrentView("galaxy")} />
      )}

      {/* View 2: Planet Survey Fly-in Modal */}
      {currentView === "survey" && selectedPlanet && (
        <PlanetSurveyModal
          planet={selectedPlanet}
          onClose={() => {
            setSelectedPlanet(null);
            setCurrentView("galaxy");
          }}
          onLand={handleInitiateLanding}
          collectedPropositions={collectedPropositions}
          completedHotspotIds={completedHotspotIds}
        />
      )}

      {/* View 3: Landing Atmospheric Descent Cinematic */}
      {currentView === "landing_cinematic" && selectedPlanet && activeSite && (
        <LandingCinematic
          planet={selectedPlanet}
          site={activeSite}
          onComplete={() => setCurrentView("surface")}
        />
      )}

      {/* View 4: Surface Landing Stage */}
      {currentView === "surface" && selectedPlanet && activeSite && (
        <SurfaceStageView
          planet={selectedPlanet}
          site={activeSite}
          onReturnOrbit={() => {
            setCurrentView("survey");
          }}
          onCollectProposition={handleCollectProp}
          collectedPropositions={collectedPropositions}
          completedHotspotIds={completedHotspotIds}
          onCompleteHotspot={handleCompleteHotspot}
        />
      )}

      {/* View 5: Ship Deck Interior */}
      {currentView === "ship" && (
        <ShipInteriorView
          onNavigateGalaxy={() => setCurrentView("galaxy")}
          onNavigateIndex={() => setCurrentView("index")}
          believedTruthsCount={believedTruths.length}
        />
      )}

      {/* View 6: Synthesis / Index Drawer */}
      {currentView === "index" && (
        <IndexDrawer
          onClose={() => setCurrentView("galaxy")}
          collectedPropositions={collectedPropositions}
          believedTruths={believedTruths}
          onTruthBelieved={handleTruthBelieved}
        />
      )}

      {/* View 7: Truth Unlock Celebration Cutscene */}
      {unlockedTruthOverlay && (
        <TruthUnlockOverlay
          truth={unlockedTruthOverlay}
          onProceed={() => {
            setUnlockedTruthOverlay(null);
            setCurrentView("galaxy");
            setSelectedPlanet(null);
          }}
        />
      )}
    </main>
  );
}
