"use client";

import React, { useState } from "react";
import { supabase } from "@/utils/supabase/client";
import { X, Lock, Sparkles, CheckCircle2, ShoppingBag } from "lucide-react";
import Image from "next/image";

interface GoogleLoginPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  actionText?: string; // e.g. "add items to cart" or "proceed with purchase"
  redirectUrl?: string;
}

export function GoogleLoginPromptModal({
  isOpen,
  onClose,
  actionText = "continue shopping",
  redirectUrl,
}: GoogleLoginPromptModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const origin =
        typeof window !== "undefined" ? window.location.origin : "https://afroder.shop";
      const targetPath =
        redirectUrl ||
        (typeof window !== "undefined" ? window.location.pathname + window.location.search : "/");
      const cleanPath = targetPath.startsWith("/") ? targetPath : `/${targetPath}`;
      const redirectTo = `${origin}${cleanPath}`;

      const { error: googleError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (googleError) throw googleError;
    } catch (err: any) {
      console.error("Google sign in error:", err);
      setError(err.message || "Failed to initiate Google sign in. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-card border border-border rounded-2xl p-6 sm:p-7 shadow-2xl text-center space-y-5 animate-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Brand Emblem */}
        <div className="flex flex-col items-center pt-2">
          <div className="relative w-24 h-12 mb-2">
            <Image
              src="/logo-emblem.png"
              alt="AFRODER"
              fill
              className="object-contain"
              priority
            />
          </div>
          <span className="text-[10px] font-extrabold uppercase tracking-widest bg-primary/10 text-primary border border-primary/20 px-2.5 py-0.5 rounded-full">
            Customer Account Required
          </span>
        </div>

        {/* Title & Copy */}
        <div className="space-y-1.5">
          <h3 className="text-xl font-bold tracking-tight text-foreground">
            Sign In with Google
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Please sign in with your Gmail to <span className="text-foreground font-semibold">{actionText}</span>. Your cart, orders, and delivery updates will be saved to your account.
          </p>
        </div>

        {/* Value Points */}
        <div className="p-3.5 rounded-xl bg-secondary/40 border border-border text-left space-y-2 text-xs">
          <div className="flex items-center gap-2 text-foreground font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>Saved cart & instant checkout</span>
          </div>
          <div className="flex items-center gap-2 text-foreground font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>Real-time delivery dates & order tracking</span>
          </div>
          <div className="flex items-center gap-2 text-foreground font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>Secure 1-tap Google Authentication</span>
          </div>
        </div>

        {error && (
          <div className="p-2.5 rounded-lg text-xs font-medium bg-destructive/10 text-destructive border border-destructive/20">
            {error}
          </div>
        )}

        {/* Google Sign In Button */}
        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 bg-white text-zinc-900 hover:bg-zinc-100 active:scale-[0.99] border border-zinc-200 h-12 px-4 rounded-xl font-semibold text-sm shadow-sm transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-900 border-t-transparent" />
            ) : (
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span>{isLoading ? "Signing in..." : "Continue with Google"}</span>
          </button>

          <p className="text-[11px] text-muted-foreground flex items-center justify-center gap-1.5 pt-1">
            <Lock className="w-3 h-3 text-muted-foreground/70" />
            <span>Fast, safe & encrypted login</span>
          </p>
        </div>
      </div>
    </div>
  );
}
