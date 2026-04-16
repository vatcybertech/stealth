"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { FAQ_ITEMS, EASE } from "@/lib/constants";

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  function toggle(i: number) {
    setOpenIndex(openIndex === i ? null : i);
  }

  return (
    <section id="faq" className="py-16 sm:py-20 lg:py-24" aria-labelledby="faq-heading">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7, ease: EASE }}
          className="text-center mb-16"
        >
          <p className="text-xs tracking-[0.3em] text-neon uppercase font-heading mb-3">
            Common Questions
          </p>
          <h2
            id="faq-heading"
            className="font-heading font-bold text-2xl sm:text-3xl md:text-4xl lg:text-5xl text-text-primary"
          >
            Everything You Need to Know
          </h2>
        </motion.div>

        <div className="gothic-card neon-glow-border rounded-card p-4 sm:p-6 space-y-0">
          {FAQ_ITEMS.map((item, i) => {
            const isOpen = openIndex === i;
            const panelId = `faq-panel-${i}`;
            const buttonId = `faq-button-${i}`;

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05, duration: 0.5, ease: EASE }}
                className={`border-b border-neon/[0.06] transition-all duration-300 ${isOpen ? "border-l-2 border-l-neon shadow-[inset_4px_0_20px_rgba(255,23,68,0.15),0_0_25px_rgba(255,23,68,0.1),0_0_50px_rgba(255,23,68,0.04)] bg-neon/[0.03]" : ""}`}
              >
                <button
                  id={buttonId}
                  onClick={() => toggle(i)}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  className="w-full flex items-center justify-between py-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon/50 rounded"
                >
                  <span className="font-heading font-semibold text-sm sm:text-base text-text-primary pr-4">
                    {item.question}
                  </span>
                  <motion.span
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.3, ease: EASE }}
                    className="flex-shrink-0"
                  >
                    <ChevronDown className={`w-5 h-5 ${isOpen ? "text-neon" : "text-text-secondary"}`} aria-hidden="true" />
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      id={panelId}
                      role="region"
                      aria-labelledby={buttonId}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: EASE }}
                      className="overflow-hidden"
                    >
                      <p className="pb-5 text-text-body text-sm leading-relaxed">
                        {item.answer}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
