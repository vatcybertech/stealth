"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import DeviceMockup from "./DeviceMockup";
import { SHOWCASE_ITEMS, EASE } from "@/lib/constants";

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: EASE },
  },
};

function TiltCard({ children }: { children: React.ReactNode }) {
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  const cardRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const cachedRect = useRef<DOMRect | null>(null);

  function handleMouseEnter() {
    if (cardRef.current) {
      cachedRect.current = cardRef.current.getBoundingClientRect();
    }
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!cachedRect.current || !cardRef.current) return;
    const rect = cachedRect.current;
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const rotateX = (y - 0.5) * -12;
    const rotateY = (x - 0.5) * 12;
    cardRef.current.style.transform =
      `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.04, 1.04, 1.02)`;
    cardRef.current.style.transition = "transform 0.1s ease-out";
    if (glowRef.current) {
      glowRef.current.style.background =
        `radial-gradient(circle at ${x * 100}% ${y * 100}%, rgba(255, 23, 68, 0.5) 0%, rgba(255, 23, 68, 0.18) 30%, rgba(255, 23, 68, 0.05) 55%, transparent 75%)`;
    }
  }

  function handleMouseLeave() {
    cachedRect.current = null;
    if (cardRef.current) {
      cardRef.current.style.transform = "perspective(800px) rotateX(0deg) rotateY(0deg)";
      cardRef.current.style.transition = "transform 0.4s ease-out";
    }
    if (glowRef.current) {
      glowRef.current.style.background =
        "radial-gradient(circle at 50% 50%, rgba(255, 23, 68, 0.35) 0%, rgba(255, 23, 68, 0.12) 30%, rgba(255, 23, 68, 0.04) 55%, transparent 75%)";
    }
  }

  if (isTouchDevice) {
    return <div className="relative group">{children}</div>;
  }

  return (
    <div
      ref={cardRef}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative group"
      style={{
        transform: "perspective(800px) rotateX(0deg) rotateY(0deg)",
        transition: "transform 0.4s ease-out",
      }}
    >
      {/* Dynamic glow that follows cursor — ref-based, no re-renders */}
      <div
        ref={glowRef}
        className="absolute -inset-2 rounded-hero opacity-40 group-hover:opacity-70 transition-opacity duration-500 pointer-events-none z-0"
        style={{
          background: "radial-gradient(circle at 50% 50%, rgba(255, 23, 68, 0.35) 0%, rgba(255, 23, 68, 0.12) 30%, rgba(255, 23, 68, 0.04) 55%, transparent 75%)",
          backfaceVisibility: "hidden",
          transform: "translateZ(0) scale(1.5)",
          transition: "background 0.4s ease-out",
        }}
        aria-hidden="true"
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

const parallaxOffsets: [number, number][] = [
  [20, -20],   // index 0: move less
  [40, -40],   // index 1: move more
  [30, -30],   // index 2: medium
  [20, -20],   // index 3: move less
  [40, -40],   // index 4: move more
  [30, -30],   // index 5: medium
];

export default function Showcase() {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  // Each hook must be called unconditionally (Rules of Hooks), but we can keep them DRY
  const t0 = useTransform(scrollYProgress, [0, 1], parallaxOffsets[0]);
  const t1 = useTransform(scrollYProgress, [0, 1], parallaxOffsets[1]);
  const t2 = useTransform(scrollYProgress, [0, 1], parallaxOffsets[2]);
  const t3 = useTransform(scrollYProgress, [0, 1], parallaxOffsets[3]);
  const t4 = useTransform(scrollYProgress, [0, 1], parallaxOffsets[4]);
  const t5 = useTransform(scrollYProgress, [0, 1], parallaxOffsets[5]);
  const transforms = [t0, t1, t2, t3, t4, t5];

  return (
    <section ref={sectionRef} id="work" className="py-16 sm:py-24 lg:py-32" aria-labelledby="showcase-heading">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7, ease: EASE }}
          className="text-center mb-16"
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
              Selected Work
            </p>
            <h2
              id="showcase-heading"
              className="font-heading font-bold text-2xl sm:text-3xl md:text-4xl lg:text-5xl text-text-primary metallic-text"
            >
              Engineered for Impact
            </h2>
          </div>
        </motion.div>

        {/* Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 lg:gap-8"
        >
          {SHOWCASE_ITEMS.map((item, index) => (
            <motion.div
              key={item.label}
              variants={itemVariants}
              style={{ y: transforms[index] }}
              className={index === 0 ? "sm:col-span-2 lg:col-span-2" : ""}
            >
              <TiltCard>
                <div className="relative gothic-card neon-glow-border rounded-card overflow-hidden">
                  {"category" in item && item.category && (
                    <span className="absolute top-3 right-3 z-20 px-2.5 py-1 text-[10px] font-heading font-semibold uppercase tracking-wider text-neon text-neon-glow-subtle bg-neon/10 border border-neon/20 rounded-full backdrop-blur-sm shadow-[0_0_10px_rgba(255,23,68,0.15)]">
                      {item.category}
                    </span>
                  )}
                  {index === 0 && (
                    <span className="absolute top-3 left-3 z-20 px-2.5 py-1 text-[10px] font-heading font-semibold uppercase tracking-wider text-neon bg-neon/[0.08] border border-neon/20 rounded-full backdrop-blur-sm shadow-[0_0_12px_rgba(255,23,68,0.3)]">
                      Featured
                    </span>
                  )}
                  <DeviceMockup label={item.label} description={item.description} />
                </div>
              </TiltCard>
            </motion.div>
          ))}
        </motion.div>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="text-center mt-12 text-sm text-text-caption"
        >
          Every project is custom-built from scratch. No templates. No shortcuts.
        </motion.p>
      </div>
    </section>
  );
}
