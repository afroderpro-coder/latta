"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/utils/supabase/client";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Loader2 } from "lucide-react";

const storeSchema = z.object({
  shop_name: z.string().min(2, "Shop name must be at least 2 characters."),
  brand_name: z.string().min(2, "Brand name must be at least 2 characters."),
  bio: z.string().optional(),
});

type StoreFormValues = z.infer<typeof storeSchema>;

export default function StoreSettingsPage() {
  const { profile } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
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
        setValue("shop_name", data.shop_name);
        setValue("brand_name", data.brand_name);
        setValue("bio", data.bio || "");
      }
      setIsLoading(false);
    }
    loadStore();
  }, [profile, setValue]);

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
