-- CruiseTrack Database Schema
-- Run this entire script in your Supabase SQL Editor

create table if not exists reservations (
  id uuid default gen_random_uuid() primary key,
  client text not null,
  line text not null,
  ship text,
  sail_date date,
  cabin text,
  conf text,
  price_paid numeric(10,2) default 0,
  obc numeric(10,2) default 0,
  balance numeric(10,2) default 0,
  auto_charge date,
  notes text,
  current_price numeric(10,2),
  last_checked timestamptz,
  created_at timestamptz default now()
);

-- Insert Ricky's existing clients
insert into reservations (client, line, ship, sail_date, cabin, conf, price_paid, obc, balance, auto_charge, notes) values
  ('Casey & Chelsea', 'Norwegian (NCL)', 'Norwegian Aqua', '2025-08-14', 'Solo Studio', '', 1378.00, 25.00, 878.00, '2025-08-04', 'Updated from original $1,500. $25 OBC.'),
  ('Kleah & Sruthi', 'Norwegian (NCL)', 'Norwegian Aqua', '2025-08-14', 'Interior 4B (Guarantee)', '', 835.00, 0.00, 335.00, '2025-08-04', 'Updated from $932. Cabin assigned closer to sail date.'),
  ('Marcus & Jimmy', 'Norwegian (NCL)', 'Norwegian Aqua', '2025-08-14', 'Interior', '', 770.00, 25.00, 270.00, '2025-08-04', '$50 OBC reduced to $25. Price improved from $840.'),
  ('Wisdom''s Tailgate Group', 'TBD', 'TBD', '2026-02-01', 'Multiple cabins', '', 0.00, 0.00, 0.00, null, 'CHOPPA performance group cruise. Saints vs Falcons VIP experience.');
