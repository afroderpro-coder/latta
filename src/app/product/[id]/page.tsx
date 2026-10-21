"use client";

import { useEffect, useState, useRef, use } from "react";
import { supabase } from "@/utils/supabase/client";
import { Button } from "@/components/ui/Button";
import { useCartStore } from "@/store/useCartStore";
import { ArrowLeft, ShoppingBag, ChevronLeft, ChevronRight, Check } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { BrandLoader } from "@/components/ui/BrandLoader";

const fallbackRelatedProducts = [
  {
    id: "1",
    title: "Essential Oversized Tee",
    price: 1999,
    image_urls: ["https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&q=80"],
    stores: { shop_name: "Acme Studios" },
  },
  {
    id: "2",
    title: "Classic Denim Jacket",
    price: 3499,
    image_urls: ["https://images.unsplash.com/photo-1576871337622-98d48d1cf531?w=500&q=80"],
    stores: { shop_name: "Indigo Wear" },
  },
  {
    id: "3",
    title: "Minimalist Sneakers",
    price: 4299,
    image_urls: ["https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=500&q=80"],
    stores: { shop_name: "Stride" },
  },
  {
    id: "4",
    title: "Heavyweight Hoodie",
    price: 2899,
    image_urls: ["https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=500&q=80"],
    stores: { shop_name: "Comfort Co" },
  },
];

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const [product, setProduct] = useState<any>(null);
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isAdded, setIsAdded] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const addItem = useCartStore((state) => state.addItem);

  useEffect(() => {
    // Reset page view when product ID changes
    window.scrollTo({ top: 0, behavior: "smooth" });
    setSelectedSize(null);
    setSelectedImageIndex(0);
    setIsLoading(true);

    async function loadProductAndRelated() {
      // 1. Fetch current product
      const { data: currentProduct } = await supabase
        .from("products")
        .select("*, stores(id, shop_name)")
        .eq("id", unwrappedParams.id)
        .single();

      if (currentProduct) {
        setProduct(currentProduct);

        // 2. Fetch related products from active listings excluding this product
        const { data: dbRelated } = await supabase
          .from("products")
          .select("*, stores(id, shop_name)")
          .eq("is_active", true)
          .neq("id", unwrappedParams.id)
          .limit(10);

        if (dbRelated && dbRelated.length > 0) {
          setRelatedProducts(dbRelated);
        } else {
          setRelatedProducts(fallbackRelatedProducts.filter((p) => p.id !== unwrappedParams.id));
        }
      } else {
        setProduct(null);
      }

      setIsLoading(false);
    }

    loadProductAndRelated();
  }, [unwrappedParams.id]);

  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === "left" ? -320 : 320;
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  if (isLoading) {
    return <BrandLoader fullScreen />;
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-24 text-center">
        <h2 className="text-2xl font-bold mb-4">Product Not Found</h2>
        <p className="text-muted-foreground mb-6">The piece you are looking for is unavailable or has been removed.</p>
        <Link href="/shop">
          <Button>Back to Shop</Button>
        </Link>
      </div>
    );
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

    setIsAdded(true);
    setTimeout(() => {
      setIsAdded(false);
    }, 1800);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <Link href="/shop" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-8">
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
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col">
          <Link
            href={`/store/${product.stores?.id || product.store_id}`}
            className="text-sm font-medium text-primary hover:underline mb-2"
          >
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
            <Button
              size="lg"
              className={`w-full h-14 text-lg font-bold transition-all duration-200 ${
                isAdded
                  ? "bg-[#e6f7ec] hover:bg-[#d4f3dd] text-[#14532d] border-2 border-[#16a34a]"
                  : ""
              }`}
              onClick={handleAddToCart}
            >
              {isAdded ? (
                <>
                  <Check className="mr-2 h-6 w-6 text-[#16a34a]" /> Added to Cart!
                </>
              ) : (
                <>
                  <ShoppingBag className="mr-2 h-5 w-5" /> Add to Cart
                </>
              )}
            </Button>
          </div>
        </motion.div>
      </div>

      {/* Related Products Section (Amazon / Flipkart style compact horizontal carousel) */}
      {relatedProducts.length > 0 && (
        <section className="mt-20 pt-12 border-t border-border">
          <div className="flex items-end justify-between mb-6">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1">
                More To Explore
              </p>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
                Related Products
              </h2>
            </div>

            {/* Left/Right Scroll Arrow Buttons */}
            <div className="hidden sm:flex items-center space-x-2">
              <button
                type="button"
                onClick={() => scroll("left")}
                className="p-2.5 rounded-full border border-border bg-background hover:bg-muted text-foreground transition-colors shadow-xs"
                aria-label="Scroll left"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => scroll("right")}
                className="p-2.5 rounded-full border border-border bg-background hover:bg-muted text-foreground transition-colors shadow-xs"
                aria-label="Scroll right"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Horizontal Scrollable Row */}
          <div
            ref={scrollContainerRef}
            className="flex gap-4 sm:gap-6 overflow-x-auto scrollbar-none pb-4 pt-1 -mx-4 px-4 sm:mx-0 sm:px-0 scroll-smooth snap-x snap-mandatory"
          >
            {relatedProducts.map((rel) => {
              const relImages: string[] = Array.isArray(rel.image_urls) ? rel.image_urls : [];
              const relStore = rel.stores?.shop_name || "AFRODER";

              return (
                <Link
                  key={rel.id}
                  href={`/product/${rel.id}`}
                  className="group flex-shrink-0 w-40 sm:w-48 md:w-52 snap-start flex flex-col focus:outline-none"
                >
                  {/* Compact Product Image */}
                  <div className="aspect-[3/4] w-full bg-secondary/60 rounded-xl overflow-hidden relative border border-border/80 mb-3 group-hover:border-foreground/30 transition-all duration-300 shadow-xs group-hover:shadow-md">
                    {relImages[0] ? (
                      <img
                        src={relImages[0]}
                        alt={rel.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs uppercase tracking-wider">
                        Preview
                      </div>
                    )}
                    {/* Hover Tint */}
                    <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/5 transition-colors duration-300" />
                  </div>

                  {/* Compact Product Details */}
                  <div className="space-y-1">
                    <p className="text-[11px] font-medium tracking-wide uppercase text-muted-foreground truncate">
                      {relStore}
                    </p>
                    <h3 className="text-sm font-semibold text-foreground tracking-tight line-clamp-1 group-hover:text-primary transition-colors">
                      {rel.title}
                    </h3>
                    <p className="text-sm font-bold text-foreground">
                      ₹{rel.price}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

