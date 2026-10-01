# Rent a Car Management System

## User Guide

**Version:** 1.0  
**Language:** English  
**Audience:** All system roles (Super Admin, Admin, Employee, Driver)

---

## Table of Contents

1. Introduction  
2. Getting Started  
3. User Roles and Access  
4. Dashboard  
5. Customers  
6. Vehicles  
7. Vehicle Owners  
8. Drivers  
9. Brokers  
10. Rentals  
11. Payments and Deposits  
12. Damages  
13. Settlements  
14. Maintenance  
15. Expenses  
16. Reports  
17. Notifications  
18. Audit Log  
19. Settings  
20. Users (Super Admin)  
21. Appendix  

---

## 1. Introduction

### 1.1 Purpose

The **Rent a Car Management System** is a back-office web application for running a car rental business. It helps you:

- Register customers and store identity documents  
- Manage fleet, partners, and drivers  
- Create and track rental bookings from inquiry to completion  
- Record payments, security deposits, and damages  
- Settle owner and broker accounts  
- Monitor alerts, compliance, and financial performance  

### 1.2 Who Uses the System

| Role | Typical user |
|------|----------------|
| Super Admin | Business owner or IT administrator |
| Admin (Manager) | Branch manager, operations manager |
| Employee | Front-desk staff, rental coordinators |
| Driver | Company drivers (limited read-only access) |

### 1.3 How to Open the System

1. Open a web browser (Chrome, Edge, or Safari recommended).  
2. Go to your organisation’s system URL (for example, your Vercel link or `http://localhost:3000` on the office PC).  
3. Sign in with your email and password.  
4. On a phone, use the **menu icon** (top bar) to open navigation.  

**Note:** The system signs you out automatically after **10 minutes of inactivity**. You will see a message asking you to sign in again.

---

## 2. Getting Started

### 2.1 First Login

Use the credentials provided by your administrator. Demo/training accounts (if seeded):

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@redknot.lk | Admin@123 |
| Admin | manager@redknot.lk | Manager@123 |
| Employee | employee@redknot.lk | Employee@123 |
| Driver | driver@redknot.lk | Driver@123 |

**Important:** Change default passwords in production.

### 2.2 Navigation

- **Desktop:** The sidebar on the left lists all modules you can access.  
- **Mobile:** Tap the **menu** button to open the same list.  
- **Header:** Theme toggle, notifications bell, help tour, and sign out.  

### 2.3 Guided Tour

Click the **Help** button in the header to start the onboarding tour. It explains dashboard, customers, rentals, and notifications. You can restart the tour at any time.

### 2.4 Typical Daily Workflow

1. Check the **Dashboard** and **Notifications** for today’s pickups, returns, and alerts.  
2. Register or find the **Customer**.  
3. Confirm **Vehicle** availability.  
4. Create or update the **Rental** booking.  
5. At handover: complete **Handover** and collect **Deposit** / **Advance** if needed.  
6. At return: record **Ending Odometer**.  
7. Record **Payments** until balance is zero.  
8. **Complete** the rental.  
9. Process **Settlements** for owners/brokers when due.  

---

## 3. User Roles and Access

### 3.1 Super Admin

Full access to every module, including **Users** (create/edit/deactivate staff accounts).

### 3.2 Admin (Manager)

Same as Super Admin **except** cannot access the **Users** module.

### 3.3 Employee

Can manage day-to-day operations:

- View/create/edit **Customers** (cannot delete or blacklist)  
- View **Vehicles**, **Owners**, **Brokers**, **Drivers** (read only)  
- Create/edit **Rentals**, perform handover and return  
- Create **Payments** (cannot edit/settle deposits)  
- Create **Damages** and **Maintenance** records  
- View **Notifications** and **Dashboard**  

**Cannot access:** Settlements, Expenses, Reports, Audit Log, Settings, Users. Cannot cancel rentals.

### 3.4 Driver

Limited access:

- **Dashboard**  
- **Rentals** (view only)  
- **Notifications**  

### 3.5 Permission Denied

If you open a page you are not allowed to use, the system redirects you to the Dashboard. Contact your Super Admin if you need additional access.

---

## 4. Dashboard

The Dashboard is your daily command centre.

### 4.1 Upcoming Jobs

Shows today’s handovers and tomorrow’s pickup/return reminders. You can:

- Open the related rental  
- Call the customer (phone link on mobile)  
- Draft a reminder message (if AI is enabled)  

### 4.2 Rental Status

Quick counts for: Inquiry, Quoted, Confirmed, Active, Returned, Completed, Cancelled, and Open Pipeline. Click a tile to open the filtered rental list.

### 4.3 Today’s Operations

Includes tomorrow reminders, today’s rentals, vehicles currently rented, available/reserved/maintenance counts, due-for-return, and overdue rentals.

### 4.4 Financial Summary

Today’s revenue, month revenue, month expenses, net profit, outstanding balances, pending owner/broker payouts, and held security deposits.

### 4.5 Fleet Summary

Total vehicles and breakdown by status (Available, Reserved, Rented, Maintenance, Inactive).

### 4.6 Revenue vs Expenses Chart

A doughnut chart showing total revenue and expenses for the last six months, with net profit in the centre.

### 4.7 Alerts Panel

Summarises critical notifications (document expiry, overdue rentals, etc.).

### 4.8 Compliance Tiles

Shortcuts to vehicles with insurance, revenue licence, or emission certificate expiring or expired, and service due.

---

## 5. Customers

**Menu:** Customers  
**Permission:** `customers.view` (create/edit/delete/blacklist require higher permissions)

### 5.1 Customer List

- Search by name, NIC, phone, or customer code.  
- Filter by status (Normal / Blacklisted).  
- Open **Blacklisted Report** for a dedicated list and CSV export (Admin+).  

### 5.2 Add New Customer

**Path:** Customers → Add Customer  

**Required fields:**

- Full name  
- NIC (Sri Lankan format: 12 digits or 9 digits + V)  
- Phone  
- Address  

**Optional fields:**

- Passport, WhatsApp, emergency contact  
- Driving licence number and expiry date  
- Notes  

**Photos & Documents (optional at registration):**

- **Customer Photo** — face photo for identification  
- **Driving Licence — Front** — front of licence  
- **Driving Licence — Back** — back of licence  

Each upload is saved to the customer’s **Documents** tab. Repeat customers can be found by NIC or phone — you do not need to re-upload every visit unless documents changed.

### 5.3 Customer Profile

Tabs on the profile:

| Tab | Contents |
|-----|----------|
| Personal Info | Contact details, licence expiry badge, photo if uploaded |
| Documents | All uploaded documents with view/edit/delete |
| Rental History | Past and current bookings |
| Payments | Payment history |
| Damages | Linked damage records |
| Blacklist History | Blacklist actions (if any) |

### 5.4 Driving Licence Expiry Warnings

If a licence is **expired** or **expiring within 30 days**, a red or yellow banner appears on the profile. Notifications are also created for staff.

**When a customer renews their licence:**

1. Physically verify the new licence.  
2. Go to **Edit Customer** and update **Driving Licence Expiry** (and number if changed).  
3. Optionally upload new front/back images under **Documents**.  

### 5.5 Documents Tab

**Add Document:** Choose type (Customer Photo, Driving Licence, NIC, Address Verification, etc.).

For **Driving Licence** and **NIC**, upload **Front** and/or **Back** sides separately.

**Edit:** Click the pencil icon to update details or replace the image.  
**View / Download:** Use buttons in the document row.  
**Delete:** Removes the document record and file.  

**Tip:** Use **Scan & Fill** (if AI is configured) to read document numbers and dates from a photo.

### 5.6 Blacklist a Customer

**Permission:** Admin or Super Admin  

1. Open the customer profile.  
2. Choose **Blacklist**.  
3. Enter a reason (required) and optional notes.  
4. Confirm.  

Blacklisted customers show a warning on their profile. Depending on **Settings**, new bookings may be **blocked** or **warn only**.

**Remove blacklist:** Use **Remove from Blacklist** on the profile (Admin+).

---

## 6. Vehicles

**Menu:** Vehicles  
**Permission:** `vehicles.view` (create/edit/delete: Admin+)

### 6.1 Vehicle List

Shows registration number, make/model, status, ownership, and daily rate. Filter by status and search.

### 6.2 Add / Edit Vehicle

Key fields:

- Registration number, type (Car/SUV/Van/Other), make, model, year  
- Ownership type: Company Owned, Personally Owned, Third Party Owned  
- Linked owner (for partner vehicles)  
- Daily / weekly / monthly rates, included km per day, extra km rate  
- Current odometer reading  
- Status  

### 6.3 Vehicle Statuses

| Status | Meaning |
|--------|---------|
| Available | Ready to rent |
| Reserved | Assigned to upcoming booking |
| Rented | Currently on rental |
| Maintenance | In workshop |
| Unavailable | Temporarily not offered |
| Inactive | Retired from fleet |

### 6.4 Vehicle Availability

**Path:** Vehicles → Availability  

Search available vehicles for a date range before confirming a booking.

### 6.5 Vehicle Documents

**Path:** Vehicles → Documents  

Track insurance, revenue licence, emission certificate, and registration. Expiring documents trigger dashboard and notification alerts.

Upload and manage documents from each vehicle’s detail page.

---

## 7. Vehicle Owners

**Menu:** Owners  
**Permission:** `owners.view` (create/edit: Admin+)

Partner owners who lend vehicles to the business.

### 7.1 Owner Profile

- Contact and bank details for payouts  
- Linked vehicles  
- Settlement history with amounts and status  

### 7.2 Settlements

When a rental on a partner-owned vehicle is **Completed**, an owner settlement is created automatically. Pay and download receipts from **Settlements** (see Section 13).

---

## 8. Drivers

**Menu:** Drivers  
**Permission:** `drivers.view` (create/edit: Admin+)

Company drivers used on **With Driver** rentals.

### 8.1 Driver Profile

- NIC, driving licence number and expiry (with expiry warnings)  
- Daily driver payment rate  
- Rental history, driver payments, and driver expenses  

### 8.2 Driver Role Login

Users with the **Driver** role see only Dashboard, Rentals (view), and Notifications. They cannot edit bookings or record payments.

---

## 9. Brokers

**Menu:** Brokers  
**Permission:** `brokers.view` (create/edit: Admin+)

Referral agencies that send customers. Commissions are calculated when broker-linked rentals are completed.

### 9.1 Broker Profile

Contact details, commission history, and linked rentals.

---

## 10. Rentals

**Menu:** Rentals (featured in sidebar)  
**Permission:** `rentals.view`

### 10.1 Rental Status Flow

```
INQUIRY → QUOTED → CONFIRMED → ACTIVE → RETURNED → COMPLETED
                ↘ CANCELLED (from most pre-completion stages)
```

| Status | Meaning |
|--------|---------|
| Inquiry | Initial enquiry |
| Quoted | Price sent to customer |
| Confirmed | Booking confirmed, vehicle assigned |
| Active | Vehicle handed over to customer |
| Returned | Vehicle back, odometer recorded |
| Completed | Closed, settlements generated |
| Cancelled | Booking cancelled |

### 10.2 Create a Rental

**Path:** Rentals → New Rental  

1. Select **Customer** (search by name/NIC). Blacklist warning appears if applicable.  
2. Choose **Rental type:** Self Drive or With Driver.  
3. Set pickup and return **date and time**.  
4. Assign **Vehicle** (availability is checked).  
5. Optionally assign **Driver** and **Broker**.  
6. Set rate plan (Daily / Weekly / Monthly / Custom) and charges.  
7. Enter **starting odometer** (required before handover).  
8. Set security deposit and advance payment if applicable.  
9. Save.  

Advance payment on create automatically records an **Advance** payment.

### 10.3 Edit a Rental

Allowed only while status is **Inquiry**, **Quoted**, or **Confirmed**. After handover, use status actions and odometer forms instead.

### 10.4 Confirm and Handover

1. **Mark as Quoted** — from Inquiry.  
2. **Confirm Rental** — from Quoted (vehicle must be assigned).  
3. **Handover** — on Confirmed rental: record handover date/time, fuel, condition, existing damage notes, customer acknowledgement.  
   - Rental becomes **Active**.  
   - Vehicle status becomes **Rented**.  

### 10.5 Return and Mileage

On an **Active** rental:

1. Open the rental detail page.  
2. Use **Ending Odometer** (inline form or dedicated page).  
3. Enter ending odometer and return date/time.  
4. Save — status becomes **Returned**.  

The system calculates:

- Rental days (based on rental day boundary — default 7:00 PM to 7:00 PM)  
- Included kilometres (included km × days)  
- Extra km charge if odometer exceeds allowance  
- Final total and balance  

**Correct odometer:** Allowed after Returned/Completed if a mistake was made.

### 10.6 Complete a Rental

When status is **Returned** and financial processing is done:

1. Click **Complete Rental**.  
2. Status becomes **Completed**.  
3. Owner settlements and broker commissions are created automatically where applicable.  

### 10.7 Cancel a Rental

**Permission:** Admin or Super Admin (`rentals.cancel`)  

Available from non-terminal statuses except Completed. Record reason when prompted.

### 10.8 Customer Receipt

When balance is **zero** and status is **Returned** or **Completed**, download the **Customer Receipt** PDF from the rental page.

---

## 11. Payments and Deposits

**Menu:** Payments  
**Permission:** `payments.view` (create: Employee+; edit/settle: Admin+)

### 11.1 Record a Payment

**From rental detail or Payments → Record Payment:**

- Payment type: Advance, Rental Payment, Final Payment, Damage Payment, Additional Charge, etc.  
- Amount and method (Cash, Bank Transfer, Card, Online, Other)  
- Reference number and notes  

Payments update the rental **Total Paid** and **Balance**.

### 11.2 Security Deposits

**Collect deposit** (Employee+):

- One active held deposit per rental  
- Recorded as Security Deposit payment type  

**Settle deposit** (Admin+ only):

- Refund all or part to customer  
- Retain portion for damages or charges  
- Status: Held → Partially Refunded / Refunded / Forfeited  

Employees can collect but **cannot settle** deposits.

### 11.3 Payments List

Ledger of all payments with filters. Click through to rental and customer.

---

## 12. Damages

**Menu:** Damages  
**Permission:** `damages.view` (create: Employee+; edit: Admin+)

### 12.1 Report Damage

Link to rental, vehicle, and customer. Record damage type, description, date, and customer charge amount.

### 12.2 Damage Status

REPORTED → ASSESSED → CHARGED → RESOLVED  

Record **Damage Payment** from Payments module to update payment status (Unpaid / Partially Paid / Paid).

### 12.3 Locked Records

After damage payment is fully completed, editing may be restricted to preserve audit integrity.

---

## 13. Settlements

**Menu:** Settlements  
**Permission:** Admin or Super Admin  

Three tabs:

### 13.1 Owner Settlements

Pending and paid amounts owed to vehicle owners. **Pay** records payout. Download or email **Owner Settlement Receipt** PDF.

### 13.2 Broker Commissions

Commission due to referral brokers. Record payment and download broker receipt.

### 13.3 Driver Payments

Read-only list; record driver payments from the **Driver** profile.

---

## 14. Maintenance

**Menu:** Maintenance  
**Permission:** `employees.view` create; all with view permission can see records  

Log service history: oil change, full service, brakes, tyres, etc. Record cost, odometer, provider, and **next service date/km**.

**Service due alerts** appear on the maintenance page and in notifications (within 14 days or overdue).

---

## 15. Expenses

**Menu:** Expenses  
**Permission:** Admin or Super Admin  

Track business expenses: fuel, insurance, repairs, driver payments, owner/broker payouts, parking, etc. Link to vehicle and/or rental where relevant.

---

## 16. Reports

**Menu:** Reports  
**Permission:** Admin or Super Admin  

Date range filters apply to all tabs.

| Tab | Purpose |
|-----|---------|
| Profitability | Revenue, costs, net profit by vehicle, month, or owner |
| Rentals | Booking list with totals and balances |
| Payments | Payment ledger |
| Expenses | Expense ledger |
| Fleet | Vehicle utilisation |

**Export CSV** (Admin+ with export permission): use Export button on each tab.

---

## 17. Notifications

**Menu:** Notifications (also bell icon in header)  

### 17.1 Alert Types

- Vehicle document expired / expiring soon  
- Customer driving licence expired / expiring soon  
- Overdue rental (past return date)  
- Service due or overdue  
- Outstanding rental balance  
- Pickup / return reminder for tomorrow  

### 17.2 Actions

- **Sync Alerts** — refresh from current data  
- **Mark Read** / **Mark All Read**  
- **View** — opens related rental, customer, or module  

Notifications auto-sync when you open the Dashboard.

---

## 18. Audit Log

**Menu:** Audit Log  
**Permission:** Admin or Super Admin  

Immutable trail of system actions: who did what, when, and on which record. Filter by entity type, action, or search text.

Useful for investigating changes, payments, and blacklist actions.

---

## 19. Settings

**Menu:** Settings  
**Permission:** Admin or Super Admin (view/edit)

| Setting | Description |
|---------|-------------|
| Company name | Display name |
| Rental day start time | Default 19:00 (7 PM) — defines rental “day” boundary |
| Default included km | Default km included per rental day (e.g. 200) |
| Currency | LKR / Rs. |
| Block blacklisted booking | Warn only vs block new rentals |
| Owner commission default | Fixed Rs. per owner settlement |
| Broker commission default | Fixed Rs. per broker rental |

---

## 20. Users (Super Admin)

**Menu:** Users  
**Permission:** Super Admin only  

### 20.1 Create User

Email, password, name, phone, role, status (Active/Inactive).

### 20.2 Edit User

Update details or reset password. Cannot deactivate yourself or the last active Super Admin.

### 20.3 Roles

Assign: Super Admin, Admin, Employee, or Driver.

---

## 21. Appendix

### 21.1 Glossary

| Term | Definition |
|------|------------|
| Handover | Vehicle given to customer; rental becomes Active |
| Return | Vehicle back; ending odometer recorded |
| Settlement | Payment to vehicle owner or broker after completed rental |
| Security deposit | Refundable hold collected at handover |
| Extra km | Charge when driven distance exceeds included allowance |
| Open pipeline | Rentals from Inquiry through Returned (not yet Completed) |

### 21.2 Rental Day Boundary

By default, one rental “day” runs from **7:00 PM to 7:00 PM** (configurable in Settings). Pickup and return times affect day count.

### 21.3 Included Kilometres

Default **200 km per rental day** unless overridden on the vehicle or rental. Extra distance billed at the vehicle’s extra km rate.

### 21.4 File Uploads

- Accepted formats: JPG, PNG, WEBP, and common image types  
- Large photos are compressed automatically  
- On cloud hosting (e.g. Vercel), uploaded files may not persist permanently — plan cloud storage for long-term production use  

### 21.5 Session and Security

- **Idle timeout:** 10 minutes without activity  
- **Maximum session:** 8 hours  
- Always sign out on shared computers  
- Use strong passwords; Super Admin should rotate default seed passwords  

### 21.6 Mobile Usage

The system works in a mobile browser. Use the menu icon for navigation. Tap phone numbers to call customers from upcoming jobs.

### 21.7 Troubleshooting

| Problem | What to try |
|---------|-------------|
| Cannot sign in | Check email/password; ask admin to confirm account is Active |
| Signed out unexpectedly | Idle timeout — sign in again |
| Page not allowed | Your role lacks permission — contact Super Admin |
| Document upload failed | Use JPG/PNG; file under 30 MB; try again |
| Balance will not clear | Record payments until balance shows zero |
| Customer blacklisted | Remove blacklist or change Settings if blocking bookings |

### 21.8 Support Checklist for Administrators

1. Confirm user role and status in **Users**.  
2. Check **Settings** for business rules.  
3. Review **Audit Log** for recent changes.  
4. Run **Sync Alerts** on Notifications.  
5. Verify database and environment configuration (technical — see deployment documentation).  

---

**End of User Guide**

*Rent a Car Management System — User Guide v1.0*
