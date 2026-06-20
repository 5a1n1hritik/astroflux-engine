"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { createPlanetMaterial, createAtmosphereMaterial } from "./PlanetShaderMaterial";

interface PlanetGlViewportProps {
  temperature: number;
  radius: number;
  color: string;
  atmoColor: string;
  planetSeed: number;
  planetMass: number;
}

export default function PlanetGlViewport({ temperature, radius, color, atmoColor, planetSeed, planetMass }: PlanetGlViewportProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const planetMatRef = useRef<THREE.ShaderMaterial | null>(null);
  const atmoMatRef = useRef<THREE.ShaderMaterial | null>(null);

  useEffect(() => {
    if (planetMatRef.current) {
      planetMatRef.current.uniforms.uEqTemperature.value = temperature;
      planetMatRef.current.uniforms.uPlanetRadius.value = radius;
      planetMatRef.current.uniforms.uBaseColor.value.set(color);
      planetMatRef.current.uniforms.uPlanetSeed.value = planetSeed;
      planetMatRef.current.uniforms.uPlanetSeed.value = planetMass;
    }
    if (atmoMatRef.current) {
      atmoMatRef.current.uniforms.uAtmosphereColor.value.set(atmoColor);
    }
  }, [temperature, radius, color, atmoColor, planetSeed]);

  useEffect(() => {
    if (!mountRef.current) return;

    const container = mountRef.current;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#020409");

    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.z = 3.5;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // 1. Core Planet Sphere
    const sphereRadius = 1.0;
    const planetGeo = new THREE.SphereGeometry(sphereRadius, 64, 64);
    const planetMat = createPlanetMaterial(temperature, radius, color, planetSeed, planetMass);
    const planetMesh = new THREE.Mesh(planetGeo, planetMat);
    scene.add(planetMesh);
    planetMatRef.current = planetMat;

    // 2. Translucent Rayleigh Scattering Atmospheric Halo Wrapper
    const atmoGeo = new THREE.SphereGeometry(sphereRadius * 1.12, 64, 64);
    const atmoMat = createAtmosphereMaterial(atmoColor);
    const atmoMesh = new THREE.Mesh(atmoGeo, atmoMat);
    scene.add(atmoMesh);
    atmoMatRef.current = atmoMat;

    const startTime = performance.now();
    let rafId: number;

    const animate = () => {
      rafId = requestAnimationFrame(animate);
      const elapsed = (performance.now() - startTime) / 1000;

      if (planetMatRef.current) planetMatRef.current.uniforms.uTime.value = elapsed;

      // Axial self-rotation metrics
      planetMesh.rotation.y = elapsed * 0.15;
      planetMesh.rotation.x = 0.1; // Slight physical axial tilt

      renderer.render(scene, camera);
    };
    animate();

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
      planetGeo.dispose();
      planetMat.dispose();
      atmoGeo.dispose();
      atmoMat.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} className="w-full h-full min-h-[450px]" />;
}