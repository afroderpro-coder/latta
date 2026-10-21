"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/utils/supabase/client";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { parseStoreBio, serializeStoreBio } from "@/utils/storeMetadata";
import {
  Clock,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Store,
  ShieldAlert,
  MessageCircle,
  Phone,
  QrCode,
  Upload,
  Copy,
  Check,
  Sparkles,
  ArrowRight,
  CreditCard,
  FileText,
  Trash2,
  BadgePercent,
  CheckCircle,
} from "lucide-react";

export const normalizePhone = (phone: string): string => {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.length > 10 && (digits.startsWith("91") || digits.startsWith("0"))) {
    return digits.slice(-10);
  }
  return digits;
};

export const phoneToAuthEmail = (phone: string): string => {
  const clean = normalizePhone(phone);
  return `${clean}@phone.afroder.com`;
};

const authSchema = z.object({
  phone: z.string().optional(),
  password: z.string().min(6, "Password must be at least 6 characters."),
  fullName: z.string().optional(),
  shopName: z.string().optional(),
  email: z.string().optional(),
});

type AuthFormValues = z.infer<typeof authSchema>;

export default function AuthPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; mode?: string; status?: string }>;
}) {
  const resolvedParams = use(searchParams);
  const role = resolvedParams.role === "seller" ? "seller" : "client";
  const initialMode = resolvedParams.mode === "signup" ? "signup" : "signin";

  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
  const [error, setError] = useState<string | null>(null);
  const [verificationNotice, setVerificationNotice] = useState<"pending" | "rejected" | null>(
    resolvedParams.status === "pending"
      ? "pending"
      : resolvedParams.status === "rejected"
      ? "rejected"
      : null
  );
  const [isLoading, setIsLoading] = useState(false);

  // Seller Onboarding Multi-step (Step 1: Details, Step 2: Payment & QR Scanner)
  const [sellerStep, setSellerStep] = useState<"details" | "payment">("details");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [utrNumber, setUtrNumber] = useState<string>("");
  const [copiedUPI, setCopiedUPI] = useState(false);

  const [applicationSubmitted, setApplicationSubmitted] = useState<null | {
    sellerName: string;
    shopName: string;
    contactNumber: string;
    email?: string;
    subscriptionPlan?: string;
    paymentReceiptUrl?: string | null;
  }>(null);

  const router = useRouter();
  const initializeAuth = useAuthStore((state) => state.initialize);

  const SELLER_SIGNUP_DRAFT = "afroder_seller_signup_draft";

  const {
    register,
    handleSubmit,
    getValues,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AuthFormValues>({
    resolver: zodResolver(authSchema),
  });

  // 1. Restore seller signup draft if returning from UPI app or page navigation
  useEffect(() => {
    if (role === "seller" && mode === "signup") {
      try {
        const saved = localStorage.getItem(SELLER_SIGNUP_DRAFT);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.fullName) setValue("fullName", parsed.fullName);
          if (parsed.shopName) setValue("shopName", parsed.shopName);
          if (parsed.phone) setValue("phone", parsed.phone);
          if (parsed.email) setValue("email", parsed.email);
          if (parsed.password) setValue("password", parsed.password);
          if (parsed.sellerStep === "payment") setSellerStep("payment");
          if (parsed.receiptPreview) setReceiptPreview(parsed.receiptPreview);
          if (parsed.utrNumber) setUtrNumber(parsed.utrNumber);
        }
      } catch (e) {
        console.warn("Could not restore signup draft:", e);
      }
    }
  }, [role, mode, setValue]);

  // 2. Auto-save seller signup draft
  const watchedAuthValues = watch();

  useEffect(() => {
    if (role === "seller" && mode === "signup") {
      try {
        const draft = {
          fullName: watchedAuthValues.fullName || "",
          shopName: watchedAuthValues.shopName || "",
          phone: watchedAuthValues.phone || "",
          email: watchedAuthValues.email || "",
          password: watchedAuthValues.password || "",
          sellerStep,
          receiptPreview,
          utrNumber,
        };

        const hasContent =
          Boolean(draft.fullName?.trim()) ||
          Boolean(draft.shopName?.trim()) ||
          Boolean(draft.phone?.trim()) ||
          Boolean(draft.receiptPreview) ||
          sellerStep === "payment";

        if (hasContent) {
          localStorage.setItem(SELLER_SIGNUP_DRAFT, JSON.stringify(draft));
        }
      } catch (e) {
        console.warn("Could not auto-save signup draft:", e);
      }
    }
  }, [watchedAuthValues, sellerStep, receiptPreview, utrNumber, role, mode]);

  // Step 1 Validation & Proceed to Step 2 (Scanner & Payment)
  const handleProceedToPayment = () => {
    const values = getValues();
    if (!values.fullName || values.fullName.trim().length < 2) {
      setError("Please enter your name.");
      return;
    }
    if (!values.shopName || values.shopName.trim().length < 2) {
      setError("Please enter your shop/brand name.");
      return;
    }
    const cleanPhone = normalizePhone(values.phone || "");
    if (!cleanPhone || cleanPhone.length < 10) {
      setError("Please enter a valid 10-digit WhatsApp / Mobile number.");
      return;
    }
    if (values.email && values.email.trim() && !values.email.includes("@")) {
      setError("Please enter a valid email address, or leave it blank.");
      return;
    }
    if (!values.password || values.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setError(null);
    setSellerStep("payment");
  };

  // Handle Receipt Image Selection
  const handleReceiptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 8 * 1024 * 1024) {
        setError("Receipt image must be smaller than 8MB.");
        return;
      }
      setReceiptFile(file);
      setError(null);
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCopyUPI = () => {
    navigator.clipboard.writeText("9671016500@upi");
    setCopiedUPI(true);
    setTimeout(() => setCopiedUPI(false), 2000);
  };

  const onSubmit = async (data: AuthFormValues) => {
    setIsLoading(true);
    setError(null);
    setVerificationNotice(null);

    try {
      if (mode === "signup") {
        if (!data.fullName || data.fullName.trim().length < 2) {
          setError("Full name is required for registration.");
          setIsLoading(false);
          return;
        }

        const cleanPhone = normalizePhone(data.phone || "");
        if (!cleanPhone || cleanPhone.length < 10) {
          setError("Please enter a valid 10-digit mobile / phone number.");
          setIsLoading(false);
          return;
        }

        const optionalEmail = data.email?.trim() || "";
        if (optionalEmail && !optionalEmail.includes("@")) {
          setError("Please enter a valid email address or leave it blank.");
          setIsLoading(false);
          return;
        }

        // Seller-specific validation
        if (role === "seller") {
          if (!data.shopName || data.shopName.trim().length < 2) {
            setError("Shop name is required.");
            setIsLoading(false);
            return;
          }
          if (!receiptPreview) {
            setError("Please upload your payment receipt or screenshot to complete verification.");
            setIsLoading(false);
            return;
          }
        }

        const authEmail = phoneToAuthEmail(cleanPhone);

        // 1. Sign up user in Supabase Auth
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: authEmail,
          password: data.password,
          options: {
            data: {
              full_name: data.fullName.trim(),
              phone: cleanPhone,
              contact_number: cleanPhone,
              optional_email: optionalEmail,
              shop_name: data.shopName?.trim() || "",
              role: role,
              approval_status: role === "seller" ? "pending" : "approved",
            },
          },
        });

        if (signUpError) {
          setError(
            signUpError.message.includes("already registered")
              ? "This phone number is already registered. Please login with your password."
              : signUpError.message
          );
          setIsLoading(false);
          return;
        }

        if (signUpData?.user && (!signUpData.user.identities || signUpData.user.identities.length === 0)) {
          setError("This phone number is already registered. Please login instead.");
          setIsLoading(false);
          return;
        }

        const userId = signUpData.user?.id;

        if (userId && role === "seller") {
          // Upload receipt to Supabase storage if file is available, or use data URL fallback
          let finalReceiptUrl = receiptPreview || "";
          if (receiptFile) {
            try {
              const fileExt = receiptFile.name.split(".").pop() || "png";
              const fileName = `receipt-${userId}-${Date.now()}.${fileExt}`;
              const { error: uploadErr } = await supabase.storage
                .from("store_logos")
                .upload(fileName, receiptFile);

              if (!uploadErr) {
                const {
                  data: { publicUrl },
                } = supabase.storage.from("store_logos").getPublicUrl(fileName);
                finalReceiptUrl = publicUrl;
              }
            } catch (storageErr) {
              console.warn("Storage upload fallback to Data URL:", storageErr);
            }
          }

          // 2. Insert into profiles with seller role
          await supabase.from("profiles").upsert({
            id: userId,
            email: optionalEmail || authEmail,
            full_name: data.fullName.trim(),
            role: "seller",
          });

          // 3. Serialize metadata with pending approval status, contact, plan and receipt
          const serializedBio = serializeStoreBio({
            bio: "",
            phone: cleanPhone,
            whatsapp: cleanPhone,
            contact_number: cleanPhone,
            seller_name: data.fullName.trim(),
            seller_email: optionalEmail || authEmail,
            approval_status: "pending",
            applied_at: new Date().toISOString(),
            subscription_plan: "₹39 - 3 Months Promotional Access",
            payment_amount: 39,
            payment_receipt_url: finalReceiptUrl,
            payment_utr: utrNumber.trim() || undefined,
          });

          // 4. Create the store application in stores table
          const { error: storeError } = await supabase.from("stores").insert({
            seller_id: userId,
            shop_name: data.shopName?.trim() || `${data.fullName}'s Store`,
            bio: serializedBio,
          });

          if (storeError) {
            console.error("Store creation error:", storeError);
          }

          // Sign out so seller cannot access dashboard until approved
          await supabase.auth.signOut();
          useAuthStore.getState().setUser(null);
          useAuthStore.getState().setProfile(null);

          // Clear draft upon successful submission
          try {
            localStorage.removeItem(SELLER_SIGNUP_DRAFT);
          } catch (e) {
            console.warn("Could not remove signup draft:", e);
          }

          // 5. Show Welcome / Under Verification screen
          setApplicationSubmitted({
            sellerName: data.fullName,
            shopName: data.shopName || "Your Store",
            contactNumber: cleanPhone,
            email: optionalEmail || "",
            subscriptionPlan: "₹39 - 3 Months Promotional Access",
            paymentReceiptUrl: finalReceiptUrl,
          });
          setIsLoading(false);
          return;
        }

        if (userId && role === "client") {
          // Client signup: insert into profiles
          await supabase.from("profiles").upsert({
            id: userId,
            email: optionalEmail || authEmail,
            full_name: data.fullName.trim(),
            role: "client",
          });

          // Client signup success
          setMode("signin");
          setError("Registration successful! Please login with your phone number and password.");
          setIsLoading(false);
          return;
        }
      } else {
        // Sign In Flow (Both Seller and Client: Phone Number + Password)
        const rawIdentifier = data.phone?.trim() || "";
        if (!rawIdentifier) {
          setError("Please enter your phone number.");
          setIsLoading(false);
          return;
        }

        const isDirectEmail = rawIdentifier.includes("@");
        const cleanPhone = normalizePhone(rawIdentifier);
        const authEmail = isDirectEmail ? rawIdentifier.toLowerCase() : phoneToAuthEmail(cleanPhone);

        // Attempt 1: Sign in with computed email / phone email
        let { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password: data.password,
        });

        // Attempt 2: If phone login failed and input is a phone number, check if this user was created earlier with a legacy Gmail
        if (signInError && !isDirectEmail && cleanPhone) {
          try {
            const { data: stores } = await supabase.from("stores").select("bio");
            if (stores && stores.length > 0) {
              for (const s of stores) {
                if (s.bio && s.bio.includes(cleanPhone)) {
                  const meta = parseStoreBio(s.bio);
                  const linkedPhone = normalizePhone(meta.contact_number || meta.phone || meta.whatsapp || "");
                  if (linkedPhone === cleanPhone && meta.seller_email && meta.seller_email.includes("@")) {
                    const fallbackResult = await supabase.auth.signInWithPassword({
                      email: meta.seller_email,
                      password: data.password,
                    });
                    if (!fallbackResult.error && fallbackResult.data.user) {
                      signInData = fallbackResult.data;
                      signInError = null;
                      break;
                    }
                  }
                }
              }
            }
          } catch (fallbackErr) {
            console.warn("Store fallback check error:", fallbackErr);
          }
        }

        if (signInError) {
          setError(
            signInError.message.includes("Invalid login credentials")
              ? "Invalid phone number or password. Please verify your details."
              : signInError.message
          );
          setIsLoading(false);
          return;
        }

        await initializeAuth();

        const profile = useAuthStore.getState().profile;
        const actualRole = profile?.role || "client";

        if (actualRole !== role) {
          await supabase.auth.signOut();
          useAuthStore.getState().setUser(null);
          useAuthStore.getState().setProfile(null);

          if (role === "client") {
            setError("This phone number is registered as a Seller. Please use the Seller login portal.");
          } else {
            setError("This phone number is registered as a Client. Please use the Customer login portal.");
          }
          setIsLoading(false);
          return;
        }

        // Seller approval check
        if (actualRole === "seller" && signInData.user) {
          const { data: storeData } = await supabase
            .from("stores")
            .select("id, bio, shop_name")
            .eq("seller_id", signInData.user.id)
            .single();

          if (storeData) {
            const meta = parseStoreBio(storeData.bio);

            if (meta.approval_status === "pending") {
              await supabase.auth.signOut();
              useAuthStore.getState().setUser(null);
              useAuthStore.getState().setProfile(null);
              setVerificationNotice("pending");
              setIsLoading(false);
              return;
            }

            if (meta.approval_status === "rejected") {
              await supabase.auth.signOut();
              useAuthStore.getState().setUser(null);
              useAuthStore.getState().setProfile(null);
              setVerificationNotice("rejected");
              setIsLoading(false);
              return;
            }
          }
        }

        // Redirect based on role
        if (actualRole === "seller") {
          router.push("/seller/dashboard");
        } else {
          router.push("/");
        }
      }
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Render Application Submitted Screen ──
  if (role === "seller" && applicationSubmitted) {
    return (
      <div className="flex min-h-[calc(100vh-5rem)] flex-col items-center justify-center p-4 bg-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-lg bg-card p-8 md:p-10 shadow-2xl rounded-2xl border border-border text-center space-y-6"
        >
          {/* Animated Emblem */}
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600 mb-3">
              <Clock className="w-8 h-8 animate-pulse" />
            </div>
            <span className="text-xs uppercase font-bold tracking-[0.25em] text-amber-600 bg-amber-500/10 px-3 py-1 rounded-full">
              Application Under Verification
            </span>
          </div>

          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground mb-2">
              Thank You for Choosing AFRODER!
            </h1>
            <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
              Welcome, <strong className="text-foreground">{applicationSubmitted.sellerName}</strong>. Your seller application for{" "}
              <strong className="text-foreground">{applicationSubmitted.shopName}</strong> has been submitted to our Web Controller.
            </p>
          </div>

          {/* Verification & Payment Details Box */}
          <div className="bg-secondary/50 rounded-xl p-5 text-left border border-border space-y-3">
            <div className="flex justify-between items-center text-xs text-muted-foreground border-b border-border/60 pb-2">
              <span>Shop Name</span>
              <span className="font-semibold text-foreground text-sm">{applicationSubmitted.shopName}</span>
            </div>
            <div className="flex justify-between items-center text-xs text-muted-foreground border-b border-border/60 pb-2">
              <span>Contact / WhatsApp (Login ID)</span>
              <span className="font-semibold text-foreground text-sm">{applicationSubmitted.contactNumber}</span>
            </div>
            {applicationSubmitted.email ? (
              <div className="flex justify-between items-center text-xs text-muted-foreground border-b border-border/60 pb-2">
                <span>Email Address (Optional)</span>
                <span className="font-semibold text-foreground text-sm">{applicationSubmitted.email}</span>
              </div>
            ) : null}
            <div className="flex justify-between items-center text-xs text-muted-foreground border-b border-border/60 pb-2">
              <span>Subscription Plan</span>
              <span className="font-bold text-emerald-600">₹39 / 3 Months (Receipt Attached ✓)</span>
            </div>
            <div className="flex justify-between items-center text-xs text-muted-foreground">
              <span>Expected Verification</span>
              <span className="font-bold text-amber-600">Within Next 24 Hours</span>
            </div>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 p-4 rounded-xl text-xs text-left leading-relaxed">
            <p className="font-semibold mb-1">⏳ Verification Notice:</p>
            Your information and ₹39 subscription receipt are currently being verified by our web controller team. Please wait — within the next 24 hours we will review your shop and contact you on WhatsApp / Phone. Once approved, you will be able to log in to your dashboard and begin selling.
          </div>

          {/* Support / Help Query Section */}
          <div className="bg-emerald-500/10 border border-emerald-500/25 p-4 rounded-xl text-left space-y-2.5">
            <div className="flex items-center space-x-2 text-emerald-800 dark:text-emerald-300 font-semibold text-xs">
              <MessageCircle className="w-4 h-4 text-emerald-600" />
              <span>Have Any Questions or Need Quick Help?</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Feel free to reach out to us regarding any questions or assistance with AFRODER. Our team is available to assist you anytime!
            </p>
            <div className="pt-1 flex flex-wrap items-center gap-2.5">
              <a
                href="https://wa.me/919671016500?text=Hi%20AFRODER%2C%20I%20have%20a%20question%20regarding%20my%20seller%20application"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium px-3.5 py-2 rounded-lg transition-colors shadow-xs"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>WhatsApp: +91 9671016500</span>
              </a>
              <a
                href="tel:+919671016500"
                className="inline-flex items-center space-x-1.5 border border-emerald-600/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 text-xs font-medium px-3 py-2 rounded-lg transition-colors"
              >
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                <span>Call Us</span>
              </a>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              className="flex-1"
              variant="outline"
              onClick={() => {
                setApplicationSubmitted(null);
                setMode("signin");
                setSellerStep("details");
              }}
            >
              Go to Seller Login
            </Button>
            <Link href="/" className="flex-1">
              <Button className="w-full">Return to Home</Button>
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-5rem)] flex-col items-center justify-center p-4 bg-background">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md bg-card p-8 md:p-9 shadow-2xl rounded-2xl border border-border"
      >
        <div className="space-y-2 text-center mb-8">
          <div className="flex justify-center mb-3">
            <Image src="/logo-emblem.png" alt="AFRODER" width={52} height={26} className="object-contain" priority />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            {role === "seller" ? "Seller Portal" : "Welcome"}
          </h1>
          <p className="text-sm text-muted-foreground tracking-wide">
            {role === "seller"
              ? "Open your store and manage your brand."
              : "Discover and shop premium independent apparel."}
          </p>
        </div>

        {/* 2-Option Tabs: Login & Create Account */}
        <div className="flex p-1 mb-6 bg-secondary/60 rounded-xl border border-border/80">
          <button
            type="button"
            onClick={() => {
              setMode("signin");
              setError(null);
              setVerificationNotice(null);
              setSellerStep("details");
            }}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${
              mode === "signin"
                ? "bg-background shadow-xs text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("signup");
              setError(null);
              setVerificationNotice(null);
              setSellerStep("details");
            }}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${
              mode === "signup"
                ? "bg-background shadow-xs text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Create Account
          </button>
        </div>

        {/* ── Pending Verification Alert ── */}
        {verificationNotice === "pending" && (
          <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-sm space-y-2.5">
            <div className="flex items-center space-x-2 font-bold text-amber-700 dark:text-amber-300">
              <Clock className="h-5 w-5 shrink-0 animate-spin" />
              <span>Application Under Verification</span>
            </div>
            <p className="text-xs leading-relaxed">
              Thank you for choosing AFRODER! Your seller application is currently being verified. Please wait — our web controller team will review your information within the next 24 hours and contact you on WhatsApp / Phone. Once approved, you can log in directly.
            </p>
            <div className="pt-1.5 border-t border-amber-500/20 text-xs">
              <p className="text-muted-foreground mb-1">
                Feel free to contact us regarding any questions about AFRODER:
              </p>
              <a
                href="https://wa.me/919671016500?text=Hi%20AFRODER%2C%20I%20have%20a%20question%20regarding%20my%20seller%20application"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-1.5 font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>WhatsApp: +91 9671016500</span>
              </a>
            </div>
          </div>
        )}

        {/* ── Rejected Verification Alert ── */}
        {verificationNotice === "rejected" && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-900 dark:text-red-200 text-sm space-y-2.5">
            <div className="flex items-center space-x-2 font-bold text-red-700 dark:text-red-300">
              <XCircle className="h-5 w-5 shrink-0" />
              <span>Verification Not Approved</span>
            </div>
            <p className="text-xs leading-relaxed">
              Sorry, your seller account was not verified by the AFRODER web controller. If you believe this is a mistake or wish to submit updated documentation, please contact our support team on WhatsApp.
            </p>
            <div className="pt-1.5 border-t border-red-500/20 text-xs">
              <a
                href="https://wa.me/919671016500?text=Hi%20AFRODER%2C%20I%20am%20inquiring%20about%20my%20seller%20account%20verification"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-1.5 font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>WhatsApp Support: +91 9671016500</span>
              </a>
            </div>
          </div>
        )}

        {/* Standard Error Notice */}
        {error && (
          <div
            className={`mb-6 p-3 rounded-lg text-sm font-medium ${
              error.includes("successful")
                ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                : "bg-destructive/10 text-destructive border border-destructive/20"
            }`}
          >
            {error}
          </div>
        )}

        {/* FORM */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* STEP 1: Account Details Form */}
          {(! (role === "seller" && mode === "signup" && sellerStep === "payment")) && (
            <div className="space-y-4">
              {/* ── Sign In View (Both Seller and Client) ── */}
              {mode === "signin" && (
                <>
                  {/* Phone Number Input for Login */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground" htmlFor="loginPhone">
                      Phone Number
                    </label>
                    <div className="relative">
                      <Input
                        id="loginPhone"
                        type="tel"
                        placeholder="e.g. 96710 16500"
                        className="h-11 pl-10"
                        {...register("phone")}
                      />
                      <Phone className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Enter your mobile / phone number to log in.
                    </p>
                  </div>

                  {/* Password */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground" htmlFor="password">
                      Password
                    </label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      className="h-11"
                      {...register("password")}
                    />
                    {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
                  </div>
                </>
              )}

              {/* ── Sign Up View ── */}
              {mode === "signup" && (
                <div className="space-y-4">
                  {/* Your Name */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground" htmlFor="fullName">
                      Your Name
                    </label>
                    <Input
                      id="fullName"
                      placeholder="e.g. Sahid Afridi"
                      className="h-11"
                      {...register("fullName")}
                    />
                  </div>

                  {/* Seller Specific: Shop Name */}
                  {role === "seller" && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground" htmlFor="shopName">
                        Shop Name
                      </label>
                      <Input
                        id="shopName"
                        placeholder="e.g. Royal Atelier"
                        className="h-11"
                        {...register("shopName")}
                      />
                    </div>
                  )}

                  {/* Phone Number (Primary Requirement) */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground" htmlFor="phone">
                      {role === "seller" ? "Phone Number (WhatsApp) *" : "Mobile / Phone Number *"}
                    </label>
                    <div className="relative">
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="e.g. 96710 16500"
                        className="h-11 pl-10"
                        {...register("phone")}
                      />
                      <Phone className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {role === "seller"
                        ? "This phone number will be your login ID and our controller will verify your shop on it."
                        : "This will be your primary ID to log in to AFRODER."}
                    </p>
                  </div>

                  {/* Optional Email / Gmail */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground" htmlFor="email">
                        Gmail / Email
                      </label>
                      <span className="text-[10px] uppercase font-semibold text-muted-foreground bg-secondary px-2 py-0.5 rounded-full border border-border">
                        Optional
                      </span>
                    </div>
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@gmail.com (Optional)"
                      className="h-11"
                      {...register("email")}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Optional. You can leave this blank if you don&apos;t use email.
                    </p>
                  </div>

                  {/* Password */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground" htmlFor="password">
                      Password
                    </label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      className="h-11"
                      {...register("password")}
                    />
                    {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
                  </div>
                </div>
              )}

              {/* Action Button: Next for Seller Signup, Submit for Login/Client */}
              {role === "seller" && mode === "signup" ? (
                <Button
                  type="button"
                  onClick={handleProceedToPayment}
                  className="w-full h-12 text-base font-semibold tracking-wide mt-2 flex items-center justify-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white"
                >
                  <span>Next: Pay ₹39 & Verify</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button type="submit" className="w-full h-12 text-base font-semibold tracking-wide mt-2" isLoading={isLoading}>
                  {mode === "signin" ? (role === "seller" ? "Seller Login" : "Sign In") : "Create Account"}
                </Button>
              )}
            </div>
          )}

          {/* STEP 2: Scanner & ₹39 Subscription Payment (Only for Seller Signup) */}
          {role === "seller" && mode === "signup" && sellerStep === "payment" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-5"
            >
              {/* Step indicator header */}
              <div className="flex items-center justify-between pb-2 border-b border-border text-xs">
                <span className="font-semibold text-muted-foreground">Step 2 of 2: Seller Plan & Verification</span>
                <span className="font-bold text-emerald-600 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                  ₹39 / 3 Months
                </span>
              </div>

              {/* Premium Plan Highlight Card */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-5 shadow-lg space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2.5 py-0.5 rounded-full">
                    Special Launch Pass
                  </span>
                  <span className="text-xs text-gray-400">90 Days Validity</span>
                </div>

                <div>
                  <div className="flex items-baseline space-x-1.5">
                    <span className="text-3xl font-extrabold tracking-tight text-white">₹39</span>
                    <span className="text-xs text-gray-300 font-medium">for 3 Months (₹13/month)</span>
                  </div>
                  <p className="text-xs text-gray-300 mt-1 leading-relaxed">
                    Full seller onboarding, verified merchant badge, and direct customer WhatsApp checkout.
                  </p>
                </div>
              </div>

              {/* QR Scanner Card */}
              <div className="bg-secondary/40 border border-border rounded-2xl p-5 text-center space-y-3">
                <div className="flex items-center justify-center space-x-1.5 text-xs font-semibold text-foreground">
                  <QrCode className="w-4 h-4 text-emerald-600" />
                  <span>Scan QR Code to Pay ₹39</span>
                </div>

                {/* QR Code Container with Scanner Frame */}
                <div className="relative inline-block mx-auto p-3 bg-white rounded-2xl shadow-md border border-slate-200">
                  <div className="relative w-48 h-48 md:w-52 md:h-52">
                    <img
                      src="https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=8&data=upi://pay?pa=9671016500@upi%26pn=AFRODER%26am=39%26cu=INR%26tn=AFRODER%20Seller%20Verification"
                      alt="UPI QR Code for ₹39"
                      className="w-full h-full object-contain rounded-lg"
                    />
                  </div>
                </div>

                {/* UPI Details & Copy */}
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-center space-x-2 text-muted-foreground">
                    <span>UPI ID: <strong className="text-foreground">9671016500@upi</strong></span>
                    <button
                      type="button"
                      onClick={handleCopyUPI}
                      className="p-1 text-xs rounded hover:bg-secondary text-primary font-semibold inline-flex items-center"
                      title="Copy UPI ID"
                    >
                      {copiedUPI ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Accepts GPay, PhonePe, Paytm, BHIM & all UPI apps
                  </p>
                </div>

                {/* Direct UPI Intent Link for Mobile */}
                <div className="pt-1">
                  <a
                    href="upi://pay?pa=9671016500@upi&pn=AFRODER&am=39&cu=INR&tn=AFRODER%20Seller%20Verification"
                    className="w-full inline-flex items-center justify-center space-x-2 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Pay ₹39 Directly via UPI App</span>
                  </a>
                </div>
              </div>

              {/* Upload Payment Receipt / Screenshot Box */}
              <div className="space-y-2 text-left">
                <label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground flex items-center justify-between">
                  <span>Upload Payment Receipt *</span>
                  <span className="text-[10px] lowercase text-emerald-600 font-normal">screenshot or photo</span>
                </label>

                {receiptPreview ? (
                  <div className="relative p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 flex items-center justify-between gap-3">
                    <div className="flex items-center space-x-3 overflow-hidden">
                      <div className="w-12 h-12 rounded-lg overflow-hidden border border-border bg-background shrink-0">
                        <img src={receiptPreview} alt="Receipt preview" className="w-full h-full object-cover" />
                      </div>
                      <div className="text-xs truncate">
                        <p className="font-semibold text-foreground truncate">{receiptFile?.name || "Payment Receipt"}</p>
                        <p className="text-emerald-600 text-[11px] flex items-center gap-1 font-medium">
                          <CheckCircle className="w-3 h-3" /> Receipt Attached
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setReceiptFile(null);
                        setReceiptPreview(null);
                      }}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      title="Remove receipt"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center p-5 border-2 border-dashed border-border hover:border-primary/50 bg-secondary/30 hover:bg-secondary/50 rounded-xl cursor-pointer transition-all">
                    <Upload className="w-6 h-6 text-muted-foreground mb-1.5" />
                    <span className="text-xs font-semibold text-foreground">Click to upload payment screenshot</span>
                    <span className="text-[11px] text-muted-foreground">PNG, JPG up to 8MB</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleReceiptChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Optional UTR / Reference ID */}
              <div className="space-y-1.5 text-left">
                <label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground" htmlFor="utr">
                  UPI UTR / Reference ID (Optional)
                </label>
                <Input
                  id="utr"
                  placeholder="e.g. 4289XXXXXXXX (12 digits)"
                  value={utrNumber}
                  onChange={(e) => setUtrNumber(e.target.value)}
                  className="h-10 text-xs"
                />
              </div>

              {/* Navigation Actions */}
              <div className="flex items-center gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSellerStep("details")}
                  disabled={isLoading}
                  className="flex-1 h-11 text-xs"
                >
                  <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Edit Details
                </Button>

                <Button
                  type="submit"
                  disabled={!receiptPreview || isLoading}
                  isLoading={isLoading}
                  className="flex-2 h-11 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                >
                  <Check className="mr-1.5 h-4 w-4" />
                  Submit & Create Account
                </Button>
              </div>
            </motion.div>
          )}
        </form>

        <div className="mt-8 pt-6 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <Link href="/" className="inline-flex items-center hover:text-foreground transition-colors">
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back to Store
          </Link>

          {role === "seller" ? (
            <Link href="/auth?role=client&mode=signin" className="hover:text-foreground transition-colors">
              Customer Sign In
            </Link>
          ) : (
            <Link href="/auth?role=seller" className="hover:text-foreground font-semibold transition-colors">
              Seller Portal
            </Link>
          )}
        </div>
      </motion.div>
    </div>
  );
}
