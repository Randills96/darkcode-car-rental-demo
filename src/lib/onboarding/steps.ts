export type TourPlacement = "top" | "bottom" | "left" | "right" | "center";

export interface TourStep {
  id: string;
  title: string;
  description: string;
  /** CSS selector; omit for centered modal step */
  target?: string;
  /** Alternate selector on small screens */
  mobileTarget?: string;
  placement?: TourPlacement;
  /** Only show on dashboard route */
  dashboardOnly?: boolean;
}

export const onboardingSteps: TourStep[] = [
  {
    id: "welcome",
    title: "Welcome to Ready Cabs",
    description:
      "This quick tour shows how the back office is organized. You can skip or cancel anytime — restart it later from the help button in the header.",
    placement: "center",
  },
  {
    id: "navigation",
    title: "Find your way around",
    description:
      "Use the bar at the bottom of the screen to move between pages. More opens the rest of the modules. On a computer the menu stays on the left.",
    target: '[data-tour="sidebar"]',
    mobileTarget: '[data-tour="mobile-menu"]',
    placement: "top",
  },
  {
    id: "dashboard",
    title: "Start on the Dashboard",
    description:
      "Your daily command centre — upcoming pickups and returns, fleet status, revenue, and alerts all in one place.",
    target: '[data-tour-nav="dashboard"]',
    placement: "right",
  },
  {
    id: "upcoming-jobs",
    title: "Upcoming jobs & reminders",
    description:
      "See today's handovers and tomorrow's bookings early. Call customers, draft reminder messages, and open bookings from here.",
    target: '[data-tour="upcoming-jobs"]',
    placement: "bottom",
    dashboardOnly: true,
  },
  {
    id: "workflow",
    title: "Typical rental workflow",
    description:
      "1) Register the customer → 2) Add or select a vehicle → 3) Create a rental booking → 4) Record payments and deposits → 5) Track return & settlements.",
    placement: "center",
  },
  {
    id: "customers",
    title: "Customers",
    description:
      "Save contact details, NIC, driving licence, and uploaded documents. Blacklist flags help block risky repeat bookings.",
    target: '[data-tour-nav="customers"]',
    placement: "right",
  },
  {
    id: "rentals",
    title: "Rentals & payments",
    description:
      "Create bookings from Rentals. After handover, record payments under Payments and monitor balances on the rental profile.",
    target: '[data-tour-nav="rentals"]',
    placement: "right",
  },
  {
    id: "notifications",
    title: "Stay on top of alerts",
    description:
      "The bell shows document expiries, overdue returns, outstanding balances, and day-before pickup/return reminders.",
    target: '[data-tour="notifications"]',
    placement: "bottom",
  },
  {
    id: "finish",
    title: "You're all set",
    description:
      "Explore Reports for profitability, Settlements for owner/broker payouts, and Settings for company defaults. Need this tour again? Click the help icon in the header.",
    placement: "center",
  },
];

export function getStepsForPath(pathname: string): TourStep[] {
  const onDashboard = pathname === "/";
  return onboardingSteps.filter((step) => !step.dashboardOnly || onDashboard);
}
