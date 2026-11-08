"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { AddToCartButton } from "@/components/ui/AddToCartButton";
import { 
  Sparkles, 
  ShoppingBag, 
  X, 
  ArrowUpDown, 
  Filter,
  Check
} from "lucide-react";

// Helper: compute MRP and discount from a sale price
export function getPricingInfo(price: number) {
  const discountTiers = [10, 15, 20, 25, 30, 40];
  const discount = discountTiers[Math.floor(price * 7) % discountTiers.length];
  const mrp = Math.ceil(price / (1 - discount / 100));
  return { mrp, discount };
}

export interface ShopProduct {
  id: string;
  title: string;
  description?: string;
  price: number;
  category?: string;
  brand?: string;
  store_id?: string;
  image_urls?: string[];
  is_active?: boolean;
  sizes?: string[];
  created_at?: string;
  stores?: {
    id?: string;
    shop_name?: string;
  };
}

interface ShopClientProps {
  initialProducts: ShopProduct[];
  curatedArrivalIds?: string[];
}

interface CategoryFilterDef {
  id: string;
  label: string;
  icon?: string;
  aliases: string[];
}

const CATEGORY_TABS: CategoryFilterDef[] = [
  { id: "all", label: "All", icon: "✦", aliases: ["all"] },
  { id: "shirt", label: "Shirts", icon: "👔", aliases: ["shirt", "shirts", "formal shirt", "casual shirt"] },
  { id: "t-shirt", label: "T-Shirts", icon: "👕", aliases: ["t-shirt", "t-shirts", "tshirt", "tshirts", "tee", "tees", "oversized"] },
  { id: "jeans", label: "Jeans & Pants", icon: "👖", aliases: ["jeans", "jean", "pants", "pant", "trouser", "trousers", "lower", "lowers", "cargo", "shorts"] },
  { id: "shoes", label: "Shoes & Sneakers", icon: "👟", aliases: ["shoes", "shoe", "sneakers", "sneaker", "footwear", "loafers", "boots", "slippers"] },
  { id: "watches", label: "Watches", icon: "⌚", aliases: ["watches", "watch", "smartwatch", "timepiece"] },
  { id: "sunglasses", label: "Sunglasses", icon: "🕶️", aliases: ["sunglasses", "sunglass", "shades", "eyewear", "glasses", "frames"] },
  { id: "perfumes", label: "Perfumes", icon: "🧴", aliases: ["perfumes", "perfume", "fragrance", "fragrances", "attar", "ittar", "cologne", "spray"] },
  { id: "accessories", label: "Accessories", icon: "💼", aliases: ["accessories", "accessory", "belt", "belts", "wallet", "wallets", "cap", "caps", "chain", "jewelry", "bracelet"] },
  { id: "new-arrivals", label: "New Arrivals", icon: "✨", aliases: ["new", "new arrivals", "new-arrivals", "latest"] },
];

function isProductMatchingCategory(
  product: ShopProduct,
  filterId: string,
  curatedArrivalIds: string[] = []
): boolean {
  if (filterId === "all") return true;

  if (filterId === "new-arrivals") {
    if (curatedArrivalIds.includes(product.id)) return true;
    // Or products created in the last 30 days
    if (product.created_at) {
      const createdTime = new Date(product.created_at).getTime();
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      if (createdTime >= thirtyDaysAgo) return true;
    }
    return false;
  }

  const category = (product.category || "").toLowerCase().trim();
  const title = (product.title || "").toLowerCase().trim();
  const description = (product.description || "").toLowerCase().trim();
  const haystack = `${category} ${title} ${description}`;

  switch (filterId) {
    case "shirt": {
      // Must match shirt, but NOT t-shirt or tee
      const isTShirt =
        category.includes("t-shirt") ||
        category.includes("tshirt") ||
        category.includes("tee") ||
        title.includes("t-shirt") ||
        title.includes("tshirt") ||
        title.includes("tee");
      if (isTShirt) return false;
      return haystack.includes("shirt");
    }

    case "t-shirt": {
      return (
        category.includes("t-shirt") ||
        category.includes("tshirt") ||
        category.includes("tee") ||
        title.includes("t-shirt") ||
        title.includes("tshirt") ||
        title.includes("tee")
      );
    }

    case "jeans": {
      return (
        haystack.includes("jean") ||
        haystack.includes("pant") ||
        haystack.includes("trouser") ||
        haystack.includes("lower") ||
        haystack.includes("cargo") ||
        haystack.includes("chino") ||
        haystack.includes("shorts") ||
        haystack.includes("bottom")
      );
    }

    case "shoes": {
      return (
        haystack.includes("sneaker") ||
        haystack.includes("shoe") ||
        haystack.includes("footwear") ||
        haystack.includes("loafer") ||
        haystack.includes("boot") ||
        haystack.includes("slide") ||
        haystack.includes("slipper")
      );
    }

    case "watches": {
      return (
        haystack.includes("watch") ||
        haystack.includes("smartwatch") ||
        haystack.includes("chronograph") ||
        haystack.includes("timepiece")
      );
    }

    case "sunglasses": {
      return (
        haystack.includes("sunglass") ||
        haystack.includes("glasses") ||
        haystack.includes("eyewear") ||
        haystack.includes("shades") ||
        haystack.includes("frame")
      );
    }

    case "perfumes": {
      return (
        haystack.includes("perfume") ||
        haystack.includes("fragrance") ||
        haystack.includes("edp") ||
        haystack.includes("edt") ||
        haystack.includes("attar") ||
        haystack.includes("ittar") ||
        haystack.includes("cologne") ||
        haystack.includes("deodorant")
      );
    }

    case "accessories": {
      return (
        haystack.includes("belt") ||
        haystack.includes("wallet") ||
        haystack.includes("cap") ||
        haystack.includes("hat") ||
        haystack.includes("jewelry") ||
        haystack.includes("chain") ||
        haystack.includes("bracelet") ||
        haystack.includes("kada") ||
        haystack.includes("ring") ||
        haystack.includes("bag") ||
        haystack.includes("backpack") ||
        haystack.includes("socks") ||
        haystack.includes("accessories") ||
        haystack.includes("accessory")
      );
    }

    default:
      return haystack.includes(filterId.toLowerCase());
  }
}

export function ShopClient({ initialProducts, curatedArrivalIds = [] }: ShopClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Resolve initial active filter from URL query param (e.g. ?category=shirt or ?tag=t-shirt)
  const initialFilterId = useMemo(() => {
    const rawCat = (searchParams.get("category") || searchParams.get("tag") || "").toLowerCase().trim();
    if (!rawCat) return "all";

    const match = CATEGORY_TABS.find(
      (tab) => tab.id === rawCat || tab.aliases.some((alias) => alias.toLowerCase() === rawCat)
    );
    return match ? match.id : "all";
  }, [searchParams]);

  const [activeCategory, setActiveCategory] = useState<string>(initialFilterId);
  const [sortBy, setSortBy] = useState<string>("newest");
  const [visibleCount, setVisibleCount] = useState<number>(16);

  // Sync state if URL changes externally
  useEffect(() => {
    if (initialFilterId && initialFilterId !== activeCategory) {
      setActiveCategory(initialFilterId);
    }
  }, [initialFilterId]);

  // Compute product count per category tab for rich badge display
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    CATEGORY_TABS.forEach((tab) => {
      counts[tab.id] = initialProducts.filter((p) =>
        isProductMatchingCategory(p, tab.id, curatedArrivalIds)
      ).length;
    });
    return counts;
  }, [initialProducts, curatedArrivalIds]);

  // Filter products by selected category
  const filteredProducts = useMemo(() => {
    return initialProducts.filter((p) =>
      isProductMatchingCategory(p, activeCategory, curatedArrivalIds)
    );
  }, [initialProducts, activeCategory, curatedArrivalIds]);

  // Sort products
  const sortedProducts = useMemo(() => {
    const list = [...filteredProducts];
    switch (sortBy) {
      case "price-asc":
        return list.sort((a, b) => a.price - b.price);
      case "price-desc":
        return list.sort((a, b) => b.price - a.price);
      case "discount": {
        return list.sort((a, b) => {
          const discA = getPricingInfo(a.price).discount;
          const discB = getPricingInfo(b.price).discount;
          return discB - discA;
        });
      }
      case "newest":
      default:
        return list.sort((a, b) => {
          const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return timeB - timeA;
        });
    }
  }, [filteredProducts, sortBy]);

  // Visible sliced list
  const displayedProducts = useMemo(() => {
    return sortedProducts.slice(0, visibleCount);
  }, [sortedProducts, visibleCount]);

  const handleCategorySelect = (categoryId: string) => {
    setActiveCategory(categoryId);
    setVisibleCount(16);

    // Update URL query cleanly without full page reload
    const url = new URL(window.location.href);
    if (categoryId === "all") {
      url.searchParams.delete("category");
      url.searchParams.delete("tag");
    } else {
      url.searchParams.set("category", categoryId);
      url.searchParams.delete("tag");
    }
    window.history.replaceState({}, "", url.toString());
  };

  const handleResetToAll = () => {
    handleCategorySelect("all");
  };

  const currentTab = CATEGORY_TABS.find((t) => t.id === activeCategory) || CATEGORY_TABS[0];

  return (
    <div className="space-y-6">
      {/* ── Sticky Filter Chips Bar ── */}
      <div className="sticky top-[69px] sm:top-[79px] z-30 bg-background/95 backdrop-blur-md border-b border-border shadow-2xs">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-3">
            {CATEGORY_TABS.map((tab) => {
              const isSelected = activeCategory === tab.id;
              const count = categoryCounts[tab.id] ?? 0;

              return (
                <button
                  key={tab.id}
                  onClick={() => handleCategorySelect(tab.id)}
                  className={`flex-shrink-0 text-xs sm:text-sm font-semibold px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full border transition-all duration-200 whitespace-nowrap flex items-center gap-1.5 cursor-pointer select-none active:scale-95 ${
                    isSelected
                      ? "bg-foreground text-background border-foreground shadow-sm ring-1 ring-foreground"
                      : "bg-card/70 hover:bg-secondary text-muted-foreground hover:text-foreground border-border hover:border-foreground/40"
                  }`}
                >
                  {tab.icon && <span className="text-xs leading-none">{tab.icon}</span>}
                  <span>{tab.label}</span>
                  {count > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold leading-tight ${
                        isSelected
                          ? "bg-background/25 text-background"
                          : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Product Results Header (Count, Active Filter, Sort Dropdown) ── */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/70">
          {/* Left: Product count & active tag */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <p className="text-xs sm:text-sm font-medium text-muted-foreground">
              Showing <strong className="text-foreground font-bold">{sortedProducts.length}</strong> {sortedProducts.length === 1 ? "product" : "products"}
            </p>

            {activeCategory !== "all" && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                <span>Category: {currentTab.label}</span>
                <button
                  type="button"
                  onClick={handleResetToAll}
                  className="hover:text-foreground p-0.5 rounded cursor-pointer"
                  title="Clear filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>

          {/* Right: Sort Dropdown */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <span className="text-xs text-muted-foreground hidden sm:inline flex items-center gap-1">
              <ArrowUpDown className="w-3 h-3" />
              <span>Sort by:</span>
            </span>
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="text-xs sm:text-sm font-medium text-foreground bg-card border border-border rounded-xl px-3 py-1.5 sm:py-2 pr-7 cursor-pointer hover:border-foreground/60 transition-colors outline-none shadow-2xs appearance-none"
              >
                <option value="newest">Newest First</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="discount">Biggest Discount</option>
              </select>
              <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Product Grid ── */}
      <div className="container mx-auto px-3 sm:px-6 lg:px-8 pb-12">
        {displayedProducts.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
            {displayedProducts.map((product) => {
              const { mrp, discount } = getPricingInfo(product.price);

              return (
                <div key={product.id} className="flex flex-col">
                  <Card className="flex flex-col h-full overflow-hidden border border-border/60 shadow-none hover:shadow-md hover:border-foreground/20 transition-all duration-300 rounded-xl group bg-card">
                    {/* ── Product Image ── */}
                    <Link href={`/product/${product.id}`} className="relative block overflow-hidden">
                      <div className="aspect-[3/4] bg-muted overflow-hidden rounded-t-xl relative">
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
                      <span className="absolute top-2 left-2 bg-red-600 text-white text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full shadow-sm">
                        {discount}% OFF
                      </span>

                      {/* Category tag badge on image (if present) */}
                      {product.category && (
                        <span className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md text-white text-[10px] font-medium px-2 py-0.5 rounded-md shadow-xs">
                          {product.category}
                        </span>
                      )}
                    </Link>

                    {/* ── Product Info + Buttons ── */}
                    <div className="flex flex-col flex-1 p-2.5 sm:p-3.5 gap-2">
                      {/* Store name */}
                      {product.store_id || product.stores?.id ? (
                        <Link 
                          href={`/store/${product.store_id || product.stores?.id}`}
                          className="hover:underline text-[10px] sm:text-xs text-muted-foreground truncate leading-none block font-medium"
                        >
                          {product.stores?.shop_name || "Visit Store"}
                        </Link>
                      ) : (
                        <p className="text-[10px] sm:text-xs text-muted-foreground truncate leading-none">
                          {product.stores?.shop_name || "AFRODER Store"}
                        </p>
                      )}

                      {/* Product title */}
                      <Link href={`/product/${product.id}`}>
                        <h3 className="font-semibold text-[13px] sm:text-sm leading-snug line-clamp-2 hover:underline underline-offset-2 text-foreground">
                          {product.title}
                        </h3>
                      </Link>

                      {/* Pricing */}
                      <div className="flex flex-col gap-0.5">
                        <p className="font-extrabold text-sm sm:text-base text-foreground">
                          ₹{product.price}
                        </p>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] sm:text-xs text-muted-foreground line-through">
                            MRP ₹{mrp}
                          </span>
                          <span className="text-[11px] sm:text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                            Save ₹{mrp - product.price}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">Incl. of all taxes</p>
                      </div>

                      {/* ── CTA Button ── */}
                      <div className="mt-auto pt-2">
                        <AddToCartButton
                          product={{
                            id: product.id,
                            title: product.title,
                            price: product.price,
                            image_urls: product.image_urls,
                            sizes: product.sizes,
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
          /* ── Empty Filter State ── */
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 sm:p-16 text-center space-y-4 max-w-lg mx-auto my-8">
            <div className="w-14 h-14 rounded-full bg-secondary/80 flex items-center justify-center mx-auto text-2xl">
              {currentTab.icon || "🛍️"}
            </div>
            <div className="space-y-1">
              <h3 className="text-base sm:text-lg font-bold text-foreground">
                No products found in &quot;{currentTab.label}&quot;
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Independent boutiques haven&apos;t added any items to this category yet. Check out our other fashion collections or view all products.
              </p>
            </div>
            <button
              type="button"
              onClick={handleResetToAll}
              className="inline-flex items-center gap-2 bg-foreground text-background font-semibold text-xs sm:text-sm px-5 py-2.5 rounded-full hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
            >
              <span>View All Products</span>
              <span className="font-mono">({initialProducts.length})</span>
            </button>
          </div>
        )}

        {/* ── Load More Button (Only if more items exist) ── */}
        {sortedProducts.length > displayedProducts.length && (
          <div className="mt-10 sm:mt-14 flex justify-center">
            <button
              type="button"
              onClick={() => setVisibleCount((prev) => prev + 16)}
              className="w-full sm:w-auto min-w-[200px] px-8 py-3 text-sm font-semibold border border-border rounded-full hover:bg-foreground hover:text-background transition-all duration-200 cursor-pointer shadow-2xs"
            >
              Load More ({sortedProducts.length - displayedProducts.length} remaining)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

