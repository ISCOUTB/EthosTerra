"use client";
import SimulatorConfigPage from "@/components/settings/settings";
import { LoadingScreen } from "@/components/loadingScreen/loadingScreen";

export default function SettingsPage() {
  const handleLoadComplete = () => {
    // handle loading complete logic here if needed
  };

  return (
    <main className="overflow-hidden">
      <LoadingScreen onLoadComplete={handleLoadComplete}>
        <SimulatorConfigPage />
      </LoadingScreen>
    </main>
  );
}