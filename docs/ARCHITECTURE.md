# RedKnot Rent-a-Car — System Architecture

## Overview

RedKnot Rent-a-Car is an internal back-office management system for RedKnot Tours. It manages the complete vehicle rental lifecycle from customer inquiry through settlement and profitability reporting.

## Architecture Pattern

```
┌─────────────────────────────────────────────────────────────┐
│                     Presentation Layer                       │
│  Next.js App Router (React Server Components + Client)      │
│  shadcn/ui · Tailwind CSS · React Hook Form · Zod           │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                     Application Layer                        │
│  Server Actions · API Routes · Auth Middleware · RBAC       │
│  Pricing Engine · Availability Service · Audit Service      │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                      Domain Layer                            │
│  Business Rules · Validation · Financial Calculations       │
│  Rental Lifecycle · Settlement Logic · Alert Generation      │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                   Data Access Layer                          │
│  Prisma ORM · MySQL · Transactions · Soft Deletes           │
└─────────────────────────────────────────────────────────────┘
```

## Folder Structure

```
src/
├── app/
│   ├── (auth)/              # Login, public auth pages
│   ├── (dashboard)/         # Protected back-office routes
│   │   ├── customers/
│   │   ├── vehicles/
│   │   ├── rentals/
│   │   ├── payments/
│   │   ├── owners/
│   │   ├── brokers/
│   │   ├── drivers/
│   │   ├── maintenance/
│   │   ├── expenses/
│   │   ├── reports/
│   │   ├── settings/
│   │   └── users/
│   ├── api/                 # REST endpoints where needed
│   └── layout.tsx
├── components/
│   ├── ui/                  # shadcn/ui primitives
│   ├── layout/              # Sidebar, header, breadcrumbs
│   ├── dashboard/           # Dashboard widgets
│   ├── forms/               # Reusable form components
│   └── shared/              # Tables, badges, dialogs
├── lib/
│   ├── auth/                # NextAuth config, session helpers
│   ├── db/                  # Prisma client singleton
│   ├── permissions/         # RBAC definitions and guards
│   ├── services/            # Business logic services
│   │   ├── pricing.ts
│   │   ├── availability.ts
│   │   ├── rental.ts
│   │   ├── payment.ts
│   │   ├── settlement.ts
│   │   ├── profitability.ts
│   │   ├── alerts.ts
│   │   └── audit.ts
│   ├── validations/         # Zod schemas
│   └── utils/               # Formatters, helpers
├── types/                   # Shared TypeScript types
└── hooks/                   # Client-side hooks
```

## Authentication & Authorization

- **Auth.js (NextAuth v5)** with credentials provider
- Passwords hashed with bcrypt
- JWT/session-based authentication
- Middleware protects all `(dashboard)` routes
- **RBAC roles**: SUPER_ADMIN, ADMIN, EMPLOYEE, DRIVER
- Server-side permission checks on every mutation
- Permission map defines module-level access per role

## Business Configuration

Centralized in `SystemSetting` table (key-value pairs):

| Key | Default | Description |
|-----|---------|-------------|
| `rental_day_start_time` | `19:00` | Rental day boundary (7 PM) |
| `default_included_km` | `200` | KM included per rental day |
| `currency` | `LKR` | Primary currency |
| `currency_symbol` | `Rs.` | Display symbol |
| `block_blacklisted_booking` | `false` | Auto-block blacklisted customers |

Vehicle-level rates override defaults via `RatePlan` or vehicle fields.

## Rental Lifecycle State Machine

```
Inquiry → Quoted → Confirmed → Active → Returned → Completed
                    ↓
                Cancelled
```

Status transitions are validated server-side. Vehicle status syncs with rental status.

## Financial Integrity

- All monetary values use `Decimal(12,2)` in MySQL via Prisma
- Server-side pricing engine calculates all totals
- Database transactions for payment recording, settlements
- Audit log for all financial mutations
- No soft-delete on financial records

## Availability & Double-Booking Prevention

- Availability service checks overlapping rentals, reservations, maintenance, and unavailable periods
- Vehicle assignment uses database-level transaction with overlap check
- Unique constraint on active rental per vehicle per time period

## Future Extensibility

The architecture separates:
- **Core domain** (rentals, vehicles, customers) — reusable by future public API
- **Back-office UI** — internal only
- **System settings** — configurable without code changes
- **Audit trail** — supports compliance and accounting integration

Future modules (public booking, WhatsApp, SMS) can be added as separate route groups or microservices consuming the same database and services layer.
