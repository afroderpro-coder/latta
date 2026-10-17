"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isNavigating, setIsNavigating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startProgress = useCallback(() => {
    // Clear any existing timers
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    setIsNavigating(true);
    setVisible(true);
    setProgress(0);

    // Simulate progress: fast start, then slows down
    let currentProgress = 0;
    intervalRef.current = setInterval(() => {
      currentProgress += Math.random() * 12 + 3;
      if (currentProgress > 90) {
        currentProgress = 90;
        if (intervalRef.current) clearInterval(intervalRef.current);
      }
      setProgress(currentProgress);
    }, 150);
  }, []);

  const completeProgress = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    setProgress(100);

    // Hide after the bar reaches 100%
    timeoutRef.current = setTimeout(() => {
      setIsNavigating(false);
      setVisible(false);
      setProgress(0);
    }, 400);
  }, []);

  // Detect navigation completion via pathname/searchParams change
  useEffect(() => {
    if (isNavigating) {
      completeProgress();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams]);

  // Intercept clicks on links to detect navigation start
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a");
      if (!target) return;

      const href = target.getAttribute("href");
      if (!href) return;

      // Skip external links, anchors, and non-navigation links
      if (
        href.startsWith("http") ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        target.getAttribute("target") === "_blank"
      ) {
        return;
      }

      // Skip if same page
      if (href === pathname) return;

      startProgress();
    };

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [pathname, startProgress]);

  if (!visible) return null;

  return (
    <>
      {/* Progress bar at top of viewport */}
      <div
        className="fixed top-0 left-0 right-0 z-[9999] h-[3px] pointer-events-none"
        style={{ opacity: visible ? 1 : 0, transition: "opacity 0.3s ease" }}
      >
        <div
          className="h-full"
          style={{
            width: `${progress}%`,
            background: "linear-gradient(90deg, #0f172a, #334155, #64748b)",
            transition: progress === 0 ? "none" : "width 0.3s ease-out",
            boxShadow: "0 0 8px rgba(15, 23, 42, 0.4), 0 0 4px rgba(15, 23, 42, 0.3)",
          }}
        />
      </div>

      {/* Subtle full-page shimmer overlay (very light) */}
      {progress < 100 && (
        <div
          className="fixed inset-0 z-[9998] pointer-events-none"
          style={{
            background: "rgba(252, 252, 252, 0.3)",
            backdropFilter: "blur(1px)",
            transition: "opacity 0.2s ease",
          }}
        />
      )}
    </>
  );
}
