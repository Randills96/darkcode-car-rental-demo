"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useClientMounted } from "@/lib/hooks/use-client-mounted";
import { Button } from "@/components/ui/button";
import type { TourPlacement, TourStep } from "@/lib/onboarding/steps";
import { cn } from "@/lib/utils";

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface OnboardingTourOverlayProps {
  step: TourStep;
  stepIndex: number;
  totalSteps: number;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

function pickVisibleElement(selector: string): Element | null {
  const elements = Array.from(document.querySelectorAll(selector));
  const visible = elements.find((element) => {
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  });
  return visible ?? elements[0] ?? null;
}

function resolveTarget(step: TourStep): Element | null {
  if (!step.target) return null;

  const isMobile = window.matchMedia("(max-width: 767px)").matches;
  const selector = isMobile && step.mobileTarget ? step.mobileTarget : step.target;
  const element = pickVisibleElement(selector);
  if (element) return element;

  if (isMobile && step.mobileTarget && step.target) {
    return pickVisibleElement(step.target);
  }

  return null;
}

function measureTarget(element: Element | null): Rect | null {
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  const padding = 8;
  return {
    top: Math.max(8, rect.top - padding),
    left: Math.max(8, rect.left - padding),
    width: rect.width + padding * 2,
    height: rect.height + padding * 2,
  };
}

function getPopoverStyle(placement: TourPlacement, rect: Rect | null): React.CSSProperties {
  if (!rect || placement === "center") {
    return {
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      width: "min(92vw, 420px)",
    };
  }

  const gap = 14;
  const cardWidth = Math.min(360, window.innerWidth - 24);

  switch (placement) {
    case "bottom":
      return {
        top: rect.top + rect.height + gap,
        left: Math.min(Math.max(12, rect.left), window.innerWidth - cardWidth - 12),
        width: cardWidth,
      };
    case "top":
      return {
        top: Math.max(12, rect.top - gap - 220),
        left: Math.min(Math.max(12, rect.left), window.innerWidth - cardWidth - 12),
        width: cardWidth,
      };
    case "left":
      return {
        top: Math.min(Math.max(12, rect.top), window.innerHeight - 240),
        left: Math.max(12, rect.left - cardWidth - gap),
        width: cardWidth,
      };
    case "right":
    default:
      return {
        top: Math.min(Math.max(12, rect.top), window.innerHeight - 240),
        left: Math.min(rect.left + rect.width + gap, window.innerWidth - cardWidth - 12),
        width: cardWidth,
      };
  }
}

export function OnboardingTourOverlay({
  step,
  stepIndex,
  totalSteps,
  onNext,
  onBack,
  onSkip,
}: OnboardingTourOverlayProps) {
  const mounted = useClientMounted();
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const placement = step.placement ?? (step.target ? "bottom" : "center");

  useEffect(() => {
    if (!mounted) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onSkip();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [mounted, onSkip]);

  useLayoutEffect(() => {
    function updatePosition() {
      const target = resolveTarget(step);
      target?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
      setTargetRect(measureTarget(target));
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [step]);

  if (!mounted) return null;

  const popoverStyle = getPopoverStyle(placement, targetRect);
  const isLastStep = stepIndex >= totalSteps - 1;

  return createPortal(
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-labelledby="tour-step-title">
      <div className="absolute inset-0 bg-black/55" onClick={onSkip} aria-hidden="true" />

      {targetRect && (
        <div
          className="pointer-events-none absolute rounded-xl ring-2 ring-primary/80 transition-all duration-300"
          style={{
            top: targetRect.top,
            left: targetRect.left,
            width: targetRect.width,
            height: targetRect.height,
            boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.55)",
          }}
        />
      )}

      <div
        className={cn(
          "absolute z-[101] rounded-2xl border bg-card p-5 shadow-2xl",
          placement === "center" && "text-center"
        )}
        style={popoverStyle}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className={cn("space-y-1", placement === "center" && "mx-auto")}>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              Step {stepIndex + 1} of {totalSteps}
            </p>
            <h3 id="tour-step-title" className="text-lg font-semibold leading-tight">
              {step.title}
            </h3>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 rounded-full"
            onClick={onSkip}
            aria-label="Close tour"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <p className="text-sm leading-relaxed text-muted-foreground">{step.description}</p>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onSkip}>
            Skip tour
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onBack} disabled={stepIndex === 0}>
              Back
            </Button>
            <Button type="button" size="sm" onClick={onNext}>
              {isLastStep ? "Finish" : "Next"}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
