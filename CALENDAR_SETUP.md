# Calendar & Appointments Integration Setup

## Overview
The calendar system integrates with Supabase for persistent storage of appointments with real-time sync across all clients. Staff members are fetched from the `user_profiles` table (roles: super_admin, branch_admin, staff), and appointments are stored in the `appointments` table.

## Prerequisites

Your Supabase database should already have a `user_profiles` table with the following structure:
- `id` (TEXT, Primary Key)
- `full_name` (TEXT)
- `email` (TEXT)
- `role` (TEXT) - values: `super_admin`, `branch_admin`, `staff`
- `avatar_url` (TEXT, optional)

## Setup Instructions

### 1. Create the Appointments Table in Supabase

To persist appointments in the database, you need to create the `appointments` table in Supabase. Follow these steps:

1. Open your Supabase project dashboard
2. Go to **SQL Editor**
3. Copy the entire content from the migration file: `database/migrations/001_create_appointments_table.sql`
4. Paste it into the SQL editor
5. Click **Run** to execute the migration

> **Note:** Later phases add new columns to `appointments` (treatment_id/name) and build a
> service catalog; the SQL below shows the full schema including those extensions.

### 2. Update the Appointments Table (if previously created)

If you created the appointments table before, run the update migration:
- Copy content from `database/migrations/002_update_appointments_table.sql`
- Paste and run in the SQL Editor
- This adds `title`, `customer_name`, `staff_name` columns and makes `customer_id` nullable

1. Go to **Database → Replication** in the Supabase dashboard
2. Enable replication for the `appointments` table
3. This allows all connected clients to see appointment changes in real-time

### 3. Table Structure

The `appointments` table has the following columns:

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| **id** | TEXT (PK) | Yes | Unique appointment identifier |
| **title** | TEXT | Yes | Appointment label (e.g. "Facial Treatment") |
| **treatment_id** | TEXT | No | Optional reference to a specific treatment package |
| **treatment_name** | TEXT | No | Denormalized name of treatment for display |
| **customer_id** | TEXT | No | Foreign key to customers table (nullable for walk-ins) |
| **customer_name** | TEXT | No | Denormalized customer name for display |
| **staff_id** | TEXT | Yes | Foreign key to user_profiles table |
| **staff_name** | TEXT | No | Denormalized staff name for display |
| **start_time** | TIMESTAMPTZ | Yes | Appointment start time |
| **end_time** | TIMESTAMPTZ | Yes | Appointment end time |
| **status** | TEXT | Yes | Status (scheduled, confirmed, in-progress, completed, cancelled) |
| **notes** | TEXT | No | Additional appointment notes |
| **created_at** | TIMESTAMPTZ | Auto | Creation timestamp |
| **updated_at** | TIMESTAMPTZ | Auto | Last update timestamp |

### 4. Indexes Created

The migration automatically creates the following indexes for optimal query performance:

- `idx_appointments_staff_start`: For efficient staff/date queries
- `idx_appointments_customer`: For customer appointment lookups
- `idx_appointments_created_at`: For recent appointments queries

### 5. Features Enabled

After running the migration, the following features will be automatically enabled:

- **Row Level Security (RLS)**: Protects data access
- **Automatic Timestamp Updates**: `updated_at` is automatically updated on any changes
- **Referential Integrity**: Cascade delete when staff are removed
- **Real-time Subscriptions**: All clients receive live updates

## Using the Calendar

### Staff Management
- Staff members are automatically fetched from the `user_profiles` table where `role` is in `['staff', 'admin', 'owner']`
- All matching accounts appear on the calendar — not just the currently logged-in user
- In the calendar settings, you can select which staff to display on the calendar

### Calendar Settings
Open settings via the gear icon in the calendar header:

1. **Work Hours**: Set the opening and closing times for the calendar view (e.g. 9:00 AM – 6:00 PM). The calendar grid displays time slots for this entire range, including the closing hour label.
2. **Lunch Break**: Configure lunch break start/end times — blocks time for all staff on all days.
3. **Column Display**: Toggle "Fit columns to screen" — when enabled, staff columns expand to fill the available width based on how many staff are visible. When disabled, columns use a fixed 200px width with horizontal scrolling.
4. **Staff Selection**: Choose which staff members appear on the calendar columns.
5. **Staff Schedules**: Assign which days of the week each staff member works.

### Appointments
- Appointments are saved to and retrieved from the Supabase database
- All CRUD operations (Create, Read, Update, Delete) are handled through the `useAppointments` hook
- **Real-time sync**: Changes made on any client are instantly reflected on all other connected clients via Supabase Realtime subscriptions

### Calendar Features
1. **Drag & Drop**: Move and resize appointments to adjust times and reassign staff
2. **Time Format**: Uses 12-hour AM/PM format
3. **Scrolling**: Full vertical and horizontal scrolling for multiple staff and all time slots
4. **Current Time Indicator**: Red line showing current time on today's view

## Troubleshooting

### Appointments Not Showing
- Ensure the `appointments` table exists in Supabase
- Run migration `002_update_appointments_table.sql` if the table was created before the `title` column was added
- Check that your Supabase client is properly configured
- Verify RLS policies allow your user to read appointments

### Staff Not Showing
- Ensure staff members have a role of `staff`, `admin`, or `owner` in the `user_profiles` table
- Check browser console for any API error messages

### Real-time Not Working
- Enable Replication for the `appointments` table in Supabase Dashboard → Database → Replication
- Ensure the Supabase client is connected (check browser Network tab for WebSocket connection)

### Data Sync Issues
- The calendar automatically fetches data on load and subscribes to real-time updates
- If changes aren't syncing, try refreshing the page
- Check browser console for any API error messages
