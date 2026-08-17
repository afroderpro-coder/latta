import { supabase } from "@/utils/supabase/client";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Playfair_Display } from "next/font/google";

const playfair = Playfair_Display({ subsets: ["latin"], weight: ["400", "700", "900"] });

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

  const products = dbProducts && dbProducts.length > 0 ? dbProducts : dummyProducts;
  const stores = dbStores && dbStores.length > 0 ? dbStores : dummyStores;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Split Layout Hero Section */}
      <section className="w-full min-h-[100dvh] md:min-h-[90vh] flex flex-col-reverse lg:flex-row bg-[#E8E8E8]">
        {/* Left Content */}
        <div className="flex-1 flex flex-col justify-center px-6 md:px-8 lg:px-16 xl:px-24 py-6 md:py-12 lg:py-0">
          <h1 className={`text-4xl md:text-6xl lg:text-7xl font-bold tracking-wide mb-4 md:mb-6 text-foreground leading-tight ${playfair.className}`}>
            We don't design <span className="font-[cursive] font-light tracking-normal lowercase animate-silver-shimmer text-3d-silver">clothes</span> We design dreams.
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
        
        {/* Right Image */}
        <div className="w-full flex-1 relative h-[45vh] lg:h-auto lg:min-h-full flex items-center justify-center p-4 md:p-6 lg:p-12">
          <img 
            src="/main-image.jpg" 
            alt="Hero Image" 
            className="w-auto h-auto max-w-full max-h-[45vh] lg:max-h-[85vh] object-contain rounded-2xl"
          />
        </div>
      </section>

      {/* Editorial Product Grid (New Arrivals) */}
      <section className="py-24 md:py-32 container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center text-center mb-16 md:mb-24">
          <h2 className="text-sm tracking-[0.2em] text-muted-foreground uppercase mb-4">Latest Additions</h2>
          <h3 className="text-3xl md:text-5xl font-medium tracking-tight">New Arrivals</h3>
        </div>
        
        {products && products.length > 0 ? (
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
                      Preview
                    </div>
                  )}
                  {/* Subtle hover overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-500" />
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
        ) : (
          <div className="text-center py-20 text-muted-foreground text-lg font-light tracking-wide">
            No collections available at the moment.
          </div>
        )}
        
        <div className="flex justify-center mt-20">
          <Link 
            href="/shop" 
            className="border-b border-black pb-1 font-medium tracking-wide hover:text-muted-foreground hover:border-muted-foreground transition-colors"
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
                  {((store as any).profile_image || (store as any).logo_url) && (
                    <>
                      <div 
                        className="absolute inset-0 bg-cover bg-center opacity-40 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700 z-0" 
                        style={{ backgroundImage: `url(${(store as any).profile_image || (store as any).logo_url})` }}
                      />
                      <div className="absolute inset-0 bg-white/40 group-hover:opacity-0 transition-opacity duration-700 z-0" />
                    </>
                  )}
                  
                  {/* Card Content */}
                  <div className={`relative z-10 flex flex-col items-center transition-opacity duration-500 ${((store as any).profile_image || (store as any).logo_url) ? "group-hover:opacity-0" : ""}`}>
                    <h4 className="font-medium text-2xl tracking-tight mb-4">
                      {store.shop_name}
                    </h4>
                    <p className="text-muted-foreground text-sm font-light leading-relaxed max-w-[200px]">
                      {store.bio || "Explore the signature collection."}
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
