import Navigation from "@/components/Navigation";
import ScrollProgress from "@/components/ScrollProgress";
import CursorSpotlight from "@/components/CursorSpotlight";
import Hero from "@/components/Hero";
import Stats from "@/components/Stats";
import ErrorBoundary from "@/components/ErrorBoundary";
import MarqueeDivider from "@/components/MarqueeDivider";
import Showcase from "@/components/Showcase";
import Services from "@/components/Services";
import Comparison from "@/components/Comparison";
import Features from "@/components/Features";
import Process from "@/components/Process";
import Testimonials from "@/components/Testimonials";
import FAQ from "@/components/FAQ";
import CTA from "@/components/CTA";
import ImpactStatement from "@/components/ImpactStatement";
import Footer from "@/components/Footer";

/* Gothic ornamental section separator — wrought iron centerpiece between key sections */
function OrnamentalDivider() {
  return (
    <div className="relative py-5 sm:py-8 lg:py-12 flex items-center justify-center" aria-hidden="true">
      {/* Left gradient line */}
      <div
        className="flex-1 h-px max-w-[200px] sm:max-w-[300px]"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(192,192,192,0.15) 40%, rgba(var(--neon),0.2))",
        }}
      />
      {/* Central ornament */}
      <div className="mx-4 sm:mx-6 relative">
        <svg
          width="48"
          height="48"
          viewBox="0 0 48 48"
          fill="none"
          className="opacity-50"
        >
          {/* Outer diamond */}
          <path
            d="M24 2 L46 24 L24 46 L2 24 Z"
            stroke="rgba(192,192,192,0.25)"
            strokeWidth="0.75"
            fill="none"
          />
          {/* Inner diamond */}
          <path
            d="M24 10 L38 24 L24 38 L10 24 Z"
            stroke="rgba(var(--neon),0.2)"
            strokeWidth="0.5"
            fill="none"
          />
          {/* Cross */}
          <line
            x1="24"
            y1="6"
            x2="24"
            y2="42"
            stroke="rgba(192,192,192,0.12)"
            strokeWidth="0.5"
          />
          <line
            x1="6"
            y1="24"
            x2="42"
            y2="24"
            stroke="rgba(192,192,192,0.12)"
            strokeWidth="0.5"
          />
          {/* Center glow dot */}
          <circle cx="24" cy="24" r="2" fill="rgba(var(--neon),0.35)">
            <animate attributeName="opacity" values="0.35;0.7;0.35" dur="3s" repeatCount="indefinite" />
          </circle>
          <circle cx="24" cy="24" r="4" fill="none" stroke="rgba(var(--neon),0.12)" strokeWidth="0.5">
            <animate attributeName="r" values="4;5;4" dur="3s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.12;0.25;0.12" dur="3s" repeatCount="indefinite" />
          </circle>
          {/* Corner dots */}
          <circle cx="24" cy="2" r="1.5" fill="rgba(192,192,192,0.2)" />
          <circle cx="46" cy="24" r="1.5" fill="rgba(192,192,192,0.2)" />
          <circle cx="24" cy="46" r="1.5" fill="rgba(192,192,192,0.2)" />
          <circle cx="2" cy="24" r="1.5" fill="rgba(192,192,192,0.2)" />
        </svg>
      </div>
      {/* Right gradient line */}
      <div
        className="flex-1 h-px max-w-[200px] sm:max-w-[300px]"
        style={{
          background:
            "linear-gradient(90deg, rgba(var(--neon),0.2), rgba(192,192,192,0.15) 60%, transparent)",
        }}
      />
    </div>
  );
}

export default function Home() {
  return (
    <div id="top" className="page-bg">
      {/* Circuit pattern overlay */}
      <div className="circuit-overlay" aria-hidden="true" />
      {/* Edge vignette for cathedral depth */}
      <div className="page-vignette" aria-hidden="true" />

      <main id="main-content" className="relative" aria-label="Vermillion Axis Technologies">
        <ErrorBoundary><CursorSpotlight /></ErrorBoundary>
        <ScrollProgress />
        <Navigation />
        <ErrorBoundary><Hero /></ErrorBoundary>
        <Stats />
        <MarqueeDivider text="CUSTOM SOFTWARE" speed={25} direction="left" />
        <ErrorBoundary><Showcase /></ErrorBoundary>
        <OrnamentalDivider />
        <div className="relative">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_50%,rgba(var(--neon),0.03),transparent_70%)] pointer-events-none" aria-hidden="true" />
          <Services />
        </div>
        <MarqueeDivider text="FULL OWNERSHIP" speed={30} direction="right" />
        <Comparison />
        <OrnamentalDivider />
        <div className="relative">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_30%_50%,rgba(var(--neon),0.025),transparent_60%)] pointer-events-none" aria-hidden="true" />
          <Features />
        </div>
        <Process />
        <ImpactStatement />
        <MarqueeDivider text="SHIPPED IN DAYS" speed={22} direction="left" />
        <div className="relative">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_45%_at_70%_50%,rgba(var(--neon),0.03),transparent_65%)] pointer-events-none" aria-hidden="true" />
          <Testimonials />
        </div>
        <OrnamentalDivider />
        <FAQ />
        <div className="relative">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_60%_at_50%_40%,rgba(var(--neon),0.04),transparent_70%)] pointer-events-none" aria-hidden="true" />
          <ErrorBoundary><CTA /></ErrorBoundary>
        </div>
        <Footer />
      </main>
    </div>
  );
}
