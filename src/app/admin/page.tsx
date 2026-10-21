"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase/client";
import { parseStoreBio, serializeStoreBio, StoreMetadata } from "@/utils/storeMetadata";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import Image from "next/image";
import Link from "next/link";
import {
  ShieldCheck,
  ShieldAlert,
  Clock,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Store,
  Phone,
  Mail,
  User,
  ExternalLink,
  RefreshCw,
  Search,
  Lock,
  LogOut,
  Sparkles,
  Copy,
  Check,
  RotateCcw,
  Package,
  Trash2,
  Eye,
  EyeOff,
  Tag,
  FileText,
} from "lucide-react";

interface SellerStoreRecord {
  id: string;
  seller_id: string;
  shop_name: string;
  created_at: string;
  bio: string | null;
  brand_name: string | null;
  logo_url: string | null;
  meta: StoreMetadata;
  profiles?: {
    id: string;
    email: string;
    full_name: string | null;
  } | null;
  products_count?: number;
}

interface AdminProductRecord {
  id: string;
  title: string;
  price: number;
  image_urls?: string[] | null;
  store_id: string;
  category?: string | null;
  stock?: number | null;
  is_active?: boolean | null;
  created_at: string;
  description?: string | null;
  stores?: {
    id?: string;
    shop_name?: string;
  } | null;
}

export default function SuperAdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [passcode, setPasscode] = useState<string>("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const [stores, setStores] = useState<SellerStoreRecord[]>([]);
  const [productsList, setProductsList] = useState<AdminProductRecord[]>([]);
  const [productsTotal, setProductsTotal] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<"pending" | "approved" | "rejected" | "products">("pending");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [productActionInProgress, setProductActionInProgress] = useState<string | null>(null);

  // WhatsApp Notification Modal State
  const [whatsAppModal, setWhatsAppModal] = useState<{
    isOpen: boolean;
    type: "approved" | "rejected" | "custom";
    sellerName: string;
    shopName: string;
    phone: string;
    message: string;
  } | null>(null);

  // Delete Store Confirmation Modal State
  const [deleteStoreModal, setDeleteStoreModal] = useState<SellerStoreRecord | null>(null);
  const [isDeletingStore, setIsDeletingStore] = useState<boolean>(false);

  // View Payment Receipt Modal State
  const [receiptModal, setReceiptModal] = useState<SellerStoreRecord | null>(null);

  const [copied, setCopied] = useState<boolean>(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // Always require password whenever Web Controller is opened
  useEffect(() => {
    try {
      localStorage.removeItem("afroder_superadmin_auth");
      sessionStorage.removeItem("afroder_superadmin_auth");
    } catch {}
    setIsAuthenticated(false);
  }, []);

  // Fetch all stores and their approval metadata
  const fetchData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch stores from server API (with server-side deletion filter)
      let storesData: any[] = [];
      let apiLoaded = false;
      try {
        const res = await fetch("/api/admin/stores");
        const json = await res.json();
        if (json.success && Array.isArray(json.stores)) {
          storesData = json.stores;
          apiLoaded = true;
        }
      } catch (e) {
        console.warn("API store fetch error, falling back:", e);
      }

      if (!apiLoaded) {
        const { data: directData } = await supabase
          .from("stores")
          .select("*, profiles:seller_id(id, email, full_name)")
          .order("created_at", { ascending: false });
        if (directData) storesData = directData;
      }

      // 2. Fetch all products with store relation
      const { data: prodsData, count: prodCount, error: prodsError } = await supabase
        .from("products")
        .select("*, stores(id, shop_name)", { count: "exact" })
        .order("created_at", { ascending: false });

      if (prodsError) {
        console.error("Error fetching products:", prodsError);
      }

      if (prodsData) {
        setProductsList(prodsData as any);
      }
      setProductsTotal(prodCount ?? prodsData?.length ?? 0);

      if (storesData) {
        let deletedStoreIds: string[] = [];
        try {
          deletedStoreIds = JSON.parse(localStorage.getItem("afroder_deleted_store_ids") || "[]");
        } catch {
          deletedStoreIds = [];
        }

        // Identify sellers who have at least one store with real bio/metadata
        const sellersWithRealStore = new Set(
          storesData.filter((s) => s.bio && s.bio.trim() !== "").map((s) => s.seller_id)
        );

        const enriched: SellerStoreRecord[] = storesData
          .filter((store) => {
            // Filter out manually deleted stores
            if (deletedStoreIds.includes(store.id)) return false;

            // Filter out duplicate ghost stores (bio is null/empty and seller has an actual real store)
            if ((!store.bio || store.bio.trim() === "") && sellersWithRealStore.has(store.seller_id)) {
              return false;
            }

            return true;
          })
          .map((store) => {
            const meta = parseStoreBio(store.bio);
            return {
              ...store,
              meta,
            };
          });
        setStores(enriched);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated]);

  const handlePasscodeLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim()) {
      setAuthError("Please enter the controller password.");
      return;
    }

    setIsVerifying(true);
    setAuthError(null);

    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: passcode }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setIsAuthenticated(true);
        setPasscode("");
        setAuthError(null);
      } else {
        setAuthError(data.error || "Incorrect password. Access denied.");
      }
    } catch {
      setAuthError("Network error. Could not verify credentials.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setPasscode("");
    setStores([]);
    setProductsList([]);
    try {
      localStorage.removeItem("afroder_superadmin_auth");
      sessionStorage.removeItem("afroder_superadmin_auth");
    } catch {}
  };

  // Helper to format phone for WhatsApp
  const cleanPhoneForWhatsApp = (phoneStr: string) => {
    let cleaned = phoneStr.replace(/[^0-9]/g, "");
    if (cleaned.length === 10) {
      cleaned = "91" + cleaned; // default to India country code if 10 digits
    }
    return cleaned;
  };

  // ── Approval Handler ──
  const handleApproveStore = async (store: SellerStoreRecord) => {
    setActionInProgress(store.id);
    try {
      const updatedMeta: StoreMetadata = {
        ...store.meta,
        approval_status: "approved",
        reviewed_at: new Date().toISOString(),
      };

      const serialized = serializeStoreBio(updatedMeta);

      // 1. Update via server API
      try {
        await fetch("/api/admin/stores", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ storeId: store.id, status: "approved" }),
        });
      } catch (apiErr) {
        console.warn("API store approve error:", apiErr);
      }

      // 2. Direct Supabase update as fallback
      await supabase
        .from("stores")
        .update({ bio: serialized })
        .eq("id", store.id);

      // Update local state
      setStores((prev) =>
        prev.map((s) => (s.id === store.id ? { ...s, bio: serialized, meta: updatedMeta } : s))
      );

      // Prepare WhatsApp message
      const sellerName = store.meta.seller_name || store.profiles?.full_name || "Seller";
      const shopName = store.shop_name;
      const phone = store.meta.contact_number || store.meta.phone || store.meta.whatsapp || "";

      const approvalMessage = `🌟 *AFRODER APPAREL - SELLER ACCOUNT APPROVED* 🌟

Dear ${sellerName},

Congratulations! Your seller application for *${shopName}* has been verified and approved by the AFRODER Web Controller.

Your store is now active! You can now log in to your Seller Portal and start uploading your apparel collection:
🔗 *Login:* https://latta-marketplace.netlify.app/auth?role=seller&mode=signin

Welcome to the AFRODER family. If you need any assistance setting up your products, feel free to reply to this message.

Best Regards,
*AFRODER Management Team*`;

      setWhatsAppModal({
        isOpen: true,
        type: "approved",
        sellerName,
        shopName,
        phone,
        message: approvalMessage,
      });
    } catch (err) {
      console.error(err);
      alert("Error approving seller.");
    } finally {
      setActionInProgress(null);
    }
  };

  // ── Rejection Handler ──
  const handleRejectStore = async (store: SellerStoreRecord) => {
    const confirmReject = window.confirm(
      `Are you sure you want to reject "${store.shop_name}"? The seller will not be able to log in.`
    );
    if (!confirmReject) return;

    setActionInProgress(store.id);
    try {
      const updatedMeta: StoreMetadata = {
        ...store.meta,
        approval_status: "rejected",
        reviewed_at: new Date().toISOString(),
      };

      const serialized = serializeStoreBio(updatedMeta);

      // 1. Call server API to bypass RLS and persist rejected status
      try {
        await fetch("/api/admin/stores", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ storeId: store.id, status: "rejected" }),
        });
      } catch (apiErr) {
        console.warn("API store reject error:", apiErr);
      }

      // 2. Direct Supabase update as fallback
      await supabase
        .from("stores")
        .update({ bio: serialized })
        .eq("id", store.id);

      // 3. Update local state
      setStores((prev) =>
        prev.map((s) => (s.id === store.id ? { ...s, bio: serialized, meta: updatedMeta } : s))
      );

      const sellerName = store.meta.seller_name || store.profiles?.full_name || "Seller";
      const shopName = store.shop_name;
      const phone = store.meta.contact_number || store.meta.phone || store.meta.whatsapp || "";

      const rejectionMessage = `⚠️ *AFRODER APPAREL - SELLER APPLICATION UPDATE* ⚠️

Dear ${sellerName},

Thank you for your interest in joining AFRODER as a seller for *${shopName}*.

After reviewing your application details, our verification team was unable to approve your seller account at this time.

If you believe this was an error or would like to submit updated store documents or information, please reply directly to this WhatsApp message so our support team can assist you.

Best Regards,
*AFRODER Verification Team*`;

      setWhatsAppModal({
        isOpen: true,
        type: "rejected",
        sellerName,
        shopName,
        phone,
        message: rejectionMessage,
      });
    } catch (err) {
      console.error(err);
      alert("Error rejecting seller.");
    } finally {
      setActionInProgress(null);
    }
  };

  // ── Store Deletion Handler ──
  const handleConfirmDeleteStore = async () => {
    if (!deleteStoreModal) return;
    const storeToDelete = deleteStoreModal;
    setIsDeletingStore(true);
    try {
      // 1. Call server API to delete store and products (bypassing RLS + saving to server deleted list)
      try {
        await fetch("/api/admin/stores", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ storeId: storeToDelete.id }),
        });
      } catch (apiErr) {
        console.warn("API store delete error:", apiErr);
      }

      // 2. Delete associated products from Supabase
      const { error: prodError } = await supabase
        .from("products")
        .delete()
        .eq("store_id", storeToDelete.id);
      if (prodError) {
        console.warn("Notice deleting store products:", prodError);
      }

      // 3. Delete the store record from Supabase
      const { error: storeError } = await supabase
        .from("stores")
        .delete()
        .eq("id", storeToDelete.id);
      if (storeError) {
        console.warn("Notice deleting store from Supabase:", storeError);
      }

      // 3. Persist deleted ID in localStorage so it stays deleted even on refresh
      try {
        const existingDeleted: string[] = JSON.parse(
          localStorage.getItem("afroder_deleted_store_ids") || "[]"
        );
        if (!existingDeleted.includes(storeToDelete.id)) {
          existingDeleted.push(storeToDelete.id);
          localStorage.setItem("afroder_deleted_store_ids", JSON.stringify(existingDeleted));
        }
      } catch (e) {
        console.warn("LocalStorage save error:", e);
      }

      // 4. Update local state
      setStores((prev) => prev.filter((s) => s.id !== storeToDelete.id));
      setDeleteStoreModal(null);
    } catch (err: any) {
      console.error("Delete store error:", err);
      alert("Failed to delete store: " + (err.message || "Please try again"));
    } finally {
      setIsDeletingStore(false);
    }
  };

  // ── Product Management Handlers ──
  const handleDeleteProduct = async (productId: string, title: string) => {
    if (!confirm(`Are you sure you want to remove "${title}" from the marketplace?`)) return;
    setProductActionInProgress(productId);
    try {
      const { error } = await supabase.from("products").delete().eq("id", productId);
      if (error) {
        alert("Failed to delete product: " + error.message);
      } else {
        setProductsList((prev) => prev.filter((p) => p.id !== productId));
        setProductsTotal((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting product");
    } finally {
      setProductActionInProgress(null);
    }
  };

  const handleToggleProductActive = async (productId: string, currentStatus: boolean | null | undefined) => {
    const newStatus = currentStatus === false ? true : false;
    setProductActionInProgress(productId);
    try {
      const { error } = await supabase
        .from("products")
        .update({ is_active: newStatus })
        .eq("id", productId);
      if (error) {
        alert("Failed to update product status: " + error.message);
      } else {
        setProductsList((prev) =>
          prev.map((p) => (p.id === productId ? { ...p, is_active: newStatus } : p))
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setProductActionInProgress(null);
    }
  };

  // Filter stores by tab & search query
  const pendingStores = stores.filter((s) => s.meta.approval_status === "pending");
  const approvedStores = stores.filter((s) => s.meta.approval_status === "approved" || !s.meta.approval_status);
  const rejectedStores = stores.filter((s) => s.meta.approval_status === "rejected");

  const currentList =
    activeTab === "pending"
      ? pendingStores
      : activeTab === "approved"
      ? approvedStores
      : rejectedStores;

  const filteredStores = currentList.filter((s) => {
    const q = searchQuery.toLowerCase();
    const shop = s.shop_name.toLowerCase();
    const seller = (s.meta.seller_name || s.profiles?.full_name || "").toLowerCase();
    const email = (s.meta.seller_email || s.profiles?.email || "").toLowerCase();
    const phone = (s.meta.contact_number || s.meta.phone || "").toLowerCase();
    return shop.includes(q) || seller.includes(q) || email.includes(q) || phone.includes(q);
  });

  const filteredProducts = productsList.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const title = (p.title || "").toLowerCase();
    const shop = (p.stores?.shop_name || "").toLowerCase();
    const cat = (p.category || "").toLowerCase();
    const price = (p.price?.toString() || "").toLowerCase();
    return title.includes(q) || shop.includes(q) || cat.includes(q) || price.includes(q);
  });

  // ── Render Passcode Login Screen if not authenticated ──
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="w-full max-w-md bg-card p-8 md:p-10 rounded-2xl border border-border shadow-2xl text-center space-y-6">
          <div className="flex flex-col items-center">
            <div className="relative w-32 h-16 mb-2">
              <Image src="/logo-emblem.png" alt="AFRODER" fill className="object-contain" priority />
            </div>
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mt-2">
              <Lock className="w-3.5 h-3.5" />
              <span>Web Controller Portal</span>
            </div>
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Web Controller Access</h1>
            <p className="text-xs text-muted-foreground mt-1">
              Enter your Web Controller password to access seller verification and management.
            </p>
          </div>

          <form onSubmit={handlePasscodeLogin} className="space-y-4">
            <div className="space-y-1.5 text-left">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Controller Password
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter password..."
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  className="h-12 pr-11 text-center text-lg tracking-widest font-mono"
                  autoFocus
                  disabled={isVerifying}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {authError && (
              <div className="p-3 rounded-lg text-xs font-medium bg-destructive/10 text-destructive border border-destructive/20 flex items-center justify-center space-x-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <Button
              type="submit"
              disabled={isVerifying || !passcode}
              className="w-full h-12 text-base font-semibold tracking-wide cursor-pointer"
            >
              {isVerifying ? (
                <div className="flex items-center space-x-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Verifying Access...</span>
                </div>
              ) : (
                "Unlock Web Controller"
              )}
            </Button>
          </form>

          <p className="text-[11px] text-muted-foreground flex items-center justify-center gap-1.5 opacity-70">
            <Lock className="w-3 h-3" />
            <span>Encrypted Server-Side Security Protection</span>
          </p>
        </div>
      </div>
    );
  }

  // ── Authenticated Super Admin Dashboard ──
  return (
    <div className="min-h-screen bg-muted/20 text-foreground pb-20">
      {/* ── Top Bar ── */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur border-b border-border shadow-xs">
        <div className="container mx-auto px-4 sm:px-6 h-18 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Image src="/logo-emblem.png" alt="AFRODER" width={38} height={18} className="object-contain" priority />
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-tight">AFRODER</span>
                <span className="text-[10px] font-extrabold uppercase tracking-widest bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                  Super Admin
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">Web Controller & Verification Panel</p>
            </div>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-3">
            <Button variant="ghost" size="sm" onClick={fetchData} disabled={isLoading} className="text-xs">
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Link href="/" target="_blank">
              <Button variant="outline" size="sm" className="text-xs hidden sm:inline-flex">
                <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                Live Store
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-xs text-destructive hover:bg-destructive/10">
              <LogOut className="w-3.5 h-3.5 mr-1.5" />
              Exit
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 pt-8 max-w-7xl space-y-8">
        {/* ── Metric Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Pending Requests */}
          <div
            onClick={() => setActiveTab("pending")}
            className={`p-5 rounded-2xl border transition-all cursor-pointer ${
              activeTab === "pending"
                ? "bg-amber-500/10 border-amber-500/40 ring-2 ring-amber-500/20 shadow-md"
                : "bg-card border-border hover:border-amber-500/30"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">New Requests</span>
              <div className="w-8 h-8 rounded-full bg-amber-500/15 flex items-center justify-center text-amber-600">
                <Clock className="w-4 h-4 animate-pulse" />
              </div>
            </div>
            <div className="text-3xl font-bold tracking-tight text-foreground">{pendingStores.length}</div>
            <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-1">
              {pendingStores.length > 0 ? "Requires Controller Action" : "All Caught Up"}
            </p>
          </div>

          {/* Approved Stores */}
          <div
            onClick={() => setActiveTab("approved")}
            className={`p-5 rounded-2xl border transition-all cursor-pointer ${
              activeTab === "approved"
                ? "bg-emerald-500/10 border-emerald-500/40 ring-2 ring-emerald-500/20 shadow-md"
                : "bg-card border-border hover:border-emerald-500/30"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Approved Stores</span>
              <div className="w-8 h-8 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-600">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-bold tracking-tight text-foreground">{approvedStores.length}</div>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1">Active Verified Sellers</p>
          </div>

          {/* Rejected Stores */}
          <div
            onClick={() => setActiveTab("rejected")}
            className={`p-5 rounded-2xl border transition-all cursor-pointer ${
              activeTab === "rejected"
                ? "bg-red-500/10 border-red-500/40 ring-2 ring-red-500/20 shadow-md"
                : "bg-card border-border hover:border-red-500/30"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Rejected Requests</span>
              <div className="w-8 h-8 rounded-full bg-red-500/15 flex items-center justify-center text-red-600">
                <ShieldAlert className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-bold tracking-tight text-foreground">{rejectedStores.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Denied Applications</p>
          </div>

          {/* Total Marketplace Products */}
          <div
            onClick={() => setActiveTab("products")}
            className={`p-5 rounded-2xl border transition-all cursor-pointer ${
              activeTab === "products"
                ? "bg-primary/10 border-primary/40 ring-2 ring-primary/20 shadow-md"
                : "bg-card border-border hover:border-primary/30"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Products</span>
              <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-primary">
                <Package className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-bold tracking-tight text-foreground">{productsTotal}</div>
            <p className="text-xs text-primary font-medium mt-1">Click to View & Manage Catalog</p>
          </div>
        </div>

        {/* ── Main Section Header & Search ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-6 rounded-2xl border border-border shadow-xs">
          {/* Navigation Tabs */}
          <div className="flex p-1 bg-secondary/60 rounded-xl border border-border max-w-xl w-full overflow-x-auto">
            <button
              onClick={() => setActiveTab("pending")}
              className={`flex-1 py-2 px-3 text-xs md:text-sm font-semibold rounded-lg transition-all flex items-center justify-center space-x-1.5 whitespace-nowrap ${
                activeTab === "pending"
                  ? "bg-background shadow-xs text-foreground font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>New Requests</span>
              {pendingStores.length > 0 && (
                <span className="bg-amber-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                  {pendingStores.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("approved")}
              className={`flex-1 py-2 px-3 text-xs md:text-sm font-semibold rounded-lg transition-all flex items-center justify-center space-x-1.5 whitespace-nowrap ${
                activeTab === "approved"
                  ? "bg-background shadow-xs text-foreground font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>Approved ({approvedStores.length})</span>
            </button>
            <button
              onClick={() => setActiveTab("rejected")}
              className={`flex-1 py-2 px-3 text-xs md:text-sm font-semibold rounded-lg transition-all flex items-center justify-center space-x-1.5 whitespace-nowrap ${
                activeTab === "rejected"
                  ? "bg-background shadow-xs text-foreground font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>Rejected ({rejectedStores.length})</span>
            </button>
            <button
              onClick={() => setActiveTab("products")}
              className={`flex-1 py-2 px-3 text-xs md:text-sm font-semibold rounded-lg transition-all flex items-center justify-center space-x-1.5 whitespace-nowrap ${
                activeTab === "products"
                  ? "bg-background shadow-xs text-primary font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Package className="w-3.5 h-3.5 mr-1" />
              <span>Products ({productsTotal})</span>
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={activeTab === "products" ? "Search title, shop, category..." : "Search shop, name, phone..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 text-sm rounded-xl"
            />
          </div>
        </div>

        {/* ── Content View: Products Catalog OR Stores List ── */}
        {activeTab === "products" ? (
          isLoading ? (
            <div className="bg-card p-12 rounded-2xl border border-border text-center space-y-3">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="text-sm text-muted-foreground font-medium">Loading marketplace products...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="bg-card p-16 rounded-2xl border border-border text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mx-auto text-muted-foreground">
                <Package className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold">No Products Found</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                {searchQuery
                  ? `No products matching "${searchQuery}". Try searching by another keyword.`
                  : "No products currently listed on the marketplace."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                <span>
                  Showing <strong className="text-foreground">{filteredProducts.length}</strong> product{filteredProducts.length === 1 ? "" : "s"}
                </span>
                <span>Marketplace Catalog</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {filteredProducts.map((product) => {
                  const img = product.image_urls?.[0];
                  const isActive = product.is_active !== false;

                  return (
                    <div
                      key={product.id}
                      className="bg-card rounded-2xl border border-border overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col group"
                    >
                      {/* Product Thumbnail */}
                      <div className="relative aspect-square w-full bg-secondary/40 overflow-hidden flex items-center justify-center">
                        {img ? (
                          <img
                            src={img}
                            alt={product.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="text-muted-foreground flex flex-col items-center space-y-1">
                            <Package className="w-8 h-8 opacity-40" />
                            <span className="text-xs">No image</span>
                          </div>
                        )}

                        {/* Status Badges on Image */}
                        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 z-10">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-md shadow-xs ${
                              isActive
                                ? "bg-emerald-500/90 text-white"
                                : "bg-neutral-800/80 text-neutral-300"
                            }`}
                          >
                            {isActive ? "Live in Shop" : "Hidden"}
                          </span>
                          {product.category && (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-background/90 text-foreground backdrop-blur-md shadow-xs">
                              {product.category}
                            </span>
                          )}
                        </div>

                        <div className="absolute top-2.5 right-2.5 z-10">
                          <Link href={`/product/${product.id}`} target="_blank">
                            <Button
                              size="icon"
                              variant="secondary"
                              className="h-7 w-7 rounded-full shadow-md bg-background/90 hover:bg-background"
                              title="View product live"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Button>
                          </Link>
                        </div>
                      </div>

                      {/* Product Details */}
                      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                        <div className="space-y-1.5">
                          <div className="flex items-center space-x-1.5 text-xs text-muted-foreground">
                            <Store className="w-3.5 h-3.5" />
                            <span className="font-semibold text-foreground truncate">
                              {product.stores?.shop_name || "Independent Seller"}
                            </span>
                          </div>

                          <h4 className="font-bold text-sm tracking-tight text-foreground line-clamp-2" title={product.title}>
                            {product.title}
                          </h4>

                          <div className="flex items-baseline space-x-2 pt-1">
                            <span className="text-lg font-extrabold text-foreground">₹{product.price}</span>
                            {product.stock !== undefined && product.stock !== null && (
                              <span className="text-xs text-muted-foreground">
                                ({product.stock} in stock)
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Controller Action Buttons */}
                        <div className="pt-2 border-t border-border flex items-center justify-between gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleToggleProductActive(product.id, product.is_active)}
                            disabled={productActionInProgress === product.id}
                            className="flex-1 text-xs h-8 font-medium rounded-lg"
                            title={isActive ? "Hide from marketplace" : "Make live on marketplace"}
                          >
                            {isActive ? (
                              <>
                                <EyeOff className="w-3.5 h-3.5 mr-1 text-amber-600" />
                                Hide
                              </>
                            ) : (
                              <>
                                <Eye className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                                Unhide
                              </>
                            )}
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteProduct(product.id, product.title)}
                            disabled={productActionInProgress === product.id}
                            className="text-xs h-8 text-destructive hover:bg-destructive/10 hover:text-destructive rounded-lg px-2.5"
                            title="Delete from Marketplace"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>

                          <Link href={`/product/${product.id}`} target="_blank" className="flex-1">
                            <Button size="sm" className="w-full text-xs h-8 rounded-lg font-medium">
                              <Eye className="w-3.5 h-3.5 mr-1" />
                              View
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )
        ) : (
          /* ── Applications / Stores List ── */
          isLoading ? (
            <div className="bg-card p-12 rounded-2xl border border-border text-center space-y-3">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="text-sm text-muted-foreground font-medium">Loading seller applications...</p>
            </div>
          ) : filteredStores.length === 0 ? (
            <div className="bg-card p-16 rounded-2xl border border-border text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mx-auto text-muted-foreground">
                {activeTab === "pending" ? <Clock className="w-6 h-6" /> : <Store className="w-6 h-6" />}
              </div>
              <h3 className="text-lg font-bold">
                {activeTab === "pending"
                  ? "No Pending Applications"
                  : activeTab === "approved"
                  ? "No Approved Sellers Found"
                  : "No Rejected Applications"}
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                {activeTab === "pending"
                  ? "All seller requests have been processed. New accounts will appear here automatically."
                  : "No matching stores found for your current filter."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredStores.map((store) => {
                const sellerName = store.meta.seller_name || store.profiles?.full_name || "New Seller";
                const email = store.meta.seller_email || store.profiles?.email || "No email";
                const contact = store.meta.contact_number || store.meta.phone || store.meta.whatsapp || "No phone";
                const dateApplied = store.meta.applied_at || store.created_at;
                const formattedDate = dateApplied ? new Date(dateApplied).toLocaleString() : "Recently";
                const cleanPhone = cleanPhoneForWhatsApp(contact);

                return (
                  <div
                    key={store.id}
                    className="bg-card rounded-2xl border border-border p-6 shadow-xs hover:shadow-md transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-6"
                  >
                    {/* Left: Info */}
                    <div className="space-y-3 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-xl font-bold tracking-tight text-foreground truncate">{store.shop_name}</h3>
                        {store.meta.approval_status === "pending" && (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                            <Clock className="w-3 h-3 animate-pulse" />
                            <span>Pending Verification</span>
                          </span>
                        )}
                        {store.meta.approval_status === "approved" && (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Verified & Active</span>
                          </span>
                        )}
                        {store.meta.approval_status === "rejected" && (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-500/10 text-red-700 dark:text-red-300 border border-red-500/30">
                            <XCircle className="w-3 h-3" />
                            <span>Rejected</span>
                          </span>
                        )}
                      </div>

                      {/* Metadata Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-2 gap-x-6 text-sm text-muted-foreground">
                        <div className="flex items-center space-x-2">
                          <User className="w-4 h-4 text-foreground/60 shrink-0" />
                          <span className="truncate">
                            Seller: <strong className="text-foreground">{sellerName}</strong>
                          </span>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span className="truncate">
                            Phone: <strong className="text-foreground">{contact}</strong>
                          </span>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Mail className="w-4 h-4 text-foreground/60 shrink-0" />
                          <span className="truncate">{email}</span>
                        </div>

                        <div className="flex items-center space-x-2 text-xs">
                          <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span>Applied: {formattedDate}</span>
                        </div>

                        {store.meta.location && (
                          <div className="flex items-center space-x-2 text-xs">
                            <span>Location: {store.meta.location}</span>
                          </div>
                        )}

                        {store.meta.subscription_plan && (
                          <div className="flex items-center space-x-1.5 text-xs">
                            <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20 font-bold">
                              💎 {store.meta.subscription_plan}
                            </span>
                          </div>
                        )}

                        {store.meta.payment_utr && (
                          <div className="flex items-center space-x-1.5 text-xs text-muted-foreground">
                            <span>UTR: <code className="text-foreground font-mono bg-secondary px-1.5 py-0.5 rounded">{store.meta.payment_utr}</code></span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex flex-wrap items-center gap-2.5 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-border">
                      {/* Direct WhatsApp Contact Button */}
                      {cleanPhone && (
                        <a
                          href={`https://wa.me/${cleanPhone}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 border border-emerald-500/30 transition-colors"
                          title="Chat on WhatsApp"
                        >
                          <MessageSquare className="w-4 h-4 text-emerald-600" />
                          <span>WhatsApp</span>
                        </a>
                      )}

                      {/* View Payment Receipt Button */}
                      {store.meta.payment_receipt_url && (
                        <button
                          type="button"
                          onClick={() => setReceiptModal(store)}
                          className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-purple-500/10 text-purple-700 dark:text-purple-300 hover:bg-purple-500/20 border border-purple-500/30 transition-colors cursor-pointer"
                          title="View Payment Receipt"
                        >
                          <FileText className="w-3.5 h-3.5 text-purple-600" />
                          <span>Receipt (₹39)</span>
                        </button>
                      )}

                      {/* View Public Storefront */}
                      <Link
                        href={`/store/${store.id}`}
                        target="_blank"
                        className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-secondary hover:bg-secondary/80 text-foreground transition-colors border border-border"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>View Shop</span>
                      </Link>

                      {/* PENDING ACTIONS */}
                      {store.meta.approval_status === "pending" && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleApproveStore(store)}
                            disabled={actionInProgress === store.id}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs"
                          >
                            <CheckCircle2 className="w-4 h-4 mr-1.5" />
                            Accept & Approve
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRejectStore(store)}
                            disabled={actionInProgress === store.id}
                            className="text-destructive hover:bg-destructive/10 border-destructive/30 font-semibold text-xs rounded-xl"
                          >
                            <XCircle className="w-4 h-4 mr-1.5" />
                            Reject
                          </Button>
                        </>
                      )}

                      {/* APPROVED ACTIONS */}
                      {store.meta.approval_status === "approved" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRejectStore(store)}
                          disabled={actionInProgress === store.id}
                          className="text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        >
                          Revoke / Suspend
                        </Button>
                      )}

                      {/* REJECTED ACTIONS */}
                      {store.meta.approval_status === "rejected" && (
                        <Button
                          size="sm"
                          onClick={() => handleApproveStore(store)}
                          disabled={actionInProgress === store.id}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl"
                        >
                          <RotateCcw className="w-4 h-4 mr-1.5" />
                          Re-Approve
                        </Button>
                      )}

                      {/* DELETE STORE ACTION */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDeleteStoreModal(store)}
                        disabled={actionInProgress === store.id}
                        className="text-xs text-destructive hover:bg-destructive/10 border-destructive/30 hover:border-destructive font-medium rounded-xl transition-colors"
                        title="Delete Store"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </main>

      {/* ── WhatsApp Notification Modal ── */}
      {whatsAppModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-lg rounded-2xl border border-border p-6 md:p-8 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center space-x-2">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center ${
                    whatsAppModal.type === "approved"
                      ? "bg-emerald-500/10 text-emerald-600"
                      : "bg-red-500/10 text-red-600"
                  }`}
                >
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base">
                    {whatsAppModal.type === "approved" ? "Send Approval WhatsApp Message" : "Send Rejection Notification"}
                  </h3>
                  <p className="text-xs text-muted-foreground">To: {whatsAppModal.sellerName} ({whatsAppModal.phone})</p>
                </div>
              </div>
              <button
                onClick={() => setWhatsAppModal(null)}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Pre-written WhatsApp Message:
              </label>
              <textarea
                value={whatsAppModal.message}
                onChange={(e) => setWhatsAppModal({ ...whatsAppModal, message: e.target.value })}
                rows={9}
                className="w-full text-xs font-mono p-3 rounded-xl border border-border bg-secondary/40 focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed resize-none"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1 text-xs"
                onClick={() => {
                  navigator.clipboard.writeText(whatsAppModal.message);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
              >
                {copied ? <Check className="w-4 h-4 mr-1.5 text-emerald-600" /> : <Copy className="w-4 h-4 mr-1.5" />}
                {copied ? "Copied!" : "Copy Text"}
              </Button>

              <a
                href={`https://wa.me/${cleanPhoneForWhatsApp(whatsAppModal.phone)}?text=${encodeURIComponent(
                  whatsAppModal.message
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1"
                onClick={() => setWhatsAppModal(null)}
              >
                <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs">
                  <MessageSquare className="w-4 h-4 mr-1.5" />
                  Send on WhatsApp
                </Button>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Store Confirmation Modal ── */}
      {deleteStoreModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-2xl border border-destructive/30 p-6 md:p-8 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center space-x-3 pb-3 border-b border-border">
              <div className="w-10 h-10 rounded-full bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-foreground">Delete Store?</h3>
                <p className="text-xs text-muted-foreground">Permanent deletion confirmation</p>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <p className="text-foreground leading-relaxed">
                Are you sure you want to permanently delete <strong className="text-foreground font-semibold">{deleteStoreModal.shop_name}</strong>?
              </p>

              <div className="bg-secondary/60 p-3.5 rounded-xl border border-border text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Seller:</span>
                  <span className="font-medium text-foreground">
                    {deleteStoreModal.meta.seller_name || deleteStoreModal.profiles?.full_name || "Unknown"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email:</span>
                  <span className="font-medium text-foreground">
                    {deleteStoreModal.meta.seller_email || deleteStoreModal.profiles?.email || "No email"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <span className="font-medium capitalize text-foreground">
                    {deleteStoreModal.meta.approval_status || "pending"}
                  </span>
                </div>
              </div>

              <p className="text-xs text-destructive font-medium bg-destructive/10 p-2.5 rounded-lg border border-destructive/20">
                ⚠️ Warning: This will permanently remove the store and its associated products from the marketplace. This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setDeleteStoreModal(null)}
                disabled={isDeletingStore}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold border border-border bg-secondary hover:bg-secondary/80 text-foreground transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteStore}
                disabled={isDeletingStore}
                className="inline-flex items-center justify-center space-x-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:opacity-50 transition-colors shadow-md cursor-pointer"
              >
                {isDeletingStore ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Deleting Store...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                    Yes, Delete Store
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── View Payment Receipt Modal ── */}
      {receiptModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-lg rounded-2xl border border-border p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-purple-500/10 text-purple-600 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Payment Receipt (₹39)</h3>
                  <p className="text-xs text-muted-foreground">
                    {receiptModal.shop_name} • {receiptModal.meta.seller_name || receiptModal.profiles?.full_name || "Seller"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setReceiptModal(null)}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between p-2.5 rounded-lg bg-secondary/50">
                <span className="text-muted-foreground">Plan:</span>
                <span className="font-bold text-foreground">{receiptModal.meta.subscription_plan || "₹39 - 3 Months"}</span>
              </div>
              {receiptModal.meta.payment_utr && (
                <div className="flex justify-between p-2.5 rounded-lg bg-secondary/50">
                  <span className="text-muted-foreground">Transaction UTR:</span>
                  <span className="font-mono font-bold text-foreground">{receiptModal.meta.payment_utr}</span>
                </div>
              )}
            </div>

            {/* Receipt Image Container */}
            <div className="max-h-[380px] overflow-auto rounded-xl border border-border bg-black/5 p-2 flex items-center justify-center">
              <img
                src={receiptModal.meta.payment_receipt_url}
                alt="Payment Receipt"
                className="max-h-[360px] w-auto object-contain rounded-lg shadow-sm"
              />
            </div>

            <div className="flex justify-end pt-2 border-t border-border/60">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setReceiptModal(null)}
                className="text-xs rounded-xl"
              >
                Close Receipt
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
