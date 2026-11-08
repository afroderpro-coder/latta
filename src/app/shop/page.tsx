import { Suspense } from "react";
import { supabase } from "@/utils/supabase/client";
import staticDeletedStores from "@/data/deleted_stores.json";
import staticNewArrivals from "@/data/new_arrivals.json";
import { parseStoreBio } from "@/utils/storeMetadata";
import { ShopClient, ShopProduct } from "@/components/shop/ShopClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function ShopLoadingSkeleton() {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-pulse">
      <div className="flex gap-2 overflow-x-hidden py-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-9 w-24 bg-muted rounded-full shrink-0" />
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="aspect-[3/4] bg-muted rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export default async function ShopPage() {
  // 1. Fetch all active products
  const { data: dbProducts } = await supabase
    .from("products")
    .select("*, stores(id, shop_name)")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  // 2. Fetch stores to discover curated New Arrivals and filter deleted stores
  const { data: rawDbStores } = await supabase
    .from("stores")
    .select("id, shop_name, bio")
    .order("created_at", { ascending: false })
    .limit(10);

  const deletedSet = new Set<string>(staticDeletedStores || []);

  // 3. Discover curated New Arrivals sequence from Web Controller
  let curatedIds: string[] = [];
  (rawDbStores || []).forEach((s) => {
    if (curatedIds.length === 0 && s.bio) {
      const meta = parseStoreBio(s.bio);
      if (Array.isArray(meta.curated_new_arrivals) && meta.curated_new_arrivals.length > 0) {
        curatedIds = meta.curated_new_arrivals;
      }
    }
  });

  if (curatedIds.length === 0 && Array.isArray(staticNewArrivals)) {
    curatedIds = staticNewArrivals;
  }

  const dummyProducts: ShopProduct[] = [
    {
      id: "1",
      title: "Essential Oversized Tee",
      price: 35.00,
      category: "T-Shirt",
      image_urls: ["https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&q=80"],
      stores: { shop_name: "Acme Studios" }
    },
    {
      id: "2",
      title: "Classic Denim Jacket",
      price: 120.00,
      category: "Jacket",
      image_urls: ["https://images.unsplash.com/photo-1576871337622-98d48d1cf531?w=500&q=80"],
      stores: { shop_name: "Indigo Wear" }
    },
    {
      id: "3",
      title: "Minimalist Sneakers",
      price: 89.99,
      category: "Sneakers",
      image_urls: ["https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=500&q=80"],
      stores: { shop_name: "Stride" }
    },
    {
      id: "4",
      title: "Heavyweight Hoodie",
      price: 65.00,
      category: "Hoodie",
      image_urls: ["https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=500&q=80"],
      stores: { shop_name: "Comfort Co" }
    },
    {
      id: "5",
      title: "Vintage Wash Jeans",
      price: 95.00,
      category: "Jeans",
      image_urls: ["https://images.unsplash.com/photo-1542272604-787c3835535d?w=500&q=80"],
      stores: { shop_name: "Indigo Wear" }
    },
    {
      id: "6",
      title: "Chunky Knit Sweater",
      price: 78.00,
      category: "Sweater",
      image_urls: ["https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=500&q=80"],
      stores: { shop_name: "Comfort Co" }
    }
  ];

  const activeDbProducts = (dbProducts || []).filter(
    (p: any) => !p.store_id || !deletedSet.has(p.store_id)
  );

  const products: ShopProduct[] = activeDbProducts.length > 0 ? (activeDbProducts as any) : dummyProducts;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ── Page Header ── */}
      <div className="border-b border-border bg-card/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 md:py-12">
          <div className="max-w-3xl space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-widest text-primary">
              Curated Marketplace
            </span>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
              Shop Collections
            </h1>
            <p className="text-muted-foreground text-xs sm:text-sm md:text-base leading-relaxed">
              Explore shirts, t-shirts, jeans, watches, perfumes, and designer accessories from verified independent brands.
            </p>
          </div>
        </div>
      </div>

      {/* ── Interactive Category Filtering & Product Display ── */}
      <Suspense fallback={<ShopLoadingSkeleton />}>
        <ShopClient
          initialProducts={products}
          curatedArrivalIds={curatedIds}
        />
      </Suspense>
    </div>
  );
}
