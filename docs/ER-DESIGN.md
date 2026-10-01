# RedKnot Rent-a-Car — Entity Relationship Design

## Core Entity Groups

### 1. Identity & Access
```
User ──< AuditLog
User ──< Notification (recipient)
Role (enum on User)
```

### 2. Customers
```
Customer ──< CustomerDocument
Customer ──< CustomerBlacklist (history)
Customer ──< Rental
Customer ──< Payment
Customer ──< RentalDamage
```

### 3. Fleet
```
VehicleOwner ──< Vehicle
Vehicle ──< VehicleDocument
Vehicle ──< VehicleMaintenance
Vehicle ──< VehicleExpense
Vehicle ──< Rental
Vehicle ──< RatePlan
```

### 4. Rental Lifecycle
```
Rental ──< RentalHandover
Rental ──< RentalReturn
Rental ──< RentalDamage
Rental ──< RentalCharge
Rental ──< Payment
Rental ──< SecurityDeposit
Rental ──< OwnerSettlement
Rental ──< BrokerCommission
Rental ──< DriverPayment
Rental ──< DriverExpense
Rental ──> Customer
Rental ──> Vehicle
Rental ──> Driver (optional)
Rental ──> Broker (optional)
```

### 5. Financial
```
Payment ──> Rental, Customer, User (recordedBy)
SecurityDeposit ──> Rental
OwnerSettlement ──> Rental, VehicleOwner
BrokerCommission ──> Rental, Broker
Expense ──> Vehicle, Rental, Driver, Owner, Broker (optional links)
```

### 6. People
```
Driver ──< Rental
Driver ──< DriverPayment
Driver ──< DriverExpense
Broker ──< Rental
Broker ──< BrokerCommission
VehicleOwner ──< Vehicle
VehicleOwner ──< OwnerSettlement
```

### 7. System
```
SystemSetting (key-value configuration)
AuditLog (immutable action history)
Notification (internal alerts)
RatePlan (vehicle pricing overrides)
```

## Key Relationships

| Parent | Child | Cardinality | Notes |
|--------|-------|-------------|-------|
| Customer | Rental | 1:N | Customer can have many rentals |
| Vehicle | Rental | 1:N | Prevent overlapping active rentals |
| VehicleOwner | Vehicle | 1:N | Owner can have multiple vehicles |
| Rental | Payment | 1:N | Multiple payments per rental |
| Rental | RentalHandover | 1:1 | One handover per rental |
| Rental | RentalReturn | 1:1 | One return per rental |
| Rental | SecurityDeposit | 1:N | Can have deposit + refund records |
| Rental | OwnerSettlement | 1:1 | For third-party vehicles |
| Rental | BrokerCommission | 0:1 | Optional broker link |
| Driver | Rental | 1:N | Assigned to driver rentals |
| Vehicle | VehicleMaintenance | 1:N | Service history |

## Indexes

Critical indexes for performance and integrity:

- `Customer.nic` — unique, searchable
- `Customer.phone` — searchable
- `Vehicle.registrationNumber` — unique
- `Rental.bookingNumber` — unique
- `Rental.(vehicleId, pickupDate, returnDate, status)` — availability queries
- `Payment.(rentalId, paymentDate)`
- `VehicleDocument.(vehicleId, expiryDate)` — alert queries
- `AuditLog.(entityType, entityId, createdAt)`

## Soft Delete Strategy

Soft delete (`deletedAt`) applied to:
- Customer
- Vehicle
- Driver
- Broker
- VehicleOwner
- User

NOT soft-deleted (immutable financial records):
- Rental, Payment, OwnerSettlement, BrokerCommission, Expense, AuditLog

## Decimal Fields

All monetary amounts: `Decimal @db.Decimal(12, 2)`

Fields include: dailyRate, extraKmRate, estimatedTotal, deliveryCharge, driverCharge, discount, securityDeposit, advancePayment, balance, payment amounts, repair costs, commission amounts, expense costs, etc.

## Assumptions

1. **Local customers only** — NIC is primary ID; passport optional
2. **Fixed commission** — Owner and broker commissions are fixed amounts, not percentages
3. **Rental day = 7 PM to 7 PM** — configurable via SystemSetting
4. **200 KM/day default** — configurable via SystemSetting and per-vehicle
5. **Single branch** — no multi-branch support in v1
6. **LKR only** — no multi-currency in v1
