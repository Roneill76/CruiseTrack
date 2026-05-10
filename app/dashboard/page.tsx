'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import AppLayout from '@/components/AppLayout'
import { supabase, Reservation } from '@/lib/supabase'

function fmt$(n: number | null) {
  if (n == null || n === 0) return '—'
  return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}
function fmtDate(d: string | null) {
  if (!d) return '—'
  try { return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }
  catch { return d }
}

export default function Dashboard() {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('reservations').select('*').order('created_at', { ascending: true }).then(({ data }) => {
      setReservations(data || [])
      setLoading(false)
    })
  }, [])

  const drops = reservations.filter(r => r.current_price != null && r.current_price < r.price_paid)
  const totalSavings = drops.reduce((s, r) => s + (r.price_paid - (r.current_price ?? 0)), 0)
  const autoChargeUpcoming = reservations.filter(r => r.auto_charge && new Date(r.auto_charge) > new Date())

  async function deleteRes(id: string) {
    if (!confirm('Delete this reservation?')) return
    await supabase.from('reservations').delete().eq('id', id)
    setReservations(prev => prev.filter(r => r.id !== id))
  }

  return (
    <AppLayout>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Active reservations', value: reservations.length, sub: `${autoChargeUpcoming.length} auto-charging soon` },
          { label: 'Price drops found', value: drops.length, sub: 'this week', color: drops.length > 0 ? 'var(--green)' : undefined },
          { label: 'Savings available', value: fmt$(totalSavings), sub: 'for your clients', color: totalSavings > 0 ? 'var(--teal)' : undefined },
          { label: 'Cruise lines tracked', value: new Set(reservations.map(r => r.line)).size, sub: 'NCL · RCCL · Carnival · Virgin' },
        ].map((s, i) => (
          <div key={i} style={{ background: 'var(--navy3)', border: '1px solid var(--border)', borderRadius: 'var(--radius2)', padding: '16px 20px' }}>
            <div style={{ fontSize: 11, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 26, fontWeight: 500, color: s.color || 'var(--text1)' }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {drops.length > 0 && (
        <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 'var(--radius)', padding: '12px 16px', marginBottom: 16, color: 'var(--green)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
          ✅ {drops.length} client{drops.length > 1 ? 's have' : ' has'} price drops available — <Link href="/price-checks" style={{ color: 'var(--green)', textDecoration: 'underline' }}>view in Price Checks</Link>
        </div>
      )}

      <div style={{ background: 'var(--navy3)', border: '1px solid var(--border)', borderRadius: 'var(--radius2)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 14, fontWeight: 500 }}>📋 Client reservations</span>
          <Link href="/upload" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 'var(--radius)', fontSize: 13, fontWeight: 500, background: 'var(--teal)', color: 'var(--navy)', border: 'none', cursor: 'pointer', textDecoration: 'none' }}>
            + Upload Invoice
          </Link>
        </div>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>Loading...</div>
        ) : reservations.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>
            No reservations yet. <Link href="/upload" style={{ color: 'var(--teal)' }}>Upload your first invoice →</Link>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  {['Client', 'Line / Ship', 'Sail date', 'Cabin', 'Paid', 'OBC', 'Balance', 'Status', ''].map(h => (
                    <th key={h} style={{ textAlign: 'left', fontSize: 10, fontWeight: 500, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 12px 10px', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reservations.map(r => {
                  const drop = r.current_price != null && r.current_price < r.price_paid ? r.price_paid - r.current_price : 0
                  return (
                    <tr key={r.id} style={{ borderTop: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px 12px' }}><strong>{r.client}</strong></td>
                      <td style={{ padding: '12px 12px', color: 'var(--text2)' }}>{r.line.replace(' (NCL)', ' NCL')} · {r.ship}</td>
                      <td style={{ padding: '12px 12px', color: 'var(--text2)', whiteSpace: 'nowrap' }}>{fmtDate(r.sail_date)}</td>
                      <td style={{ padding: '12px 12px', color: 'var(--text2)' }}>{r.cabin}</td>
                      <td style={{ padding: '12px 12px', fontFamily: "'DM Mono',monospace" }}>{r.price_paid ? fmt$(r.price_paid) : '—'}</td>
                      <td style={{ padding: '12px 12px', fontFamily: "'DM Mono',monospace", color: 'var(--text2)' }}>{r.obc ? fmt$(r.obc) : '—'}</td>
                      <td style={{ padding: '12px 12px', fontFamily: "'DM Mono',monospace", color: 'var(--text2)' }}>{r.balance ? fmt$(r.balance) : '—'}</td>
                      <td style={{ padding: '12px 12px' }}>
                        {drop > 0
                          ? <span style={{ background: 'var(--green2)', color: 'var(--green)', border: '1px solid rgba(34,197,94,0.2)', padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 500 }}>↓ {fmt$(drop)}</span>
                          : r.auto_charge
                          ? <span style={{ background: 'var(--gold2)', color: 'var(--gold)', border: '1px solid rgba(240,165,0,0.2)', padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 500 }}>Auto {fmtDate(r.auto_charge)}</span>
                          : <span style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text2)', border: '1px solid var(--border)', padding: '3px 8px', borderRadius: 6, fontSize: 11 }}>Active</span>
                        }
                      </td>
                      <td style={{ padding: '12px 12px' }}>
                        <button onClick={() => deleteRes(r.id)} style={{ background: 'transparent', border: '1px solid var(--border2)', borderRadius: 'var(--radius)', padding: '4px 8px', color: 'var(--text2)', cursor: 'pointer', fontSize: 12 }}>✕</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
