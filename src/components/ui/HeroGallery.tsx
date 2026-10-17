"use client";

import { useState, useEffect } from "react";

export default function HeroGallery({ images }: { images: string[] }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Auto-cycle through the images every 3 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      // Pause cycling if an image is hovered
      if (hoveredIndex === null) {
        setCurrentIndex((prev) => (prev + 1) % images.length);
      }
    }, 3000);
    return () => clearInterval(timer);
  }, [images.length, hoveredIndex]);

  // Default layout for 3 overlapping images
  const layouts = [
    // Slot 0: Main center/right
    "w-[70%] h-[80%] right-[5%] top-[10%] z-10 opacity-100 scale-100",
    // Slot 1: Bottom left overlapping
    "w-[45%] h-[55%] left-[10%] bottom-[5%] z-20 opacity-100 scale-100",
    // Slot 2: Top left overlapping
    "w-[40%] h-[50%] left-[5%] top-[5%] z-0 opacity-100 scale-100"
  ];

  // Hidden layout for images not in the current 3 slots
  const hiddenLayout = "w-[40%] h-[50%] left-[5%] top-[5%] z-[-10] opacity-0 scale-50";

  return (
    <div className="w-full flex-1 relative h-[50vh] lg:h-full min-h-[500px] flex items-center justify-center p-4 md:p-6 lg:p-12 overflow-hidden group">
      <div className="relative w-full h-[400px] md:h-[500px] lg:h-[600px] max-w-[600px]">
        {images.map((src, index) => {
          // Calculate relative position to currentIndex
          const offset = (index - currentIndex + images.length) % images.length;
          
          let layoutClass = "";
          let isVisible = true;

          if (offset === 0) {
            // Center
            layoutClass = "w-[40%] h-[90%] left-[30%] top-[5%] z-40 opacity-100 scale-100";
          } else if (offset === 1) {
            // Right
            layoutClass = "w-[30%] h-[75%] left-[60%] top-[12.5%] z-30 opacity-90 scale-100";
          } else if (offset === 2) {
            // Far Right (Entering)
            layoutClass = "w-[20%] h-[60%] left-[80%] top-[20%] z-20 opacity-0 md:opacity-40 scale-95";
          } else if (offset === images.length - 1) {
            // Left
            layoutClass = "w-[30%] h-[75%] left-[10%] top-[12.5%] z-30 opacity-90 scale-100";
          } else if (offset === images.length - 2) {
            // Far Left (Exiting)
            layoutClass = "w-[20%] h-[60%] left-[0%] top-[20%] z-20 opacity-0 md:opacity-40 scale-95";
          } else {
            // Hidden
            layoutClass = "w-[20%] h-[60%] left-[40%] top-[20%] z-0 opacity-0 scale-90 pointer-events-none";
            isVisible = false;
          }

          const isHovered = hoveredIndex === index;
          const isOtherHovered = hoveredIndex !== null && hoveredIndex !== index && isVisible;
          
          return (
            <div
              key={src}
              className={`absolute ${layoutClass} transition-all duration-500 ease-in-out cursor-pointer rounded-2xl overflow-hidden shadow-2xl transform-gpu backface-hidden ${
                !isVisible ? "opacity-0" : ""
              } ${isHovered && isVisible ? "z-50 !scale-105 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)]" : ""} ${isOtherHovered ? "!scale-95 opacity-60 blur-[4px]" : ""}`}
              onMouseEnter={() => isVisible && setHoveredIndex(index)}
              onMouseLeave={() => isVisible && setHoveredIndex(null)}
              style={{ pointerEvents: isVisible ? 'auto' : 'none', WebkitTransform: 'translate3d(0,0,0)' }}
            >
              {/* Solid Dark Background */}
              <div className="absolute inset-0 bg-slate-900 border border-slate-700/50 z-10 transform-gpu backface-hidden" style={{ WebkitTransform: 'translate3d(0,0,0)' }} />
              
              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors duration-300 z-30" />

              <img
                src={src}
                alt={`Gallery image`}
                className="relative w-full h-full object-contain transition-transform duration-300 hover:scale-105 z-20 transform-gpu backface-hidden"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
