"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

interface HeroVisualSliderProps {
  images?: string[];
  intervalMs?: number;
}

export default function HeroVisualSlider({
  images = ["/hero-dancer-2.png"],
  intervalMs = 5000,
}: HeroVisualSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Switch image every 5 seconds with smooth fade-up crossfade
  useEffect(() => {
    if (images.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [images.length, intervalMs]);

  return (
    <div className="flex-1 relative flex items-center justify-center p-6 md:p-10 lg:p-12 min-h-[460px] md:min-h-[560px] lg:min-h-[640px] overflow-hidden select-none">
      {/* Subtle Ambient Radial Glow */}
      <div className="absolute w-[320px] h-[320px] md:w-[460px] md:h-[460px] rounded-full bg-neutral-300/50 blur-3xl pointer-events-none" />

      {/* Floating Canvas with Smooth 5-Second Fade-Up Transitions */}
      <div className="relative w-full max-w-[380px] md:max-w-[460px] lg:max-w-[520px] h-[460px] md:h-[560px] lg:h-[640px] flex items-center justify-center animate-float-slow">
        {images.map((src, idx) => {
          const isActive = idx === currentIndex;

          return (
            <div
              key={src}
              className={`absolute inset-0 flex items-center justify-center transition-all duration-1000 ease-[cubic-bezier(0.25,1,0.5,1)] ${
                isActive
                  ? "opacity-100 translate-y-0 scale-100 pointer-events-auto"
                  : "opacity-0 translate-y-6 scale-[0.97] pointer-events-none"
              }`}
            >
              <Image
                src={src}
                alt={`AFRODER Editorial Campaign Visual ${idx + 1}`}
                fill
                className="object-contain drop-shadow-[0_25px_35px_rgba(0,0,0,0.22)] transition-transform duration-500 hover:scale-105"
                priority={idx === 0}
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
          );
        })}
      </div>

      {/* Elegant Slide Indicators */}
      {images.length > 1 && (
        <div className="absolute bottom-4 lg:bottom-8 flex items-center space-x-2 z-20">
          {images.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              aria-label={`Show slide ${idx + 1}`}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                idx === currentIndex
                  ? "w-7 bg-foreground/80"
                  : "w-2 bg-foreground/20 hover:bg-foreground/40"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
