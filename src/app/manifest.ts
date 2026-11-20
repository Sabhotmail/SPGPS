import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SPGPS — SiriPro GPS",
    short_name: "SPGPS",
    description: "Scalefusion GPS tracking with group-based access control",
    start_url: "/",
    display: "standalone",
    lang: "th",
    background_color: "#f4f7fb",
    theme_color: "#3d6ea8",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
