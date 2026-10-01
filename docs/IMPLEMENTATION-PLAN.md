# RedKnot Rent-a-Car — Implementation Plan

## Phase Overview

| Phase | Scope | Status |
|-------|-------|--------|
| 1 | Setup, Auth, RBAC, Layout, Dashboard | Complete |
| 2 | Customers, Documents, Blacklist | Complete |
| 3 | Vehicles, Owners, Documents, Availability | Complete |
| 4 | Drivers, Brokers | Complete |
| 5 | Rentals, Pricing, Handover, Return | Complete |
| 6 | Payments, Security Deposits, Damages | Complete |
| 7 | Owner Settlements, Broker Commissions, Driver Payments | Complete |
| 8 | Maintenance, Expenses | Complete |
| 9 | Profitability, Reports, Notifications, Audit Logs | Complete |
| 10 | UI Refinement, Security, Performance, Documentation | Complete |

---

## Phase 1 — Foundation (Current)

### Deliverables
- [x] Next.js project with TypeScript, Tailwind, App Router
- [x] Architecture documentation
- [x] ER design documentation
- [ ] Complete Prisma schema (all entities)
- [ ] Database migration
- [ ] Seed data (users, settings, sample entities)
- [ ] Auth.js credentials authentication
- [ ] RBAC middleware and permission guards
- [ ] Application shell (sidebar, header, breadcrumbs)
- [ ] Dashboard with real data queries

### Default Login Credentials (Seed)
| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@redknot.lk | Admin@123 |
| Manager | manager@redknot.lk | Manager@123 |
| Employee | employee@redknot.lk | Employee@123 |

---

## Phase 2 — Customer Management

- Customer CRUD with validation
- Customer profile page (info, documents, rental history, payments)
- Blacklist management with history
- Blacklisted customers report
- Search by name, NIC, phone

---

## Phase 3 — Vehicle & Fleet Management

- Vehicle CRUD with ownership types
- Vehicle owner management
- Vehicle document management with expiry alerts
- Availability calendar with double-booking prevention
- Vehicle history tracking

---

## Phase 4 — Drivers & Brokers

- Driver CRUD and assignment tracking
- Broker CRUD and commission tracking
- Driver expense recording

---

## Phase 5 — Rental Management (Core) ✅

- Rental lifecycle (Inquiry → Quoted → Confirmed → Active → Returned → Completed / Cancelled)
- Server-side pricing engine with daily/weekly/monthly/custom rate plans
- Rental day calculation (7 PM rule via `rental_day_start_time` system setting)
- Vehicle assignment with double-booking prevention
- Handover recording (odometer, fuel, condition, customer acknowledgement)
- Return recording with server-side extra KM charge calculation
- Blacklist warning/block on rental creation
- Pages: `/rentals`, `/rentals/new`, `/rentals/[id]`, `/rentals/[id]/edit`

---

## Phase 6 — Financial Operations ✅

- Payment ledger with multiple payments per rental
- Transaction-safe payment recording with automatic rental balance sync
- Security deposit collection and settlement (refund/retain)
- Damage management linked to rentals with payment tracking
- Pages: `/payments`, `/damages`, `/damages/new`, `/damages/[id]`
- Financial actions integrated into rental detail page

---

## Phase 7 — Settlements ✅

- Auto-generate owner settlements on rental completion (partner-owned vehicles)
- Fixed company commission via `default_owner_commission` system setting
- Auto-generate broker commissions on rental completion
- Fixed broker commission via `default_broker_commission` system setting
- Pay owner settlements and broker commissions (full or partial)
- Driver payment tracking ledger on `/settlements?tab=drivers`
- Integrated pay actions on rental, owner, and broker profiles

---

## Phase 8 — Operations ✅

- Vehicle maintenance module with service history and next-service tracking
- General expense management linked to vehicles, rentals, owners, and brokers
- Service due alerts on maintenance page and dashboard
- Pages: `/maintenance`, `/maintenance/new`, `/maintenance/[id]`, `/expenses`, `/expenses/new`, `/expenses/[id]`
- Vehicle profile maintenance tab with record/link actions

---

## Phase 9 — Intelligence ✅

- Vehicle, monthly, and owner profitability engine with margin analysis
- Reports module: rentals, payments, expenses, fleet utilization with CSV export
- Internal notification center with auto-sync from system alerts
- Audit log viewer with entity/action filters and pagination
- Pages: `/reports`, `/notifications`, `/audit`

---

## Phase 10 — Quality ✅

- Light / dark / system theme toggle (header + login page)
- System Settings page (`/settings`) — editable business rules
- User Management page (`/users`, `/users/new`, `/users/[id]/edit`) — Super Admin only
- Global loading and error UI states
- Deployment guide (`docs/DEPLOYMENT.md`)
- Security guards: last Super Admin protection, self-deactivation prevention

---

## Technical Decisions

1. **Server Actions** for mutations; API routes only where external access needed
2. **Prisma transactions** for all financial operations
3. **Zod schemas** shared between client forms and server validation
4. **SystemSetting table** for configurable business rules
5. **Soft delete** on master data; immutable financial records
6. **Recharts** for dashboard and report visualizations

## Prerequisites

- Node.js >= 20.9.0 (recommended)
- MySQL 8.0+
- Environment variables in `.env`:
  ```
  DATABASE_URL="mysql://user:password@localhost:3306/redknot_rentacar"
  AUTH_SECRET="your-secret-key"
  NEXTAUTH_URL="http://localhost:3000"
  ```
