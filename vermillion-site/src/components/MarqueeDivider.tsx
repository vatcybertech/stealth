"use client";

interface MarqueeDividerProps {
  text?: string;
  speed?: number;
  direction?: "left" | "right";
}

export default function MarqueeDivider({
  text = "ENGINEERING EXCELLENCE",
  speed = 20,
  direction = "left",
}: MarqueeDividerProps) {
  const items = Array(8).fill(text);
  const duration = speed * 0.7;

  return (
    <div
      className="relative overflow-hidden py-5 sm:py-6 border-y border-neon/[0.08] bg-surface-1/20"
      style={{ boxShadow: "0 0 30px rgba(255,23,68,0.04), inset 0 0 30px rgba(255,23,68,0.02)" }}
      aria-hidden="true"
    >
      <div
        className="flex whitespace-nowrap"
        style={{
          animation: `${direction === "left" ? "marquee-left" : "marquee-right"} ${duration}s linear infinite`,
        }}
      >
        {items.map((item, i) => (
          <span
            key={i}
            className="flex items-center gap-6 sm:gap-8 mx-6 sm:mx-8 text-[0.65rem] sm:text-[0.7rem] md:text-xs font-heading font-semibold uppercase tracking-[0.4em] text-text-caption/40 select-none"
            style={{ textShadow: "0 0 16px rgba(255,23,68,0.25), 0 0 32px rgba(255,23,68,0.08)" }}
          >
            {item}
            <span className="w-1.5 h-1.5 rounded-full bg-neon/50 shadow-[0_0_12px_rgba(255,23,68,0.6),0_0_24px_rgba(255,23,68,0.2)] flex-shrink-0" />
          </span>
        ))}
      </div>
    </div>
  );
}
