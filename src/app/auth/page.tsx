"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/utils/supabase/client";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { motion } from "framer-motion";

const authSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
  fullName: z.string().optional(),
});

type AuthFormValues = z.infer<typeof authSchema>;

export default function AuthPage({ searchParams }: { searchParams: Promise<{ role?: string; mode?: string }> }) {
  const resolvedParams = use(searchParams);
  const role = resolvedParams.role === "seller" ? "seller" : "client";
  const initialMode = resolvedParams.mode === "signup" ? "signup" : "signin";

  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const router = useRouter();
  const initializeAuth = useAuthStore((state) => state.initialize);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AuthFormValues>({
    resolver: zodResolver(authSchema),
  });

  const onSubmit = async (data: AuthFormValues) => {
    setIsLoading(true);
    setError(null);
    try {
      if (mode === "signup") {
        if (!data.fullName || data.fullName.trim().length < 2) {
          setError("Full name is required for registration.");
          setIsLoading(false);
          return;
        }

        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
          options: {
            data: {
              full_name: data.fullName,
              role: role,
            },
          },
        });

        if (signUpError) {
          setError(signUpError.message);
          return;
        }

        // Supabase returns a user with empty identities when the email already exists
        if (signUpData?.user && (!signUpData.user.identities || signUpData.user.identities.length === 0)) {
          setError("This email is already registered. Please sign in instead.");
          return;
        }

        // After successful signup, switch to signin mode
        setMode("signin");
        setError("Registration successful! Please log in.");
      } else {
        // Sign In Flow
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        });

        if (signInError) {
          setError(signInError.message);
          return;
        }

        await initializeAuth();
        
        // Check if the user's actual role matches the page they're on
        const profile = useAuthStore.getState().profile;
        const actualRole = profile?.role || "client";

        if (actualRole !== role) {
          // Role mismatch — sign them out and show an error
          await supabase.auth.signOut();
          useAuthStore.getState().setUser(null);
          useAuthStore.getState().setProfile(null);

          if (role === "client") {
            setError("This email is registered as a Seller. Please use the Seller login instead.");
          } else {
            setError("This email is registered as a Client. Please use the Client login instead.");
          }
          return;
        }

        if (actualRole === "seller") {
          router.push("/seller/dashboard");
        } else {
          router.push("/");
        }
      }
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center p-4 bg-background">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md bg-card p-8 shadow-2xl rounded-2xl border border-border"
      >
        <div className="space-y-2 text-center mb-8">
          <h1 className="text-3xl font-medium tracking-tight">
            {role === "seller" ? "Seller Portal" : "Welcome"}
          </h1>
          <p className="text-sm text-muted-foreground tracking-wide">
            {role === "seller" 
              ? "Manage your premium apparel store." 
              : "Discover and shop premium independent brands."}
          </p>
        </div>

        {/* Custom Tabs */}
        <div className="flex p-1 mb-8 bg-secondary/50 rounded-lg">
          <button
            onClick={() => { setMode("signin"); setError(null); }}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
              mode === "signin" ? "bg-white shadow-sm text-slate-900" : "text-muted-foreground hover:text-slate-900"
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setMode("signup"); setError(null); }}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
              mode === "signup" ? "bg-white shadow-sm text-slate-900" : "text-muted-foreground hover:text-slate-900"
            }`}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {mode === "signup" && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }} 
              animate={{ opacity: 1, height: "auto" }}
              className="space-y-2"
            >
              <label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground" htmlFor="fullName">
                Full Name
              </label>
              <Input
                id="fullName"
                placeholder="John Doe"
                className="h-11"
                {...register("fullName")}
              />
            </motion.div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground" htmlFor="email">
              Email
            </label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              className="h-11"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
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
            {errors.password && (
              <p className="text-sm text-red-500">{errors.password.message}</p>
            )}
          </div>

          {error && (
            <div className={`p-3 rounded-md text-sm font-medium ${error.includes("successful") ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600"}`}>
              {error}
            </div>
          )}

          <Button type="submit" className="w-full h-11 text-base tracking-wide mt-2" isLoading={isLoading}>
            {mode === "signin" ? "Sign In" : "Create Account"}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
