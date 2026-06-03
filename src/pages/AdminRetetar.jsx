import { useState, useMemo } from 'react'
import Layout from '../Layout'
import { useStore } from '../StoreContext'

function Toast({msg,type,onDone}) {
  return <div className={`toast ${type}`} onClick={onDone} style={{cursor:'pointer'}}>{msg}</div>
}

export default function AdminRetetar() {
  const { db, saveRecipe } = useStore()
  const [selectedProductId, setSelectedProductId] = useState('')
  const [recipe, setRecipe] = useState(null)
  const [toast, setToast] = useState(null)
  const [newItem, setNewItem] = useState({ component_product_id:'', component_name:'', cantitate:1, uom_code:'kg', cost_unitar:0 })
  const [editingRecipe, setEditingRecipe] = useState(false)
  const [search, setSearch] = useState('')

  const products = (db.products||[]).filter(p=>p.activ)
  const uoms = db.unit_of_measure||[]
  const recipes = db.recipes||[]

  // products usable as raw materials (materie prima) — all active products can be ingredients
  const materiiPrime = useMemo(() => products.filter(p =>
    (p.categorie||'').toLowerCase().includes('materie') ||
    (p.tip||'').toLowerCase().includes('materie') ||
    true // fallback: all products selectable as ingredients
  ), [products])

  function showToast(msg,type='success'){setToast({msg,type});setTimeout(()=>setToast(null),2500)}

  function loadRecipe(productId) {
    setSelectedProductId(productId)
    const existing = recipes.find(r=>r.product_id===productId&&r.is_active)
    if (existing) setRecipe({...existing,items:[...(existing.items||[])]})
    else setRecipe({ product_id:productId, name:'', version:1, is_active:true, notes:'', items:[] })
    setEditingRecipe(true)
  }

  function onSelectComponentProduct(productId) {
    const p = products.find(x=>x.id===productId)
    if (!p) { setNewItem(prev=>({...prev,component_product_id:'',component_name:'',cost_unitar:0})); return }
    const ap = (p.product_prices||[]).find(x=>x.is_active)
    const price = ap?.base_price || p.active_base_price || p.pret_ron || 0
    const uom = (p.product_uom||[])[0]?.uom_code || 'kg'
    setNewItem(prev=>({...prev, component_product_id:productId, component_name:p.name, cost_unitar:price, uom_code:uom}))
  }

  function addItem() {
    if (!newItem.component_name||!newItem.cantitate) return showToast('Selectează componenta și cantitatea','error')
    setRecipe(prev=>({...prev,items:[...prev.items,{id:Date.now(),...newItem,cantitate:parseFloat(newItem.cantitate)||0,cost_unitar:parseFloat(newItem.cost_unitar)||0}]}))
    setNewItem({component_product_id:'',component_name:'',cantitate:1,uom_code:'kg',cost_unitar:0})
  }

  function removeItem(id) {
    setRecipe(prev=>({...prev,items:prev.items.filter(i=>i.id!==id)}))
  }

  function handleSave() {
    if (!recipe.name) return showToast('Completează numele rețetei','error')
    saveRecipe({...recipe, id:recipe.id||Date.now()})
    showToast('Rețetă salvată!')
    setEditingRecipe(false)
  }

  const costTotal = recipe?.items?.reduce((s,i)=>s+(i.cantitate*i.cost_unitar),0)||0

  const filteredProducts = products.filter(p => {
    const q = search.toLowerCase()
    return !q || p.name.toLowerCase().includes(q) || (p.cod||'').toLowerCase().includes(q)
  })

  return (
    <Layout title="Rețetar produse" subtitle="Calcul cost intern producție">
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={()=>setToast(null)}/>}

      <div style={{display:'grid',gridTemplateColumns:'280px 1fr',gap:16,alignItems:'start'}}>
        {/* Products list */}
        <div className="card">
          <div className="section-title" style={{marginBottom:8}}>Produse finite</div>
          <input className="w-full" placeholder="Caută produs..." value={search} onChange={e=>setSearch(e.target.value)} style={{marginBottom:10,fontSize:12}}/>
          {filteredProducts.map(p=>{
            const hasRecipe = recipes.some(r=>r.product_id===p.id&&r.is_active)
            return (
              <div key={p.id} onClick={()=>loadRecipe(p.id)}
                style={{padding:'10px 12px',borderRadius:8,cursor:'pointer',background:selectedProductId===p.id?'var(--blue-bg)':'var(--bg)',marginBottom:6,border:`1px solid ${selectedProductId===p.id?'var(--blue)':'var(--border)'}`,transition:'all 0.15s'}}>
                <div style={{fontSize:13,fontWeight:600,marginBottom:2}}>{p.name}</div>
                <div style={{fontSize:11,color:'var(--text3)',display:'flex',justifyContent:'space-between'}}>
                  <span>{p.cod}</span>
                  <span style={{color:hasRecipe?'var(--green-text)':'var(--orange-text)',fontWeight:500}}>{hasRecipe?'✓ Rețetă':'Fără rețetă'}</span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Recipe editor */}
        {editingRecipe && recipe ? (
          <div>
            <div className="card" style={{marginBottom:14}}>
              <div className="flex-between" style={{marginBottom:14}}>
                <div>
                  <div className="section-title">{products.find(p=>p.id===selectedProductId)?.name}</div>
                  <div style={{fontSize:12,color:'var(--text3)',marginTop:2}}>Rețetar v{recipe.version}</div>
                </div>
                <div style={{display:'flex',gap:8}}>
                  <button className="btn btn-secondary btn-sm" onClick={()=>setEditingRecipe(false)}>Anulează</button>
                  <button className="btn btn-primary btn-sm" onClick={handleSave}>💾 Salvează rețeta</button>
                </div>
              </div>

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
                <div className="form-group" style={{marginBottom:0}}>
                  <label>Nume rețetă *</label>
                  <input className="w-full" value={recipe.name} onChange={e=>setRecipe(p=>({...p,name:e.target.value}))} placeholder="Ex: Rețetă standard v1"/>
                </div>
                <div className="form-group" style={{marginBottom:0}}>
                  <label>Note</label>
                  <input className="w-full" value={recipe.notes||''} onChange={e=>setRecipe(p=>({...p,notes:e.target.value}))} placeholder="Observații interne"/>
                </div>
              </div>

              {/* Items table */}
              {recipe.items.length > 0 && (
                <div className="table-wrap" style={{marginBottom:14}}>
                  <table>
                    <thead><tr><th>Componentă</th><th>Cantitate</th><th>UM</th><th>Cost/unitate (RON)</th><th>Subtotal</th><th></th></tr></thead>
                    <tbody>
                      {recipe.items.map(item=>(
                        <tr key={item.id}>
                          <td style={{fontWeight:500}}>{item.component_name}</td>
                          <td>{item.cantitate}</td>
                          <td style={{color:'var(--text3)'}}>{item.uom_code}</td>
                          <td>{(+item.cost_unitar).toFixed(4)}</td>
                          <td style={{fontWeight:600}}>{(item.cantitate*item.cost_unitar).toFixed(4)}</td>
                          <td><button className="btn btn-danger btn-sm" onClick={()=>removeItem(item.id)}>✕</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Cost total */}
              {recipe.items.length > 0 && (
                <div style={{background:'var(--green-bg)',border:'1px solid rgba(22,163,74,0.2)',borderRadius:8,padding:'10px 16px',marginBottom:14,display:'flex',justifyContent:'space-between',fontSize:14}}>
                  <span style={{color:'var(--green-text)',fontWeight:600}}>Cost total producție:</span>
                  <span style={{color:'var(--green-text)',fontWeight:800}}>{costTotal.toFixed(4)} RON / buc</span>
                </div>
              )}

              {/* Add item */}
              <div style={{background:'var(--bg)',borderRadius:10,padding:'14px'}}>
                <div className="section-title" style={{marginBottom:10,fontSize:12}}>Adaugă componentă (materie primă)</div>
                <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr auto',gap:8,alignItems:'end'}}>
                  <div className="form-group" style={{marginBottom:0}}>
                    <label>Produs / materie primă</label>
                    <select className="w-full" value={newItem.component_product_id} onChange={e=>onSelectComponentProduct(e.target.value)}>
                      <option value="">— Selectează produs —</option>
                      {materiiPrime.map(p=>(
                        <option key={p.id} value={p.id}>{p.name} {p.cod?`(${p.cod})`:''}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group" style={{marginBottom:0}}>
                    <label>Cantitate</label>
                    <input type="number" min={0} step={0.001} className="w-full" value={newItem.cantitate} onChange={e=>setNewItem(p=>({...p,cantitate:e.target.value}))}/>
                  </div>
                  <div className="form-group" style={{marginBottom:0}}>
                    <label>UM</label>
                    <select className="w-full" value={newItem.uom_code} onChange={e=>setNewItem(p=>({...p,uom_code:e.target.value}))}>
                      {uoms.length > 0
                        ? uoms.map(u=><option key={u.code||u.id} value={u.code||u.id}>{u.code||u.id} — {u.name}</option>)
                        : ['g','kg','l','ml','buc','m'].map(u=><option key={u} value={u}>{u}</option>)
                      }
                    </select>
                  </div>
                  <div className="form-group" style={{marginBottom:0}}>
                    <label>Cost/unitate (RON)</label>
                    <input type="number" min={0} step={0.0001} className="w-full" value={newItem.cost_unitar} onChange={e=>setNewItem(p=>({...p,cost_unitar:e.target.value}))}/>
                  </div>
                  <button className="btn btn-primary btn-sm" style={{marginBottom:1}} onClick={addItem}>+</button>
                </div>
                {newItem.component_name && (
                  <div style={{marginTop:8,fontSize:11,color:'var(--text3)'}}>Selectat: <strong>{newItem.component_name}</strong> · preț auto-completat din lista de prețuri</div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="card" style={{textAlign:'center',padding:'48px 32px',color:'var(--text3)'}}>
            <div style={{fontSize:48,marginBottom:16}}>📋</div>
            <div style={{fontSize:15,fontWeight:500,marginBottom:8}}>Selectează un produs din stânga</div>
            <div style={{fontSize:13}}>pentru a vizualiza sau edita rețetarul</div>
          </div>
        )}
      </div>
    </Layout>
  )
}
