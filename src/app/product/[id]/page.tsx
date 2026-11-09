"use client";

import { useEffect, useState, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase/client";
import { Button } from "@/components/ui/Button";
import { useCartStore } from "@/store/useCartStore";
import { useAuthStore } from "@/store/useAuthStore";
import { ArrowLeft, ShoppingBag, ChevronLeft, ChevronRight, Check, AlertCircle, Zap, X, ZoomOut, Move, Play } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence, useMotionValue, animate } from "framer-motion";
import { BrandLoader } from "@/components/ui/BrandLoader";
import { GoogleLoginPromptModal } from "@/components/auth/GoogleLoginPromptModal";
import { detectCategoryConfig, getProductTypeNoun, isFreeSizeOrSingle } from "@/utils/productCategories";
import { isVideoMedia } from "@/utils/firebase/storage";

const fallbackRelatedProducts = [
  {
    id: "1",
    title: "Essential Oversized Tee",
    price: 1999,
    image_urls: ["https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&q=80"],
    stores: { shop_name: "Acme Studios" },
  },
  {
    id: "2",
    title: "Classic Denim Jacket",
    price: 3499,
    image_urls: ["https://images.unsplash.com/photo-1576871337622-98d48d1cf531?w=500&q=80"],
    stores: { shop_name: "Indigo Wear" },
  },
  {
    id: "3",
    title: "Minimalist Sneakers",
    price: 4299,
    image_urls: ["https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=500&q=80"],
    stores: { shop_name: "Stride" },
  },
  {
    id: "4",
    title: "Heavyweight Hoodie",
    price: 2899,
    image_urls: ["https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=500&q=80"],
    stores: { shop_name: "Comfort Co" },
  },
];

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const router = useRouter();
  const [product, setProduct] = useState<any>(null);
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [sizeError, setSizeError] = useState(false);
  const [showSizePopup, setShowSizePopup] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [isAdded, setIsAdded] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const sizeSectionRef = useRef<HTMLDivElement>(null);
  const popupTimerRef = useRef<NodeJS.Timeout | null>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const zoomX = useMotionValue(0);
  const zoomY = useMotionValue(0);
  const zoomScale = useMotionValue(1);
  const [zoomConstraints, setZoomConstraints] = useState({ left: -420, right: 420, top: -480, bottom: 480 });
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const touchEndY = useRef<number | null>(null);
  const isDraggingSwipe = useRef(false);
  const isDraggingPan = useRef(false);
  const lastTapTimeRef = useRef<number>(0);
  const lastTapPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const initialPinchDistanceRef = useRef<number | null>(null);
  const initialPinchScaleRef = useRef<number>(1);
  const isPinchingRef = useRef<boolean>(false);
  const addItem = useCartStore((state) => state.addItem);
  const { user } = useAuthStore();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authActionText, setAuthActionText] = useState("add this product to your cart");

  useEffect(() => {
    // Reset page view when product ID changes
    window.scrollTo({ top: 0, behavior: "smooth" });
    setSelectedSize(null);
    setSizeError(false);
    setShowSizePopup(false);
    if (popupTimerRef.current) clearTimeout(popupTimerRef.current);
    setShakeKey(0);
    setSelectedImageIndex(0);
    zoomScale.set(1);
    zoomX.set(0);
    zoomY.set(0);
    setIsZoomed(false);
    setIsLoading(true);

    async function loadProductAndRelated() {
      // 1. Fetch current product
      const { data: currentProduct } = await supabase
        .from("products")
        .select("*, stores(id, shop_name)")
        .eq("id", unwrappedParams.id)
        .single();

      if (currentProduct) {
        setProduct(currentProduct);

        // Auto-select size if product has a single size or Free Size option
        if (Array.isArray(currentProduct.sizes) && currentProduct.sizes.length === 1) {
          setSelectedSize(currentProduct.sizes[0]);
        }

        // 2. Fetch related products from active listings excluding this product
        const { data: dbRelated } = await supabase
          .from("products")
          .select("*, stores(id, shop_name)")
          .eq("is_active", true)
          .neq("id", unwrappedParams.id)
          .limit(10);

        if (dbRelated && dbRelated.length > 0) {
          setRelatedProducts(dbRelated);
        } else {
          setRelatedProducts(fallbackRelatedProducts.filter((p) => p.id !== unwrappedParams.id));
        }
      } else {
        setProduct(null);
      }

      setIsLoading(false);
    }

    loadProductAndRelated();
  }, [unwrappedParams.id]);

  useEffect(() => {
    zoomScale.set(1);
    zoomX.set(0);
    zoomY.set(0);
    setIsZoomed(false);
  }, [selectedImageIndex]);

  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === "left" ? -320 : 320;
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  if (isLoading) {
    return <BrandLoader fullScreen />;
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-24 text-center">
        <h2 className="text-2xl font-bold mb-4">Product Not Found</h2>
        <p className="text-muted-foreground mb-6">The piece you are looking for is unavailable or has been removed.</p>
        <Link href="/shop">
          <Button>Back to Shop</Button>
        </Link>
      </div>
    );
  }

  const images: string[] = Array.isArray(product.image_urls) ? product.image_urls : [];
  const config = detectCategoryConfig(product.category || product.title);
  const productTypeNoun = getProductTypeNoun(product.title, product.description, product.category);
  const hasMultipleSizes = Array.isArray(product.sizes) && product.sizes.length > 1;
  const isSingleSize = Array.isArray(product.sizes) && product.sizes.length === 1;

  const getTouchDistance = (t1: React.Touch, t2: React.Touch) => {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // 2-finger pinch gesture start
      isPinchingRef.current = true;
      const dist = getTouchDistance(e.touches[0], e.touches[1]);
      initialPinchDistanceRef.current = dist;
      initialPinchScaleRef.current = zoomScale.get();
      return;
    }

    if (e.touches.length === 1) {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
      touchEndX.current = null;
      touchEndY.current = null;
      isDraggingSwipe.current = false;
      isDraggingPan.current = false;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && initialPinchDistanceRef.current !== null) {
      // Real-time 2-finger pinch zoom
      isPinchingRef.current = true;
      const currentDist = getTouchDistance(e.touches[0], e.touches[1]);
      const pinchRatio = currentDist / initialPinchDistanceRef.current;
      const newScale = Math.min(3.8, Math.max(0.85, initialPinchScaleRef.current * pinchRatio));
      zoomScale.set(newScale);

      const container = imageContainerRef.current;
      if (container && newScale > 1.05) {
        const rect = container.getBoundingClientRect();
        const maxPanX = Math.round((rect.width * newScale - rect.width) / 2);
        const maxPanY = Math.round((rect.height * newScale - rect.height) / 2);
        setZoomConstraints({
          left: -maxPanX,
          right: maxPanX,
          top: -maxPanY,
          bottom: maxPanY,
        });
      }
      return;
    }

    if (e.touches.length === 1 && touchStartX.current !== null) {
      touchEndX.current = e.touches[0].clientX;
      touchEndY.current = e.touches[0].clientY;
      const diffX = Math.abs(touchEndX.current - touchStartX.current);
      const diffY = Math.abs((touchEndY.current || 0) - (touchStartY.current || 0));
      if (diffX > 8 || diffY > 8) {
        if (!isZoomed) {
          isDraggingSwipe.current = true;
        } else {
          isDraggingPan.current = true;
        }
      }
    }
  };

  const handleTouchEnd = () => {
    if (isPinchingRef.current) {
      isPinchingRef.current = false;
      initialPinchDistanceRef.current = null;
      const currentScale = zoomScale.get();
      if (currentScale < 1.15) {
        zoomOut();
      } else {
        setIsZoomed(true);
        const clampedScale = Math.min(3.5, Math.max(1.2, currentScale));
        animate(zoomScale, clampedScale, { type: "spring", stiffness: 300, damping: 28 });
      }
      return;
    }

    // Double-tap detection (within 320ms and 35px)
    const now = Date.now();
    const timeSinceLastTap = now - lastTapTimeRef.current;
    const currentX = touchStartX.current || 0;
    const currentY = touchStartY.current || 0;
    const distFromLastTap = Math.sqrt(
      Math.pow(currentX - lastTapPosRef.current.x, 2) + Math.pow(currentY - lastTapPosRef.current.y, 2)
    );

    if (timeSinceLastTap < 320 && distFromLastTap < 35 && !isDraggingSwipe.current && !isDraggingPan.current) {
      // Double tap recognized!
      if (isZoomed) {
        zoomOut();
      } else {
        zoomToPoint(currentX, currentY);
      }
      lastTapTimeRef.current = 0;
      return;
    }

    lastTapTimeRef.current = now;
    lastTapPosRef.current = { x: currentX, y: currentY };

    touchStartX.current = null;
    touchEndX.current = null;
    setTimeout(() => {
      isDraggingSwipe.current = false;
      isDraggingPan.current = false;
    }, 80);
  };

  const paginate = (newDirection: number) => {
    if (isZoomed) return;
    if (newDirection > 0) {
      if (selectedImageIndex < images.length - 1) {
        setDirection(1);
        setSelectedImageIndex((prev) => prev + 1);
      }
    } else {
      if (selectedImageIndex > 0) {
        setDirection(-1);
        setSelectedImageIndex((prev) => prev - 1);
      }
    }
  };

  const onSelectThumbnail = (idx: number) => {
    if (idx === selectedImageIndex) return;
    setDirection(idx > selectedImageIndex ? 1 : -1);
    setSelectedImageIndex(idx);
    zoomOut();
  };

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? "100%" : dir < 0 ? "-100%" : 0,
      opacity: 0.3,
      scale: 0.94,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
      transition: {
        x: { type: "spring" as const, stiffness: 320, damping: 32 },
        opacity: { duration: 0.28 },
        scale: { duration: 0.28 },
      },
    },
    exit: (dir: number) => ({
      x: dir > 0 ? "-100%" : "100%",
      opacity: 0.3,
      scale: 0.94,
      transition: {
        x: { type: "spring" as const, stiffness: 320, damping: 32 },
        opacity: { duration: 0.28 },
        scale: { duration: 0.28 },
      },
    }),
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (isZoomed) {
      zoomOut();
    } else {
      zoomToPoint(e.clientX, e.clientY);
    }
  };

  const zoomToPoint = (clientX: number, clientY: number) => {
    const container = imageContainerRef.current;
    if (!container) {
      animate(zoomScale, 2.6, { type: "spring", stiffness: 280, damping: 28 });
      setIsZoomed(true);
      return;
    }

    const rect = container.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    const scaleVal = 2.6;

    const maxPanX = Math.round((w * scaleVal - w) / 2);
    const maxPanY = Math.round((h * scaleVal - h) / 2);

    const clickOffsetX = clientX - (rect.left + w / 2);
    const clickOffsetY = clientY - (rect.top + h / 2);

    const panFactor = scaleVal - 1;
    let targetX = -clickOffsetX * panFactor;
    let targetY = -clickOffsetY * panFactor;

    targetX = Math.max(-maxPanX, Math.min(maxPanX, targetX));
    targetY = Math.max(-maxPanY, Math.min(maxPanY, targetY));

    setZoomConstraints({
      left: -maxPanX,
      right: maxPanX,
      top: -maxPanY,
      bottom: maxPanY,
    });

    animate(zoomScale, scaleVal, { type: "spring", stiffness: 280, damping: 28 });
    animate(zoomX, targetX, { type: "spring", stiffness: 280, damping: 28 });
    animate(zoomY, targetY, { type: "spring", stiffness: 280, damping: 28 });
    setIsZoomed(true);
  };

  const zoomOut = () => {
    animate(zoomScale, 1, { type: "spring", stiffness: 280, damping: 28 });
    animate(zoomX, 0, { type: "spring", stiffness: 280, damping: 28 });
    animate(zoomY, 0, { type: "spring", stiffness: 280, damping: 28 });
    setIsZoomed(false);
  };

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDraggingPan.current || isDraggingSwipe.current) return;

    if (isZoomed) {
      zoomOut();
    } else {
      const container = imageContainerRef.current;
      const rect = container?.getBoundingClientRect();
      const clientX = e.clientX || touchStartX.current || (rect ? rect.left + rect.width / 2 : 0);
      const clientY = e.clientY || touchStartY.current || (rect ? rect.top + rect.height / 2 : 0);
      zoomToPoint(clientX, clientY);
    }
  };

  const validateSizeSelection = (): boolean => {
    // If only 1 size option exists, auto-select it and proceed
    if (isSingleSize && !selectedSize && product.sizes?.[0]) {
      setSelectedSize(product.sizes[0]);
      return true;
    }

    if (hasMultipleSizes && !selectedSize) {
      setSizeError(true);
      setShowSizePopup(true);
      setShakeKey((prev) => prev + 1);

      if (popupTimerRef.current) clearTimeout(popupTimerRef.current);
      popupTimerRef.current = setTimeout(() => {
        setShowSizePopup(false);
      }, 4000);

      sizeSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return false;
    }
    return true;
  };

  const handleAddToCart = () => {
    if (!user) {
      setAuthActionText("add this product to your cart");
      setShowAuthModal(true);
      return;
    }

    if (!validateSizeSelection()) return;

    addItem({
      id: selectedSize ? `${product.id}-${selectedSize}` : product.id,
      productId: product.id,
      storeId: product.store_id,
      name: product.title,
      price: product.price,
      quantity: 1,
      imageUrl: images[0] || "",
      variant: selectedSize ? { size: selectedSize, color: "" } : undefined,
    });

    setIsAdded(true);
    setTimeout(() => {
      setIsAdded(false);
    }, 1800);
  };

  const handleBuyNow = () => {
    if (!user) {
      setAuthActionText("buy this product");
      setShowAuthModal(true);
      return;
    }

    if (!validateSizeSelection()) return;

    addItem({
      id: selectedSize ? `${product.id}-${selectedSize}` : product.id,
      productId: product.id,
      storeId: product.store_id,
      name: product.title,
      price: product.price,
      quantity: 1,
      imageUrl: images[0] || "",
      variant: selectedSize ? { size: selectedSize, color: "" } : undefined,
    });

    router.push("/cart");
  };

  return (
    <div className="container mx-auto px-3 sm:px-4 pt-2 sm:pt-6 pb-8 sm:pb-12 max-w-6xl relative">
      {/* ── Beautiful Top Popup Notification for Missing Size ── */}
      <AnimatePresence>
        {showSizePopup && (
          <motion.div
            initial={{ opacity: 0, y: -40, x: "-50%", scale: 0.94 }}
            animate={{ opacity: 1, y: 0, x: "-50%", scale: 1 }}
            exit={{ opacity: 0, y: -30, x: "-50%", scale: 0.94 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="fixed top-5 left-1/2 z-50 flex items-center gap-2.5 sm:gap-3 bg-zinc-950/95 text-white border border-zinc-700/80 px-4 py-2.5 rounded-full shadow-2xl backdrop-blur-md max-w-[92vw] sm:max-w-md pointer-events-auto"
          >
            <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <AlertCircle className="w-3.5 h-3.5" />
            </div>

            <p className="text-xs sm:text-sm font-medium tracking-tight truncate">
              Please select your {config.unitLabel.toLowerCase()} of{" "}
              <span className="font-bold text-amber-300 capitalize">{productTypeNoun}</span> to proceed
            </p>

            <button
              type="button"
              onClick={() => {
                setShowSizePopup(false);
                sizeSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
              }}
              className="text-[11px] font-bold text-amber-400 hover:text-amber-300 underline underline-offset-2 shrink-0 cursor-pointer ml-1"
            >
              Pick Size
            </button>

            <button
              type="button"
              onClick={() => setShowSizePopup(false)}
              className="text-zinc-400 hover:text-white p-1 rounded-full transition-colors cursor-pointer shrink-0 ml-1"
              aria-label="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <Link href="/shop" className="inline-flex items-center text-xs sm:text-sm text-muted-foreground hover:text-foreground mb-2.5 sm:mb-6">
        <ArrowLeft className="mr-1.5 sm:mr-2 h-3.5 sm:h-4 w-3.5 sm:w-4" /> Back to shopping
      </Link>

      <div className="grid md:grid-cols-2 gap-6 md:gap-12">
        {/* Product Images Gallery */}
        <div className="flex flex-col space-y-3 sm:space-y-4">
          <motion.div
            ref={imageContainerRef}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`aspect-[4/5] bg-secondary/10 dark:bg-zinc-900/40 rounded-2xl overflow-hidden relative shadow-xs group select-none flex items-center justify-center ${
              isZoomed ? "touch-none" : "touch-pan-y"
            }`}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {images.length > 0 ? (
              <AnimatePresence initial={false} custom={direction} mode="popLayout">
                <motion.div
                  key={selectedImageIndex}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  drag={!isZoomed && images.length > 1 ? "x" : false}
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.25}
                  onDragEnd={(e, info) => {
                    if (!isZoomed && images.length > 1) {
                      const swipeX = info.offset.x;
                      const velocityX = info.velocity.x;
                      if (swipeX < -40 || velocityX < -0.3) {
                        paginate(1);
                      } else if (swipeX > 40 || velocityX > 0.3) {
                        paginate(-1);
                      }
                    }
                  }}
                  className="w-full h-full absolute inset-0 overflow-hidden flex items-center justify-center select-none"
                >
                  {/* Inner Media Engine */}
                  {isVideoMedia(images[selectedImageIndex] || images[0]) ? (
                    <div className="w-full h-full relative bg-black flex items-center justify-center">
                      <video
                        src={images[selectedImageIndex] || images[0]}
                        controls
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="w-full h-full object-contain"
                      />
                    </div>
                  ) : (
                    /* Inner Zoom & Pan Engine - contained 100% inside the slide */
                    <motion.div
                      style={{ x: zoomX, y: zoomY, scale: zoomScale }}
                      drag={isZoomed ? true : false}
                      dragConstraints={zoomConstraints}
                      dragElastic={0.12}
                      dragTransition={{ bounceStiffness: 450, bounceDamping: 28 }}
                      onDragStart={() => {
                        isDraggingPan.current = true;
                      }}
                      onDragEnd={(e, info) => {
                        if (isZoomed) {
                          const dragDist = Math.sqrt(info.offset.x * info.offset.x + info.offset.y * info.offset.y);
                          if (dragDist < 6) {
                            zoomOut();
                          }
                        }
                        setTimeout(() => {
                          isDraggingPan.current = false;
                        }, 80);
                      }}
                      className={`w-full h-full flex items-center justify-center ${
                        isZoomed ? "cursor-zoom-out" : "cursor-zoom-in"
                      }`}
                      onClick={handleImageClick}
                      onDoubleClick={handleDoubleClick}
                      title={isZoomed ? "Double-click or tap to zoom out • Drag to pan" : "Double-click or click to zoom in • Swipe to change photos"}
                    >
                      <img
                        src={images[selectedImageIndex] || images[0]}
                        alt={product.title}
                        className="w-full h-full object-cover select-none pointer-events-none"
                        draggable={false}
                      />
                    </motion.div>
                  )}
                </motion.div>
              </AnimatePresence>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
                No Image Available
              </div>
            )}

            {/* Top Overlay Controls: Zoom Out & Pan Hint ONLY when Zoomed In */}
            {images.length > 0 && isZoomed && !isVideoMedia(images[selectedImageIndex] || images[0]) && (
              <>
                <div className="absolute top-3 left-3 bg-black/80 backdrop-blur-md text-white text-[11px] font-medium px-3 py-1.5 rounded-full flex items-center gap-1.5 z-20 pointer-events-none shadow-md">
                  <Move className="w-3.5 h-3.5 text-amber-400" />
                  <span>Double-tap or pinch to exit • Drag to pan</span>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    zoomOut();
                  }}
                  className="absolute top-3 right-3 px-3 py-1.5 rounded-full bg-black/90 hover:bg-black text-white text-xs font-semibold backdrop-blur-md transition-all shadow-lg flex items-center gap-1.5 z-20 cursor-pointer active:scale-95"
                  title="Exit Zoom"
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                  <span>Exit Zoom</span>
                </button>
              </>
            )}

            {/* Bottom Controls: Carousel Dots & Image Counter (No Arrows!) */}
            {images.length > 1 && !isZoomed && (
              <>
                {/* Pagination Dots */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20 px-3 py-1.5 rounded-full bg-black/45 backdrop-blur-md pointer-events-none shadow-md">
                  {images.map((_, i) => (
                    <motion.span
                      key={i}
                      layout
                      transition={{ type: "spring", stiffness: 350, damping: 25 }}
                      className={`h-2 rounded-full transition-colors duration-300 ${
                        selectedImageIndex === i ? "w-6 bg-white" : "w-2 bg-white/45"
                      }`}
                    />
                  ))}
                </div>

                {/* Counter Badge */}
                <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-md text-white text-xs px-2.5 py-1 rounded-full font-medium z-20 pointer-events-none shadow">
                  {selectedImageIndex + 1} / {images.length}
                </div>
              </>
            )}
          </motion.div>

          {/* Thumbnails Row */}
          {images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pt-2 pb-2.5 px-1 scrollbar-none">
              {images.map((img: string, idx: number) => {
                const isThumbVideo = isVideoMedia(img);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onSelectThumbnail(idx)}
                    className={`relative aspect-[3/4] w-20 flex-shrink-0 rounded-xl overflow-hidden border-2 bg-secondary/10 transition-all cursor-pointer ${
                      selectedImageIndex === idx
                        ? "border-primary ring-2 ring-primary/30 shadow-md"
                        : "border-border opacity-70 hover:opacity-100"
                    }`}
                  >
                    {isThumbVideo ? (
                      <div className="w-full h-full relative bg-black flex items-center justify-center">
                        <video src={img} className="w-full h-full object-cover" muted playsInline />
                        <span className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <Play className="w-4 h-4 text-white fill-white" />
                        </span>
                      </div>
                    ) : (
                      <img src={img} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Product Details */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col">
          <Link
            href={`/store/${product.stores?.id || product.store_id}`}
            className="text-sm font-medium text-primary hover:underline mb-2"
          >
            {product.stores?.shop_name || "Visit Store"}
          </Link>
          <h1 className="text-4xl font-bold tracking-tight mb-4">{product.title}</h1>
          <p className="text-2xl font-medium mb-6">₹{product.price}</p>

          <div className="prose text-muted-foreground mb-8">
            <p>{product.description || "No description provided."}</p>
          </div>

          {/* ── Single Size / Free Size Display ── */}
          {isSingleSize && (
            <div className="mb-6 p-3.5 rounded-2xl border border-border/80 bg-secondary/30 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {config.unitLabel}:
                </span>
                <span className="px-3 py-1 rounded-lg bg-foreground text-background font-bold text-xs shadow-xs">
                  {product.sizes[0]}
                </span>
              </div>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Ready in Stock
              </span>
            </div>
          )}

          {/* ── Multiple Sizes Selector ── */}
          {hasMultipleSizes && (
            <motion.div
              ref={sizeSectionRef}
              key={shakeKey}
              animate={sizeError ? { x: [-8, 8, -6, 6, -3, 3, 0] } : {}}
              transition={{ duration: 0.4 }}
              className={`mb-8 p-4 rounded-2xl border transition-all duration-300 ${
                sizeError
                  ? "bg-red-500/10 border-red-500/50 ring-2 ring-red-500/30"
                  : "bg-secondary/20 border-border/60"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold tracking-tight text-foreground">
                    {config.label}
                  </h3>
                  <span className="text-xs text-muted-foreground font-normal">
                    ({config.unitLabel})
                  </span>
                </div>
                {selectedSize ? (
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                    Selected: {selectedSize}
                  </span>
                ) : sizeError ? (
                  <span className="text-xs font-bold text-red-500 flex items-center gap-1 animate-pulse">
                    <AlertCircle className="w-3.5 h-3.5" /> Size required
                  </span>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2.5">
                {product.sizes.map((size: string) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => {
                      setSelectedSize(size);
                      setSizeError(false);
                      setShowSizePopup(false);
                      if (popupTimerRef.current) clearTimeout(popupTimerRef.current);
                    }}
                    className={`h-11 min-w-[3.5rem] px-4 rounded-xl border text-sm font-bold transition-all cursor-pointer ${
                      selectedSize === size
                        ? "bg-foreground text-background border-foreground shadow-md scale-105"
                        : sizeError
                        ? "bg-background border-red-500/40 text-foreground hover:border-red-500 hover:bg-red-500/10"
                        : "bg-background border-border text-foreground hover:border-foreground/50 hover:bg-secondary/60"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>

              {sizeError && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3 flex items-center gap-2 text-xs font-semibold text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg"
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>
                    Please select your {config.unitLabel.toLowerCase()} of {productTypeNoun} ({product.sizes.join(", ")}) before adding to cart or buying!
                  </span>
                </motion.div>
              )}
            </motion.div>
          )}

          <div className="mt-auto pt-6 border-t border-border space-y-3">
            {/* Inline warning alert above action buttons if size missing */}
            {sizeError && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-semibold flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Please select your {config.unitLabel.toLowerCase()} of {productTypeNoun} above.</span>
                </div>
                <button
                  type="button"
                  onClick={() => sizeSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })}
                  className="underline underline-offset-2 font-bold cursor-pointer hover:opacity-80"
                >
                  Select Size ↑
                </button>
              </motion.div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button
                size="lg"
                variant="outline"
                className={`w-full h-14 text-base font-bold transition-all duration-200 border-2 cursor-pointer ${
                  isAdded
                    ? "bg-[#e6f7ec] hover:bg-[#d4f3dd] text-[#14532d] border-[#16a34a]"
                    : "border-border hover:border-foreground/40 bg-background text-foreground"
                }`}
                onClick={handleAddToCart}
              >
                {isAdded ? (
                  <>
                    <Check className="mr-2 h-5 w-5 text-[#16a34a]" /> Added to Cart!
                  </>
                ) : (
                  <>
                    <ShoppingBag className="mr-2 h-5 w-5" /> Add to Cart
                  </>
                )}
              </Button>

              <Button
                size="lg"
                className="w-full h-14 text-base font-bold bg-foreground text-background hover:bg-foreground/90 transition-all duration-200 shadow-md cursor-pointer"
                onClick={handleBuyNow}
              >
                <Zap className="mr-2 h-5 w-5 fill-current" /> Buy Now
              </Button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Related Products Section (Amazon / Flipkart style compact horizontal carousel) */}
      {relatedProducts.length > 0 && (
        <section className="mt-20 pt-12 border-t border-border">
          <div className="flex items-end justify-between mb-6">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1">
                More To Explore
              </p>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
                Related Products
              </h2>
            </div>

            {/* Left/Right Scroll Arrow Buttons */}
            <div className="hidden sm:flex items-center space-x-2">
              <button
                type="button"
                onClick={() => scroll("left")}
                className="p-2.5 rounded-full border border-border bg-background hover:bg-muted text-foreground transition-colors shadow-xs"
                aria-label="Scroll left"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => scroll("right")}
                className="p-2.5 rounded-full border border-border bg-background hover:bg-muted text-foreground transition-colors shadow-xs"
                aria-label="Scroll right"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Horizontal Scrollable Row */}
          <div
            ref={scrollContainerRef}
            className="flex gap-4 sm:gap-6 overflow-x-auto scrollbar-none pb-4 pt-1 -mx-4 px-4 sm:mx-0 sm:px-0 scroll-smooth snap-x snap-mandatory"
          >
            {relatedProducts.map((rel) => {
              const relImages: string[] = Array.isArray(rel.image_urls) ? rel.image_urls : [];
              const relStore = rel.stores?.shop_name || "AFRODER";

              return (
                <Link
                  key={rel.id}
                  href={`/product/${rel.id}`}
                  className="group flex-shrink-0 w-40 sm:w-48 md:w-52 snap-start flex flex-col focus:outline-none"
                >
                  {/* Compact Product Image */}
                  <div className="aspect-[3/4] w-full bg-secondary/60 rounded-xl overflow-hidden relative border border-border/80 mb-3 group-hover:border-foreground/30 transition-all duration-300 shadow-xs group-hover:shadow-md">
                    {relImages[0] ? (
                      <img
                        src={relImages[0]}
                        alt={rel.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs uppercase tracking-wider">
                        Preview
                      </div>
                    )}
                    {/* Hover Tint */}
                    <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/5 transition-colors duration-300" />
                  </div>

                  {/* Compact Product Details */}
                  <div className="space-y-1">
                    <p className="text-[11px] font-medium tracking-wide uppercase text-muted-foreground truncate">
                      {relStore}
                    </p>
                    <h3 className="text-sm font-semibold text-foreground tracking-tight line-clamp-1 group-hover:text-primary transition-colors">
                      {rel.title}
                    </h3>
                    <p className="text-sm font-bold text-foreground">
                      ₹{rel.price}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Google Auth Required Modal ── */}
      <GoogleLoginPromptModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        actionText={authActionText}
        redirectUrl={`/product/${product?.id || unwrappedParams.id}`}
      />
    </div>
  );
}

