"use client";

import "@/components/landing/landingStyles.css";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { TextPlugin } from "gsap/TextPlugin";
import { useRouter } from "next/navigation";
gsap.registerPlugin(TextPlugin);

const HeroSection = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const animationsInitialized = useRef(false);
  const router = useRouter();

 
  const initializeAnimations = () => {
    if (animationsInitialized.current) return;
    animationsInitialized.current = true;

    const timeline = gsap.timeline();

    
    gsap.to("#WellProd", {
      text: "WellProdSimulator",
      duration: 1,
    });

    gsap.to("#Escuela", {
      text: "Escuela de Transformacion Digital",
      duration: 1,
    });

    
    [...Array(6)].forEach((_, index) => {
      gsap.to(`#circle-${index}`, {
        x: -50 + index * 20,
        duration: 0.6,
        ease: "back.inOut(1.7)",
      });
    });

    ["W", "P", "S"].forEach((letter, index) => {
      gsap.to(`#letter-${letter}`, {
        y: 0, 
        duration: 0.6 + index * 0.3,
        ease: "front.inOut(1.7)",
      });
    });
  };

  useEffect(() => {
    
    const video = videoRef.current;

    if (video) {
      
      const handleVideoReady = () => {
        initializeAnimations();
      };

      video.addEventListener("canplaythrough", handleVideoReady);

      
      if (video.readyState >= 3) {
        initializeAnimations();
      }

      return () => {
        video.removeEventListener("canplaythrough", handleVideoReady);
      };
    }
  }, []);

  return (
    <header className="relative w-svw h-svh flex overflow-hidden select-none text-white">
      <div className="block z-10 w-full h-full mix-blend-exclusion antialiased text-white">
        <div
          className="absolute flex flex-row items-center text-[25vw] md:text-[20vw] font-clash font-semibold
             top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 overflow-hidden h-[1em] z-20 gap-8"
        >
          {"WPS".split("").map((letter, index) => (
            <p
              id={`letter-${letter}`}
              key={index}
              className="transform translate-y-[100%]"
            >
              {letter}
            </p>
          ))}
        </div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 translate-y-[200px] z-20
        font-clash font-semibold text-2xl md:text-4xl text-center">
          <button
            onClick={() => router.push("/pages/settings")}
            className="px-6 p-2 py-3 bg-black hover:bg-white text-white hover:text-black font-archivo rounded-lg 
                     transition-all duration-300 ease-in-out transform hover:scale-105
                     font-archivo text-lg shadow-lg hover:shadow-xl"
          >
            Start Configuration
          </button>
        </div>
        <div className="absolute bottom-4 md:bottom-6 flex flex-row w-full justify-between items-end px-4 md:px-6">
          <div className="flex flex-col items-center">
            <p
              id="WellProd"
              className="font-clash text-lg max-w-[40vw] md:max-w-[20vw] leading-3"
            />
            <div className="relative w-8 h-8 md:w-16 md:h-16 mb-2">
              {[...Array(6)].map((_, index) => (
                <div
                  key={index}
                  id={`circle-${index}`}
                  className="absolute top-0 left-1/2 transform -translate-x-1/2 w-8 h-8 md:w-16 md:h-16 bg-none border-white border-2 rounded-full"
                />
              ))}
            </div>
          </div>
          <div>
            <div className="flex w-full justify-end items-baseline">
              <img
                src="/images/logo.svg"
                alt="WellProdSimulator Logo"
                className="w-32 h-32 md:w-48 md:h-16 mb-2 object-contain"
              />
            </div>
            <p
              id="Escuela"
              className="text-end font-archivo font-light text-xs max-w-[40vw] md:max-w-[20vw] leading-3"
            />
          </div>
        </div>
      </div>
      <video
        ref={videoRef}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        className="absolute top-0 left-0 w-full h-full object-cover z-0"
      >
        <source src="/video/aboutHero.mp4" type="video/mp4" />
      </video>
    </header>
  );
};

export default HeroSection;
