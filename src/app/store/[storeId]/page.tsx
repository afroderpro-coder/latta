"use client";

import { useEffect, useState, use } from "react";
import { supabase } from "@/utils/supabase/client";
import { Card, CardContent } from "@/components/ui/Card";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function StorefrontPage({ params }: { params: Promise<{ storeId: string }> }) {
  const unwrappedParams = use(params);
  const [store, setStore] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadStoreAndProducts() {
      const { data: storeData } = await supabase
        .from("stores")
        .select("*")
        .eq("id", unwrappedParams.storeId)
        .single();
      
      if (storeData) {
        setStore(storeData);
        const { data: productsData } = await supabase
          .from("products")
          .select("*")
          .eq("store_id", unwrappedParams.storeId)
          .eq("is_active", true)
          .order("created_at", { ascending: false });
        
        if (productsData) setProducts(productsData);
      }
      setIsLoading(false);
    }
    loadStoreAndProducts();
  }, [unwrappedParams.storeId]);

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-primary h-8 w-8" /></div>;
  }

  if (!store) {
    return <div className="text-center py-20">Store not found.</div>;
  }

  return (
    <div className="min-h-screen">
      {/* Store Banner */}
      <div className="h-64 md:h-80 w-full bg-muted relative overflow-hidden flex items-center justify-center">
        {store.banner_url ? (
          <img src={store.banner_url} alt={`${store.shop_name} banner`} className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-primary/5" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
        
        <div className="absolute bottom-0 left-0 w-full p-8 flex items-end">
          <div className="container mx-auto flex items-end space-x-6">
            <div className="h-24 w-24 md:h-32 md:w-32 rounded-xl bg-card border-4 border-background flex items-center justify-center text-3xl font-bold overflow-hidden">
               {store.logo_url ? (
                 <img src={store.logo_url} alt="Logo" className="w-full h-full object-cover" />
               ) : (
                 store.shop_name.charAt(0)
               )}
            </div>
            <div className="pb-2">
              <h1 className="text-3xl md:text-5xl font-bold tracking-tight">{store.shop_name}</h1>
              <p className="text-muted-foreground mt-2">{store.bio || `Welcome to ${store.shop_name}`}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold mb-8">All Products</h2>
        {products.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <Link href={`/product/${product.id}`} key={product.id}>
                <Card className="h-full overflow-hidden hover:border-primary/50 transition-colors group cursor-pointer border-transparent shadow-none hover:shadow-md">
                  <div className="aspect-[4/5] bg-muted overflow-hidden relative">
                    {product.image_urls?.[0] ? (
                      <img 
                        src={product.image_urls[0]} 
                        alt={product.title} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
                        Image Preview
                      </div>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-lg line-clamp-1">{product.title}</h3>
                    <p className="font-medium mt-1">₹{product.price}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground border rounded-xl border-dashed">
            This store hasn't added any products yet.
          </div>
        )}
      </div>
    </div>
  );
}
