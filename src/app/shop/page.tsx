import { supabase } from "@/utils/supabase/client";
import { Card, CardContent } from "@/components/ui/Card";
import Link from "next/link";

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
    <div className="container mx-auto px-4 py-12">
      <div className="mb-8 border-b border-border pb-8">
        <h1 className="text-4xl font-bold tracking-tight mb-4">Shop All</h1>
        <p className="text-muted-foreground max-w-2xl text-lg">
          Explore our complete collection of premium apparel from independent brands.
        </p>
      </div>

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
                  <p className="text-xs text-muted-foreground mb-1">
                    {product.stores?.shop_name || "AFRODER Store"}
                  </p>
                  <h3 className="font-semibold text-lg line-clamp-1">{product.title}</h3>
                  <p className="font-medium mt-1">₹{product.price}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 text-muted-foreground">
          No products found.
        </div>
      )}
    </div>
  );
}
