'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import AppLayout from '@/components/AppLayout'
import { supabase } from '@/lib/supabase'

const CRUISE_LINES = ['Norwegian (NCL)', 'Royal Caribbean', 'Carnival', 'Virgin Voyages', 'Other']

type ParsedData = {
  client: string; line: string; ship: string; sailDate: string
  cabin: string; conf: string; pricePaid: number; obc: number
  balance: number; autoCharge: string
}

export default function Upload() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [parseStatus, setParseStatus] = useState('')
  const [parsed, setParsed] = useState<ParsedData | null>(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  const [form, setForm] = useState({
    client: '', line: '', ship: '', sailDate: '', cabin: '',
    conf: '', pricePaid: '', obc: '', balance: '', autoCharge: '', notes: ''
  })

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3500)
  }

  function setF(key: string, val: string) {
    setForm(prev => ({ ...prev, [key]: val }))
  }

  function fillFromParsed(p: ParsedData) {
    setForm({
      client: p.client || '',
      line: CRUISE_LINES.find(l => p.line && l.toLowerCase().includes(p.line.toLowerCase().split(' ')[0])) || p.line || '',
      ship: p.ship || '',
      sailDate: p.sailDate || '',
      cabin: p.cabin || '',
      conf: p.conf || '',
      pricePaid: p.pricePaid ? String(p.pricePaid) : '',
      obc: p.obc ? String(p.obc) : '',
      balance: p.balance ? String(p.balance) : '',
      autoCharge: p.autoCharge || '',
      notes: ''
    })
  }

  async function processFile(file: File) {
    setParsing(true)
    setParseStatus('Reading invoice with AI...')
    setParsed(null)

    const reader = new FileReader()
    reader.onload = async (ev) => {
      const base64 = (ev.target?.result as string).split(',')[1]
      const isImage = file.type.startsWith('image/')
      const isPdf = file.type === 'application/pdf'

      if (!isImage && !isPdf) {
        setParseStatus('⚠ Unsupported file type. Please upload a PDF or image.')
        setParsing(false)
        return
      }

      try {
        const resp = await fetch('/api/parse-invoice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ base64, mimeType: file.type, isImage, isPdf })
        })
        const data = await resp.json()
        if (data.error) throw new Error(data.error)
        setParsed(data)
        fillFromParsed(data)
        setParseStatus('✅ Invoice parsed! Review and save below.')
      } catch (e) {
        setParseStatus('⚠ Could not auto-parse. Fill in the form manually below.')
        console.error(e)
      }
      setParsing(false)
    }
    reader.readAsDataURL(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) processFile(f)
  }

  async function save() {
    if (!form.client.trim()) { showToast('Client name is required.'); return }
    if (!form.line) { showToast('Please select a cruise line.'); return }
    if (!form.pricePaid) { showToast('Please enter the price paid.'); return }
    setSaving(true)

    const { error } = await supabase.from('reservations').insert({
      client: form.client.trim(),
      line: form.line,
      ship: form.ship.trim() || 'TBD',
      sail_date: form.sailDate || null,
      cabin: form.cabin.trim() || 'TBD',
      conf: form.conf.trim() || '',
      price_paid: parseFloat(form.pricePaid) || 0,
      obc: parseFloat(form.obc) || 0,
      balance: parseFloat(form.balance) || 0,
      auto_charge: form.autoCharge || null,
      notes: form.notes.trim() || '',
    })

    setSaving(false)
    if (error) { showToast('Error saving: ' + error.message); return }
    showToast(`${form.client} saved! ✓`)
    setTimeout(() => router.push('/clients'), 1000)
  }

  function clearForm() {
    setForm({ client:'',line:'',ship:'',sailDate:'',cabin:'',conf:'',pricePaid:'',obc:'',balance:'',autoCharge:'',notes:'' })
    setParsed(null)
    setParseStatus('')
  }

  const inp = (key: string, placeholder: string, type = 'text') => (
    <input type={type} placeholder={placeholder} value={(form as any)[key]}
      onChange={e => setF(key, e.target.value)} step={type === 'number' ? '0.01' : undefined} />
  )

  return (
    <AppLayout>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div style={{ background: 'var(--navy3)', border: '1px solid var(--border)', borderRadius: 'var(--radius2)', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 500 }}>📄 Upload Invoice</span>
            <span style={{ background: 'var(--teal3)', color: 'var(--teal)', border: '1px solid rgba(0,212,180,0.2)', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 500 }}>AI-powered</span>
          </div>
          <div style={{ padding: 20 }}>
            {/* Drop zone */}
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              style={{
                border: `2px dashed ${dragging ? 'var(--teal)' : 'var(--border2)'}`,
                borderRadius: 'var(--radius2)', padding: '36px 24px', textAlign: 'center',
                cursor: 'pointer', transition: 'all 0.2s',
                background: dragging ? 'var(--teal4)' : 'var(--navy4)'
              }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>📁</div>
              <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Drop invoice here or click to browse</div>
              <div style={{ fontSize: 12, color: 'var(--text2)' }}>PDF or image · NCL, Royal Caribbean, Carnival, Virgin Voyages</div>
              <input ref={fileRef} type="file" accept=".pdf,image/*" style={{ display: 'none' }}
                onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f) }} />
            </div>

            {/* AI status */}
            {(parsing || parseStatus) && (
              <div style={{ background: 'rgba(0,212,180,0.06)', border: '1px solid rgba(0,212,180,0.2)', borderRadius: 'var(--radius2)', padding: '14px 18px', marginTop: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: parsed ? 14 : 0 }}>
                  {parsing && <div style={{ width: 16, height: 16, border: '2px solid rgba(0,212,180,0.3)', borderTopColor: 'var(--teal)', borderRadius: '50%', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />}
                  <span style={{ fontSize: 12, color: 'var(--teal)', fontWeight: 500 }}>{parseStatus || 'Reading invoice...'}</span>
                </div>
                {parsed && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                    {[
                      ['Client', parsed.client], ['Line', parsed.line], ['Ship', parsed.ship],
                      ['Sail date', parsed.sailDate], ['Cabin', parsed.cabin], ['Conf #', parsed.conf],
                      ['Price paid', parsed.pricePaid ? `$${parsed.pricePaid}` : '—'],
                      ['OBC', parsed.obc ? `$${parsed.obc}` : '$0'],
                      ['Balance', parsed.balance ? `$${parsed.balance}` : '—'],
                    ].map(([k, v]) => (
                      <div key={k} style={{ background: 'var(--navy4)', borderRadius: 8, padding: '10px 12px' }}>
                        <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{k}</div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text1)' }}>{v || '—'}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '20px 0' }} />
            <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16 }}>Review and complete the fields below:</div>

            {/* Form */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 11, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500 }}>Client name(s) *</label>
                {inp('client', 'e.g. Casey & Chelsea')}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 11, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500 }}>Cruise line *</label>
                <select value={form.line} onChange={e => setF('line', e.target.value)}>
                  <option value="">Select cruise line...</option>
                  {CRUISE_LINES.map(l => <option key={l}>{l}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 11, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500 }}>Ship name</label>
                {inp('ship', 'e.g. Norwegian Aqua')}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 11, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500 }}>Sail date</label>
                {inp('sailDate', '', 'date')}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 11, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500 }}>Cabin type</label>
                {inp('cabin', 'e.g. Interior 4B, Solo Studio')}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 11, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500 }}>Confirmation #</label>
                {inp('conf', 'e.g. 12345678')}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 11, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500 }}>Total price paid ($) *</label>
                {inp('pricePaid', '1378.00', 'number')}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 11, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500 }}>OBC ($)</label>
                {inp('obc', '0.00', 'number')}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 11, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500 }}>Balance due ($)</label>
                {inp('balance', '878.00', 'number')}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 11, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500 }}>Auto-charge date</label>
                {inp('autoCharge', '', 'date')}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, gridColumn: '1 / -1' }}>
                <label style={{ fontSize: 11, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500 }}>Notes</label>
                <textarea value={form.notes} onChange={e => setF('notes', e.target.value)} rows={2} placeholder="Any special notes..." />
              </div>
              <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
                <button onClick={clearForm} style={{ padding: '6px 14px', borderRadius: 'var(--radius)', fontSize: 13, cursor: 'pointer', border: '1px solid var(--border2)', background: 'transparent', color: 'var(--text1)' }}>Clear</button>
                <button onClick={save} disabled={saving} style={{ padding: '8px 20px', borderRadius: 'var(--radius)', fontSize: 13, fontWeight: 500, cursor: 'pointer', background: 'var(--teal)', color: 'var(--navy)', border: 'none', opacity: saving ? 0.6 : 1 }}>
                  {saving ? 'Saving...' : '✓ Save reservation'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, background: 'var(--navy4)', border: '1px solid rgba(0,212,180,0.3)', borderRadius: 'var(--radius)', padding: '12px 18px', fontSize: 13, color: 'var(--teal)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', animation: 'slideIn 0.2s ease', zIndex: 1000 }}>
          {toast}
        </div>
      )}
    </AppLayout>
  )
}
