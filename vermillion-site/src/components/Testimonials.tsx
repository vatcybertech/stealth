"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Star } from "lucide-react";
import { TESTIMONIALS, EASE } from "@/lib/constants";

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15 } },
};

const itemVariants = {
  hidden: { opacity: 0, scale: 0.96, rotate: -0.5 },
  visible: { opacity: 1, scale: 1, rotate: 0, transition: { duration: 0.6, ease: EASE } },
};

function StarRating() {
  return (
    <div className="flex gap-1 mb-4" aria-label="5 out of 5 stars">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className="w-4 h-4 fill-neon text-neon"
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

export default function Testimonials() {
  const [featured, ...rest] = TESTIMONIALS;
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start end", "end start"] });
  const quoteY = useTransform(scrollYProgress, [0, 1], [40, -40]);

  return (
    <section ref={sectionRef} id="testimonials" className="py-16 sm:py-24 lg:py-32" aria-labelledby="testimonials-heading">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, clipPath: "inset(0 100% 0 0)" }}
          whileInView={{ opacity: 1, clipPath: "inset(0 0% 0 0)" }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7, ease: EASE }}
          className="text-center mb-16"
        >
          <p className="text-xs tracking-[0.3em] text-neon uppercase font-heading mb-3">
            Client Feedback
          </p>
          <h2
            id="testimonials-heading"
            className="font-heading font-bold text-2xl sm:text-3xl md:text-4xl lg:text-5xl text-text-primary metallic-text"
          >
            Trusted by Founders. Verified by Results.
          </h2>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="space-y-8"
        >
          {/* Featured testimonial — full width, larger */}
          <motion.blockquote
            variants={itemVariants}
            className="relative p-6 sm:p-8 lg:p-12 rounded-card gothic-card neon-border-flow neon-glow-border overflow-hidden hover:shadow-neon-md transition-shadow duration-500"
            style={{ boxShadow: '0 0 15px rgba(255,23,68,0.05)' }}
          >
            {/* Decorative oversized quote mark with scroll parallax */}
            <motion.span
              className="absolute top-4 right-8 text-[8rem] leading-none font-heading font-bold text-neon/[0.06] select-none pointer-events-none"
              style={{ y: quoteY }}
              aria-hidden="true"
            >
              &ldquo;
            </motion.span>

            {/* Vermillion accent bar */}
            <div className="absolute left-0 top-0 bottom-0 w-[3px] holographic-shimmer rounded-l-card" aria-hidden="true" />

            <div className="relative">
              <StarRating />
              <p className="text-text-body text-sm sm:text-base md:text-lg lg:text-xl leading-relaxed mb-8 max-w-4xl">
                &ldquo;{featured.quote}&rdquo;
              </p>

              <footer className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-neon/10 flex items-center justify-center flex-shrink-0 border border-neon/20">
                  <span className="font-heading font-bold text-base text-neon">
                    {featured.name.charAt(0)}
                  </span>
                </div>
                <div>
                  <cite className="not-italic font-heading font-semibold text-base text-neon text-neon-glow-subtle block">
                    {featured.name}
                  </cite>
                  <span className="text-sm text-text-secondary">
                    {featured.title}{featured.location ? <> &middot; {featured.location}</> : null}
                  </span>
                </div>
              </footer>
            </div>
          </motion.blockquote>

          {/* Remaining testimonials — side by side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
            {rest.map((t) => (
              <motion.blockquote
                key={t.name}
                variants={itemVariants}
                className="relative p-6 lg:p-8 rounded-card gothic-card neon-glow-border border-l border-l-neon/[0.06] hover:border-l-neon/20"
                style={{ boxShadow: '0 0 15px rgba(255,23,68,0.05)' }}
              >
                {/* Decorative quote mark */}
                <span
                  className="absolute top-2 right-6 text-[5rem] leading-none font-heading font-bold text-neon/[0.04] select-none pointer-events-none"
                  aria-hidden="true"
                >
                  &ldquo;
                </span>

                <div className="relative">
                  <StarRating />
                  <p className="text-text-body text-base leading-relaxed mb-6">
                    &ldquo;{t.quote}&rdquo;
                  </p>

                  <footer className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-neon/10 flex items-center justify-center flex-shrink-0 border border-neon/20">
                      <span className="font-heading font-bold text-sm text-neon">
                        {t.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <cite className="not-italic font-heading font-semibold text-sm text-neon text-neon-glow-subtle block">
                        {t.name}
                      </cite>
                      <span className="text-xs text-text-secondary">
                        {t.title}{t.location ? <> &middot; {t.location}</> : null}
                      </span>
                    </div>
                  </footer>
                </div>
              </motion.blockquote>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
