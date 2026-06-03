import { useState } from 'react'
import Layout from '../Layout'
import { useStore } from '../StoreContext'

function Toast({msg,type,onDone}) {
  return <div className={`toast ${type}`} onClick={onDone} style={{cursor:'pointer'}}>{msg}</div>
}

export default function AdminUoM() {
  const { db, saveUom } = useStore()
  const [form, setForm] = useState({ code:'', name:'', description:'', is_active:true })
  const [editId, setEditId] = useState(null)
  const [toast, setToast] = useState(null)

  const uoms = db.unit_of_measure || []

  function showToast(msg,type='success'){setToast({msg,type});setTimeout(()=>setToast(null),2500)}

  function handleSave() {
    if (!form.code||!form.name) return showToast('Completează codul și denumirea','error')
    saveUom({ id:editId||undefined, ...form, code:form.code.toUpperCase() })
    setForm({ code:'', name:'', description:'', is_active:true })
    setEditId(null)
    showToast('UoM salvată!')
  }

  function handleEdit(u) {
    setEditId(u.id)
    setForm({ code:u.code, name:u.name, description:u.description||'', is_active:u.is_active })
  }

  // Produse per UoM
  function getProductCountForUom(uomId) {
    return (db.products||[]).filter(p=>(p.product_uom||[]).some(u=>u.uom_id===uomId)).length
  }

  return (
    <Layout title="Unități de măsură" subtitle="Rolă, Bax, Palet, Set">
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={()=>setToast(null)}/>}

      <div style={{display:'grid',gridTemplateColumns:'1fr 340px',gap:16,alignItems:'start'}}>
        <div className="card">
          <div className="section-title" style={{marginBottom:14}}>Unități de măsură configurate</div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Cod</th><th>Denumire</th><th>Descriere</th><th>Produse</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {uoms.map(u=>(
                  <tr key={u.id}>
                    <td><span style={{fontWeight:700,fontFamily:'monospace',background:'var(--bg3)',padding:'2px 8px',borderRadius:4}}>{u.code}</span></td>
                    <td style={{fontWeight:500}}>{u.name}</td>
                    <td style={{color:'var(--text3)',fontSize:12}}>{u.description||'—'}</td>
                    <td>{getProductCountForUom(u.id)} produse</td>
                    <td><span style={{fontSize:11,padding:'2px 8px',borderRadius:10,background:u.is_active?'var(--green-bg)':'var(--bg3)',color:u.is_active?'var(--green-text)':'var(--text3)',fontWeight:600}}>{u.is_active?'Activ':'Inactiv'}</span></td>
                    <td><button className="btn btn-secondary btn-sm" onClick={()=>handleEdit(u)}>✏</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{marginTop:16,background:'var(--blue-bg)',borderRadius:8,padding:'10px 14px',fontSize:12,color:'var(--blue-text)'}}>
            💡 UoM-urile sunt asignate fiecărui produs individual cu coeficienți de conversie din secțiunea <strong>Produse → tab UoM</strong>.
          </div>
        </div>

        <div className="card" style={{position:'sticky',top:16}}>
          <div className="section-title" style={{marginBottom:14}}>{editId?'Editare UoM':'UoM nouă'}</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <div className="form-group" style={{marginBottom:0}}>
              <label>Cod * (ex: ROLA)</label>
              <input className="w-full" value={form.code} onChange={e=>setForm(p=>({...p,code:e.target.value.toUpperCase()}))} placeholder="ROLA" style={{fontFamily:'monospace'}}/>
            </div>
            <div className="form-group" style={{marginBottom:0}}>
              <label>Denumire *</label>
              <input className="w-full" value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} placeholder="Rolă" />
            </div>
          </div>
          <div className="form-group" style={{marginTop:10}}>
            <label>Descriere</label>
            <input className="w-full" value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} placeholder="Unitate de bază" />
          </div>
          <label style={{display:'flex',gap:8,cursor:'pointer',fontSize:13,marginBottom:14}}>
            <input type="checkbox" checked={form.is_active} onChange={e=>setForm(p=>({...p,is_active:e.target.checked}))}/> Activă
          </label>
          <div style={{display:'flex',gap:8}}>
            {editId && <button className="btn btn-secondary" onClick={()=>{setEditId(null);setForm({code:'',name:'',description:'',is_active:true})}}>Anulează</button>}
            <button className="btn btn-primary" style={{flex:1,justifyContent:'center'}} onClick={handleSave}>{editId?'Salvează':'Adaugă UoM'}</button>
          </div>
        </div>
      </div>
    </Layout>
  )
}
