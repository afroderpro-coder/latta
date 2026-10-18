"use client";

import { useEffect, useState, use } from "react";
import { supabase } from "@/utils/supabase/client";
import { Button } from "@/components/ui/Button";
import { useCartStore } from "@/store/useCartStore";
import { Loader2, ArrowLeft, ShoppingBag, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const [product, setProduct] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
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

  const images: string[] = Array.isArray(product.image_urls) ? product.image_urls : [];

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
      imageUrl: images[0] || "",
      variant: selectedSize ? { size: selectedSize, color: "" } : undefined,
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-8">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to shopping
      </Link>
      
      <div className="grid md:grid-cols-2 gap-12">
        {/* Product Images Gallery */}
        <div className="flex flex-col space-y-4">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="aspect-[4/5] bg-muted rounded-2xl overflow-hidden relative border border-border group"
          >
            {images.length > 0 ? (
              <img 
                src={images[selectedImageIndex] || images[0]} 
                alt={product.title} 
                className="w-full h-full object-cover transition-all duration-300" 
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                No Image Available
              </div>
            )}

            {/* Prev / Next controls for multiple images */}
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setSelectedImageIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))}
                  className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-black text-white backdrop-blur transition-all opacity-80 group-hover:opacity-100 shadow"
                  title="Previous image"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedImageIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-black text-white backdrop-blur transition-all opacity-80 group-hover:opacity-100 shadow"
                  title="Next image"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>

                {/* Counter Badge */}
                <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur text-white text-xs px-2.5 py-1 rounded-full font-medium">
                  {selectedImageIndex + 1} / {images.length}
                </div>
              </>
            )}
          </motion.div>

          {/* Thumbnails Row */}
          {images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
              {images.map((img: string, idx: number) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedImageIndex(idx)}
                  className={`relative aspect-[3/4] w-20 flex-shrink-0 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                    selectedImageIndex === idx
                      ? "border-primary ring-2 ring-primary/20 scale-105"
                      : "border-border opacity-70 hover:opacity-100"
                  }`}
                >
                  <img src={img} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Details */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex flex-col"
        >
          <Link href={`/store/${product.stores?.id || product.store_id}`} className="text-sm font-medium text-primary hover:underline mb-2">
            {product.stores?.shop_name || "Visit Store"}
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
