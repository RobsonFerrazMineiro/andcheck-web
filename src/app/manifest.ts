import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AndCheck",
    short_name: "AndCheck",
    description: "Gestao operacional de andaimes industriais",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#f4f6f8",
    theme_color: "#111827",
    icons: [
      {
        src: "/icons/andcheck-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
