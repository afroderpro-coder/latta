"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuthStore } from "@/store/useAuthStore";
import { 
  Loader2, 
  LayoutDashboard, 
  Package, 
  ShoppingBag, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  Store,
  ChevronRight
} from "lucide-react";
import { supabase } from "@/utils/supabase/client";
import { parseStoreBio } from "@/utils/storeMetadata";
import { BrandLoader } from "@/components/ui/BrandLoader";

export default function SellerLayout({ children }: { children: React.ReactNode }) {
  const { profile, isLoading, signOut } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [isVerifyingApproval, setIsVerifyingApproval] = useState(true);

  useEffect(() => {
    async function verifySeller() {
      if (isLoading) return;

      if (!profile) {
        router.push("/auth?role=seller&mode=signin");
        return;
      }

      if (profile.role !== "seller") {
        router.push("/");
        return;
      }

      // Check store approval status
      const { data: storeData } = await supabase
        .from("stores")
        .select("id, bio")
        .eq("seller_id", profile.id)
        .single();

      if (storeData) {
        const meta = parseStoreBio(storeData.bio);

        if (meta.approval_status === "pending") {
          await signOut();
          router.push("/auth?role=seller&mode=signin&status=pending");
          return;
        }

        if (meta.approval_status === "rejected") {
          await signOut();
          router.push("/auth?role=seller&mode=signin&status=rejected");
          return;
        }

        setStoreId(storeData.id);
      }

      setIsVerifyingApproval(false);
    }

    verifySeller();
  }, [isLoading, profile, router, signOut]);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  if (isLoading || isVerifyingApproval || !profile || profile.role !== "seller") {
    return <BrandLoader fullScreen />;
  }

  const navItems = [
    { name: "Dashboard", href: "/seller/dashboard", icon: LayoutDashboard },
    { name: "Products", href: "/seller/products", icon: Package },
    { name: "Orders", href: "/seller/orders", icon: ShoppingBag },
    { name: "Store Settings", href: "/seller/settings", icon: Settings },
  ];

  return (
    <div className="flex min-h-screen bg-muted/30">
      {/* ── Desktop Sidebar ── */}
      <aside className="w-64 border-r border-border bg-card hidden md:flex md:flex-col shrink-0">
        <div className="flex h-16 items-center px-6 border-b border-border justify-between">
          <Link href="/seller/dashboard" className="text-xl font-bold tracking-tighter flex items-center space-x-2">
            <Image src="/logo-emblem.png" alt="AFRODER" width={36} height={18} className="object-contain" />
            <span>AFRODER Seller</span>
          </Link>
        </div>

        <nav className="p-4 space-y-1.5 flex-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/seller/dashboard" && pathname.startsWith(`${item.href}/`));
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="text-sm">{item.name}</span>
              </Link>
            );
          })}

          {storeId && (
            <Link
              href={`/store/${storeId}`}
              className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors mt-2"
            >
              <Store className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">View Storefront</span>
            </Link>
          )}

          <div className="pt-6">
            <button
              onClick={async () => {
                await signOut();
                router.push("/");
              }}
              className="flex w-full items-center space-x-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-red-500/10 hover:text-red-600 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span className="text-sm font-medium">Log out</span>
            </button>
          </div>
        </nav>
      </aside>

      {/* ── Main Content Area ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Top Header */}
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-4 sm:px-6 md:hidden sticky top-0 z-30 shadow-xs">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 -ml-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
            <Link href="/seller/dashboard" className="text-lg font-bold tracking-tight flex items-center space-x-2">
              <Image src="/logo-emblem.png" alt="AFRODER" width={32} height={16} className="object-contain" />
              <span>AFRODER Seller</span>
            </Link>
          </div>

          {storeId && (
            <Link
              href={`/store/${storeId}`}
              className="text-xs font-semibold bg-primary/10 text-primary px-3 py-1.5 rounded-full flex items-center gap-1"
            >
              <Store className="h-3.5 w-3.5" />
              <span>Store</span>
            </Link>
          )}
        </header>

        {/* Mobile Slide-Out Drawer Overlay */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/60 z-40 backdrop-blur-xs md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Mobile Slide-Out Drawer */}
        <div
          className={`fixed inset-y-0 left-0 w-72 bg-card border-r border-border z-50 p-6 flex flex-col justify-between transform transition-transform duration-300 ease-in-out md:hidden shadow-2xl ${
            mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center space-x-2">
                <Image src="/logo-emblem.png" alt="AFRODER" width={36} height={18} className="object-contain" />
                <span className="text-xl font-bold tracking-tight">AFRODER Seller</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="space-y-1.5">
              {navItems.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/seller/dashboard" && pathname.startsWith(`${item.href}/`));
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-between px-3.5 py-3 rounded-xl transition-all ${
                      isActive
                        ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-4 w-4" />
                      <span className="text-sm">{item.name}</span>
                    </div>
                    <ChevronRight className="h-4 w-4 opacity-50" />
                  </Link>
                );
              })}

              {storeId && (
                <Link
                  href={`/store/${storeId}`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between px-3.5 py-3 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-all mt-3 border border-border/60"
                >
                  <div className="flex items-center gap-3">
                    <Store className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">View Public Store</span>
                  </div>
                  <ChevronRight className="h-4 w-4 opacity-50" />
                </Link>
              )}
            </nav>
          </div>

          <div className="pt-6 border-t border-border">
            <button
              onClick={async () => {
                setMobileMenuOpen(false);
                await signOut();
                router.push("/");
              }}
              className="flex w-full items-center gap-3 px-3.5 py-3 rounded-xl text-red-600 bg-red-500/10 hover:bg-red-500/20 font-medium text-sm transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>Log out</span>
            </button>
          </div>
        </div>

        {/* Content with padding at bottom for the mobile bottom nav bar */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 md:pb-8 overflow-auto">
          {children}
        </main>

        {/* ── Mobile Bottom Navigation Bar (Always Visible on Phone Screens) ── */}
        <nav className="fixed bottom-0 left-0 right-0 z-30 bg-card/95 backdrop-blur-md border-t border-border md:hidden flex items-center justify-around h-16 px-1 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/seller/dashboard" && pathname.startsWith(`${item.href}/`));
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-lg transition-colors ${
                  isActive
                    ? "text-primary font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <div className={`p-1 rounded-lg transition-transform ${isActive ? "scale-110 bg-primary/10" : ""}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-[64px]">
                  {item.name === "Store Settings" ? "Settings" : item.name}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
