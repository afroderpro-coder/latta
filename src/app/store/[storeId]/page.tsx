"use client";

import { useEffect, useState, use } from "react";
import { supabase } from "@/utils/supabase/client";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuthStore } from "@/store/useAuthStore";
import { 
  Loader2, 
  MapPin, 
  Phone, 
  MessageCircle, 
  Star, 
  Store as StoreIcon, 
  ShoppingBag, 
  Send,
  CheckCircle2,
  Calendar,
  ExternalLink
} from "lucide-react";
import Link from "next/link";
import { parseStoreBio, serializeStoreBio, StoreReview, StoreMetadata } from "@/utils/storeMetadata";
import { AddToCartButton } from "@/components/ui/AddToCartButton";

export default function StorefrontPage({ params }: { params: Promise<{ storeId: string }> }) {
  const unwrappedParams = use(params);
  const { profile } = useAuthStore();

  const [store, setStore] = useState<any>(null);
  const [meta, setMeta] = useState<StoreMetadata>({ bio: "", reviews: [] });
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Review form states
  const [reviewerName, setReviewerName] = useState("");
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);

  // Active section tab
  const [activeTab, setActiveTab] = useState<"products" | "reviews" | "about">("products");

  useEffect(() => {
    async function loadStoreAndProducts() {
      try {
        const { data: storeData } = await supabase
          .from("stores")
          .select("*")
          .eq("id", unwrappedParams.storeId)
          .single();

        if (storeData) {
          setStore(storeData);
          const parsedMeta = parseStoreBio(storeData.bio);
          setMeta(parsedMeta);

          const { data: productsData } = await supabase
            .from("products")
            .select("*")
            .eq("store_id", unwrappedParams.storeId)
            .eq("is_active", true)
            .order("created_at", { ascending: false });

          if (productsData) setProducts(productsData);
        }
      } catch (err) {
        console.error("Error loading storefront:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadStoreAndProducts();
  }, [unwrappedParams.storeId]);

  // Pre-fill reviewer name if logged in
  useEffect(() => {
    if (profile?.full_name && !reviewerName) {
      setReviewerName(profile.full_name);
    }
  }, [profile, reviewerName]);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim() || !store) return;

    setIsSubmittingReview(true);
    try {
      const newReview: StoreReview = {
        id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
        author_name: reviewerName.trim() || "Verified Buyer",
        rating: Math.min(5, Math.max(1, rating)),
        comment: comment.trim(),
        created_at: new Date().toISOString(),
      };

      const currentReviews = meta.reviews || [];
      const updatedReviews = [newReview, ...currentReviews];
      const updatedMeta: StoreMetadata = {
        ...meta,
        reviews: updatedReviews,
      };

      const serialized = serializeStoreBio(updatedMeta);

      const { error } = await supabase
        .from("stores")
        .update({ bio: serialized })
        .eq("id", store.id);

      if (error) throw error;

      setMeta(updatedMeta);
      setComment("");
      setRating(5);
      setReviewSuccess(true);
      setTimeout(() => setReviewSuccess(false), 4000);
    } catch (err: any) {
      alert("Failed to submit review: " + (err.message || "Please try again"));
    } finally {
      setIsSubmittingReview(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="animate-spin text-primary h-8 w-8" />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <StoreIcon className="h-16 w-16 text-muted-foreground/40 mb-4" />
        <h2 className="text-2xl font-bold">Store Not Found</h2>
        <p className="text-muted-foreground mt-2 mb-6">
          The requested store could not be found or may have been removed.
        </p>
        <Link href="/shop" className="text-primary hover:underline font-medium">
          ← Browse all apparel collections
        </Link>
      </div>
    );
  }

  const reviews = meta.reviews || [];
  const averageRating =
    reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : null;

  // Format WhatsApp link
  let whatsappHref = "";
  if (meta.whatsapp) {
    const raw = meta.whatsapp.trim();
    if (raw.startsWith("http://") || raw.startsWith("https://")) {
      whatsappHref = raw;
    } else {
      const cleanDigits = raw.replace(/[^0-9]/g, "");
      whatsappHref = `https://wa.me/${cleanDigits}`;
    }
  }

  // Format Phone link
  const phoneHref = meta.phone ? `tel:${meta.phone.replace(/[^0-9+]/g, "")}` : "";

  // Format Google Maps link
  let mapHref = "";
  if (meta.location) {
    const loc = meta.location.trim();
    if (loc.startsWith("http://") || loc.startsWith("https://")) {
      mapHref = loc;
    } else {
      mapHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc)}`;
    }
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* ── Top Hero Banner ── */}
      <div className="relative w-full h-72 sm:h-96 bg-slate-900 overflow-hidden">
        {meta.shop_photo_url || store.banner_url ? (
          <img
            src={meta.shop_photo_url || store.banner_url}
            alt={`${store.shop_name} Shop`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-800 to-zinc-900 flex items-center justify-center">
            <StoreIcon className="h-24 w-24 text-white/10" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />

        {/* Back link */}
        <div className="absolute top-6 left-6 z-10">
          <Link
            href="/shop"
            className="bg-black/50 hover:bg-black/70 backdrop-blur text-white text-xs sm:text-sm font-medium px-4 py-2 rounded-full transition-colors flex items-center gap-1.5"
          >
            ← Back to Shop
          </Link>
        </div>
      </div>

      {/* ── Store Header Card ── */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 -mt-24 sm:-mt-28 relative z-20">
        <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start sm:items-center gap-5">
              {/* Store Avatar */}
              <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl bg-muted border-4 border-background flex items-center justify-center text-3xl font-bold shadow-md overflow-hidden flex-shrink-0">
                {store.logo_url ? (
                  <img src={store.logo_url} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-primary">{store.shop_name.charAt(0).toUpperCase()}</span>
                )}
              </div>

              {/* Title & Brand */}
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-foreground">
                    {store.shop_name}
                  </h1>
                  {store.brand_name && store.brand_name !== store.shop_name && (
                    <span className="bg-primary/10 text-primary text-xs font-semibold px-2.5 py-0.5 rounded-full">
                      {store.brand_name}
                    </span>
                  )}
                </div>

                {/* Rating & Reviews Summary */}
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex items-center text-amber-500">
                    <Star className="h-4 w-4 fill-amber-500" />
                    <span className="ml-1 text-sm font-semibold text-foreground">
                      {averageRating ? averageRating : "New"}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    ({reviews.length} {reviews.length === 1 ? "review" : "reviews"})
                  </span>
                  <span className="text-muted-foreground/40">•</span>
                  <span className="text-xs text-muted-foreground">
                    {products.length} {products.length === 1 ? "Product" : "Products"}
                  </span>
                </div>
              </div>
            </div>

            {/* Direct Contact Buttons */}
            <div className="flex items-center flex-wrap gap-3">
              {whatsappHref && (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-[#25D366] hover:bg-[#20ba5a] text-white px-5 py-2.5 rounded-full font-medium text-sm transition-transform active:scale-95 shadow-sm"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>WhatsApp</span>
                </a>
              )}

              {phoneHref && (
                <a
                  href={phoneHref}
                  className="flex items-center gap-2 bg-secondary hover:bg-secondary/80 text-foreground border border-border px-5 py-2.5 rounded-full font-medium text-sm transition-transform active:scale-95 shadow-sm"
                >
                  <Phone className="h-4 w-4 text-primary" />
                  <span>Call Store</span>
                </a>
              )}

              {mapHref && (
                <a
                  href={mapHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-secondary hover:bg-secondary/80 text-foreground border border-border px-5 py-2.5 rounded-full font-medium text-sm transition-transform active:scale-95 shadow-sm"
                  title="Open location in Google Maps"
                >
                  <MapPin className="h-4 w-4 text-rose-500" />
                  <span>View Map</span>
                </a>
              )}
            </div>
          </div>

          {/* Location & Bio */}
          <div className="mt-6 pt-6 border-t border-border grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                About the Store
              </h3>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                {meta.bio || `Welcome to ${store.shop_name}. Discover our signature curated apparel collection.`}
              </p>
            </div>

            {meta.location && (
              <a
                href={mapHref}
                target="_blank"
                rel="noopener noreferrer"
                className="group block space-y-2 bg-muted/40 hover:bg-muted/70 p-4 rounded-xl border border-border/80 hover:border-primary/50 transition-all shadow-sm hover:shadow cursor-pointer"
                title="Click to view on Google Maps"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground group-hover:text-primary transition-colors">
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                    <span>Store Location</span>
                  </div>
                  <span className="text-[11px] font-medium text-primary flex items-center gap-1 group-hover:underline">
                    Open Map <ExternalLink className="h-3 w-3" />
                  </span>
                </div>
                <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2">
                  {meta.location}
                </p>
                <p className="text-[11px] text-muted-foreground pt-0.5">
                  📍 Click to navigate directly via Google Maps
                </p>
              </a>
            )}
          </div>
        </div>

        {/* ── Navigation Tabs ── */}
        <div className="flex items-center border-b border-border mt-10 gap-8">
          <button
            onClick={() => setActiveTab("products")}
            className={`pb-3 font-semibold text-sm sm:text-base border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "products"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <ShoppingBag className="h-4 w-4" />
            <span>Products ({products.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("reviews")}
            className={`pb-3 font-semibold text-sm sm:text-base border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "reviews"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Star className="h-4 w-4" />
            <span>Reviews ({reviews.length})</span>
          </button>
        </div>

        {/* ── Tab Content: Products ── */}
        {activeTab === "products" && (
          <div className="pt-8">
            {products.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                {products.map((product) => (
                  <Link href={`/product/${product.id}`} key={product.id}>
                    <Card className="h-full overflow-hidden hover:border-primary/50 transition-all group cursor-pointer border border-border shadow-none hover:shadow-lg rounded-xl">
                      <div className="aspect-[3/4] bg-muted overflow-hidden relative">
                        {product.image_urls?.[0] ? (
                          <img
                            src={product.image_urls[0]}
                            alt={product.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs uppercase tracking-wider">
                            No Image
                          </div>
                        )}
                      </div>
                      <CardContent className="p-3 sm:p-4 flex flex-col justify-between flex-1">
                        <div>
                          <h3 className="font-semibold text-sm sm:text-base line-clamp-1 group-hover:text-primary transition-colors">
                            {product.title}
                          </h3>
                          <p className="font-bold text-sm sm:text-base mt-1 text-foreground">
                            ₹{product.price}
                          </p>
                        </div>
                        <div className="mt-3">
                          <AddToCartButton
                            product={{
                              id: product.id,
                              title: product.title,
                              price: product.price,
                              image_urls: product.image_urls,
                              store_id: store.id,
                            }}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 border rounded-2xl border-dashed border-border bg-card">
                <ShoppingBag className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
                <h3 className="font-semibold text-lg">No Products Available</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  This store hasn't published any items yet.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Tab Content: Reviews & Ratings ── */}
        {activeTab === "reviews" && (
          <div className="pt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left: Write a Review Form */}
            <div className="lg:col-span-1">
              <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-5 sticky top-24">
                <h3 className="font-bold text-lg text-foreground">Write a Review</h3>
                <p className="text-xs text-muted-foreground">
                  Share your shopping experience with {store.shop_name}.
                </p>

                <form onSubmit={handleReviewSubmit} className="space-y-4">
                  {/* Star Rating Picker */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Rating</label>
                    <div className="flex items-center gap-1.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          className="p-1 transition-transform hover:scale-110"
                        >
                          <Star
                            className={`h-6 w-6 ${
                              (hoverRating || rating) >= star
                                ? "fill-amber-400 text-amber-400"
                                : "text-muted-foreground/30"
                            }`}
                          />
                        </button>
                      ))}
                      <span className="text-xs font-medium text-foreground ml-2">
                        {rating} / 5 Stars
                      </span>
                    </div>
                  </div>

                  {/* Reviewer Name */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Your Name</label>
                    <Input
                      placeholder="e.g. John Doe"
                      value={reviewerName}
                      onChange={(e) => setReviewerName(e.target.value)}
                      required
                    />
                  </div>

                  {/* Review Comment */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Your Review</label>
                    <textarea
                      className="flex min-h-[100px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      placeholder="How was the quality of clothes, delivery, and seller service?..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      required
                    />
                  </div>

                  {reviewSuccess && (
                    <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 text-green-700 dark:text-green-400 rounded-lg text-xs font-medium">
                      <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                      <span>Thank you! Your review has been published.</span>
                    </div>
                  )}

                  <Button
                    type="submit"
                    isLoading={isSubmittingReview}
                    className="w-full font-semibold flex items-center justify-center gap-2"
                  >
                    <Send className="h-4 w-4" />
                    <span>Submit Review</span>
                  </Button>
                </form>
              </div>
            </div>

            {/* Right: Existing Reviews List */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <h3 className="font-bold text-lg text-foreground">
                  Customer Feedback ({reviews.length})
                </h3>
                {averageRating && (
                  <div className="flex items-center gap-1.5 bg-amber-500/10 text-amber-600 px-3 py-1 rounded-full text-sm font-semibold">
                    <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                    <span>{averageRating} average rating</span>
                  </div>
                )}
              </div>

              {reviews.length > 0 ? (
                <div className="space-y-4">
                  {reviews.map((rev) => (
                    <div
                      key={rev.id}
                      className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="h-9 w-9 rounded-full bg-primary/10 text-primary font-bold text-sm flex items-center justify-center">
                            {rev.author_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h4 className="font-semibold text-sm text-foreground">
                              {rev.author_name}
                            </h4>
                            <div className="flex items-center text-amber-400">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Star
                                  key={s}
                                  className={`h-3.5 w-3.5 ${
                                    rev.rating >= s ? "fill-amber-400" : "text-muted-foreground/30"
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                        </div>

                        {rev.created_at && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>
                              {new Date(rev.created_at).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </span>
                          </div>
                        )}
                      </div>

                      <p className="text-sm text-muted-foreground leading-relaxed pt-1">
                        {rev.comment}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 border rounded-2xl border-dashed border-border bg-card">
                  <Star className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                  <h4 className="font-semibold text-base">No reviews yet</h4>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                    Be the first customer to leave feedback for {store.shop_name}! Fill out the form on the left.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
