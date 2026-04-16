"use client";

import React, { useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";

interface MagneticButtonProps {
  children: React.ReactNode;
  className?: string;
  strength?: number;
}

export default function MagneticButton({
  children,
  className = "",
  strength = 0.3,
}: MagneticButtonProps) {
  const ref = useRef<HTMLDivElement>(null);
  const rafId = useRef<number | null>(null);
  const cachedRect = useRef<DOMRect | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const handleMouseEnter = useCallback(() => {
    if (ref.current) {
      cachedRect.current = ref.current.getBoundingClientRect();
    }
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!cachedRect.current) return;
      if (rafId.current) cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(() => {
        const rect = cachedRect.current!;
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const dx = (e.clientX - centerX) * strength;
        const dy = (e.clientY - centerY) * strength;
        setOffset({ x: dx, y: dy });
      });
    },
    [strength]
  );

  const handleMouseLeave = useCallback(() => {
    if (rafId.current) cancelAnimationFrame(rafId.current);
    cachedRect.current = null;
    setOffset({ x: 0, y: 0 });
  }, []);

  return (
    <div
      ref={ref}
      className={`p-2 ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <motion.div
        animate={{ x: offset.x, y: offset.y }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
      >
        {children}
      </motion.div>
    </div>
  );
}
