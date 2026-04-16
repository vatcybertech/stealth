"use client";

import { useEffect, useRef, useState } from "react";

export default function CursorSpotlight() {
  const [isTouch, setIsTouch] = useState(false);
  const divRef = useRef<HTMLDivElement>(null);
  const rafId = useRef<number | null>(null);

  useEffect(() => {
    if ("ontouchstart" in window) {
      setIsTouch(true);
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(() => {
        if (divRef.current) {
          divRef.current.style.setProperty("--cx", `${e.clientX}px`);
          divRef.current.style.setProperty("--cy", `${e.clientY}px`);
        }
      });
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, []);

  if (isTouch) return null;

  return (
    <div
      ref={divRef}
      className="fixed inset-0 z-30 pointer-events-none"
      aria-hidden="true"
      style={{
        ["--cx" as string]: "0px",
        ["--cy" as string]: "0px",
        background: "radial-gradient(600px circle at var(--cx) var(--cy), rgba(255,23,68,0.10), transparent 40%), radial-gradient(300px circle at var(--cx) var(--cy), rgba(255,23,68,0.06), transparent 30%)",
        backfaceVisibility: "hidden",
        transform: "translateZ(0)",
      }}
    />
  );
}
