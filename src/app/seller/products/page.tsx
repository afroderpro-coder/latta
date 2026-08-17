"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/useAuthStore";
import { supabase } from "@/utils/supabase/client";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Plus, Edit, Trash, Loader2 } from "lucide-react";

export default function SellerProductsPage() {
  const { profile } = useAuthStore();
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadProducts() {
      if (!profile) return;
      const { data: store } = await supabase.from("stores").select("id").eq("seller_id", profile.id).single();
      if (!store) {
        setIsLoading(false);
        return;
      }

      const { data } = await supabase
        .from("products")
        .select("*")
        .eq("store_id", store.id)
        .order("created_at", { ascending: false });
      
      if (data) setProducts(data);
      setIsLoading(false);
    }
    loadProducts();
  }, [profile]);

  const handleDelete = async (productId: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    
    // Optimistic update
    const previousProducts = [...products];
    setProducts(products.filter((p) => p.id !== productId));
    
    const { error } = await supabase.from("products").delete().eq("id", productId);
    
    if (error) {
      console.error("Failed to delete product:", error);
      alert("Failed to delete product. Please try again.");
      setProducts(previousProducts); // Revert on failure
    }
  };

  if (isLoading) {
    return <div className="flex h-40 items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Products</h1>
          <p className="text-muted-foreground">Manage your apparel inventory.</p>
        </div>
        <Link href="/seller/products/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Add Product
          </Button>
        </Link>
      </div>

      {products.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-12">
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-4">You haven't added any products yet.</p>
            <Link href="/seller/products/new">
              <Button variant="outline">Create your first product</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <Card key={product.id} className="overflow-hidden">
              <div className="aspect-video w-full bg-muted overflow-hidden">
                {product.image_urls?.[0] ? (
                  <img src={product.image_urls[0]} alt={product.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">No Image</div>
                )}
              </div>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{product.title}</h3>
                    <p className="text-sm text-muted-foreground">₹{product.price}</p>
                  </div>
                  <div className="flex space-x-2">
                    <Link href={`/seller/products/edit/${product.id}`}>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                      onClick={() => handleDelete(product.id)}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
