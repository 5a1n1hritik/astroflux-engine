"use client";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HeroSection from "@/components/home/HeroSection";
import { DiscoveryShowcase } from "@/components/home/DiscoveryShowcase";
import { FeaturedSystems } from "@/components/home/FeaturedSystems";
import { LiveMissionStatus } from "@/components/home/LiveMissionStatus";
import { CapabilitiesSection } from "@/components/home/CapabilitiesSection";
import { ResearchPipeline } from "@/components/home/ResearchPipeline";

export default function HomePage() {
  return (
    <>
      <Navbar />
      <HeroSection title="EXPLORE THE EXOPLANETARY VOID" />
      <DiscoveryShowcase />
      <LiveMissionStatus />
      <FeaturedSystems />
      <CapabilitiesSection />
      <ResearchPipeline />
      <Footer />
    </>
  );
}
