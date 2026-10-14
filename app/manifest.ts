import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AMS Malaysia — Accounting & Tax Records",
    short_name: "AMS Malaysia",
    description:
      "Malaysian receipt capture, accounting reports and LHDN tax working papers for individuals, sole proprietors and Sdn. Bhd. companies.",
    start_url: "/",
    display: "standalone",
    background_color: "#f3f9fd",
    theme_color: "#2c85c8",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
