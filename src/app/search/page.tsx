import { supabase } from "@/utils/supabase/client";
import Link from "next/link";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const resolvedParams = await searchParams;
  const query = resolvedParams.q || "";

  let products: any[] = [];
  let stores: any[] = [];

  if (query) {
    const [productsResult, storesResult] = await Promise.all([
      supabase
        .from("products")
        .select("*, stores(shop_name)")
        .eq("is_active", true)
        .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
        .order("created_at", { ascending: false }),
      supabase
        .from("stores")
        .select("*")
        .or(`shop_name.ilike.%${query}%,bio.ilike.%${query}%`)
        .order("created_at", { ascending: false })
    ]);

    products = productsResult.data || [];
    stores = storesResult.data || [];
  }

  return (
    <div className="flex flex-col min-h-screen bg-background pt-24 pb-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="mb-16">
          <h1 className="text-3xl md:text-5xl font-medium tracking-tight mb-4">
            {query ? `Search results for "${query}"` : "Search"}
          </h1>
          <p className="text-muted-foreground text-lg tracking-wide">
            {query 
              ? `Found ${products.length} products and ${stores.length} brands.`
              : "Enter a search term in the navigation bar to find products and stores."}
          </p>
        </div>

        {query && stores.length > 0 && (
          <section className="mb-24">
            <h2 className="text-sm tracking-[0.2em] text-muted-foreground uppercase mb-8">Matching Brands</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {stores.map((store) => (
                <Link href={`/store/${store.id}`} key={store.id} className="group block">
                  <div className="border border-border bg-background p-10 h-full flex flex-col items-center justify-center text-center transition-all duration-500 hover:shadow-xl hover:-translate-y-1">
                    <h4 className="font-medium text-2xl tracking-tight mb-4 group-hover:text-muted-foreground transition-colors">
                      {store.shop_name}
                    </h4>
                    <p className="text-muted-foreground text-sm font-light leading-relaxed line-clamp-3">
                      {store.bio && !store.bio.trim().startsWith("{") && !store.bio.trim().startsWith("[")
                        ? store.bio
                        : "Explore the signature collection."}
                    </p>
                    <div className="mt-8 w-12 h-[1px] bg-border group-hover:bg-slate-900 transition-colors duration-500" />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {query && products.length > 0 && (
          <section>
            <h2 className="text-sm tracking-[0.2em] text-muted-foreground uppercase mb-8">Matching Products</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-16">
              {products.map((product) => (
                <Link href={`/product/${product.id}`} key={product.id} className="group block">
                  <div className="aspect-[3/4] bg-secondary overflow-hidden mb-6 relative">
                    {product.image_urls?.[0] ? (
                      <img 
                        src={product.image_urls[0]} 
                        alt={product.title} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm font-medium tracking-widest uppercase">
                        No Image
                      </div>
                    )}
                    {/* Subtle hover overlay */}
                    <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/5 transition-colors duration-500" />
                  </div>
                  <div className="space-y-2 px-1 text-center">
                    <h4 className="font-medium text-lg tracking-tight text-primary transition-colors">
                      {product.title}
                    </h4>
                    <p className="text-sm text-muted-foreground tracking-wide uppercase">
                      {product.stores?.shop_name || "AFRODER"}
                    </p>
                    <p className="font-medium pt-1">₹{product.price}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {query && products.length === 0 && stores.length === 0 && (
          <div className="text-center py-20 text-muted-foreground text-lg font-light tracking-wide">
            No results found for "{query}". Try a different search term.
          </div>
        )}
      </div>
    </div>
  );
}
