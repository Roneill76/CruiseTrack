'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname()
  const [dropCount, setDropCount] = useState(0)
  const [clientCount, setClientCount] = useState(0)

  useEffect(() => {
    supabase.from('reservations').select('id, price_paid, current_price').then(({ data }) => {
      if (!data) return
      setClientCount(data.length)
      setDropCount(data.filter(r => r.current_price != null && r.current_price < r.price_paid).length)
    })
  }, [path])

  const nav = [
    { href: '/dashboard', label: '📊 Dashboard', id: 'dashboard' },
    { href: '/upload', label: '📄 Upload Invoice', id: 'upload' },
    { href: '/clients', label: '👥 Clients', id: 'clients', count: clientCount },
    { href: '/price-checks', label: '🔍 Price Checks', id: 'price-checks', count: dropCount, countColor: 'var(--green)' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Header */}
      <header style={{
        background: 'var(--navy2)', borderBottom: '1px solid var(--border)',
        padding: '14px 24px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, background: 'var(--teal3)', border: '1px solid var(--teal)',
            borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16
          }}>⚓</div>
          <div>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 15, fontWeight: 500, color: 'var(--teal)', letterSpacing: '-0.02em' }}>
              CruiseTrack
            </div>
            <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 1 }}>Price drop intelligence</div>
          </div>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', animation: 'pulse 2s infinite' }} />
          AI parsing active · Ricky's workspace
        </div>
      </header>

      {/* Nav */}
      <nav style={{
        background: 'var(--navy2)', borderBottom: '1px solid var(--border)',
        padding: '0 24px', display: 'flex', gap: 4
      }}>
        {nav.map(n => {
          const active = path === n.href || (n.href !== '/dashboard' && path.startsWith(n.href))
          return (
            <Link key={n.id} href={n.href} style={{
              padding: '12px 16px', fontSize: 13, cursor: 'pointer',
              color: active ? 'var(--teal)' : 'var(--text2)',
              borderBottom: active ? '2px solid var(--teal)' : '2px solid transparent',
              display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
              transition: 'color 0.15s', textDecoration: 'none'
            }}>
              {n.label}
              {n.count != null && n.count > 0 && (
                <span style={{
                  background: n.countColor ? 'rgba(34,197,94,0.15)' : 'var(--teal3)',
                  color: n.countColor || 'var(--teal)',
                  fontSize: 10, padding: '1px 6px', borderRadius: 10, fontWeight: 500
                }}>{n.count}</span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Content */}
      <main style={{ flex: 1, padding: '24px', maxWidth: 1100, width: '100%', margin: '0 auto' }}>
        {children}
      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border)', padding: '12px 24px', textAlign: 'center', fontSize: 11, color: 'var(--text3)' }}>
        CruiseTrack · Built for Ricky's cruise agency
      </footer>
    </div>
  )
}
