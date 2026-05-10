'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import AppLayout from '@/components/AppLayout'
import { supabase, Reservation } from '@/lib/supabase'

function fmt$(n: number | null) {
  if (!n) return '—'
  return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}
function fmtDate(d: string | null) {
  if (!d) return '—'
  try { return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }
  catch { return d }
}

export default function Clients() {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000) }

  useEffect(() => {
    supabase.from('reservations').select('*').order('created_at', { ascending: true }).then(({ data }) => {
      setReservations(data || [])
      setLoading(false)
    })
  }, [])

  async function deleteRes(id: string, name: string) {
    if (!confirm(`Delete reservation for ${name}?`)) return
    await supabase.from('reservations').delete().eq('id', id)
    setReservations(prev => prev.filter(r => r.id !== id))
    showToast(`${name} deleted.`)
  }

  return (
    <AppLayout>
      <div style={{ background: 'var(--navy3)', border: '1px solid var(--border)', borderRadius: 'var(--radius2)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 14, fontWeight: 500 }}>👥 All clients ({reservations.length})</span>
          <Link href="/upload" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 'var(--radius)', fontSize: 13, fontWeight: 500, background: 'var(--teal)', color: 'var(--navy)', textDecoration: 'none' }}>
            + Add reservation
          </Link>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>Loading...</div>
        ) : reservations.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>
            No clients yet. <Link href="/upload" style={{ color: 'var(--teal)' }}>Upload your first invoice →</Link>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  {['Client', 'Cruise line', 'Ship / Date', 'Cabin', 'Conf #', 'Paid', 'OBC', 'Balance', 'Auto-charge', 'Notes', ''].map(h => (
                    <th key={h} style={{ textAlign: 'left', fontSize: 10, fontWeight: 500, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 12px 10px', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reservations.map(r => (
                  <tr key={r.id} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 12px' }}><strong>{r.client}</strong></td>
                    <td style={{ padding: '12px 12px', color: 'var(--text2)' }}>{r.line}</td>
                    <td style={{ padding: '12px 12px', color: 'var(--text2)', whiteSpace: 'nowrap' }}>{r.ship} · {fmtDate(r.sail_date)}</td>
                    <td style={{ padding: '12px 12px', color: 'var(--text2)' }}>{r.cabin}</td>
                    <td style={{ padding: '12px 12px', color: 'var(--text3)', fontFamily: "'DM Mono',monospace", fontSize: 12 }}>{r.conf || '—'}</td>
                    <td style={{ padding: '12px 12px', fontFamily: "'DM Mono',monospace" }}>{fmt$(r.price_paid)}</td>
                    <td style={{ padding: '12px 12px', fontFamily: "'DM Mono',monospace", color: 'var(--text2)' }}>{r.obc ? fmt$(r.obc) : '—'}</td>
                    <td style={{ padding: '12px 12px', fontFamily: "'DM Mono',monospace", color: 'var(--text2)' }}>{r.balance ? fmt$(r.balance) : '—'}</td>
                    <td style={{ padding: '12px 12px' }}>
                      {r.auto_charge
                        ? <span style={{ background: 'var(--gold2)', color: 'var(--gold)', border: '1px solid rgba(240,165,0,0.2)', padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 500, whiteSpace: 'nowrap' }}>{fmtDate(r.auto_charge)}</span>
                        : <span style={{ color: 'var(--text3)' }}>—</span>}
                    </td>
                    <td style={{ padding: '12px 12px', color: 'var(--text3)', fontSize: 12, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.notes || '—'}</td>
                    <td style={{ padding: '12px 12px' }}>
                      <button onClick={() => deleteRes(r.id, r.client)} style={{ background: 'transparent', border: '1px solid var(--border2)', borderRadius: 'var(--radius)', padding: '4px 8px', color: 'var(--text2)', cursor: 'pointer', fontSize: 12 }}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, background: 'var(--navy4)', border: '1px solid var(--border2)', borderRadius: 'var(--radius)', padding: '12px 18px', fontSize: 13, color: 'var(--text1)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', animation: 'slideIn 0.2s ease', zIndex: 1000 }}>
          {toast}
        </div>
      )}
    </AppLayout>
  )
}
