"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { PROCESS_STEPS, EASE } from "@/lib/constants";

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const stepVariants = {
  hidden: { opacity: 0, x: -30 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.7, ease: EASE },
  },
};

export default function Process() {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  /* Timeline line grows with scroll progress through the section */
  const lineScaleY = useTransform(scrollYProgress, [0.1, 0.8], [0, 1]);

  return (
    <section
      ref={sectionRef}
      id="process"
      className="relative py-16 sm:py-24 lg:py-32"
      aria-labelledby="process-heading"
    >
      {/* Atmospheric depth */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_30%_at_20%_50%,rgba(255,23,68,0.025),transparent_60%)] pointer-events-none" aria-hidden="true" />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header — clip-path reveal */}
        <motion.div
          initial={{ opacity: 0, clipPath: "inset(0 100% 0 0)" }}
          whileInView={{ opacity: 1, clipPath: "inset(0 0% 0 0)" }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.9, ease: EASE }}
          className="text-center mb-16 lg:mb-20"
        >
          <p className="text-xs tracking-[0.3em] text-neon uppercase font-heading mb-3">
            How It Works
          </p>
          <h2
            id="process-heading"
            className="font-heading font-bold text-2xl sm:text-3xl md:text-4xl lg:text-5xl text-text-primary"
          >
            From Idea to Launch in Days
          </h2>
        </motion.div>

        {/* Timeline */}
        <div className="relative">
          {/* Scroll-linked vertical line */}
          <motion.div
            className="absolute left-[21px] sm:left-[27px] top-0 bottom-0 w-px origin-top"
            style={{
              background:
                "linear-gradient(to bottom, #FF1744 0%, #FF1744 30%, rgba(255,23,68,0.15) 70%, transparent 100%)",
              scaleY: lineScaleY,
            }}
            aria-hidden="true"
          />

          <motion.ol
            className="space-y-10 lg:space-y-14"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
          >
            {PROCESS_STEPS.map((step) => (
              <motion.li
                key={step.step}
                variants={stepVariants}
                className="group flex items-start gap-4 sm:gap-6 lg:gap-8"
              >
                {/* Step number circle */}
                <div
                  className="flex-shrink-0 w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-surface-2 border border-neon/40
                    flex items-center justify-center relative z-10
                    shadow-[0_0_20px_rgba(255,23,68,0.15)]
                    group-hover:bg-neon/10 group-hover:border-neon group-hover:shadow-[0_0_30px_rgba(255,23,68,0.5),inset_0_0_10px_rgba(255,23,68,0.15)]
                    transition-all duration-500"
                  aria-hidden="true"
                >
                  <span className="font-heading font-bold text-sm text-neon tracking-wider">
                    {step.step}
                  </span>
                </div>

                {/* Content card with glassmorphism on hover */}
                <div
                  className="flex-1 pt-1 pb-2 px-5 -ml-1 rounded-card
                    neon-glow-border
                    group-hover:bg-white/[0.02] group-hover:backdrop-blur-sm
                    transition-all duration-500"
                >
                  <div className="flex items-baseline gap-3 mb-2">
                    <h3 className="font-heading font-bold text-lg text-text-primary uppercase tracking-wider">
                      {step.title}
                    </h3>
                    {step.step === "01" && (
                      <span className="text-xs text-text-caption font-body">~15 minutes</span>
                    )}
                    {step.step === "02" && (
                      <span className="text-xs text-text-caption font-body">Within 24 hours</span>
                    )}
                    {step.step === "03" && (
                      <span className="text-xs text-text-caption font-body">3–21 days</span>
                    )}
                  </div>
                  <p className="text-sm sm:text-base text-text-secondary leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </motion.li>
            ))}
          </motion.ol>
        </div>
      </div>
    </section>
  );
}
