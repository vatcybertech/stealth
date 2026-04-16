"use client";

import { motion } from "framer-motion";
import { TIERS, EASE } from "@/lib/constants";
import { Check, ArrowRight } from "lucide-react";

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.15,
      duration: 0.7,
      ease: EASE,
    },
  }),
};

const featureVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: i * 0.04,
      duration: 0.4,
      ease: EASE,
    },
  }),
};

const checkVariants = {
  hidden: { scale: 0, opacity: 0 },
  visible: (i: number) => ({
    scale: 1,
    opacity: 1,
    transition: {
      delay: i * 0.04 + 0.1,
      duration: 0.3,
      ease: EASE,
    },
  }),
};

export default function Services() {
  return (
    <section
      id="services"
      className="relative py-16 sm:py-24 lg:py-32 overflow-hidden"
      aria-labelledby="services-heading"
    >
      {/* Section background glow */}
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_50%,rgba(255,23,68,0.04),transparent_70%)] pointer-events-none"
        aria-hidden="true"
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7, ease: EASE }}
          className="text-center"
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
              Pricing
            </p>
            <h2
              id="services-heading"
              className="font-heading font-bold text-2xl sm:text-3xl md:text-4xl lg:text-5xl text-gradient-vermillion"
            >
              Transparent Pricing. No Surprises.
            </h2>
          </div>
        </motion.div>

        {/* Ornamental divider */}
        <div className="flex items-center justify-center gap-4 mt-8 mb-16" aria-hidden="true">
          <span className="h-px w-16 bg-gradient-to-r from-transparent to-neon/30" />
          <span className="block w-1.5 h-1.5 rotate-45 border border-neon/40" />
          <span className="h-px w-16 bg-gradient-to-l from-transparent to-neon/30" />
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8 items-start">
          {TIERS.map((tier, i) => {
            const isHighlighted = tier.highlighted;

            return (
              <motion.div
                key={tier.name}
                custom={i}
                variants={cardVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-50px" }}
                whileHover={{ y: -8, transition: { duration: 0.35, ease: EASE } }}
                className="relative"
              >
                {/* RECOMMENDED badge for Professional */}
                {isHighlighted && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.5, ease: EASE }}
                    className="flex justify-center mb-3"
                  >
                    <span className="relative inline-flex items-center bg-vermillion text-white text-[10px] tracking-[0.2em] uppercase px-3 py-1 rounded-full font-heading font-semibold shadow-[0_0_16px_rgba(255,23,68,0.5)]">
                      <span className="absolute inset-0 rounded-full bg-neon animate-pulse opacity-50" />
                      <span className="relative drop-shadow-[0_0_8px_rgba(255,23,68,0.4)]">Recommended</span>
                    </span>
                  </motion.div>
                )}

                {/* Card container with animated border */}
                <motion.div
                  animate={{
                    scale: isHighlighted ? 1.0 : 1,
                    opacity: 1,
                  }}
                  transition={{ duration: 0.35, ease: EASE }}
                  className={`relative rounded-card overflow-hidden transition-all duration-500 gothic-card ${
                    isHighlighted
                      ? "neon-border-flow"
                      : "neon-glow-border"
                  }`}
                  style={{
                    boxShadow: isHighlighted
                      ? '0 0 25px rgba(255,23,68,0.2), 0 0 50px rgba(255,23,68,0.1), 0 0 90px rgba(255,23,68,0.05)'
                      : '0 0 15px rgba(255,23,68,0.1), 0 0 30px rgba(255,23,68,0.04)',
                  }}
                >
                  {/* Animated gradient border overlay on hover/select */}
                  <div
                    className={`absolute inset-0 rounded-card pointer-events-none transition-opacity duration-500 ${
                      isHighlighted ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    }`}
                    style={{
                      background: isHighlighted
                        ? "linear-gradient(135deg, rgba(255,23,68,0.12), transparent 40%, transparent 60%, rgba(255,23,68,0.08))"
                        : undefined,
                    }}
                    aria-hidden="true"
                  />

                  {/* Top accent bar */}
                  <div
                    className={`h-[2px] transition-all duration-500 ${
                      isHighlighted
                        ? "bg-gradient-to-r from-transparent via-neon to-transparent"
                        : "bg-gradient-to-r from-transparent via-border to-transparent"
                    }`}
                    aria-hidden="true"
                  />

                  {/* Hover/select glow */}
                  <div
                    className={`absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,23,68,0.08),transparent_60%)] transition-opacity duration-500 pointer-events-none ${
                      isHighlighted ? "opacity-100" : "opacity-0"
                    }`}
                    aria-hidden="true"
                  />

                  {/* Hover glow (separate so it works with CSS group-hover) */}
                  <div
                    className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,23,68,0.06),transparent_60%)] opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                    aria-hidden="true"
                  />

                  <div className="relative p-4 sm:p-6 lg:p-8">
                    {/* Tier name */}
                    <h3 className="font-heading font-bold text-lg text-text-primary tracking-wider uppercase mb-1">
                      {tier.name}
                    </h3>

                    {/* Price with animated scale */}
                    <motion.p
                      animate={{
                        scale: isHighlighted ? 1.02 : 1,
                      }}
                      transition={{ duration: 0.3, ease: EASE }}
                      className="relative inline-block font-mono font-bold text-2xl sm:text-3xl md:text-4xl text-neon mb-3 origin-left"
                    >
                      {isHighlighted && (
                        <span
                          className="absolute inset-0 -inset-x-2 bg-neon/10 blur-xl rounded-full pointer-events-none"
                          aria-hidden="true"
                        />
                      )}
                      <span className="relative">{tier.price}</span>
                    </motion.p>

                    <p className="text-sm text-text-secondary mb-5">
                      {tier.audience}
                    </p>

                    {/* Delivery + Support */}
                    <p className="text-xs text-text-caption mb-6 pb-6 border-b border-border/30">Typical delivery: {tier.delivery}</p>

                    {/* Features with stagger */}
                    <ul
                      className="space-y-3 mb-8"
                      aria-label={`${tier.name} features`}
                    >
                      {tier.features.map((feature, fi) => (
                        <motion.li
                          key={feature}
                          custom={fi}
                          variants={featureVariants}
                          initial="hidden"
                          whileInView="visible"
                          viewport={{ once: true }}
                          className="flex items-start gap-3"
                        >
                          <motion.span
                            custom={fi}
                            variants={checkVariants}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true }}
                            className="flex-shrink-0 mt-0.5"
                          >
                            <Check
                              className="w-4 h-4 text-neon"
                              aria-hidden="true"
                            />
                          </motion.span>
                          <span className="text-sm text-text-body leading-snug">
                            {feature}
                          </span>
                        </motion.li>
                      ))}
                    </ul>

                    {/* CTA Button */}
                    <a
                      href="#contact"
                      className={`group/btn relative flex items-center justify-center gap-2 w-full py-3 px-6 rounded-lg text-sm font-heading font-semibold tracking-wide uppercase transition-all duration-300 overflow-hidden active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon/50 focus-visible:ring-offset-2 focus-visible:ring-offset-bg ${
                        isHighlighted
                          ? "bg-vermillion text-white hover:shadow-neon-md hover:bg-vermillion/90"
                          : "border border-border/60 text-text-primary hover:border-neon/50 hover:text-neon hover:shadow-neon-sm"
                      }`}
                    >
                      <span className="relative z-10">Get Started</span>
                      <ArrowRight className="relative z-10 w-4 h-4 transition-transform duration-300 group-hover/btn:translate-x-1" />
                      {isHighlighted && (
                        <span
                          className="absolute inset-0 bg-gradient-to-r from-vermillion via-vermillion/90 to-vermillion opacity-0 hover:opacity-100 transition-opacity duration-300"
                          aria-hidden="true"
                        />
                      )}
                    </a>
                  </div>
                </motion.div>
              </motion.div>
            );
          })}
        </div>

        {/* Build Your Own */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="text-center mt-10 text-sm text-text-caption"
        >
          Not sure which tier fits?{" "}
          <a
            href="#contact"
            className="text-neon hover:text-neon/80 transition-colors underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon/50 rounded"
          >
            Tell us about your project
          </a>{" "}
          and we will recommend the right scope.
        </motion.p>
      </div>
    </section>
  );
}
