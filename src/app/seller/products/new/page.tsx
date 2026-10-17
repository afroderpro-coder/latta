"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/utils/supabase/client";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { X, Upload, ArrowLeft } from "lucide-react";
import Link from "next/link";

const productSchema = z.object({
  title: z.string().min(2, "Title is required."),
  description: z.string().optional(),
  price: z.coerce.number().min(0.01, "Price must be greater than 0."),
  category: z.string().min(2, "Category is required."),
  brand: z.string().optional(),
  imageUrl: z.string().url("Must be a valid URL.").optional().or(z.literal("")),
  sizes: z.array(z.string()).optional(),
});

// type ProductFormValues = z.infer<typeof productSchema>;

export default function NewProductPage() {
  const { profile } = useAuthStore();
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(productSchema),
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    
    setIsUploading(true);
    setError(null);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.id}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('product_images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('product_images')
        .getPublicUrl(filePath);

      setValue("imageUrl", publicUrl);
      setImagePreview(publicUrl);
    } catch (err: any) {
      setError("Error uploading image: " + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const onSubmit = async (data: any) => {
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

      // We'll skip image upload and variants for this MVP simulation
      const { error: insertError } = await supabase.from("products").insert({
        title: data.title,
        description: data.description,
        price: data.price,
        category: data.category,
        brand: data.brand,
        store_id: store.id,
        image_urls: data.imageUrl ? [data.imageUrl] : [], // Use the provided URL
        is_active: true,
        sizes: data.sizes || [],
      });

      if (insertError) throw insertError;

      router.push("/seller/products");
    } catch (err: any) {
      setError(err.message || "Failed to create product.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center space-x-4">
        <Link href="/seller/products">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Add New Product</h1>
          <p className="text-muted-foreground">List a new item in your store.</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Title</label>
            <Input placeholder="Classic White Tee" {...register("title")} />
            {errors.title && <p className="text-sm text-red-500">{errors.title.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <textarea
              className="flex min-h-[100px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Product details..."
              {...register("description")}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Price (₹)</label>
              <Input type="number" step="0.01" placeholder="29.99" {...register("price")} />
              {errors.price && <p className="text-sm text-red-500">{errors.price.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Input list="category-options" placeholder="T-Shirts" {...register("category")} />
              <datalist id="category-options">
                <option value="T-Shirt" />
                <option value="Shirt" />
                <option value="Jeans" />
                <option value="Lower" />
                <option value="Jacket" />
                <option value="Formal Pants" />
              </datalist>
              {errors.category && <p className="text-sm text-red-500">{errors.category.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Brand (Optional)</label>
            <Input placeholder="Acme" {...register("brand")} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Product Image</label>
            <div className="flex items-center gap-6">
              {imagePreview ? (
                <div className="relative h-24 w-24 overflow-hidden rounded-md border-2 border-border shadow-sm flex-shrink-0">
                  <img src={imagePreview} alt="Preview" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => {
                      setImagePreview(null);
                      setValue("imageUrl", "");
                    }}
                    className="absolute inset-0 flex items-center justify-center bg-slate-900/60 opacity-0 transition-opacity hover:opacity-100"
                  >
                    <X className="h-6 w-6 text-white" />
                  </button>
                </div>
              ) : (
                <div className="flex h-24 w-24 flex-shrink-0 items-center justify-center rounded-md border-2 border-dashed border-border bg-muted/30">
                  <Upload className="h-8 w-8 text-muted-foreground/50" />
                </div>
              )}
              <div className="flex-1 space-y-2">
                <Input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleImageUpload} 
                  disabled={isUploading}
                  className="cursor-pointer file:text-sm file:font-medium"
                />
                <p className="text-xs text-muted-foreground">
                  {isUploading ? "Uploading..." : "Recommended size: 1080x1080px. Max 2MB."}
                </p>
              </div>
            </div>
            {errors.imageUrl && <p className="text-sm text-red-500">{errors.imageUrl.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Available Sizes</label>
            <div className="flex flex-wrap gap-4">
              {['S', 'M', 'L', 'XL', 'XXL'].map((size) => (
                <label key={size} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    value={size}
                    {...register("sizes")}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm font-medium">{size}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Check the sizes available for this product.</p>
          </div>

          {error && (
            <div className="p-3 rounded-md text-sm font-medium bg-red-500/10 text-red-600">
              {error}
            </div>
          )}

          <Button type="submit" isLoading={isSaving} className="w-full md:w-auto">
            Create Product
          </Button>
        </form>
      </div>
    </div>
  );
}
