"use client";

import { useState } from "react";
import VideoBackground from "@/components/exoplanets/VideoBackground";
import IceEffect from "@/components/exoplanets/IceEffect";
import AvatarChat from "@/components/exoplanets/AvatarChat";
import WarpTransition from "@/components/exoplanets/WarpTransition";

export type ExoplanetFlow =
  | "idle" // video chal rahi, ice freeze ho rahi
  | "chat" // avatar visible, questions
  | "warping" // ice shatters, warp start
  | "done"; // /simulate pe redirect

export default function ExoplanetsPage() {
  const [flow, setFlow] = useState<ExoplanetFlow>("idle");
  const [userSelections, setUserSelections] = useState({
    telescope: "",
    system: "",
  });

  return (
    <main className="relative w-full h-[100dvh] overflow-hidden bg-void">
      {/* Layer 1 — Video background */}
      <VideoBackground />

      {/* Layer 2 — Ice effect */}
      <IceEffect flow={flow} onFreezeComplete={() => setFlow("chat")} />

      {/* Layer 3 — Avatar chat */}
      <AvatarChat
        flow={flow}
        onComplete={(sel) => {
          setUserSelections(sel);
          setFlow("warping");
        }}
        onSkip={() => setFlow("warping")}
      />

      {/* Layer 4 — Warp transition */}
      <WarpTransition
        flow={flow}
        onComplete={() => {
          const params = new URLSearchParams();
          if (userSelections.telescope)
            params.set("telescope", userSelections.telescope);
          if (userSelections.system)
            params.set("system", userSelections.system);
          window.location.href = `/simulate?${params.toString()}`;
        }}
      />

      {/* Skip button — hamesha visible */}
      {flow !== "warping" && flow !== "done" && (
        <button
          onClick={() => setFlow("warping")}
          className="fixed top-6 right-6 z-50 font-mono text-white/30 text-[10px] tracking-[0.2em] uppercase hover:text-white/70 transition-colors duration-200"
        >
          SKIP →
        </button>
      )}
    </main>
  );
}
