import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vermillion Axis Technologies | Infrastructure-Grade Software Engineering",
  description:
    "We build the systems that run your operation. Engineered for load, hardened for production, delivered with the source. 3–21 day delivery. 100% code ownership.",
  keywords: [
    "custom software development",
    "premium web development",
    "enterprise software",
    "PWA development",
    "custom software agency",
    "full-stack development",
    "AI software development",
  ],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  openGraph: {
    title: "Vermillion Axis Technologies | Infrastructure-Grade Software Engineering",
    description:
      "We build the systems that run your operation. Engineered for load, hardened for production, delivered with the source. 3–21 day delivery. 100% code ownership.",
    type: "website",
    url: "https://vermillionaxis.tech",
    siteName: "Vermillion Axis Technologies",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Vermillion Axis Technologies — Custom Software Development",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Vermillion Axis Technologies | Infrastructure-Grade Software Engineering",
    description:
      "We build the systems that run your operation. Engineered for load, hardened for production, delivered with the source. 3–21 day delivery. 100% code ownership.",
    images: ["/og-image.png"],
  },
  metadataBase: new URL("https://vermillionaxis.tech"),
  alternates: {
    canonical: "/",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        {/* Security meta tags */}
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
        <meta httpEquiv="X-Frame-Options" content="DENY" />
        <meta httpEquiv="Referrer-Policy" content="strict-origin-when-cross-origin" />
        <meta httpEquiv="Permissions-Policy" content="camera=(), microphone=(), geolocation=()" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700;800;900&family=Source+Sans+3:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-bg antialiased font-body">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "Vermillion Axis Technologies",
              url: "https://vermillionaxis.tech",
              description:
                "Infrastructure-grade software engineering. Engineered for load, hardened for production, delivered with the source.",
              address: {
                "@type": "PostalAddress",
                addressCountry: "US",
              },
              foundingDate: "2025",
              contactPoint: {
                "@type": "ContactPoint",
                contactType: "sales",
              },
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Service",
              provider: {
                "@type": "Organization",
                name: "Vermillion Axis Technologies",
              },
              serviceType: "Custom Software Development",
              areaServed: "US",
              offers: {
                "@type": "AggregateOffer",
                lowPrice: "2500",
                highPrice: "300000",
                priceCurrency: "USD",
              },
            }),
          }}
        />
        {/* Force scroll to top on fresh page load */}
        <script dangerouslySetInnerHTML={{ __html: `if(!location.hash){window.scrollTo(0,0);if('scrollRestoration' in history)history.scrollRestoration='manual';}` }} />
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[10000] focus:px-4 focus:py-2 focus:rounded-btn focus:bg-vermillion focus:text-white focus:font-medium focus:text-sm focus:outline-none focus:ring-2 focus:ring-neon/50"
        >
          Skip to content
        </a>
        <div className="noise-overlay" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}
