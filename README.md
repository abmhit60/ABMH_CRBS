# ABMH Conference Room Booking System (CRBS)

React + Vite app connected to Supabase (ABMH_CRMS project).

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Run locally
npm run dev

# 3. Build for production
npm run build
```

## Deploy to Vercel

1. Push this folder to a GitHub repo
2. Import the repo in Vercel
3. Add environment variables in Vercel dashboard:
   - `VITE_SUPABASE_URL` = https://rvxokgqvplyyalfrhiba.supabase.co
   - `VITE_SUPABASE_ANON_KEY` = your anon key
4. Deploy

## Project Structure

```
src/
├── context/
│   ├── AuthContext.jsx          # SSO auth + profile
│   └── NotificationsContext.jsx # Realtime notifications
├── components/
│   ├── auth/ProtectedRoute.jsx
│   ├── layout/Layout.jsx        # Sidebar + topbar
│   └── notifications/NotificationPanel.jsx
├── pages/
│   ├── LoginPage.jsx
│   ├── CalendarPage.jsx         # Weekly room availability
│   ├── BookingPage.jsx          # New booking form
│   ├── MyBookingsPage.jsx       # Staff booking history
│   ├── ApprovalsPage.jsx        # Smita Hule's approval dashboard
│   └── AdminPage.jsx            # Room & user management
├── lib/supabase.js              # Supabase client
└── index.css                    # Global styles
```

## User Roles

| Role  | Access |
|-------|--------|
| staff | Book rooms, view own bookings |
| owner | All staff access + approve/reject all bookings (Smita Hule) |
| admin | Full access including room & user management |

## After First Deployment

Once Smita Hule logs in for the first time, run this in Supabase SQL Editor:

```sql
update public.profiles set role = 'owner'
where email = 'smita.hule@adityabirlahospital.com';

update public.rooms set owner_id = (
  select id from public.profiles
  where email = 'smita.hule@adityabirlahospital.com'
);
```
