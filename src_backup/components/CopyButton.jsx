import { useState } from 'react'

export default function CopyButton({ text, children }) {
  const [copied, setCopied] = useState(false)
  function handleCopy(e) {
    e.stopPropagation()
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer' }} onClick={handleCopy}>
      {children}
      <span className="copy-btn" title="Copiază">
        {copied ? '✓' : '⧉'}
      </span>
    </span>
  )
}
