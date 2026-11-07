import { supabase } from "@/utils/supabase/client";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Playfair_Display } from "next/font/google";
import HeroVisualSlider from "@/components/ui/HeroVisualSlider";

import { parseStoreBio } from "@/utils/storeMetadata";
import staticDeletedStores from "@/data/deleted_stores.json";
import staticNewArrivals from "@/data/new_arrivals.json";

const playfair = Playfair_Display({ subsets: ["latin"], weight: ["400", "700", "900"] });

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HomePage() {
  // 1. Fetch stores
  const { data: rawDbStores } = await supabase
    .from("stores")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10);

  const deletedSet = new Set(staticDeletedStores);
  const dbStores = (rawDbStores || []).filter((s) => {
    if (deletedSet.has(s.id)) return false;
    const meta = parseStoreBio(s.bio);
    return meta.approval_status === "approved";
  }).slice(0, 4);

  // 2. Discover curated New Arrivals sequence from Web Controller
  let curatedIds: string[] = [];
  // First check if any store (especially AFRODER BRAND) holds curated_new_arrivals
  (rawDbStores || []).forEach((s) => {
    if (curatedIds.length === 0 && s.bio) {
      const meta = parseStoreBio(s.bio);
      if (Array.isArray(meta.curated_new_arrivals) && meta.curated_new_arrivals.length > 0) {
        curatedIds = meta.curated_new_arrivals;
      }
    }
  });

  // Fallback to static/server new_arrivals.json if not in store bio
  if (curatedIds.length === 0 && Array.isArray(staticNewArrivals) && staticNewArrivals.length > 0) {
    curatedIds = staticNewArrivals;
  }

  // 3. Fetch products: If curatedIds are defined by Web Controller, fetch specifically those products
  let activeProducts: any[] = [];
  if (curatedIds.length > 0) {
    const { data: curatedDbProducts } = await supabase
      .from("products")
      .select("*, stores(shop_name)")
      .in("id", curatedIds)
      .eq("is_active", true);

    const validCurated = (curatedDbProducts || []).filter(
      (p: any) => !p.store_id || !deletedSet.has(p.store_id)
    );

    // Strictly sort by the curated sequence set by the Web Controller
    const orderMap = new Map(curatedIds.map((id, index) => [id, index]));
    validCurated.sort(
      (a, b) => (orderMap.get(a.id) ?? 999) - (orderMap.get(b.id) ?? 999)
    );

    activeProducts = validCurated;
  }

  // Fallback: If no curated products found or none active, fetch newest active products
  if (activeProducts.length === 0) {
    const { data: dbProducts } = await supabase
      .from("products")
      .select("*, stores(shop_name)")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(12);

    activeProducts = (dbProducts || []).filter(
      (p: any) => !p.store_id || !deletedSet.has(p.store_id)
    );
  }

  const dummyProducts = [
    {
      id: "1",
      title: "Essential Oversized Tee",
      price: 35.00,
      image_urls: ["https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&q=80"],
      stores: { shop_name: "Acme Studios" }
    },
    {
      id: "2",
      title: "Classic Denim Jacket",
      price: 120.00,
      image_urls: ["https://images.unsplash.com/photo-1576871337622-98d48d1cf531?w=800&q=80"],
      stores: { shop_name: "Indigo Wear" }
    },
    {
      id: "3",
      title: "Minimalist Sneakers",
      price: 89.99,
      image_urls: ["https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800&q=80"],
      stores: { shop_name: "Stride" }
    },
    {
      id: "4",
      title: "Heavyweight Hoodie",
      price: 65.00,
      image_urls: ["https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800&q=80"],
      stores: { shop_name: "Comfort Co" }
    }
  ];

  const dummyStores = [
    { id: "1", shop_name: "Acme Studios", bio: "Premium essentials for everyday wear." },
    { id: "2", shop_name: "Indigo Wear", bio: "Authentic denim crafted to last." },
    { id: "3", shop_name: "Stride", bio: "Modern footwear." },
    { id: "4", shop_name: "Comfort Co", bio: "Loungewear redefined." }
  ];

  const products = activeProducts.length > 0 ? activeProducts : dummyProducts;
  const stores = dbStores && dbStores.length > 0 ? dbStores : dummyStores;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Split Layout Hero Section */}
      <section className="w-full min-h-[100dvh] md:min-h-[90vh] flex flex-col-reverse lg:flex-row bg-[#E8E8E8]">
        <div className="flex-1 flex flex-col justify-start lg:justify-center px-6 md:px-8 lg:px-16 xl:px-24 pt-4 pb-12 md:py-12 lg:py-0">
          <h1 className={`text-4xl md:text-6xl lg:text-7xl font-bold tracking-wide mb-4 md:mb-6 text-foreground leading-tight ${playfair.className}`}>
            We don't design <span className="font-[cursive] font-light tracking-normal lowercase animate-silver-shimmer">clothes</span> We design dreams.
          </h1>
          <p className="text-base md:text-xl font-light tracking-wide max-w-xl mb-6 md:mb-10 text-muted-foreground">
            Discover curated collections from the world's most visionary independent designers. Elevate your everyday wardrobe.
          </p>
          <Link 
            href="/shop" 
            className="group flex items-center space-x-3 bg-slate-900 text-gray-300 px-6 py-3 md:px-8 md:py-4 rounded-full font-semibold text-base md:text-lg tracking-wide hover:scale-105 active:scale-95 transition-all duration-300 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.3),inset_0_4px_12px_rgba(255,255,255,0.15),inset_0_-8px_16px_rgba(0,0,0,0.6)] w-fit"
          >
            <span className="animate-silver-shimmer">Explore The Collection</span>
            <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform text-gray-400" />
          </Link>
        </div>
        
        {/* Right Hero Visual (Single Hero Image) */}
        <HeroVisualSlider images={["/hero-dancer-2.png"]} />
      </section>

      {/* Editorial Product Grid (New Arrivals) */}
      <section className="py-24 md:py-32 container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center text-center mb-16 md:mb-24">
          <h2 className="text-sm tracking-[0.2em] text-muted-foreground uppercase mb-4">Latest Additions</h2>
          <h3 className="text-3xl md:text-5xl font-medium tracking-tight">New Arrivals</h3>
        </div>
        
        {products && products.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-12">
            {products.map((product) => (
              <Link href={`/product/${product.id}`} key={product.id} className="group block">
                {/* Compact Image Container */}
                <div className="aspect-square bg-secondary/60 overflow-hidden mb-3 relative border border-border/80 rounded-2xl shadow-xs group-hover:shadow-md transition-all duration-300">
                  {product.image_urls?.[0] ? (
                    <img 
                      src={product.image_urls[0]} 
                      alt={product.title} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs font-medium tracking-widest uppercase">
                      Preview
                    </div>
                  )}

                  {/* Subtle hover overlay */}
                  <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/5 transition-colors duration-300" />
                </div>

                {/* Glassy View Now Button (at its place outside) */}
                <div className="flex items-center justify-end px-1">
                  <span className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-black/75 dark:bg-black/80 backdrop-blur-md border border-white/20 text-white text-xs font-semibold tracking-wide shadow-md hover:bg-black/90 group-hover:scale-105 transition-all cursor-pointer">
                    <span>View Now</span>
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 text-muted-foreground text-lg font-light tracking-wide">
            No collections available at the moment.
          </div>
        )}
        
        <div className="flex justify-center mt-20">
          <Link 
            href="/shop" 
            className="border-b border-slate-900 pb-1 font-medium tracking-wide hover:text-muted-foreground hover:border-muted-foreground transition-colors"
          >
            View All Products
          </Link>
        </div>
      </section>

      {/* High-End Brand Showcase */}
      <section className="py-24 md:py-32 bg-secondary/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center mb-16 md:mb-24">
            <h2 className="text-sm tracking-[0.2em] text-muted-foreground uppercase mb-4">Curated Designers</h2>
            <h3 className="text-3xl md:text-5xl font-medium tracking-tight">Featured Brands</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {stores?.map((store) => (
              <Link href={`/store/${store.id}`} key={store.id} className="group block">
                <div className="relative border border-border bg-background p-10 h-full min-h-[250px] flex flex-col items-center justify-center text-center transition-all duration-500 hover:shadow-xl hover:-translate-y-1 overflow-hidden">
                  {/* Background Image Overlay */}
                  {/* Temporarily hidden as per user request
                  {((store as any).profile_image || (store as any).logo_url) && (
                    <>
                      <div 
                        className="absolute inset-0 bg-cover bg-center opacity-40 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700 z-0" 
                        style={{ backgroundImage: `url(${(store as any).profile_image || (store as any).logo_url})` }}
                      />
                      <div className="absolute inset-0 bg-white/40 group-hover:opacity-0 transition-opacity duration-700 z-0" />
                    </>
                  )}
                  */}
                  
                  {/* Card Content */}
                  <div className="relative z-10 flex flex-col items-center transition-opacity duration-500">
                    <h4 className="font-medium text-2xl tracking-tight mb-4">
                      {store.shop_name}
                    </h4>
                    <p className="text-muted-foreground text-sm font-light leading-relaxed max-w-[200px]">
                      {store.bio && !store.bio.trim().startsWith("{") && !store.bio.trim().startsWith("[")
                        ? store.bio
                        : "Explore the signature collection."}
                    </p>
                    <div className="mt-8 w-12 h-[1px] bg-border" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
