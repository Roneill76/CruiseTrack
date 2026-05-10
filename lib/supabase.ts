import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Reservation = {
  id: string
  client: string
  line: string
  ship: string
  sail_date: string
  cabin: string
  conf: string
  price_paid: number
  obc: number
  balance: number
  auto_charge: string | null
  notes: string
  current_price: number | null
  last_checked: string | null
  created_at: string
}
