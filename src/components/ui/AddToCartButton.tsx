"use client";

import React from "react";
import { useCartStore } from "@/store/useCartStore";
import { useRouter } from "next/navigation";
import { ShoppingCart, Zap } from "lucide-react";

interface AddToCartButtonProps {
  product: {
    id: string;
    title: string;
    price: number;
    image_urls?: string[];
    store_id?: string;
  };
}

export function AddToCartButton({ product }: AddToCartButtonProps) {
  const { addItem } = useCartStore();
  const router = useRouter();

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    addItem({
      id: product.id,
      productId: product.id,
      storeId: product.store_id || "unknown",
      name: product.title,
      price: product.price,
      quantity: 1,
      imageUrl: product.image_urls?.[0] || "",
    });
  };

  const handleBuyNow = (e: React.MouseEvent) => {
    e.preventDefault();
    handleAddToCart(e);
    router.push("/cart");
  };

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {/* Add to Cart */}
      <button
        onClick={handleAddToCart}
        className="flex items-center justify-center gap-1.5 w-full py-2.5 sm:py-2.5 rounded-lg border-2 border-foreground bg-transparent text-foreground text-[11px] sm:text-xs font-bold tracking-wide hover:bg-foreground hover:text-background transition-all duration-200 active:scale-95 touch-manipulation"
      >
        <ShoppingCart className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
        Add to Cart
      </button>

      {/* Buy Now */}
      <button
        onClick={handleBuyNow}
        className="flex items-center justify-center gap-1.5 w-full py-2.5 sm:py-2.5 rounded-lg bg-foreground text-background text-[11px] sm:text-xs font-bold tracking-wide hover:bg-foreground/85 transition-all duration-200 active:scale-95 touch-manipulation"
      >
        <Zap className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
        Buy Now
      </button>
    </div>
  );
}
