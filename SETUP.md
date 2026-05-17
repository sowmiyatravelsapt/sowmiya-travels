# Sowmiya Travels – Complete Setup Guide

## File Structure
```
sowmiya-travels/
├── index.html       ← Customer booking website
├── admin.html       ← Admin panel
├── SETUP.md         ← This file
└── vercel.json      ← Vercel config (optional)
```

---

## Step 1: Supabase Setup

### 1.1 Create Project
1. Go to https://supabase.com → Create new project
2. Note your **Project URL** and **anon/public API key**

### 1.2 Run this SQL in Supabase SQL Editor

```sql
-- BOOKINGS TABLE
create table bookings (
  id uuid default gen_random_uuid() primary key,
  booking_id text unique not null,
  customer_name text not null,
  customer_phone text not null,
  pickup_location text not null,
  drop_location text not null,
  pickup_date date not null,
  pickup_time time not null,
  trip_type text default 'oneway',
  vehicle_type text default 'Sedan',
  notes text,
  status text default 'pending',
  driver_name text,
  driver_phone text,
  driver_id uuid,
  created_at timestamptz default now()
);

-- CUSTOMERS TABLE
create table customers (
  id uuid default gen_random_uuid() primary key,
  phone text unique not null,
  name text,
  last_login timestamptz,
  created_at timestamptz default now()
);

-- OWNERS TABLE (Car Owners)
create table owners (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  phone text not null,
  address text,
  aadhaar text,
  pan text,
  bank_acc text,
  ifsc text,
  status text default 'active',
  created_at timestamptz default now()
);

-- CARS TABLE
create table cars (
  id uuid default gen_random_uuid() primary key,
  reg_number text unique not null,
  model text not null,
  type text default 'Sedan',
  seats integer default 4,
  year integer,
  color text,
  owner_id uuid references owners(id),
  owner_name text,
  driver_id uuid,
  driver_name text,
  insurance_exp date,
  fc_exp date,
  status text default 'active',
  ac text default 'yes',
  created_at timestamptz default now()
);

-- DRIVERS TABLE
create table drivers (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  phone text not null,
  license text,
  license_exp date,
  address text,
  aadhaar text,
  car_id uuid references cars(id),
  status text default 'active',
  notes text,
  created_at timestamptz default now()
);

-- Row Level Security (RLS) - allow public read/write for now
alter table bookings enable row level security;
alter table customers enable row level security;
alter table owners enable row level security;
alter table cars enable row level security;
alter table drivers enable row level security;

-- Public policies (tighten these after go-live)
create policy "Allow all" on bookings for all using (true) with check (true);
create policy "Allow all" on customers for all using (true) with check (true);
create policy "Allow all" on owners for all using (true) with check (true);
create policy "Allow all" on cars for all using (true) with check (true);
create policy "Allow all" on drivers for all using (true) with check (true);
```

---

## Step 2: Fonnte (WhatsApp) Setup

1. Go to https://fonnte.com → Register
2. Connect your WhatsApp number (scan QR)
3. Get your **API Token** from Dashboard → Device → Token
4. The API endpoint used: `https://api.fonnte.com/send`

**Note:** Fonnte requires your WhatsApp number to be active and connected. Free plan has limited messages.

---

## Step 3: Telegram Bot Setup

1. Open Telegram → Search **@BotFather**
2. Send `/newbot` → Follow instructions → Get your **Bot Token**
3. Get your **Chat ID**:
   - Start a chat with your bot
   - Send any message
   - Visit: `https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates`
   - Find `"chat":{"id":XXXXXXXX}` — that's your Chat ID
4. For group notifications: Add bot to group, use group Chat ID (negative number like -100xxx)

---

## Step 4: Configure Keys

### Option A: Enter in Admin Panel (Easiest)
1. Open `admin.html` → Login (default: admin / sowmiya2024)
2. Go to **Settings**
3. Fill in: Supabase URL, Supabase Key, Fonnte Token, Telegram Token, Chat ID
4. Click **Save Configuration** — stored in browser localStorage

### Option B: Vercel Environment Variables (For Production)
1. In Vercel dashboard → Your Project → Settings → Environment Variables
2. Add these variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL = https://xxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGc...
   NEXT_PUBLIC_FONNTE_TOKEN = your_fonnte_token
   NEXT_PUBLIC_TELEGRAM_BOT_TOKEN = your_bot_token
   NEXT_PUBLIC_TELEGRAM_CHAT_ID = your_chat_id
   ```
3. In `index.html`, replace the CONFIG block with:
   ```javascript
   const CONFIG = {
     SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
     // etc.
   };
   ```
   **Note:** For pure HTML files on Vercel, use Option A or inject via a `_config.js` file.

---

## Step 5: Deploy to Vercel

### Method 1: Drag & Drop (Easiest)
1. Go to https://vercel.com → New Project → "Browse" or drag folder
2. Upload the `sowmiya-travels/` folder
3. Deploy → Get your URL (e.g. `sowmiya-travels.vercel.app`)

### Method 2: GitHub + Vercel
1. Push folder to GitHub
2. Connect repo to Vercel → Auto-deploys on every push

### vercel.json (Optional, for clean routing)
```json
{
  "routes": [
    { "src": "/admin", "dest": "/admin.html" },
    { "src": "/", "dest": "/index.html" }
  ]
}
```

---

## Default Admin Credentials
- **Username:** admin
- **Password:** sowmiya2024
- ⚠️ Change immediately in Admin → Settings → Admin Password

---

## Features Summary

### Customer Website (index.html)
- ✅ One Way / Round Trip / Rental / Airport bookings
- ✅ Vehicle type selection (Sedan / SUV / Tempo)
- ✅ WhatsApp OTP login/signup via Fonnte
- ✅ Booking confirmation to customer WhatsApp
- ✅ Telegram bot notification on new booking
- ✅ Booking tracking by Booking ID
- ✅ Supabase database storage

### Admin Panel (admin.html)
- ✅ Dashboard with live stats
- ✅ All bookings management (confirm / cancel / complete)
- ✅ Assign driver to booking + notify customer on WhatsApp
- ✅ Driver management (add/edit/delete)
- ✅ Car & Fleet management (add/edit/delete)
- ✅ Car Owner management with bank details
- ✅ Customer list
- ✅ Reports
- ✅ API settings (all keys configurable from UI)
- ✅ Admin password change
- ✅ Works offline with localStorage fallback

---

## WhatsApp Message Triggers

| Event | Customer Receives |
|-------|------------------|
| New booking | Booking ID + trip details |
| OTP login | 6-digit OTP |
| Booking confirmed | Confirmation with driver details |
| Driver assigned | Driver name + phone number |
| Booking cancelled | Cancellation notice |

---

## Support
For any issues, contact the developer or refer to:
- Supabase docs: https://supabase.com/docs
- Fonnte docs: https://fonnte.com/docs
- Vercel docs: https://vercel.com/docs
