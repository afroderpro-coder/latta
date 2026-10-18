"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/utils/supabase/client";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Loader2, Upload, X, MapPin, Phone, MessageSquare, Image as ImageIcon, Store } from "lucide-react";
import { parseStoreBio, serializeStoreBio, StoreMetadata } from "@/utils/storeMetadata";

export default function StoreSettingsPage() {
  const { profile } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  
  // Form fields
  const [shopName, setShopName] = useState("");
  const [brandName, setBrandName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [shopPhotoUrl, setShopPhotoUrl] = useState("");
  const [location, setLocation] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [bio, setBio] = useState("");
  const [existingReviews, setExistingReviews] = useState<any[]>([]);

  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    async function loadStore() {
      if (!profile) return;
      try {
        const { data, error } = await supabase
          .from("stores")
          .select("*")
          .eq("seller_id", profile.id)
          .single();

        if (error && error.code !== "PGRST116") {
          console.error(error);
        }

        if (data) {
          setShopName(data.shop_name || "");
          setBrandName(data.brand_name || "");
          setLogoUrl(data.logo_url || "");

          // Parse metadata stored in bio (location, phone, whatsapp, shop_photo_url, reviews)
          const meta: StoreMetadata = parseStoreBio(data.bio);
          setBio(meta.bio || "");
          setLocation(meta.location || "");
          setPhone(meta.phone || "");
          setWhatsapp(meta.whatsapp || "");
          setShopPhotoUrl(meta.shop_photo_url || "");
          setExistingReviews(meta.reviews || []);
        }
      } catch (err: any) {
        console.error("Failed to load store:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadStore();
  }, [profile]);

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "logo" | "photo"
  ) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    if (type === "logo") setIsUploadingLogo(true);
    else setIsUploadingPhoto(true);
    setMessage(null);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${type}-${profile.id}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('store_logos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('store_logos')
        .getPublicUrl(filePath);

      if (type === "logo") {
        setLogoUrl(publicUrl);
      } else {
        setShopPhotoUrl(publicUrl);
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: "Error uploading image: " + error.message });
    } finally {
      if (type === "logo") setIsUploadingLogo(false);
      else setIsUploadingPhoto(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    if (!shopName.trim()) {
      setMessage({ type: 'error', text: "Please enter a shop name." });
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      // Pack bio, location, phone, whatsapp, shop_photo_url, reviews
      const serializedBio = serializeStoreBio({
        bio: bio.trim(),
        location: location.trim(),
        phone: phone.trim(),
        whatsapp: whatsapp.trim(),
        shop_photo_url: shopPhotoUrl.trim(),
        reviews: existingReviews,
      });

      const storePayload = {
        shop_name: shopName.trim(),
        brand_name: brandName.trim() || shopName.trim(),
        logo_url: logoUrl.trim() || null,
        bio: serializedBio,
      };

      const { data: existingStore } = await supabase
        .from("stores")
        .select("id")
        .eq("seller_id", profile.id)
        .single();

      if (existingStore) {
        const { error } = await supabase
          .from("stores")
          .update(storePayload)
          .eq("id", existingStore.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("stores")
          .insert({ ...storePayload, seller_id: profile.id });
        if (error) throw error;
      }

      setMessage({ type: 'success', text: "Store details saved successfully!" });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || "Failed to save settings." });
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
    <div className="max-w-3xl space-y-8 pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Store Settings</h1>
        <p className="text-muted-foreground mt-1">
          Customize your storefront profile, contact information, photos, and location.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Brand & Identity */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-2 font-semibold text-lg border-b border-border pb-3">
            <Store className="h-5 w-5 text-primary" />
            <span>Basic Store Information</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Shop Name *</label>
              <Input
                placeholder="e.g. Acme Apparel"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">Unique identifier for your storefront.</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Brand Name (Optional)</label>
              <Input
                placeholder="e.g. Acme"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Shown on product tags and banners.</p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">About / Description</label>
            <textarea
              className="flex min-h-[90px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="Tell customers about your apparel collections, heritage, and vision..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
          </div>
        </div>

        {/* Section 2: Store Photos & Logo */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-2 font-semibold text-lg border-b border-border pb-3">
            <ImageIcon className="h-5 w-5 text-primary" />
            <span>Store Logo & Shop Photo</span>
          </div>

          {/* Store Logo */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Store Logo (Avatar)</label>
            <div className="flex items-center gap-5">
              {logoUrl ? (
                <div className="relative h-20 w-20 overflow-hidden rounded-full border-2 border-primary shadow-sm flex-shrink-0">
                  <img src={logoUrl} alt="Store logo preview" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setLogoUrl("")}
                    className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity hover:opacity-100"
                    title="Remove logo"
                  >
                    <X className="h-5 w-5 text-white" />
                  </button>
                </div>
              ) : (
                <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-full border-2 border-dashed border-border bg-muted/40">
                  <Upload className="h-6 w-6 text-muted-foreground/60" />
                </div>
              )}
              <div className="flex-1 space-y-1.5">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, "logo")}
                  disabled={isUploadingLogo}
                  className="cursor-pointer file:text-sm file:font-medium"
                />
                <p className="text-xs text-muted-foreground">
                  {isUploadingLogo ? "Uploading logo..." : "Square profile avatar (PNG, JPG, max 2MB)."}
                </p>
              </div>
            </div>
          </div>

          {/* Shop Photo / Banner */}
          <div className="space-y-2 pt-2 border-t border-border">
            <label className="text-sm font-medium">Shop Photo / Cover Banner</label>
            <div className="space-y-3">
              {shopPhotoUrl ? (
                <div className="relative h-44 w-full overflow-hidden rounded-lg border border-border shadow-sm">
                  <img src={shopPhotoUrl} alt="Shop photo preview" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setShopPhotoUrl("")}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 hover:bg-black text-white transition-colors"
                    title="Remove shop photo"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex h-36 w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/30 text-muted-foreground">
                  <ImageIcon className="h-8 w-8 mb-2 opacity-50" />
                  <span className="text-xs">No shop banner photo uploaded yet</span>
                </div>
              )}

              <Input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileUpload(e, "photo")}
                disabled={isUploadingPhoto}
                className="cursor-pointer file:text-sm file:font-medium"
              />
              <p className="text-xs text-muted-foreground">
                {isUploadingPhoto ? "Uploading shop photo..." : "Showcase your retail shop front, showroom, or studio banner."}
              </p>
            </div>
          </div>
        </div>

        {/* Section 3: Location & Direct Contacts */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-2 font-semibold text-lg border-b border-border pb-3">
            <MapPin className="h-5 w-5 text-primary" />
            <span>Location & Contact Details</span>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>Shop Location / Address</span>
            </label>
            <Input
              placeholder="e.g. Shop #12, Fashion Street, Bandra West, Mumbai"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Enter your address, city, or paste a Google Maps link. Customers will be able to click it to open Google Maps directly.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1.5">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>Contact Phone Number</span>
              </label>
              <Input
                placeholder="e.g. +91 98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Customer support or inquiry number.</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1.5">
                <MessageSquare className="h-4 w-4 text-green-600" />
                <span>WhatsApp Number or Group Link</span>
              </label>
              <Input
                placeholder="e.g. +91 9876543210 or chat.whatsapp.com/..."
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Clients can tap to start a WhatsApp chat or join your community group.
              </p>
            </div>
          </div>
        </div>

        {message && (
          <div
            className={`p-4 rounded-lg text-sm font-medium border ${
              message.type === 'success'
                ? 'bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-400'
                : 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400'
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="flex items-center gap-4">
          <Button type="submit" isLoading={isSaving} className="px-8 font-semibold">
            Save Store Profile
          </Button>
          <span className="text-xs text-muted-foreground">
            Any field you change can be updated independently at any time.
          </span>
        </div>
      </form>
    </div>
  );
}
