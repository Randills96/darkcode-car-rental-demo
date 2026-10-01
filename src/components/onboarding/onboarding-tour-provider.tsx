"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { getStepsForPath } from "@/lib/onboarding/steps";
import { isTourCompleted, markTourCompleted } from "@/lib/onboarding/storage";
import { useMobileNav } from "@/components/layout/mobile-nav-context";
import { OnboardingTourOverlay } from "./onboarding-tour-overlay";

interface OnboardingTourContextValue {
  startTour: (options?: { force?: boolean }) => void;
  endTour: (options?: { completed?: boolean }) => void;
  isRunning: boolean;
}

const OnboardingTourContext = createContext<OnboardingTourContextValue | null>(null);

export function useOnboardingTour() {
  const context = useContext(OnboardingTourContext);
  if (!context) {
    throw new Error("useOnboardingTour must be used within OnboardingTourProvider");
  }
  return context;
}

interface OnboardingTourProviderProps {
  userId: string;
  children: ReactNode;
}

export function OnboardingTourProvider({ userId, children }: OnboardingTourProviderProps) {
  const pathname = usePathname();
  const { setOpen: setMobileNavOpen } = useMobileNav();
  const [isRunning, setIsRunning] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [autoStarted, setAutoStarted] = useState(false);

  const steps = useMemo(() => getStepsForPath(pathname), [pathname]);
  const effectiveStepIndex =
    steps.length === 0 ? 0 : Math.min(stepIndex, steps.length - 1);
  const currentStep = isRunning && steps.length > 0 ? steps[effectiveStepIndex] : null;

  const endTour = useCallback(
    (options?: { completed?: boolean }) => {
      setIsRunning(false);
      setStepIndex(0);
      if (options?.completed !== false) {
        markTourCompleted(userId);
      }
    },
    [userId]
  );

  const startTour = useCallback(
    (options?: { force?: boolean }) => {
      if (!options?.force && isTourCompleted(userId)) return;
      setStepIndex(0);
      setIsRunning(true);
    },
    [userId]
  );

  const goNext = useCallback(() => {
    if (stepIndex >= steps.length - 1) {
      endTour({ completed: true });
      return;
    }
    setStepIndex((index) => index + 1);
  }, [endTour, stepIndex, steps.length]);

  const goBack = useCallback(() => {
    setStepIndex((index) => Math.max(0, index - 1));
  }, []);

  useEffect(() => {
    if (autoStarted || !userId || isTourCompleted(userId)) return;

    const timer = window.setTimeout(() => {
      setAutoStarted(true);
      startTour();
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [autoStarted, startTour, userId]);

  useEffect(() => {
    if (!isRunning || !currentStep?.target?.includes("data-tour-nav")) return;
    if (!window.matchMedia("(max-width: 767px)").matches) return;
    const onTabBar = ["dashboard", "customers", "rentals"].some((id) =>
      currentStep.target?.includes(`"${id}"`)
    );
    if (onTabBar) return;
    setMobileNavOpen(true);
  }, [currentStep, isRunning, setMobileNavOpen]);

  useEffect(() => {
    if (isRunning) return;
    setMobileNavOpen(false);
  }, [isRunning, setMobileNavOpen]);

  const value = useMemo(
    () => ({ startTour, endTour, isRunning }),
    [endTour, isRunning, startTour]
  );

  return (
    <OnboardingTourContext.Provider value={value}>
      {children}
      {isRunning && currentStep && (
        <OnboardingTourOverlay
          step={currentStep}
          stepIndex={effectiveStepIndex}
          totalSteps={steps.length}
          onNext={goNext}
          onBack={goBack}
          onSkip={() => endTour({ completed: true })}
        />
      )}
    </OnboardingTourContext.Provider>
  );
}
