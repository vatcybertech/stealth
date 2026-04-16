"use client";

import { motion } from "framer-motion";
import { FEATURES, EASE } from "@/lib/constants";
import {
  Layers,
  Zap,
  Cloud,
  Smartphone,
  Shield,
  Plug,
  Brain,
  BarChart3,
} from "lucide-react";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Layers,
  Zap,
  Cloud,
  Smartphone,
  Shield,
  Plug,
  Brain,
  BarChart3,
};

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemVariantsLeft = {
  hidden: { opacity: 0, x: -30 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.6, ease: EASE },
  },
};

const itemVariantsRight = {
  hidden: { opacity: 0, x: 30 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.6, ease: EASE },
  },
};

export default function Features() {
  return (
    <section id="features" className="py-16 sm:py-24 lg:py-32" aria-labelledby="features-heading">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7, ease: EASE }}
          className="text-center mb-16 lg:mb-20"
        >
          <div className="relative inline-block px-8 py-4">
            {/* Top-left corner */}
            <svg className="absolute top-0 left-0 w-5 h-5 text-neon/25" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M2 8V2h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {/* Top-right corner */}
            <svg className="absolute top-0 right-0 w-5 h-5 text-neon/25" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M22 8V2h-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {/* Bottom-left corner */}
            <svg className="absolute bottom-0 left-0 w-5 h-5 text-neon/25" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M2 16v6h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {/* Bottom-right corner */}
            <svg className="absolute bottom-0 right-0 w-5 h-5 text-neon/25" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M22 16v6h-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className="text-xs tracking-[0.3em] text-neon uppercase font-heading mb-3">
              Capabilities
            </p>
            <h2
              id="features-heading"
              className="font-heading font-bold text-2xl sm:text-3xl md:text-4xl lg:text-5xl text-gradient-silver"
            >
              Built for What&apos;s Next
            </h2>
          </div>
        </motion.div>

        {/* Bento grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6"
          role="list"
        >
          {FEATURES.map((feature, index) => {
            const Icon = iconMap[feature.icon];
            const isLarge = index < 2;

            return (
              <motion.article
                key={feature.title}
                variants={index % 2 === 0 ? itemVariantsLeft : itemVariantsRight}
                role="listitem"
                className={`group relative p-4 sm:p-6 lg:p-7 rounded-card gothic-card neon-glow-border
                  transition-colors duration-500
                  ${isLarge ? "sm:col-span-2 lg:col-span-2 border-l-2 border-l-neon/40" : "border-l border-l-neon/[0.08] hover:border-l-neon/25"}
                `}
                whileHover={{ y: -4, transition: { duration: 0.3, ease: EASE } }}
                transition={{ duration: 0.5, ease: EASE }}
              >
                {/* Subtle top highlight — grows on hover */}
                <div
                  className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-neon/[0.04] to-transparent rounded-t-card group-hover:via-neon/20 transition-[background] duration-500"
                  aria-hidden="true"
                />

                {/* Radial glow for large cards */}
                {isLarge && (
                  <div
                    className="absolute inset-0 rounded-card pointer-events-none"
                    style={{ background: "radial-gradient(ellipse 60% 60% at 20% 50%, rgba(255, 23, 68, 0.04), transparent 70%)" }}
                    aria-hidden="true"
                  />
                )}

                {/* Icon with glow */}
                <div
                  className="relative w-11 h-11 rounded-xl flex items-center justify-center mb-5 transition-all duration-500 bg-neon/10 shadow-[0_0_20px_rgba(255,23,68,0.15)] group-hover:shadow-[0_0_30px_rgba(255,23,68,0.25)] group-hover:bg-neon/15"
                  aria-hidden="true"
                >
                  {Icon && (
                    <span
                      className="inline-flex transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6"
                      style={{ filter: 'drop-shadow(0 0 8px rgba(255,23,68,0.3))' }}
                    >
                      <Icon className="w-5 h-5 transition-colors duration-500 text-neon" />
                    </span>
                  )}
                </div>

                {/* Text content */}
                <h3
                  className={`font-heading font-semibold text-text-primary mb-2 ${
                    isLarge ? "text-base lg:text-lg" : "text-sm lg:text-base"
                  }`}
                >
                  {feature.title}
                </h3>
                <p
                  className={`text-text-secondary leading-relaxed ${
                    isLarge ? "text-sm lg:text-base" : "text-sm"
                  }`}
                >
                  {feature.description}
                </p>
              </motion.article>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
