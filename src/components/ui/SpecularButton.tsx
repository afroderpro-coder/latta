"use client";

import React, { useRef, useState } from "react";
import "./SpecularButton.css";

interface SpecularButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: "sm" | "md" | "lg";
  radius?: number;
  tint?: string;
  tintOpacity?: number;
  blur?: number;
  textColor?: string;
  lineColor?: string;
  baseColor?: string;
  intensity?: number;
  shineSize?: number;
  shineFade?: number;
  thickness?: number;
  speed?: number;
  followMouse?: boolean;
  proximity?: number;
  autoAnimate?: boolean;
}

export default function SpecularButton({
  children,
  size = "lg",
  radius = 18,
  tint = "#ffffff",
  tintOpacity = 0,
  blur = 0,
  textColor = "#f5f5f5",
  lineColor = "#ffffff",
  baseColor = "#525252",
  intensity = 1,
  shineSize = 10,
  shineFade = 40,
  thickness = 1,
  speed = 0.35,
  followMouse = true,
  proximity = 250,
  autoAnimate = false,
  className = "",
  style,
  onClick,
  ...props
}: SpecularButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!buttonRef.current || !followMouse) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => {
    setIsHovered(false);
    setMousePos({ x: -1000, y: -1000 });
  };

  return (
    <button
      ref={buttonRef}
      className={`specular-button specular-button--${size} ${className}`}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        "--sb-radius": `${radius}px`,
        "--sb-tint": tint,
        "--sb-tint-opacity": tintOpacity,
        "--sb-blur": `${blur}px`,
        "--sb-text-color": textColor,
        backgroundColor: baseColor,
        ...style,
      } as React.CSSProperties}
      {...props}
    >
      <div 
        className="specular-button__fx" 
        style={{
          opacity: isHovered ? intensity : 0,
          background: `radial-gradient(circle ${proximity}px at ${mousePos.x}px ${mousePos.y}px, ${lineColor}40 0%, transparent 100%)`,
          boxShadow: isHovered ? `inset 0 0 ${thickness}px ${lineColor}60` : 'none',
          borderRadius: radius,
        }}
      />
      <span className="specular-button__label">{children}</span>
    </button>
  );
}
