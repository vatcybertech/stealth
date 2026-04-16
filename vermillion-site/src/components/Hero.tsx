"use client";

import React, { memo, useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import MagneticButton from "@/components/MagneticButton";
import { EASE } from "@/lib/constants";

const headlineLine1 = "Precision".split(" ");
const headlineLine2 = "Engineered".split(" ");
const headlineLine3 = "Software".split(" ");

/* Orb configuration type */
interface OrbConfig {
  top?: string;
  left?: string;
  right?: string;
  bottom?: string;
  size: number;
  duration: number;
  delay: number;
  color: string;
  opacity: number[];
}

/* Breathing ambient orbs — neon crimson, using radial gradients instead of blur filters */
const ambientOrbs: OrbConfig[] = [
  { top: "2%", left: "5%", size: 700, duration: 9, delay: 0, color: "rgba(255,23,68,0.10)", opacity: [0.04, 0.18, 0.04] },
  { top: "45%", right: "2%", size: 120, duration: 5, delay: 1.5, color: "rgba(255,23,68,0.14)", opacity: [0.06, 0.22, 0.06] },
  { bottom: "8%", left: "2%", size: 280, duration: 7, delay: 1, color: "rgba(255,23,68,0.09)", opacity: [0.04, 0.2, 0.04] },
  { top: "20%", right: "15%", size: 550, duration: 13, delay: 3, color: "rgba(255,23,68,0.06)", opacity: [0.03, 0.1, 0.03] },
  { top: "65%", left: "35%", size: 90, duration: 4, delay: 0.5, color: "rgba(255,23,68,0.16)", opacity: [0.08, 0.28, 0.08] },
];

/* Parse rgba color to extract r,g,b,a for radial gradient replacement */
function orbGradient(color: string, size: number): { background: string; renderSize: number } {
  const renderSize = Math.round(size * 2.5);
  return {
    background: `radial-gradient(circle, ${color} 0%, ${color.replace(/[\d.]+\)$/, (m) => `${parseFloat(m) * 0.5})`)} 35%, transparent 70%)`,
    renderSize,
  };
}

/* Gothic ornamental corner SVG */
const GothicCorner = memo(function GothicCorner({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="120"
      height="120"
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M2 118 L2 40 Q2 12 28 2 L118 2" stroke="rgba(192,192,192,0.2)" strokeWidth="1.5" fill="none" />
      <path d="M10 110 L10 46 Q10 20 34 10 L110 10" stroke="rgba(192,192,192,0.12)" strokeWidth="0.75" fill="none" />
      <path d="M18 102 L18 50 Q18 28 40 18 L102 18" stroke="rgba(192,192,192,0.07)" strokeWidth="0.5" fill="none" />
      <path d="M2 40 L8 34 L2 28" stroke="rgba(192,192,192,0.2)" strokeWidth="1" fill="none" />
      <path d="M2 56 L5 52 L2 48" stroke="rgba(192,192,192,0.12)" strokeWidth="0.75" fill="none" />
      <path d="M40 2 L34 8 L28 2" stroke="rgba(192,192,192,0.2)" strokeWidth="1" fill="none" />
      <circle cx="2" cy="2" r="3" fill="rgba(192,192,192,0.18)" />
      <path d="M16 2 Q16 16 2 16" stroke="rgba(192,192,192,0.15)" strokeWidth="0.75" fill="none" />
      <line x1="2" y1="8" x2="8" y2="2" stroke="rgba(192,192,192,0.1)" strokeWidth="0.5" />
      <circle cx="24" cy="24" r="4" stroke="rgba(192,192,192,0.08)" strokeWidth="0.5" fill="none" />
      <circle cx="24" cy="24" r="2" stroke="rgba(192,192,192,0.06)" strokeWidth="0.4" fill="none" />
    </svg>
  );
});

/* Animated ornamental corner brackets for headline area */
const HeadlineBracket = memo(function HeadlineBracket({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <motion.svg
      className={`w-8 h-8 sm:w-[52px] sm:h-[52px] ${className || ""}`}
      style={style}
      viewBox="0 0 52 52"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      initial={{ opacity: 0, scale: 0.3 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 1, delay: 1.8, ease: EASE }}
    >
      <path d="M2 50 L2 10 Q2 2 10 2 L50 2" stroke="rgba(200,200,200,0.35)" strokeWidth="1.5" fill="none" />
      <path d="M7 45 L7 12 Q7 7 12 7 L45 7" stroke="rgba(200,200,200,0.18)" strokeWidth="0.75" fill="none" />
      <circle cx="2" cy="2" r="2" fill="rgba(200,200,200,0.3)" />
      <motion.circle
        cx="7" cy="7" r="1"
        fill="rgba(255,23,68,0.5)"
        animate={{ opacity: [0.3, 0.8, 0.3] }}
        transition={{ duration: 2, repeat: 3, ease: "easeInOut", delay: 2.5 }}
      />
      <line x1="2" y1="18" x2="5" y2="15" stroke="rgba(200,200,200,0.15)" strokeWidth="0.5" />
      <line x1="18" y1="2" x2="15" y2="5" stroke="rgba(200,200,200,0.15)" strokeWidth="0.5" />
    </motion.svg>
  );
});

/* Scan line sweep effect */
const ScanLine = memo(function ScanLine() {
  return (
    <motion.div
      className="absolute left-0 right-0 h-[3px] pointer-events-none z-20"
      style={{
        background: "linear-gradient(90deg, transparent 0%, rgba(255,23,68,0.1) 10%, rgba(255,23,68,0.25) 30%, rgba(255,23,68,0.5) 50%, rgba(255,23,68,0.25) 70%, rgba(255,23,68,0.1) 90%, transparent 100%)",
        boxShadow: "0 0 30px rgba(255,23,68,0.4), 0 0 80px rgba(255,23,68,0.15), 0 -4px 16px rgba(255,23,68,0.1), 0 4px 16px rgba(255,23,68,0.1)",
      }}
      initial={{ top: "-3px", opacity: 1 }}
      animate={{ top: ["0%", "100%"], opacity: [1, 1, 0] }}
      transition={{
        duration: 3.5,
        ease: "linear",
      }}
    />
  );
});

/* Dramatic vertical neon line — PERFECTLY CENTERED with the logo */
const VerticalNeonLine = memo(function VerticalNeonLine() {
  return (
    <div className="absolute top-0 left-1/2 z-10 pointer-events-none" style={{ transform: "translateX(-50%)" }} aria-hidden="true">
      <motion.div
        className="w-[1px] origin-top"
        style={{
          background: "linear-gradient(180deg, rgba(255,23,68,0.8) 0%, rgba(255,23,68,0.4) 40%, rgba(255,23,68,0.15) 70%, transparent 100%)",
          boxShadow: "0 0 12px rgba(255,23,68,0.5), 0 0 30px rgba(255,23,68,0.25), 0 0 60px rgba(255,23,68,0.12), 0 0 100px rgba(255,23,68,0.06)",
          margin: "0 auto",
        }}
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 240, opacity: 1 }}
        transition={{ duration: 1.8, delay: 0.2, ease: EASE }}
      />
      {/* Pulsing glow at the tip — centered on the 1px line */}
      <motion.div
        className="w-[5px] h-[5px] rounded-full"
        style={{
          background: "rgba(255,23,68,0.9)",
          boxShadow: "0 0 14px rgba(255,23,68,0.7), 0 0 35px rgba(255,23,68,0.4), 0 0 60px rgba(255,23,68,0.2)",
          marginLeft: "-2px",
        }}
        animate={{
          opacity: [0.3, 1, 0.3],
          scale: [1, 2.2, 1],
        }}
        transition={{ duration: 2.5, repeat: 5, ease: "easeInOut" }}
      />
      {/* Drip trail beneath the tip */}
      <motion.div
        className="w-[1px] origin-top"
        style={{
          background: "linear-gradient(180deg, rgba(255,23,68,0.3) 0%, transparent 100%)",
        }}
        initial={{ height: 0 }}
        animate={{ height: [0, 60, 0] }}
        transition={{ duration: 3, repeat: 3, ease: "easeInOut", delay: 2 }}
      />
    </div>
  );
});

/* AnimatedBackground — ref-based scroll, radial gradient orbs (no blur filter) */
const AnimatedBackground = memo(function AnimatedBackground() {
  const gridRef = useRef<HTMLDivElement>(null);
  const rafId = useRef<number | null>(null);
  const [showOrbs, setShowOrbs] = useState(true);

  useEffect(() => {
    const onScroll = () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(() => {
        if (gridRef.current) {
          gridRef.current.style.transform = `translateY(${window.scrollY * 0.1}px)`;
        }
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, []);

  /* Disable orbs on mobile to save GPU/battery */
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    setShowOrbs(mq.matches);
    const handler = (e: MediaQueryListEvent) => setShowOrbs(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden" style={{ contain: "paint" }} aria-hidden="true">
      {/* Deep black base */}
      <div className="absolute inset-0" style={{ background: "#050505" }} />

      {/* Animated gradient mesh */}
      <div
        className="absolute inset-0 opacity-50"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% 40%, rgba(255,23,68,0.09), transparent 70%), " +
            "radial-gradient(ellipse 40% 60% at 15% 60%, rgba(255,23,68,0.05), transparent 50%), " +
            "radial-gradient(ellipse 50% 40% at 85% 30%, rgba(255,23,68,0.06), transparent 60%), " +
            "radial-gradient(ellipse 30% 30% at 50% 80%, rgba(255,23,68,0.04), transparent 50%)",
          backgroundSize: "200% 200%",
          animation: "gradient-shift 8s ease infinite",
        }}
      />

      {/* Gothic cathedral vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 55% 45% at 50% 50%, transparent 20%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0.85) 75%, rgba(0,0,0,0.97) 100%)",
        }}
      />

      {/* Secondary vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.7) 0%, transparent 20%, transparent 80%, rgba(0,0,0,0.7) 100%)",
        }}
      />

      {/* Grid lines with scroll parallax — ref-based, no React re-renders */}
      <div
        ref={gridRef}
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,23,68,0.4) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,23,68,0.4) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Diagonal cross-hatch overlay */}
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `
            linear-gradient(45deg, rgba(192,192,192,0.3) 1px, transparent 1px),
            linear-gradient(-45deg, rgba(192,192,192,0.3) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}
      />

      {/* CRT scan line overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "repeating-linear-gradient(0deg, transparent, transparent 1.5px, rgba(255,23,68,0.025) 1.5px, rgba(255,23,68,0.025) 3px)",
          opacity: 0.4,
        }}
      />

      {/* Noise/grain texture via CSS */}
      <div
        className="absolute inset-0 pointer-events-none mix-blend-overlay opacity-[0.08]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.5'/%3E%3C/svg%3E")`,
          backgroundSize: "128px 128px",
        }}
      />

      {/* Breathing ambient orbs — radial gradient instead of blur-[120px] (disabled on mobile) */}
      {showOrbs && ambientOrbs.map((orb, i) => {
        const { background, renderSize } = orbGradient(orb.color, orb.size);
        return (
          <motion.div
            key={i}
            animate={{
              y: [0, i % 2 === 0 ? -30 : 22, 0],
              x: [0, i % 3 === 0 ? 15 : -12, 0],
              opacity: orb.opacity,
              scale: [1, 1.3, 1],
            }}
            transition={{ duration: orb.duration, repeat: Infinity, ease: EASE, delay: orb.delay }}
            className="absolute rounded-full"
            style={{
              top: orb.top,
              left: orb.left,
              right: orb.right,
              bottom: orb.bottom,
              width: renderSize,
              height: renderSize,
              background,
              backfaceVisibility: "hidden",
              transform: "translateZ(0)",
            }}
          />
        );
      })}
    </div>
  );
});

const WordReveal = memo(function WordReveal({
  words,
  startDelay,
  className,
}: {
  words: string[];
  startDelay: number;
  className?: string;
}) {
  return (
    <>
      {words.map((word, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 40, clipPath: "inset(100% 0 0 0)" }}
          animate={{ opacity: 1, y: 0, clipPath: "inset(0% 0 0 0)" }}
          transition={{
            duration: 0.6,
            delay: startDelay + i * 0.08,
            ease: EASE,
          }}
          className={className}
          style={{ display: "inline-block", marginRight: "0.3em" }}
        >
          {word}
        </motion.span>
      ))}
    </>
  );
});

const techStack = [
  "React", "Next.js", "TypeScript", "Node.js", "PostgreSQL", "Tailwind CSS",
  "GraphQL", "REST APIs", "Firebase", "Stripe", "AWS", "Progressive Web Apps",
  "React", "Next.js", "TypeScript", "Node.js", "PostgreSQL", "Tailwind CSS",
  "GraphQL", "REST APIs", "Firebase", "Stripe", "AWS", "Progressive Web Apps",
];

/* TechMarquee — CSS animation instead of Framer Motion for compositor thread */
const TechMarquee = memo(function TechMarquee() {
  return (
    <div className="relative w-screen left-1/2 -translate-x-1/2 overflow-hidden mt-8 sm:mt-16" aria-hidden="true">
      <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-bg to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-bg to-transparent z-10 pointer-events-none" />
      <div
        className="flex gap-8 whitespace-nowrap"
        style={{ animation: "marquee-left 30s linear infinite" }}
      >
        {techStack.map((tech, i) => (
          <span
            key={i}
            className="text-xs font-mono uppercase tracking-[0.25em] text-text-caption/50 flex items-center gap-8"
          >
            {tech}
            <span className="w-2 h-2 rounded-full bg-neon/50 shadow-[0_0_10px_rgba(255,23,68,0.5),0_0_20px_rgba(255,23,68,0.2)]" />
          </span>
        ))}
      </div>
    </div>
  );
});

const ShimmerButton = memo(function ShimmerButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="shimmer-btn relative overflow-hidden px-6 py-3 sm:px-8 sm:py-3.5 rounded-btn bg-vermillion text-white font-heading font-semibold text-sm tracking-wider uppercase hover:shadow-neon-md active:scale-[0.97] active:translate-y-[1px] transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon/50 focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
    >
      <span className="relative z-10">{children}</span>
      <span
        aria-hidden="true"
        className="absolute inset-0 z-0"
        style={{
          background:
            "linear-gradient(110deg, transparent 20%, rgba(255,255,255,0.15) 40%, rgba(255,255,255,0.25) 50%, rgba(255,255,255,0.15) 60%, transparent 80%)",
          backgroundSize: "200% 100%",
          animation: "shimmer 3s ease-in-out infinite",
        }}
      />
    </a>
  );
});

/* Gothic cathedral divider ornament */
const GothicDivider = memo(function GothicDivider({ delay }: { delay: number }) {
  return (
    <motion.div
      initial={{ scaleX: 0, opacity: 0 }}
      animate={{ scaleX: 1, opacity: 1 }}
      transition={{ duration: 1, delay, ease: EASE }}
      className="flex items-center justify-center gap-3 max-w-[320px] mx-auto mb-8"
    >
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-neon/40 to-neon/60 shadow-[0_0_10px_rgba(255,23,68,0.3)]" />
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-shrink-0">
        <path d="M8 1 L15 8 L8 15 L1 8 Z" stroke="rgba(255,23,68,0.5)" strokeWidth="1" fill="none" />
        <path d="M8 4 L12 8 L8 12 L4 8 Z" stroke="rgba(192,192,192,0.2)" strokeWidth="0.5" fill="none" />
        <motion.circle
          cx="8" cy="8" r="1.5"
          fill="rgba(255,23,68,0.6)"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2, repeat: 3, ease: "easeInOut" }}
        />
      </svg>
      <div className="flex-1 h-px bg-gradient-to-l from-transparent via-neon/40 to-neon/60 shadow-[0_0_10px_rgba(255,23,68,0.3)]" />
    </motion.div>
  );
});

export default function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end start"] });
  const headlineY = useTransform(scrollYProgress, [0, 1], [0, -120]);
  const logoDelay = 0.2;
  const glowDelay = logoDelay + 0.4;
  const wordBaseDelay = glowDelay + 0.7;
  const line2Delay = wordBaseDelay + headlineLine1.length * 0.08 + 0.05;
  const line3Delay = line2Delay + headlineLine2.length * 0.08 + 0.05;
  const accentLineDelay = line3Delay + headlineLine3.length * 0.08 + 0.1;
  const subtextDelay = accentLineDelay + 0.4;
  const ctaDelay = subtextDelay + 0.35;

  return (
    <section
      ref={sectionRef}
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      style={{ background: "#050505" }}
      aria-labelledby="hero-heading"
    >
      <AnimatedBackground />
      <ScanLine />
      <VerticalNeonLine />

      {/* Gothic Ornamental Corner Framing */}
      <div className="hidden sm:block absolute inset-0 pointer-events-none z-10" aria-hidden="true">
        <GothicCorner className="absolute top-4 left-4" />
        <GothicCorner className="absolute top-4 right-4 -scale-x-100" />
        <GothicCorner className="absolute bottom-4 left-4 -scale-y-100" />
        <GothicCorner className="absolute bottom-4 right-4 -scale-x-100 -scale-y-100" />

        <motion.div
          className="absolute top-4 left-[124px] right-[124px] h-px"
          style={{ background: "linear-gradient(90deg, rgba(192,192,192,0.15), rgba(192,192,192,0.05) 30%, rgba(192,192,192,0.05) 70%, rgba(192,192,192,0.15))" }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 1.5, delay: 0.5, ease: EASE }}
        />
        <motion.div
          className="absolute bottom-4 left-[124px] right-[124px] h-px"
          style={{ background: "linear-gradient(90deg, rgba(192,192,192,0.15), rgba(192,192,192,0.05) 30%, rgba(192,192,192,0.05) 70%, rgba(192,192,192,0.15))" }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 1.5, delay: 0.5, ease: EASE }}
        />
        <motion.div
          className="absolute left-4 top-[124px] bottom-[124px] w-px"
          style={{ background: "linear-gradient(180deg, rgba(192,192,192,0.15), rgba(192,192,192,0.05) 30%, rgba(192,192,192,0.05) 70%, rgba(192,192,192,0.15))" }}
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ duration: 1.5, delay: 0.6, ease: EASE }}
        />
        <motion.div
          className="absolute right-4 top-[124px] bottom-[124px] w-px"
          style={{ background: "linear-gradient(180deg, rgba(192,192,192,0.15), rgba(192,192,192,0.05) 30%, rgba(192,192,192,0.05) 70%, rgba(192,192,192,0.15))" }}
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ duration: 1.5, delay: 0.6, ease: EASE }}
        />
      </div>

      <motion.div className="relative z-10 max-w-5xl 2xl:max-w-6xl mx-auto px-4 sm:px-6 text-center" style={{ y: headlineY }}>
        {/* Full Logo — Dramatic Centered Reveal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, delay: logoDelay, ease: EASE }}
          className="relative mx-auto mb-4 sm:mb-8 w-[260px] sm:w-[420px] md:w-[480px] lg:w-[580px]"
        >
          {/* Intense multi-layer neon underglow */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.5, delay: glowDelay, ease: EASE }}
            className="absolute -inset-20 sm:-inset-28 lg:-inset-36 pointer-events-none"
            aria-hidden="true"
          >
            <div
              className="w-full h-full rounded-full"
              style={{
                background: "radial-gradient(ellipse at center, rgba(255,23,68,0.25) 0%, rgba(255,23,68,0.15) 20%, rgba(255,23,68,0.08) 40%, rgba(255,23,68,0.03) 60%, rgba(255,23,68,0.005) 80%, transparent 100%)",
                backfaceVisibility: "hidden",
                transform: "translateZ(0)",
              }}
            />
          </motion.div>
          {/* Tertiary rapid flicker glow */}
          <motion.div
            className="absolute -inset-6 sm:-inset-8 lg:-inset-12 pointer-events-none rounded-full"
            style={{
              background: "radial-gradient(ellipse at center, rgba(255,23,68,0.1) 0%, transparent 70%)",
            }}
            animate={{
              opacity: [0.1, 0.5, 0.05, 0.4, 0.1],
            }}
            transition={{ duration: 0.3, repeat: 5, ease: "linear", delay: glowDelay + 1 }}
            aria-hidden="true"
          />

          {/* The logo itself with flicker effect */}
          <motion.img
            src="/logo-full.svg"
            alt="Vermillion Axis Technologies"
            className="relative w-full h-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15, delay: logoDelay + 0.3 }}
            style={{
              animation: "neon-flicker 0.15s ease-in-out forwards",
              animationDelay: `${logoDelay + 0.3}s`,
            }}
          />
        </motion.div>

        {/* Headline area with animated ornamental corner brackets */}
        <div className="relative inline-block">
          <HeadlineBracket className="hidden sm:block absolute -top-5 -left-8 sm:-top-7 sm:-left-12" />
          <HeadlineBracket className="hidden sm:block absolute -top-5 -right-8 sm:-top-7 sm:-right-12" style={{ transform: "scaleX(-1)" }} />
          <HeadlineBracket className="hidden sm:block absolute -bottom-5 -left-8 sm:-bottom-7 sm:-left-12" style={{ transform: "scaleY(-1)" }} />
          <HeadlineBracket className="hidden sm:block absolute -bottom-5 -right-8 sm:-bottom-7 sm:-right-12" style={{ transform: "scale(-1, -1)" }} />

          <motion.div
            initial={{ scale: 1.04 }}
            animate={{ scale: 1 }}
            transition={{ duration: 1.4, ease: EASE }}
          >
            <h1
              id="hero-heading"
              className="font-heading font-bold text-text-primary leading-[1.05] tracking-[0.02em] mb-6"
              style={{ fontSize: "clamp(1.8rem, 5vw + 1rem, 7rem)" }}
            >
              <span className="block">
                <WordReveal words={headlineLine1} startDelay={wordBaseDelay} className="metallic-text" />
              </span>
              <span className="block">
                <WordReveal words={headlineLine2} startDelay={line2Delay} className="text-gradient-vermillion" />
              </span>
              <span className="block font-display">
                <WordReveal words={headlineLine3} startDelay={line3Delay} className="metallic-text" />
              </span>
            </h1>
          </motion.div>
        </div>

        <GothicDivider delay={accentLineDelay} />

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: subtextDelay, ease: EASE }}
          className="font-body text-[0.95rem] sm:text-lg md:text-xl text-text-secondary max-w-2xl mx-auto mb-6 sm:mb-10 leading-relaxed"
        >
          Systems architecture for organizations that refuse to compromise. Zero templates. Zero shortcuts. Every line written with surgical precision.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: ctaDelay, ease: EASE }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <MagneticButton><ShimmerButton href="#contact">Schedule a Consultation</ShimmerButton></MagneticButton>
          <MagneticButton>
            <a
              href="#work"
              className="px-6 py-3 sm:px-8 sm:py-3.5 rounded-btn border border-border text-text-primary font-heading font-semibold text-sm tracking-wider uppercase transition-all duration-300 hover:border-neon/50 hover:text-neon hover:shadow-neon-sm active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon/50"
            >
              View Our Work
            </a>
          </MagneticButton>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: ctaDelay + 0.5, ease: EASE }}
        >
          <TechMarquee />
        </motion.div>
      </motion.div>
    </section>
  );
}
