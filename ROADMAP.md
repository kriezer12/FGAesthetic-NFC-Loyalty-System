# Development Roadmap for FGAesthetic NFC Loyalty System

Based on the current codebase structure and the stakeholder requirements, here's a prioritized development roadmap organized into phases. This approach builds foundational systems first, then layers on more complex features.

---

## Phase 1: Foundation & Core Infrastructure
*Priority: Critical - These are prerequisites for other features*

### 1.1 User Access Levels & Authentication Enhancement
- [ ] Extend current auth system with role-based access control (RBAC)
- [ ] Define roles: `Super Admin`, `Branch Admin`, `Aesthetician/Nurse/Doctor`
- [ ] Create permission matrices for each role
- [ ] Add branch association to users
- [ ] Update `auth-context.tsx` and `protected-route.tsx` for role-based routing

### 1.2 Branch Management
- [ ] Create `branches` table in Supabase
- [ ] CRUD operations for branches (Super Admin only)
- [ ] Branch selector/switcher in UI
- [ ] Branch-scoped data filtering

### 1.3 User Activity Logging System
- [ ] Create `user_logs` table with fields: `user_id`, `action_type`, `entity_type`, `entity_id`, `changes`, `timestamp`
- [ ] Backend middleware/service for automatic logging
- [ ] Action types: `edit_client`, `change_inventory`, `apply_discount`, `void_transaction`
- [ ] Log viewer UI (filterable by user, action, date range)

---

## Phase 2: Client Records Enhancement
*Priority: High - Extends existing customer functionality*

### 2.1 Enhanced Client Profile
- [ ] Extend `customer.ts` with: Birthday, Contact No, Branch, Active/Inactive status
- [ ] Update `customer-info.tsx` component
- [ ] Add `last_activity_date` tracking
- [ ] Create client detail page with full profile view

### 2.2 Treatment Session Tracking
- [ ] Create `client_treatments` table: `client_id`, `treatment_id`, `total_sessions`, `remaining_sessions`, `status`
- [ ] UI for viewing/updating remaining sessions
- [ ] Treatment status component (e.g., "5 sessions remaining on Facial")

### 2.3 Client Photo Storage
- [ ] Supabase Storage bucket for client photos
- [ ] Before/After photo upload with session tagging
- [ ] Consent form photo upload and viewer
- [ ] Photo gallery component per client

### 2.4 Client Activity & Archive System
- [ ] Auto-flag clients as "inactive" after 2 months of no updates
- [ ] Active/Inactive filter on `customers.tsx`
- [ ] Archive functionality for inactive clients
- [ ] Bulk archive operations

---

## Phase 3: Inventory & Treatment Management
*Priority: High - Foundation for POS*

### 3.1 Treatment Catalog
- [ ] Create `treatments` table: `name`, `description`, `duration_minutes`, `base_price`, `points_value`
- [ ] CRUD UI for treatments (Super Admin / Branch Admin)
- [ ] Treatment categories/tags

### 3.2 Branch Inventory System
- [ ] Create `inventory` table: `branch_id`, `item_name`, `quantity`, `unit`, `reorder_level`
- [ ] Create `inventory_transactions` table for stock movements
- [ ] Inventory dashboard per branch
- [ ] Low stock alerts
- [ ] Inventory adjustment with logging

---

## Phase 4: Promotions & Discounts
*Priority: High - Required for POS*

### 4.1 Promo/Discount Management
- [ ] Create `promotions` table: `name`, `discount_type` (percentage/fixed), `discount_value`, `applicable_treatments`, `start_date`, `end_date`, `created_by`
- [ ] Super Admin UI for creating promos (e.g., "Facial 50% OFF")
- [ ] Promo visibility rules (all branches vs specific)

### 4.2 Discount Application in Checkout
- [ ] Fetch active promotions for checkout page
- [ ] Checkbox/dropdown selector for applicable discounts
- [ ] Discount stacking rules (if any)
- [ ] Discount application logging

---

## Phase 5: POS & Transactions
*Priority: High - Core business operation*

### 5.1 Basic Transaction Processing
- [ ] Create `transactions` table: `branch_id`, `client_id`, `staff_id`, `items`, `subtotal`, `discounts_applied`, `total`, `payment_method`, `status`, `timestamp`
- [ ] Create `transaction_items` table for line items
- [ ] Checkout page with treatment/service selection
- [ ] Apply promotions/discounts from Phase 4
- [ ] Payment processing (Cash, Card, etc.)
- [ ] Receipt generation

### 5.2 Transaction Management
- [ ] Void transaction functionality (with logging)
- [ ] Transaction history per branch
- [ ] Transaction search/filter

### 5.3 Sales Reports
- [ ] Daily sales summary
- [ ] Weekly sales report with trends
- [ ] Monthly sales report with comparisons
- [ ] Export functionality (CSV/PDF)
- [ ] Branch-level vs system-wide reports (based on role)

---

## Phase 6: Appointment Management
*Priority: Medium-High*

### 6.1 Appointment Booking System
- [ ] Create `appointments` table: `branch_id`, `client_id`, `treatment_id`, `staff_id`, `appointment_date`, `start_time`, `duration_minutes`, `is_home_service`, `address`, `status`
- [ ] Calendar view for appointments
- [ ] Appointment booking form (branch/home service toggle)
- [ ] Time slot availability checking

### 6.2 Staff Assignment
- [ ] Staff availability management
- [ ] Assign staff per appointment/session
- [ ] Staff workload view

### 6.3 Status Tracking
- [ ] Status workflow: `Booked` → `Done` / `No-show` / `Cancelled`
- [ ] Status update UI with timestamps
- [ ] Appointment history per client
- [ ] No-show tracking and reporting

---

## Phase 7: Loyalty Card System Enhancement
*Priority: Medium - Builds on existing NFC foundation*

### 7.1 Points Threshold Configuration
- [ ] Create `loyalty_rewards` table: `points_required`, `reward_treatment_id`, `reward_name`, `is_active`
- [ ] Super Admin UI for setting thresholds (e.g., 100 pts = Facial, 500 pts = Botox)
- [ ] Reward catalog display

### 7.2 Customer Balance View
- [ ] Customer-facing balance check (via NFC scan or lookup)
- [ ] Points history and transactions
- [ ] Points redemption flow
- [ ] Integration with `nfc-scanner.tsx`

### 7.3 Points Earning Rules
- [ ] Configure points earned per treatment/purchase
- [ ] Bonus points promotions
- [ ] Points expiration rules (if applicable)

---

## Database Schema Summary

```sql
-- Core tables to create
branches
user_roles (extend existing users)
user_logs

-- Client Enhancement
client_treatments
client_photos

-- Inventory & Treatments
treatments
inventory
inventory_transactions

-- Promotions & POS
promotions
transactions
transaction_items

-- Appointments
appointments
staff_availability

-- Loyalty Enhancement
loyalty_rewards
points_transactions
```

---

## Suggested GitHub Project Board Structure

### Labels
- `priority: critical` - Phase 1
- `priority: high` - Phases 2-5
- `priority: medium` - Phases 6-7
- `type: backend` - API/Database work
- `type: frontend` - UI components
- `type: infrastructure` - Auth, logging, config

### Milestones
1. **v1.1 - Foundation** (Phase 1)
2. **v1.2 - Client Records** (Phase 2)
3. **v1.3 - Inventory & Treatments** (Phase 3)
4. **v1.4 - Promotions** (Phase 4)
5. **v1.5 - POS System** (Phase 5)
6. **v1.6 - Appointments** (Phase 6)
7. **v1.7 - Loyalty Enhancement** (Phase 7)

---

## Recommended Development Order Rationale

1. **Phase 1 first** - RBAC and logging are cross-cutting concerns needed by everything else
2. **Phase 2 before POS** - Enhanced client records feed into transactions
3. **Phase 3 before POS** - Treatments/inventory are what you sell
4. **Phase 4 before Phase 5** - Discounts need to exist before checkout can apply them
5. **Phase 5 (POS)** - Now has all dependencies ready
6. **Phase 6 (Appointments)** - Independent but relies on treatments/staff
7. **Phase 7 (Loyalty)** - Enhancement layer, can run parallel to Phase 6

This structure allows for incremental releases and testing while maintaining logical dependencies between features.