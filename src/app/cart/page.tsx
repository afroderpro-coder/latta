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
  X
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
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);

  // Delivery & Customer Form
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");

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

  const handleProceedToWhatsApp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (selectedItems.length === 0) return;

    setIsCheckingOut(true);

    try {
      // Base URL for generating exact product and store links
      const baseUrl = typeof window !== "undefined" && window.location.origin
        ? window.location.origin
        : "https://bucolic-liger-c920b6.netlify.app";

      // 1. Fetch store records for the items in cart
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

      // 2. Persist order into each seller's store metadata so it shows in their Orders dashboard
      const itemsByStore: Record<string, typeof selectedItems> = {};
      selectedItems.forEach((item) => {
        const sId = item.storeId || "unknown";
        if (!itemsByStore[sId]) itemsByStore[sId] = [];
        itemsByStore[sId].push(item);
      });

      const orderRef = "ORD-" + Math.random().toString(36).substring(2, 8).toUpperCase();

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
                status: "pending",
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

      // 3. Format Items list with clickable product and store links for WhatsApp
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

      // 4. Format complete message
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

      // 5. Build WhatsApp URL
      const whatsappUrl = `https://wa.me/${WHATSAPP_ORDER_NUMBER}?text=${encodeURIComponent(message)}`;

      // 6. Remove checked-out items from cart
      selectedIds.forEach((id) => removeItem(id));
      setSelectedIds(new Set());
      setShowCheckoutModal(false);
      setOrderPlaced(true);

      // 7. Open WhatsApp in new tab/window
      window.open(whatsappUrl, "_blank");

    } catch (err: any) {
      alert("Failed to initiate checkout: " + (err.message || "Please try again"));
    } finally {
      setIsCheckingOut(false);
    }
  };

  if (orderPlaced && items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16 text-center max-w-xl">
        <div className="h-16 w-16 bg-green-500/10 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Order Initiated via WhatsApp!</h1>
        <p className="text-muted-foreground mb-6">
          Your order details have been forwarded to our WhatsApp sales desk (<span className="font-semibold text-foreground">+91 9671016500</span>). We will confirm your order and shipping details shortly.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/shop">
            <Button size="lg" className="w-full sm:w-auto">Continue Shopping</Button>
          </Link>
          <a
            href={`https://wa.me/${WHATSAPP_ORDER_NUMBER}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-[#25D366] hover:bg-[#20ba5a] text-white px-6 py-3 rounded-md font-semibold text-sm transition-colors w-full sm:w-auto justify-center"
          >
            <MessageCircle className="h-4 w-4" />
            <span>Chat on WhatsApp</span>
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
                onClick={removeSelected}
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
                      <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)} className="text-red-500 hover:text-red-600 hover:bg-red-500/10 h-8 w-8">
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

              {/* WhatsApp Checkout Button */}
              <button
                type="button"
                onClick={() => setShowCheckoutModal(true)}
                disabled={selectedItems.length === 0}
                className="w-full mt-2 flex items-center justify-center gap-2.5 bg-[#25D366] hover:bg-[#20ba5a] active:scale-[0.99] text-white py-3.5 px-4 rounded-xl font-bold text-base shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <MessageCircle className="h-5 w-5 fill-white text-white" />
                <span>
                  {selectedItems.length === 0
                    ? "Select Items to Checkout"
                    : `Checkout on WhatsApp (₹${selectedTotal.toFixed(2)})`}
                </span>
              </button>

              <p className="text-[11px] text-center text-muted-foreground">
                📱 Order directly via WhatsApp at <span className="font-semibold">+91 9671016500</span>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── WhatsApp Checkout Details Modal ── */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-card border border-border w-full max-w-lg rounded-2xl p-6 shadow-2xl relative space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-full bg-green-500/10 text-[#25D366]">
                  <MessageCircle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-foreground">Confirm WhatsApp Order</h3>
                  <p className="text-xs text-muted-foreground">Direct order to +91 9671016500</p>
                </div>
              </div>
              <button
                onClick={() => setShowCheckoutModal(false)}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleProceedToWhatsApp} className="space-y-4">
              <div className="space-y-1.5">
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

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" />
                  <span>Contact Phone Number *</span>
                </label>
                <Input
                  placeholder="e.g. 9876543210"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>Delivery Address / City (Optional)</span>
                </label>
                <Input
                  placeholder="e.g. House #24, Green Park, New Delhi"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                />
              </div>

              <div className="p-3 bg-muted/40 rounded-xl border border-border/60 text-xs space-y-1">
                <div className="flex justify-between font-medium">
                  <span className="text-muted-foreground">Order Items:</span>
                  <span className="text-foreground">{selectedItems.length} products</span>
                </div>
                <div className="flex justify-between font-bold text-sm pt-1 border-t border-border/40">
                  <span>Payable Total:</span>
                  <span className="text-primary">₹{selectedTotal.toFixed(2)}</span>
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCheckoutModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <button
                  type="submit"
                  disabled={isCheckingOut}
                  className="flex-1 flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20ba5a] text-white py-2.5 px-4 rounded-md font-semibold text-sm transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  <MessageCircle className="h-4 w-4 fill-white" />
                  <span>Send on WhatsApp</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
