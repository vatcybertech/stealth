"use client";

import { motion } from "framer-motion";
import { COMPARISON, EASE } from "@/lib/constants";

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const rowVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.6, ease: EASE },
  },
};

const rowVariantsRight = {
  hidden: { opacity: 0, x: 20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.6, ease: EASE },
  },
};

const mobileCardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: EASE },
  },
};

export default function Comparison() {
  return (
    <section id="pricing" className="py-16 sm:py-24 lg:py-32" aria-labelledby="comparison-heading">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7, ease: EASE }}
          className="text-center mb-16 lg:mb-20"
        >
          <p className="text-xs tracking-[0.3em] text-neon uppercase font-heading mb-3">
            Why Vermillion
          </p>
          <h2
            id="comparison-heading"
            className="font-heading font-bold text-2xl sm:text-3xl md:text-4xl lg:text-5xl text-text-primary metallic-text"
          >
            Built Different. Delivered Faster.
          </h2>
        </motion.div>

        {/* Desktop Semantic Table */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="hidden md:block rounded-card overflow-hidden gothic-card neon-glow-border"
        >
          <table className="w-full" aria-label="Feature comparison">
            <thead>
              <tr className="bg-surface-2/60 backdrop-blur-sm border-b border-white/[0.06]">
                <th className="text-left text-xs font-heading font-semibold text-text-caption uppercase tracking-wider px-8 py-5">
                  Feature
                </th>
                <th className="text-center text-xs font-heading font-semibold text-text-caption uppercase tracking-wider px-4 py-5">
                  Traditional Agencies
                </th>
                <th className="text-center text-xs font-heading font-bold text-neon uppercase tracking-wider px-4 py-5 bg-neon/[0.06] border-l border-l-neon/20">
                  Vermillion Axis
                </th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((row, i) => (
                <motion.tr
                  key={row.feature}
                  variants={i % 2 === 0 ? rowVariants : rowVariantsRight}
                  className={`group
                    hover:bg-white/[0.02]
                    border-l-2 border-l-transparent hover:border-l-neon/60
                    transition-all duration-300
                    ${i < COMPARISON.length - 1 ? "border-b border-b-white/[0.04]" : ""}
                  `}
                >
                  <td className="text-sm text-text-body group-hover:text-text-primary transition-colors duration-300 font-medium px-8 py-5">
                    {row.feature}
                  </td>
                  <td className="text-sm text-text-caption text-center px-4 py-5">
                    {row.others}
                  </td>
                  <td className="text-sm text-neon font-bold text-center bg-neon/[0.04] border-l border-l-neon/[0.08] px-4 py-5">
                    {row.ours}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </motion.div>

        {/* Mobile Cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="md:hidden space-y-4"
        >
          {COMPARISON.map((row) => (
            <motion.div
              key={row.feature}
              variants={mobileCardVariants}
              className="rounded-card gothic-card neon-glow-border p-4 sm:p-5 border-l-2 border-l-neon/40"
            >
              <p className="text-xs sm:text-sm text-text-primary font-heading font-semibold mb-3">
                {row.feature}
              </p>
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <div>
                  <span className="text-text-caption text-xs uppercase tracking-wider block mb-0.5">Others</span>
                  <span className="text-text-secondary">{row.others}</span>
                </div>
                <div className="text-right">
                  <span className="text-text-caption text-xs uppercase tracking-wider block mb-0.5">Us</span>
                  <span className="text-neon font-semibold">{row.ours}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Tagline */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="mt-10 lg:mt-12 max-w-xl mx-auto gothic-frame rounded-card px-6 py-5"
        >
          <p className="text-center text-text-secondary text-base font-body">
            We don&apos;t compete on price. We compete on{" "}
            <span className="text-neon font-semibold">
              speed, quality, and ownership
            </span>
            .
          </p>
        </motion.div>
      </div>
    </section>
  );
}
