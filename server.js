import express from 'express'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3000

// Servește fișierele statice din dist/
app.use(express.static(join(__dirname, 'dist')))

// SPA fallback — toate rutele returnează index.html
// (necesar pentru React Router cu BrowserRouter)
app.get('*', (_req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'))
})

app.listen(PORT, () => {
  console.log(`Portal Gixen pornit pe http://localhost:${PORT}`)
})
