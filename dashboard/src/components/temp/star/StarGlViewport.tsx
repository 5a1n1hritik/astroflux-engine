// "use client";

// import { useEffect, useRef } from "react";
// import * as THREE from "three";
// import { createStellarShaderMaterial, type ShaderPresetOptions } from "./StarShaderMaterial";

// interface StarGlViewportProps {
//   preset: ShaderPresetOptions;
//   starRadius: number;
// }

// export default function StarGlViewport({ preset, starRadius }: StarGlViewportProps) {
//   const mountRef = useRef<HTMLDivElement>(null);
//   const matRef = useRef<THREE.ShaderMaterial | null>(null);

//   // Re-initialize shader material parameters instantly when a preset switches hooks
//   useEffect(() => {
//     if (matRef.current) {
//       matRef.current.uniforms.uCoreColor.value.set(preset.core);
//       matRef.current.uniforms.uLimbColor.value.set(preset.limb);
//       matRef.current.uniforms.uCoronaColor.value.set(preset.corona);
//     }
//   }, [preset]);

//   useEffect(() => {
//     if (!mountRef.current) return;

//     const container = mountRef.current;
//     const scene = new THREE.Scene();
//     scene.background = new THREE.Color("#020409"); // Deep space cosmic void background

//     const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
//     camera.position.z = 5;

//     const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
//     renderer.setSize(container.clientWidth, container.clientHeight);
//     renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
//     container.appendChild(renderer.domElement);

//     // Dynamic scale geometry sizing driven straight by static radius state
//     const quadSize = Math.max(2.0, starRadius * 1.5);
//     const geometry = new THREE.PlaneGeometry(quadSize, quadSize);
//     const material = createStellarShaderMaterial(preset);
//     const starMesh = new THREE.Mesh(geometry, material);
//     scene.add(starMesh);
//     matRef.current = material;

//     const clock = new THREE.Clock();
//     let rafId: number;

//     const animateLoop = () => {
//       rafId = requestAnimationFrame(animateLoop);
//       const elapsed = clock.getElapsedTime();

//       // Pushing elapsed runtime seconds down into the GLSL uniform context ticking fields
//       if (matRef.current) {
//         matRef.current.uniforms.uTime.value = elapsed;
//       }

//       renderer.render(scene, camera);
//     };
//     animateLoop();

//     const handleResize = () => {
//       camera.aspect = container.clientWidth / container.clientHeight;
//       camera.updateProjectionMatrix();
//       renderer.setSize(container.clientWidth, container.clientHeight);
//     };
//     window.addEventListener("resize", handleResize);

//     return () => {
//       cancelAnimationFrame(rafId);
//       window.removeEventListener("resize", handleResize);
//       renderer.dispose();
//       geometry.dispose();
//       material.dispose();
//       if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
//     };
//   }, [starRadius]); // Trigger rebuild only if global geometrical scale sizes shift updates

//   return <div ref={mountRef} className="w-full h-full min-h-[450px] rounded-2xl overflow-hidden border border-white/5" />;
// }


// ===============================
// upgrade deep
// ===============================

// "use client";

// import { useEffect, useRef } from "react";
// import * as THREE from "three";
// import { createStellarShaderMaterial, type ShaderPresetOptions } from "./StarShaderMaterial";

// interface StarGlViewportProps {
//   preset: ShaderPresetOptions;
//   starRadius: number;
// }

// export default function StarGlViewport({ preset, starRadius }: StarGlViewportProps) {
//   const mountRef = useRef<HTMLDivElement>(null);
//   const matRef = useRef<THREE.ShaderMaterial | null>(null);

//   useEffect(() => {
//     if (matRef.current) {
//       matRef.current.uniforms.uCoreColor.value.set(preset.core);
//       matRef.current.uniforms.uLimbColor.value.set(preset.limb);
//       matRef.current.uniforms.uCoronaColor.value.set(preset.corona);
//     }
//   }, [preset]);

//   useEffect(() => {
//     if (!mountRef.current) return;

//     const container = mountRef.current;
//     const scene = new THREE.Scene();
//     scene.background = new THREE.Color("#020409");

//     const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
//     camera.position.set(0, 0, 4.5); // Positioned slightly closer for heavy micro detail viewing

//     const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
//     renderer.setSize(container.clientWidth, container.clientHeight);
//     renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
//     container.appendChild(renderer.domElement);

//     // ✅ UPGRADED: Swapped PlaneGeometry with high-density Sphere Geometry to calculate real 3D solar prominences
//     const baseRadius = Math.max(1.0, starRadius * 1.1);
//     const geometry = new THREE.SphereGeometry(baseRadius, 128, 128);
//     const material = createStellarShaderMaterial(preset);
//     const starMesh = new THREE.Mesh(geometry, material);
//     scene.add(starMesh);
//     matRef.current = material;

//     const startTime = performance.now();
//     let rafId: number;

//     const animateLoop = () => {
//       rafId = requestAnimationFrame(animateLoop);
//       const elapsedSeconds = (performance.now() - startTime) / 100;

//       if (matRef.current) {
//         matRef.current.uniforms.uTime.value = elapsedSeconds;
//       }

//       // Micro slow orbital axis rotation for viewport depth perception
//       starMesh.rotation.y = elapsedSeconds * 0.01;

//       renderer.render(scene, camera);
//     };
//     animateLoop();

//     const handleResize = () => {
//       camera.aspect = container.clientWidth / container.clientHeight;
//       camera.updateProjectionMatrix();
//       renderer.setSize(container.clientWidth, container.clientHeight);
//     };
//     window.addEventListener("resize", handleResize);

//     return () => {
//       cancelAnimationFrame(rafId);
//       window.removeEventListener("resize", handleResize);
//       renderer.dispose();
//       geometry.dispose();
//       material.dispose();
//       if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
//     };
//   }, [starRadius]);

//   return <div ref={mountRef} className="w-full h-full min-h-[450px] rounded-2xl overflow-hidden border border-white/5" />;
// }


// ==============
// new upg
// ==============



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
      const elapsedSeconds = (performance.now() - startTime) / 1000;

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