"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/useAuthStore";
import { Loader2, LayoutDashboard, Package, ShoppingBag, Settings, LogOut } from "lucide-react";

export default function SellerLayout({ children }: { children: React.ReactNode }) {
  const { profile, isLoading, signOut } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading) {
      if (!profile) {
        router.push("/auth?mode=signin");
      } else if (profile.role !== "seller") {
        router.push("/"); // redirect client to home
      }
    }
  }, [isLoading, profile, router]);

  if (isLoading || !profile || profile.role !== "seller") {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const navItems = [
    { name: "Dashboard", href: "/seller/dashboard", icon: LayoutDashboard },
    { name: "Products", href: "/seller/products", icon: Package },
    { name: "Orders", href: "/seller/orders", icon: ShoppingBag },
    { name: "Store Settings", href: "/seller/settings", icon: Settings },
  ];

  return (
    <div className="flex min-h-screen bg-muted/30">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card hidden md:block">
        <div className="flex h-16 items-center px-6 border-b border-border">
          <Link href="/seller/dashboard" className="text-xl font-bold tracking-tighter">
            AFRODER Seller
          </Link>
        </div>
        <nav className="p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center space-x-3 px-3 py-2.5 rounded-md transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="text-sm font-medium">{item.name}</span>
              </Link>
            );
          })}
          
          <button
            onClick={async () => {
              await signOut();
              router.push("/");
            }}
            className="flex w-full items-center space-x-3 px-3 py-2.5 rounded-md text-muted-foreground hover:bg-red-500/10 hover:text-red-500 transition-colors mt-8"
          >
            <LogOut className="h-4 w-4" />
            <span className="text-sm font-medium">Log out</span>
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        <header className="h-16 border-b border-border bg-card flex items-center px-6 md:hidden">
           <Link href="/seller/dashboard" className="text-xl font-bold tracking-tighter">
            AFRODER Seller
          </Link>
        </header>
        <div className="flex-1 p-6 lg:p-8 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
