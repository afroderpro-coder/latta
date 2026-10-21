"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/utils/supabase/client";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  X,
  ArrowLeft,
  Star,
  Plus,
  Loader2,
  AlertCircle,
  ArrowRight,
  Store,
  RotateCcw,
  Check,
} from "lucide-react";
import Link from "next/link";
import { serializeStoreBio } from "@/utils/storeMetadata";

const productSchema = z.object({
  title: z.string().min(2, "Title is required (minimum 2 characters)."),
  description: z.string().optional().default(""),
  price: z.coerce
    .number({ invalid_type_error: "Price must be a valid number." })
    .min(0.01, "Price must be greater than 0."),
  category: z.string().min(1, "Category is required."),
  brand: z.string().optional().default(""),
  sizes: z
    .union([z.array(z.string()), z.string(), z.boolean()])
    .optional()
    .transform((val) => {
      if (!val || typeof val === "boolean") return [];
      if (typeof val === "string") return [val];
      if (Array.isArray(val)) return val.filter(Boolean);
      return [];
    }),
});

type ProductFormValues = z.infer<typeof productSchema>;

const AVAILABLE_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "3XL"];

export default function NewProductPage() {
  const { profile } = useAuthStore();
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [hasDraft, setHasDraft] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const DRAFT_KEY = `afroder_draft_new_product_${profile?.id || "seller"}`;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema) as any,
    defaultValues: {
      title: "",
      description: "",
      price: "" as any,
      category: "",
      brand: "",
      sizes: [],
    },
  });

  // 1. Restore draft from localStorage on mount
  useEffect(() => {
    try {
      const saved =
        localStorage.getItem(DRAFT_KEY) ||
        localStorage.getItem("afroder_draft_new_product_seller") ||
        localStorage.getItem("afroder_draft_new_product_default");

      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.title) setValue("title", parsed.title);
        if (parsed.description) setValue("description", parsed.description);
        if (parsed.price !== undefined && parsed.price !== null && parsed.price !== "") {
          setValue("price", parsed.price);
        }
        if (parsed.category) setValue("category", parsed.category);
        if (parsed.brand) setValue("brand", parsed.brand);
        if (Array.isArray(parsed.sizes) && parsed.sizes.length > 0) {
          setSelectedSizes(parsed.sizes);
          setValue("sizes", parsed.sizes);
        }
        if (Array.isArray(parsed.imageUrls) && parsed.imageUrls.length > 0) {
          setImageUrls(parsed.imageUrls);
        }
        setHasDraft(true);
      }
    } catch (e) {
      console.warn("Failed to restore draft:", e);
    } finally {
      setIsInitialized(true);
    }
  }, [DRAFT_KEY, setValue]);

  // 2. Auto-save draft on any input change
  const watchedValues = watch();

  useEffect(() => {
    if (!isInitialized) return;
    try {
      const draftData = {
        title: watchedValues.title || "",
        description: watchedValues.description || "",
        price: watchedValues.price || "",
        category: watchedValues.category || "",
        brand: watchedValues.brand || "",
        sizes: selectedSizes,
        imageUrls: imageUrls || [],
      };

      const hasContent =
        Boolean(draftData.title?.trim()) ||
        Boolean(draftData.description?.trim()) ||
        Boolean(draftData.price) ||
        Boolean(draftData.category?.trim()) ||
        Boolean(draftData.brand?.trim()) ||
        selectedSizes.length > 0 ||
        imageUrls.length > 0;

      if (hasContent) {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draftData));
        setHasDraft(true);
      }
    } catch (e) {
      console.warn("Failed to auto-save draft:", e);
    }
  }, [watchedValues, imageUrls, selectedSizes, isInitialized, DRAFT_KEY]);

  const handleClearDraft = () => {
    try {
      localStorage.removeItem(DRAFT_KEY);
      localStorage.removeItem("afroder_draft_new_product_seller");
      localStorage.removeItem("afroder_draft_new_product_default");
      if (profile?.id) {
        localStorage.removeItem(`afroder_draft_new_product_${profile.id}`);
      }

      reset({
        title: "",
        description: "",
        price: "" as any,
        category: "",
        brand: "",
        sizes: [],
      });
      setImageUrls([]);
      setSelectedSizes([]);
      setHasDraft(false);
      setError(null);
    } catch (e) {
      console.warn("Failed to clear draft:", e);
    }
  };

  const toggleSize = (size: string) => {
    setSelectedSizes((prev) => {
      const updated = prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size];
      setValue("sizes", updated);
      return updated;
    });
  };

  const handleMultipleImagesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const { data: authData } = await supabase.auth.getUser();
    const currentUserId = profile?.id || authData?.user?.id;

    if (!currentUserId) {
      setError("Please sign in to upload product images.");
      return;
    }

    const remainingSlots = 5 - imageUrls.length;
    if (remainingSlots <= 0) {
      setError("Maximum 5 images allowed per product.");
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remainingSlots);
    setIsUploading(true);
    setError(null);

    const uploadedUrls: string[] = [];

    try {
      for (const file of filesToUpload) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${currentUserId}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("product_images")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from("product_images").getPublicUrl(filePath);

        uploadedUrls.push(publicUrl);
      }

      setImageUrls((prev) => [...prev, ...uploadedUrls]);
    } catch (err: any) {
      setError("Error uploading images: " + err.message);
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const removeImage = (indexToRemove: number) => {
    setImageUrls((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const setAsCoverImage = (indexToPromote: number) => {
    setImageUrls((prev) => {
      const selected = prev[indexToPromote];
      const others = prev.filter((_, idx) => idx !== indexToPromote);
      return [selected, ...others];
    });
  };

  const onFormError = (formErrors: any) => {
    console.warn("Validation error on create product:", formErrors);
    const firstKey = Object.keys(formErrors)[0];
    if (firstKey) {
      const msg = formErrors[firstKey]?.message || `Please check the ${firstKey} field.`;
      setError(msg);
      const el = document.querySelector(`[name="${firstKey}"]`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        (el as HTMLElement).focus?.();
      }
    }
  };

  const onSubmit = async (data: ProductFormValues) => {
    setIsSaving(true);
    setError(null);

    try {
      // 0. Ensure user session exists
      const { data: authData } = await supabase.auth.getUser();
      const currentUserId = profile?.id || authData?.user?.id;

      if (!currentUserId) {
        throw new Error("Your session has expired. Please sign in again.");
      }

      const userMeta = authData?.user?.user_metadata || {};
      const sellerFullName = profile?.full_name || userMeta.full_name || "";
      const sellerEmail = profile?.email || authData?.user?.email || "";

      // 1. Fetch store(s) for this seller (gracefully handles multiple stores)
      const { data: stores, error: storesFetchErr } = await supabase
        .from("stores")
        .select("id, shop_name, bio")
        .eq("seller_id", currentUserId)
        .order("created_at", { ascending: false });

      if (storesFetchErr) {
        console.error("Error fetching seller store:", storesFetchErr);
      }

      // Pick store with real bio or the latest one
      let store =
        stores && stores.length > 0
          ? stores.find((s) => s.bio && s.bio.trim() !== "") || stores[0]
          : null;

      // If store doesn't exist yet, auto-create it
      if (!store) {
        const fallbackShopName =
          userMeta.shop_name || (sellerFullName ? `${sellerFullName}'s Store` : "My Apparel Store");

        const { data: newStore, error: createStoreError } = await supabase
          .from("stores")
          .insert({
            seller_id: currentUserId,
            shop_name: fallbackShopName,
            brand_name: data.brand?.trim() || fallbackShopName,
            bio: serializeStoreBio({
              seller_name: sellerFullName,
              seller_email: sellerEmail,
              phone: userMeta.contact_number || userMeta.phone || "",
              whatsapp: userMeta.contact_number || userMeta.phone || "",
              approval_status: "approved",
            }),
          })
          .select("id, shop_name")
          .single();

        if (createStoreError || !newStore) {
          throw new Error(createStoreError?.message || "Could not link to seller store.");
        }
        store = newStore;
      }

      // 2. Insert product record
      const finalSizes =
        selectedSizes && selectedSizes.length > 0
          ? selectedSizes
          : Array.isArray(data.sizes)
          ? data.sizes
          : [];

      const { error: insertError } = await supabase.from("products").insert({
        title: data.title.trim(),
        description: data.description?.trim() || "",
        price: Number(data.price),
        category: data.category.trim(),
        brand: data.brand?.trim() || "",
        store_id: store.id,
        image_urls: imageUrls || [],
        is_active: true,
        sizes: finalSizes,
      });

      if (insertError) {
        console.error("Product insert error:", insertError);
        throw insertError;
      }

      // 3. Clear all stored drafts
      try {
        localStorage.removeItem(DRAFT_KEY);
        localStorage.removeItem("afroder_draft_new_product_seller");
        localStorage.removeItem("afroder_draft_new_product_default");
        localStorage.removeItem(`afroder_draft_new_product_${currentUserId}`);
      } catch (e) {
        console.warn("Could not remove draft:", e);
      }

      // 4. Reset state & navigate to inventory
      reset();
      setImageUrls([]);
      setSelectedSizes([]);
      setHasDraft(false);

      router.push("/seller/products");
      router.refresh();
    } catch (err: any) {
      console.error("Error creating product:", err);
      setError(err.message || "Failed to create product. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-4">
          <Link href="/seller/products">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Add New Product</h1>
            <p className="text-muted-foreground text-sm">List a new apparel item with up to 5 photos.</p>
          </div>
        </div>

        {hasDraft && (
          <div className="flex items-center gap-2 self-start sm:self-auto bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full text-xs">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-emerald-700 dark:text-emerald-300 font-medium">Draft restored</span>
            <button
              type="button"
              onClick={handleClearDraft}
              className="text-muted-foreground hover:text-destructive font-medium ml-1 transition-colors flex items-center gap-1 cursor-pointer"
              title="Discard draft and reset all fields"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Discard & Clear</span>
            </button>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <form onSubmit={handleSubmit(onSubmit, onFormError)} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Title *</label>
            <Input
              placeholder="e.g. Vintage Oversized Denim Jacket"
              {...register("title")}
              autoFocus
            />
            {errors.title && <p className="text-sm text-red-500 font-medium">{errors.title.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <textarea
              className="flex min-h-[100px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="Product fabric details, fit, care instructions..."
              {...register("description")}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Price (₹) *</label>
              <Input type="number" step="0.01" placeholder="999.00" {...register("price")} />
              {errors.price && <p className="text-sm text-red-500 font-medium">{errors.price.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Category *</label>
              <Input list="category-options" placeholder="T-Shirt, Jeans, Shirt..." {...register("category")} />
              <datalist id="category-options">
                <option value="T-Shirt" />
                <option value="Shirt" />
                <option value="Jeans" />
                <option value="Lower" />
                <option value="Jacket" />
                <option value="Formal Pants" />
                <option value="Hoodie" />
                <option value="Complete Wear" />
              </datalist>
              {errors.category && <p className="text-sm text-red-500 font-medium">{errors.category.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Brand (Optional)</label>
            <Input placeholder="e.g. Acme" {...register("brand")} />
          </div>

          {/* ── Multiple Product Images (4 to 5 Photos) ── */}
          <div className="space-y-3 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-semibold text-foreground">
                  Product Images ({imageUrls.length}/5)
                </label>
                <p className="text-xs text-muted-foreground">
                  Upload between 1 to 5 images (front view, back view, close-up details). First photo is the main cover.
                </p>
              </div>
              <span className="text-xs text-muted-foreground font-medium">
                {5 - imageUrls.length} slots left
              </span>
            </div>

            {/* Images Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 pt-1">
              {imageUrls.map((url, index) => (
                <div
                  key={url}
                  className={`relative aspect-[3/4] rounded-xl overflow-hidden border-2 shadow-sm group bg-muted ${
                    index === 0 ? "border-primary ring-2 ring-primary/20" : "border-border"
                  }`}
                >
                  <img src={url} alt={`Product ${index + 1}`} className="w-full h-full object-cover" />

                  {/* Main / Cover badge */}
                  {index === 0 ? (
                    <span className="absolute top-1.5 left-1.5 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
                      Cover
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setAsCoverImage(index)}
                      className="absolute top-1.5 left-1.5 bg-black/70 hover:bg-black text-white text-[10px] font-medium px-1.5 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 cursor-pointer"
                      title="Set as main cover image"
                    >
                      <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                      <span>Set Cover</span>
                    </button>
                  )}

                  {/* Delete button */}
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/70 hover:bg-red-600 text-white transition-colors cursor-pointer"
                    title="Remove image"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}

              {/* Upload Slot (if less than 5 images) */}
              {imageUrls.length < 5 && (
                <label className="relative aspect-[3/4] rounded-xl border-2 border-dashed border-border hover:border-primary/60 bg-muted/20 hover:bg-muted/40 transition-all flex flex-col items-center justify-center cursor-pointer p-3 text-center group">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleMultipleImagesUpload}
                    disabled={isUploading}
                    className="sr-only"
                  />
                  {isUploading ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      <span className="text-[11px] text-muted-foreground">Uploading...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground group-hover:text-primary transition-colors">
                      <div className="p-2 rounded-full bg-muted group-hover:bg-primary/10">
                        <Plus className="h-5 w-5" />
                      </div>
                      <span className="text-xs font-medium">Add Photo</span>
                      <span className="text-[10px] text-muted-foreground/70">PNG, JPG up to 2MB</span>
                    </div>
                  )}
                </label>
              )}
            </div>
          </div>

          {/* ── Available Sizes (Interactive Pill Buttons) ── */}
          <div className="space-y-3 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Available Sizes</label>
              {selectedSizes.length > 0 && (
                <span className="text-xs text-primary font-medium">
                  {selectedSizes.length} size(s) selected ({selectedSizes.join(", ")})
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2.5">
              {AVAILABLE_SIZES.map((size) => {
                const isSelected = selectedSizes.includes(size);
                return (
                  <button
                    key={size}
                    type="button"
                    onClick={() => toggleSize(size)}
                    className={`inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg text-sm font-semibold border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary shadow-xs ring-1 ring-primary"
                        : "bg-background border-border text-foreground hover:bg-muted hover:border-foreground/30"
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                    <span>{size}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              Click the sizes in stock for this product.
            </p>
          </div>

          {/* ── Error Banner ── */}
          {error && (
            <div className="p-4 rounded-xl text-sm font-medium bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-5 h-5 shrink-0 text-red-600 dark:text-red-400" />
                <span>{error}</span>
              </div>
              {(error.toLowerCase().includes("store profile") || error.toLowerCase().includes("set up")) && (
                <Link
                  href="/seller/settings"
                  className="inline-flex items-center justify-center space-x-1.5 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shrink-0 shadow-xs transition-colors"
                >
                  <Store className="w-3.5 h-3.5" />
                  <span>Open Store Profile</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>
          )}

          <div className="flex items-center gap-4 pt-2">
            <Button
              type="submit"
              disabled={isSaving || isUploading}
              className="w-full md:w-auto px-8 cursor-pointer h-11 text-base font-semibold"
            >
              {isSaving ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating Product...</span>
                </div>
              ) : (
                "Create Product"
              )}
            </Button>

            {hasDraft && (
              <Button
                type="button"
                variant="outline"
                onClick={handleClearDraft}
                className="cursor-pointer text-muted-foreground hover:text-destructive h-11"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Clear Form
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
