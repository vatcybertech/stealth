"use client";

import React, { memo } from "react";

interface DeviceMockupProps {
  label: string;
  image?: string;
  description?: string;
}

/* ── Abstract SVG mockup screens keyed by showcase label ── */

const CoachingPlatformMockup = memo(function CoachingPlatformMockup() {
  return (
    <svg viewBox="0 0 320 200" className="w-full h-full" aria-hidden="true">
      <defs>
        <linearGradient id="coachGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FF1744" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#080808" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="silverBar" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#333" />
          <stop offset="50%" stopColor="#555" />
          <stop offset="100%" stopColor="#333" />
        </linearGradient>
        <linearGradient id="heroGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FF1744" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#080808" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="320" height="200" fill="#080808" />
      {/* Sidebar */}
      <rect x="0" y="0" width="44" height="200" fill="#0C0C0C" />
      <rect x="44" y="0" width="0.5" height="200" fill="#1A1A1A" />
      <rect x="0" y="10" width="2" height="12" rx="1" fill="#FF1744" />
      {/* Logo area */}
      <circle cx="22" cy="16" r="8" fill="#FF1744" opacity="0.9" />
      <text x="22" y="16" fill="#fff" fontSize="6" fontFamily="system-ui, sans-serif" textAnchor="middle" dominantBaseline="middle" fontWeight="bold">B</text>
      {/* Nav icons */}
      {[38, 54, 70, 86, 102, 118].map((y, i) => (
        <g key={`si${i}`}>
          <rect x="12" y={y} width="20" height="8" rx="2" fill={i === 0 ? "rgba(255,23,68,0.15)" : "#111"} stroke={i === 0 ? "#FF1744" : "none"} strokeWidth="0.3" />
          <rect x="16" y={y + 2.5} width="12" height="3" rx="1.5" fill={i === 0 ? "#FF1744" : "#333"} opacity={i === 0 ? 0.9 : 0.5} />
        </g>
      ))}
      {/* User avatar bottom */}
      <circle cx="22" cy="182" r="7" fill="#111" stroke="#333" strokeWidth="0.5" />
      <text x="22" y="182" fill="#888" fontSize="4.5" fontFamily="system-ui, sans-serif" textAnchor="middle" dominantBaseline="middle" fontWeight="bold">ME</text>
      <circle cx="28" cy="177" r="2" fill="#4CAF50" />
      {/* Top bar */}
      <rect x="44" y="0" width="276" height="26" fill="#0E0E0E" />
      <rect x="44" y="26" width="276" height="0.5" fill="url(#silverBar)" opacity="0.3" />
      <text x="56" y="10" fill="#E0E0E0" fontSize="5" fontFamily="system-ui, sans-serif" dominantBaseline="middle" fontWeight="700">Dashboard</text>
      <text x="56" y="19" fill="#666" fontSize="3" fontFamily="system-ui, sans-serif" dominantBaseline="middle">Big Mike Ely&apos;s Coaching Lab</text>
      {/* Search bar */}
      <rect x="200" y="6" width="80" height="14" rx="4" fill="#111" stroke="#1A1A1A" strokeWidth="0.3" />
      <text x="210" y="13" fill="#555" fontSize="3" fontFamily="system-ui, sans-serif" dominantBaseline="middle">Search...</text>
      {/* Notification bell */}
      <circle cx="290" cy="13" r="5" fill="#111" stroke="#1A1A1A" strokeWidth="0.3" />
      <circle cx="292" cy="10" r="1.5" fill="#FF1744" />
      {/* Stat cards with sparklines */}
      {[
        { x: 52, label: "ACTIVE CLIENTS", value: "48", color: "#E0E0E0", spark: "0,6 8,4 16,5 24,2 32,3 40,1" },
        { x: 118, label: "REVENUE", value: "$12.8K", color: "#FF1744", spark: "0,6 8,5 16,3 24,4 32,2 40,1" },
        { x: 184, label: "SESSIONS", value: "127", color: "#C0C0C0", spark: "0,4 8,5 16,3 24,2 32,4 40,1" },
        { x: 250, label: "RETENTION", value: "96%", color: "#FF1744", spark: "0,3 8,4 16,2 24,3 32,1 40,1" },
      ].map((s, i) => (
        <g key={`sc${i}`}>
          <rect x={s.x} y="32" width="60" height="36" rx="4" fill="#0C0C0C" stroke="#1A1A1A" strokeWidth="0.5" />
          <text x={s.x + 6} y="40" fill="#555" fontSize="2.5" fontFamily="system-ui, sans-serif" dominantBaseline="middle" letterSpacing="0.6">{s.label}</text>
          <text x={s.x + 6} y="52" fill={s.color} fontSize="9" fontFamily="system-ui, sans-serif" dominantBaseline="middle" fontWeight="bold">{s.value}</text>
          {/* Sparkline */}
          <polyline points={s.spark.split(" ").map(p => { const [px,py] = p.split(","); return `${s.x + 34 + Number(px) * 0.55},${44 + Number(py) * 1.5}`; }).join(" ")} fill="none" stroke={s.color} strokeWidth="0.8" strokeLinecap="round" opacity="0.6" className="animate-line-draw" style={{ "--line-length": 150 } as React.CSSProperties} />
          {/* Trend arrow */}
          <text x={s.x + 52} y="62" fill="#4CAF50" fontSize="2.5" fontFamily="system-ui, sans-serif" dominantBaseline="middle">▲</text>
        </g>
      ))}
      {/* Revenue chart */}
      <rect x="52" y="74" width="172" height="72" rx="4" fill="#0C0C0C" stroke="#1A1A1A" strokeWidth="0.5" />
      <text x="60" y="83" fill="#888" fontSize="3.5" fontFamily="system-ui, sans-serif" dominantBaseline="middle" fontWeight="600">Revenue Trend</text>
      <text x="180" y="83" fill="#555" fontSize="2.5" fontFamily="system-ui, sans-serif" dominantBaseline="middle">Last 30 days</text>
      {/* Y-axis labels */}
      {["$15K", "$10K", "$5K", "$0"].map((l, i) => (
        <text key={`yl${i}`} x="58" y={92 + i * 12} fill="#444" fontSize="2" fontFamily="system-ui, sans-serif" dominantBaseline="middle">{l}</text>
      ))}
      {[92, 104, 116, 128].map((y) => (
        <line key={`gl${y}`} x1="72" y1={y} x2="218" y2={y} stroke="#1A1A1A" strokeWidth="0.25" />
      ))}
      <polyline points="76,126 88,122 100,124 112,116 124,112 136,115 148,108 160,104 172,100 184,97 196,94 208,90 216,86" fill="none" stroke="#FF1744" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="76,126 88,122 100,124 112,116 124,112 136,115 148,108 160,104 172,100 184,97 196,94 208,90 216,86 216,136 76,136" fill="url(#coachGrad)" stroke="none" />
      {/* Secondary line (sessions) */}
      <polyline points="76,128 88,126 100,125 112,122 124,120 136,118 148,117 160,116 172,114 184,112 196,110 208,108 216,106" fill="none" stroke="#C0C0C0" strokeWidth="0.6" strokeLinecap="round" strokeDasharray="2 2" opacity="0.4" />
      {/* Client data table */}
      <rect x="230" y="74" width="82" height="72" rx="4" fill="#0C0C0C" stroke="#1A1A1A" strokeWidth="0.5" />
      <text x="238" y="83" fill="#888" fontSize="3" fontFamily="system-ui, sans-serif" dominantBaseline="middle" fontWeight="600">Top Clients</text>
      {[
        { name: "Sarah M.", pct: 92, color: "#FF1744" },
        { name: "John D.", pct: 87, color: "#C0C0C0" },
        { name: "Alex K.", pct: 78, color: "#C0C0C0" },
        { name: "Lisa R.", pct: 95, color: "#FF1744" },
      ].map((c, i) => (
        <g key={`cl${i}`}>
          <text x="238" y={94 + i * 13} fill="#C0C0C0" fontSize="2.8" fontFamily="system-ui, sans-serif" dominantBaseline="middle">{c.name}</text>
          <rect x="268" y={91 + i * 13} width="36" height="4" rx="2" fill="#111" />
          <rect x="268" y={91 + i * 13} width={36 * c.pct / 100} height="4" rx="2" fill={c.color} opacity="0.7" />
          <text x="306" y={94 + i * 13} fill="#666" fontSize="2.2" fontFamily="system-ui, sans-serif" textAnchor="end" dominantBaseline="middle">{c.pct}%</text>
        </g>
      ))}
      {/* Bottom: schedule strip */}
      <rect x="52" y="152" width="258" height="38" rx="4" fill="#0C0C0C" stroke="#1A1A1A" strokeWidth="0.5" />
      <text x="60" y="161" fill="#888" fontSize="3" fontFamily="system-ui, sans-serif" dominantBaseline="middle" fontWeight="600">Today&apos;s Schedule</text>
      <text x="302" y="161" fill="#FF1744" fontSize="2.5" fontFamily="system-ui, sans-serif" textAnchor="end" dominantBaseline="middle">View All →</text>
      {/* Day pills */}
      {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
        <g key={`day${i}`}>
          <rect x={60 + i * 20} y="167" width="14" height="14" rx="3" fill={i === 2 ? "#FF1744" : "#111"} stroke={i === 2 ? "none" : "#1A1A1A"} strokeWidth="0.3" />
          <text x={67 + i * 20} y="174" fill={i === 2 ? "#fff" : "#666"} fontSize="3" fontFamily="system-ui, sans-serif" textAnchor="middle" dominantBaseline="middle" fontWeight={i === 2 ? "bold" : "normal"}>{d}</text>
          {/* Session dots */}
          {(i < 5) && <circle cx={67 + i * 20} cy="183" r="1" fill={i === 2 ? "#FF1744" : "#333"} />}
        </g>
      ))}
      {/* Upcoming session */}
      <rect x="210" y="167" width="94" height="18" rx="3" fill="#111" stroke="#FF1744" strokeWidth="0.3" />
      <text x="218" y="174" fill="#E0E0E0" fontSize="2.8" fontFamily="system-ui, sans-serif" dominantBaseline="middle" fontWeight="600">Sarah M. — 2:00 PM</text>
      <text x="218" y="181" fill="#555" fontSize="2.2" fontFamily="system-ui, sans-serif" dominantBaseline="middle">Strength Training</text>
    </svg>
  );
});

const AnalyticsDashboardMockup = memo(function AnalyticsDashboardMockup() {
  return (
    <svg viewBox="0 0 320 200" className="w-full h-full" aria-hidden="true">
      <defs>
        <linearGradient id="analyticsGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FF1744" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#080808" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="320" height="200" fill="#080808" />
      {/* Sidebar */}
      <rect x="0" y="0" width="42" height="200" fill="#0C0C0C" />
      <rect x="42" y="0" width="0.5" height="200" fill="#1A1A1A" />
      <rect x="0" y="28" width="2" height="10" rx="1" fill="#FF1744" />
      {[12, 28, 48, 68, 88, 108].map((y, i) => (
        <rect key={`an${i}`} x="11" y={y} width="20" height={i === 0 ? 10 : 6} rx={i === 0 ? 2 : 3} fill={i === 1 ? "#FF1744" : i === 0 ? "#111" : "#1A1A1A"} opacity={i === 1 ? 1 : i === 0 ? 0.8 : 0.5} />
      ))}
      {/* Top bar */}
      <rect x="42" y="0" width="278" height="24" fill="#0E0E0E" />
      <text x="54" y="9" fill="#E0E0E0" fontSize="5" fontFamily="system-ui, sans-serif" dominantBaseline="middle" fontWeight="bold">Analytics</text>
      <text x="54" y="18" fill="#555" fontSize="2.5" fontFamily="system-ui, sans-serif" dominantBaseline="middle">Command Center</text>
      {/* Date range + tabs */}
      <rect x="180" y="5" width="54" height="14" rx="4" fill="#111" stroke="#1A1A1A" strokeWidth="0.3" />
      <text x="196" y="12" fill="#888" fontSize="2.8" fontFamily="system-ui, sans-serif" dominantBaseline="middle">Mar 1–26</text>
      {["Daily", "Weekly", "Monthly"].map((t, i) => (
        <rect key={`tab${i}`} x={244 + i * 26} y="5" width="22" height="14" rx="3" fill={i === 1 ? "rgba(255,23,68,0.1)" : "#111"} stroke={i === 1 ? "#FF1744" : "#1A1A1A"} strokeWidth="0.3">
          <title>{t}</title>
        </rect>
      ))}
      {["D", "W", "M"].map((t, i) => (
        <text key={`tl${i}`} x={255 + i * 26} y="12" fill={i === 1 ? "#FF1744" : "#555"} fontSize="2.5" fontFamily="system-ui, sans-serif" textAnchor="middle" dominantBaseline="middle" fontWeight={i === 1 ? "bold" : "normal"}>{t}</text>
      ))}
      {/* Live dot */}
      <circle cx="306" cy="12" r="3" fill="#FF1744" opacity="0.7" />
      <text x="306" y="12" fill="#fff" fontSize="2" fontFamily="system-ui, sans-serif" textAnchor="middle" dominantBaseline="middle">●</text>
      {/* KPI cards */}
      {[
        { label: "MRR", value: "$42.8K", color: "#FF1744", change: "+12%", up: true },
        { label: "ACTIVE USERS", value: "3,847", color: "#C0C0C0", change: "+8%", up: true },
        { label: "CHURN RATE", value: "1.2%", color: "#FF1744", change: "-0.3%", up: false },
        { label: "NPS SCORE", value: "72", color: "#C0C0C0", change: "+5", up: true },
      ].map((kpi, i) => {
        const x = 50 + i * 66;
        return (
          <g key={`kpi${i}`} className="animate-kpi" style={{ animationDelay: `${0.1 + i * 0.15}s` }}>
            <rect x={x} y="28" width="60" height="36" rx="4" fill="#0C0C0C" stroke="#1A1A1A" strokeWidth="0.5" />
            <text x={x + 6} y="36" fill="#555" fontSize="2.2" fontFamily="system-ui, sans-serif" dominantBaseline="middle" letterSpacing="0.5">{kpi.label}</text>
            <text x={x + 6} y="48" fill={kpi.color} fontSize="8" fontFamily="system-ui, sans-serif" dominantBaseline="middle" fontWeight="bold">{kpi.value}</text>
            <text x={x + 6} y="58" fill={kpi.up ? "#4CAF50" : "#FF1744"} fontSize="2.5" fontFamily="system-ui, sans-serif" dominantBaseline="middle">{kpi.up ? "▲" : "▼"} {kpi.change}</text>
          </g>
        );
      })}
      {/* Main chart area */}
      <rect x="50" y="68" width="182" height="82" rx="4" fill="#0C0C0C" stroke="#1A1A1A" strokeWidth="0.5" />
      <text x="58" y="78" fill="#888" fontSize="3" fontFamily="system-ui, sans-serif" dominantBaseline="middle" fontWeight="600">Revenue Over Time</text>
      {/* X-axis labels */}
      {["Jan", "Feb", "Mar", "Apr", "May", "Jun"].map((m, i) => (
        <text key={`xl${i}`} x={72 + i * 26} y="144" fill="#444" fontSize="2" fontFamily="system-ui, sans-serif" textAnchor="middle" dominantBaseline="middle">{m}</text>
      ))}
      {[88, 100, 112, 124, 136].map((y) => (
        <line key={`gl${y}`} x1="64" y1={y} x2="226" y2={y} stroke="#1A1A1A" strokeWidth="0.2" />
      ))}
      <polyline
        points="68,130 82,126 96,127 110,118 124,112 138,115 152,108 166,103 180,99 194,95 208,92 222,86"
        fill="none" stroke="#FF1744" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"
        className="animate-line-draw"
        style={{ "--line-length": 200 } as React.CSSProperties}
      />
      <polyline points="68,130 82,126 96,127 110,118 124,112 138,115 152,108 166,103 180,99 194,95 208,92 222,86 222,140 68,140" fill="url(#analyticsGrad)" stroke="none" />
      {/* Donut chart panel */}
      <rect x="238" y="68" width="74" height="82" rx="4" fill="#0C0C0C" stroke="#1A1A1A" strokeWidth="0.5" />
      <text x="246" y="78" fill="#888" fontSize="3" fontFamily="system-ui, sans-serif" dominantBaseline="middle" fontWeight="600">Sources</text>
      {/* Donut arcs */}
      <circle cx="275" cy="108" r="18" fill="none" stroke="#1A1A1A" strokeWidth="6" />
      <circle cx="275" cy="108" r="18" fill="none" stroke="#FF1744" strokeWidth="6" strokeDasharray="45 68" strokeDashoffset="0" className="animate-donut" style={{ "--donut-offset": 0 } as React.CSSProperties} />
      <circle cx="275" cy="108" r="18" fill="none" stroke="#C0C0C0" strokeWidth="6" strokeDasharray="25 88" strokeDashoffset="-45" opacity="0.7" className="animate-donut" style={{ "--donut-offset": -45, animationDelay: "0.8s" } as React.CSSProperties} />
      <circle cx="275" cy="108" r="18" fill="none" stroke="#555" strokeWidth="6" strokeDasharray="18 95" strokeDashoffset="-70" opacity="0.5" className="animate-donut" style={{ "--donut-offset": -70, animationDelay: "1.0s" } as React.CSSProperties} />
      <text x="275" y="106" fill="#E0E0E0" fontSize="5" fontFamily="system-ui, sans-serif" textAnchor="middle" dominantBaseline="middle" fontWeight="bold">62%</text>
      <text x="275" y="113" fill="#555" fontSize="2" fontFamily="system-ui, sans-serif" textAnchor="middle" dominantBaseline="middle">Direct</text>
      {/* Legend */}
      {[
        { label: "Direct", color: "#FF1744", pct: "62%" },
        { label: "Organic", color: "#C0C0C0", pct: "24%" },
        { label: "Referral", color: "#555", pct: "14%" },
      ].map((l, i) => (
        <g key={`leg${i}`}>
          <rect x="246" y={132 + i * 6} width="4" height="3" rx="1" fill={l.color} />
          <text x="254" y={134 + i * 6} fill="#888" fontSize="2" fontFamily="system-ui, sans-serif" dominantBaseline="middle">{l.label}</text>
          <text x="306" y={134 + i * 6} fill="#666" fontSize="2" fontFamily="system-ui, sans-serif" textAnchor="end" dominantBaseline="middle">{l.pct}</text>
        </g>
      ))}
      {/* Data table */}
      <rect x="50" y="154" width="262" height="38" rx="4" fill="#0C0C0C" stroke="#1A1A1A" strokeWidth="0.5" />
      {/* Table header */}
      <text x="60" y="163" fill="#555" fontSize="2.2" fontFamily="system-ui, sans-serif" dominantBaseline="middle" fontWeight="bold">PAGE</text>
      <text x="180" y="163" fill="#555" fontSize="2.2" fontFamily="system-ui, sans-serif" dominantBaseline="middle" fontWeight="bold">VIEWS</text>
      <text x="220" y="163" fill="#555" fontSize="2.2" fontFamily="system-ui, sans-serif" dominantBaseline="middle" fontWeight="bold">CONV.</text>
      <text x="270" y="163" fill="#555" fontSize="2.2" fontFamily="system-ui, sans-serif" dominantBaseline="middle" fontWeight="bold">REVENUE</text>
      <line x1="56" y1="167" x2="306" y2="167" stroke="#1A1A1A" strokeWidth="0.3" />
      {[
        { page: "/dashboard", views: "12,847", conv: "4.2%", rev: "$18.4K" },
        { page: "/pricing", views: "8,234", conv: "7.8%", rev: "$12.1K" },
        { page: "/features", views: "6,112", conv: "3.1%", rev: "$8.2K" },
      ].map((r, i) => (
        <g key={`tr${i}`}>
          {i > 0 && <rect x="50" y={168 + i * 8} width="262" height="8" fill={i % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent"} />}
          <text x="60" y={172 + i * 8} fill="#C0C0C0" fontSize="2.5" fontFamily="system-ui, sans-serif" dominantBaseline="middle">{r.page}</text>
          <text x="180" y={172 + i * 8} fill="#888" fontSize="2.5" fontFamily="system-ui, sans-serif" dominantBaseline="middle">{r.views}</text>
          <text x="220" y={172 + i * 8} fill="#FF1744" fontSize="2.5" fontFamily="system-ui, sans-serif" dominantBaseline="middle">{r.conv}</text>
          <text x="270" y={172 + i * 8} fill="#E0E0E0" fontSize="2.5" fontFamily="system-ui, sans-serif" dominantBaseline="middle" fontWeight="bold">{r.rev}</text>
        </g>
      ))}
    </svg>
  );
});

const MemberPortalMockup = memo(function MemberPortalMockup() {
  return (
    <svg viewBox="0 0 320 200" className="w-full h-full" aria-hidden="true">
      <rect width="320" height="200" fill="#080808" />
      {/* Header */}
      <rect x="0" y="0" width="320" height="26" fill="#0E0E0E" />
      <rect x="12" y="7" width="18" height="12" rx="2" fill="#FF1744" />
      <text x="21" y="13" fill="#fff" fontSize="5" fontFamily="system-ui, sans-serif" textAnchor="middle" dominantBaseline="middle" fontWeight="bold">V</text>
      <text x="36" y="9" fill="#E0E0E0" fontSize="4" fontFamily="system-ui, sans-serif" dominantBaseline="middle" fontWeight="600">Welcome back, James</text>
      <text x="36" y="18" fill="#555" fontSize="2.5" fontFamily="system-ui, sans-serif" dominantBaseline="middle">Platinum Member · Active</text>
      {/* Nav tabs */}
      {["Overview", "Content", "Billing", "Settings"].map((t, i) => (
        <g key={`tab${i}`}>
          <text x={180 + i * 36} y="13" fill={i === 0 ? "#FF1744" : "#666"} fontSize="3" fontFamily="system-ui, sans-serif" textAnchor="middle" dominantBaseline="middle" fontWeight={i === 0 ? "bold" : "normal"}>{t}</text>
          {i === 0 && <rect x={166} y="22" width="28" height="1.5" rx="0.75" fill="#FF1744" />}
        </g>
      ))}
      {/* Profile card */}
      <rect x="12" y="32" width="120" height="80" rx="6" fill="#0C0C0C" stroke="#1A1A1A" strokeWidth="0.5" />
      <circle cx="72" cy="50" r="12" fill="#111" stroke="#C0C0C0" strokeWidth="0.6" />
      <text x="72" y="50" fill="#C0C0C0" fontSize="7" fontFamily="system-ui, sans-serif" textAnchor="middle" dominantBaseline="middle" fontWeight="bold">JC</text>
      <circle cx="81" cy="42" r="2.5" fill="#4CAF50" stroke="#0C0C0C" strokeWidth="0.5" />
      <text x="72" y="68" fill="#E0E0E0" fontSize="3.5" fontFamily="system-ui, sans-serif" textAnchor="middle" dominantBaseline="middle" fontWeight="bold">James Calloway</text>
      {/* Badges */}
      <g className="animate-kpi" style={{ animationDelay: "0.2s" }}>
        <rect x="42" y="74" width="28" height="8" rx="4" fill="rgba(255,23,68,0.1)" stroke="#FF1744" strokeWidth="0.3" />
        <text x="56" y="78" fill="#FF1744" fontSize="2.5" fontFamily="system-ui, sans-serif" textAnchor="middle" dominantBaseline="middle" fontWeight="bold">PLATINUM</text>
      </g>
      <g className="animate-kpi" style={{ animationDelay: "0.35s" }}>
        <rect x="74" y="74" width="20" height="8" rx="4" fill="rgba(192,192,192,0.08)" stroke="#888" strokeWidth="0.3" />
        <text x="84" y="78" fill="#888" fontSize="2.5" fontFamily="system-ui, sans-serif" textAnchor="middle" dominantBaseline="middle">LV 8</text>
      </g>
      {/* Progress */}
      <text x="24" y="92" fill="#555" fontSize="2.2" fontFamily="system-ui, sans-serif" dominantBaseline="middle">Course Progress</text>
      <rect x="24" y="96" width="96" height="4" rx="2" fill="#111" />
      <rect x="24" y="96" width="72" height="4" rx="2" fill="#FF1744" opacity="0.7" className="animate-kpi" style={{ animationDelay: "0.5s" }} />
      <text x="122" y="98" fill="#888" fontSize="2" fontFamily="system-ui, sans-serif" textAnchor="end" dominantBaseline="middle">75%</text>
      <text x="24" y="106" fill="#444" fontSize="2" fontFamily="system-ui, sans-serif" dominantBaseline="middle">Member since Jan 2025</text>
      {/* Activity feed */}
      <rect x="140" y="32" width="168" height="80" rx="6" fill="#0C0C0C" stroke="#1A1A1A" strokeWidth="0.5" />
      <text x="152" y="42" fill="#888" fontSize="2.5" fontFamily="system-ui, sans-serif" dominantBaseline="middle" fontWeight="bold" letterSpacing="0.5">RECENT ACTIVITY</text>
      {[
        { text: "Completed: Advanced Module 4", time: "2h ago", color: "#FF1744" },
        { text: "Payment processed — $99.00", time: "1d ago", color: "#4CAF50" },
        { text: "Downloaded: Resource Pack #12", time: "2d ago", color: "#C0C0C0" },
        { text: "Earned badge: Consistency", time: "4d ago", color: "#FFD700" },
      ].map((a, i) => (
        <g key={`act${i}`}>
          <circle cx="154" cy={56 + i * 14} r="1.5" fill={a.color} />
          <text x="160" y={56 + i * 14} fill="#C0C0C0" fontSize="2.8" fontFamily="system-ui, sans-serif" dominantBaseline="middle">{a.text}</text>
          <text x="302" y={56 + i * 14} fill="#555" fontSize="2" fontFamily="system-ui, sans-serif" textAnchor="end" dominantBaseline="middle">{a.time}</text>
        </g>
      ))}
      {/* Content cards */}
      <rect x="12" y="118" width="296" height="34" rx="4" fill="#0C0C0C" stroke="#1A1A1A" strokeWidth="0.5" />
      <text x="20" y="128" fill="#888" fontSize="2.5" fontFamily="system-ui, sans-serif" dominantBaseline="middle" fontWeight="bold" letterSpacing="0.5">CONTINUE LEARNING</text>
      {[
        { title: "Business Strategy", progress: 85, lessons: "12/14" },
        { title: "Growth Systems", progress: 42, lessons: "5/12" },
        { title: "Leadership", progress: 15, lessons: "2/10" },
      ].map((c, i) => (
        <g key={`cc${i}`}>
          <rect x={20 + i * 96} y="134" width="88" height="12" rx="3" fill="#111" stroke="#1A1A1A" strokeWidth="0.3" />
          <text x={26 + i * 96} y="140" fill="#C0C0C0" fontSize="2.5" fontFamily="system-ui, sans-serif" dominantBaseline="middle">{c.title}</text>
          <rect x={76 + i * 96} y="137" width="26" height="5" rx="2.5" fill="#0A0A0A" />
          <rect x={76 + i * 96} y="137" width={26 * c.progress / 100} height="5" rx="2.5" fill="#FF1744" opacity="0.6" />
        </g>
      ))}
      {/* Bottom stats */}
      <rect x="12" y="158" width="296" height="32" rx="4" fill="#0C0C0C" stroke="#1A1A1A" strokeWidth="0.5" />
      {[
        { x: 60, v: "127", l: "Days Active", c: "#E0E0E0" },
        { x: 135, v: "24", l: "Resources", c: "#FF1744" },
        { x: 210, v: "8", l: "Badges", c: "#FFD700" },
        { x: 270, v: "∞", l: "Access", c: "#C0C0C0" },
      ].map((s) => (
        <g key={s.l}>
          <text x={s.x} y="172" fill={s.c} fontSize="6" fontFamily="system-ui, sans-serif" textAnchor="middle" dominantBaseline="middle" fontWeight="bold">{s.v}</text>
          <text x={s.x} y="182" fill="#555" fontSize="2.5" fontFamily="system-ui, sans-serif" textAnchor="middle" dominantBaseline="middle">{s.l}</text>
        </g>
      ))}
    </svg>
  );
});

const ECommerceMockup = memo(function ECommerceMockup() {
  const products = [
    { name: "Chronograph Elite", price: "$2,490", rating: 5, reviews: "124" },
    { name: "Artisan Leather", price: "$1,850", rating: 4, reviews: "89" },
    { name: "Silk Noir Scarf", price: "$680", rating: 5, reviews: "201" },
    { name: "Carbon Aviators", price: "$920", rating: 4, reviews: "67" },
  ];
  return (
    <svg viewBox="0 0 320 200" className="w-full h-full" aria-hidden="true">
      <rect width="320" height="200" fill="#080808" />
      {/* Top nav */}
      <rect x="0" y="0" width="320" height="24" fill="#0E0E0E" />
      <text x="16" y="12" fill="#E0E0E0" fontSize="5" fontFamily="system-ui, sans-serif" dominantBaseline="middle" fontWeight="bold" letterSpacing="3">LUXE</text>
      <rect x="80" y="5" width="140" height="14" rx="7" fill="#0C0C0C" stroke="#1A1A1A" strokeWidth="0.4" />
      <text x="92" y="12" fill="#555" fontSize="3" fontFamily="system-ui, sans-serif" dominantBaseline="middle">Search products...</text>
      {/* Cart icon */}
      <rect x="280" y="5" width="26" height="14" rx="4" fill="#111" stroke="#1A1A1A" strokeWidth="0.3" />
      <text x="290" y="12" fill="#888" fontSize="3.5" fontFamily="system-ui, sans-serif" textAnchor="middle" dominantBaseline="middle">🛒</text>
      <circle cx="300" cy="7" r="3" fill="#FF1744" />
      <text x="300" y="7" fill="#fff" fontSize="2.5" fontFamily="system-ui, sans-serif" textAnchor="middle" dominantBaseline="middle" fontWeight="bold">3</text>
      {/* Category pills */}
      {["All", "New Arrivals", "Accessories", "Sale"].map((cat, i) => (
        <g key={`cat${i}`}>
          <rect x={60 + i * 52} y="29" width={i === 0 ? 24 : 46} height="12" rx="6" fill={i === 0 ? "#FF1744" : "#0C0C0C"} stroke={i === 0 ? "none" : "#1A1A1A"} strokeWidth="0.4" />
          <text x={60 + i * 52 + (i === 0 ? 12 : 23)} y="35" fill={i === 0 ? "#fff" : "#666"} fontSize="2.8" fontFamily="system-ui, sans-serif" textAnchor="middle" dominantBaseline="middle">{cat}</text>
        </g>
      ))}
      {/* Filter sidebar */}
      <rect x="0" y="24" width="54" height="176" fill="#0C0C0C" />
      <rect x="54" y="24" width="0.5" height="176" fill="#1A1A1A" />
      <text x="8" y="36" fill="#888" fontSize="2.5" fontFamily="system-ui, sans-serif" dominantBaseline="middle" fontWeight="bold" letterSpacing="0.5">FILTERS</text>
      {["Price", "Brand", "Color", "Size"].map((f, i) => (
        <g key={`filt${i}`}>
          <text x="8" y={50 + i * 18} fill="#C0C0C0" fontSize="2.5" fontFamily="system-ui, sans-serif" dominantBaseline="middle">{f}</text>
          <rect x="8" y={56 + i * 18} width="38" height="4" rx="2" fill="#111" />
          <rect x="8" y={56 + i * 18} width={20 + i * 4} height="4" rx="2" fill={i === 0 ? "#FF1744" : "#333"} opacity="0.5" />
        </g>
      ))}
      {/* Product grid 2x2 */}
      {products.map((p, i) => {
        const x = 60 + (i % 2) * 128;
        const y = 46 + Math.floor(i / 2) * 72;
        return (
          <g key={`prod${i}`}>
            <rect x={x} y={y} width="122" height="66" rx="4" fill="#0C0C0C" stroke="#1A1A1A" strokeWidth="0.5" />
            {/* Product image placeholder with gradient */}
            <rect x={x + 3} y={y + 3} width="116" height="26" rx="3" fill="#111" />
            <rect x={x + 3} y={y + 3} width="116" height="26" rx="3" fill="rgba(255,23,68,0.06)" />
            <rect x={x + 40} y={y + 12} width="36" height="8" rx="2" fill="#1A1A1A" />
            {/* Wishlist heart */}
            <text x={x + 111} y={y + 10} fill="#555" fontSize="4" fontFamily="system-ui, sans-serif" textAnchor="middle" dominantBaseline="middle">♡</text>
            {/* Product info */}
            <text x={x + 7} y={y + 37} fill="#E0E0E0" fontSize="3.5" fontFamily="system-ui, sans-serif" dominantBaseline="middle" fontWeight="bold">{p.name}</text>
            {/* Stars */}
            {[0, 1, 2, 3, 4].map((s) => (
              <circle key={`star${i}${s}`} cx={x + 9 + s * 5} cy={y + 44} r="1.5" fill={s < p.rating ? "#FF1744" : "#333"} />
            ))}
            <text x={x + 38} y={y + 44} fill="#555" fontSize="2" fontFamily="system-ui, sans-serif" dominantBaseline="middle">({p.reviews})</text>
            {/* Price + CTA */}
            <text x={x + 7} y={y + 55} fill="#FF1744" fontSize="4.5" fontFamily="system-ui, sans-serif" dominantBaseline="middle" fontWeight="bold">{p.price}</text>
            <rect x={x + 82} y={y + 48} width="32" height="12" rx="3" fill="#FF1744" />
            <text x={x + 98} y={y + 54} fill="#fff" fontSize="3" fontFamily="system-ui, sans-serif" textAnchor="middle" dominantBaseline="middle" fontWeight="bold">Add</text>
          </g>
        );
      })}
      {/* Footer */}
      <text x="190" y="194" fill="#555" fontSize="2.5" fontFamily="system-ui, sans-serif" textAnchor="middle" dominantBaseline="middle">Showing 4 of 128 products · Page 1 of 32</text>
    </svg>
  );
});

const EnterpriseCRMMockup = memo(function EnterpriseCRMMockup() {
  const stages = [
    { name: "Lead", count: 12, value: "$340K", color: "#666", cards: [
      { init: "A", name: "Acme Corp", deal: "$50K", pct: 20 },
      { init: "B", name: "BlueSky Inc", deal: "$85K", pct: 15 },
      { init: "N", name: "NexGen", deal: "$32K", pct: 10 },
    ]},
    { name: "Qualified", count: 8, value: "$480K", color: "#C0C0C0", cards: [
      { init: "C", name: "CloudNet", deal: "$120K", pct: 45 },
      { init: "D", name: "DataFlow", deal: "$95K", pct: 55 },
    ]},
    { name: "Proposal", count: 5, value: "$280K", color: "#FF1744", cards: [
      { init: "E", name: "EverGreen", deal: "$75K", pct: 70 },
      { init: "F", name: "FinServ Ltd", deal: "$140K", pct: 80 },
    ]},
    { name: "Won", count: 3, value: "$210K", color: "#FF1744", cards: [
      { init: "G", name: "GlobalTech", deal: "$125K", pct: 100 },
      { init: "M", name: "MegaCorp", deal: "$85K", pct: 100 },
    ]},
  ];
  return (
    <svg viewBox="0 0 320 200" className="w-full h-full" aria-hidden="true">
      <rect width="320" height="200" fill="#080808" />
      <rect x="0" y="0" width="320" height="24" fill="#0E0E0E" />
      <text x="12" y="9" fill="#E0E0E0" fontSize="5" fontFamily="system-ui, sans-serif" dominantBaseline="middle" fontWeight="bold">Pipeline</text>
      <text x="12" y="18" fill="#555" fontSize="2.5" fontFamily="system-ui, sans-serif" dominantBaseline="middle">Q1 2026 · $1.31M total value</text>
      {/* Funnel bar */}
      <rect x="140" y="4" width="120" height="16" rx="3" fill="#0A0A0A" />
      {[
        { w: 40, color: "#444" },
        { w: 35, color: "#888" },
        { w: 25, color: "#FF1744" },
        { w: 20, color: "#FF1744" },
      ].map((seg, i) => {
        let xOff = 142;
        for (let j = 0; j < i; j++) xOff += [38, 33, 23, 18][j];
        return <rect key={`fun${i}`} x={xOff} y="6" width={seg.w - 2} height="12" rx="2" fill={seg.color} opacity={i < 2 ? 0.3 : 0.6} />;
      })}
      <rect x="268" y="6" width="40" height="12" rx="3" fill="#FF1744" />
      <text x="288" y="12" fill="#fff" fontSize="3" fontFamily="system-ui, sans-serif" textAnchor="middle" dominantBaseline="middle" fontWeight="bold">+ Deal</text>
      {/* Kanban columns */}
      {stages.map((stage, i) => {
        const x = 6 + i * 78;
        return (
          <g key={`stage${i}`}>
            {/* Column header */}
            <rect x={x} y="28" width="72" height="16" rx="3" fill="#0C0C0C" />
            <text x={x + 6} y="34" fill={stage.color} fontSize="3" fontFamily="system-ui, sans-serif" dominantBaseline="middle" fontWeight="bold">{stage.name}</text>
            <text x={x + 44} y="34" fill="#555" fontSize="2.2" fontFamily="system-ui, sans-serif" dominantBaseline="middle">{stage.value}</text>
            <rect x={x + 60} y="31" width="8" height="8" rx="4" fill={stage.color} opacity="0.2" />
            <text x={x + 64} y="35" fill={stage.color} fontSize="2.5" fontFamily="system-ui, sans-serif" textAnchor="middle" dominantBaseline="middle">{stage.count}</text>
            {/* Column body */}
            <rect x={x} y="46" width="72" height="150" rx="3" fill="#0A0A0A" />
            {/* Deal cards */}
            {stage.cards.map((card, ci) => {
              const cy = 50 + ci * 48;
              return (
                <g key={`card${i}${ci}`}>
                  <rect x={x + 3} y={cy} width="66" height="42" rx="4" fill="#0C0C0C" stroke={i === 3 ? "rgba(255,23,68,0.2)" : "#1A1A1A"} strokeWidth="0.5" />
                  {/* Avatar + name */}
                  <circle cx={x + 12} cy={cy + 9} r="4.5" fill={stage.color} opacity="0.25" />
                  <text x={x + 12} y={cy + 9} fill={stage.color} fontSize="3.5" fontFamily="system-ui, sans-serif" textAnchor="middle" dominantBaseline="middle" fontWeight="bold">{card.init}</text>
                  <text x={x + 20} y={cy + 9} fill="#C0C0C0" fontSize="3" fontFamily="system-ui, sans-serif" dominantBaseline="middle">{card.name}</text>
                  {/* Deal value */}
                  <text x={x + 9} y={cy + 20} fill="#E0E0E0" fontSize="4" fontFamily="system-ui, sans-serif" dominantBaseline="middle" fontWeight="bold">{card.deal}</text>
                  {/* Probability bar */}
                  <rect x={x + 9} y={cy + 27} width="50" height="3" rx="1.5" fill="#111" />
                  <rect x={x + 9} y={cy + 27} width={50 * card.pct / 100} height="3" rx="1.5" fill={stage.color} opacity="0.7" />
                  <text x={x + 61} y={cy + 29} fill="#666" fontSize="2" fontFamily="system-ui, sans-serif" textAnchor="end" dominantBaseline="middle">{card.pct}%</text>
                  {/* Tags */}
                  <rect x={x + 9} y={cy + 34} width="16" height="5" rx="2.5" fill="rgba(255,23,68,0.08)" />
                  <text x={x + 17} y={cy + 37} fill="#888" fontSize="1.8" fontFamily="system-ui, sans-serif" textAnchor="middle" dominantBaseline="middle">SaaS</text>
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
});

/* Pure SVG mobile mockup — no external image dependencies */
const MobileAppMockup = memo(function MobileAppMockup() {
  return (
    <div className="w-full h-full bg-[#080808] flex items-center justify-center gap-4 sm:gap-6 lg:gap-8 px-4 sm:px-8 py-4 relative">
      {/* Ambient glow behind phones */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden="true">
        <div className="w-48 h-48 rounded-full bg-neon/[0.06] blur-[60px]" />
      </div>

      {/* Phone 1 — Forge AI (SVG) */}
      <div className="relative flex-shrink-0 w-[100px] sm:w-[120px] md:w-[130px]">
        <div className="relative rounded-[14px] sm:rounded-[18px] overflow-hidden border border-[#333] shadow-[0_4px_30px_rgba(0,0,0,0.8),0_0_20px_rgba(255,23,68,0.08)]">
          <svg viewBox="0 0 180 390" className="w-full h-auto block" aria-hidden="true">
            <rect width="180" height="390" fill="#0A0A0A" />
            {/* Status bar */}
            <rect x="55" y="8" width="70" height="12" rx="6" fill="#111" />
            {/* Header */}
            <rect x="16" y="36" width="60" height="6" rx="3" fill="#FF1744" opacity="0.8" />
            <rect x="16" y="48" width="100" height="4" rx="2" fill="#333" />
            {/* Hero card */}
            <rect x="12" y="64" width="156" height="80" rx="8" fill="#111" stroke="#1A1A1A" strokeWidth="0.5" />
            <rect x="22" y="74" width="80" height="5" rx="2.5" fill="#FF1744" opacity="0.5" />
            <rect x="22" y="84" width="60" height="3" rx="1.5" fill="#333" />
            <rect x="22" y="92" width="120" height="3" rx="1.5" fill="#222" />
            <rect x="22" y="100" width="100" height="3" rx="1.5" fill="#222" />
            <rect x="22" y="120" width="50" height="14" rx="4" fill="#FF1744" opacity="0.7" />
            {/* List items */}
            <rect x="12" y="156" width="156" height="36" rx="6" fill="#111" stroke="#1A1A1A" strokeWidth="0.5" />
            <circle cx="30" cy="174" r="8" fill="#1A1A1A" />
            <rect x="46" y="168" width="70" height="4" rx="2" fill="#444" />
            <rect x="46" y="178" width="50" height="3" rx="1.5" fill="#222" />
            <rect x="12" y="200" width="156" height="36" rx="6" fill="#111" stroke="#1A1A1A" strokeWidth="0.5" />
            <circle cx="30" cy="218" r="8" fill="#1A1A1A" />
            <rect x="46" y="212" width="80" height="4" rx="2" fill="#444" />
            <rect x="46" y="222" width="60" height="3" rx="1.5" fill="#222" />
            <rect x="12" y="244" width="156" height="36" rx="6" fill="#111" stroke="#1A1A1A" strokeWidth="0.5" />
            <circle cx="30" cy="262" r="8" fill="#1A1A1A" />
            <rect x="46" y="256" width="65" height="4" rx="2" fill="#444" />
            <rect x="46" y="266" width="55" height="3" rx="1.5" fill="#222" />
            {/* Bottom nav */}
            <rect x="0" y="352" width="180" height="38" fill="#0C0C0C" />
            <circle cx="36" cy="368" r="4" fill="#333" />
            <circle cx="72" cy="368" r="4" fill="#FF1744" opacity="0.6" />
            <circle cx="108" cy="368" r="4" fill="#333" />
            <circle cx="144" cy="368" r="4" fill="#333" />
            {/* Home indicator */}
            <rect x="65" y="382" width="50" height="3" rx="1.5" fill="rgba(255,255,255,0.2)" />
          </svg>
        </div>
        <p className="mt-2 text-[9px] sm:text-[10px] text-center text-text-caption tracking-wider uppercase font-heading">Forge AI</p>
      </div>

      {/* Phone 2 — Coaching Lab (SVG) */}
      <div className="relative flex-shrink-0 w-[100px] sm:w-[120px] md:w-[130px]">
        <div className="relative rounded-[14px] sm:rounded-[18px] overflow-hidden border border-[#333] shadow-[0_4px_30px_rgba(0,0,0,0.8),0_0_20px_rgba(255,23,68,0.08)]">
          <svg viewBox="0 0 180 390" className="w-full h-auto block" aria-hidden="true">
            <rect width="180" height="390" fill="#0A0A0A" />
            {/* Status bar */}
            <rect x="55" y="8" width="70" height="12" rx="6" fill="#111" />
            {/* Header with tabs */}
            <rect x="16" y="36" width="80" height="6" rx="3" fill="#E0E0E0" opacity="0.8" />
            <rect x="16" y="52" width="44" height="16" rx="4" fill="#FF1744" opacity="0.6" />
            <rect x="66" y="52" width="44" height="16" rx="4" fill="#1A1A1A" />
            <rect x="116" y="52" width="44" height="16" rx="4" fill="#1A1A1A" />
            {/* Workout cards */}
            <rect x="12" y="80" width="156" height="60" rx="8" fill="#111" stroke="#FF1744" strokeWidth="0.5" strokeOpacity="0.2" />
            <rect x="22" y="90" width="70" height="5" rx="2.5" fill="#E0E0E0" opacity="0.6" />
            <rect x="22" y="100" width="50" height="3" rx="1.5" fill="#333" />
            <rect x="22" y="110" width="90" height="3" rx="1.5" fill="#222" />
            <rect x="22" y="120" width="30" height="10" rx="3" fill="#FF1744" opacity="0.5" />
            <rect x="12" y="150" width="156" height="60" rx="8" fill="#111" stroke="#1A1A1A" strokeWidth="0.5" />
            <rect x="22" y="160" width="60" height="5" rx="2.5" fill="#E0E0E0" opacity="0.6" />
            <rect x="22" y="170" width="40" height="3" rx="1.5" fill="#333" />
            <rect x="22" y="180" width="80" height="3" rx="1.5" fill="#222" />
            <rect x="22" y="190" width="30" height="10" rx="3" fill="#333" />
            <rect x="12" y="220" width="156" height="60" rx="8" fill="#111" stroke="#1A1A1A" strokeWidth="0.5" />
            <rect x="22" y="230" width="75" height="5" rx="2.5" fill="#E0E0E0" opacity="0.6" />
            <rect x="22" y="240" width="55" height="3" rx="1.5" fill="#333" />
            <rect x="22" y="250" width="100" height="3" rx="1.5" fill="#222" />
            <rect x="22" y="260" width="30" height="10" rx="3" fill="#333" />
            {/* Stats bar */}
            <rect x="12" y="296" width="156" height="44" rx="8" fill="#0C0C0C" stroke="#1A1A1A" strokeWidth="0.5" />
            <rect x="22" y="306" width="30" height="10" rx="2" fill="#FF1744" opacity="0.3" />
            <text x="26" y="314" fontSize="5" fill="#FF1744" fontFamily="monospace">87%</text>
            <rect x="62" y="306" width="30" height="10" rx="2" fill="#1A1A1A" />
            <text x="66" y="314" fontSize="5" fill="#888" fontFamily="monospace">12x</text>
            <rect x="102" y="306" width="30" height="10" rx="2" fill="#1A1A1A" />
            <text x="106" y="314" fontSize="5" fill="#888" fontFamily="monospace">4wk</text>
            <rect x="22" y="322" width="80" height="3" rx="1.5" fill="#222" />
            {/* Bottom nav */}
            <rect x="0" y="352" width="180" height="38" fill="#0C0C0C" />
            <circle cx="36" cy="368" r="4" fill="#FF1744" opacity="0.6" />
            <circle cx="72" cy="368" r="4" fill="#333" />
            <circle cx="108" cy="368" r="4" fill="#333" />
            <circle cx="144" cy="368" r="4" fill="#333" />
            {/* Home indicator */}
            <rect x="65" y="382" width="50" height="3" rx="1.5" fill="rgba(255,255,255,0.2)" />
          </svg>
        </div>
        <p className="mt-2 text-[9px] sm:text-[10px] text-center text-text-caption tracking-wider uppercase font-heading">Coaching Lab</p>
      </div>

      {/* Side labels */}
      <div className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 flex-col gap-3">
        <div className="px-2.5 py-1.5 rounded bg-[#0C0C0C] border border-[#1A1A1A]">
          <p className="text-[9px] text-text-secondary font-heading font-bold tracking-wider">iOS & Android</p>
          <p className="text-[7px] text-text-caption">Cross-platform native</p>
        </div>
        <div className="px-2.5 py-1.5 rounded bg-[#0C0C0C] border border-[#1A1A1A]">
          <p className="text-[9px] text-text-secondary font-heading font-bold tracking-wider">Push Notifications</p>
          <p className="text-[7px] text-text-caption">Real-time alerts</p>
        </div>
      </div>
      <div className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 flex-col gap-3">
        <div className="px-2.5 py-1.5 rounded bg-[#0C0C0C] border border-neon/[0.15]">
          <p className="text-[9px] text-neon font-heading font-bold tracking-wider">PWA Ready</p>
          <p className="text-[7px] text-text-caption">Offline-first sync</p>
        </div>
        <div className="px-2.5 py-1.5 rounded bg-[#0C0C0C] border border-[#1A1A1A]">
          <p className="text-[9px] text-text-secondary font-heading font-bold tracking-wider">Background Sync</p>
          <p className="text-[7px] text-text-caption">Queue & retry</p>
        </div>
      </div>
    </div>
  );
});

const MOCKUP_MAP: Record<string, React.FC> = {
  "Coaching Platform": CoachingPlatformMockup,
  "Analytics Dashboard": AnalyticsDashboardMockup,
  "Member Portal": MemberPortalMockup,
  "E-Commerce Platform": ECommerceMockup,
  "Enterprise CRM": EnterpriseCRMMockup,
  "Mobile Application": MobileAppMockup,
};

/* Fallback for unknown labels */
const FallbackMockup = memo(function FallbackMockup() {
  return (
    <svg viewBox="0 0 320 200" className="w-full h-full" aria-hidden="true">
      <rect width="320" height="200" fill="#080808" />
      <rect x="60" y="40" width="200" height="120" rx="8" fill="#0C0C0C" stroke="#1A1A1A" strokeWidth="0.5" />
      <rect x="80" y="60" width="80" height="6" rx="3" fill="#333" />
      <rect x="80" y="78" width="160" height="3" rx="1.5" fill="#1A1A1A" />
      <rect x="80" y="88" width="140" height="3" rx="1.5" fill="#1A1A1A" />
      <rect x="80" y="98" width="120" height="3" rx="1.5" fill="#1A1A1A" />
      <rect x="80" y="118" width="60" height="16" rx="4" fill="#FF1744" />
    </svg>
  );
});

const DeviceMockup = memo(function DeviceMockup({ label, image, description }: DeviceMockupProps) {
  const MockupComponent = MOCKUP_MAP[label] || FallbackMockup;

  return (
    <div className="group">
      {/* Device container */}
      <div
        className="relative rounded-hero overflow-hidden transition-all duration-500"
        style={{
          borderImage: "linear-gradient(to bottom, rgba(180,180,180,0.15) 0%, rgba(100,100,100,0.1) 100%) 1",
          border: "1px solid",
          boxShadow:
            "0 8px 40px rgba(0,0,0,0.6), 0 0 30px rgba(255,23,68,0.06), 0 0 1px rgba(180,180,180,0.1)",
        }}
      >
        {/* Hover border brightening overlay */}
        <div
          className="absolute inset-0 rounded-hero pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10"
          style={{
            boxShadow: "inset 0 0 0 1px rgba(255,23,68,0.15)",
          }}
          aria-hidden="true"
        />

        {/* Top bezel */}
        <div
          className="h-6 bg-surface-3/60 flex items-center px-3 gap-1.5"
          aria-hidden="true"
        >
          {/* First dot pulses */}
          <div className="w-2 h-2 rounded-full bg-neon/60 shadow-[0_0_6px_rgba(255,23,68,0.4)] animate-glow-pulse" />
          <div className="w-2 h-2 rounded-full bg-border/60" />
          <div className="w-2 h-2 rounded-full bg-border/60" />
        </div>

        {/* Screen */}
        <div className="aspect-[16/10] bg-surface-1 relative overflow-hidden">
          {image ? (
            <img
              src={image}
              alt={label}
              className="w-full h-full object-cover"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <MockupComponent />
          )}

          {/* Scan-line animation — single pass */}
          <div
            className="absolute left-0 w-full h-px bg-white/[0.05] pointer-events-none animate-scan-line z-[2]"
            style={{ top: "-2px", animationIterationCount: 1 }}
            aria-hidden="true"
          />

          {/* Reflection / shine effect */}
          <div
            className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none"
            aria-hidden="true"
          />
        </div>
      </div>

      {/* Caption */}
      <p className="mt-4 text-sm text-text-primary text-center font-heading font-semibold tracking-wide">
        {label}
      </p>
      {description && (
        <p className="mt-1 text-xs text-text-secondary text-center font-body leading-relaxed">
          {description}
        </p>
      )}
    </div>
  );
});

export default DeviceMockup;
