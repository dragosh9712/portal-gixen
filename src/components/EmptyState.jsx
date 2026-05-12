import { useNavigate } from 'react-router-dom'

const presets = {
  comenzi: { icon: '📦', title: 'Nicio comandă încă', sub: 'Plasează prima ta comandă și va apărea aici.', cta: '+ Comandă nouă', path: '/comanda-noua' },
  produse: { icon: '🧻', title: 'Niciun produs găsit', sub: 'Încearcă să modifici filtrele de căutare.', cta: null },
  clienti: { icon: '🏢', title: 'Niciun client', sub: 'Clienții noi apar aici după înregistrare.', cta: null },
  rapoarte: { icon: '📊', title: 'Date insuficiente', sub: 'Plasează câteva comenzi pentru a vedea rapoarte.', cta: null },
  favorite: { icon: '❤️', title: 'Niciun produs favorit', sub: 'Apasă ♡ pe un produs pentru a-l adăuga la favorite.', cta: 'Vezi produse', path: '/produse' },
}

export default function EmptyState({ type = 'comenzi', message }) {
  const navigate = useNavigate()
  const preset = presets[type] || { icon: '🔍', title: 'Nimic de afișat', sub: message || '', cta: null }
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{preset.icon}</div>
      <div className="empty-state-title">{preset.title}</div>
      <div className="empty-state-sub">{preset.sub}</div>
      {preset.cta && (
        <button className="btn btn-primary" onClick={() => navigate(preset.path)}>{preset.cta}</button>
      )}
    </div>
  )
}
