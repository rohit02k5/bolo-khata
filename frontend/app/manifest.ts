import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Bolo Khata",
    short_name: "Bolo Khata",
    description:
      "Voice-first kirana ledger — speak in Hinglish or Telugu, the khata writes itself.",
    start_url: "/",
    display: "standalone",
    background_color: "#fbf7f0",
    theme_color: "#0d5f52",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
