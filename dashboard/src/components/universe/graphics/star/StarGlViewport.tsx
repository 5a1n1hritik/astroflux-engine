"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { createStarCoreMaterial, createStarCoronaMaterial, type ShaderPresetOptions } from "./StarShaderMaterial";

interface StarGlViewportProps {
  preset: ShaderPresetOptions;
  starRadius: number;
}

export default function StarGlViewport({ preset, starRadius }: StarGlViewportProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const coreMatRef = useRef<THREE.ShaderMaterial | null>(null);
  const coronaMatRef = useRef<THREE.ShaderMaterial | null>(null);

  useEffect(() => {
    if (coronaMatRef.current) {
      coronaMatRef.current.uniforms.uCoronaColor.value.set(preset.corona);
    }
    if (coreMatRef.current) {
      coreMatRef.current.uniforms.uStarTemperature.value = preset.temperature;
    }
  }, [preset]);

  useEffect(() => {
    if (!mountRef.current) return;

    const container = mountRef.current;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#020409");

    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(0, 0, 4.0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // ── LAYER 1: THE CORE 3D SOLID VECTOR SPHERE ──────────────────────────────
    const sphereRadius = Math.max(0.8, starRadius * 0.85);
    const coreGeometry = new THREE.SphereGeometry(sphereRadius, 64, 64);
    const coreMaterial = createStarCoreMaterial(preset);
    const coreMesh = new THREE.Mesh(coreGeometry, coreMaterial);
    scene.add(coreMesh);
    coreMatRef.current = coreMaterial;

    // ── LAYER 2: THE VOLUMETRIC CORONA GLOW PLANE BILLBOARD ─────────────────────
    // Quad size scales identically to sit as a background radiation backdrop shell layer
    const coronaQuadSize = sphereRadius * 6.5; 
    const coronaGeometry = new THREE.PlaneGeometry(coronaQuadSize, coronaQuadSize);
    const coronaMaterial = createStarCoronaMaterial(preset);
    const coronaMesh = new THREE.Mesh(coronaGeometry, coronaMaterial);
    scene.add(coronaMesh);
    coronaMatRef.current = coronaMaterial;

    const startTime = performance.now();
    let rafId: number;

    const animateLoop = () => {
      rafId = requestAnimationFrame(animateLoop);
      const elapsedSeconds = (performance.now() - startTime) / 10000;

      // Injecting ticks down into both parallel material memory buffers lines
      if (coreMatRef.current) coreMatRef.current.uniforms.uTime.value = elapsedSeconds;
      if (coronaMatRef.current) coronaMatRef.current.uniforms.uTime.value = elapsedSeconds;

      // Animate core sphere axial spin metrics
      coreMesh.rotation.y = elapsedSeconds * 0.05;

      renderer.render(scene, camera);
    };
    animateLoop();

    const handleResize = () => {
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
      coreGeometry.dispose();
      coreMaterial.dispose();
      coronaGeometry.dispose();
      coronaMaterial.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  }, [starRadius]);

  return <div ref={mountRef} className="w-full h-full min-h-[450px] rounded-2xl overflow-hidden border border-white/5" />;
}