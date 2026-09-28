import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdfkit reads its standard-14 font .afm files via fs + __dirname at
  // runtime; bundling it rewrites __dirname to a virtual path that doesn't
  // exist on disk (ENOENT), so it must stay an unbundled, plain require.
  serverExternalPackages: ["pdfkit"],
  images: {
    // The Photography experience card image is hosted on Unsplash — every
    // other image lives in /public and needs no entry here.
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
    // Next 15 changed the default to "attachment", which some mobile
    // browsers refuse to render inline inside <img> (e.g. the WeChat QR
    // modal). No SVGs go through this loader, so "inline" is safe.
    contentDispositionType: "inline",
  },
  // Urban Sprint's leaderboard used to be its own page; it now lives on the
  // campaign page. Printed QR codes and old links still point at the old URL.
  // Redirects run before proxy.ts, which adds the locale to a bare path.
  async redirects() {
    return [
      {
        source: "/:lang(en|cn)/urban-sprint/leaderboard",
        destination: "/:lang/urban-sprint#leaderboard",
        permanent: true,
      },
      {
        source: "/urban-sprint/leaderboard",
        destination: "/urban-sprint#leaderboard",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
