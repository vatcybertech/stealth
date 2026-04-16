"use client";

import { useEffect, useRef } from "react";

export default function ScrollProgress() {
  const barRef = useRef<HTMLDivElement>(null);
  const rafId = useRef<number | null>(null);
  const docHeightRef = useRef(0);

  useEffect(() => {
    function cacheHeight() {
      docHeightRef.current = document.documentElement.scrollHeight - window.innerHeight;
    }
    cacheHeight();

    function onScroll() {
      if (rafId.current) cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(() => {
        if (barRef.current && docHeightRef.current > 0) {
          barRef.current.style.transform = `scaleX(${window.scrollY / docHeightRef.current})`;
        }
      });
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", cacheHeight, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", cacheHeight);
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, []);

  return (
    <div
      ref={barRef}
      className="fixed top-0 left-0 w-full h-[3px] z-[60] origin-left pointer-events-none"
      style={{
        transform: "scaleX(0)",
        backfaceVisibility: "hidden",
        background: "linear-gradient(90deg, #FF1744, #FF4569)",
        boxShadow: "0 0 12px rgba(255,23,68,0.6), 0 0 30px rgba(255,23,68,0.3)",
      }}
      aria-hidden="true"
    />
  );
}
