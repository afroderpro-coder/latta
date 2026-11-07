"use client";

import React, { useState } from "react";
import { useCartStore } from "@/store/useCartStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useRouter } from "next/navigation";
import { ShoppingCart, Zap, Check } from "lucide-react";
import { GoogleLoginPromptModal } from "@/components/auth/GoogleLoginPromptModal";

interface AddToCartButtonProps {
  product: {
    id: string;
    title: string;
    price: number;
    image_urls?: string[];
    store_id?: string;
    sizes?: string[];
  };
}

export function AddToCartButton({ product }: AddToCartButtonProps) {
  const { addItem } = useCartStore();
  const { user } = useAuthStore();
  const router = useRouter();
  const [isAdded, setIsAdded] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authActionText, setAuthActionText] = useState("add this item to your cart");
  const needsSizeSelection = Array.isArray(product.sizes) && product.sizes.length > 1;
  const singleSize = Array.isArray(product.sizes) && product.sizes.length === 1 ? product.sizes[0] : null;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Check Google Auth first
    if (!user) {
      setAuthActionText("add this item to your cart");
      setShowAuthModal(true);
      return;
    }

    if (needsSizeSelection) {
      router.push(`/product/${product.id}`);
      return;
    }

    const itemId = singleSize ? `${product.id}-${singleSize}` : product.id;

    addItem({
      id: itemId,
      productId: product.id,
      storeId: product.store_id || "unknown",
      name: product.title,
      price: product.price,
      quantity: 1,
      imageUrl: product.image_urls?.[0] || "",
      variant: singleSize ? { size: singleSize, color: "" } : undefined,
    });

    setIsAdded(true);
    setTimeout(() => {
      setIsAdded(false);
    }, 1800);
  };

  const handleBuyNow = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Check Google Auth first
    if (!user) {
      setAuthActionText("buy this item");
      setShowAuthModal(true);
      return;
    }

    if (needsSizeSelection) {
      router.push(`/product/${product.id}`);
      return;
    }

    handleAddToCart(e);
    router.push("/cart");
  };

  return (
    <>
      <div className="grid grid-cols-2 gap-2 w-full">
        {/* Add to Cart */}
        <button
          type="button"
          onClick={handleAddToCart}
          className={`flex items-center justify-center gap-1.5 w-full h-9 sm:h-10 px-2 rounded-lg border text-[11px] sm:text-xs font-semibold tracking-wide transition-all duration-200 active:scale-95 touch-manipulation cursor-pointer ${
            isAdded
              ? "border-[#16a34a] bg-[#e6f7ec] text-[#14532d] shadow-xs"
              : "border-foreground/80 bg-background text-foreground hover:bg-foreground hover:text-background hover:border-foreground shadow-2xs"
          }`}
          title={needsSizeSelection ? "Select Size" : "Add to Cart"}
        >
          {isAdded ? (
            <>
              <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0 text-[#16a34a]" />
              <span className="truncate">Added!</span>
            </>
          ) : (
            <>
              <ShoppingCart className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="hidden min-[360px]:inline truncate">{needsSizeSelection ? "Select Size" : "Add to Cart"}</span>
              <span className="min-[360px]:hidden truncate">{needsSizeSelection ? "Size" : "Add"}</span>
            </>
          )}
        </button>

        {/* Buy Now */}
        <button
          type="button"
          onClick={handleBuyNow}
          className="flex items-center justify-center gap-1.5 w-full h-9 sm:h-10 px-2 rounded-lg bg-foreground text-background border border-foreground text-[11px] sm:text-xs font-semibold tracking-wide hover:bg-foreground/85 transition-all duration-200 active:scale-95 touch-manipulation cursor-pointer shadow-2xs"
          title="Buy Now"
        >
          <Zap className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0 fill-current" />
          <span className="hidden min-[360px]:inline truncate">Buy Now</span>
          <span className="min-[360px]:hidden truncate">Buy</span>
        </button>
      </div>

      <GoogleLoginPromptModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        actionText={authActionText}
        redirectUrl={needsSizeSelection ? `/product/${product.id}` : "/cart"}
      />
    </>
  );
}
