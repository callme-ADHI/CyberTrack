-- ─────────────────────────────────────────────────────────────────────────────
-- Kerala Cyber Cell Portal — Supabase Schema & RLS Policy Setup
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Drop existing tables if they exist to start fresh and clean
DROP TABLE IF EXISTS public.inquiries CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;
DROP TABLE IF EXISTS public.locations CASCADE;
DROP TABLE IF EXISTS public.officers CASCADE;

-- 2. Create categories table (with SERIAL id to support auto-generation)
CREATE TABLE public.categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT NOT NULL
);

-- 3. Create locations table (with SERIAL id to support auto-generation)
CREATE TABLE public.locations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    taluk VARCHAR(100) NOT NULL
);

-- 4. Create inquiries table referencing categories and locations as integers
-- ON DELETE SET DEFAULT is used so deleting a category/location reassigns linked cases to 'Other' (ID 1)
CREATE TABLE public.inquiries (
    id BIGSERIAL PRIMARY KEY,
    category_id INTEGER NOT NULL DEFAULT 1 REFERENCES public.categories(id) ON UPDATE CASCADE ON DELETE SET DEFAULT,
    location_id INTEGER NOT NULL DEFAULT 1 REFERENCES public.locations(id) ON UPDATE CASCADE ON DELETE SET DEFAULT,
    description TEXT NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    complainant_name VARCHAR(255),
    complainant_phone VARCHAR(20),
    feedback TEXT,
    reference_id VARCHAR(100),
    money_lost NUMERIC(12,2) CHECK (money_lost IS NULL OR money_lost >= 0),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5. Create Officers Table
CREATE TABLE public.officers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL
);

-- 6. Insert default admin account
INSERT INTO public.officers (username, password) 
VALUES ('CCPSP', '123456') 
ON CONFLICT (username) DO NOTHING;

-- 7. Ensure fallback seed values exist in tables
INSERT INTO public.categories (id, name, description) VALUES (1, 'Other', 'Select this category if your inquiry does not match standard options.') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.locations (id, name, taluk) VALUES (1, 'Other', 'Other') ON CONFLICT (id) DO NOTHING;

-- Reset sequence starts after manual inserts
SELECT setval('public.categories_id_seq', COALESCE((SELECT MAX(id)+1 FROM public.categories), 1), false);
SELECT setval('public.locations_id_seq', COALESCE((SELECT MAX(id)+1 FROM public.locations), 1), false);

-- 8. Indexes for performance
CREATE INDEX idx_inquiries_category ON public.inquiries(category_id);
CREATE INDEX idx_inquiries_location ON public.inquiries(location_id);
CREATE INDEX idx_inquiries_created_at ON public.inquiries(created_at DESC);

-- 9. Enable Row Level Security (RLS) on all tables
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.officers ENABLE ROW LEVEL SECURITY;

-- 10. Grant full access permissions to the anon role
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.locations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inquiries TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.officers TO anon;

-- Grant usage on sequences so anon role can insert auto-incrementing IDs
GRANT USAGE, SELECT ON SEQUENCE public.categories_id_seq TO anon;
GRANT USAGE, SELECT ON SEQUENCE public.locations_id_seq TO anon;
GRANT USAGE, SELECT ON SEQUENCE public.inquiries_id_seq TO anon;

-- 11. RLS Policies for anon role
-- Categories
CREATE POLICY "anon_select_categories" ON public.categories FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_categories" ON public.categories FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_categories" ON public.categories FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_categories" ON public.categories FOR DELETE TO anon USING (true);

-- Locations
CREATE POLICY "anon_select_locations" ON public.locations FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_locations" ON public.locations FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_locations" ON public.locations FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_locations" ON public.locations FOR DELETE TO anon USING (true);

-- Inquiries (Cases)
CREATE POLICY "anon_select_inquiries" ON public.inquiries FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_inquiries" ON public.inquiries FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_inquiries" ON public.inquiries FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- Officers
CREATE POLICY "anon_select_officers" ON public.officers FOR SELECT TO anon USING (true);
