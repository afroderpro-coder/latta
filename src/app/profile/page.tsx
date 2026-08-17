"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { User, Mail, Settings, ShoppingBag, LogOut } from "lucide-react";

export default function ProfilePage() {
  const { profile, user, isLoading, signOut } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-12">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
          <p className="text-muted-foreground">Manage your account settings and preferences.</p>
        </div>
        <Button 
          variant="destructive" 
          onClick={async () => {
            await signOut();
            router.push("/");
          }}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Personal Info */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Your basic account details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-3 text-sm">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <User className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">Full Name</p>
                <p className="text-muted-foreground">{profile?.full_name || "Not provided"}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 text-sm">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">Email Address</p>
                <p className="text-muted-foreground">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 text-sm">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Settings className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">Account Role</p>
                <p className="text-muted-foreground capitalize">{profile?.role || "Client"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Order History (Placeholder for clients) */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Order History</CardTitle>
            <CardDescription>View your recent purchases</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
              <ShoppingBag className="mb-4 h-10 w-10 text-muted-foreground" />
              <h3 className="mb-1 font-medium">No orders yet</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                When you buy something, it will appear here.
              </p>
              <Button onClick={() => router.push("/shop")} variant="outline">
                Start Shopping
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
