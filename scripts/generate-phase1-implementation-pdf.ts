/**
 * Phase 1 implementation report PDF.
 * Run: npx tsx scripts/generate-phase1-implementation-pdf.ts
 */
import { copyFileSync, createWriteStream } from "fs";
import { mkdir } from "fs/promises";
import path from "path";
import PDFDocument from "pdfkit";

const OUT = path.join(process.cwd(), "docs", "PHASE-1-IMPLEMENTATION-REPORT.pdf");
const ROOT_COPY = path.join(process.cwd(), "..", "Phase-1-Implementation-Report.pdf");

const C = {
  primary: "#0f4c81",
  primaryDark: "#0a3558",
  text: "#1f2937",
  muted: "#4b5563",
  line: "#d1d5db",
  panel: "#f3f4f6",
  white: "#ffffff",
};

type Block =
  | { t: "h1"; text: string }
  | { t: "h2"; text: string }
  | { t: "p"; text: string }
  | { t: "b"; items: string[] }
  | { t: "note"; text: string }
  | { t: "kv"; rows: [string, string][] };

const toc = [
  "A. Changes made",
  "B. Files modified",
  "C. Files created",
  "D. Packages installed",
  "E. Database / schema changes",
  "F. Bugs fixed",
  "G. Security fixes",
  "H. Permission changes",
  "I. UI/UX changes",
  "J. Tests performed",
  "K. Tests passed",
  "L. Tests failed",
  "M. Remaining issues",
  "N. Changes intentionally not made",
  "O. Recommendations for Phase 2 SaaS conversion",
  "P. Driver-to-User linking limitation and recommended future solution",
];

const docContent: Block[] = [
  { t: "h1", text: "A. Changes made" },
  {
    t: "p",
    text: "Phase 1 implemented the approved safe baseline work on the current single-tenant RedKnot Rent-a-Car system. No SaaS, multi-tenancy, companyId, subscriptions, Google OAuth, email verification, or global blacklist work was started. Business formulas were not changed.",
  },
  { t: "h2", text: "Rental cancellation" },
  {
    t: "p",
    text: "cancelRental now requires rentals.cancel instead of rentals.edit. Employee/Staff can no longer cancel a hire. ADMIN and SUPER_ADMIN still can. The Cancel button was already hidden without rentals.cancel; the server action is now aligned with that UI.",
  },
  { t: "h2", text: "Driver receipt and record access" },
  {
    t: "p",
    text: "The DRIVER role was kept. A User is still not linked to a Driver master record. Immediate unauthorized access was closed without that architecture change: Drivers cannot open /rentals/[id] (including receipt and refund pages) via middleware or the page guard; hire receipt HTML/PDF requires rentals.receipt (Employee and administrators only); owner and broker settlement PDFs require settlements.view only (Drivers never had that permission, but previously rentals.view was enough).",
  },
  { t: "h2", text: "Expenses" },
  {
    t: "p",
    text: "Employee/Staff: view and create only. ADMIN and SUPER_ADMIN: view, create, edit, and delete. Edit and delete UI and server actions were added. Staff cannot reach /expenses/[id]/edit or call deleteExpense.",
  },
  { t: "h2", text: "Health endpoint" },
  {
    t: "p",
    text: "/api/health now returns only { status: \"ok\" }. It no longer reports AUTH_SECRET presence, NEXTAUTH_URL, Vercel, database connectivity, or hints.",
  },
  { t: "h2", text: "Broadcast notifications" },
  {
    t: "p",
    text: "Marking a company-wide notification (userId null) as read no longer flips isRead on the shared row. A per-user read receipt is stored as a Notification row with entityType BROADCAST_READ. Other users still see the broadcast as unread. No Prisma schema change was required.",
  },
  { t: "h2", text: "Currency display" },
  {
    t: "p",
    text: "formatCurrency now uses Settings currency_symbol. DashboardShell loads the setting and provides it to client forms. Numeric calculations were not changed.",
  },
  { t: "h2", text: "UI/UX" },
  {
    t: "p",
    text: "Sidebar items, order, Rentals MAIN badge, desktop sidebar, and mobile tab bar were preserved. Visual hierarchy, spacing, tables, empty states, login, and reduced motion were improved.",
  },

  { t: "h1", text: "B. Files modified" },
  {
    t: "b",
    items: [
      "src/lib/permissions/index.ts — new permissions; Employee expenses; Driver hire-record route block.",
      "src/lib/auth/session.ts — requireNonDriver helpers.",
      "src/app/rentals/actions.ts — cancel uses rentals.cancel.",
      "src/app/rentals/[id]/page.tsx — Drivers cannot open hire details.",
      "src/app/rentals/[id]/receipt/page.tsx — rentals.receipt required.",
      "src/app/api/rentals/[id]/receipt/route.ts — rentals.receipt required.",
      "src/app/api/settlements/owner/[id]/receipt/route.ts and broker equivalent — settlements.view only.",
      "src/app/api/health/route.ts — public liveness only.",
      "src/lib/services/notification.ts — per-user broadcast read receipts.",
      "src/app/expenses/actions.ts — updateExpense and deleteExpense.",
      "src/app/expenses/[id]/page.tsx — Edit/Delete for administrators.",
      "src/components/expenses/expense-form.tsx — create and edit; settings currency label.",
      "src/lib/utils/index.ts — settings-driven formatCurrency.",
      "src/lib/services/settings.ts — applies currency_symbol as display default.",
      "src/components/layout/* — currency provider, sidebar grouping, header, spacing.",
      "src/components/ui/card.tsx and table.tsx — quieter commercial styling.",
      "src/app/login/login-form.tsx — removed seeded password from the login screen.",
      "package.json — test script includes new Phase 1 tests.",
      "Payment, settlement, vehicle, damage, and driver amount labels — currency_symbol.",
    ],
  },

  { t: "h1", text: "C. Files created" },
  {
    t: "b",
    items: [
      "src/lib/auth/driver-access.ts",
      "src/lib/services/notification-read.ts",
      "src/components/currency-provider.tsx",
      "src/components/expenses/delete-expense-button.tsx",
      "src/app/expenses/[id]/edit/page.tsx",
      "src/lib/permissions/permissions.test.ts",
      "src/lib/services/notification-read.test.ts",
      "src/lib/services/phase1-access.test.ts",
      "scripts/generate-phase1-implementation-pdf.ts",
    ],
  },

  { t: "h1", text: "D. Packages installed" },
  {
    t: "p",
    text: "None. No new npm packages were added.",
  },

  { t: "h1", text: "E. Database / schema changes" },
  {
    t: "p",
    text: "None. prisma/schema.prisma was not changed. No migrations were run. Broadcast read state reuses the existing notifications table with entityType = BROADCAST_READ rather than a new table.",
  },

  { t: "h1", text: "F. Bugs fixed" },
  {
    t: "b",
    items: [
      "Employee could cancel a rental because cancelRental used rentals.edit.",
      "One user marking a broadcast notification read marked it read for everyone.",
      "Hardcoded Rs. ignored Settings currency_symbol on amounts and several form labels.",
      "Expense administrators had no edit/delete path even though the product needed owner-level management.",
    ],
  },

  { t: "h1", text: "G. Security fixes" },
  {
    t: "b",
    items: [
      "/api/health no longer leaks environment or database status.",
      "Login page no longer displays the seeded admin password.",
      "Hire receipt HTML and PDF require rentals.receipt. Drivers cannot open them by changing the rental id.",
      "Middleware blocks DRIVER from every /rentals/* path except the list /rentals.",
      "Hire detail page also refuses DRIVER even if middleware is bypassed in a later change.",
      "Settlement PDFs no longer accept rentals.view as a substitute for settlements.view.",
    ],
  },

  { t: "h1", text: "H. Permission changes" },
  {
    t: "kv",
    rows: [
      ["rentals.cancel", "Still SUPER_ADMIN and ADMIN only. Now actually enforced on cancelRental."],
      ["rentals.receipt", "New. SUPER_ADMIN, ADMIN, EMPLOYEE. Not DRIVER."],
      ["expenses.view / create", "Added to EMPLOYEE so Staff can record and see expenses."],
      ["expenses.edit / delete", "New. SUPER_ADMIN and ADMIN only. Not EMPLOYEE."],
      ["DRIVER", "Still dashboard, rentals.view (list only), notifications. No receipts, no hire records."],
    ],
  },

  { t: "h1", text: "I. UI/UX changes" },
  {
    t: "b",
    items: [
      "All 17 sidebar items remain in the same order: Dashboard, Customers, Vehicles, Owners, Drivers, Brokers, Rentals, Payments, Damages, Settlements, Maintenance, Expenses, Reports, Notifications, Audit Log, Settings, Users.",
      "Rentals MAIN badge kept.",
      "Desktop left sidebar and mobile bottom tab bar kept.",
      "Sidebar grouped visually into Operations, Finance, and System without relocating items.",
      "Reduced hover motion and dashboard pulse animations for all-day use.",
      "Tables: header background, tracking, and more comfortable cell padding.",
      "Cards: lighter shadow, slightly smaller titles.",
      "Empty states: dashed panel, clearer copy hierarchy.",
      "Login: professional sign-in copy; credentials hint removed.",
      "Expense detail: Edit and Delete only when the user has permission.",
    ],
  },

  { t: "h1", text: "J. Tests performed" },
  {
    t: "p",
    text: "Automated: npm test (tsx). Coverage includes existing pricing/commission tests plus new permission, driver access, notification overlay, deposit remaining, cancel-transition, and currency display tests. Typecheck: npx tsc --noEmit (clean).",
  },
  {
    t: "p",
    text: "Manual browser QA of every module against production was not run in this pass. After you deploy a Randills96-authored commit, hire cancel, Driver URL probes, expense edit/delete, notification read, and Settings currency_symbol should be smoke-tested live.",
  },

  { t: "h1", text: "K. Tests passed" },
  {
    t: "p",
    text: "26 automated tests passed, 0 failed. Suites: role permissions, rental days, pricing, balance, broker commission, owner settlement, vehiclePaysAnOwner, deriveOwnerRatesFromCustomerRates, broadcast notification read state, rental cancel transitions, security deposit remaining, currency display.",
  },

  { t: "h1", text: "L. Tests failed" },
  {
    t: "p",
    text: "None in this Phase 1 automated run.",
  },

  { t: "h1", text: "M. Remaining issues" },
  {
    t: "b",
    items: [
      "DRIVER can still open /rentals (the list) and the dashboard, which still show company-wide hire data. Record pages and receipts are blocked. Proper scoping needs User↔Driver linking in Phase 2.",
      "JWT role/status can remain stale until idle timeout or 8-hour maxAge.",
      "Uploads remain on the Vercel local disk and will not survive deploys.",
      "Unique codes still use count()+1 and can race under concurrent creates.",
      "Anyone with customers.view can fetch any customer document id (single-tenant IDOR pattern).",
      "Anyone with users.create can still assign SUPER_ADMIN (today only SUPER_ADMIN has users.create).",
      "No login rate limit or lockout.",
      "Some instructional example copy still mentions Rs. in help text; live amounts use Settings.",
    ],
  },

  { t: "h1", text: "N. Changes intentionally not made" },
  {
    t: "b",
    items: [
      "No Company, companyId, tenantId, or Prisma schema change.",
      "No Platform Super Admin UI, Company Owner role rename, subscriptions, grace period, or annual pricing.",
      "No Google OAuth, email verification, or password reset.",
      "No global NIC blacklist.",
      "No S3/R2 migration.",
      "No dynamic per-company branding (RedKnot branding kept).",
      "No change to rental pricing, extra KM, deposit math, payment totals, settlements, commissions, or profit formulas.",
      "No sidebar item removed, renamed, merged, or relocated.",
      "No replacement of Next.js, Prisma, NextAuth, or UI libraries.",
      "No packages installed.",
    ],
  },

  { t: "h1", text: "O. Recommendations for Phase 2 SaaS conversion" },
  {
    t: "b",
    items: [
      "Git-checkpoint this Phase 1 baseline after production smoke QA.",
      "Add Company and companyId on tenant rows; Prisma query filter; IDOR tests Company A vs B.",
      "Split today’s SUPER_ADMIN into platform SUPER ADMIN (separate UI) and Company Owner.",
      "Map Employee to Staff with this Phase 1 expense/cancel matrix as the starting point.",
      "Replace global SystemSetting with per-company branding and currency.",
      "Move files to object storage with tenant prefixes.",
      "Key dashboard cache by companyId.",
      "Global blacklist by unique NIC, warn on hire, do not hard-block.",
      "Configurable subscription amounts (do not hardcode 85,000 / 20,000).",
      "Link DRIVER users to Driver records before exposing assigned-hire-only access.",
    ],
  },

  { t: "h1", text: "P. Driver-to-User linking limitation and recommended future solution" },
  {
    t: "p",
    text: "Today a login User with role DRIVER is not related to the Driver master table. There is no driverId (or userId on Driver) that would tell the app which hires that person is assigned to. Therefore Phase 1 cannot safely show “only my jobs”. The safe choice was to keep the role, keep the Rentals list permission, and block record-level hire pages, receipts, and settlement PDFs.",
  },
  {
    t: "p",
    text: "Recommended Phase 2/RBAC solution: add a required link from User to Driver for DRIVER-role accounts (Driver.userId unique, or User.driverId). Authorize hire access as: authenticated user + companyId + (role/permission) + (rental.driverId === session.driverId, or staff/owner unrestricted within the company). Do not rely on hiding buttons. Platform Super Admin remains a separate UI and must not use this company sidebar.",
  },
  {
    t: "note",
    text: "Phase 1 implementation is complete for the approved scope. Do not start Phase 2 SaaS conversion until this baseline is reviewed and approved.",
  },
];

async function main() {
  await mkdir(path.dirname(OUT), { recursive: true });

  const doc = new PDFDocument({
    size: "A4",
    bufferPages: true,
    margins: { top: 64, bottom: 56, left: 54, right: 54 },
    info: {
      Title: "RedKnot Rent-a-Car — Phase 1 Implementation Report",
      Author: "RedKnot technical review",
      Subject: "Phase 1 QA, security, and UI/UX implementation",
      CreationDate: new Date("2026-09-17"),
    },
  });

  const stream = createWriteStream(OUT);
  doc.pipe(stream);

  const left = doc.page.margins.left;
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  function ensureSpace(h: number) {
    const bottom = doc.page.height - doc.page.margins.bottom - 16;
    if (doc.y + h > bottom) {
      doc.addPage();
      doc.y = 86;
    }
  }

  function drawHeader() {
    doc.save();
    doc.rect(0, 0, doc.page.width, 48).fill(C.primary);
    doc.fillColor(C.white).font("Helvetica-Bold").fontSize(9);
    doc.text("REDKNOT  ·  RENT-A-CAR", 54, 12, { width: pageWidth / 2, align: "left" });
    doc.font("Helvetica").fontSize(8);
    doc.text("Phase 1  ·  Implementation Report", 54, 26, { width: pageWidth / 2 });
    doc.font("Helvetica").fontSize(8);
    doc.text("Confidential", 54, 18, { width: pageWidth, align: "right" });
    doc.restore();
  }

  function drawFooter() {
    const y = doc.page.height - 36;
    doc.save();
    doc.moveTo(54, y - 8).lineTo(doc.page.width - 54, y - 8).strokeColor(C.line).lineWidth(0.5).stroke();
    doc.fillColor(C.muted).font("Helvetica").fontSize(8);
    doc.text("Prepared 17 Sep 2026  ·  Phase 1 complete  ·  SaaS conversion not started", 54, y, {
      width: pageWidth - 80,
      align: "left",
    });
    doc.restore();
  }

  doc.rect(0, 0, doc.page.width, doc.page.height).fill(C.white);
  doc.rect(0, 0, doc.page.width, 220).fill(C.primary);
  doc.fillColor(C.white).font("Helvetica").fontSize(11);
  doc.text("REDKNOT  ·  RENT-A-CAR MANAGEMENT SYSTEM", 54, 72, { width: pageWidth });
  doc.font("Helvetica-Bold").fontSize(24);
  doc.text("Phase 1 — Implementation Report", 54, 100, { width: pageWidth });
  doc.font("Helvetica").fontSize(12);
  doc.text(
    "Approved baseline work: security nits, cancellation and Driver access rules, expenses, notifications, currency display, UI polish, and tests. SaaS conversion has not started.",
    54,
    150,
    { width: pageWidth, lineGap: 4 }
  );

  const meta: [string, string][] = [
    ["Document type", "Phase 1 implementation and QA report"],
    ["Date", "17 September 2026"],
    ["Automated tests", "26 passed, 0 failed"],
    ["Typecheck", "npx tsc --noEmit — clean"],
    ["Schema changes", "None"],
    ["Packages added", "None"],
  ];
  meta.forEach(([k, v], i) => {
    const y = 250 + i * 28;
    doc.font("Helvetica-Bold").fillColor(C.primary).text(k, 54, y, { width: 140 });
    doc.font("Helvetica").fillColor(C.text).text(v, 200, y, { width: pageWidth - 146 });
  });

  doc.addPage();
  doc.y = 86;
  doc.fillColor(C.primary).font("Helvetica-Bold").fontSize(16).text("Contents", left, doc.y);
  doc.moveDown(0.8);
  toc.forEach((item) => {
    ensureSpace(18);
    doc.fillColor(C.text).font("Helvetica").fontSize(10);
    doc.text(item, left, doc.y, { width: pageWidth });
  });

  doc.addPage();
  doc.y = 86;

  for (const block of docContent) {
    if (block.t === "h1") {
      ensureSpace(48);
      doc.moveDown(0.4);
      doc.fillColor(C.primary).font("Helvetica-Bold").fontSize(14);
      doc.text(block.text, left, doc.y, { width: pageWidth });
      const y = doc.y + 4;
      doc.moveTo(left, y).lineTo(left + pageWidth, y).strokeColor(C.line).lineWidth(0.8).stroke();
      doc.y = y + 10;
    } else if (block.t === "h2") {
      ensureSpace(28);
      doc.moveDown(0.2);
      doc.fillColor(C.primaryDark).font("Helvetica-Bold").fontSize(11);
      doc.text(block.text, left, doc.y, { width: pageWidth });
      doc.moveDown(0.25);
    } else if (block.t === "p") {
      ensureSpace(36);
      doc.fillColor(C.text).font("Helvetica").fontSize(10);
      doc.text(block.text, left, doc.y, { width: pageWidth, align: "justify", lineGap: 2.5 });
      doc.moveDown(0.45);
    } else if (block.t === "b") {
      for (const item of block.items) {
        const h = doc.heightOfString(item, { width: pageWidth - 16, lineGap: 2 });
        ensureSpace(h + 10);
        const y = doc.y;
        doc.fillColor(C.primary).circle(left + 3.5, y + 6, 2).fill();
        doc.fillColor(C.text).font("Helvetica").fontSize(10);
        doc.text(item, left + 14, y, { width: pageWidth - 16, lineGap: 2 });
        doc.moveDown(0.22);
      }
      doc.moveDown(0.2);
    } else if (block.t === "note") {
      const h = doc.heightOfString(block.text, { width: pageWidth - 24, lineGap: 2 }) + 16;
      ensureSpace(h);
      const y = doc.y;
      doc.save();
      doc.rect(left, y, pageWidth, h).fill(C.panel);
      doc.restore();
      doc.fillColor(C.primaryDark).font("Helvetica-Oblique").fontSize(9.5);
      doc.text(block.text, left + 12, y + 8, { width: pageWidth - 24, lineGap: 2 });
      doc.y = y + h + 8;
    } else if (block.t === "kv") {
      for (const [k, v] of block.rows) {
        const h = Math.max(16, doc.heightOfString(v, { width: pageWidth - 150, lineGap: 1.5 })) + 8;
        ensureSpace(h);
        const y = doc.y;
        doc.fillColor(C.primary).font("Helvetica-Bold").fontSize(9);
        doc.text(k, left, y, { width: 136 });
        doc.fillColor(C.text).font("Helvetica").fontSize(9.5);
        doc.text(v, left + 140, y, { width: pageWidth - 140, lineGap: 1.5 });
        doc.y = y + h;
      }
      doc.moveDown(0.3);
    }
  }

  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    if (i > 0) drawHeader();
    drawFooter();
    doc.fillColor(C.muted).font("Helvetica").fontSize(8);
    doc.text(`Page ${i + 1} of ${range.count}`, 54, doc.page.height - 36, {
      width: pageWidth,
      align: "right",
    });
  }

  doc.end();
  await new Promise<void>((resolve, reject) => {
    stream.on("finish", resolve);
    stream.on("error", reject);
  });

  try {
    copyFileSync(OUT, ROOT_COPY);
    console.log("Wrote", OUT);
    console.log("Copied", ROOT_COPY);
  } catch {
    console.log("Wrote", OUT);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
