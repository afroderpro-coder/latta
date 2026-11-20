import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AFRODER - Premium Multi-Vendor Marketplace",
    short_name: "AFRODER",
    description: "Discover premium apparel from independent brands.",
    start_url: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#000000",
    icons: [
      {
        src: "/icon-48.png?v=3",
        sizes: "48x48",
        type: "image/png",
      },
      {
        src: "/icon.png?v=3",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512.png?v=3",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/apple-icon.png?v=3",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
