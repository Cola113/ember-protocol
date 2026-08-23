"use client";

import React, { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { CANON, PlanetDef, LandingSite, AnchorTruth } from "@/lib/canon";
import HudHeader from "@/components/ui/HudHeader";
import OpeningTerminal from "@/components/ui/OpeningTerminal";
import PlanetSurveyModal from "@/components/ui/PlanetSurveyModal";
import SurfaceStageView from "@/components/ui/SurfaceStageView";
import IndexDrawer from "@/components/ui/IndexDrawer";
import ShipInteriorView from "@/components/ui/ShipInteriorView";
import LandingCinematic from "@/components/ui/LandingCinematic";
import TruthUnlockOverlay from "@/components/ui/TruthUnlockOverlay";
import { SaveSlotData, saveGame } from "@/lib/save-system";

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

  // Auto-save progress whenever propositions, truths or completed hotspots update
  useEffect(() => {
    if (collectedPropositions.length > 0 || believedTruths.length > 0) {
      saveGame("auto", {
        collectedPropositions,
        believedTruths,
        completedHotspotIds,
      });
    }
  }, [collectedPropositions, believedTruths, completedHotspotIds]);

  const handleCompleteHotspot = (hotspotId: string) => {
    if (!completedHotspotIds.includes(hotspotId)) {
      setCompletedHotspotIds((prev) => [...prev, hotspotId]);
    }
  };

  // Explicit Progress-Only Recovery Contract:
  // Restores canonical progress (propositions, truths, completed hotspots)
  // Resets all transient view routing back to galactic overview
  const handleLoadSave = (data: SaveSlotData) => {
    setCollectedPropositions(data.collectedPropositions || []);
    setBelievedTruths(data.believedTruths || []);
    setCompletedHotspotIds(data.completedHotspotIds || []);
    setSelectedPlanet(null);
    setActiveSite(null);
    setUnlockedTruthOverlay(null);
    setCurrentView("galaxy");
  };

  const handleNewGame = () => {
    setCollectedPropositions([]);
    setBelievedTruths([]);
    setCompletedHotspotIds([]);
    setSelectedPlanet(null);
    setActiveSite(null);
    setCurrentView("opening");
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
        className={`absolute inset-0 transition-all duration-700 ${
          currentView === "galaxy" || currentView === "survey"
            ? "opacity-100 scale-100 pointer-events-auto"
            : "opacity-20 scale-105 pointer-events-none filter blur-[1px]"
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

      {/* Main Full-Screen View Transitions */}
      <AnimatePresence mode="wait">
        {/* View 1: Opening Cinematic Terminal */}
        {currentView === "opening" && (
          <motion.div
            key="opening-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 z-40"
          >
            <OpeningTerminal onComplete={() => setCurrentView("galaxy")} />
          </motion.div>
        )}

        {/* View 3: Landing Atmospheric Descent Cinematic */}
        {currentView === "landing_cinematic" && selectedPlanet && activeSite && (
          <motion.div
            key="cinematic-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="absolute inset-0 z-40"
          >
            <LandingCinematic
              planet={selectedPlanet}
              site={activeSite}
              onComplete={() => setCurrentView("surface")}
            />
          </motion.div>
        )}

        {/* View 4: Surface Landing Stage */}
        {currentView === "surface" && selectedPlanet && activeSite && (
          <motion.div
            key="surface-view"
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0 z-30"
          >
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
          </motion.div>
        )}

        {/* View 5: Ship Deck Interior */}
        {currentView === "ship" && (
          <motion.div
            key="ship-view"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0 z-30"
          >
            <ShipInteriorView
              onNavigateGalaxy={() => setCurrentView("galaxy")}
              onNavigateIndex={() => setCurrentView("index")}
              believedTruthsCount={believedTruths.length}
              collectedPropositions={collectedPropositions}
              believedTruths={believedTruths}
              completedHotspotIds={completedHotspotIds}
              onLoadSave={handleLoadSave}
              onNewGame={handleNewGame}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* View 2: Planet Survey Fly-in Modal */}
      <AnimatePresence>
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
      </AnimatePresence>

      {/* View 6: Synthesis / Index Drawer */}
      <AnimatePresence>
        {currentView === "index" && (
          <IndexDrawer
            onClose={() => setCurrentView("galaxy")}
            collectedPropositions={collectedPropositions}
            believedTruths={believedTruths}
            onTruthBelieved={handleTruthBelieved}
          />
        )}
      </AnimatePresence>

      {/* View 7: Truth Unlock Celebration Cutscene */}
      <AnimatePresence>
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
      </AnimatePresence>
    </main>
  );
}

