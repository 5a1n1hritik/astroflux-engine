"use client";

import { useEffect, useState, useRef } from "react";
import { ExoplanetFlow } from "@/app/exoplanets/page";

interface Props {
  flow: ExoplanetFlow;
  onFreezeComplete: () => void;
}

export default function IceEffect({ flow, onFreezeComplete }: Props) {
  const [progress, setProgress] = useState(0);
  const [dots, setDots] = useState<
    { id: number; size: number; x: number; y: number; opacity: number }[]
  >([]);
  const crackCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (flow !== "idle") return;
    const DURATION = 5000;
    const start = performance.now();
    let rafId: number;

    const tick = (now: number) => {
      const p = Math.min((now - start) / DURATION, 1);
      setProgress(p);
      if (p < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        // p === 1 — freeze complete, loop stops, no more rAF
        onFreezeComplete();
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [flow]);

  const shatter = flow === "warping";

  // Frost dots — edge weighted
  useEffect(() => {
    setDots(
      Array.from({ length: 80 }, (_, i) => ({
        id: i,
        size: 0.8 + Math.random() * 3,
        x: Math.random() * 100,
        y: Math.random() * 100,
        opacity: 0.3 + Math.random() * 0.7,
      })),
    );
  }, []);

  useEffect(() => {
    const canvas = crackCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = (canvas.width = window.innerWidth);
    const H = (canvas.height = window.innerHeight);

    // Crack segments — sparse, edge-weighted
    type Crack = {
      points: { x: number; y: number }[];
      opacity: number;
      width: number;
    };

    function makeCrack(
      startX: number,
      startY: number,
      angle: number,
      length: number,
    ): Crack {
      const points: { x: number; y: number }[] = [{ x: startX, y: startY }];
      let x = startX,
        y = startY,
        a = angle;
      const steps = Math.floor(4 + Math.random() * 6);
      const stepLen = length / steps;

      for (let i = 0; i < steps; i++) {
        a += (Math.random() - 0.5) * 0.6;
        x += Math.cos(a) * stepLen;
        y += Math.sin(a) * stepLen;
        points.push({ x, y });

        // Branch — 30% chance
        if (Math.random() < 0.3) {
          const ba = a + (Math.random() - 0.5) * 1.2;
          const bl = stepLen * (0.4 + Math.random() * 0.5);
          const bx = x + Math.cos(ba) * bl;
          const by = y + Math.sin(ba) * bl;
          points.push({ x, y }); // back to branch point
          points.push({ x: bx, y: by });
          points.push({ x, y }); // back again
        }
      }
      return {
        points,
        opacity: 0.3 + Math.random() * 0.5,
        width: 0.4 + Math.random() * 0.8,
      };
    }

    const cracks: Crack[] = [];

    // Edge cracks — corners + edges
    const edgePoints = [
      // Corners
      { x: 0, y: 0, a: Math.PI * 0.25 },
      { x: W, y: 0, a: Math.PI * 0.75 },
      { x: 0, y: H, a: -Math.PI * 0.25 },
      { x: W, y: H, a: -Math.PI * 0.75 },
      // Edge midpoints
      { x: W * 0.25, y: 0, a: Math.PI * 0.5 },
      { x: W * 0.75, y: 0, a: Math.PI * 0.5 },
      { x: 0, y: H * 0.3, a: 0 },
      { x: W, y: H * 0.3, a: Math.PI },
      { x: 0, y: H * 0.7, a: 0 },
      { x: W, y: H * 0.7, a: Math.PI },
      { x: W * 0.2, y: H, a: -Math.PI * 0.5 },
      { x: W * 0.8, y: H, a: -Math.PI * 0.5 },
    ];

    edgePoints.forEach(({ x, y, a }) => {
      const len = 80 + Math.random() * 180;
      // Angle toward center with variation
      const toCenterA = Math.atan2(H / 2 - y, W / 2 - x);
      const finalA = toCenterA + (Math.random() - 0.5) * 0.8;
      cracks.push(makeCrack(x, y, finalA, len));
    });

    // Mid-screen sparse cracks
    for (let i = 0; i < 8; i++) {
      const x = W * (0.1 + Math.random() * 0.8);
      const y = H * (0.1 + Math.random() * 0.8);
      // Only if far enough from center
      const dx = x - W / 2,
        dy = y - H / 2;
      if (Math.sqrt(dx * dx + dy * dy) < Math.min(W, H) * 0.25) continue;
      cracks.push(
        makeCrack(x, y, Math.random() * Math.PI * 2, 60 + Math.random() * 100),
      );
    }

    // Draw all cracks
    ctx.clearRect(0, 0, W, H);

    cracks.forEach((crack) => {
      if (crack.points.length < 2) return;

      // Glow pass
      ctx.beginPath();
      ctx.moveTo(crack.points[0].x, crack.points[0].y);
      crack.points.forEach((p) => ctx.lineTo(p.x, p.y));
      ctx.strokeStyle = `rgba(200, 230, 255, ${crack.opacity * 0.3})`;
      ctx.lineWidth = crack.width * 4;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();

      // Sharp crack
      ctx.beginPath();
      ctx.moveTo(crack.points[0].x, crack.points[0].y);
      crack.points.forEach((p) => ctx.lineTo(p.x, p.y));
      ctx.strokeStyle = `rgba(220, 242, 255, ${crack.opacity * 0.85})`;
      ctx.lineWidth = crack.width;
      ctx.stroke();
    });
  }, []);

  return (
    <div className="absolute inset-0 z-10 pointer-events-none">
      {/* Layer 1 — Breath fog expanding from center outward */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: shatter ? 0 : 1,
          transition: shatter ? "opacity 0.8s ease-in" : "none",
          backdropFilter: `blur(${progress * 14}px) brightness(${1 + progress * 0.15}) saturate(${1 - progress * 0.5})`,
          WebkitBackdropFilter: `blur(${progress * 14}px) brightness(${1 + progress * 0.15}) saturate(${1 - progress * 0.5})`,
          // Mask — clear at center, frosted at edges, grows outward
          maskImage: `radial-gradient(
            ellipse ${55 - progress * 30}% ${55 - progress * 30}% at 50% 50%,
            transparent 0%,
            transparent ${40 - progress * 25}%,
            rgba(0,0,0,${0.3 + progress * 0.4}) ${55 - progress * 20}%,
            rgba(0,0,0,${0.6 + progress * 0.4}) ${70 - progress * 10}%,
            black 100%
          )`,
          WebkitMaskImage: `radial-gradient(
            ellipse ${55 - progress * 30}% ${55 - progress * 30}% at 50% 50%,
            transparent 0%,
            transparent ${40 - progress * 25}%,
            rgba(0,0,0,${0.3 + progress * 0.4}) ${55 - progress * 20}%,
            rgba(0,0,0,${0.6 + progress * 0.4}) ${70 - progress * 10}%,
            black 100%
          )`,
        }}
      />

      {/* Layer 2 — White frost glow — breath condensation color */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: shatter ? 0 : progress * 0.6,
          transition: shatter ? "opacity 0.8s ease-in" : "none",
          background: `radial-gradient(
            ellipse at 50% 50%,
            rgba(255,255,255,0) ${35 - progress * 20}%,
            rgba(220,235,255,${progress * 0.12}) ${55 - progress * 10}%,
            rgba(210,228,255,${progress * 0.3}) 75%,
            rgba(200,220,255,${progress * 0.55}) 100%
          )`,
        }}
      />

      {/* Layer 3 — Frost crystals forming at edges */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: shatter ? 0 : progress * 0.85,
          transition: shatter ? "opacity 0.8s ease-in" : "none",
          background: `
            radial-gradient(ellipse at 0% 0%, rgba(230,242,255,${progress * 0.7}) 0%, transparent 45%),
            radial-gradient(ellipse at 100% 0%, rgba(230,242,255,${progress * 0.7}) 0%, transparent 45%),
            radial-gradient(ellipse at 0% 100%, rgba(230,242,255,${progress * 0.7}) 0%, transparent 45%),
            radial-gradient(ellipse at 100% 100%, rgba(230,242,255,${progress * 0.7}) 0%, transparent 45%)
          `,
        }}
      />

      {/* Layer 4 — Frost sparkle dots at edges */}
      {dots.map((dot) => {
        const dx = Math.abs(dot.x - 50) / 50;
        const dy = Math.abs(dot.y - 50) / 50;
        const edgeFactor = Math.pow(Math.max(dx, dy), 1.5);
        const visible = progress > (1 - edgeFactor) * 0.8;
        return (
          <div
            key={dot.id}
            style={{
              position: "absolute",
              left: `${dot.x}%`,
              top: `${dot.y}%`,
              width: dot.size,
              height: dot.size,
              borderRadius: "50%",
              background: "rgba(230, 245, 255, 0.95)",
              boxShadow: `0 0 ${dot.size * 3}px rgba(200,230,255,0.8)`,
              opacity: shatter
                ? 0
                : visible
                  ? progress * edgeFactor * dot.opacity
                  : 0,
              transition: shatter ? "opacity 0.6s" : "opacity 0.3s",
            }}
          />
        );
      })}

      {/* Layer 5 — Shatter flash */}
      {shatter && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(220,240,255,0.15)",
            animation: "shatterFlash 0.3s ease-out forwards",
          }}
        />
      )}

      {/* Layer 6 — Shattered glass cracks */}
      <canvas
        ref={crackCanvasRef}
        className="absolute inset-0 pointer-events-none"
        style={{
          opacity: shatter ? 0 : Math.max(0, (progress - 0.3) * 1.4),
          transition: shatter ? "opacity 0.8s" : "none",
          mixBlendMode: "screen",
        }}
      />

      <style>{`
        @keyframes shatterFlash {
          0%   { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
