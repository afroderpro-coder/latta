"use client";

import React, { useState } from "react";
import { 
  MapPin, 
  Navigation, 
  ExternalLink, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Copy,
  Check,
  Search,
  X
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export interface LocationDetails {
  address: string;
  street?: string;
  city?: string;
  state?: string;
  pincode?: string;
  lat?: number;
  lng?: number;
  googleMapsUrl?: string;
}

interface LocationPickerProps {
  value: string;
  onChange: (value: string, details?: LocationDetails) => void;
  label?: string;
  placeholder?: string;
  helperText?: string;
  mode?: "shop" | "customer";
  compact?: boolean;
  className?: string;
}

export function LocationPicker({
  value,
  onChange,
  label,
  placeholder,
  helperText,
  mode = "shop",
  compact = false,
  className = "",
}: LocationPickerProps) {
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionStatus, setDetectionStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Detect whether value is a valid Google Maps URL
  const isMapsUrl =
    typeof value === "string" &&
    (value.includes("google.com/maps") ||
      value.includes("maps.app.goo.gl") ||
      value.includes("goo.gl/maps") ||
      value.startsWith("https://maps."));

  // Build the live navigation link
  const getGoogleMapsPreviewUrl = () => {
    if (!value || !value.trim()) return "";
    const clean = value.trim();
    if (clean.startsWith("http://") || clean.startsWith("https://")) {
      return clean;
    }
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(clean)}`;
  };

  const previewMapsUrl = getGoogleMapsPreviewUrl();

  // ── Handler 1: Fetch Live GPS Location directly from device ──
  const handleDetectLiveLocation = () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setDetectionStatus({
        type: "error",
        message: "Geolocation is not supported by your browser.",
      });
      return;
    }

    setIsDetecting(true);
    setDetectionStatus(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;

        try {
          // Call our server reverse-geocoding endpoint
          const res = await fetch(`/api/geocode/reverse?lat=${latitude}&lng=${longitude}`);
          const data = await res.json();

          if (data && data.success && data.address) {
            const resolvedAddress = data.address;
            onChange(resolvedAddress, {
              address: resolvedAddress,
              street: data.street,
              city: data.city,
              state: data.state,
              pincode: data.pincode,
              lat: data.lat,
              lng: data.lng,
              googleMapsUrl: data.googleMapsUrl,
            });

            setDetectionStatus({
              type: "success",
              message: `Live Location Detected: ${data.city ? `${data.city}, ` : ""}${latitude.toFixed(4)}° N, ${longitude.toFixed(4)}° E`,
            });
          } else {
            // Direct GPS coordinate fallback
            const fallbackText = `GPS: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
            onChange(fallbackText, {
              address: fallbackText,
              lat: latitude,
              lng: longitude,
              googleMapsUrl: `https://www.google.com/maps?q=${latitude},${longitude}`,
            });
            setDetectionStatus({
              type: "success",
              message: `Coordinates captured: ${latitude.toFixed(4)}°, ${longitude.toFixed(4)}°`,
            });
          }
        } catch (err: any) {
          const fallbackText = `GPS: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
          onChange(fallbackText, {
            address: fallbackText,
            lat: latitude,
            lng: longitude,
            googleMapsUrl: `https://www.google.com/maps?q=${latitude},${longitude}`,
          });
          setDetectionStatus({
            type: "success",
            message: `Coordinates captured: ${latitude.toFixed(4)}°, ${longitude.toFixed(4)}°`,
          });
        } finally {
          setIsDetecting(false);
        }
      },
      (err) => {
        setIsDetecting(false);
        let errorMsg = "Could not fetch GPS location.";
        if (err.code === 1) {
          errorMsg = "Location access was denied. Please allow location in browser settings or enter manually.";
        } else if (err.code === 2) {
          errorMsg = "Location position unavailable. Please type your location manually.";
        } else if (err.code === 3) {
          errorMsg = "Location request timed out. Please try again or type manually.";
        }
        setDetectionStatus({
          type: "error",
          message: errorMsg,
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 10000,
      }
    );
  };

  // ── Handler 2: Open Google Maps Search in a new tab ──
  const handleOpenGoogleMapsSearch = () => {
    const query = value && !isMapsUrl ? value.trim() : "";
    const searchUrl = query
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
      : "https://www.google.com/maps";
    window.open(searchUrl, "_blank", "noopener,noreferrer");
  };

  const handleCopyLink = () => {
    if (!previewMapsUrl) return;
    navigator.clipboard.writeText(previewMapsUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Label and Actions Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground flex items-center gap-1.5">
          <MapPin className="h-4 w-4 text-primary" />
          <span>{label || (mode === "shop" ? "Shop Location & Boutique Navigation" : "Delivery Address & Location")}</span>
        </label>

        {/* Quick GPS & Google Maps Action Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={handleDetectLiveLocation}
            disabled={isDetecting}
            className="inline-flex items-center gap-1 text-[11px] font-semibold bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 px-2.5 py-1 rounded-lg transition-all cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50"
            title="Fetch current GPS location using device sensors"
          >
            {isDetecting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Navigation className="w-3.5 h-3.5" />
            )}
            <span>{isDetecting ? "Fetching GPS..." : "📍 Live GPS Location"}</span>
          </button>

          <button
            type="button"
            onClick={handleOpenGoogleMapsSearch}
            className="inline-flex items-center gap-1 text-[11px] font-semibold bg-secondary hover:bg-secondary/80 text-foreground border border-border px-2.5 py-1 rounded-lg transition-all cursor-pointer active:scale-95"
            title="Open Google Maps to find your exact location or copy link"
          >
            <Search className="w-3 h-3 text-muted-foreground" />
            <span>Open Google Maps</span>
          </button>
        </div>
      </div>

      {/* Main Input Field */}
      <div className="relative">
        <Input
          placeholder={
            placeholder ||
            (mode === "shop"
              ? "e.g. Shop #07, Main Market Road, Nuh, Haryana 122105 OR paste Google Maps link"
              : "e.g. Flat 302, Green Heights, Bandra West, Mumbai 400050")
          }
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            if (detectionStatus) setDetectionStatus(null);
          }}
          className={`pr-8 ${compact ? "h-10 text-xs" : "h-11 text-sm"}`}
        />
        {value ? (
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded cursor-pointer"
            title="Clear location"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : null}
      </div>

      {/* Live Status Feedback Banner */}
      {detectionStatus && (
        <div
          className={`p-2.5 rounded-xl text-xs font-medium border flex items-center gap-2 ${
            detectionStatus.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
              : "bg-destructive/10 border-destructive/30 text-destructive"
          }`}
        >
          {detectionStatus.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{detectionStatus.message}</span>
        </div>
      )}

      {/* Verified Google Maps Navigation Preview Card */}
      {value && value.trim().length > 3 && (
        <div className="p-3 rounded-xl bg-secondary/40 border border-border/80 flex flex-wrap items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-6 h-6 rounded-full bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0">
              <MapPin className="w-3.5 h-3.5" />
            </span>
            <div className="min-w-0">
              <span className="font-semibold text-foreground flex items-center gap-1.5 truncate">
                <span>{isMapsUrl ? "Google Maps Link Connected" : "Google Maps Navigation Ready"}</span>
                <span className="text-[10px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold px-1.5 py-0.2 rounded-full">
                  Verified ✓
                </span>
              </span>
              <p className="text-[11px] text-muted-foreground truncate max-w-xs sm:max-w-md">
                {value}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href={previewMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:underline bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
            >
              <span>Test on Maps</span>
              <ExternalLink className="w-3 h-3" />
            </a>

            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground bg-secondary border border-border px-2 py-1 rounded-lg transition-colors cursor-pointer"
              title="Copy Google Maps Navigation Link"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? "Copied" : "Copy Link"}</span>
            </button>
          </div>
        </div>
      )}

      {/* Explanatory Helper Text */}
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        {helperText ||
          (mode === "shop"
            ? "Enter your retail address, paste a Google Maps link, or click 'Live GPS Location' above. When customers visit your storefront, they can tap to get direct turn-by-turn Google Maps driving directions directly to your shop."
            : "Click 'Live GPS Location' to auto-detect your delivery address, or enter your complete street, city, and pincode manually.")}
      </p>
    </div>
  );
}

