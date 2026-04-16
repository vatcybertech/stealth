"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { EASE } from "@/lib/constants";

export default function ImpactStatement() {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  const scale = useTransform(scrollYProgress, [0.1, 0.4], [0.85, 1]);
  const opacity = useTransform(scrollYProgress, [0.1, 0.35], [0, 1]);
  const textY = useTransform(scrollYProgress, [0.1, 0.5], [60, 0]);
  const lineScaleX = useTransform(scrollYProgress, [0.2, 0.5], [0, 1]);

  return (
    <section
      ref={sectionRef}
      className="relative py-20 sm:py-28 lg:py-36 overflow-hidden"
      aria-hidden="true"
    >
      {/* Atmospheric glow */}
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_50%,rgba(255,23,68,0.06),transparent_60%)] pointer-events-none"
        aria-hidden="true"
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          style={{ scale, opacity }}
          className="text-center"
        >
          {/* Top accent line */}
          <motion.div
            style={{ scaleX: lineScaleX }}
            className="mx-auto mb-10 h-px w-32 sm:w-48 bg-gradient-to-r from-transparent via-neon to-transparent origin-center"
          />

          <motion.p
            style={{ y: textY }}
            className="font-heading font-bold text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl metallic-text leading-[1.1] tracking-tight"
          >
            Your competitors ship{" "}
            <span className="text-gradient-vermillion">websites</span>.
          </motion.p>

          <motion.p
            style={{ y: textY }}
            className="font-heading font-bold text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl metallic-text leading-[1.1] tracking-tight mt-2"
          >
            We deploy{" "}
            <span className="text-gradient-vermillion">infrastructure</span>.
          </motion.p>

          {/* Bottom accent line */}
          <motion.div
            style={{ scaleX: lineScaleX }}
            className="mx-auto mt-10 h-px w-32 sm:w-48 bg-gradient-to-r from-transparent via-neon to-transparent origin-center"
          />

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.3, ease: EASE }}
            className="mt-8 text-text-caption text-sm sm:text-base tracking-widest uppercase font-heading"
          >
            3–21 days &middot; 100% ownership &middot; Zero compromises
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
}
