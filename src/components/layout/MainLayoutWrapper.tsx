"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export function MainLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isSellerRoute = pathname?.startsWith("/seller");

  return (
    <>
      {!isSellerRoute && <Navbar />}
      <main className="flex-1 flex flex-col">{children}</main>
      {!isSellerRoute && <Footer />}
    </>
  );
}
