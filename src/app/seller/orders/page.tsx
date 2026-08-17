"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { supabase } from "@/utils/supabase/client";
import { Card, CardContent } from "@/components/ui/Card";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function SellerOrdersPage() {
  const { profile } = useAuthStore();
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadOrders() {
      if (!profile) return;
      const { data: store } = await supabase.from("stores").select("id").eq("seller_id", profile.id).single();
      if (!store) {
        setIsLoading(false);
        return;
      }

      // Fetch order items for this store, joining with products and master orders
      const { data } = await supabase
        .from("order_items")
        .select(`
          id,
          quantity,
          unit_price,
          fulfillment_status,
          created_at,
          products ( title ),
          orders ( shipping_address, payment_status, buyer_id )
        `)
        .eq("store_id", store.id)
        .order("created_at", { ascending: false });
      
      if (data) setOrders(data);
      setIsLoading(false);
    }
    loadOrders();
  }, [profile]);

  const updateStatus = async (orderItemId: string, newStatus: string) => {
    const { error } = await supabase
      .from("order_items")
      .update({ fulfillment_status: newStatus })
      .eq("id", orderItemId);
      
    if (!error) {
      setOrders(orders.map(o => o.id === orderItemId ? { ...o, fulfillment_status: newStatus } : o));
    }
  };

  if (isLoading) {
    return <div className="flex h-40 items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
        <p className="text-muted-foreground">Manage your incoming orders and fulfillments.</p>
      </div>

      {orders.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-12">
          <CardContent className="text-center">
            <p className="text-muted-foreground">You have no orders yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-6 flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                  <h3 className="font-semibold text-lg">{item.products?.title}</h3>
                  <div className="text-sm text-muted-foreground space-y-1 mt-1">
                    <p>Quantity: {item.quantity}</p>
                    <p>Total: ₹{(item.quantity * item.unit_price).toFixed(2)}</p>
                    <p>Status: <span className="capitalize font-medium text-primary">{item.fulfillment_status}</span></p>
                  </div>
                </div>
                <div className="flex flex-col space-y-2 min-w-[140px]">
                  {item.fulfillment_status === 'processing' && (
                    <Button size="sm" onClick={() => updateStatus(item.id, 'shipped')}>Mark Shipped</Button>
                  )}
                  {item.fulfillment_status === 'shipped' && (
                    <Button size="sm" onClick={() => updateStatus(item.id, 'delivered')}>Mark Delivered</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
