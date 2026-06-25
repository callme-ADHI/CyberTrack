-- ─────────────────────────────────────────────────────────────────────────────
-- Kerala Cyber Cell Portal — Supabase RLS Policy Setup
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run
-- Project: zjqsdmpwgqliexgnzwwm
-- ─────────────────────────────────────────────────────────────────────────────

-- 0. Create Officers Table for Authentication
CREATE TABLE IF NOT EXISTS public.officers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  username text UNIQUE NOT NULL,
  password text NOT NULL
);

-- Insert default admin account
INSERT INTO public.officers (username, password) 
VALUES ('CCPSP', '123456') 
ON CONFLICT (username) DO NOTHING;

-- 1. Add money_lost column
ALTER TABLE public.inquiries ADD COLUMN IF NOT EXISTS money_lost numeric;

-- 1. Make sure RLS is enabled on all tables
ALTER TABLE categories  ENABLE ROW LEVEL SECURITY;
ALTER TABLE inquiries   ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE officers    ENABLE ROW LEVEL SECURITY;

-- 2. Grant basic permissions to anon role
-- (This fixes the 401 Unauthorized permission denied errors)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inquiries TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.officers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.locations TO anon;

-- 3. Drop any existing conflicting policies (safe to run multiple times)
DROP POLICY IF EXISTS "anon_select_categories"  ON categories;
DROP POLICY IF EXISTS "anon_insert_categories"  ON categories;
DROP POLICY IF EXISTS "anon_update_categories"  ON categories;
DROP POLICY IF EXISTS "anon_select_inquiries"   ON inquiries;
DROP POLICY IF EXISTS "anon_insert_inquiries"   ON inquiries;
DROP POLICY IF EXISTS "anon_select_locations"   ON locations;
DROP POLICY IF EXISTS "anon_select_officers"    ON officers;

-- 3. SELECT (read) policies — allow anon to read all rows
CREATE POLICY "anon_select_categories"
  ON categories FOR SELECT TO anon USING (true);

CREATE POLICY "anon_select_inquiries"
  ON inquiries FOR SELECT TO anon USING (true);

CREATE POLICY "anon_select_locations"
  ON locations FOR SELECT TO anon USING (true);

CREATE POLICY "anon_select_officers"
  ON officers FOR SELECT TO anon USING (true);

-- 4. INSERT policies — allow anon to create categories and inquiries
CREATE POLICY "anon_insert_categories"
  ON categories FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "anon_insert_inquiries"
  ON inquiries FOR INSERT TO anon WITH CHECK (true);

-- 5. UPDATE policy — allow anon to edit categories (for the Categories page)
CREATE POLICY "anon_update_categories"
  ON categories FOR UPDATE TO anon USING (true) WITH CHECK (true);
