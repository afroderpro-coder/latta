"use client";

import { useState, useEffect } from "react";

const images = [
  "/main-image.jpg",
  "/new-img.jpg",
  "/new1-img.jpg"
];

export default function HeroCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 3000);
    
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="w-full flex-1 relative h-[45vh] lg:h-auto lg:min-h-full flex items-center justify-center p-4 md:p-6 lg:p-12">
      {images.map((src, index) => (
        <img
          key={src}
          src={src}
          alt={`Hero Image ${index + 1}`}
          className={`absolute w-auto h-auto max-w-full max-h-[45vh] lg:max-h-[85vh] object-contain rounded-2xl transition-opacity duration-1000 ${
            index === currentIndex ? "opacity-100 z-10" : "opacity-0 z-0"
          }`}
        />
      ))}
    </div>
  );
}
