# RedKnot Rent-a-Car Back Office Management System

Internal web-based Rent-a-Car Fleet, Rental and Back Office Management System for **RedKnot Tours**.

## Tech Stack

- **Next.js 16** (App Router) + TypeScript
- **MySQL** + **Prisma ORM**
- **Tailwind CSS** + shadcn/ui components
- **Auth.js (NextAuth v5)** with RBAC
- **React Hook Form** + **Zod**
- **Recharts** for dashboards

## Prerequisites

- **Node.js >= 20.9.0** (required for Next.js 16)
- **MySQL 8.0+** or **MariaDB** (XAMPP on Windows)

## Getting Started

### 1. Install dependencies

```bash
cd redknot-rent-a-car
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env` and update your MySQL connection:

```env
DATABASE_URL="mysql://root@localhost:3306/redknot_rentacar"
AUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"
```

> **XAMPP users:** MySQL root password is usually empty — use `mysql://root@localhost:3306/...` (no password segment).

### 3. Set up database

```bash
# Create database schema
npm run db:push

# Seed sample data
npm run db:seed
```

### 4. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Default Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@redknot.lk | Admin@123 |
| Manager | manager@redknot.lk | Manager@123 |
| Employee | employee@redknot.lk | Employee@123 |

## Project Structure

```
docs/               Architecture, ER design, implementation plan
prisma/             Database schema, migrations, seed data
src/
  app/              Next.js App Router pages
  components/       UI components (shadcn/ui, layout, dashboard)
  lib/
    auth/           Authentication configuration
    db/             Prisma client
    permissions/    RBAC definitions
    services/       Business logic (pricing, dashboard, etc.)
    utils/          Formatters and helpers
```

## Implementation Phases

| Phase | Status | Scope |
|-------|--------|-------|
| 1 | ✅ Complete | Setup, Auth, RBAC, Layout, Dashboard |
| 2 | ✅ Complete | Customers, Documents, Blacklist |
| 3 | ✅ Complete | Vehicles, Owners, Documents, Availability |
| 4 | ✅ Complete | Drivers, Brokers |
| 5 | ✅ Complete | Rentals, Pricing, Handover, Return |
| 6 | ✅ Complete | Payments, Security Deposits, Damages |
| 7 | ✅ Complete | Owner Settlements, Broker Commissions |
| 8 | ✅ Complete | Maintenance, Expenses, Service Due Alerts |
| 9 | ✅ Complete | Profitability, Reports, Notifications, Audit |
| 10 | ✅ Complete | Settings, Users, Theme, Loading/Error, Deployment Docs |

See [docs/IMPLEMENTATION-PLAN.md](docs/IMPLEMENTATION-PLAN.md) for full details.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [ER Design](docs/ER-DESIGN.md)
- [Implementation Plan](docs/IMPLEMENTATION-PLAN.md)
- [Deployment Guide](docs/DEPLOYMENT.md)

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run db:push` | Push schema to database |
| `npm run db:migrate` | Run migrations |
| `npm run db:seed` | Seed sample data |
| `npm run db:studio` | Open Prisma Studio |

## Business Rules (Configurable)

- Rental day: **7:00 PM to 7:00 PM**
- Default included KM: **200 per day**
- Currency: **LKR (Rs.)**
- Owner/Broker commission: **Fixed amount** (not percentage)

## License

Proprietary — RedKnot Tours
