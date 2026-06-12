import { useState, useEffect } from 'react'
import Layout from '../Layout'
import api from '../api'
import { fmtDate } from '../utils'

const empty = { title: '', description: '', image_url: '', active_from: '', active_until: '', show_to_groups: 'all', is_active: true }

export default function AdminBannere() {
  const [bannere, setBannere] = useState([])
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)

  async function load() {
    try { setBannere(await api.banners.list() || []) } catch { }
  }

  useEffect(() => { load() }, [])

  function openNew() { setForm(empty); setModal('new') }
  function openEdit(b) { setForm({ ...b, is_active: !!b.is_active, active_from: b.active_from?.slice(0,10)||'', active_until: b.active_until?.slice(0,10)||'' }); setModal(b.id) }

  async function save() {
    setSaving(true)
    try {
      if (modal === 'new') await api.banners.create(form)
      else await api.banners.update(modal, form)
      setModal(null)
      await load()
    } catch { }
    setSaving(false)
  }

  async function del(id) {
    if (!confirm('Ștergi bannerul?')) return
    try { await api.banners.remove(id); await load() } catch { }
  }

  const f = (key, val) => setForm(p => ({ ...p, [key]: val }))

  return (
    <Layout title="Bannere promoționale" actions={
      <button className="btn btn-primary btn-sm" onClick={openNew}>+ Banner nou</button>
    }>
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Titlu</th><th>Activ din</th><th>Activ până</th><th>Grupuri</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {bannere.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text3)', padding: 32 }}>Niciun banner creat</td></tr>
              )}
              {bannere.map(b => (
                <tr key={b.id}>
                  <td><b>{b.title}</b>{b.description && <div style={{ fontSize: 12, color: 'var(--text3)' }}>{b.description.slice(0, 60)}{b.description.length > 60 ? '…' : ''}</div>}</td>
                  <td>{b.active_from ? fmtDate(b.active_from) : '—'}</td>
                  <td>{b.active_until ? fmtDate(b.active_until) : '—'}</td>
                  <td><span style={{ fontSize: 12, color: 'var(--text2)' }}>{b.show_to_groups || 'all'}</span></td>
                  <td>{b.is_active ? <span className="badge badge-green">Activ</span> : <span className="badge badge-gray">Inactiv</span>}</td>
                  <td>
                    <div className="flex gap-8">
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(b)}>Editează</button>
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }} onClick={() => del(b.id)}>Șterge</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" style={{ width: 480 }} onClick={e => e.stopPropagation()}>
            <div className="modal-hdr">
              <h3>{modal === 'new' ? 'Banner nou' : 'Editează banner'}</h3>
              <button className="modal-close" onClick={() => setModal(null)}>×</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label className="label">Titlu</label>
                <input type="text" value={form.title} onChange={e => f('title', e.target.value)} placeholder="Titlu banner" />
              </div>
              <div>
                <label className="label">Descriere</label>
                <textarea rows={4} value={form.description} onChange={e => f('description', e.target.value)} placeholder="Text mesaj..." style={{ width: '100%' }} />
              </div>
              <div>
                <label className="label">Imagine banner</label>
                {form.image_url ? (
                  <div>
                    <img src={form.image_url} alt="" style={{ maxWidth: '100%', maxHeight: 140, borderRadius: 8, objectFit: 'cover', marginBottom: 6 }}
                      onError={e => e.target.style.display = 'none'} />
                    <div>
                      <button className="btn btn-ghost btn-sm" type="button" style={{ color: 'var(--red)' }}
                        onClick={() => f('image_url', '')}>✕ Șterge imaginea</button>
                    </div>
                  </div>
                ) : (
                  <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', display: 'inline-flex' }}>
                    📤 Încarcă imagine
                    <input type="file" accept="image/*" style={{ display: 'none' }}
                      onChange={async e => {
                        const file = e.target.files[0]
                        if (!file) return
                        try {
                          const r = await api.banners.uploadImage(file)
                          f('image_url', r.image_url)
                        } catch (err) { alert(err.message) }
                      }} />
                  </label>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label className="label">Activ din</label>
                  <input type="date" value={form.active_from} onChange={e => f('active_from', e.target.value)} />
                </div>
                <div>
                  <label className="label">Activ până</label>
                  <input type="date" value={form.active_until} onChange={e => f('active_until', e.target.value)} />
                </div>
              </div>
              <div>
                <label className="label">Grupuri de clienți</label>
                {(() => {
                  const ALL_GROUPS = ['standard', 'gold', 'platinum']
                  const selectedGroups = form.show_to_groups === 'all' || !form.show_to_groups
                    ? [] : form.show_to_groups.split(',').map(g => g.trim()).filter(Boolean)
                  const isAll = !selectedGroups.length
                  const toggle = (g) => {
                    const next = selectedGroups.includes(g)
                      ? selectedGroups.filter(x => x !== g)
                      : [...selectedGroups, g]
                    f('show_to_groups', next.length ? next.join(',') : 'all')
                  }
                  return (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: 12, padding: '4px 12px', borderRadius: 20, background: isAll ? 'var(--blue-bg)' : 'var(--bg3)', border: '1px solid ' + (isAll ? 'var(--blue)' : 'var(--border)'), color: isAll ? 'var(--blue-text)' : 'var(--text2)' }}>
                        <input type="checkbox" checked={isAll} onChange={() => f('show_to_groups', 'all')} style={{ width: 12, height: 12 }} />
                        Toți clienții
                      </label>
                      {ALL_GROUPS.map(g => (
                        <label key={g} style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: 12, padding: '4px 12px', borderRadius: 20, background: selectedGroups.includes(g) ? 'var(--blue-bg)' : 'var(--bg3)', border: '1px solid ' + (selectedGroups.includes(g) ? 'var(--blue)' : 'var(--border)'), color: selectedGroups.includes(g) ? 'var(--blue-text)' : 'var(--text2)', textTransform: 'capitalize' }}>
                          <input type="checkbox" checked={selectedGroups.includes(g)} onChange={() => toggle(g)} style={{ width: 12, height: 12 }} />
                          {g}
                        </label>
                      ))}
                    </div>
                  )
                })()}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" id="chk-active" checked={form.is_active} onChange={e => f('is_active', e.target.checked)} />
                <label htmlFor="chk-active">Banner activ</label>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Anulează</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Se salvează…' : 'Salvează'}</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
