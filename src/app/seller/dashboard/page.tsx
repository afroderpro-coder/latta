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
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalOrders: 0,
    totalRevenue: 0,
  });

  useEffect(() => {
    async function loadStats() {
      setIsLoading(true);
      try {
        const { data: authData } = await supabase.auth.getUser();
        const currentUserId = profile?.id || authData?.user?.id;
        if (!currentUserId) {
          setIsLoading(false);
          return;
        }

        const { data: stores } = await supabase
          .from("stores")
          .select("id, bio")
          .eq("seller_id", currentUserId)
          .order("created_at", { ascending: false });

        if (!stores || stores.length === 0) {
          setIsLoading(false);
          return;
        }

        const store = stores.find((s) => s.bio && s.bio.trim() !== "") || stores[0];
        const storeIds = stores.map((s) => s.id);

        const { count: productCount } = await supabase
          .from("products")
          .select("*", { count: 'exact', head: true })
          .in("store_id", storeIds);

        // Load orders from store metadata
        const meta = parseStoreBio(store.bio);
        const orders = meta.orders || [];

        let revenue = 0;
        let orderCount = orders.length;

        if (orders.length > 0) {
          revenue = orders.reduce((acc, order) => acc + (order.total_amount || 0), 0);
        } else {
          // Fallback check order_items table if it ever exists
          try {
            const { data: orderItems } = await supabase
              .from("order_items")
              .select("quantity, unit_price")
              .eq("store_id", store.id);

            if (orderItems && orderItems.length > 0) {
              revenue = orderItems.reduce((acc, item) => acc + (item.quantity * item.unit_price), 0);
              orderCount = orderItems.length;
            }
          } catch {
            // ignore
          }
        }

        setStats({
          totalProducts: productCount || 0,
          totalOrders: orderCount,
          totalRevenue: revenue,
        });
      } catch (err) {
        console.error("Failed to load seller stats:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadStats();
  }, [profile]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your store&apos;s performance.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center gap-2 py-1">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="text-xs text-muted-foreground animate-pulse font-medium">Calculating...</span>
              </div>
            ) : (
              <div className="text-2xl font-bold font-mono">₹{stats.totalRevenue.toFixed(2)}</div>
            )}
          </CardContent>
        </Card>
        
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center gap-2 py-1">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="text-xs text-muted-foreground animate-pulse font-medium">Loading...</span>
              </div>
            ) : (
              <div className="text-2xl font-bold font-mono">{stats.totalOrders}</div>
            )}
          </CardContent>
        </Card>
        
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center gap-2 py-1">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="text-xs text-muted-foreground animate-pulse font-medium">Loading...</span>
              </div>
            ) : (
              <div className="text-2xl font-bold font-mono">{stats.totalProducts}</div>
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
