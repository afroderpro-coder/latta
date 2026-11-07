"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/useAuthStore";
import { supabase } from "@/utils/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Package, ShoppingBag, DollarSign, Settings, Loader2 } from "lucide-react";

import { parseStoreBio } from "@/utils/storeMetadata";

export default function SellerDashboardPage() {
  const { profile } = useAuthStore();

  // Real independent loading state for each metric
  const [loadingRevenue, setLoadingRevenue] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);

  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalProducts, setTotalProducts] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      setLoadingRevenue(true);
      setLoadingOrders(true);
      setLoadingProducts(true);

      const { data: authData } = await supabase.auth.getUser();
      const currentUserId = profile?.id || authData?.user?.id;
      if (!currentUserId) {
        if (isMounted) {
          setLoadingRevenue(false);
          setLoadingOrders(false);
          setLoadingProducts(false);
        }
        return;
      }

      const { data: stores } = await supabase
        .from("stores")
        .select("id, bio")
        .eq("seller_id", currentUserId)
        .order("created_at", { ascending: false });

      if (!stores || stores.length === 0) {
        if (isMounted) {
          setLoadingRevenue(false);
          setLoadingOrders(false);
          setLoadingProducts(false);
        }
        return;
      }

      const store = stores.find((s) => s.bio && s.bio.trim() !== "") || stores[0];
      const storeIds = stores.map((s) => s.id);

      // ── Task 1: Load Products Count (Direct database query - finishes independently) ──
      (async () => {
        try {
          const { count: productCount } = await supabase
            .from("products")
            .select("*", { count: "exact", head: true })
            .in("store_id", storeIds);

          if (isMounted) {
            setTotalProducts(productCount || 0);
            setLoadingProducts(false);
          }
        } catch (e) {
          console.error("Products count error:", e);
          if (isMounted) setLoadingProducts(false);
        }
      })();

      // ── Task 2: Load Orders Count Independently ──
      (async () => {
        try {
          const meta = parseStoreBio(store.bio);
          const orders = meta.orders || [];

          if (isMounted) {
            setTotalOrders(orders.length);
            setLoadingOrders(false);
          }

          // ── Task 3: Calculate Revenue Independently ──
          setTimeout(async () => {
            try {
              let rev = 0;
              if (orders.length > 0) {
                rev = orders.reduce((acc, order) => acc + (order.total_amount || 0), 0);
              } else {
                const { data: orderItems } = await supabase
                  .from("order_items")
                  .select("quantity, unit_price")
                  .eq("store_id", store.id);

                if (orderItems && orderItems.length > 0) {
                  rev = orderItems.reduce((acc, item) => acc + item.quantity * item.unit_price, 0);
                }
              }

              if (isMounted) {
                setTotalRevenue(rev);
                setLoadingRevenue(false);
              }
            } catch (err) {
              console.error("Revenue calculation error:", err);
              if (isMounted) setLoadingRevenue(false);
            }
          }, 160);
        } catch (e) {
          console.error("Orders count error:", e);
          if (isMounted) {
            setLoadingOrders(false);
            setLoadingRevenue(false);
          }
        }
      })();
    }

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, [profile]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your store&apos;s performance.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {/* Total Revenue */}
        <Card className="overflow-hidden border-border/80 shadow-xs hover:shadow-sm transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <DollarSign className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            {loadingRevenue ? (
              <div className="flex items-center gap-2 py-1">
                <Loader2 className="h-5 w-5 animate-spin text-emerald-500" />
                <span className="text-xs text-muted-foreground animate-pulse font-medium">Calculating revenue...</span>
              </div>
            ) : (
              <div className="text-2xl font-bold font-mono text-foreground animate-in fade-in zoom-in-95 duration-200">
                ₹{totalRevenue.toFixed(2)}
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Total Orders */}
        <Card className="overflow-hidden border-border/80 shadow-xs hover:shadow-sm transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <div className="w-8 h-8 rounded-full bg-purple-500/10 text-purple-600 flex items-center justify-center">
              <ShoppingBag className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            {loadingOrders ? (
              <div className="flex items-center gap-2 py-1">
                <Loader2 className="h-5 w-5 animate-spin text-purple-500" />
                <span className="text-xs text-muted-foreground animate-pulse font-medium">Fetching orders...</span>
              </div>
            ) : (
              <div className="text-2xl font-bold font-mono text-foreground animate-in fade-in zoom-in-95 duration-200">
                {totalOrders}
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Active Products */}
        <Card className="overflow-hidden border-border/80 shadow-xs hover:shadow-sm transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Products</CardTitle>
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <Package className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            {loadingProducts ? (
              <div className="flex items-center gap-2 py-1">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="text-xs text-muted-foreground animate-pulse font-medium">Scanning catalog...</span>
              </div>
            ) : (
              <div className="text-2xl font-bold font-mono text-foreground animate-in fade-in zoom-in-95 duration-200">
                {totalProducts}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-semibold tracking-tight mb-4">Quick Actions</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Link href="/seller/products/new">
            <div className="flex flex-col items-center justify-center p-6 border border-border rounded-xl bg-card hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer text-center space-y-3">
              <div className="p-3 bg-primary/10 rounded-full text-primary">
                <Package className="h-6 w-6" />
              </div>
              <div>
                <div className="font-medium">Add New Product</div>
                <div className="text-xs text-muted-foreground mt-1">List a new item for sale</div>
              </div>
            </div>
          </Link>
          <Link href="/seller/settings">
            <div className="flex flex-col items-center justify-center p-6 border border-border rounded-xl bg-card hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer text-center space-y-3">
              <div className="p-3 bg-primary/10 rounded-full text-primary">
                <Settings className="h-6 w-6" />
              </div>
              <div>
                <div className="font-medium">Manage Profile</div>
                <div className="text-xs text-muted-foreground mt-1">Update store settings</div>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
