# CLAUDE.md — Portal Gixen B2B

Context complet pentru sesiunile Claude Code. Actualizează secțiunea **TODO / Note** când apar lucruri noi.

---

## Ce este acest proiect

Portal B2B intern pentru Gixen (fabrică de hârtie). Clienții (firme) plasează comenzi, văd prețuri personalizate, urmăresc statusul. Adminii aprobă comenzi, gestionează clienți/produse, sincronizează cu ERP-ul Selectsoft.

**Rulează pe rețea internă** (Windows Server, IP local). Nu e expus public.

---

## Stack tehnic

| Parte | Tehnologie |
|-------|-----------|
| Frontend | React 19 + Vite 8 + React Router 7 |
| Backend | Node.js + Express 4 |
| DB | MS SQL Server (mssql 11) |
| Auth | JWT (jsonwebtoken 9) |
| Email | Nodemailer 6 |
| Grafice | Recharts 3 |
| Process manager | PM2 |

---

## Structură foldere

```
portal-gixen/
├── src/                        # Sursă frontend React
│   ├── pages/                  # Pagini
│   ├── components/             # Componente reutilizabile
│   ├── config/transport.js     # Capacități duba/camion
│   ├── promoEngine.js          # Motor calcul prețuri + promoții
│   ├── StoreContext.jsx         # State global + apeluri API
│   ├── AuthContext.jsx          # Login state
│   ├── api.js                  # Wrapper fetch → backend
│   └── utils.jsx               # lei(), leiCuTva(), statusBadge() etc.
├── public/                     # Assets statice (servite de Vite)
│   └── images/                 # Logo, mockupuri produse
├── portal-api/                 # Backend Node.js
│   ├── server.js               # Entry point Express
│   ├── db.js                   # Connection pool SQL Server
│   ├── emailService.js         # Template-uri HTML email (logo base64 embedded)
│   ├── selectsoftService.js    # Client API Selectsoft
│   ├── middleware/auth.js      # Middleware JWT
│   ├── routes/                 # Rute Express
│   └── dist/                   # Frontend buildat (servit de Express)
├── INSTRUCTIUNI-DEPLOY.txt
└── CLAUDE.md                   # ← ești aici
```

---

## Pagini frontend

### Client
| Rută | Pagină | Note |
|------|--------|------|
| `/dashboard` | Dashboard | KPI-uri, comenzi recente, survey la primul login |
| `/comanda-noua` | ComandaNoua | Coș cu promo engine, credit check, proformă la blocare |
| `/comenzile-mele` | ComenzileMele | Istoric comenzi cu modal detalii |
| `/produse` | Produse | Catalog filtrat per vizibilitate + paletizare_preferata |
| `/rapoarte` | ClientRapoarte | Grafice vânzări proprii |
| `/profil` | Profil | Date firmă, delegați, setări |

### Admin
| Rută | Pagină | Note |
|------|--------|------|
| `/admin/comenzi` | AdminComenzi | Aprobare, status, proformă, push SS |
| `/admin/clienti` | AdminClienti | Aprobare, prețuri, credit, notițe interne |
| `/admin/produse` | AdminProduse | Catalog, vizibilitate, sync SS |
| `/admin/promotii` | AdminPromotii | Reguli promo (cantitate, valoare, mix) |
| `/admin/oferte` | AdminOferte | Oferte speciale per client |
| `/admin/rapoarte` | AdminRapoarte | Rapoarte globale |
| `/admin/survey` | AdminSurvey | CRUD survey-uri onboarding |
| `/admin/comisioane` | AdminComisioane | Agenți și reguli comision |
| `/admin/locatii` | AdminLocatii | Locații livrare |
| `/admin/uom` | AdminUoM | Unități de măsură + coeficienți |
| `/admin/retetar` | AdminRetetar | Rețetar produse compuse |

---

## Baza de date (SQL Server)

Tabelele principale. Schema se auto-crează/extinde la pornire.

| Tabel | Rol |
|-------|-----|
| `users` | Conturi (client/admin), `customer_id`, `first_login_done` |
| `customers` | Firme: pricing, credit, agent, `vizibilitate_produse`, `paletizare_preferata`, `survey_completed` |
| `products` | Catalog: `vizibilitate` (public/privat), `private_brand_firm_id` |
| `product_uom` | UoM per produs cu coeficienți (role→palet_duba→palet_camion) |
| `product_prices` | Prețuri active per produs |
| `orders` | Comenzi: `net_total`, `tva_total`, `gross_total`, `proforma_nr_intern`, `ss_nr_intern`, `payment_status` |
| `order_lines` | Linii comandă: `line_total` (net), `line_total_with_tva` (gross) |
| `promotions` | Definiții promoții |
| `promotion_rules` | Condiții + acțiuni promoții |
| `agents` | Agenți vânzări |
| `credit_limits` | Limite credit per client |
| `email_log` | Tracking emailuri trimise (dedup `onboarding_approved` etc.) |
| `surveys` / `survey_results` | Survey onboarding |
| `exchange_rates` | Curs EUR/RON (sync BNR zilnic 00:05 Romania) |

**Coloane adăugate dinamic** (IF NOT EXISTS la pornire):
- `orders`: `proforma_nr_intern`, `payment_status`, `payment_confirmed_at`, `ss_nr_intern`, `discount_lines_json`

---

## Logica de prețuri

```
pretClient (per rolă, net fără TVA)
  = base_price
  + comision agent (%)
  - discount clientPricing (dacă există)

pretAfisatPerUm = pretClient × coeficient_uom
totalBrutLinie  = pretClient × cantitate_role
totalNet        = totalBrut + sum(discountLinii)   ← negativ pentru discounturi
tvaTotal        = totalNet × 0.21
grossTotal      = totalNet + tvaTotal
```

**Important:** `order.total` = `gross_total` (CU TVA). `order.netTotal` = net fără TVA.
În display folosim `lei(order.total)` — NU `leiCuTva(order.total)`.

---

## Vizibilitate produse

| `customers.vizibilitate_produse` | Ce vede clientul |
|----------------------------------|------------------|
| `gixen_si_proprii` | Produse publice Gixen + produsele proprii ale firmei |
| `doar_proprii` | Doar produsele proprii (private brand) |

Produsele au `vizibilitate = 'public'` sau `'privat'` și `private_brand_firm_id` = id-ul firmei proprietare.

---

## Transport

Fișier: `src/config/transport.js`

- **Duba (Van)**: ≤ 8 paleți duba
- **Camion (Truck)**: > 8 paleți duba SAU orice linie cu `PALET_CAMION`
- Calculul se face pe `cantitate_role / coeficient_palet_duba` per linie

---

## Integrare Selectsoft

API local pe `http://localhost:6081`, POST pe toate endpoint-urile, token în header.

| Funcție | Endpoint SS | Când se apelează |
|---------|-------------|------------------|
| `insertComanda` | `/insertcom` | La plasare comandă (dacă `SELECTSOFT_PUSH_ORDERS=true`) sau după confirmare plată proformă |
| `getRestante` | `/restdoc` | La verificare plată proformă (filtrare `lst_nr_intern`) |
| `getProduse` | `/produse` | Sync manual produse |
| `getParteneri` | `/parteneri` | Verificare/creare partener |
| `getDocumente` | `/documente` | Istoric facturi |

**Status plată:** `suma_incasari >= suma_cu_tva` → plătit (NU câmpul `restant` care nu există în răspuns real).

**⚠️ BLOCKER activ:** `insertcom` returnează *"Documentul de tip CON nu este definit în sistem"*. Trebuie contactat SelectSoft (+40 374 490 844) să schimbe tipul documentului din CON → CMC pe configurația serverului lor.

---

## Email

Logo embedded ca base64 SVG alb în `emailService.js` — funcționează fără URL extern (rețea internă).

Tipuri de emailuri cu dedup (tabel `email_log`):
- `onboarding_pending` — la înregistrare
- `onboarding_approved` — la prima activare cont (doar la tranziție → activ, o singură dată)
- `onboarding_rejected` — la respingere
- `order_placed` — la plasare comandă
- `order_status_changed` — la schimbare status

---

## Job-uri background (server.js)

```js
// Curs valutar — zilnic la 00:05 ora României
scheduleMidnightRefresh()

// Verificare plăți proformate Selectsoft — la fiecare 15 min
setTimeout(() => {
  monitorPendingPayments()
  setInterval(monitorPendingPayments, 15 * 60 * 1000)
}, 60 * 1000)
```

---

## Variabile de mediu (.env)

```env
PORT=80
NODE_ENV=production
APP_URL=https://portal.gixen.ro      # sau IP local

DB_SERVER=localhost
DB_DATABASE=GixenPortal
DB_USER=sa
DB_PASSWORD=
DB_INSTANCE=SQLEXPRESS01
DB_ENCRYPT=false
DB_TRUST_CERT=true

JWT_SECRET=
JWT_EXPIRES_IN=24h

SMTP_HOST=mail.gixen.ro
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=
SMTP_PASS=
SMTP_FROM=

BNR_MARGIN_PCT=0.5                   # Marjă % peste cursul BNR

SELECTSOFT_URL=http://localhost:6081
SELECTSOFT_TOKEN=
SELECTSOFT_PUSH_ORDERS=false         # true = trimite automat comenzile în SS
```

---

## Deploy (Windows Server)

1. Pe dev: `npm run build` în root → generează `dist/`
2. Copiază `dist/*` în `portal-api/dist/`
3. Creează ZIP cu `portal-api/` (fără `node_modules/`)
4. Pe server: dezarhivează peste folderul existent
5. `cd portal-api && npm install` (doar dacă s-au schimbat dependențele)
6. Restart: `pm2 restart portal` sau `node server.js`
7. Browser: CTRL+F5 pentru cache bust

---

## TODO / Note
> Adaugă aici ce mai e de făcut sau de știut

- [ ] **Selectsoft CON→CMC**: Contactat suport SS (+40 374 490 844) să schimbe tipul documentului `insertcom` din CON în CMC pe serverul lor
- [ ] Confirmat capacități reale duba/camion (momentan: duba=8 paleți, camion=33 paleți) — de actualizat în `src/config/transport.js`
- [ ] Opțional: afișare log emailuri în UI AdminClienti (endpoint există: `GET /api/customers/:id/emails`)
