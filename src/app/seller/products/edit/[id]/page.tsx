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
import { Loader2, ArrowLeft, Upload, X, Star, Plus } from "lucide-react";
import Link from "next/link";
import { use } from "react";

const productSchema = z.object({
  title: z.string().min(2, "Title is required."),
  description: z.string().optional(),
  price: z.coerce.number().min(0.01, "Price must be greater than 0."),
  category: z.string().min(2, "Category is required."),
  brand: z.string().optional(),
  sizes: z.array(z.string()).optional(),
});

type ProductFormValues = z.infer<typeof productSchema>;

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const productId = resolvedParams.id;
  
  const { profile } = useAuthStore();
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema) as any,
  });

  useEffect(() => {
    async function loadProduct() {
      try {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("id", productId)
          .single();

        if (error) throw error;
        if (data) {
          reset({
            title: data.title,
            description: data.description || "",
            price: data.price,
            category: data.category || "",
            brand: data.brand || "",
          });
          if (Array.isArray(data.image_urls)) {
            setImageUrls(data.image_urls);
          }
          if (Array.isArray(data.sizes)) {
            setSelectedSizes(data.sizes);
          }
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load product details.");
      } finally {
        setIsLoading(false);
      }
    }
    loadProduct();
  }, [productId, reset]);

  const handleMultipleImagesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !profile) return;

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
        const fileExt = file.name.split('.').pop();
        const fileName = `${profile.id}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('product_images')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('product_images')
          .getPublicUrl(filePath);

        uploadedUrls.push(publicUrl);
      }

      setImageUrls((prev) => [...prev, ...uploadedUrls]);
    } catch (err: any) {
      setError("Error uploading image: " + err.message);
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

  const toggleSize = (size: string) => {
    setSelectedSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]
    );
  };

  const onSubmit = async (data: ProductFormValues) => {
    if (!profile) return;
    setIsSaving(true);
    setError(null);
    try {
      const { data: store } = await supabase
        .from("stores")
        .select("id")
        .eq("seller_id", profile.id)
        .single();

      if (!store) {
        throw new Error("You must set up your store profile first.");
      }

      const { error: updateError } = await supabase
        .from("products")
        .update({
          title: data.title,
          description: data.description,
          price: data.price,
          category: data.category,
          brand: data.brand,
          image_urls: imageUrls,
          sizes: selectedSizes,
        })
        .eq("id", productId)
        .eq("store_id", store.id);

      if (updateError) throw updateError;

      router.push("/seller/products");
    } catch (err: any) {
      setError(err.message || "Failed to update product.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="animate-spin text-primary h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6 pb-12">
      <div className="flex items-center space-x-4">
        <Link href="/seller/products">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Product</h1>
          <p className="text-muted-foreground">Update your product details and photos.</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Title *</label>
            <Input {...register("title")} />
            {errors.title && <p className="text-sm text-red-500">{errors.title.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <textarea
              className="flex min-h-[100px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              {...register("description")}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Price (₹) *</label>
              <Input type="number" step="0.01" {...register("price")} />
              {errors.price && <p className="text-sm text-red-500">{errors.price.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Category *</label>
              <Input list="category-options" {...register("category")} />
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
              {errors.category && <p className="text-sm text-red-500">{errors.category.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Brand (Optional)</label>
            <Input {...register("brand")} />
          </div>

          {/* ── Multiple Product Images (4 to 5 Photos) ── */}
          <div className="space-y-3 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-semibold text-foreground">
                  Product Images ({imageUrls.length}/5)
                </label>
                <p className="text-xs text-muted-foreground">
                  Upload up to 5 images. The first image is the main store thumbnail.
                </p>
              </div>
              <span className="text-xs text-muted-foreground font-medium">
                {5 - imageUrls.length} slots left
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 pt-1">
              {imageUrls.map((url, index) => (
                <div
                  key={url}
                  className={`relative aspect-[3/4] rounded-xl overflow-hidden border-2 shadow-sm group bg-muted ${
                    index === 0 ? "border-primary ring-2 ring-primary/20" : "border-border"
                  }`}
                >
                  <img src={url} alt={`Product ${index + 1}`} className="w-full h-full object-cover" />

                  {index === 0 ? (
                    <span className="absolute top-1.5 left-1.5 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
                      Cover
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setAsCoverImage(index)}
                      className="absolute top-1.5 left-1.5 bg-black/70 hover:bg-black text-white text-[10px] font-medium px-1.5 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1"
                      title="Set as main cover image"
                    >
                      <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                      <span>Set Cover</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/70 hover:bg-red-600 text-white transition-colors"
                    title="Remove image"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}

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

          <div className="space-y-2 pt-2 border-t border-border">
            <label className="text-sm font-medium">Available Sizes</label>
            <div className="flex flex-wrap gap-4">
              {['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'].map((size) => (
                <label key={size} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedSizes.includes(size)}
                    onChange={() => toggleSize(size)}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm font-medium">{size}</span>
                </label>
              ))}
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-md text-sm font-medium bg-red-500/10 text-red-600">
              {error}
            </div>
          )}

          <div className="flex gap-4">
            <Button type="submit" isLoading={isSaving} className="px-8">
              Save Changes
            </Button>
            <Link href="/seller/products">
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
