"use client";

import Link from "next/link";
import Image from "next/image";
import { useAuthStore } from "@/store/useAuthStore";
import { useCartStore } from "@/store/useCartStore";
import { ShoppingBag, User, LogOut, Search, Menu, X, Truck, Store } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { supabase } from "@/utils/supabase/client";
import { parseStoreBio } from "@/utils/storeMetadata";

export function Navbar() {
  const { user, profile, signOut } = useAuthStore();
  const { items } = useCartStore();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [hasSellerStore, setHasSellerStore] = useState(false);

  useEffect(() => {
    async function checkSellerStore() {
      if (!user?.id) {
        setHasSellerStore(false);
        return;
      }
      try {
        const { data } = await supabase
          .from("stores")
          .select("id, bio")
          .eq("seller_id", user.id);

        if (data && data.length > 0) {
          const hasApproved = data.some((s) => {
            const meta = parseStoreBio(s.bio);
            return meta.approval_status === "approved";
          });
          setHasSellerStore(hasApproved);
        } else {
          setHasSellerStore(false);
        }
      } catch {
        setHasSellerStore(false);
      }
    }
    checkSellerStore();
  }, [user?.id]);

  const cartItemCount = items.reduce((acc, item) => acc + item.quantity, 0);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setIsMobileMenuOpen(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-300 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-20 mx-auto items-center justify-between gap-4 md:gap-8 px-4 md:px-8 relative">
        {/* Left: Logo */}
        <div className="flex items-center flex-1 justify-start">
          <Link href="/" className="flex items-center space-x-2.5">
            <Image 
              src="/logo-emblem.png" 
              alt="AFRODER" 
              width={46} 
              height={22} 
              className="object-contain" 
              priority
            />
            <span className="font-bold text-2xl tracking-tighter">AFRODER</span>
          </Link>
        </div>

        {/* Center: Navigation */}
        <div className="hidden md:flex flex-none justify-center">
          <nav className="flex items-center space-x-8 text-sm font-medium text-muted-foreground">
            <Link href="/" className="hover:text-foreground transition-colors tracking-wide">Home</Link>
            <Link href="/shop" className="hover:text-foreground transition-colors tracking-wide">Shop</Link>
            <Link href="/about" className="hover:text-foreground transition-colors tracking-wide">About</Link>
            <Link href="/contact" className="hover:text-foreground transition-colors tracking-wide">Contact Us</Link>
          </nav>
        </div>
        
        {/* Right: Actions */}
        <div className="flex items-center flex-1 justify-end space-x-2 lg:space-x-4">
          <form onSubmit={handleSearch} className="hidden lg:flex relative items-center">
            <Search className="absolute left-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              type="search"
              placeholder="Search stores or items..."
              className="w-[200px] xl:w-[250px] h-9 pl-9 rounded-full bg-secondary/50 border border-slate-300 focus-visible:bg-background focus-visible:border-slate-400 text-sm transition-colors"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </form>

          <Link href="/cart" className="relative">
            <Button variant="ghost" size="icon" className="relative">
              <ShoppingBag className="h-5 w-5 text-black transition-all hover:scale-110" />
              {cartItemCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {cartItemCount}
                </span>
              )}
            </Button>
          </Link>

          {/* Desktop Auth */}
          <div className="hidden md:flex items-center">
            {user ? (
              <div className="flex items-center space-x-1.5 lg:space-x-2.5">
                {/* 1. Customer Orders & Delivery Status (Always goes to /profile) */}
                <Button variant="ghost" size="sm" asChild className="font-semibold text-xs sm:text-sm">
                  <Link href="/profile" className="flex items-center space-x-1.5 text-foreground hover:text-primary">
                    <Truck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="hidden sm:inline-block">My Orders</span>
                  </Link>
                </Button>

                {/* 2. If verified seller with store, show Seller Studio */}
                {hasSellerStore && (
                  <Button variant="outline" size="sm" asChild className="hidden xl:inline-flex text-xs font-semibold rounded-full border-border">
                    <Link href="/seller/dashboard">
                      <Store className="mr-1.5 h-3.5 w-3.5 text-primary" />
                      <span>Seller Studio</span>
                    </Link>
                  </Button>
                )}

                {/* 3. Account / Profile icon */}
                <Button variant="ghost" size="icon" asChild title="Account & Order Tracking">
                  <Link href="/profile">
                    <User className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                  </Link>
                </Button>

                {/* 4. Logout */}
                <Button variant="ghost" size="icon" title="Sign Out" onClick={async () => { await signOut(); router.push('/'); }}>
                  <LogOut className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                </Button>
              </div>
            ) : (
              <Link href="/auth?role=client&redirect=/profile">
                <Button variant="ghost" size="sm" className="font-semibold">Login</Button>
              </Link>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-20 left-0 w-full bg-background border-b border-gray-300 shadow-xl flex flex-col p-6 space-y-6">
          <nav className="flex flex-col space-y-4">
            <Link href="/" className="text-lg font-medium" onClick={() => setIsMobileMenuOpen(false)}>Home</Link>
            <Link href="/shop" className="text-lg font-medium" onClick={() => setIsMobileMenuOpen(false)}>Shop</Link>
            <Link href="/about" className="text-lg font-medium" onClick={() => setIsMobileMenuOpen(false)}>About</Link>
            <Link href="/contact" className="text-lg font-medium" onClick={() => setIsMobileMenuOpen(false)}>Contact Us</Link>
          </nav>
          
          <hr className="border-border" />

          <form onSubmit={handleSearch} className="relative flex items-center">
            <Search className="absolute left-3 h-5 w-5 text-muted-foreground" />
            <Input 
              type="search"
              placeholder="Search..."
              className="w-full h-12 pl-10 rounded-full bg-secondary/50 border-transparent text-base"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </form>

          <div className="flex flex-col space-y-4">
            {user ? (
              <>
                <Link 
                  href="/profile" 
                  className="flex items-center text-lg font-bold text-foreground"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Truck className="mr-3 h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  <span>My Orders & Tracking</span>
                </Link>
                <Link 
                  href="/profile" 
                  className="flex items-center text-base font-medium text-muted-foreground"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <User className="mr-3 h-5 w-5" />
                  <span>Account ({user.email})</span>
                </Link>
                {hasSellerStore && (
                  <Link 
                    href="/seller/dashboard" 
                    className="flex items-center text-base font-semibold text-primary"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Store className="mr-3 h-5 w-5" />
                    <span>Seller Dashboard</span>
                  </Link>
                )}
                <button 
                  onClick={async () => { await signOut(); setIsMobileMenuOpen(false); router.push('/'); }} 
                  className="flex items-center text-base font-medium text-destructive cursor-pointer text-left"
                >
                  <LogOut className="mr-3 h-5 w-5" />
                  Sign Out
                </button>
              </>
            ) : (
              <div className="flex flex-col space-y-3">
                <Link href="/auth?role=client&redirect=/profile" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button className="w-full h-12 text-lg rounded-full" variant="outline">Login with Google</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
