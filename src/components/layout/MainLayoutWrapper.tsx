"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { CartToast } from "@/components/ui/CartToast";
import { PageTransitionLoader } from "@/components/ui/PageTransitionLoader";

export function MainLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isSellerRoute = pathname?.startsWith("/seller");

  return (
    <>
      <Suspense fallback={null}>
        <PageTransitionLoader />
      </Suspense>
      <CartToast />
      {!isSellerRoute && <Navbar />}
      <main className="flex-1 flex flex-col">{children}</main>
      {!isSellerRoute && <Footer />}
    </>
  );
}

