"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { useCartStore } from "@/store/useCartStore";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  User,
  Mail,
  ShoppingBag,
  LogOut,
  Phone,
  Truck,
  CheckCircle2,
  Clock,
  Package,
  MapPin,
  Calendar,
  ExternalLink,
  MessageCircle,
  RefreshCw,
  Search,
  ChevronRight,
  ShieldCheck,
  CreditCard,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { StoreOrder } from "@/utils/storeMetadata";

export default function ProfilePage() {
  const { profile, user, isLoading, signOut } = useAuthStore();
  const { items, removeItem, clearCart } = useCartStore();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"orders" | "cart" | "account">("orders");
  const [orders, setOrders] = useState<(StoreOrder & { storeName: string; storeId: string })[]>([]);
  const [isOrdersLoading, setIsOrdersLoading] = useState(false);
  const [manualOrderId, setManualOrderId] = useState("");
  const [isSearchingOrder, setIsSearchingOrder] = useState(false);
  const [searchFeedback, setSearchFeedback] = useState<string | null>(null);

  // Fetch orders associated with this customer
  const fetchCustomerOrders = async (customId?: string) => {
    if (!user && !customId) return;

    setIsOrdersLoading(true);
    setSearchFeedback(null);
    try {
      const email = user?.email || profile?.email || "";
      let phone =
        user?.user_metadata?.phone ||
        user?.user_metadata?.contact_number ||
        (user?.email?.endsWith("@phone.afroder.com")
          ? user.email.replace("@phone.afroder.com", "")
          : "");

      if (!phone && typeof window !== "undefined") {
        phone = localStorage.getItem("afroder_customer_phone") || "";
      }

      const params = new URLSearchParams();
      if (email && !email.endsWith("@phone.afroder.com")) {
        params.append("email", email);
      }
      if (phone) {
        params.append("phone", phone);
      }
      if (customId) {
        params.append("orderId", customId.trim().toUpperCase());
      } else if (typeof window !== "undefined") {
        const recentOrderId = localStorage.getItem("afroder_last_order_id");
        if (recentOrderId) {
          params.append("orderId", recentOrderId.trim().toUpperCase());
        }
      }

      const res = await fetch(`/api/orders/my-orders?${params.toString()}`);
      const data = await res.json();

      if (data.success && Array.isArray(data.orders)) {
        setOrders(data.orders);
        if (customId && data.orders.length === 0) {
          setSearchFeedback(`No order found matching "${customId}". Please check the ID.`);
        }
      }
    } catch (err) {
      console.error("Error fetching orders:", err);
    } finally {
      setIsOrdersLoading(false);
      setIsSearchingOrder(false);
    }
  };

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        fetchCustomerOrders();
      }
    }
  }, [user, isLoading]);

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualOrderId.trim()) return;
    setIsSearchingOrder(true);
    fetchCustomerOrders(manualOrderId);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  // Helper for tracking steps
  const getTimelineStep = (status: StoreOrder["status"]) => {
    switch (status) {
      case "pending":
        return 1;
      case "processing":
        return 2;
      case "shipped":
        return 3;
      case "out_for_delivery":
        return 4;
      case "delivered":
        return 5;
      case "cancelled":
        return 0;
      default:
        return 1;
    }
  };

  const formatDeliveryDate = (dateStr?: string) => {
    if (!dateStr) return "5-7 Business Days";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const cartTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8 sm:py-12 space-y-8">
      {/* ── Customer Profile Card ── */}
      <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4 sm:gap-5">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-secondary/80 border border-border flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
            {user?.user_metadata?.avatar_url ? (
              <img
                src={user.user_metadata.avatar_url}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-8 h-8 sm:w-10 sm:h-10 text-muted-foreground" />
            )}
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                {profile?.full_name || user?.user_metadata?.full_name || "Valued Customer"}
              </h1>
              <span className="text-[10px] font-extrabold uppercase tracking-widest bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                Google Verified
              </span>
            </div>

            <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" />
              <span>{user?.email || "Gmail Account"}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          {user ? (
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await signOut();
                router.push("/");
              }}
              className="text-xs h-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl cursor-pointer"
            >
              <LogOut className="mr-1.5 h-3.5 w-3.5" />
              Sign Out
            </Button>
          ) : (
            <Link href="/auth?role=client&redirect=/profile" className="w-full md:w-auto">
              <Button size="sm" className="w-full text-xs h-9 rounded-xl font-bold">
                Sign In with Google
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* ── Navigation Tabs ── */}
      <div className="flex p-1 bg-secondary/60 rounded-2xl border border-border max-w-md">
        <button
          onClick={() => setActiveTab("orders")}
          className={`flex-1 py-2.5 px-3 text-xs sm:text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === "orders"
              ? "bg-background shadow-xs text-foreground font-bold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>My Orders ({orders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("cart")}
          className={`flex-1 py-2.5 px-3 text-xs sm:text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === "cart"
              ? "bg-background shadow-xs text-foreground font-bold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>My Bag ({items.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("account")}
          className={`flex-1 py-2.5 px-3 text-xs sm:text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === "account"
              ? "bg-background shadow-xs text-foreground font-bold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <User className="w-4 h-4" />
          <span>Account</span>
        </button>
      </div>

      {/* ── TAB 1: Orders & Delivery Tracking ── */}
      {activeTab === "orders" && (
        <div className="space-y-6">
          {/* Quick Order Lookup Form */}
          <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="space-y-0.5 text-left w-full sm:w-auto">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <Search className="w-4 h-4 text-primary" />
                <span>Track Any Order by ID</span>
              </h3>
              <p className="text-xs text-muted-foreground">
                Enter your order ref (e.g. ORD-8XLVBH) to view live delivery timeline
              </p>
            </div>

            <form onSubmit={handleManualSearch} className="flex items-center gap-2 w-full sm:w-auto">
              <Input
                placeholder="Enter #ORD-..."
                value={manualOrderId}
                onChange={(e) => setManualOrderId(e.target.value)}
                className="h-10 text-xs sm:text-sm uppercase font-mono w-full sm:w-48 rounded-xl"
              />
              <Button type="submit" size="sm" disabled={isSearchingOrder} className="h-10 px-4 rounded-xl text-xs font-semibold shrink-0 cursor-pointer">
                {isSearchingOrder ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : "Track"}
              </Button>
            </form>
          </div>

          {searchFeedback && (
            <div className="p-3 rounded-xl text-xs bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{searchFeedback}</span>
            </div>
          )}

          {/* Orders List */}
          {isOrdersLoading ? (
            <div className="bg-card p-12 rounded-2xl border border-border text-center space-y-3">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="text-sm text-muted-foreground font-medium">
                Fetching your orders & delivery updates...
              </p>
            </div>
          ) : orders.length === 0 ? (
            <div className="bg-card p-16 rounded-3xl border border-border text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center mx-auto text-muted-foreground">
                <Truck className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-foreground">No Orders Found Yet</h3>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto">
                  When you purchase any product, real-time delivery timelines, dispatch dates, and tracking will show up here.
                </p>
              </div>
              <div className="pt-2">
                <Link href="/shop">
                  <Button size="lg" className="rounded-xl text-xs sm:text-sm font-bold">
                    Explore Collections
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {orders.map((order) => {
                const step = getTimelineStep(order.status);
                const isCancelled = order.status === "cancelled";
                const isDelivered = order.status === "delivered";
                const isOutForDelivery = order.status === "out_for_delivery";

                return (
                  <div
                    key={order.id}
                    className="bg-card border border-border rounded-3xl p-6 sm:p-7 shadow-xs space-y-6 hover:border-foreground/30 transition-all"
                  >
                    {/* Header */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-border">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="font-mono font-extrabold text-base sm:text-lg text-foreground">
                            #{order.id}
                          </span>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(order.created_at).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Fulfilled by: <strong className="text-foreground">{order.storeName}</strong>
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Status Badge */}
                        <div
                          className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                            isDelivered
                              ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/30"
                              : isOutForDelivery
                              ? "bg-purple-500/10 text-purple-600 border border-purple-500/30 animate-pulse"
                              : isCancelled
                              ? "bg-red-500/10 text-red-500 border border-red-500/30"
                              : "bg-amber-500/10 text-amber-500 border border-amber-500/30"
                          }`}
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span>
                            {order.status === "out_for_delivery"
                              ? "Out for Delivery"
                              : order.status || "Pending"}
                          </span>
                        </div>

                        <span className="text-lg sm:text-xl font-mono font-extrabold text-foreground">
                          ₹{order.total_amount?.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* ── Estimated Delivery Alert Banner ── */}
                    <div className="bg-secondary/40 border border-border rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <Truck className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                            Estimated Delivery
                          </p>
                          <p className="text-sm sm:text-base font-extrabold text-foreground">
                            {isDelivered
                              ? `Delivered on ${formatDeliveryDate(order.completed_at || order.estimated_delivery)}`
                              : isOutForDelivery
                              ? "Arriving Today — Out for Delivery!"
                              : `Expected by ${formatDeliveryDate(order.estimated_delivery)}`}
                          </p>
                        </div>
                      </div>

                      {order.courier_name && (
                        <div className="text-xs text-muted-foreground sm:text-right">
                          <p className="font-semibold text-foreground">Courier: {order.courier_name}</p>
                          {order.tracking_number && (
                            <p className="font-mono text-[11px]">Tracking: {order.tracking_number}</p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* ── Visual Delivery Timeline ── */}
                    {!isCancelled && (
                      <div className="space-y-3 pt-2">
                        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Delivery Progress
                        </p>
                        <div className="relative flex items-center justify-between">
                          {/* Background Line */}
                          <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-1 bg-secondary rounded-full z-0" />
                          {/* Active Line */}
                          <div
                            className="absolute top-1/2 left-0 -translate-y-1/2 h-1 bg-emerald-500 rounded-full z-0 transition-all duration-500"
                            style={{ width: `${((step - 1) / 4) * 100}%` }}
                          />

                          {[
                            { num: 1, label: "Placed" },
                            { num: 2, label: "Packed" },
                            { num: 3, label: "Shipped" },
                            { num: 4, label: "Out for Delivery" },
                            { num: 5, label: "Delivered" },
                          ].map((s) => {
                            const isPassed = step >= s.num;
                            const isCurrent = step === s.num;

                            return (
                              <div
                                key={s.num}
                                className="relative z-10 flex flex-col items-center text-center gap-1"
                              >
                                <div
                                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                                    isPassed
                                      ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                                      : "bg-secondary text-muted-foreground border border-border"
                                  } ${isCurrent ? "ring-4 ring-emerald-500/20 scale-110" : ""}`}
                                >
                                  {isPassed ? <CheckCircle2 className="w-4 h-4" /> : s.num}
                                </div>
                                <span
                                  className={`text-[10px] sm:text-xs font-medium max-w-[70px] truncate ${
                                    isCurrent
                                      ? "text-foreground font-bold"
                                      : isPassed
                                      ? "text-foreground"
                                      : "text-muted-foreground"
                                  }`}
                                >
                                  {s.label}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* ── Order Items ── */}
                    <div className="space-y-3 pt-2">
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Items in this Order ({order.items?.length || 0})
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {order.items?.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-3 p-3 rounded-2xl bg-secondary/30 border border-border"
                          >
                            <div className="w-14 h-14 rounded-xl bg-secondary overflow-hidden shrink-0 border border-border">
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
                            <div className="flex-1 min-w-0">
                              <h4 className="text-xs font-bold text-foreground truncate" title={item.product_title}>
                                {item.product_title}
                              </h4>
                              <p className="text-[11px] text-muted-foreground">
                                {item.size ? `Size: ${item.size} • ` : ""}Qty: {item.quantity}
                              </p>
                              <p className="text-xs font-bold text-foreground font-mono mt-0.5">
                                ₹{(item.price * item.quantity).toFixed(2)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Delivery Address & WhatsApp Support */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-border text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                        <span className="truncate max-w-sm">{order.delivery_address}</span>
                      </div>

                      <a
                        href={`https://wa.me/919671016500?text=${encodeURIComponent(
                          `Hi AFRODER, I would like an update regarding my order #${order.id}.`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#25D366] hover:underline flex items-center gap-1 font-bold shrink-0"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>Support on WhatsApp</span>
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: Cart Items in Bag ── */}
      {activeTab === "cart" && (
        <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-border">
            <div>
              <h2 className="text-lg font-bold text-foreground">Items in Your Shopping Bag</h2>
              <p className="text-xs text-muted-foreground">
                Synced with your account for fast checkout
              </p>
            </div>
            {items.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearCart}
                className="text-xs text-destructive hover:bg-destructive/10 cursor-pointer"
              >
                Clear Bag
              </Button>
            )}
          </div>

          {items.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <ShoppingBag className="w-12 h-12 mx-auto text-muted-foreground/40" />
              <h3 className="font-bold text-foreground">Your bag is empty</h3>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                Explore our catalog to find premium apparel from independent designers.
              </p>
              <Link href="/shop" className="inline-block pt-2">
                <Button size="sm" className="rounded-xl text-xs font-bold">
                  Browse Shop
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="divide-y divide-border">
                {items.map((item) => (
                  <div key={item.id} className="py-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 rounded-xl bg-secondary overflow-hidden shrink-0 border border-border">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                            No image
                          </div>
                        )}
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-foreground">{item.name}</h4>
                        {item.variant?.size && (
                          <p className="text-xs text-muted-foreground">Size: {item.variant.size}</p>
                        )}
                        <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="font-mono font-bold text-sm text-foreground">
                        ₹{(item.price * item.quantity).toFixed(2)}
                      </p>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-[11px] text-destructive hover:underline mt-1 cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-left w-full sm:w-auto">
                  <span className="text-xs text-muted-foreground">Total:</span>
                  <p className="text-2xl font-mono font-extrabold text-foreground">
                    ₹{cartTotal.toFixed(2)}
                  </p>
                </div>

                <Link href="/cart" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full sm:w-auto rounded-xl font-bold flex items-center gap-2">
                    <span>Proceed to Checkout</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: Account Information ── */}
      {activeTab === "account" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-card border border-border rounded-3xl p-6 sm:p-7 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-foreground">Personal Details</h3>
            <div className="space-y-3 text-xs sm:text-sm">
              <div className="p-3.5 rounded-xl bg-secondary/40 border border-border">
                <span className="text-muted-foreground text-xs block">Full Name</span>
                <span className="font-semibold text-foreground">
                  {profile?.full_name || user?.user_metadata?.full_name || "Not provided"}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-secondary/40 border border-border">
                <span className="text-muted-foreground text-xs block">Gmail Address</span>
                <span className="font-semibold text-foreground">{user?.email || "Not linked"}</span>
              </div>

              <div className="p-3.5 rounded-xl bg-secondary/40 border border-border">
                <span className="text-muted-foreground text-xs block">Account Type</span>
                <span className="font-semibold text-foreground capitalize">
                  {profile?.role === "seller" ? "Seller Merchant" : "Customer / Shopper"}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-3xl p-6 sm:p-7 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-foreground">Customer Support</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Have questions about your order, shipping timeline, or returns? Our sales & support team is active daily on WhatsApp.
            </p>

            <div className="space-y-2 pt-2">
              <a
                href="https://wa.me/919671016500"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20ba5a] text-white p-3 rounded-xl font-bold text-xs transition-colors w-full"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Chat with WhatsApp Support</span>
              </a>

              <Link href="/shop" className="block">
                <Button variant="outline" className="w-full rounded-xl text-xs font-semibold h-10">
                  Continue Shopping
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
