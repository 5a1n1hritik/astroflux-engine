"use client";

import { useEffect, useRef } from "react";

interface FluxChartProps {
  timeArray: number[];
  fluxArray: number[];
  currentPhaseAngle: number; // OrbitSimulator se aane wala live rotational reference angle
}

export default function FluxChart({ timeArray, fluxArray, currentPhaseAngle }: FluxChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || timeArray.length === 0 || fluxArray.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear frame initialization bounds
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const width = canvas.height; 
    const height = canvas.width;
    const padding = 45;

    // 1. Data Extents Calculation Matrix (Finding Min and Max)
    const minTime = Math.min(...timeArray);
    const maxTime = Math.max(...timeArray);
    const minFlux = Math.min(...fluxArray);
    const maxFlux = Math.max(...fluxArray);

    // Padding values adjustment to prevent lines cutting off margins
    const fluxRange = maxFlux - minFlux || 1;
    const yMin = minFlux - fluxRange * 0.1;
    const yMax = maxFlux + fluxRange * 0.1;

    // 2. Linear Coordinates Normalization Mapping Helper
    const getCanvasX = (timeValue: number) => {
      return padding + ((timeValue - minTime) / (maxTime - minTime)) * (canvas.width - padding * 2);
    };

    const getCanvasY = (fluxValue: number) => {
      return canvas.height - padding - ((fluxValue - yMin) / (yMax - yMin)) * (canvas.height - padding * 2);
    };

    // 3. Grid Lines & Axis Typography Rendering
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 1;
    
    // Draw Horizontal Threshold Grid Guidelines
    const gridLinesCount = 4;
    for (let i = 0; i <= gridLinesCount; i++) {
      const yVal = yMin + (i * (yMax - yMin)) / gridLinesCount;
      const yPos = getCanvasY(yVal);
      
      ctx.beginPath();
      ctx.moveTo(padding, yPos);
      ctx.lineTo(canvas.width - padding, yPos);
      ctx.stroke();

      // Y-Axis Labels (Normalized Relative Brightness Scales)
      ctx.fillStyle = "#64748b";
      ctx.font = "9px monospace";
      ctx.fillText(yVal.toFixed(4), 5, yPos + 3);
    }

    // 4. PLOTTING THE LIGHT CURVE DATA (Vectorized Path Generation)
    ctx.beginPath();
    ctx.moveTo(getCanvasX(timeArray[0]), getCanvasY(fluxArray[0]));
    
    for (let i = 1; i < timeArray.length; i++) {
      ctx.lineTo(getCanvasX(timeArray[i]), getCanvasY(fluxArray[i]));
    }
    
    ctx.strokeStyle = "#00e676"; // Scientific Neon Green Signature
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 5. LIVE CROSS-SYNC CURSOR TRACKER LAYER
    // Phase Angle Map: 2π bounds normalized to check exact alignment intersection point
    const normalizedPhase = ((currentPhaseAngle + Math.PI) % (2 * Math.PI)) / (2 * Math.PI);
    const targetIndex = Math.floor(normalizedPhase * (timeArray.length - 1));
    
    if (targetIndex >= 0 && targetIndex < timeArray.length) {
      const activeX = getCanvasX(timeArray[targetIndex]);
      const activeY = getCanvasY(fluxArray[targetIndex]);

      // Vertical Scanline Tracker Bar
      ctx.beginPath();
      ctx.moveTo(activeX, padding);
      ctx.lineTo(activeX, canvas.height - padding);
      ctx.strokeStyle = "rgba(0, 168, 255, 0.4)";
      ctx.setLineDash([4, 4]); // Clean data-scan dots
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.setLineDash([]); // Reset line configurations standard bounds

      // Floating Data Nodes Intersection Pinpoint Circle
      ctx.beginPath();
      ctx.arc(activeX, activeY, 4, 0, 2 * Math.PI);
      ctx.fillStyle = "#00a8ff";
      ctx.fill();
    }

    // X-Axis Title Meta Text Info
    ctx.fillStyle = "#64748b";
    ctx.font = "10px monospace";
    ctx.fillText("TIME (BARYCENTRIC JULIAN DATE - BJD)", canvas.width / 2 - 90, canvas.height - 10);

  }, [timeArray, fluxArray, currentPhaseAngle]);

  return (
    <div className="relative border border-slate-800 bg-slate-950 rounded-xl p-4 flex flex-col items-center w-full">
      <span className="text-xs text-slate-500 font-mono absolute top-3 left-4">ANALYTICS: NEURAL_FLUX_MAPPER</span>
      <canvas ref={canvasRef} width={650} height={200} className="w-full max-w-[650px] h-[200px] mt-4" />
    </div>
  );
}