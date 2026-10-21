import Image from "next/image";

interface BrandLoaderProps {
  fullScreen?: boolean;
}

export function BrandLoader({ fullScreen = true }: BrandLoaderProps) {
  const containerClasses = fullScreen
    ? "fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 backdrop-blur-md transition-all duration-300"
    : "flex flex-col items-center justify-center py-24 w-full";

  return (
    <div className={containerClasses} aria-label="Loading page">
      <div className="flex flex-col items-center select-none animate-pulse-subtle">
        {/* AFRODER Emblem Logo */}
        <div className="relative w-32 h-16 md:w-44 md:h-20 mb-2">
          <Image
            src="/logo-emblem.png"
            alt="AFRODER Logo"
            fill
            sizes="(max-width: 768px) 128px, 176px"
            className="object-contain"
            priority
          />
        </div>

        {/* AFRODER Title at base of logo */}
        <h2 className="text-xl md:text-2xl font-bold tracking-[0.28em] text-foreground pl-[0.28em]">
          AFRODER
        </h2>

        {/* Tagline */}
        <span className="text-[10px] md:text-xs uppercase tracking-[0.35em] text-muted-foreground mt-1 pl-[0.35em]">
          Premium Wear
        </span>

        {/* Animated Loader Line */}
        <div className="w-40 md:w-52 h-[2.5px] bg-foreground/15 rounded-full overflow-hidden relative mt-6">
          <div className="absolute inset-y-0 w-1/2 bg-foreground rounded-full animate-loader-line" />
        </div>
      </div>
    </div>
  );
}
