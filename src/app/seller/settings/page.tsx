"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/utils/supabase/client";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Loader2, Upload, X } from "lucide-react";

const storeSchema = z.object({
  shop_name: z.string().min(2, "Shop name must be at least 2 characters."),
  brand_name: z.string().min(2, "Brand name must be at least 2 characters."),
  bio: z.string().optional(),
  logo_url: z.string().url("Please enter a valid URL for your logo.").or(z.literal("")).optional(),
});

type StoreFormValues = z.infer<typeof storeSchema>;

export default function StoreSettingsPage() {
  const { profile } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<StoreFormValues>({
    resolver: zodResolver(storeSchema),
  });

  useEffect(() => {
    async function loadStore() {
      if (!profile) return;
      const { data, error } = await supabase
        .from("stores")
        .select("*")
        .eq("seller_id", profile.id)
        .single();
      
      if (data) {
        setValue("shop_name", data.shop_name || "");
        setValue("brand_name", data.brand_name || "");
        setValue("bio", data.bio || "");
        setValue("logo_url", data.logo_url || "");
        if (data.logo_url) {
          setLogoPreview(data.logo_url);
        }
      }
      setIsLoading(false);
    }
    loadStore();
  }, [profile, setValue]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    
    setIsUploading(true);
    setMessage(null);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.id}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('store_logos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('store_logos')
        .getPublicUrl(filePath);

      setValue("logo_url", publicUrl);
      setLogoPreview(publicUrl);
    } catch (error: any) {
      setMessage({ type: 'error', text: "Error uploading image: " + error.message });
    } finally {
      setIsUploading(false);
    }
  };

  const onSubmit = async (data: StoreFormValues) => {
    if (!profile) return;
    setIsSaving(true);
    setMessage(null);
    try {
      // Upsert store (requires unique seller_id or checking if exists)
      const { data: existingStore } = await supabase
        .from("stores")
        .select("id")
        .eq("seller_id", profile.id)
        .single();

      if (existingStore) {
        const { error } = await supabase
          .from("stores")
          .update(data)
          .eq("id", existingStore.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("stores")
          .insert({ ...data, seller_id: profile.id });
        if (error) throw error;
      }
      
      setMessage({ type: 'success', text: "Store settings saved successfully." });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || "Failed to save settings." });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="flex h-40 items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Store Settings</h1>
        <p className="text-muted-foreground">Manage your store profile and branding.</p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Shop Name</label>
            <Input placeholder="e.g. Acme Apparel" {...register("shop_name")} />
            {errors.shop_name && <p className="text-sm text-red-500">{errors.shop_name.message}</p>}
            <p className="text-xs text-muted-foreground">This is your unique shop identifier.</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Brand Name</label>
            <Input placeholder="e.g. Acme" {...register("brand_name")} />
            {errors.brand_name && <p className="text-sm text-red-500">{errors.brand_name.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Store Logo</label>
            <div className="flex items-center gap-6">
              {logoPreview ? (
                <div className="relative h-24 w-24 overflow-hidden rounded-full border-2 border-border shadow-sm flex-shrink-0">
                  <img src={logoPreview} alt="Store logo preview" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => {
                      setLogoPreview(null);
                      setValue("logo_url", "");
                    }}
                    className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity hover:opacity-100"
                  >
                    <X className="h-6 w-6 text-white" />
                  </button>
                </div>
              ) : (
                <div className="flex h-24 w-24 flex-shrink-0 items-center justify-center rounded-full border-2 border-dashed border-border bg-muted/30">
                  <Upload className="h-8 w-8 text-muted-foreground/50" />
                </div>
              )}
              <div className="flex-1 space-y-2">
                <Input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleLogoUpload} 
                  disabled={isUploading}
                  className="cursor-pointer file:text-sm file:font-medium"
                />
                <p className="text-xs text-muted-foreground">
                  {isUploading ? "Uploading..." : "Recommended size: 256x256px. Max 2MB."}
                </p>
              </div>
            </div>
            {errors.logo_url && <p className="text-sm text-red-500">{errors.logo_url.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Bio / Description</label>
            <textarea
              className="flex min-h-[100px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Tell customers about your brand..."
              {...register("bio")}
            />
            {errors.bio && <p className="text-sm text-red-500">{errors.bio.message}</p>}
          </div>

          {message && (
            <div className={`p-3 rounded-md text-sm font-medium ${message.type === 'success' ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}`}>
              {message.text}
            </div>
          )}

          <Button type="submit" isLoading={isSaving}>
            Save Settings
          </Button>
        </form>
      </div>
    </div>
  );
}
