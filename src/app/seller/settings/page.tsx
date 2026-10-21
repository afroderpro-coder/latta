"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/utils/supabase/client";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Loader2,
  Upload,
  X,
  MapPin,
  Phone,
  MessageSquare,
  Image as ImageIcon,
  Store,
  User,
  Mail,
  ExternalLink,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { parseStoreBio, serializeStoreBio, StoreMetadata } from "@/utils/storeMetadata";

export default function StoreSettingsPage() {
  const { profile, setProfile } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [storeId, setStoreId] = useState<string | null>(null);

  // Merchant Profile Details (Auto-populated from account creation)
  const [sellerName, setSellerName] = useState("");
  const [sellerEmail, setSellerEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");

  // Storefront & Brand Information
  const [shopName, setShopName] = useState("");
  const [brandName, setBrandName] = useState("");
  const [bio, setBio] = useState("");

  // Store Visuals & Location (Info left during registration, updated here)
  const [logoUrl, setLogoUrl] = useState("");
  const [shopPhotoUrl, setShopPhotoUrl] = useState("");
  const [location, setLocation] = useState("");

  // Preserved metadata (reviews, orders, subscription, verification)
  const [existingMeta, setExistingMeta] = useState<StoreMetadata>({ bio: "" });
  const [existingReviews, setExistingReviews] = useState<any[]>([]);
  const [existingOrders, setExistingOrders] = useState<any[]>([]);

  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const SETTINGS_DRAFT_KEY = `afroder_draft_seller_settings_${profile?.id || "default"}`;
  const [hasDraft, setHasDraft] = useState(false);
  const [isDraftLoaded, setIsDraftLoaded] = useState(false);

  useEffect(() => {
    async function loadStore() {
      if (!profile) return;
      try {
        // 1. Fetch current auth user metadata (contains details entered during signup)
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const userMeta = user?.user_metadata || {};

        // 2. Fetch seller store record from database
        const { data: storeData, error: storeError } = await supabase
          .from("stores")
          .select("*")
          .eq("seller_id", profile.id)
          .single();

        if (storeError && storeError.code !== "PGRST116") {
          console.error("Store fetch error:", storeError);
        }

        if (storeData) {
          setStoreId(storeData.id);
          const meta: StoreMetadata = parseStoreBio(storeData.bio);
          setExistingMeta(meta);

          // Auto-fill or restore Shop Name
          const resolvedShopName =
            storeData.shop_name ||
            userMeta.shop_name ||
            (profile.full_name ? `${profile.full_name}'s Store` : "");
          setShopName(resolvedShopName);

          // Brand Name
          setBrandName(storeData.brand_name || resolvedShopName || "");

          // Store Logo / Profile Picture
          setLogoUrl(storeData.logo_url || profile.avatar_url || "");

          // Shop Photo / Cover Banner
          setShopPhotoUrl(meta.shop_photo_url || "");

          // Location
          setLocation(meta.location || "");

          // Phone Number (Primary)
          const resolvedPhone =
            meta.phone ||
            meta.contact_number ||
            userMeta.contact_number ||
            userMeta.phone ||
            (user?.email?.endsWith("@phone.afroder.com")
              ? user.email.replace("@phone.afroder.com", "")
              : "");
          setPhone(resolvedPhone);

          // WhatsApp
          setWhatsapp(meta.whatsapp || resolvedPhone || "");

          // Owner / Seller Full Name
          setSellerName(meta.seller_name || profile.full_name || userMeta.full_name || "");

          // Email (ignore synthetic phone email)
          const resolvedEmail =
            meta.seller_email && !meta.seller_email.endsWith("@phone.afroder.com")
              ? meta.seller_email
              : profile.email && !profile.email.endsWith("@phone.afroder.com")
              ? profile.email
              : userMeta.optional_email || "";
          setSellerEmail(resolvedEmail);

          // Bio / Description
          setBio(meta.bio || "");
          setExistingReviews(meta.reviews || []);
          setExistingOrders(meta.orders || []);
        } else {
          // Store doesn't exist yet - initialize automatic values from signup metadata!
          const defaultShopName =
            userMeta.shop_name ||
            (profile.full_name ? `${profile.full_name}'s Store` : "My Apparel Store");
          setShopName(defaultShopName);
          setBrandName(defaultShopName);
          setSellerName(profile.full_name || userMeta.full_name || "");

          const defaultPhone =
            userMeta.contact_number ||
            userMeta.phone ||
            (user?.email?.endsWith("@phone.afroder.com")
              ? user.email.replace("@phone.afroder.com", "")
              : "");
          setPhone(defaultPhone);
          setWhatsapp(defaultPhone);

          const defaultEmail =
            profile.email && !profile.email.endsWith("@phone.afroder.com")
              ? profile.email
              : userMeta.optional_email || "";
          setSellerEmail(defaultEmail);
          setLogoUrl(profile.avatar_url || "");
        }

        // 3. Restore any unsaved draft from localStorage if present
        try {
          const savedDraft = localStorage.getItem(SETTINGS_DRAFT_KEY);
          if (savedDraft) {
            const parsed = JSON.parse(savedDraft);
            if (parsed.sellerName) setSellerName(parsed.sellerName);
            if (parsed.sellerEmail) setSellerEmail(parsed.sellerEmail);
            if (parsed.phone) setPhone(parsed.phone);
            if (parsed.whatsapp) setWhatsapp(parsed.whatsapp);
            if (parsed.shopName) setShopName(parsed.shopName);
            if (parsed.brandName) setBrandName(parsed.brandName);
            if (parsed.bio !== undefined) setBio(parsed.bio);
            if (parsed.location !== undefined) setLocation(parsed.location);
            if (parsed.logoUrl) setLogoUrl(parsed.logoUrl);
            if (parsed.shopPhotoUrl) setShopPhotoUrl(parsed.shopPhotoUrl);
            setHasDraft(true);
          }
        } catch (e) {
          console.warn("Could not parse settings draft:", e);
        }
      } catch (err: any) {
        console.error("Failed to load store:", err);
      } finally {
        setIsLoading(false);
        setIsDraftLoaded(true);
      }
    }
    loadStore();
  }, [profile, SETTINGS_DRAFT_KEY]);

  // Auto-save changes to localStorage as the user types
  useEffect(() => {
    if (!isDraftLoaded || isLoading) return;
    try {
      const draftData = {
        sellerName,
        sellerEmail,
        phone,
        whatsapp,
        shopName,
        brandName,
        bio,
        location,
        logoUrl,
        shopPhotoUrl,
      };

      localStorage.setItem(SETTINGS_DRAFT_KEY, JSON.stringify(draftData));
      setHasDraft(true);
    } catch (e) {
      console.warn("Failed to auto-save settings draft:", e);
    }
  }, [
    sellerName,
    sellerEmail,
    phone,
    whatsapp,
    shopName,
    brandName,
    bio,
    location,
    logoUrl,
    shopPhotoUrl,
    isDraftLoaded,
    isLoading,
    SETTINGS_DRAFT_KEY,
  ]);

  const handleDiscardDraft = async () => {
    try {
      localStorage.removeItem(SETTINGS_DRAFT_KEY);
      setHasDraft(false);
      window.location.reload();
    } catch (e) {
      console.warn("Could not discard settings draft:", e);
    }
  };

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
      const fileExt = file.name.split(".").pop() || "png";
      const fileName = `${type}-${profile.id}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("store_logos")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("store_logos").getPublicUrl(filePath);

      if (type === "logo") {
        setLogoUrl(publicUrl);
      } else {
        setShopPhotoUrl(publicUrl);
      }
    } catch (error: any) {
      setMessage({ type: "error", text: "Error uploading image: " + error.message });
    } finally {
      if (type === "logo") setIsUploadingLogo(false);
      else setIsUploadingPhoto(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    if (!shopName.trim()) {
      setMessage({ type: "error", text: "Please enter a shop name." });
      return;
    }

    if (!sellerName.trim()) {
      setMessage({ type: "error", text: "Please enter your full merchant name." });
      return;
    }

    if (!phone.trim()) {
      setMessage({ type: "error", text: "Please enter your contact phone number." });
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      // 1. Pack bio while preserving approval_status, subscription, payment receipt, reviews & orders
      const serializedBio = serializeStoreBio({
        ...existingMeta,
        bio: bio.trim(),
        location: location.trim(),
        phone: phone.trim(),
        whatsapp: whatsapp.trim() || phone.trim(),
        contact_number: phone.trim(),
        seller_name: sellerName.trim(),
        seller_email: sellerEmail.trim() || undefined,
        shop_photo_url: shopPhotoUrl.trim(),
        reviews: existingReviews,
        orders: existingOrders,
      });

      const storePayload = {
        shop_name: shopName.trim(),
        brand_name: brandName.trim() || shopName.trim(),
        logo_url: logoUrl.trim() || null,
        bio: serializedBio,
      };

      // 2. Upsert in stores table
      let currentStoreId = storeId;
      if (currentStoreId) {
        const { error } = await supabase
          .from("stores")
          .update(storePayload)
          .eq("id", currentStoreId);
        if (error) throw error;
      } else {
        const { data: newStore, error } = await supabase
          .from("stores")
          .insert({ ...storePayload, seller_id: profile.id })
          .select("id")
          .single();
        if (error) throw error;
        if (newStore) {
          setStoreId(newStore.id);
          currentStoreId = newStore.id;
        }
      }

      // 3. Update profiles table with updated full name and avatar
      const profileUpdates: any = {
        full_name: sellerName.trim(),
        avatar_url: logoUrl.trim() || null,
      };
      if (sellerEmail.trim()) {
        profileUpdates.email = sellerEmail.trim();
      }

      await supabase
        .from("profiles")
        .update(profileUpdates)
        .eq("id", profile.id);

      // Update in-memory Zustand store
      setProfile({
        ...profile,
        full_name: sellerName.trim(),
        avatar_url: logoUrl.trim() || null,
        email: sellerEmail.trim() || profile.email,
      });

      // Clear draft on successful database save
      try {
        localStorage.removeItem(SETTINGS_DRAFT_KEY);
        setHasDraft(false);
      } catch (e) {
        console.warn("Could not remove settings draft:", e);
      }

      setMessage({ type: "success", text: "Store profile & details updated successfully!" });
    } catch (err: any) {
      console.error("Save error:", err);
      setMessage({ type: "error", text: err.message || "Failed to save settings." });
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
    <div className="max-w-4xl space-y-8 pb-16">
      {/* Page Header with Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">Store Profile & Settings</h1>
            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
              Live Store
            </span>
            {hasDraft && (
              <span className="flex items-center gap-1.5 text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-2.5 py-0.5 rounded-full font-medium ml-2">
                <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Auto-saved
                <button
                  type="button"
                  onClick={handleDiscardDraft}
                  className="text-muted-foreground hover:text-destructive text-[11px] underline ml-1 font-normal"
                  title="Discard unsaved edits and reload database values"
                >
                  Discard
                </button>
              </span>
            )}
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            Auto-synced with your registration details. Update your storefront profile, physical location, photos, and direct contacts anytime.
          </p>
        </div>

        {storeId && (
          <Link
            href={`/store/${storeId}`}
            target="_blank"
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg border border-border bg-card hover:bg-secondary text-sm font-medium text-foreground transition-colors shrink-0 shadow-xs"
          >
            <span>View Public Store</span>
            <ExternalLink className="w-4 h-4 text-primary" />
          </Link>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* ── Section 1: Merchant / Owner Profile Details (Auto-filled from signup) ── */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2 font-semibold text-lg text-foreground">
              <User className="h-5 w-5 text-primary" />
              <span>Merchant Profile & Details</span>
            </div>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Auto-filled from your account
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Owner Full Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                <span>Owner / Merchant Name *</span>
              </label>
              <Input
                placeholder="e.g. Sahid Afridi"
                value={sellerName}
                onChange={(e) => setSellerName(e.target.value)}
                required
                className="h-11"
              />
              <p className="text-[11px] text-muted-foreground">Your personal merchant contact name.</p>
            </div>

            {/* Primary Phone Number */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-primary" />
                <span>Primary Contact / Phone Number *</span>
              </label>
              <Input
                placeholder="e.g. 9671016500"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="h-11"
              />
              <p className="text-[11px] text-muted-foreground">Your registered mobile number for store inquiries.</p>
            </div>

            {/* WhatsApp Number or Link */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                <span>WhatsApp Number / Community Link</span>
              </label>
              <Input
                placeholder="e.g. 9671016500 or chat.whatsapp.com/..."
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                className="h-11"
              />
              <p className="text-[11px] text-muted-foreground">Customers can tap to start direct WhatsApp chat.</p>
            </div>

            {/* Email Address (Optional) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" />
                  <span>Email / Gmail Address</span>
                </label>
                <span className="text-[10px] uppercase font-semibold text-muted-foreground bg-secondary px-2 py-0.5 rounded-full border border-border">
                  Optional
                </span>
              </div>
              <Input
                placeholder="name@gmail.com (Optional)"
                type="email"
                value={sellerEmail}
                onChange={(e) => setSellerEmail(e.target.value)}
                className="h-11"
              />
              <p className="text-[11px] text-muted-foreground">Optional email for order confirmations or notices.</p>
            </div>
          </div>
        </div>

        {/* ── Section 2: Storefront & Brand Information ── */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-2 font-semibold text-lg border-b border-border pb-3">
            <Store className="h-5 w-5 text-primary" />
            <span>Storefront & Brand Information</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                Shop Name *
              </label>
              <Input
                placeholder="e.g. Royal Atelier"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                required
                className="h-11"
              />
              <p className="text-[11px] text-muted-foreground">Primary store name displayed on customer search and product tags.</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                Brand / Label Name (Optional)
              </label>
              <Input
                placeholder="e.g. Royal Atelier Haute Couture"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                className="h-11"
              />
              <p className="text-[11px] text-muted-foreground">Shown on product tags, collections, and brand headers.</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
              About / Store Description
            </label>
            <textarea
              className="flex min-h-[100px] w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 leading-relaxed"
              placeholder="Tell customers about your apparel collections, fabric craftsmanship, sizing advice, and store vision..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">Displayed prominently in the &quot;About Store&quot; section of your storefront.</p>
          </div>
        </div>

        {/* ── Section 3: Store Logo & Shop Photos (Left during registration — update here!) ── */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2 font-semibold text-lg">
              <ImageIcon className="h-5 w-5 text-primary" />
              <span>Store Logo & Shop Photo</span>
            </div>
            <span className="text-xs text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-medium">
              Profile Branding
            </span>
          </div>

          {/* Store Logo (Profile Picture / Avatar) */}
          <div className="space-y-2">
            <label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground flex items-center justify-between">
              <span>Store Logo / Profile Picture</span>
              <span className="text-[11px] lowercase text-muted-foreground font-normal">square avatar (PNG, JPG)</span>
            </label>
            <div className="flex items-center gap-5">
              {logoUrl ? (
                <div className="relative h-20 w-20 overflow-hidden rounded-full border-2 border-primary shadow-sm shrink-0 bg-background">
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
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-border bg-muted/40">
                  <Upload className="h-6 w-6 text-muted-foreground/60" />
                </div>
              )}
              <div className="flex-1 space-y-1.5">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, "logo")}
                  disabled={isUploadingLogo}
                  className="cursor-pointer file:text-sm file:font-medium h-11"
                />
                <p className="text-[11px] text-muted-foreground">
                  {isUploadingLogo ? (
                    <span className="inline-flex items-center text-primary font-medium">
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> Uploading logo to cloud storage...
                    </span>
                  ) : (
                    "Upload your store logo or profile photo. Displays on your store header and seller badge."
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Shop Photo / Cover Banner */}
          <div className="space-y-2 pt-4 border-t border-border">
            <label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground flex items-center justify-between">
              <span>Shop Photo / Cover Banner</span>
              <span className="text-[11px] lowercase text-muted-foreground font-normal">storefront banner or showroom photo</span>
            </label>
            <div className="space-y-3">
              {shopPhotoUrl ? (
                <div className="relative h-48 w-full overflow-hidden rounded-xl border border-border shadow-sm bg-muted/20">
                  <img src={shopPhotoUrl} alt="Shop banner preview" className="h-full w-full object-cover" />
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
                <div className="flex h-36 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30 text-muted-foreground">
                  <ImageIcon className="h-8 w-8 mb-2 opacity-50" />
                  <span className="text-xs font-medium">No shop banner photo uploaded yet</span>
                  <span className="text-[11px] opacity-75 mt-0.5">Showcase your boutique front, atelier, or brand aesthetics</span>
                </div>
              )}

              <Input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileUpload(e, "photo")}
                disabled={isUploadingPhoto}
                className="cursor-pointer file:text-sm file:font-medium h-11"
              />
              <p className="text-[11px] text-muted-foreground">
                {isUploadingPhoto ? (
                  <span className="inline-flex items-center text-primary font-medium">
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> Uploading banner photo...
                  </span>
                ) : (
                  "Wide horizontal photo (1200x400 recommended). Shown as the header banner on your public storefront."
                )}
              </p>
            </div>
          </div>
        </div>

        {/* ── Section 4: Location & Direct Navigation (Left during registration — update here!) ── */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2 font-semibold text-lg">
              <MapPin className="h-5 w-5 text-primary" />
              <span>Shop Location & Physical Boutique</span>
            </div>
            <span className="text-xs text-muted-foreground">Maps Navigation</span>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>Physical Address or Google Maps Location</span>
            </label>
            <Input
              placeholder="e.g. Shop #07, Market Complex, Main Road, Nuh, Haryana 122105"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="h-11"
            />
            <p className="text-[11px] text-muted-foreground">
              Enter your retail address or paste a Google Maps share link. Customers visiting your storefront can tap to get GPS directions directly to your shop.
            </p>
          </div>
        </div>

        {/* Status Message */}
        {message && (
          <div
            className={`p-4 rounded-xl text-sm font-medium border flex items-center gap-2.5 ${
              message.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                : "bg-destructive/10 border-destructive/30 text-destructive"
            }`}
          >
            {message.type === "success" && <CheckCircle2 className="w-5 h-5 shrink-0" />}
            <span>{message.text}</span>
          </div>
        )}

        {/* Save & Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
          <Button type="submit" isLoading={isSaving} className="w-full sm:w-auto px-8 h-12 text-sm font-semibold tracking-wide">
            Save Store Profile
          </Button>

          {storeId && (
            <Link
              href={`/store/${storeId}`}
              target="_blank"
              className="inline-flex items-center space-x-1.5 text-xs font-semibold text-primary hover:underline"
            >
              <span>View live storefront changes</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          )}

          <span className="text-xs text-muted-foreground ml-auto hidden sm:inline-block">
            All details can be updated independently at any time.
          </span>
        </div>
      </form>
    </div>
  );
}
