import { supabase } from "@/utils/supabase/client";
import { Card, CardContent } from "@/components/ui/Card";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

// For server components we should ideally use server client, 
// but since we are rapidly prototyping, we will fetch directly using the client 
// or make this a client component. Let's make it a client component for easy state management if needed.
// Wait, no, we can use the client supabase instance directly in server components if RLS allows public read.
// In Supabase, standard client doesn't use cookies without setup, so it acts as anon.

export default async function HomePage() {
  // Fetch active products with store info
  const { data: dbProducts } = await supabase
    .from("products")
    .select("*, stores(shop_name)")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(12);

  const { data: dbStores } = await supabase
    .from("stores")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(4);

  const dummyProducts = [
    {
      id: "1",
      title: "Essential Oversized Tee",
      price: 35.00,
      image_urls: ["https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&q=80"],
      stores: { shop_name: "Acme Studios" }
    },
    {
      id: "2",
      title: "Classic Denim Jacket",
      price: 120.00,
      image_urls: ["https://images.unsplash.com/photo-1576871337622-98d48d1cf531?w=500&q=80"],
      stores: { shop_name: "Indigo Wear" }
    },
    {
      id: "3",
      title: "Minimalist Sneakers",
      price: 89.99,
      image_urls: ["https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=500&q=80"],
      stores: { shop_name: "Stride" }
    },
    {
      id: "4",
      title: "Heavyweight Hoodie",
      price: 65.00,
      image_urls: ["https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=500&q=80"],
      stores: { shop_name: "Comfort Co" }
    }
  ];

  const dummyStores = [
    { id: "1", shop_name: "Acme Studios", bio: "Premium essentials for everyday wear." },
    { id: "2", shop_name: "Indigo Wear", bio: "Authentic denim crafted to last." },
    { id: "3", shop_name: "Stride", bio: "Modern footwear." },
    { id: "4", shop_name: "Comfort Co", bio: "Loungewear redefined." }
  ];

  const products = dbProducts && dbProducts.length > 0 ? dbProducts : dummyProducts;
  const stores = dbStores && dbStores.length > 0 ? dbStores : dummyStores;

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative w-full py-20 md:py-32 bg-muted/30 border-b border-border">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tighter mb-6">
            Discover Premium Apparel
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-[600px] mx-auto mb-8">
            Shop exclusive collections from independent brands and designers all in one place.
          </p>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16 container mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold tracking-tight">New Arrivals</h2>
        </div>
        
        {products && products.length > 0 ? (
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
                    <p className="text-xs text-muted-foreground mb-1">
                      {product.stores?.shop_name || "Luxe Store"}
                    </p>
                    <h3 className="font-semibold text-lg line-clamp-1">{product.title}</h3>
                    <p className="font-medium mt-1">${product.price}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground border rounded-xl border-dashed">
            No products available yet. Check back soon!
          </div>
        )}
      </section>

      {/* Featured Stores */}
      <section className="py-16 bg-muted/20 border-t border-border">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold tracking-tight">Featured Brands</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {stores?.map((store) => (
              <Link href={`/store/${store.id}`} key={store.id}>
                <Card className="hover:border-primary/50 transition-colors cursor-pointer text-center py-8">
                  <CardContent>
                    <div className="h-16 w-16 mx-auto bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xl font-bold mb-4">
                      {store.shop_name.charAt(0)}
                    </div>
                    <h3 className="font-semibold text-lg">{store.shop_name}</h3>
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                      {store.bio || "Discover our premium collection."}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
