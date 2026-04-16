-- Booking slots for consultation events
CREATE TABLE IF NOT EXISTS booking_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name TEXT NOT NULL DEFAULT '経営相談会',
  event_date DATE NOT NULL,
  start_time TEXT NOT NULL,  -- HH:MM format
  end_time TEXT NOT NULL,    -- HH:MM format
  slot_number INTEGER NOT NULL,
  is_available BOOLEAN DEFAULT true,
  booked_by_name TEXT,
  booked_by_email TEXT,
  booked_by_company TEXT,
  booked_at TIMESTAMPTZ,
  contact_id UUID,  -- links to crm_contacts if available
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_booking_slots_date ON booking_slots(event_date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_booking_slots_unique ON booking_slots(event_date, slot_number);

ALTER TABLE booking_slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated full access to booking_slots"
  ON booking_slots FOR ALL TO authenticated USING (true) WITH CHECK (true);
-- Allow public to read available slots and book
CREATE POLICY "Allow public read booking_slots"
  ON booking_slots FOR SELECT TO anon USING (true);
CREATE POLICY "Allow public update booking_slots"
  ON booking_slots FOR UPDATE TO anon USING (true) WITH CHECK (true);
