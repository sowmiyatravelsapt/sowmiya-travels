-- ============================================================
-- SOWMIYA TRAVELS - SUPABASE DATABASE SCHEMA
-- Project: lbvtibzcltkdqqofoqcx
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PROFILES TABLE (linked to Supabase Auth)
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  email TEXT,
  role TEXT DEFAULT 'customer' CHECK (role IN ('customer', 'admin', 'driver')),
  is_verified BOOLEAN DEFAULT FALSE,
  otp_code TEXT,
  otp_expires_at TIMESTAMPTZ,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CAR OWNERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS car_owners (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT,
  id_proof_type TEXT,
  id_proof_number TEXT,
  bank_account TEXT,
  ifsc_code TEXT,
  commission_percent NUMERIC(5,2) DEFAULT 10.00,
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- VEHICLES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS vehicles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  owner_id UUID REFERENCES car_owners(id) ON DELETE SET NULL,
  vehicle_type TEXT NOT NULL CHECK (vehicle_type IN ('Sedan', 'SUV', 'Tempo Traveller', 'Mini Bus', 'Luxury Sedan', 'Hatchback', 'Innova', 'Innova Crysta')),
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  registration_number TEXT UNIQUE NOT NULL,
  year INTEGER,
  color TEXT,
  seating_capacity INTEGER DEFAULT 4,
  ac_available BOOLEAN DEFAULT TRUE,
  fuel_type TEXT DEFAULT 'Petrol' CHECK (fuel_type IN ('Petrol', 'Diesel', 'CNG', 'Electric', 'Hybrid')),
  image_url TEXT,
  is_available BOOLEAN DEFAULT TRUE,
  is_active BOOLEAN DEFAULT TRUE,
  current_km INTEGER DEFAULT 0,
  insurance_expiry DATE,
  permit_expiry DATE,
  fitness_expiry DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DRIVERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS drivers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  email TEXT,
  license_number TEXT UNIQUE NOT NULL,
  license_expiry DATE,
  address TEXT,
  date_of_birth DATE,
  experience_years INTEGER DEFAULT 0,
  rating NUMERIC(3,2) DEFAULT 5.00,
  total_trips INTEGER DEFAULT 0,
  assigned_vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  id_proof_type TEXT,
  id_proof_number TEXT,
  emergency_contact TEXT,
  emergency_phone TEXT,
  is_available BOOLEAN DEFAULT TRUE,
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- FARE RULES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS fare_rules (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  vehicle_type TEXT NOT NULL DEFAULT 'All',
  rule_type TEXT NOT NULL CHECK (rule_type IN ('per_km', 'per_trip', 'per_hour', 'per_day', 'waiting_charge', 'night_surcharge', 'airport_pickup', 'extra_km')),
  amount NUMERIC(10,2) NOT NULL,
  min_km NUMERIC(10,2),
  max_km NUMERIC(10,2),
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- BOOKINGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS bookings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  booking_number TEXT UNIQUE NOT NULL,
  customer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
  trip_type TEXT NOT NULL CHECK (trip_type IN ('one_way', 'round_trip', 'rental', 'airport')),
  pickup_location TEXT NOT NULL,
  pickup_lat NUMERIC(10,7),
  pickup_lng NUMERIC(10,7),
  drop_location TEXT,
  drop_lat NUMERIC(10,7),
  drop_lng NUMERIC(10,7),
  pickup_date DATE NOT NULL,
  pickup_time TIME NOT NULL,
  return_date DATE,
  return_time TIME,
  estimated_km NUMERIC(10,2),
  actual_km NUMERIC(10,2),
  fare_rule_id UUID REFERENCES fare_rules(id) ON DELETE SET NULL,
  fare_type TEXT,
  base_amount NUMERIC(10,2),
  extra_charges NUMERIC(10,2) DEFAULT 0,
  discount NUMERIC(10,2) DEFAULT 0,
  total_amount NUMERIC(10,2),
  payment_method TEXT DEFAULT 'cash' CHECK (payment_method IN ('cash', 'upi', 'online', 'pending')),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid', 'refunded')),
  booking_status TEXT DEFAULT 'pending' CHECK (booking_status IN ('pending', 'confirmed', 'assigned', 'started', 'completed', 'cancelled')),
  special_requests TEXT,
  admin_notes TEXT,
  whatsapp_sent BOOLEAN DEFAULT FALSE,
  telegram_sent BOOLEAN DEFAULT FALSE,
  otp_verified BOOLEAN DEFAULT FALSE,
  tracking_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- OTP LOGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS otp_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  phone TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  purpose TEXT DEFAULT 'login' CHECK (purpose IN ('login', 'booking', 'verification')),
  is_used BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- NOTIFICATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('whatsapp', 'telegram', 'sms')),
  recipient TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SETTINGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- AUTO-INCREMENT BOOKING NUMBER FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION generate_booking_number()
RETURNS TEXT AS $$
DECLARE
  new_number TEXT;
  counter INTEGER;
BEGIN
  SELECT COUNT(*) + 1 INTO counter FROM bookings;
  new_number := 'ST' || TO_CHAR(NOW(), 'YYYYMMDD') || LPAD(counter::TEXT, 4, '0');
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate booking number
CREATE OR REPLACE FUNCTION set_booking_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.booking_number IS NULL OR NEW.booking_number = '' THEN
    NEW.booking_number := generate_booking_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_booking_number
  BEFORE INSERT ON bookings
  FOR EACH ROW EXECUTE FUNCTION set_booking_number();

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_vehicles_updated BEFORE UPDATE ON vehicles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_drivers_updated BEFORE UPDATE ON drivers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_bookings_updated BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_fare_rules_updated BEFORE UPDATE ON fare_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_owners_updated BEFORE UPDATE ON car_owners FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE fare_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE car_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read/update own profile
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Allow public (anon) to insert profiles during signup
CREATE POLICY "profiles_insert_anon" ON profiles FOR INSERT TO anon WITH CHECK (true);

-- Vehicles: public read
CREATE POLICY "vehicles_select_all" ON vehicles FOR SELECT USING (true);
CREATE POLICY "vehicles_admin_all" ON vehicles FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Fare rules: public read
CREATE POLICY "fare_rules_select_all" ON fare_rules FOR SELECT USING (true);
CREATE POLICY "fare_rules_admin_all" ON fare_rules FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Drivers: public read
CREATE POLICY "drivers_select_all" ON drivers FOR SELECT USING (true);
CREATE POLICY "drivers_admin_all" ON drivers FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Car owners: admin only
CREATE POLICY "car_owners_admin_all" ON car_owners FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Bookings: customers see own, admin sees all
CREATE POLICY "bookings_customer_select" ON bookings FOR SELECT USING (
  customer_id = auth.uid() OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "bookings_customer_insert" ON bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "bookings_admin_update" ON bookings FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- OTP: anyone can insert/read own
CREATE POLICY "otp_logs_insert" ON otp_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "otp_logs_select" ON otp_logs FOR SELECT USING (true);
CREATE POLICY "otp_logs_update" ON otp_logs FOR UPDATE USING (true);

-- Settings: public read, admin write
CREATE POLICY "settings_select_all" ON settings FOR SELECT USING (true);
CREATE POLICY "settings_admin_all" ON settings FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Notifications: admin only
CREATE POLICY "notifications_admin_all" ON notifications FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ============================================================
-- SEED DEFAULT SETTINGS
-- ============================================================
INSERT INTO settings (key, value, description) VALUES
  ('company_name', 'Sowmiya Travels', 'Company display name'),
  ('company_phone', '9786033425', 'Company contact phone'),
  ('company_email', 'sowmiyatravels@gmail.com', 'Company email'),
  ('company_address', 'Vedaranyam, Nagapattinam, Tamil Nadu', 'Company address'),
  ('upi_primary', 'kaviapt02@okaxis', 'Primary UPI ID'),
  ('upi_fallback', '6382986186@ybl', 'Fallback UPI ID'),
  ('telegram_chat_id', '8252090421', 'Telegram chat ID for notifications'),
  ('whatsapp_token', 'QP4Hop3z3fEdzTv1sQiK', 'Fonnte WhatsApp API token'),
  ('geoapify_key', 'abf81e0fb280456a88ecbf1c26f546ff', 'Geoapify API key'),
  ('night_surcharge_start', '22:00', 'Night surcharge start time'),
  ('night_surcharge_end', '06:00', 'Night surcharge end time'),
  ('min_booking_notice_hours', '2', 'Minimum hours before pickup for booking')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- SEED SAMPLE FARE RULES
-- ============================================================
INSERT INTO fare_rules (vehicle_type, rule_type, amount, description) VALUES
  ('All', 'per_km', 12, 'Base rate per kilometre'),
  ('Sedan', 'per_km', 11, 'Sedan per km rate'),
  ('SUV', 'per_km', 14, 'SUV per km rate'),
  ('Innova', 'per_km', 13, 'Innova per km rate'),
  ('Innova Crysta', 'per_km', 15, 'Innova Crysta per km rate'),
  ('Tempo Traveller', 'per_km', 20, 'Tempo Traveller per km rate'),
  ('All', 'waiting_charge', 100, 'Waiting charge per hour'),
  ('All', 'night_surcharge', 200, 'Night surcharge after 10 PM'),
  ('All', 'airport_pickup', 500, 'Fixed airport pickup charge')
ON CONFLICT DO NOTHING;

-- ============================================================
-- QUICK ADMIN SETUP (run manually after first user signs up)
-- UPDATE profiles SET role = 'admin' WHERE phone = 'YOUR_PHONE';
-- ============================================================
