'use client'
import { useEffect, useState } from 'react'
import AppLayout from '@/components/AppLayout'
import { supabase, Reservation } from '@/lib/supabase'

function fmt$(n: number | null) {
  if (n == null) return '—'
  return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}
function fmtDate(d: string | null) {
  if (!d) return '—'
  try { return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }
  catch { return d }
}
function fmtTime(d: string | null) {
  if (!d) return null
  try { return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) }
  catch { return null }
}

export default function PriceChecks() {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(false)
  const [toast, setToast] = useState({ msg: '', type: 'teal' })
  const [overrideClient, setOverrideClient] = useState('')
  const [overridePrice, setOverridePrice] = useState('')
  const [overrideDate, setOverrideDate] = useState('')

  function showToast(msg: string, type = 'teal') {
    setToast({ msg, type })
    setTimeout(() => setToast({ msg: '', type: 'teal' }), 4000)
  }

  useEffect(() => {
    supabase.from('reservations').select('*').order('created_at', { ascending: true }).then(({ data }) => {
      setReservations(data || [])
      setLoading(false)
      if (data && data.length > 0) setOverrideClient(data[0].id)
    })
  }, [])

  async function runPriceCheck() {
    const checkable = reservations.filter(r => r.price_paid > 0 && r.line !== 'TBD')
    if (checkable.length === 0) { showToast('No checkable reservations yet.', 'red'); return }
    setChecking(true)

    try {
      const resp = await fetch('/api/price-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservations: checkable })
      })
      const results: { id: string; currentPrice: number }[] = await resp.json()

      const now = new Date().toISOString()
      const updates = results.map(({ id, currentPrice }) =>
        supabase.from('reservations').update({ current_price: currentPrice, last_checked: now }).eq('id', id)
      )
      await Promise.all(updates)

      const { data } = await supabase.from('reservations').select('*').order('created_at', { ascending: true })
      const updated = data || []
      setReservations(updated)

      const drops = updated.filter(r => r.current_price != null && r.current_price < r.price_paid)
      const savings = drops.reduce((s, r) => s + (r.price_paid - (r.current_price ?? 0)), 0)
      showToast(`✓ Price check complete — ${drops.length} drop(s) found, ${fmt$(savings)} in savings!`, drops.length > 0 ? 'green' : 'teal')
    } catch (e) {
      showToast('Price check failed. Try manual override below.', 'red')
      console.error(e)
    }
    setChecking(false)
  }

  async function applyOverride() {
    if (!overrideClient || !overridePrice) { showToast('Select a client and enter a price.', 'red'); return }
    const price = parseFloat(overridePrice)
    const { error } = await supabase.from('reservations')
      .update({ current_price: price, last_checked: new Date().toISOString() })
      .eq('id', overrideClient)
    if (error) { showToast('Error: ' + error.message, 'red'); return }

    setReservations(prev => prev.map(r => r.id === overrideClient ? { ...r, current_price: price, last_checked: new Date().toISOString() } : r))
    const r = reservations.find(x => x.id === overrideClient)
    showToast(`Price updated for ${r?.client}.`)
    setOverridePrice('')
  }

  const lastChecked = reservations.find(r => r.last_checked)?.last_checked
  const drops = reservations.filter(r => r.current_price != null && r.current_price < r.price_paid)

  const colStyle = (extra = {}) => ({ ...extra })

  return (
    <AppLayout>
      {/* Main price check card */}
      <div style={{ background: 'var(--navy3)', border: '1px solid var(--border)', borderRadius: 'var(--radius2)', overflow: 'hidden', marginBottom: 16 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 14, fontWeight: 500 }}>🔍 Weekly price check</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {checking && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--teal)' }}>
                <div style={{ width: 14, height: 14, border: '2px solid rgba(0,212,180,0.3)', borderTopColor: 'var(--teal)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                Checking prices...
              </div>
            )}
            <button onClick={runPriceCheck} disabled={checking || loading} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 'var(--radius)', fontSize: 13, fontWeight: 500, background: 'var(--teal)', color: 'var(--navy)', border: 'none', cursor: 'pointer', opacity: (checking || loading) ? 0.5 : 1 }}>
              ↻ Run check now
            </button>
          </div>
        </div>
        <div style={{ padding: 20 }}>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 16 }}>
            {lastChecked ? `Last checked: ${fmtTime(lastChecked)} · ${drops.length} drop(s) found` : 'No price check run yet — click "Run check now" to start.'}
          </div>

          {drops.length > 0 && (
            <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 'var(--radius)', padding: '10px 14px', marginBottom: 16, color: 'var(--green)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
              ✅ {drops.length} price drop{drops.length > 1 ? 's' : ''} found — ${Math.round(drops.reduce((s,r) => s + (r.price_paid - (r.current_price ?? 0)), 0))} in total savings available
            </div>
          )}

          {/* Column headers */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 2fr 1fr 1fr 1fr 1fr', gap: 8, paddingBottom: 10, borderBottom: '1px solid var(--border)', fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            <div>Client</div><div>Cruise</div>
            <div style={{ textAlign: 'right' }}>Paid</div>
            <div style={{ textAlign: 'right' }}>Current</div>
            <div style={{ textAlign: 'right' }}>Drop</div>
            <div></div>
          </div>

          {loading ? (
            <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--text3)' }}>Loading...</div>
          ) : reservations.length === 0 ? (
            <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--text3)' }}>No reservations yet.</div>
          ) : (
            reservations.map(r => {
              const hasCurrent = r.current_price != null
              const drop = hasCurrent && r.current_price! < r.price_paid ? r.price_paid - r.current_price! : 0
              return (
                <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '1.4fr 2fr 1fr 1fr 1fr 1fr', gap: 8, alignItems: 'center', padding: '14px 0', borderTop: '1px solid var(--border)', fontSize: 13 }}>
                  <div style={{ fontWeight: 500, color: 'var(--text1)' }}>{r.client}</div>
                  <div style={{ color: 'var(--text2)', fontSize: 12 }}>{r.line.replace(' (NCL)', ' NCL')} · {r.cabin} · {fmtDate(r.sail_date)}</div>
                  <div style={{ fontFamily: "'DM Mono',monospace", textAlign: 'right' }}>{r.price_paid ? fmt$(r.price_paid) : '—'}</div>
                  <div style={{ fontFamily: "'DM Mono',monospace", textAlign: 'right', color: drop > 0 ? 'var(--green)' : hasCurrent ? 'var(--text2)' : 'var(--text3)' }}>
                    {hasCurrent ? fmt$(r.current_price) : '—'}
                  </div>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontWeight: drop > 0 ? 500 : 400, color: drop > 0 ? 'var(--green)' : 'var(--text3)', textAlign: 'right' }}>
                    {drop > 0 ? `-${fmt$(drop)}` : '—'}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {drop > 0 ? (
                      <button
                        onClick={() => window.open(`mailto:?subject=Price Drop Alert — ${r.client}&body=Hi! Great news — there's a price drop available on your cruise reservation. Original price: ${fmt$(r.price_paid)}. Current price: ${fmt$(r.current_price)}. You could save ${fmt$(drop)}! Contact me to reprice.`, '_blank')}
                        style={{ padding: '5px 10px', borderRadius: 'var(--radius)', fontSize: 12, cursor: 'pointer', border: '1px solid rgba(34,197,94,0.3)', background: 'var(--green2)', color: 'var(--green)', fontWeight: 500 }}>
                        ✉ Alert client
                      </button>
                    ) : (
                      <button disabled style={{ padding: '5px 10px', borderRadius: 'var(--radius)', fontSize: 12, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text3)', opacity: 0.5 }}>
                        No drop
                      </button>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Manual override */}
      <div style={{ background: 'var(--navy3)', border: '1px solid var(--border)', borderRadius: 'var(--radius2)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontSize: 14, fontWeight: 500 }}>✏️ Manual price override</span>
        </div>
        <div style={{ padding: 20 }}>
          <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16 }}>
            When auto-check can't reach a cruise line's site, enter the current price manually.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 12, alignItems: 'end' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 11, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500 }}>Client reservation</label>
              <select value={overrideClient} onChange={e => setOverrideClient(e.target.value)}>
                {reservations.map(r => <option key={r.id} value={r.id}>{r.client}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 11, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500 }}>Current price ($)</label>
              <input type="number" step="0.01" placeholder="0.00" value={overridePrice} onChange={e => setOverridePrice(e.target.value)} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 11, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500 }}>Checked on</label>
              <input type="date" value={overrideDate} onChange={e => setOverrideDate(e.target.value)} />
            </div>
            <button onClick={applyOverride} style={{ padding: '9px 18px', borderRadius: 'var(--radius)', fontSize: 13, fontWeight: 500, background: 'var(--teal)', color: 'var(--navy)', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              ✓ Update
            </button>
          </div>
        </div>
      </div>

      {toast.msg && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, background: 'var(--navy4)',
          border: `1px solid ${toast.type === 'green' ? 'rgba(34,197,94,0.3)' : toast.type === 'red' ? 'rgba(255,77,109,0.3)' : 'rgba(0,212,180,0.3)'}`,
          borderRadius: 'var(--radius)', padding: '12px 18px', fontSize: 13,
          color: toast.type === 'green' ? 'var(--green)' : toast.type === 'red' ? 'var(--red)' : 'var(--teal)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)', animation: 'slideIn 0.2s ease', zIndex: 1000, maxWidth: 340
        }}>
          {toast.msg}
        </div>
      )}
    </AppLayout>
  )
}
