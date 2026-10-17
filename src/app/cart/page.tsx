"use client";

import { useCartStore } from "@/store/useCartStore";
import { useAuthStore } from "@/store/useAuthStore";
import { supabase } from "@/utils/supabase/client";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Trash2, Plus, Minus, ShoppingBag, CheckSquare, Square, Check } from "lucide-react";
import Link from "next/link";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";

export default function CartPage() {
  const { items, updateQuantity, removeItem, getTotal, clearCart } = useCartStore();
  const { profile } = useAuthStore();
  const router = useRouter();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(items.map(i => i.id)));

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

  const handleCheckout = async () => {
    if (!profile) {
      router.push("/auth?role=client&mode=signin");
      return;
    }

    if (selectedItems.length === 0) {
      alert("Please select at least one product to checkout.");
      return;
    }
    
    setIsCheckingOut(true);
    try {
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          buyer_id: profile.id,
          total_amount: selectedTotal,
          payment_status: "pending",
          shipping_address: { address: "123 Main St", city: "New York", zip: "10001", country: "USA" }
        })
        .select()
        .single();
        
      if (orderError) throw orderError;
      
      const orderItemsToInsert = selectedItems.map(item => ({
        order_id: order.id,
        store_id: item.storeId,
        product_id: item.productId,
        quantity: item.quantity,
        unit_price: item.price,
        fulfillment_status: 'processing'
      }));
      
      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItemsToInsert);
        
      if (itemsError) throw itemsError;
      
      // Remove only checked-out items from the cart
      selectedIds.forEach((id) => removeItem(id));
      setSelectedIds(new Set());

      alert("Order placed successfully!");
      router.push("/");
    } catch (error: unknown) {
      const supaErr = error as { message?: string; code?: string; details?: string; hint?: string };
      console.error("Checkout failed:", JSON.stringify(supaErr, null, 2));
      alert(
        `Checkout failed: ${supaErr?.message || "Unknown error"}${
          supaErr?.hint ? `\nHint: ${supaErr.hint}` : ""
        }`
      );
    } finally {
      setIsCheckingOut(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16 text-center max-w-2xl">
        <div className="flex justify-center mb-6">
          <ShoppingBag className="h-16 w-16 text-muted-foreground" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight mb-4">Your cart is empty</h1>
        <p className="text-muted-foreground mb-8">Looks like you haven't added anything to your cart yet.</p>
        <Link href="/">
          <Button size="lg">Start Shopping</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <h1 className="text-3xl font-bold tracking-tight mb-8">Shopping Cart</h1>
      
      <div className="grid lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-4">
          {/* Select All / Remove Selected bar */}
          <div className="flex items-center justify-between px-1 py-2">
            <button
              onClick={toggleAll}
              className="flex items-center gap-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group"
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
                className="text-sm font-medium text-red-500 hover:text-red-600 transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove Selected
              </button>
            )}
          </div>

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
                    className="flex-shrink-0 self-center"
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
                  <div className="h-24 w-20 bg-muted rounded-md flex-shrink-0">
                    {item.imageUrl && <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover rounded-md" />}
                  </div>

                  {/* Product details */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div className="flex justify-between">
                      <div>
                        <h3 className="font-semibold text-lg line-clamp-1">{item.name}</h3>
                        <p className="text-muted-foreground">₹{item.price.toFixed(2)}</p>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)} className="text-red-500 hover:text-red-600 hover:bg-red-500/10">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center space-x-2">
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.id, item.quantity - 1)}>
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center font-medium">{item.quantity}</span>
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="font-semibold text-sm">
                        ₹{(item.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        
        <div className="lg:col-span-1">
          <Card className="sticky top-24">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold mb-4">Order Summary</h2>

              {/* Selected items breakdown */}
              {selectedItems.length > 0 ? (
                <div className="space-y-2 mb-4 max-h-40 overflow-y-auto">
                  {selectedItems.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm text-muted-foreground">
                      <span className="truncate mr-2">
                        {item.name} × {item.quantity}
                      </span>
                      <span className="flex-shrink-0">₹{(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground mb-4">
                  No items selected. Please select products to checkout.
                </p>
              )}

              <div className="border-t border-border pt-4 space-y-2 mb-4">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal ({selectedItems.length} item{selectedItems.length !== 1 ? "s" : ""})</span>
                  <span>₹{selectedTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Shipping</span>
                  <span>Calculated at checkout</span>
                </div>
              </div>
              <div className="border-t border-border pt-4 mb-6">
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>₹{selectedTotal.toFixed(2)}</span>
                </div>
              </div>
              <Button
                className="w-full"
                size="lg"
                onClick={handleCheckout}
                isLoading={isCheckingOut}
                disabled={selectedItems.length === 0}
              >
                {selectedItems.length === 0
                  ? "Select Items to Checkout"
                  : selectedItems.length === items.length
                  ? "Checkout All Items"
                  : `Checkout ${selectedItems.length} Item${selectedItems.length !== 1 ? "s" : ""}`}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
