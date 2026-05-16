export default function SkeletonTable({ rows = 5, cols = 5 }) {
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {Array(cols).fill(0).map((_, i) => (
              <th key={i} style={{ padding: '10px 14px', background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
                <div className="skeleton" style={{ height: 12, width: i === 0 ? 40 : i === 1 ? 120 : 80, borderRadius: 4 }} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array(rows).fill(0).map((_, r) => (
            <tr key={r}>
              {Array(cols).fill(0).map((_, c) => (
                <td key={c} style={{ padding: '12px 14px', borderBottom: '1px solid var(--border2)' }}>
                  <div className="skeleton" style={{ height: 12, width: c === 0 ? 30 : c === 1 ? `${80 + Math.random() * 40}px` : `${50 + Math.random() * 50}px`, borderRadius: 4 }} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
