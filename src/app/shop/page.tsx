import { supabase } from "@/utils/supabase/client";
import { Card } from "@/components/ui/Card";
import { AddToCartButton } from "@/components/ui/AddToCartButton";
import Link from "next/link";

// Helper: compute MRP and discount from a sale price
function getPricingInfo(price: number) {
  // Simulate a discount between 10%–40% for demo purposes
  const discountTiers = [10, 15, 20, 25, 30, 40];
  const discount = discountTiers[Math.floor(price * 7) % discountTiers.length];
  const mrp = Math.ceil(price / (1 - discount / 100));
  return { mrp, discount };
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ShopPage() {
  const { data: dbProducts } = await supabase
    .from("products")
    .select("*, stores(shop_name)")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

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
    },
    {
      id: "5",
      title: "Vintage Wash Jeans",
      price: 95.00,
      image_urls: ["https://images.unsplash.com/photo-1542272604-787c3835535d?w=500&q=80"],
      stores: { shop_name: "Indigo Wear" }
    },
    {
      id: "6",
      title: "Chunky Knit Sweater",
      price: 78.00,
      image_urls: ["https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=500&q=80"],
      stores: { shop_name: "Comfort Co" }
    }
  ];

  const products = dbProducts && dbProducts.length > 0 ? dbProducts : dummyProducts;

  return (
    <div className="min-h-screen bg-background">

      {/* ── Page Header ── */}
      <div className="border-b border-border">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 md:py-14">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-1.5 sm:mb-3">
            Shop All
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base leading-relaxed max-w-2xl">
            Explore our complete collection of premium apparel from independent brands.
          </p>
        </div>
      </div>

      {/* ── Sticky Filter Chips ── */}
      <div className="sticky top-[79px] z-30 bg-background/95 backdrop-blur border-b border-border">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-3">
            {["All", "New Arrivals", "Tops", "Bottoms", "Outerwear", "Accessories", "Sale"].map(
              (cat) => (
                <button
                  key={cat}
                  className={`flex-shrink-0 text-xs sm:text-sm font-medium px-3.5 sm:px-4 py-1.5 rounded-full border transition-colors whitespace-nowrap
                    ${cat === "All"
                      ? "bg-foreground text-background border-foreground"
                      : "bg-transparent text-muted-foreground border-border hover:border-foreground hover:text-foreground"
                    }`}
                >
                  {cat}
                </button>
              )
            )}
          </div>
        </div>
      </div>

      {/* ── Product Grid ── */}
      <div className="container mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8">

        {/* Results row */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs sm:text-sm text-muted-foreground">
            {products.length} products
          </p>
          <select className="text-xs sm:text-sm text-muted-foreground bg-transparent border border-border rounded-lg px-2.5 py-1.5 cursor-pointer hover:border-foreground transition-colors outline-none">
            <option>Newest</option>
            <option>Price: Low to High</option>
            <option>Price: High to Low</option>
            <option>Best Selling</option>
          </select>
        </div>

        {products.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
            {products.map((product) => {
              const { mrp, discount } = getPricingInfo(product.price);

              return (
                <div key={product.id} className="flex flex-col">
                  <Card className="flex flex-col h-full overflow-hidden border border-border/60 shadow-none hover:shadow-md hover:border-foreground/20 transition-all duration-300 rounded-xl group">

                    {/* ── Product Image ── */}
                    <Link href={`/product/${product.id}`} className="relative block overflow-hidden">
                      <div className="aspect-[3/4] bg-muted overflow-hidden rounded-t-xl">
                        {product.image_urls?.[0] ? (
                          <img
                            src={product.image_urls[0]}
                            alt={product.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                            No Image
                          </div>
                        )}
                      </div>

                      {/* Discount Badge */}
                      <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full shadow-sm">
                        {discount}% OFF
                      </span>
                    </Link>

                    {/* ── Product Info + Buttons ── */}
                    <div className="flex flex-col flex-1 p-2.5 sm:p-3 gap-2">

                      {/* Store name */}
                      <p className="text-[10px] sm:text-xs text-muted-foreground truncate leading-none">
                        {product.stores?.shop_name || "AFRODER Store"}
                      </p>

                      {/* Product title */}
                      <Link href={`/product/${product.id}`}>
                        <h3 className="font-semibold text-[13px] sm:text-sm leading-snug line-clamp-2 hover:underline underline-offset-2">
                          {product.title}
                        </h3>
                      </Link>

                      {/* Pricing */}
                      <div className="flex flex-col gap-0.5">
                        {/* Sale price */}
                        <p className="font-bold text-sm sm:text-base text-foreground">
                          ₹{product.price}
                        </p>
                        {/* MRP crossed out + savings */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] sm:text-xs text-muted-foreground line-through">
                            MRP ₹{mrp}
                          </span>
                          <span className="text-[11px] sm:text-xs text-green-600 font-medium">
                            Save ₹{mrp - product.price}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">Incl. of all taxes</p>
                      </div>

                      {/* ── CTA Buttons ── */}
                      <div className="mt-auto pt-1">
                        <AddToCartButton
                          product={{
                            id: product.id,
                            title: product.title,
                            price: product.price,
                            image_urls: product.image_urls,
                          }}
                        />
                      </div>
                    </div>
                  </Card>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20 text-muted-foreground">
            <p className="text-lg font-medium mb-2">No products found</p>
            <p className="text-sm">Check back soon for new arrivals.</p>
          </div>
        )}

        {/* Load More */}
        {products.length > 0 && (
          <div className="mt-10 sm:mt-14 flex justify-center">
            <button className="w-full sm:w-auto min-w-[180px] px-8 py-3.5 text-sm font-medium border border-border rounded-full hover:bg-foreground hover:text-background transition-colors duration-200">
              Load More
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
