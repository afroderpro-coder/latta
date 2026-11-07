"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase/client";
import { parseStoreBio, serializeStoreBio, StoreMetadata, StoreOrder } from "@/utils/storeMetadata";
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
  PackageCheck,
  Trash2,
  Eye,
  EyeOff,
  Tag,
  FileText,
  CreditCard,
  ShoppingBag,
  Truck,
  Calendar,
  MapPin,
  MessageCircle,
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

interface AdminOrderRecord extends StoreOrder {
  storeId: string;
  storeName: string;
  sellerId?: string;
  sellerName?: string;
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
  const [ordersList, setOrdersList] = useState<AdminOrderRecord[]>([]);
  const [orderFilterStatus, setOrderFilterStatus] = useState<string>("all");
  const [orderPaymentFilter, setOrderPaymentFilter] = useState<"all" | "razorpay" | "whatsapp">("all");
  const [orderViewTab, setOrderViewTab] = useState<"active" | "completed" | "cancelled" | "all">("all");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadingStores, setLoadingStores] = useState<boolean>(true);
  const [loadingProducts, setLoadingProducts] = useState<boolean>(true);
  const [loadingOrders, setLoadingOrders] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<"pending" | "approved" | "rejected" | "products" | "orders">("pending");
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
    setLoadingStores(true);
    setLoadingProducts(true);
    setLoadingOrders(true);

    // 1. Independent Task: Fetch all products with store relation
    const productsTask = (async () => {
      try {
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
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingProducts(false);
      }
    })();

    // 2. Independent Task: Fetch stores from server API
    const storesTask = (async () => {
      try {
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

        if (storesData) {
          let deletedStoreIds: string[] = [];
          try {
            deletedStoreIds = JSON.parse(localStorage.getItem("afroder_deleted_store_ids") || "[]");
          } catch {
            deletedStoreIds = [];
          }

          const sellersWithRealStore = new Set(
            storesData.filter((s) => s.bio && s.bio.trim() !== "").map((s) => s.seller_id)
          );

          const enriched: SellerStoreRecord[] = storesData
            .filter((store) => {
              if (deletedStoreIds.includes(store.id)) return false;
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

          // Initial fallback orders from bio if ordersTask hasn't finished yet
          const allOrders: AdminOrderRecord[] = [];
          enriched.forEach((store) => {
            if (store.meta?.orders && Array.isArray(store.meta.orders)) {
              store.meta.orders.forEach((order) => {
                allOrders.push({
                  ...order,
                  storeId: store.id,
                  storeName: store.shop_name || "AFRODER Partner Store",
                  sellerId: store.seller_id,
                  sellerName: store.meta.seller_name || store.profiles?.full_name || "Merchant",
                });
              });
            }
          });
          allOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          setOrdersList((prev) => (prev.length > 0 ? prev : allOrders));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingStores(false);
      }
    })();

    // 3. Independent Task: Fetch orders from server API
    const ordersTask = (async () => {
      try {
        const ordRes = await fetch("/api/admin/orders");
        const ordJson = await ordRes.json();
        if (ordJson.success && Array.isArray(ordJson.orders) && ordJson.orders.length > 0) {
          setOrdersList(ordJson.orders);
        }
      } catch (e) {
        console.warn("Could not fetch server admin orders:", e);
      } finally {
        setLoadingOrders(false);
      }
    })();

    await Promise.allSettled([productsTask, storesTask, ordersTask]);
    setIsLoading(false);
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
🔗 *Login:* https://afroder.shop/auth?role=seller&mode=signin

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

  // ── Order Management Handlers ──
  const updateAdminOrder = async ({
    orderId,
    storeId,
    newStatus,
    estimatedDelivery,
    courierName,
    trackingNumber,
  }: {
    orderId: string;
    storeId: string;
    newStatus?: StoreOrder["status"];
    estimatedDelivery?: string;
    courierName?: string;
    trackingNumber?: string;
  }) => {
    try {
      setActionInProgress(`order_${orderId}`);

      const res = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          storeId,
          status: newStatus,
          estimatedDelivery,
          courierName,
          trackingNumber,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update order");
      }

      setOrdersList((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? {
                ...o,
                ...(newStatus ? { status: newStatus } : {}),
                ...(estimatedDelivery !== undefined ? { estimated_delivery: estimatedDelivery } : {}),
                ...(courierName !== undefined ? { courier_name: courierName } : {}),
                ...(trackingNumber !== undefined ? { tracking_number: trackingNumber } : {}),
                ...(newStatus === "delivered" ? { completed_at: new Date().toISOString() } : {}),
              }
            : o
        )
      );
    } catch (err: any) {
      alert("Failed to update order: " + (err.message || "Please try again"));
    } finally {
      setActionInProgress(null);
    }
  };

  // Filter stores by tab & search query
  const pendingStores = stores.filter((s) => s.meta.approval_status === "pending");
  const approvedStores = stores.filter((s) => s.meta.approval_status === "approved" || !s.meta.approval_status);
  const rejectedStores = stores.filter((s) => s.meta.approval_status === "rejected");

  const totalRevenue = ordersList.reduce((acc, o) => acc + (o.total_amount || 0), 0);
  const razorpayOrdersCount = ordersList.filter((o) => o.payment_method === "razorpay").length;
  const whatsappOrdersCount = ordersList.filter((o) => o.payment_method === "whatsapp" || !o.payment_method).length;
  const activeOrdersCount = ordersList.filter((o) => o.status !== "delivered" && o.status !== "cancelled").length;
  const completedOrdersCount = ordersList.filter((o) => o.status === "delivered").length;
  const cancelledOrdersCount = ordersList.filter((o) => o.status === "cancelled").length;

  const filteredOrders = ordersList.filter((o) => {
    // 1. If a specific status filter is chosen (e.g. Cancelled, Shipped), that takes precedence
    if (orderFilterStatus !== "all") {
      if (o.status !== orderFilterStatus) return false;
    } else {
      // 2. Otherwise respect top-level view tab
      if (orderViewTab === "active" && (o.status === "delivered" || o.status === "cancelled")) {
        return false;
      }
      if (orderViewTab === "completed" && o.status !== "delivered") {
        return false;
      }
      if (orderViewTab === "cancelled" && o.status !== "cancelled") {
        return false;
      }
    }

    // 3. Payment filter
    if (orderPaymentFilter === "razorpay" && o.payment_method !== "razorpay") return false;
    if (orderPaymentFilter === "whatsapp" && o.payment_method === "razorpay") return false;

    // 4. Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const idMatch = (o.id || "").toLowerCase().includes(q);
      const nameMatch = (o.customer_name || "").toLowerCase().includes(q);
      const phoneMatch = (o.customer_phone || "").toLowerCase().includes(q);
      const storeMatch = (o.storeName || "").toLowerCase().includes(q);
      const payIdMatch = (o.payment_id || "").toLowerCase().includes(q);
      return idMatch || nameMatch || phoneMatch || storeMatch || payIdMatch;
    }

    return true;
  });

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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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
            {loadingStores ? (
              <div className="flex items-center gap-1.5 py-1">
                <RefreshCw className="w-5 h-5 animate-spin text-amber-500" />
              </div>
            ) : (
              <div className="text-3xl font-bold tracking-tight text-foreground">{pendingStores.length}</div>
            )}
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
            {loadingStores ? (
              <div className="flex items-center gap-1.5 py-1">
                <RefreshCw className="w-5 h-5 animate-spin text-emerald-500" />
              </div>
            ) : (
              <div className="text-3xl font-bold tracking-tight text-foreground">{approvedStores.length}</div>
            )}
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
            {loadingStores ? (
              <div className="flex items-center gap-1.5 py-1">
                <RefreshCw className="w-5 h-5 animate-spin text-red-500" />
              </div>
            ) : (
              <div className="text-3xl font-bold tracking-tight text-foreground">{rejectedStores.length}</div>
            )}
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
            {loadingProducts ? (
              <div className="flex items-center gap-1.5 py-1">
                <RefreshCw className="w-5 h-5 animate-spin text-primary" />
              </div>
            ) : (
              <div className="text-3xl font-bold tracking-tight text-foreground">{productsTotal}</div>
            )}
            <p className="text-xs text-primary font-medium mt-1">Click to View & Manage Catalog</p>
          </div>

          {/* Customer Orders */}
          <div
            onClick={() => setActiveTab("orders")}
            className={`p-5 rounded-2xl border transition-all cursor-pointer ${
              activeTab === "orders"
                ? "bg-purple-500/10 border-purple-500/40 ring-2 ring-purple-500/20 shadow-md"
                : "bg-card border-border hover:border-purple-500/30"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Live Orders</span>
              <div className="w-8 h-8 rounded-full bg-purple-500/15 flex items-center justify-center text-purple-600">
                <ShoppingBag className="w-4 h-4" />
              </div>
            </div>
            {loadingOrders ? (
              <div className="flex items-center gap-1.5 py-1">
                <RefreshCw className="w-5 h-5 animate-spin text-purple-500" />
              </div>
            ) : (
              <div className="text-3xl font-bold tracking-tight text-foreground">{ordersList.length}</div>
            )}
            <p className="text-xs text-purple-600 dark:text-purple-400 font-medium mt-1">
              ₹{totalRevenue.toLocaleString()} Total Sales ({razorpayOrdersCount} Online)
            </p>
          </div>
        </div>

        {/* ── Main Section Header & Search ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-6 rounded-2xl border border-border shadow-xs">
          {/* Navigation Tabs */}
          <div className="flex p-1 bg-secondary/60 rounded-xl border border-border max-w-2xl w-full overflow-x-auto">
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
            <button
              onClick={() => setActiveTab("orders")}
              className={`flex-1 py-2 px-3 text-xs md:text-sm font-semibold rounded-lg transition-all flex items-center justify-center space-x-1.5 whitespace-nowrap ${
                activeTab === "orders"
                  ? "bg-background shadow-xs text-purple-600 dark:text-purple-400 font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5 mr-1" />
              <span>Orders ({ordersList.length})</span>
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={
                activeTab === "products"
                  ? "Search title, shop, category..."
                  : activeTab === "orders"
                  ? "Search order ID, buyer, phone, shop..."
                  : "Search shop, name, phone..."
              }
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
        ) : activeTab === "orders" ? (
          /* ── Customer Orders Management View ── */
          isLoading ? (
            <div className="bg-card p-12 rounded-2xl border border-border text-center space-y-3">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="text-sm text-muted-foreground font-medium">Loading customer orders...</p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Lifecycle Sub-Tabs: Active Orders vs Completed Orders */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-4 rounded-2xl border border-border shadow-xs">
                <div className="flex p-1 bg-secondary/80 rounded-xl border border-border w-full sm:w-auto overflow-x-auto scrollbar-none">
                  <button
                    onClick={() => {
                      setOrderViewTab("all");
                      setOrderFilterStatus("all");
                    }}
                    className={`flex-1 sm:flex-none py-2 px-3.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
                      orderViewTab === "all" && orderFilterStatus === "all"
                        ? "bg-background shadow-xs text-foreground font-bold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span>All Orders ({ordersList.length})</span>
                  </button>

                  <button
                    onClick={() => {
                      setOrderViewTab("active");
                      setOrderFilterStatus("all");
                    }}
                    className={`flex-1 sm:flex-none py-2 px-3.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
                      orderViewTab === "active"
                        ? "bg-background shadow-xs text-amber-600 font-bold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    <span>Active Orders ({activeOrdersCount})</span>
                  </button>

                  <button
                    onClick={() => {
                      setOrderViewTab("completed");
                      setOrderFilterStatus("all");
                    }}
                    className={`flex-1 sm:flex-none py-2 px-3.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
                      orderViewTab === "completed"
                        ? "bg-background shadow-xs text-emerald-600 font-bold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Completed ({completedOrdersCount})</span>
                  </button>

                  <button
                    onClick={() => {
                      setOrderViewTab("cancelled");
                      setOrderFilterStatus("all");
                    }}
                    className={`flex-1 sm:flex-none py-2 px-3.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
                      orderViewTab === "cancelled"
                        ? "bg-background shadow-xs text-red-600 font-bold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <XCircle className="w-3.5 h-3.5 text-red-500" />
                    <span>Cancelled Orders ({cancelledOrdersCount})</span>
                  </button>
                </div>

                <div className="text-xs text-muted-foreground">
                  {orderViewTab === "active" && (
                    <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                      <Truck className="w-3.5 h-3.5" /> Showing active orders being processed & dispatched
                    </span>
                  )}
                  {orderViewTab === "completed" && (
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Successfully delivered and archived orders
                    </span>
                  )}
                  {orderViewTab === "cancelled" && (
                    <span className="flex items-center gap-1 text-red-600 dark:text-red-400 font-medium">
                      <XCircle className="w-3.5 h-3.5" /> Showing cancelled customer orders
                    </span>
                  )}
                  {orderViewTab === "all" && (
                    <span>Complete order history across all sellers ({ordersList.length} total)</span>
                  )}
                </div>
              </div>

              {/* Filter Pills Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-secondary/30 p-3 rounded-2xl border border-border">
                {/* Payment Filter */}
                <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
                  <span className="text-muted-foreground font-semibold px-2">Payment:</span>
                  <button
                    onClick={() => setOrderPaymentFilter("all")}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                      orderPaymentFilter === "all"
                        ? "bg-foreground text-background shadow-xs"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    All ({ordersList.length})
                  </button>
                  <button
                    onClick={() => setOrderPaymentFilter("razorpay")}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                      orderPaymentFilter === "razorpay"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <CreditCard className="w-3 h-3" />
                    <span>Razorpay Online ({razorpayOrdersCount})</span>
                  </button>
                  <button
                    onClick={() => setOrderPaymentFilter("whatsapp")}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                      orderPaymentFilter === "whatsapp"
                        ? "bg-[#25D366] text-white shadow-xs"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <MessageCircle className="w-3 h-3" />
                    <span>WhatsApp / COD ({whatsappOrdersCount})</span>
                  </button>
                </div>

                {/* Status Filter */}
                <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
                  <span className="text-muted-foreground font-semibold px-2">Status:</span>
                  {[
                    { id: "all", label: `All (${ordersList.length})` },
                    { id: "pending", label: `Placed (${ordersList.filter((o) => o.status === "pending" || !o.status).length})` },
                    { id: "processing", label: `Packed (${ordersList.filter((o) => o.status === "processing").length})` },
                    { id: "shipped", label: `Shipped (${ordersList.filter((o) => o.status === "shipped").length})` },
                    { id: "out_for_delivery", label: `Out for Delivery (${ordersList.filter((o) => o.status === "out_for_delivery").length})` },
                    { id: "delivered", label: `Delivered (${ordersList.filter((o) => o.status === "delivered").length})` },
                    { id: "cancelled", label: `Cancelled (${cancelledOrdersCount})` },
                  ].map((st) => (
                    <button
                      key={st.id}
                      onClick={() => {
                        setOrderFilterStatus(st.id);
                        if (st.id === "cancelled") {
                          setOrderViewTab("cancelled");
                        } else if (st.id === "delivered") {
                          setOrderViewTab("completed");
                        } else if (st.id === "all") {
                          setOrderViewTab("all");
                        } else {
                          setOrderViewTab("active");
                        }
                      }}
                      className={`px-2.5 py-1 rounded-lg font-medium capitalize transition-all cursor-pointer whitespace-nowrap ${
                        orderFilterStatus === st.id
                          ? "bg-primary text-primary-foreground font-bold shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Orders List */}
              {filteredOrders.length === 0 ? (
                <div className="bg-card p-16 rounded-2xl border border-border text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mx-auto text-muted-foreground">
                    <ShoppingBag className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold">No Orders Found</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    {searchQuery
                      ? `No orders matching "${searchQuery}". Try searching by customer name, phone, or order ID.`
                      : "When customers place orders via Razorpay or WhatsApp, they will appear here in real time."}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                    <span>
                      Showing <strong className="text-foreground">{filteredOrders.length}</strong> order{filteredOrders.length === 1 ? "" : "s"}
                    </span>
                    <span>Total Value: <strong className="text-foreground font-mono">₹{filteredOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0).toFixed(2)}</strong></span>
                  </div>

                  {filteredOrders.map((order) => {
                    const isRazorpay = order.payment_method === "razorpay";
                    const cleanPhone = order.customer_phone ? order.customer_phone.replace(/[^0-9]/g, "") : "";
                    const waLink = cleanPhone ? `https://wa.me/${cleanPhone.length === 10 ? "91" + cleanPhone : cleanPhone}` : null;
                    const callLink = cleanPhone ? `tel:${cleanPhone}` : null;
                    const isUpdating = actionInProgress === `order_${order.id}`;

                    return (
                      <div
                        key={`${order.storeId}_${order.id}`}
                        className="bg-card rounded-2xl border border-border p-5 md:p-6 shadow-xs hover:shadow-md transition-all space-y-4"
                      >
                        {/* Order Header */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="font-mono font-bold text-foreground text-sm">
                              #{order.id}
                            </span>
                            <span className="text-muted-foreground">•</span>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {new Date(order.created_at).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>

                            {/* Payment Method Badge */}
                            {isRazorpay ? (
                              <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1.5">
                                <CreditCard className="w-3.5 h-3.5" />
                                <span>Razorpay (PAID)</span>
                                {order.payment_id && (
                                  <span className="font-mono text-[10px] opacity-75">
                                    • {order.payment_id}
                                  </span>
                                )}
                              </span>
                            ) : (
                              <span className="bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/30 px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1.5">
                                <MessageCircle className="w-3.5 h-3.5" />
                                <span>WhatsApp / COD</span>
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3">
                            {/* Status Selector */}
                            <div className="flex items-center gap-1.5">
                              <select
                                value={order.status || "pending"}
                                onChange={(e) =>
                                  updateAdminOrder({
                                    orderId: order.id,
                                    storeId: order.storeId,
                                    newStatus: e.target.value as any,
                                  })
                                }
                                disabled={isUpdating}
                                className="text-xs font-semibold bg-secondary/80 hover:bg-secondary border border-border rounded-lg px-2.5 py-1.5 text-foreground cursor-pointer transition-colors focus:outline-none focus:ring-1 focus:ring-primary"
                              >
                                <option value="pending">Status: Placed (Pending)</option>
                                <option value="processing">Status: Packed (Processing)</option>
                                <option value="shipped">Status: Shipped</option>
                                <option value="out_for_delivery">Status: Out for Delivery</option>
                                <option value="delivered">Status: Delivered (Completed)</option>
                                <option value="cancelled">Status: Cancelled</option>
                              </select>
                              {isUpdating && <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary" />}
                            </div>

                            {/* Total Amount */}
                            <span className="text-lg font-extrabold text-foreground font-mono">
                              ₹{order.total_amount?.toFixed(2)}
                            </span>
                          </div>
                        </div>

                        {/* Web Controller Logistics & Quick Action Controls */}
                        <div className="bg-secondary/40 border border-border rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-muted-foreground">Logistics Status:</span>
                            {order.status === "pending" && (
                              <span className="bg-amber-500/10 text-amber-600 border border-amber-500/30 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                                <Clock className="w-3 h-3" /> Placed (New)
                              </span>
                            )}
                            {order.status === "processing" && (
                              <span className="bg-blue-500/10 text-blue-600 border border-blue-500/30 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                                <PackageCheck className="w-3 h-3" /> Packed by Seller
                              </span>
                            )}
                            {order.status === "shipped" && (
                              <span className="bg-purple-500/10 text-purple-600 border border-purple-500/30 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                                <Truck className="w-3 h-3" /> Shipped by Seller
                              </span>
                            )}
                            {order.status === "out_for_delivery" && (
                              <span className="bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/40 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 animate-pulse">
                                <Truck className="w-3 h-3" /> Out for Delivery
                              </span>
                            )}
                            {order.status === "delivered" && (
                              <span className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Delivered
                              </span>
                            )}
                            {order.status === "cancelled" && (
                              <span className="bg-red-500/10 text-red-600 border border-red-500/30 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                                <XCircle className="w-3 h-3" /> Cancelled
                              </span>
                            )}
                          </div>

                          {/* Quick 1-Click Action Buttons for Web Controller */}
                          <div className="flex items-center gap-2 flex-wrap">
                            {order.status !== "out_for_delivery" && order.status !== "delivered" && order.status !== "cancelled" && (
                              <Button
                                size="sm"
                                disabled={isUpdating}
                                onClick={() =>
                                  updateAdminOrder({
                                    orderId: order.id,
                                    storeId: order.storeId,
                                    newStatus: "out_for_delivery",
                                  })
                                }
                                className="text-xs h-7.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                              >
                                <Truck className="w-3.5 h-3.5" />
                                <span>Mark Out for Delivery</span>
                              </Button>
                            )}

                            {order.status !== "delivered" && order.status !== "cancelled" && (
                              <Button
                                size="sm"
                                disabled={isUpdating}
                                onClick={() =>
                                  updateAdminOrder({
                                    orderId: order.id,
                                    storeId: order.storeId,
                                    newStatus: "delivered",
                                  })
                                }
                                className="text-xs h-7.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Mark Delivered</span>
                              </Button>
                            )}

                            {order.status === "cancelled" && (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={isUpdating}
                                onClick={() =>
                                  updateAdminOrder({
                                    orderId: order.id,
                                    storeId: order.storeId,
                                    newStatus: "pending",
                                  })
                                }
                                className="text-xs h-7.5 border-border hover:bg-secondary text-foreground font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                              >
                                <RotateCcw className="w-3.5 h-3.5 text-primary" />
                                <span>Reopen / Restore Order</span>
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Customer & Merchant Metadata Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-secondary/30 border border-border text-xs sm:text-sm">
                          {/* Buyer Info */}
                          <div className="space-y-1.5">
                            <div className="font-semibold text-foreground flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-primary" />
                              <span>{order.customer_name}</span>
                            </div>
                            <div className="text-muted-foreground flex items-center gap-2 flex-wrap">
                              <Phone className="w-3 h-3" />
                              <span>{order.customer_phone}</span>
                              {waLink && (
                                <a
                                  href={waLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[#25D366] hover:underline flex items-center gap-0.5 text-xs font-bold ml-1"
                                  title="Chat with buyer on WhatsApp"
                                >
                                  <MessageCircle className="w-3 h-3" /> WhatsApp
                                </a>
                              )}
                              {callLink && (
                                <a
                                  href={callLink}
                                  className="text-primary hover:underline text-xs font-bold ml-1"
                                >
                                  Call
                                </a>
                              )}
                            </div>
                            {order.delivery_address && (
                              <div className="text-muted-foreground flex items-start gap-1.5 pt-0.5">
                                <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 text-muted-foreground" />
                                <span className="text-xs leading-relaxed">{order.delivery_address}</span>
                              </div>
                            )}
                            {order.customer_notes && (
                              <p className="text-xs text-muted-foreground italic pt-1">
                                Note: &quot;{order.customer_notes}&quot;
                              </p>
                            )}
                          </div>

                          {/* Store / Merchant Info */}
                          <div className="space-y-1.5 border-t md:border-t-0 md:border-l border-border md:pl-4 pt-2 md:pt-0">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                              Fulfilled By Store
                            </span>
                            <div className="font-semibold text-foreground flex items-center gap-1.5">
                              <Store className="w-3.5 h-3.5 text-primary" />
                              <span>{order.storeName}</span>
                            </div>
                            {order.sellerName && (
                              <p className="text-xs text-muted-foreground">
                                Merchant: <span className="text-foreground font-medium">{order.sellerName}</span>
                              </p>
                            )}
                            <div className="pt-1">
                              <Link href={`/store/${order.storeId}`} target="_blank">
                                <span className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                                  <span>View Storefront</span>
                                  <ExternalLink className="w-3 h-3" />
                                </span>
                              </Link>
                            </div>
                          </div>
                        </div>

                        {/* Delivery Schedule & Tracking Controller */}
                        <div className="p-3.5 rounded-xl bg-secondary/30 border border-border flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-foreground flex items-center gap-1.5">
                              <Truck className="w-3.5 h-3.5 text-primary" />
                              <span>Manage Delivery Date:</span>
                            </span>
                            <input
                              type="date"
                              value={order.estimated_delivery ? order.estimated_delivery.split("T")[0] : ""}
                              onChange={(e) => {
                                updateAdminOrder({
                                  orderId: order.id,
                                  storeId: order.storeId,
                                  estimatedDelivery: e.target.value,
                                });
                              }}
                              disabled={isUpdating}
                              className="bg-background border border-border rounded-lg px-2.5 py-1 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                              title="Set delivery date visible to customer"
                            />
                            {order.estimated_delivery && (
                              <span className="text-[11px] text-muted-foreground font-medium">
                                (Arrives {new Date(order.estimated_delivery).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })})
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
                            <input
                              type="text"
                              placeholder="Courier (e.g. Delhivery)"
                              defaultValue={order.courier_name || ""}
                              onBlur={(e) => {
                                if (e.target.value !== (order.courier_name || "")) {
                                  updateAdminOrder({
                                    orderId: order.id,
                                    storeId: order.storeId,
                                    courierName: e.target.value,
                                  });
                                }
                              }}
                              className="bg-background border border-border rounded-lg px-2.5 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary w-28 sm:w-36"
                            />
                            <input
                              type="text"
                              placeholder="Tracking Number"
                              defaultValue={order.tracking_number || ""}
                              onBlur={(e) => {
                                if (e.target.value !== (order.tracking_number || "")) {
                                  updateAdminOrder({
                                    orderId: order.id,
                                    storeId: order.storeId,
                                    trackingNumber: e.target.value,
                                  });
                                }
                              }}
                              className="bg-background border border-border rounded-lg px-2.5 py-1 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary w-28 sm:w-36"
                            />
                          </div>
                        </div>

                        {/* Order Items List */}
                        <div className="space-y-2 pt-1">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                            Ordered Products ({order.items?.length || 0})
                          </span>
                          <div className="space-y-2">
                            {order.items?.map((item, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between p-2.5 rounded-xl bg-background border border-border text-xs gap-3"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="w-12 h-12 rounded-lg bg-secondary overflow-hidden shrink-0 border border-border">
                                    {item.image_url ? (
                                      <img
                                        src={item.image_url}
                                        alt={item.product_title}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground">
                                        No image
                                      </div>
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-semibold text-foreground truncate" title={item.product_title}>
                                      {item.product_title}
                                    </p>
                                    <p className="text-muted-foreground text-[11px]">
                                      {item.size ? `Size: ${item.size} • ` : ""}Qty: {item.quantity} × ₹{item.price.toFixed(2)}
                                    </p>
                                  </div>
                                </div>
                                <div className="font-bold text-foreground font-mono shrink-0">
                                  ₹{(item.price * item.quantity).toFixed(2)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
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
                          <span>Receipt (₹{store.meta.payment_amount || 99})</span>
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
                  <h3 className="font-bold text-base">Payment Receipt (₹{receiptModal.meta.payment_amount || 99})</h3>
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
                <span className="font-bold text-foreground">{receiptModal.meta.subscription_plan || "₹99 - 3 Months"}</span>
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
