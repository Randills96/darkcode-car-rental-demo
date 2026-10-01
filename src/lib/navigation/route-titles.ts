export const routeTitles: Record<string, string> = {
  "/": "Dashboard",
  "/customers": "Customers",
  "/customers/blacklisted": "Blacklisted Customers",
  "/vehicles": "Vehicles",
  "/vehicles/documents": "Vehicle Documents",
  "/vehicles/availability": "Vehicle Availability",
  "/owners": "Owners",
  "/drivers": "Drivers",
  "/brokers": "Brokers",
  "/rentals": "Rentals",
  "/payments": "Payments",
  "/damages": "Damages",
  "/settlements": "Settlements",
  "/maintenance": "Maintenance",
  "/expenses": "Expenses",
  "/reports": "Reports",
  "/notifications": "Notifications",
  "/audit": "Audit Log",
  "/settings": "Settings",
  "/users": "Users",
};

export function getRouteTitle(pathname: string): string {
  if (routeTitles[pathname]) return routeTitles[pathname];

  const segments = pathname.split("/").filter(Boolean);
  if (segments.length >= 2) {
    const basePath = `/${segments[0]}`;
    if (routeTitles[basePath]) {
      const action = segments[1];
      if (action === "new") return `New ${routeTitles[basePath].replace(/s$/, "")}`;
      if (action === "edit") return `Edit ${routeTitles[basePath].replace(/s$/, "")}`;
      return routeTitles[basePath];
    }
  }

  return "Dashboard";
}
