import { MetadataRoute } from "next";
import { supabase } from "@/utils/supabase/client";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://afroder.shop";

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/shop`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

  try {
    const { data: products } = await supabase
      .from("products")
      .select("id, updated_at")
      .eq("is_active", true);

    const productRoutes: MetadataRoute.Sitemap = (products || []).map((product) => ({
      url: `${baseUrl}/product/${product.id}`,
      lastModified: product.updated_at ? new Date(product.updated_at) : new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    }));

    const { data: stores } = await supabase
      .from("stores")
      .select("id, updated_at");

    const storeRoutes: MetadataRoute.Sitemap = (stores || []).map((store) => ({
      url: `${baseUrl}/store/${store.id}`,
      lastModified: store.updated_at ? new Date(store.updated_at) : new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    }));

    return [...staticRoutes, ...productRoutes, ...storeRoutes];
  } catch (error) {
    console.error("Error generating sitemap:", error);
    return staticRoutes;
  }
}

