"use client";

import { useCartStore } from "@/store/useCartStore";
import { useAuthStore } from "@/store/useAuthStore";
import { supabase } from "@/utils/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";
import { 
  Trash2, 
  Plus, 
  Minus, 
  ShoppingBag, 
  Check, 
  MessageCircle, 
  CheckCircle2, 
  MapPin, 
  Phone, 
  User, 
  ArrowRight,
  X,
  CreditCard,
  Sparkles,
  ShieldCheck,
  Loader2,
  Lock
} from "lucide-react";
import Link from "next/link";
import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { parseStoreBio, serializeStoreBio, StoreOrder } from "@/utils/storeMetadata";

const WHATSAPP_ORDER_NUMBER = "919671016500";

export default function CartPage() {
  const { items, updateQuantity, removeItem, clearCart } = useCartStore();
  const { profile } = useAuthStore();
  const router = useRouter();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(items.map(i => i.id)));
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [isRazorpayLoading, setIsRazorpayLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"razorpay" | "whatsapp">("razorpay");
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [placedOrderInfo, setPlacedOrderInfo] = useState<{
    id: string;
    method: "razorpay" | "whatsapp";
    paymentId?: string;
    total: number;
    itemsCount: number;
  } | null>(null);

  // Delivery & Customer Form
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");

  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: "single" | "selected";
    itemId?: string;
    itemName?: string;
  } | null>(null);

  useEffect(() => {
    // Keep selection in sync when items change
    setSelectedIds(new Set(items.map(i => i.id)));
  }, [items.length]);

  useEffect(() => {
    if (profile?.full_name && !customerName) {
      setCustomerName(profile.full_name);
    }
  }, [profile, customerName]);

  const allSelected = items.length > 0 && selectedIds.size === items.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < items.length;

  const selectedItems = useMemo(
    () => items.filter((item) => selectedIds.has(item.id)),
    [items, selectedIds]
  );

  const selectedTotal = useMemo(
    () => selectedItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [selectedItems]
  );

  const toggleItem = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((i) => i.id)));
    }
  };

  const removeSelected = () => {
    selectedIds.forEach((id) => removeItem(id));
    setSelectedIds(new Set());
  };

  const confirmDelete = () => {
    if (!deleteConfirm) return;
    if (deleteConfirm.type === "single" && deleteConfirm.itemId) {
      removeItem(deleteConfirm.itemId);
    } else if (deleteConfirm.type === "selected") {
      removeSelected();
    }
    setDeleteConfirm(null);
  };

  // Dynamically load Razorpay Checkout SDK
  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (typeof window === "undefined") {
        resolve(false);
        return;
      }
      if ((window as any).Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // Helper: Persist order into each seller's store metadata so it shows in their dashboard
  const saveOrderToStores = async ({
    orderRef,
    paymentMethod,
    paymentStatus,
    paymentId,
    razorpayOrderId,
  }: {
    orderRef: string;
    paymentMethod: "razorpay" | "whatsapp";
    paymentStatus: "paid" | "pending";
    paymentId?: string;
    razorpayOrderId?: string;
  }) => {
    const storeMap: Record<string, { shop_name: string; bio?: string }> = {};
    const storeIds = Array.from(new Set(selectedItems.map((i) => i.storeId).filter(Boolean)));
    if (storeIds.length > 0) {
      try {
        const { data: stores } = await supabase
          .from("stores")
          .select("id, shop_name, bio")
          .in("id", storeIds);
        stores?.forEach((s) => {
          storeMap[s.id] = { shop_name: s.shop_name, bio: s.bio };
        });
      } catch (err) {
        console.error("Could not fetch store names:", err);
      }
    }

    const itemsByStore: Record<string, typeof selectedItems> = {};
    selectedItems.forEach((item) => {
      const sId = item.storeId || "unknown";
      if (!itemsByStore[sId]) itemsByStore[sId] = [];
      itemsByStore[sId].push(item);
    });

    for (const [sId, storeItems] of Object.entries(itemsByStore)) {
      if (sId && sId !== "unknown") {
        try {
          const currentStore = storeMap[sId];
          if (currentStore) {
            const storeMeta = parseStoreBio(currentStore.bio);
            const storeTotal = storeItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

            const storeOrder: StoreOrder = {
              id: orderRef,
              created_at: new Date().toISOString(),
              customer_name: customerName.trim() || profile?.full_name || "Guest Customer",
              customer_phone: customerPhone.trim() || "Not provided",
              delivery_address: deliveryAddress.trim() || "Not provided",
              customer_notes: customerNotes.trim() || "",
              items: storeItems.map((i) => ({
                product_id: i.productId,
                product_title: i.name,
                size: i.variant?.size,
                quantity: i.quantity,
                price: i.price,
                image_url: i.imageUrl,
              })),
              total_amount: storeTotal,
              status: paymentStatus === "paid" ? "processing" : "pending",
              payment_method: paymentMethod,
              payment_status: paymentStatus,
              payment_id: paymentId,
              razorpay_order_id: razorpayOrderId,
              paid_at: paymentStatus === "paid" ? new Date().toISOString() : undefined,
            };

            const updatedOrders = [storeOrder, ...(storeMeta.orders || [])];
            const updatedBio = serializeStoreBio({
              ...storeMeta,
              orders: updatedOrders,
            });

            await supabase
              .from("stores")
              .update({ bio: updatedBio })
              .eq("id", sId);
          }
        } catch (persistErr) {
          console.error("Error saving order to store metadata:", persistErr);
        }
      }
    }
    return storeMap;
  };

  // ── Online Payment via Razorpay ──
  const handlePayWithRazorpay = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (selectedItems.length === 0) return;

    if (!customerName.trim()) {
      alert("Please enter your full name.");
      return;
    }
    const cleanPhone = customerPhone.replace(/\D/g, "");
    if (!cleanPhone || cleanPhone.length < 10) {
      alert("Please enter a valid 10-digit contact phone number.");
      return;
    }
    if (!deliveryAddress.trim()) {
      alert("Please enter your delivery address.");
      return;
    }

    setIsRazorpayLoading(true);

    try {
      const isScriptLoaded = await loadRazorpayScript();
      if (!isScriptLoaded) {
        throw new Error("Could not load Razorpay payment gateway. Please check your internet connection.");
      }

      const orderRef = "ORD-" + Math.random().toString(36).substring(2, 8).toUpperCase();
      const phoneToUse = cleanPhone.slice(-10);

      // 1. Create order on backend
      const orderRes = await fetch("/api/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: selectedTotal,
          type: "product_purchase",
          orderRef,
          customerName: customerName.trim(),
          customerPhone: phoneToUse,
        }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok || !orderData.orderId) {
        throw new Error(orderData.error || "Failed to initialize payment gateway order.");
      }

      // 2. Open Razorpay Checkout modal
      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency || "INR",
        name: "AFRODER",
        description: `Order #${orderRef} (${selectedItems.length} product${selectedItems.length !== 1 ? "s" : ""})`,
        image: "/logo-emblem.png",
        order_id: orderData.orderId,
        handler: async function (response: any) {
          setIsRazorpayLoading(true);
          try {
            // 3. Verify payment signature on backend
            const verifyRes = await fetch("/api/razorpay/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            const verifyData = await verifyRes.json();
            if (!verifyRes.ok || !verifyData.success) {
              throw new Error(verifyData.error || "Payment verification failed.");
            }

            // 4. Save order to stores metadata
            await saveOrderToStores({
              orderRef,
              paymentMethod: "razorpay",
              paymentStatus: "paid",
              paymentId: response.razorpay_payment_id,
              razorpayOrderId: response.razorpay_order_id,
            });

            // 5. Clear purchased items and show confirmation
            const purchasedCount = selectedItems.length;
            const purchasedTotal = selectedTotal;
            selectedIds.forEach((id) => removeItem(id));
            setSelectedIds(new Set());
            setShowCheckoutModal(false);
            setPlacedOrderInfo({
              id: orderRef,
              method: "razorpay",
              paymentId: response.razorpay_payment_id,
              total: purchasedTotal,
              itemsCount: purchasedCount,
            });
            setOrderPlaced(true);
          } catch (err: any) {
            alert("Error confirming payment: " + (err.message || "Please contact support with Payment ID: " + response.razorpay_payment_id));
          } finally {
            setIsRazorpayLoading(false);
          }
        },
        prefill: {
          name: customerName.trim(),
          contact: phoneToUse,
          email: profile?.email || `${phoneToUse}@afroder.shop`,
        },
        theme: {
          color: "#000000",
        },
        modal: {
          ondismiss: function () {
            setIsRazorpayLoading(false);
          },
        },
      };

      const razorpayInstance = new (window as any).Razorpay(options);
      razorpayInstance.on("payment.failed", function (response: any) {
        alert("Payment failed: " + (response.error?.description || "Transaction declined."));
        setIsRazorpayLoading(false);
      });
      razorpayInstance.open();
    } catch (err: any) {
      alert("Checkout error: " + (err.message || "Please try again."));
      setIsRazorpayLoading(false);
    }
  };

  // ── Manual / WhatsApp Order ──
  const handleProceedToWhatsApp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (selectedItems.length === 0) return;

    if (!customerName.trim()) {
      alert("Please enter your full name.");
      return;
    }
    const cleanPhone = customerPhone.replace(/\D/g, "");
    if (!cleanPhone || cleanPhone.length < 10) {
      alert("Please enter a valid 10-digit contact phone number.");
      return;
    }

    setIsCheckingOut(true);

    try {
      const baseUrl = typeof window !== "undefined" && window.location.origin
        ? window.location.origin
        : "https://afroder.shop";

      const orderRef = "ORD-" + Math.random().toString(36).substring(2, 8).toUpperCase();

      // Persist order with pending status
      const storeMap = await saveOrderToStores({
        orderRef,
        paymentMethod: "whatsapp",
        paymentStatus: "pending",
      });

      // Format Items list with clickable product and store links for WhatsApp
      const itemsText = selectedItems.map((item, index) => {
        const storeInfo = storeMap[item.storeId];
        const storeName = storeInfo?.shop_name || "AFRODER Partner Store";
        const sizeText = item.variant?.size ? ` (Size: ${item.variant.size})` : "";
        const itemSubtotal = (item.price * item.quantity).toFixed(2);
        const productLink = `${baseUrl}/product/${item.productId}`;
        const storeLink = item.storeId ? `${baseUrl}/store/${item.storeId}` : null;

        let itemDetails = `${index + 1}. *${item.name}*${sizeText}\n` +
          `   • Qty: ${item.quantity} × ₹${item.price.toFixed(2)} = ₹${itemSubtotal}\n` +
          `   • Store: ${storeName}\n` +
          `   🔗 Product: ${productLink}`;

        if (storeLink) {
          itemDetails += `\n   🏬 Store: ${storeLink}`;
        }

        return itemDetails;
      }).join("\n\n");

      // Format complete WhatsApp message
      const customerInfo = [
        `• Name: ${customerName.trim() || profile?.full_name || "Guest Customer"}`,
        customerPhone.trim() ? `• Phone: ${customerPhone.trim()}` : null,
        deliveryAddress.trim() ? `• Address: ${deliveryAddress.trim()}` : null,
        customerNotes.trim() ? `• Notes: ${customerNotes.trim()}` : null,
      ].filter(Boolean).join("\n");

      const message = `🛍️ *NEW ORDER - AFRODER APPAREL*\n` +
        `━━━━━━━━━━━━━━━━━━━━━\n` +
        `🧾 Order Ref: #${orderRef}\n\n` +
        `👤 *CUSTOMER DETAILS:*\n${customerInfo}\n\n` +
        `📦 *PRODUCTS ORDERED:*\n${itemsText}\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━\n` +
        `💰 *TOTAL AMOUNT: ₹${selectedTotal.toFixed(2)}*\n` +
        `━━━━━━━━━━━━━━━━━━━━━\n` +
        `📍 Please confirm my order availability and dispatch instructions!`;

      const whatsappUrl = `https://wa.me/${WHATSAPP_ORDER_NUMBER}?text=${encodeURIComponent(message)}`;

      const purchasedCount = selectedItems.length;
      const purchasedTotal = selectedTotal;
      selectedIds.forEach((id) => removeItem(id));
      setSelectedIds(new Set());
      setShowCheckoutModal(false);
      setPlacedOrderInfo({
        id: orderRef,
        method: "whatsapp",
        total: purchasedTotal,
        itemsCount: purchasedCount,
      });
      setOrderPlaced(true);

      window.open(whatsappUrl, "_blank");
    } catch (err: any) {
      alert("Failed to initiate checkout: " + (err.message || "Please try again"));
    } finally {
      setIsCheckingOut(false);
    }
  };

  // Order Success Screen (Online Razorpay or WhatsApp)
  if (orderPlaced && items.length === 0) {
    const isRazorpay = placedOrderInfo?.method === "razorpay";

    return (
      <div className="container mx-auto px-4 py-16 text-center max-w-xl animate-in fade-in zoom-in-95 duration-200">
        <div className={`h-16 w-16 ${isRazorpay ? "bg-emerald-500/10 text-emerald-500" : "bg-green-500/10 text-green-600"} rounded-full flex items-center justify-center mx-auto mb-4`}>
          {isRazorpay ? <ShieldCheck className="h-8 w-8 text-white" /> : <CheckCircle2 className="h-8 w-8" />}
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight mb-2 text-foreground">
          {isRazorpay ? "Payment Confirmed & Order Placed!" : "Order Forwarded to WhatsApp!"}
        </h1>

        <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
          {isRazorpay
            ? "Your online payment has been verified successfully. The partner stores have received your order details and are preparing your shipment."
            : "Your order details have been forwarded to our WhatsApp sales desk (+91 9671016500). We will confirm your order and shipping details shortly."}
        </p>

        {/* Order Receipt Card */}
        {placedOrderInfo && (
          <div className="bg-card border border-border rounded-2xl p-5 mb-6 text-left space-y-3 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-border text-xs">
              <span className="text-muted-foreground">Order Reference:</span>
              <span className="font-mono font-bold text-foreground text-sm">#{placedOrderInfo.id}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Payment Method:</span>
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                {isRazorpay ? (
                  <>
                    <CreditCard className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Razorpay Online (PAID)</span>
                  </>
                ) : (
                  <>
                    <MessageCircle className="w-3.5 h-3.5 text-green-600" />
                    <span>WhatsApp / Cash on Delivery</span>
                  </>
                )}
              </span>
            </div>
            {placedOrderInfo.paymentId && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Transaction ID:</span>
                <span className="font-mono text-muted-foreground">{placedOrderInfo.paymentId}</span>
              </div>
            )}
            <div className="flex items-center justify-between pt-2 border-t border-border text-sm font-bold">
              <span>Total Paid:</span>
              <span className="text-primary text-base">₹{placedOrderInfo.total.toFixed(2)}</span>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/shop" className="w-full sm:w-auto">
            <Button size="lg" className="w-full sm:w-auto">Continue Shopping</Button>
          </Link>
          <a
            href={`https://wa.me/${WHATSAPP_ORDER_NUMBER}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-[#25D366] hover:bg-[#20ba5a] text-white px-6 py-3 rounded-md font-semibold text-sm transition-colors w-full sm:w-auto justify-center"
          >
            <MessageCircle className="h-4 w-4" />
            <span>Chat with Sales Desk</span>
          </a>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16 text-center max-w-2xl">
        <div className="flex justify-center mb-6">
          <ShoppingBag className="h-16 w-16 text-muted-foreground/40" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight mb-4">Your cart is empty</h1>
        <p className="text-muted-foreground mb-8">Looks like you haven't added anything to your cart yet.</p>
        <Link href="/shop">
          <Button size="lg">Explore Collections</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl pb-24">
      <h1 className="text-3xl font-bold tracking-tight mb-8">Shopping Cart</h1>
      
      <div className="grid lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-4">
          {/* Select All / Remove Selected bar */}
          <div className="flex items-center justify-between px-1 py-2">
            <button
              onClick={toggleAll}
              className="flex items-center gap-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group cursor-pointer"
            >
              <span
                className={`flex items-center justify-center h-5 w-5 rounded border-2 transition-all duration-200 ${
                  allSelected
                    ? "bg-primary border-primary text-primary-foreground"
                    : someSelected
                    ? "bg-primary/20 border-primary text-primary"
                    : "border-muted-foreground/40 group-hover:border-primary/60"
                }`}
              >
                {(allSelected || someSelected) && <Check className="h-3 w-3" strokeWidth={3} />}
              </span>
              {allSelected ? "Deselect All" : "Select All"}{" "}
              <span className="text-muted-foreground">
                ({selectedIds.size}/{items.length})
              </span>
            </button>

            {selectedIds.size > 0 && (
              <button
                onClick={() => setDeleteConfirm({ type: "selected" })}
                className="text-sm font-medium text-red-500 hover:text-red-600 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove Selected
              </button>
            )}
          </div>

          {/* Cart Items List */}
          {items.map((item) => {
            const isSelected = selectedIds.has(item.id);
            return (
              <Card
                key={item.id}
                className={`overflow-hidden transition-all duration-200 ${
                  isSelected
                    ? "ring-2 ring-primary/30 border-primary/20"
                    : "opacity-70 hover:opacity-100"
                }`}
              >
                <CardContent className="p-4 flex gap-4">
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleItem(item.id)}
                    className="flex-shrink-0 self-center cursor-pointer"
                    aria-label={isSelected ? `Deselect ${item.name}` : `Select ${item.name}`}
                  >
                    <span
                      className={`flex items-center justify-center h-5 w-5 rounded border-2 transition-all duration-200 ${
                        isSelected
                          ? "bg-primary border-primary text-primary-foreground"
                          : "border-muted-foreground/40 hover:border-primary/60"
                      }`}
                    >
                      {isSelected && <Check className="h-3 w-3" strokeWidth={3} />}
                    </span>
                  </button>

                  {/* Product image */}
                  <div className="h-24 w-20 bg-muted rounded-md flex-shrink-0 overflow-hidden">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover rounded-md" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground">
                        No image
                      </div>
                    )}
                  </div>

                  {/* Product details */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-base sm:text-lg line-clamp-1">{item.name}</h3>
                        {item.variant?.size && (
                          <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded font-medium">
                            Size: {item.variant.size}
                          </span>
                        )}
                        <p className="text-muted-foreground text-sm font-medium mt-1">₹{item.price.toFixed(2)}</p>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteConfirm({ type: "single", itemId: item.id, itemName: item.name })} className="text-red-500 hover:text-red-600 hover:bg-red-500/10 h-8 w-8">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center space-x-2">
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.id, item.quantity - 1)}>
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center font-medium text-sm">{item.quantity}</span>
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="font-bold text-sm sm:text-base text-foreground">
                        ₹{(item.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        
        {/* Order Summary Card */}
        <div className="lg:col-span-1">
          <Card className="sticky top-24 shadow-md border-border">
            <CardContent className="p-6 space-y-4">
              <h2 className="text-xl font-bold tracking-tight">Order Summary</h2>

              {/* Selected items breakdown */}
              {selectedItems.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {selectedItems.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm text-muted-foreground">
                      <span className="truncate mr-2">
                        {item.name} {item.variant?.size ? `(${item.variant.size})` : ""} × {item.quantity}
                      </span>
                      <span className="flex-shrink-0 font-medium text-foreground">
                        ₹{(item.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No items selected. Please select products to checkout.
                </p>
              )}

              <div className="border-t border-border pt-4 space-y-2">
                <div className="flex justify-between text-muted-foreground text-sm">
                  <span>Subtotal ({selectedItems.length} item{selectedItems.length !== 1 ? "s" : ""})</span>
                  <span>₹{selectedTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground text-sm">
                  <span>Shipping</span>
                  <span className="text-green-600 font-medium">Free / Arranged on WhatsApp</span>
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <div className="flex justify-between font-bold text-xl">
                  <span>Total</span>
                  <span>₹{selectedTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Primary Checkout Button */}
              <button
                type="button"
                onClick={() => setShowCheckoutModal(true)}
                disabled={selectedItems.length === 0}
                className="w-full mt-2 flex items-center justify-center gap-2 bg-foreground text-background hover:bg-foreground/90 active:scale-[0.99] py-3.5 px-4 rounded-xl font-bold text-base shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <Lock className="h-4 w-4" />
                <span>
                  {selectedItems.length === 0
                    ? "Select Items to Checkout"
                    : `Proceed to Checkout (₹${selectedTotal.toFixed(2)})`}
                </span>
                <ArrowRight className="h-4 w-4 ml-1" />
              </button>

              <div className="flex items-center justify-center gap-2 pt-1 text-[11px] text-muted-foreground">
                <span>🔒 256-Bit Encrypted</span>
                <span>•</span>
                <span>Razorpay Online & WhatsApp</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Delete Confirmation Modal ── */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-card border border-border w-full max-w-sm rounded-2xl p-6 shadow-2xl relative space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center">
                <Trash2 className="h-6 w-6 text-red-500" />
              </div>
              <h3 className="font-bold text-lg text-foreground">Remove from Cart?</h3>
              <p className="text-sm text-muted-foreground">
                {deleteConfirm.type === "single"
                  ? <>Are you sure you want to remove <span className="font-semibold text-foreground">{deleteConfirm.itemName}</span> from your cart?</>
                  : <>Are you sure you want to remove <span className="font-semibold text-foreground">{selectedIds.size} selected item{selectedIds.size !== 1 ? "s" : ""}</span> from your cart?</>
                }
              </p>
            </div>
            <div className="flex gap-3 pt-1">
              <Button
                variant="outline"
                onClick={() => setDeleteConfirm(null)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={confirmDelete}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white"
              >
                <Trash2 className="h-4 w-4 mr-1.5" />
                Remove
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Checkout Details & Payment Selection Modal ── */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-card border border-border w-full max-w-lg rounded-2xl p-6 shadow-2xl relative space-y-5 animate-in fade-in zoom-in-95 duration-200 my-8">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-full bg-primary/10 text-primary">
                  <ShoppingBag className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-foreground">Checkout & Delivery</h3>
                  <p className="text-xs text-muted-foreground">Complete your order with instant online payment or WhatsApp</p>
                </div>
              </div>
              <button
                onClick={() => setShowCheckoutModal(false)}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Payment Method Selector */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Choose Payment Method
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Razorpay Online */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("razorpay")}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative ${
                      paymentMethod === "razorpay"
                        ? "border-primary bg-primary/5 ring-1 ring-primary shadow-xs"
                        : "border-border hover:border-border/80 bg-secondary/30"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs flex items-center gap-1.5 text-foreground">
                        <CreditCard className="w-3.5 h-3.5 text-primary" />
                        <span>Pay Online</span>
                      </span>
                      <span className="text-[9px] font-mono font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-1.5 py-0.2 rounded-full">
                        Instant
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-snug">
                      UPI (GPay, PhonePe), Cards & NetBanking via Razorpay
                    </p>
                  </button>

                  {/* WhatsApp Order */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("whatsapp")}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative ${
                      paymentMethod === "whatsapp"
                        ? "border-[#25D366] bg-[#25D366]/5 ring-1 ring-[#25D366] shadow-xs"
                        : "border-border hover:border-border/80 bg-secondary/30"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs flex items-center gap-1.5 text-foreground">
                        <MessageCircle className="w-3.5 h-3.5 text-[#25D366]" />
                        <span>WhatsApp / COD</span>
                      </span>
                      <span className="text-[9px] font-mono font-bold uppercase tracking-wider bg-secondary text-muted-foreground border border-border px-1.5 py-0.2 rounded-full">
                        Sales Desk
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-snug">
                      Direct manual order confirmation with sales desk
                    </p>
                  </button>
                </div>
              </div>

              {/* Customer Delivery Details */}
              <div className="space-y-3 pt-1">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" />
                    <span>Your Full Name *</span>
                  </label>
                  <Input
                    placeholder="e.g. Rahul Sharma"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" />
                    <span>Contact Phone Number *</span>
                  </label>
                  <Input
                    placeholder="e.g. 9876543210 (10 digits)"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    <span>Delivery Address & City *</span>
                  </label>
                  <Input
                    placeholder="e.g. Flat 302, Green Heights, Bandra, Mumbai - 400050"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Order Notes / Delivery Instructions (Optional)
                  </label>
                  <Input
                    placeholder="e.g. Call before delivery / leave at reception"
                    value={customerNotes}
                    onChange={(e) => setCustomerNotes(e.target.value)}
                  />
                </div>
              </div>

              {/* Order Cost Summary Box */}
              <div className="p-3.5 bg-muted/40 rounded-xl border border-border/80 text-xs space-y-1.5">
                <div className="flex justify-between font-medium">
                  <span className="text-muted-foreground">Order Items:</span>
                  <span className="text-foreground">{selectedItems.length} product{selectedItems.length !== 1 ? "s" : ""}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span className="text-muted-foreground">Payment Mode:</span>
                  <span className="font-semibold text-foreground">
                    {paymentMethod === "razorpay" ? "⚡ Razorpay Online (Instant)" : "💬 WhatsApp / COD"}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-sm pt-2 border-t border-border/60">
                  <span>Payable Total:</span>
                  <span className="text-primary text-base">₹{selectedTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCheckoutModal(false)}
                  disabled={isCheckingOut || isRazorpayLoading}
                  className="flex-1"
                >
                  Cancel
                </Button>

                {paymentMethod === "razorpay" ? (
                  <button
                    type="button"
                    onClick={handlePayWithRazorpay}
                    disabled={isCheckingOut || isRazorpayLoading}
                    className="flex-2 flex items-center justify-center gap-2 bg-foreground text-background hover:bg-foreground/90 py-2.5 px-4 rounded-xl font-bold text-sm shadow-md transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isRazorpayLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Connecting Razorpay...</span>
                      </>
                    ) : (
                      <>
                        <CreditCard className="h-4 w-4" />
                        <span>Pay ₹{selectedTotal.toFixed(2)} Online</span>
                        <ArrowRight className="h-4 w-4 ml-0.5" />
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleProceedToWhatsApp}
                    disabled={isCheckingOut || isRazorpayLoading}
                    className="flex-2 flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20ba5a] text-white py-2.5 px-4 rounded-xl font-bold text-sm shadow-md transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isCheckingOut ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-white" />
                        <span>Sending Order...</span>
                      </>
                    ) : (
                      <>
                        <MessageCircle className="h-4 w-4 fill-white" />
                        <span>Send on WhatsApp</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
