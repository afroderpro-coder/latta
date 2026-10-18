"use client";

import React, { useEffect } from "react";
import { useCartStore } from "@/store/useCartStore";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ShoppingBag, X, ArrowRight } from "lucide-react";
import Link from "next/link";

export function CartToast() {
  const { toast, hideToast } = useCartStore();

  useEffect(() => {
    if (!toast.show) return;

    const timer = setTimeout(() => {
      hideToast();
    }, 3800);

    return () => clearTimeout(timer);
  }, [toast.show, toast.message, hideToast]);

  return (
    <AnimatePresence>
      {toast.show && (
        <motion.div
          initial={{ opacity: 0, y: -40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -25, scale: 0.95 }}
          transition={{ type: "spring", damping: 25, stiffness: 350 }}
          className="fixed top-4 sm:top-6 left-1/2 -translate-x-1/2 z-[99999] w-[94%] max-w-md"
        >
          {/* Bitter light green popup box */}
          <div
            className="rounded-2xl border-2 border-[#86efac] bg-[#e6f7ec] text-[#14532d] p-3.5 sm:p-4 shadow-2xl shadow-green-950/15 backdrop-blur-md"
            style={{
              backgroundColor: "#e6f7ec",
              borderColor: "#86efac",
            }}
          >
            <div className="flex items-start gap-3">
              {/* Checkmark icon badge */}
              <div className="h-9 w-9 rounded-full bg-[#16a34a] text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-green-700/20 mt-0.5">
                <Check className="h-5 w-5 stroke-[2.5]" />
              </div>

              {/* Text & Content */}
              <div className="flex-1 min-w-0 pr-1">
                <div className="flex items-center gap-1.5">
                  <h4 className="font-bold text-sm sm:text-base tracking-tight text-[#14532d]">
                    {toast.message || "Added to cart successfully !!"}
                  </h4>
                </div>

                {/* Item Details (if provided) */}
                {toast.item?.name && (
                  <div className="mt-2 flex items-center gap-2.5 bg-white/70 border border-[#86efac]/70 rounded-xl p-2">
                    {toast.item.imageUrl ? (
                      <img
                        src={toast.item.imageUrl}
                        alt={toast.item.name}
                        className="h-10 w-10 rounded-lg object-cover border border-[#86efac] flex-shrink-0"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0 text-green-700">
                        <ShoppingBag className="h-5 w-5" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-[#14532d] truncate">
                        {toast.item.name}
                      </p>
                      <p className="text-[11px] font-bold text-[#166534]">
                        ₹{toast.item.price}
                      </p>
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                <div className="mt-2.5 flex items-center gap-2">
                  <Link
                    href="/cart"
                    onClick={hideToast}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#166534] hover:bg-[#14532d] text-white text-xs font-bold transition-all shadow-sm active:scale-95"
                  >
                    View Cart
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>

                  <button
                    type="button"
                    onClick={hideToast}
                    className="text-xs font-medium text-[#166534] hover:text-[#14532d] px-2.5 py-1.5 rounded-lg hover:bg-black/5 transition"
                  >
                    Continue Shopping
                  </button>
                </div>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={hideToast}
                className="p-1 rounded-lg text-[#166534] hover:text-[#14532d] hover:bg-black/5 transition-colors -mr-1 -mt-1"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
