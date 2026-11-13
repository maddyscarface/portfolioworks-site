import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PortfolioWorks",
    short_name: "PortfolioWorks",
    description: "Rental unit turnovers, renovations and portfolio contracting in Greater Boston.",
    start_url: "/",
    display: "browser",
    background_color: "#f7f4ee",
    theme_color: "#142036",
    icons: [
      { src: "/icon-32.png", sizes: "32x32", type: "image/png" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
