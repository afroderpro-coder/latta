"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { supabase } from "@/utils/supabase/client";
import { Card, CardContent } from "@/components/ui/Card";
import { 
  Loader2, 
  ShoppingBag, 
  User, 
  Phone, 
  MapPin, 
  Calendar, 
  Clock, 
  CheckCircle, 
  Truck, 
  PackageCheck, 
  XCircle, 
  MessageCircle, 
  ExternalLink 
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { parseStoreBio, serializeStoreBio, StoreOrder, StoreMetadata } from "@/utils/storeMetadata";

export default function SellerOrdersPage() {
  const { profile } = useAuthStore();
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [store, setStore] = useState<any>(null);
  const [storeMeta, setStoreMeta] = useState<StoreMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  useEffect(() => {
    async function loadOrders() {
      if (!profile) return;
      try {
        const { data: storeData } = await supabase
          .from("stores")
          .select("id, shop_name, bio")
          .eq("seller_id", profile.id)
          .single();

        if (!storeData) {
          setIsLoading(false);
          return;
        }

        setStore(storeData);
        const parsed = parseStoreBio(storeData.bio);
        setStoreMeta(parsed);
        setOrders(parsed.orders || []);
      } catch (err) {
        console.error("Failed to load orders:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadOrders();
  }, [profile]);

  const updateOrderStatus = async (orderId: string, newStatus: StoreOrder["status"]) => {
    if (!store || !storeMeta) return;

    try {
      const updatedOrders = orders.map((o) =>
        o.id === orderId ? { ...o, status: newStatus } : o
      );

      const updatedMeta: StoreMetadata = {
        ...storeMeta,
        orders: updatedOrders,
      };

      const { error } = await supabase
        .from("stores")
        .update({ bio: serializeStoreBio(updatedMeta) })
        .eq("id", store.id);

      if (error) throw error;

      setOrders(updatedOrders);
      setStoreMeta(updatedMeta);
    } catch (err: any) {
      alert("Failed to update status: " + (err.message || "Please try again"));
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "processing":
        return <span className="bg-blue-500/10 text-blue-600 border border-blue-500/30 text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1"><Clock className="h-3 w-3" /> Processing</span>;
      case "shipped":
        return <span className="bg-purple-500/10 text-purple-600 border border-purple-500/30 text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1"><Truck className="h-3 w-3" /> Shipped</span>;
      case "delivered":
        return <span className="bg-green-500/10 text-green-600 border border-green-500/30 text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Delivered</span>;
      case "cancelled":
        return <span className="bg-gray-500/10 text-gray-600 border border-gray-500/30 text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1"><XCircle className="h-3 w-3" /> Cancelled</span>;
      case "pending":
      default:
        return <span className="bg-amber-500/10 text-amber-600 border border-amber-500/30 text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1"><Clock className="h-3 w-3" /> New Order</span>;
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (filterStatus === "all") return true;
    return o.status === filterStatus;
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="animate-spin text-primary h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
          <p className="text-muted-foreground">Manage your incoming customer orders and shipments.</p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 bg-muted p-1 rounded-lg text-xs overflow-x-auto scrollbar-none">
          {["all", "pending", "processing", "shipped", "delivered"].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 rounded-md font-medium capitalize transition-all cursor-pointer ${
                filterStatus === status
                  ? "bg-card text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-20 text-center border-dashed">
          <CardContent className="space-y-3">
            <ShoppingBag className="h-12 w-12 text-muted-foreground/30 mx-auto" />
            <h3 className="font-bold text-lg text-foreground">
              {filterStatus === "all" ? "No Orders Yet" : `No ${filterStatus} orders`}
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              When customers checkout with items from your store, their orders will appear here automatically with full buyer and item details.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const cleanPhone = order.customer_phone ? order.customer_phone.replace(/[^0-9]/g, "") : "";
            const waLink = cleanPhone ? `https://wa.me/${cleanPhone.length === 10 ? "91" + cleanPhone : cleanPhone}` : null;
            const callLink = cleanPhone ? `tel:${cleanPhone}` : null;

            return (
              <Card key={order.id} className="overflow-hidden border-border shadow-sm hover:shadow transition-shadow">
                {/* Header bar */}
                <div className="bg-muted/40 p-4 border-b border-border flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-bold text-foreground font-mono">#{order.id}</span>
                    <span className="text-muted-foreground/60">•</span>
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(order.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    {getStatusBadge(order.status || "pending")}
                    <span className="font-bold text-base text-foreground">
                      ₹{order.total_amount?.toFixed(2)}
                    </span>
                  </div>
                </div>

                <CardContent className="p-5 space-y-4">
                  {/* Customer Info Box */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3.5 rounded-xl bg-card border border-border/80 text-xs sm:text-sm">
                    <div className="space-y-1">
                      <div className="font-semibold text-foreground flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-primary" />
                        <span>{order.customer_name}</span>
                      </div>
                      <div className="text-muted-foreground flex items-center gap-2 pt-0.5">
                        <Phone className="h-3 w-3" />
                        <span>{order.customer_phone}</span>
                        {waLink && (
                          <a
                            href={waLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-green-600 hover:underline flex items-center gap-0.5 text-xs font-semibold ml-2"
                            title="Chat with buyer on WhatsApp"
                          >
                            <MessageCircle className="h-3 w-3" /> WhatsApp
                          </a>
                        )}
                        {callLink && (
                          <a
                            href={callLink}
                            className="text-primary hover:underline text-xs font-semibold ml-1"
                          >
                            Call
                          </a>
                        )}
                      </div>
                    </div>

                    {order.delivery_address && (
                      <div className="space-y-1 md:border-l md:border-border md:pl-4">
                        <div className="font-semibold text-foreground flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-primary" />
                          <span>Delivery Address</span>
                        </div>
                        <p className="text-muted-foreground line-clamp-2">
                          {order.delivery_address}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Items list */}
                  <div className="space-y-2.5 pt-1">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Items in this Order ({order.items?.length || 0})
                    </h4>
                    <div className="divide-y divide-border/60">
                      {order.items?.map((item, idx) => (
                        <div key={idx} className="py-2.5 flex items-center justify-between gap-3 first:pt-0 last:pb-0">
                          <div className="flex items-center gap-3">
                            <div className="h-12 w-10 rounded-md bg-muted overflow-hidden flex-shrink-0">
                              {item.image_url ? (
                                <img src={item.image_url} alt={item.product_title} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-[9px] text-muted-foreground">No img</div>
                              )}
                            </div>
                            <div>
                              <Link
                                href={`/product/${item.product_id}`}
                                className="font-semibold text-sm hover:underline hover:text-primary flex items-center gap-1"
                              >
                                <span>{item.product_title}</span>
                                <ExternalLink className="h-3 w-3 opacity-60" />
                              </Link>
                              <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                                {item.size && (
                                  <span className="bg-muted px-1.5 py-0.5 rounded text-[10px] font-medium">
                                    Size: {item.size}
                                  </span>
                                )}
                                <span>Qty: {item.quantity}</span>
                                <span>•</span>
                                <span>₹{item.price?.toFixed(2)} each</span>
                              </div>
                            </div>
                          </div>

                          <span className="font-semibold text-sm text-foreground">
                            ₹{(item.price * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-3 border-t border-border flex flex-wrap items-center justify-between gap-3">
                    <span className="text-xs text-muted-foreground">Change Status:</span>
                    <div className="flex items-center gap-2 flex-wrap">
                      {order.status !== "processing" && order.status !== "delivered" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateOrderStatus(order.id, "processing")}
                          className="text-xs h-8"
                        >
                          Mark Processing
                        </Button>
                      )}
                      {order.status !== "shipped" && order.status !== "delivered" && (
                        <Button
                          size="sm"
                          onClick={() => updateOrderStatus(order.id, "shipped")}
                          className="text-xs h-8 bg-purple-600 hover:bg-purple-700 text-white"
                        >
                          Mark Shipped
                        </Button>
                      )}
                      {order.status !== "delivered" && (
                        <Button
                          size="sm"
                          onClick={() => updateOrderStatus(order.id, "delivered")}
                          className="text-xs h-8 bg-green-600 hover:bg-green-700 text-white"
                        >
                          Mark Delivered
                        </Button>
                      )}
                      {order.status !== "cancelled" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => updateOrderStatus(order.id, "cancelled")}
                          className="text-xs h-8 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
