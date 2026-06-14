"use client";

import { useEffect, useRef } from "react";
import { ExoplanetFlow } from "@/app/exoplanets/page";

interface Props {
  flow: ExoplanetFlow;
  onComplete: () => void;
}

export default function WarpTransition({ flow, onComplete }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number | null>(null);
  const phaseRef = useRef<"idle" | "shatter" | "warp" | "exit">("idle");
  const progressRef = useRef(0);

  useEffect(() => {
    if (flow !== "warping") return;
    phaseRef.current = "shatter";
    progressRef.current = 0;

    const canvas = canvasRef.current;
    if (!canvas) return;

    function get2DContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        throw new Error("Canvas 2D context unavailable");
      }

      return ctx;
    }

    const ctx = get2DContext(canvas);
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const W = canvas.width;
    const H = canvas.height;
    const CX = W / 2;
    const CY = H / 2;

    // ── Warp stars ──
    type Star = {
      x: number;
      y: number;
      z: number;
      pz: number;
      speed: number;
    };

    const STAR_COUNT = 800;
    const stars: Star[] = Array.from({ length: STAR_COUNT }, () => ({
      x: (Math.random() - 0.5) * W * 2,
      y: (Math.random() - 0.5) * H * 2,
      z: Math.random() * W,
      pz: 0,
      speed: 0,
    }));

    stars.forEach((s) => (s.pz = s.z));

    // ── Hyperspace exit particles ──
    type Particle = {
      x: number;
      y: number;
      vx: number;
      vy: number;
      life: number;
      maxLife: number;
      size: number;
    };
    const particles: Particle[] = [];

    function spawnParticles() {
      for (let i = 0; i < 120; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 6;
        particles.push({
          x: CX,
          y: CY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          maxLife: 0.6 + Math.random() * 0.4,
          size: 1 + Math.random() * 3,
        });
      }
    }

    // ── Shatter hole ──
    function drawShatter(p: number) {
      ctx.clearRect(0, 0, W, H);

      // Dark overlay
      ctx.fillStyle = `rgba(2,4,9,${p * 0.6})`;
      ctx.fillRect(0, 0, W, H);

      // Growing hole at center
      const holeR = Math.max(W, H) * p * 0.6;

      // White flash ring at hole edge
      const ring = ctx.createRadialGradient(
        CX,
        CY,
        holeR * 0.85,
        CX,
        CY,
        holeR,
      );
      ring.addColorStop(0, `rgba(220,240,255,${(1 - p) * 0.8})`);
      ring.addColorStop(1, "rgba(220,240,255,0)");
      ctx.fillStyle = ring;
      ctx.beginPath();
      ctx.arc(CX, CY, holeR, 0, Math.PI * 2);
      ctx.fill();

      // Clip hole — punches through to video
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      ctx.arc(CX, CY, holeR * 0.88, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0,0,0,1)";
      ctx.fill();
      ctx.restore();
    }

    // ── Warp speed stars ──
    function drawWarp(p: number) {
      ctx.fillStyle = "rgba(2,4,9,0.25)";
      ctx.fillRect(0, 0, W, H);

      const warpSpeed = 8 + p * 60;

      stars.forEach((star) => {
        star.pz = star.z;
        star.z -= warpSpeed;

        if (star.z <= 0) {
          star.x = (Math.random() - 0.5) * W * 2;
          star.y = (Math.random() - 0.5) * H * 2;
          star.z = W;
          star.pz = star.z;
        }

        const sx = (star.x / star.z) * W + CX;
        const sy = (star.y / star.z) * H + CY;
        const px = (star.x / star.pz) * W + CX;
        const py = (star.y / star.pz) * H + CY;

        const size = Math.max(0.1, (1 - star.z / W) * 3);
        const brightness = Math.min(255, (1 - star.z / W) * 255);

        // Star streak
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(sx, sy);
        ctx.strokeStyle = `rgba(${brightness},${Math.floor(brightness * 0.9)},255,${0.4 + p * 0.6})`;
        ctx.lineWidth = size;
        ctx.stroke();
      });

      // Center white flash — warp entrance
      if (p < 0.3) {
        const flash = ctx.createRadialGradient(
          CX,
          CY,
          0,
          CX,
          CY,
          200 * (1 - p / 0.3),
        );
        flash.addColorStop(0, `rgba(255,255,255,${((0.3 - p) / 0.3) * 0.9})`);
        flash.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = flash;
        ctx.fillRect(0, 0, W, H);
      }
    }

    // ── Hyperspace exit ──
    function drawExit(p: number) {
      ctx.fillStyle = `rgba(2,4,9,${0.05 + p * 0.3})`;
      ctx.fillRect(0, 0, W, H);

      // Slow down stars
      const warpSpeed = Math.max(0.5, 68 * (1 - p));
      stars.forEach((star) => {
        star.pz = star.z;
        star.z -= warpSpeed;
        if (star.z <= 0) {
          star.x = (Math.random() - 0.5) * W * 2;
          star.y = (Math.random() - 0.5) * H * 2;
          star.z = W;
          star.pz = star.z;
        }
        const sx = (star.x / star.z) * W + CX;
        const sy = (star.y / star.z) * H + CY;
        const px = (star.x / star.pz) * W + CX;
        const py = (star.y / star.pz) * H + CY;
        const size = Math.max(0.1, (1 - star.z / W) * 2.5);
        const brightness = Math.min(255, (1 - star.z / W) * 255);
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(sx, sy);
        ctx.strokeStyle = `rgba(${brightness},${Math.floor(brightness * 0.9)},255,${0.3 + (1 - p) * 0.5})`;
        ctx.lineWidth = size;
        ctx.stroke();
      });

      // Particles burst
      if (p === 0) spawnParticles();
      particles.forEach((part) => {
        part.x += part.vx;
        part.y += part.vy;
        part.vx *= 0.96;
        part.vy *= 0.96;
        part.life -= 0.02;

        if (part.life <= 0) return;
        ctx.beginPath();
        ctx.arc(part.x, part.y, part.size * part.life, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(180,220,255,${part.life * 0.8})`;
        ctx.fill();
      });

      // Camera sweep vignette — rotating feel
      const angle = p * Math.PI * 0.5;
      const vignette = ctx.createRadialGradient(
        CX + Math.cos(angle) * 100,
        CY + Math.sin(angle) * 80,
        0,
        CX,
        CY,
        Math.max(W, H) * 0.8,
      );
      vignette.addColorStop(0, "rgba(2,4,9,0)");
      vignette.addColorStop(1, `rgba(2,4,9,${p * 0.7})`);
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, W, H);
    }

    // ── Main animation loop ──
    const SHATTER_MS = 1200;
    const WARP_MS = 2800;
    const EXIT_MS = 1800;

    let startTime: number | null = null;
    let phase: "shatter" | "warp" | "exit" = "shatter";
    let exitParticlesSpawned = false;

    function animate(ts: number) {
      if (!startTime) startTime = ts;
      const elapsed = ts - startTime;

      if (phase === "shatter") {
        const p = Math.min(elapsed / SHATTER_MS, 1);
        drawShatter(p);
        if (p >= 1) {
          phase = "warp";
          startTime = ts;
        }
      } else if (phase === "warp") {
        const p = Math.min(elapsed / WARP_MS, 1);
        drawWarp(p);
        if (p >= 1) {
          phase = "exit";
          startTime = ts;
        }
      } else if (phase === "exit") {
        const p = Math.min(elapsed / EXIT_MS, 1);
        if (!exitParticlesSpawned) {
          spawnParticles();
          exitParticlesSpawned = true;
        }
        drawExit(p);
        if (p >= 1) {
          onComplete();
          return;
        }
      }

      animRef.current = requestAnimationFrame(animate);
    }

    animRef.current = requestAnimationFrame(animate);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [flow]);

  if (flow !== "warping") return null;

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-30"
      style={{ width: "100%", height: "100%" }}
    />
  );
}
