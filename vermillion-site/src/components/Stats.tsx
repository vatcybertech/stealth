"use client";

import { motion, useMotionValue, useTransform, animate, useInView } from "framer-motion";
import { useRef, useEffect } from "react";
import { STATS, EASE } from "@/lib/constants";

/** Parse a stat value like "100+", "<72hr", "3–21", "100%" into parts for animation */
function parseStatValue(value: string): { prefix: string; number: number; suffix: string; isRange: boolean } {
  const match = value.match(/^([<>]?)(\d+)(.*)/);
  if (!match) return { prefix: "", number: 0, suffix: value, isRange: false };
  const suffix = match[3];
  const isRange = suffix.startsWith("–") || suffix.startsWith("-");
  return { prefix: match[1], number: parseInt(match[2], 10), suffix, isRange };
}

function AnimatedStat({ value, label, delay }: { value: string; label: string; delay: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const { prefix, number, suffix, isRange } = parseStatValue(value);
  const motionValue = useMotionValue(0);
  const rounded = useTransform(motionValue, (v) => Math.round(v));

  useEffect(() => {
    if (isInView && !isRange) {
      const controls = animate(motionValue, number, {
        duration: 1.8,
        delay,
        ease: [0.22, 1, 0.36, 1],
      });
      return controls.stop;
    }
  }, [isInView, motionValue, number, delay, isRange]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.6, ease: EASE }}
    >
      <dt className="font-mono font-bold text-xl sm:text-2xl md:text-3xl lg:text-4xl text-text-primary mb-1 metallic-text" aria-label={value}>
        {isRange ? (
          <span>{value}</span>
        ) : (
          <>
            <span>{prefix}</span>
            <motion.span>{rounded}</motion.span>
            <span>{suffix}</span>
          </>
        )}
      </dt>
      <dd className="text-sm text-neon tracking-wide">
        {label}
      </dd>
    </motion.div>
  );
}

export default function Stats() {
  return (
    <section className="relative border-y border-neon/[0.12] shadow-[0_0_30px_rgba(255,23,68,0.06)]" aria-label="Key metrics">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-8 sm:py-10 lg:py-12">
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 gap-y-5 sm:gap-8 lg:gap-12">
          {STATS.map((stat, i) => (
            <div
              key={stat.label}
              className={`text-center iron-filigree ${i < STATS.length - 1 ? "sm:border-r sm:border-neon/[0.12]" : ""}`}
            >
              <AnimatedStat value={stat.value} label={stat.label} delay={i * 0.1} />
            </div>
          ))}
        </dl>
      </div>

      {/* Vermillion gradient accent at bottom */}
      <div
        className="absolute bottom-0 left-[10%] right-[10%] h-px animate-pulse"
        style={{ background: "linear-gradient(90deg, transparent, rgba(255, 23, 68, 0.4), transparent)", filter: "drop-shadow(0 0 6px rgba(255,23,68,0.3))", backfaceVisibility: "hidden", transform: "translateZ(0)" }}
        aria-hidden="true"
      />
      <div
        className="absolute top-0 left-[10%] right-[10%] h-px animate-pulse"
        style={{ background: "linear-gradient(90deg, transparent, rgba(255, 23, 68, 0.4), transparent)", filter: "drop-shadow(0 0 6px rgba(255,23,68,0.3))", animationDelay: "1s", backfaceVisibility: "hidden", transform: "translateZ(0)" }}
        aria-hidden="true"
      />
    </section>
  );
}
