"use client";

import React, { useState } from "react";
import { useCartStore } from "@/store/useCartStore";
import { useRouter } from "next/navigation";
import { ShoppingCart, Zap, Check } from "lucide-react";

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
  const [isAdded, setIsAdded] = useState(false);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    addItem({
      id: product.id,
      productId: product.id,
      storeId: product.store_id || "unknown",
      name: product.title,
      price: product.price,
      quantity: 1,
      imageUrl: product.image_urls?.[0] || "",
    });

    setIsAdded(true);
    setTimeout(() => {
      setIsAdded(false);
    }, 1800);
  };

  const handleBuyNow = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleAddToCart(e);
    router.push("/cart");
  };

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {/* Add to Cart */}
      <button
        type="button"
        onClick={handleAddToCart}
        className={`flex items-center justify-center gap-1.5 w-full py-2.5 sm:py-2.5 rounded-lg border-2 text-[11px] sm:text-xs font-bold tracking-wide transition-all duration-200 active:scale-95 touch-manipulation ${
          isAdded
            ? "border-[#16a34a] bg-[#e6f7ec] text-[#14532d] shadow-sm"
            : "border-foreground bg-transparent text-foreground hover:bg-foreground hover:text-background"
        }`}
      >
        {isAdded ? (
          <>
            <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0 text-[#16a34a]" />
            Added!
          </>
        ) : (
          <>
            <ShoppingCart className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
            Add to Cart
          </>
        )}
      </button>

      {/* Buy Now */}
      <button
        type="button"
        onClick={handleBuyNow}
        className="flex items-center justify-center gap-1.5 w-full py-2.5 sm:py-2.5 rounded-lg bg-foreground text-background text-[11px] sm:text-xs font-bold tracking-wide hover:bg-foreground/85 transition-all duration-200 active:scale-95 touch-manipulation"
      >
        <Zap className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
        Buy Now
      </button>
    </div>
  );
}
