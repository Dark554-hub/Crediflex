import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Crediflex - Cobranza en Campo",
    short_name: "Crediflex",
    description: "Sistema de gestion de creditos y cobranza en campo.",
    start_url: "/cobros",
    display: "standalone",
    background_color: "#F6F5F0",
    theme_color: "#0E3B2E",
    orientation: "portrait",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
