import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/seller/",
        "/profile",
        "/cart",
      ],
    },
    sitemap: "https://afroder.shop/sitemap.xml",
  };
}

