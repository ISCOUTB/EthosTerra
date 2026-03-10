"use client";
import MapSimulator from "@/components/simulation/Simulation";
import { LoadingScreen } from "@/components/loadingScreen/loadingScreen";
import { use } from "react";
export default function Index() {
  const handleLoadComplete = () => {
    // handle loading complete logic here if needed
  };
  return (
    <LoadingScreen onLoadComplete={handleLoadComplete}>
      <main className="overflow-hidden">
        <MapSimulator />
      </main>
    </LoadingScreen>
  );
}