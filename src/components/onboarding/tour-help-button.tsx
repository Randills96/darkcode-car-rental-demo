"use client";

import { CircleHelp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOnboardingTour } from "./onboarding-tour-provider";

export function TourHelpButton() {
  const { startTour } = useOnboardingTour();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label="Start guided tour"
      title="Guided tour"
      onClick={() => startTour({ force: true })}
    >
      <CircleHelp className="h-5 w-5" />
    </Button>
  );
}
