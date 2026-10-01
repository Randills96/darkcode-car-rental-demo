import { Car } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { COMPANY_NAME, COMPANY_TAGLINE } from "@/lib/branding";

export default function Loading() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/90 backdrop-blur-md transition-colors">
      <div className="relative flex flex-col items-center max-w-sm px-6 py-8 text-center">
        {/* Soft background ambient glow */}
        <div className="absolute -inset-8 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

        {/* Central Brand Badge with spinning ring */}
        <div className="relative mb-5 flex items-center justify-center">
          {/* Subtle outer pulsing ring */}
          <div className="absolute -inset-2.5 rounded-3xl border border-primary/25 bg-primary/5 animate-pulse" />

          {/* Smooth rotating accent ring */}
          <div className="absolute -inset-3.5 rounded-3xl border-2 border-transparent border-t-primary border-r-primary/40 animate-spin [animation-duration:2.5s]" />

          {/* Logo container card */}
          <div className="relative flex h-24 w-24 items-center justify-center rounded-2xl bg-card p-3 shadow-xl shadow-primary/5 border border-border/70">
            <BrandLogo size={72} priority className="h-full w-full object-contain" />
          </div>
        </div>

        {/* Brand Name & Tagline */}
        <h2 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
          {COMPANY_NAME}
        </h2>
        <p className="mt-1 text-xs font-medium text-muted-foreground tracking-wide">
          {COMPANY_TAGLINE}
        </p>

        {/* Animated Car & Moving Road */}
        <div className="mt-6 flex flex-col items-center w-full">
          <div className="relative flex flex-col items-center">
            {/* Driving Car icon with gentle suspension bounce */}
            <div className="animate-car-bob text-primary">
              <Car className="h-7 w-7 stroke-[2.2]" />
            </div>

            {/* Road with moving dashed lane markings */}
            <div className="relative mt-1 h-1 w-40 overflow-hidden rounded-full bg-muted border border-border/40">
              <div className="absolute inset-0 flex space-x-1.5 animate-road">
                {[...Array(14)].map((_, i) => (
                  <span
                    key={i}
                    className="h-full w-2.5 shrink-0 bg-primary/70 rounded-full"
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Smooth Shimmering Progress Bar */}
          <div className="mt-5 h-1.5 w-44 overflow-hidden rounded-full bg-muted shadow-inner border border-border/30">
            <div className="h-full w-full bg-gradient-to-r from-transparent via-primary to-transparent animate-shimmer" />
          </div>

          {/* Status text with animated bouncing dots */}
          <div className="mt-3.5 flex items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground">
            <span>Loading</span>
            <span className="flex space-x-1">
              <span className="h-1 w-1 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
              <span className="h-1 w-1 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
              <span className="h-1 w-1 rounded-full bg-primary animate-bounce" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
