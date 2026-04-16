"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { NAV_LINKS, EASE } from "@/lib/constants";
import MagneticButton from "@/components/MagneticButton";

const sectionIds = ["work", "services", "pricing", "process", "contact"];

function NavLink({
  href,
  label,
  isActive,
}: {
  href: string;
  label: string;
  isActive: boolean;
}) {
  return (
    <a
      href={href}
      className={`relative text-sm font-body tracking-wide transition-colors duration-300 focus-visible:outline-none focus-visible:text-text-primary focus-visible:underline underline-offset-4 group ${
        isActive ? "text-neon" : "text-text-secondary hover:text-text-primary"
      }`}
    >
      {label}
      <span
        className="absolute left-0 -bottom-1 h-[1.5px] w-full bg-neon origin-left transition-transform duration-300 ease-out scale-x-0 group-hover:scale-x-100"
        style={{ transformOrigin: "left center" }}
        aria-hidden="true"
      />
      {isActive && (
        <motion.span
          layoutId="nav-active-underline"
          className="absolute left-0 -bottom-1 h-[1.5px] w-full bg-neon"
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
          aria-hidden="true"
        />
      )}
    </a>
  );
}

export default function Navigation() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("");
  const dialogRef = useRef<HTMLDivElement>(null);

  /* Scroll state for nav background */
  const scrollRafId = useRef<number | null>(null);
  useEffect(() => {
    const onScroll = () => {
      if (scrollRafId.current) cancelAnimationFrame(scrollRafId.current);
      scrollRafId.current = requestAnimationFrame(() => {
        setScrolled(window.scrollY > 60);
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (scrollRafId.current) cancelAnimationFrame(scrollRafId.current);
    };
  }, []);

  /* Active section tracking — single consolidated IntersectionObserver */
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: "-20% 0px -35% 0px", threshold: 0 }
    );

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  /* Sync active section from URL hash on mount */
  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash && sectionIds.includes(hash)) {
      setActiveSection(hash);
    }
  }, []);

  /* Lock body scroll when mobile menu is open */
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  /* Escape key closes mobile menu */
  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") setMobileOpen(false);
  }, []);

  useEffect(() => {
    if (mobileOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [mobileOpen, handleEscape]);

  useEffect(() => {
    if (!mobileOpen) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const focusable = dialog.querySelectorAll<HTMLElement>(
      'a[href], button, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    first?.focus();
    function handleTab(e: KeyboardEvent) {
      if (e.key !== "Tab") return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    }
    document.addEventListener("keydown", handleTab);
    return () => document.removeEventListener("keydown", handleTab);
  }, [mobileOpen]);

  return (
    <>
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: EASE }}
        aria-label="Main navigation"
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? "bg-surface-1/90 backdrop-blur-xl border-b border-neon/[0.1] shadow-[0_2px_40px_rgba(255,23,68,0.12),inset_0_-1px_0_rgba(255,23,68,0.15)]"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            <a
              href="#top"
              className="flex items-center gap-3 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon/50 rounded-lg"
              aria-label="Vermillion Axis Technologies — home"
            >
              <div className="relative">
                <img
                  src="/logo-mark.svg"
                  alt=""
                  className="w-10 h-10 group-hover:scale-110 transition-transform duration-300"
                  aria-hidden="true"
                />
                <span className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none bg-neon/25 blur-lg" aria-hidden="true" />
              </div>
              <span className="font-heading font-semibold text-text-primary text-sm tracking-[0.15em]">
                VERMILLION <span className="text-vermillion">AXIS</span>
              </span>
            </a>

            <div className="hidden md:flex items-center gap-8">
              {NAV_LINKS.map((link) => (
                <NavLink
                  key={link.href}
                  href={link.href}
                  label={link.label}
                  isActive={activeSection === link.href.replace("#", "")}
                />
              ))}
              <MagneticButton strength={0.25}>
                <a
                  href="#contact"
                  className="ml-2 px-6 py-3 rounded-btn bg-vermillion text-white text-sm font-heading font-semibold tracking-wider uppercase transition-all duration-300 hover:shadow-neon-md active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon/50 focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
                >
                  Start a Project
                </a>
              </MagneticButton>
            </div>

            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden relative w-11 h-11 flex flex-col items-center justify-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon/50 rounded"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
            >
              <motion.span animate={mobileOpen ? { rotate: 45, y: 6 } : { rotate: 0, y: 0 }} transition={{ duration: 0.3, ease: EASE }} className="block w-6 h-[1.5px] bg-text-primary origin-center" />
              <motion.span animate={mobileOpen ? { opacity: 0 } : { opacity: 1 }} transition={{ duration: 0.2, ease: EASE }} className="block w-6 h-[1.5px] bg-text-primary" />
              <motion.span animate={mobileOpen ? { rotate: -45, y: -6 } : { rotate: 0, y: 0 }} transition={{ duration: 0.3, ease: EASE }} className="block w-6 h-[1.5px] bg-text-primary origin-center" />
            </button>
          </div>
        </div>
      </motion.nav>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            ref={dialogRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="fixed inset-0 z-40 bg-bg/90 backdrop-blur-xl flex items-center justify-center"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
          >
            <nav className="flex flex-col items-center gap-8">
              {NAV_LINKS.map((link, i) => (
                <motion.a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + i * 0.05, ease: EASE }}
                  className={`relative text-2xl sm:text-3xl font-heading font-light tracking-widest focus-visible:outline-none focus-visible:text-neon group ${
                    activeSection === link.href.replace("#", "")
                      ? "text-neon"
                      : "text-text-primary"
                  }`}
                >
                  {link.label}
                  <span
                    className="absolute left-0 -bottom-1 h-[1.5px] w-full bg-neon origin-left transition-transform duration-300 ease-out scale-x-0 group-hover:scale-x-100"
                    aria-hidden="true"
                  />
                </motion.a>
              ))}
              <motion.a
                href="#contact"
                onClick={() => setMobileOpen(false)}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, ease: EASE }}
                className="mt-4 px-8 py-3 rounded-btn bg-vermillion text-white font-medium transition-all duration-300 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon/50"
                style={{
                  boxShadow: "0 0 25px rgba(255, 23, 68, 0.3)",
                }}
              >
                Start a Project
              </motion.a>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
