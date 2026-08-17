"use client";

import { useEffect, useState, use } from "react";
import { supabase } from "@/utils/supabase/client";
import { Button } from "@/components/ui/Button";
import { useCartStore } from "@/store/useCartStore";
import { Loader2, ArrowLeft, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const [product, setProduct] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const addItem = useCartStore((state) => state.addItem);

  useEffect(() => {
    async function loadProduct() {
      const { data } = await supabase
        .from("products")
        .select("*, stores(id, shop_name)")
        .eq("id", unwrappedParams.id)
        .single();
      
      if (data) setProduct(data);
      setIsLoading(false);
    }
    loadProduct();
  }, [unwrappedParams.id]);

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-primary h-8 w-8" /></div>;
  }

  if (!product) {
    return <div className="text-center py-20">Product not found.</div>;
  }

  const handleAddToCart = () => {
    if (product.sizes && product.sizes.length > 0 && !selectedSize) {
      alert("Please select a size first.");
      return;
    }

    addItem({
      id: selectedSize ? `${product.id}-${selectedSize}` : product.id,
      productId: product.id,
      storeId: product.store_id,
      name: product.title,
      price: product.price,
      quantity: 1,
      imageUrl: product.image_urls?.[0] || "",
      variant: selectedSize ? { size: selectedSize, color: "" } : undefined,
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-8">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to shopping
      </Link>
      
      <div className="grid md:grid-cols-2 gap-12">
        {/* Product Image */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="aspect-[4/5] bg-muted rounded-2xl overflow-hidden relative"
        >
          {product.image_urls?.[0] ? (
            <img src={product.image_urls[0]} alt={product.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              No Image Available
            </div>
          )}
        </motion.div>

        {/* Product Details */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex flex-col"
        >
          <Link href={`/store/${product.stores?.id}`} className="text-sm font-medium text-primary hover:underline mb-2">
            {product.stores?.shop_name}
          </Link>
          <h1 className="text-4xl font-bold tracking-tight mb-4">{product.title}</h1>
          <p className="text-2xl font-medium mb-6">₹{product.price}</p>
          
          <div className="prose text-muted-foreground mb-8">
            <p>{product.description || "No description provided."}</p>
          </div>
          
          {product.sizes && product.sizes.length > 0 && (
            <div className="mb-8">
              <h3 className="text-sm font-medium mb-3">Select Size</h3>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((size: string) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`h-10 min-w-[3rem] px-4 rounded-md border text-sm font-medium transition-colors ${
                      selectedSize === size
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background hover:bg-muted"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          <div className="mt-auto pt-8 border-t border-border">
            <Button size="lg" className="w-full h-14 text-lg" onClick={handleAddToCart}>
              <ShoppingBag className="mr-2 h-5 w-5" /> Add to Cart
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
