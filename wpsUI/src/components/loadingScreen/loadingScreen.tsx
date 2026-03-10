"use client";
import { useState, useEffect } from "react";

interface LoadingScreenProps {
  onLoadComplete?: () => void;
  children: React.ReactNode;
}

export const LoadingScreen = ({
  onLoadComplete,
  children,
}: LoadingScreenProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Track page load progress
    const increaseProgress = () => {
      setProgress((prevProgress) => {
        // Gradually increase up to 90% before complete load
        if (prevProgress < 90) {
          return Math.min(prevProgress + Math.random() * 10, 90);
        }
        return prevProgress;
      });
    };

    // Start progress animation
    const progressInterval = setInterval(increaseProgress, 200);

    // Wait for window load event (includes images and videos)
    const handleLoad = () => {
      clearInterval(progressInterval);
      setProgress(100);

      // Add a small delay to ensure smooth transition
      setTimeout(() => {
        setIsLoading(false);
        if (onLoadComplete) onLoadComplete();
      }, 500);
    };

    // Check if page is already loaded
    if (document.readyState === "complete") {
      handleLoad();
    } else {
      window.addEventListener("load", handleLoad);
    }

    return () => {
      clearInterval(progressInterval);
      window.removeEventListener("load", handleLoad);
    };
  }, [onLoadComplete]);

  if (!isLoading) return children;

  return (
    <div className="fixed inset-0 bg-[#0D0D0D] z-50 flex flex-col items-center justify-center text-white">
      <div className="mb-8">
        <h1 className="text-5xl md:text-7xl font-clash font-semibold">
          WellProdSimulator
        </h1>
      </div>
      <div className="w-64 md:w-80 h-6 bg-gray-800 overflow-hidden">
        <div
          className="h-full bg-cyan-400 transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="mt-4 text-sm font-archivo">{Math.round(progress)}%</p>
    </div>
  );
};
