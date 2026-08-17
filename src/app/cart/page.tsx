"use client";

import { useCartStore } from "@/store/useCartStore";
import { useAuthStore } from "@/store/useAuthStore";
import { supabase } from "@/utils/supabase/client";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Trash2, Plus, Minus, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CartPage() {
  const { items, updateQuantity, removeItem, getTotal, clearCart } = useCartStore();
  const { profile } = useAuthStore();
  const router = useRouter();
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const total = getTotal();

  const handleCheckout = async () => {
    if (!profile) {
      router.push("/login?redirect=/cart");
      return;
    }
    
    setIsCheckingOut(true);
    try {
      // Simulate creating an order
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          buyer_id: profile.id,
          total_amount: total,
          payment_status: "pending", // Ideally this integrates with Stripe
          shipping_address: { address: "123 Main St", city: "New York", zip: "10001", country: "USA" } // Hardcoded for simulation
        })
        .select()
        .single();
        
      if (orderError) throw orderError;
      
      // Split order items by store
      const orderItemsToInsert = items.map(item => ({
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
      
      clearCart();
      alert("Order placed successfully!");
      router.push("/");
    } catch (error) {
      console.error("Checkout failed:", error);
      alert("Checkout failed. Please try again.");
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
          {items.map((item) => (
            <Card key={item.id} className="overflow-hidden">
              <CardContent className="p-4 flex gap-4">
                <div className="h-24 w-20 bg-muted rounded-md flex-shrink-0">
                  {item.imageUrl && <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover rounded-md" />}
                </div>
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
                  <div className="flex items-center space-x-2 mt-4">
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.id, item.quantity - 1)}>
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-8 text-center font-medium">{item.quantity}</span>
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="lg:col-span-1">
          <Card className="sticky top-24">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold mb-4">Order Summary</h2>
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>₹{total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Shipping</span>
                  <span>Calculated at checkout</span>
                </div>
              </div>
              <div className="border-t border-border pt-4 mb-6">
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>₹{total.toFixed(2)}</span>
                </div>
              </div>
              <Button className="w-full" size="lg" onClick={handleCheckout} isLoading={isCheckingOut}>
                Proceed to Checkout
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
