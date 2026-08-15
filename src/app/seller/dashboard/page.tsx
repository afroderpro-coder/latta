"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { supabase } from "@/utils/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Package, ShoppingBag, DollarSign } from "lucide-react";

export default function SellerDashboardPage() {
  const { profile } = useAuthStore();
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalOrders: 0,
    totalRevenue: 0,
  });

  useEffect(() => {
    async function loadStats() {
      if (!profile) return;
      
      const { data: store } = await supabase.from("stores").select("id").eq("seller_id", profile.id).single();
      if (!store) return;

      const { count: productCount } = await supabase
        .from("products")
        .select("*", { count: 'exact', head: true })
        .eq("store_id", store.id);

      const { data: orderItems } = await supabase
        .from("order_items")
        .select("quantity, unit_price")
        .eq("store_id", store.id);

      let revenue = 0;
      let orderCount = orderItems?.length || 0;
      
      if (orderItems) {
        revenue = orderItems.reduce((acc, item) => acc + (item.quantity * item.unit_price), 0);
      }

      setStats({
        totalProducts: productCount || 0,
        totalOrders: orderCount,
        totalRevenue: revenue,
      });
    }

    loadStats();
  }, [profile]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your store's performance.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalRevenue.toFixed(2)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrders}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProducts}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
