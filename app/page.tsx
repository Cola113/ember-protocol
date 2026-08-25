"use client";

import React, { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { CANON, PlanetDef, LandingSite, AnchorTruth, getDecodedPlanetIds } from "@/lib/canon";
import HudHeader from "@/components/ui/HudHeader";
import OpeningTerminal from "@/components/ui/OpeningTerminal";
import PlanetSurveyModal from "@/components/ui/PlanetSurveyModal";
import SurfaceStageView from "@/components/ui/SurfaceStageView";
import IndexDrawer from "@/components/ui/IndexDrawer";
import ShipInteriorView from "@/components/ui/ShipInteriorView";
import LandingCinematic from "@/components/ui/LandingCinematic";
import TruthUnlockOverlay from "@/components/ui/TruthUnlockOverlay";
import EndingSequence, { EndingType } from "@/components/ui/EndingSequence";
import OnboardingHints from "@/components/ui/OnboardingHints";
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

const TOTAL_CYCLE_SECONDS = 2400; // 40 minutes cycle

export default function HomePage() {
  const [currentView, setCurrentView] = useState<
    "opening" | "galaxy" | "ship" | "index" | "survey" | "landing_cinematic" | "surface" | "ending"
  >("opening");

  const [selectedPlanet, setSelectedPlanet] = useState<PlanetDef | null>(null);
  const [activeSite, setActiveSite] = useState<LandingSite | null>(null);
  const [showInferenceLines, setShowInferenceLines] = useState(true);

  // Player state — starts empty so player explores Helix-7 first, collects propositions, and unlocks T1!
  const [collectedPropositions, setCollectedPropositions] = useState<string[]>([]);
  const [believedTruths, setBelievedTruths] = useState<string[]>([]);
  const [completedHotspotIds, setCompletedHotspotIds] = useState<string[]>([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [emberCycleSecondsLeft, setEmberCycleSecondsLeft] = useState(2382);

  // Newly unlocked truth for cinematic overlay
  const [unlockedTruthOverlay, setUnlockedTruthOverlay] = useState<AnchorTruth | null>(null);
  const [rewriteToast, setRewriteToast] = useState<{ title: string; count: number } | null>(null);
  const [shockwavePlanets, setShockwavePlanets] = useState<string[]>([]);
  const [shockwaveTrigger, setShockwaveTrigger] = useState<number>(0);

  // Derive unlocked planets from believed truths' unlocked_planets fields
  const unlockedPlanetIds = useMemo(
    () =>
      CANON.anchorTruths
        .filter((t) => believedTruths.includes(t.id))
        .flatMap((t) => t.unlocked_planets),
    [believedTruths]
  );

  // Derive decoded planets from believed truths' primary_planet fields
  const decodedPlanetIds = useMemo(
    () =>
      CANON.anchorTruths
        .filter((t) => believedTruths.includes(t.id))
        .map((t) => t.primary_planet),
    [believedTruths]
  );

  // Canonical gating: all 6 truths (T1-T5 + THidden) must be believed to enter resolution protocols
  const canResolveEnding = useMemo(
    () =>
      CANON.anchorTruths.length > 0 &&
      CANON.anchorTruths.every((t) => believedTruths.includes(t.id)),
    [believedTruths]
  );

  // Overwrite threshold: Remaining countdown <= 25% (<= 600 seconds)
  const canOverwrite = (emberCycleSecondsLeft / TOTAL_CYCLE_SECONDS) <= 0.25;

  // Realtime game session timers (Freezes during opening and ending cutscenes)
  useEffect(() => {
    if (currentView === "opening" || currentView === "ending") return;

    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
      setEmberCycleSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [currentView]);

  // Auto-save progress whenever propositions, truths or completed hotspots update
  useEffect(() => {
    if (collectedPropositions.length > 0 || believedTruths.length > 0) {
      saveGame("auto", {
        collectedPropositions,
        believedTruths,
        completedHotspotIds,
        elapsedSeconds,
        playTimeMinutes: Math.floor(elapsedSeconds / 60),
        emberCycleSecondsLeft,
      });
    }
  }, [collectedPropositions, believedTruths, completedHotspotIds, elapsedSeconds, emberCycleSecondsLeft]);

  const handleCompleteHotspot = (hotspotId: string) => {
    if (!completedHotspotIds.includes(hotspotId)) {
      setCompletedHotspotIds((prev) => [...prev, hotspotId]);
    }
  };

  // Explicit Progress-Only Recovery Contract
  const handleLoadSave = (data: SaveSlotData) => {
    setCollectedPropositions(data.collectedPropositions || []);
    setBelievedTruths(data.believedTruths || []);
    setCompletedHotspotIds(data.completedHotspotIds || []);
    setElapsedSeconds(data.elapsedSeconds || (data.playTimeMinutes ? data.playTimeMinutes * 60 : 0));
    setEmberCycleSecondsLeft(data.emberCycleSecondsLeft !== undefined ? data.emberCycleSecondsLeft : 2382);
    setSelectedPlanet(null);
    setActiveSite(null);
    setUnlockedTruthOverlay(null);
    setShockwavePlanets([]);
    setShockwaveTrigger(0);
    setCurrentView("galaxy");
  };

  const handleNewGame = () => {
    setCollectedPropositions([]);
    setBelievedTruths([]);
    setCompletedHotspotIds([]);
    setElapsedSeconds(0);
    setEmberCycleSecondsLeft(2382);
    setSelectedPlanet(null);
    setActiveSite(null);
    setUnlockedTruthOverlay(null);
    setShockwavePlanets([]);
    setShockwaveTrigger(0);
    setCurrentView("opening");
  };

  // Keyboard navigation & Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Allow Escape to dismiss survey or index modals
      if (e.key === "Escape") {
        if (currentView === "survey") {
          setSelectedPlanet(null);
          setCurrentView("galaxy");
        } else if (currentView === "index") {
          setCurrentView("galaxy");
        }
      }

      // 'L' key toggles inference lines on galaxy map
      if (e.key === "l" || e.key === "L") {
        if (currentView === "galaxy") {
          const activeTag = document.activeElement?.tagName;
          if (activeTag !== "INPUT" && activeTag !== "TEXTAREA") {
            setShowInferenceLines((prev) => !prev);
          }
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
    <main
      role="main"
      aria-label="余烬协议探索界面"
      className="relative w-screen h-screen overflow-hidden bg-void"
    >
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
          believedTruthIds={believedTruths}
          shockwavePlanets={shockwavePlanets}
          shockwaveTrigger={shockwaveTrigger}
        />
      </div>

      {/* Top Astral Noir HUD */}
      {currentView !== "opening" &&
        currentView !== "landing_cinematic" &&
        currentView !== "ending" && (
          <HudHeader
            currentView={currentView}
            onNavigate={(view) => {
              if (view === "galaxy") setSelectedPlanet(null);
              if (view === "ending" && !canResolveEnding) return;
              setCurrentView(view);
            }}
            showInferenceLines={showInferenceLines}
            onToggleInference={() => setShowInferenceLines((prev) => !prev)}
            canResolveEnding={canResolveEnding}
            emberCycleSecondsLeft={emberCycleSecondsLeft}
            believedTruthsCount={believedTruths.length}
            totalTruthsCount={CANON.anchorTruths.length}
            collectedPropositions={collectedPropositions}
            believedTruths={believedTruths}
          />
        )}

      {/* Star Chart Rewrite Toast Notification */}
      <AnimatePresence>
        {rewriteToast && currentView === "galaxy" && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="absolute top-28 sm:top-32 right-3 sm:right-8 z-50 pointer-events-none"
          >
            <div className="holo-panel border border-holo-cyan px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-sm shadow-holo-cyan flex items-center gap-2 sm:gap-2.5 bg-surface-dark/95 backdrop-blur-md text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-holo-cyan animate-ping shrink-0" />
              <div>
                <div className="text-holo-cyan font-bold flex items-center gap-1.5 text-[11px] sm:text-xs">
                  <span>⚡ 星图拓扑已改写 // STAR CHART REWRITTEN</span>
                </div>
                <div className="text-holo-bright text-[10px] sm:text-[11px] mt-0.5">
                  【{rewriteToast.title}】计算节点已并联接入总线
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Onboarding Guidance Tooltip Bubbles */}
      <OnboardingHints currentView={currentView} />

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
              isDecoded={decodedPlanetIds.includes(selectedPlanet.id)}
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
              elapsedSeconds={elapsedSeconds}
              emberCycleSecondsLeft={emberCycleSecondsLeft}
            />
          </motion.div>
        )}

        {/* View 8: Ending Sequence (P4 Three Resolution Protocols) */}
        {currentView === "ending" && canResolveEnding && (
          <motion.div
            key="ending-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 z-50"
          >
            <EndingSequence
              onReturnTitle={() => {
                setSelectedPlanet(null);
                setActiveSite(null);
                setCurrentView("opening");
              }}
              onNewGame={handleNewGame}
              collectedPropositions={collectedPropositions}
              believedTruths={believedTruths}
              elapsedSeconds={elapsedSeconds}
              canOverwrite={canOverwrite}
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
            isDecoded={getDecodedPlanetIds(believedTruths).includes(selectedPlanet.id)}
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
            canResolveEnding={canResolveEnding}
            onProceed={() => {
              const shouldGoToEnding = unlockedTruthOverlay.id === "THidden" && canResolveEnding;
              const justUnlockedTruth = unlockedTruthOverlay;
              setUnlockedTruthOverlay(null);
              if (shouldGoToEnding) {
                setCurrentView("ending");
              } else {
                setCurrentView("galaxy");
                setSelectedPlanet(null);
                if (justUnlockedTruth) {
                  const targetPlanets = [
                    justUnlockedTruth.primary_planet,
                    ...justUnlockedTruth.unlocked_planets,
                  ].filter(Boolean) as string[];

                  setShockwavePlanets(targetPlanets);
                  setShockwaveTrigger(Date.now());

                  setRewriteToast({
                    title: justUnlockedTruth.title,
                    count: targetPlanets.length,
                  });
                  setTimeout(() => {
                    setRewriteToast(null);
                  }, 4000);
                }
              }
            }}
          />
        )}
      </AnimatePresence>
    </main>
  );
}
