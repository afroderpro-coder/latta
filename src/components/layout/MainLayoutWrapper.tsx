"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { CartToast } from "@/components/ui/CartToast";

export function MainLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isSellerRoute = pathname?.startsWith("/seller");

  return (
    <>
      <CartToast />
      {!isSellerRoute && <Navbar />}
      <main className="flex-1 flex flex-col">{children}</main>
      {!isSellerRoute && <Footer />}
    </>
  );
}
