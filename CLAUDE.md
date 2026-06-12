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
│   │   ├── StatusTracker.jsx   # Tracker status comandă
│   │   ├── CopyButton.jsx      # Buton copy-to-clipboard
│   │   ├── TransportDocs.jsx   # Documente transport
│   │   ├── EmptyState.jsx      # Stări goale
│   │   ├── GlobalSearch.jsx    # Căutare globală
│   │   ├── SurveyPopup.jsx     # Survey popup la login
│   │   └── PromoBannerPopup.jsx# Bannere promo la login (F4)
│   ├── config/transport.js     # Capacități duba/camion
│   ├── promoEngine.js          # Motor calcul prețuri + promoții
│   ├── StoreContext.jsx        # State global + apeluri API
│   ├── AuthContext.jsx         # Login state
│   ├── api.js                  # Wrapper fetch → backend
│   └── utils.jsx               # lei(), leiCuTva(), eur(), statusBadge() etc.
├── public/                     # Assets statice (servite de Vite)
│   └── images/                 # Logo, mockupuri produse
├── portal-api/                 # Backend Node.js
│   ├── server.js               # Entry point Express + auto-migrations la pornire
│   ├── db.js                   # Connection pool SQL Server
│   ├── emailService.js         # Template-uri HTML email (logo base64 SVG embedded)
│   ├── selectsoftService.js    # Client API Selectsoft
│   ├── middleware/auth.js      # Middleware JWT
│   ├── routes/                 # Rute Express
│   │   ├── banners.js          # CRUD bannere promo (F4)
│   │   └── ...
│   └── dist/                   # Frontend buildat (servit de Express)
├── INSTRUCTIUNI-DEPLOY.txt
└── CLAUDE.md                   # ← ești aici
```

---

## Pagini frontend

### Client
| Rută | Pagină | Note |
|------|--------|------|
| `/dashboard` | Dashboard | KPI-uri, comenzi recente, survey la primul login, bannere promo |
| `/comanda-noua` | ComandaNoua | Coș cu promo engine, credit check, proformă la blocare, reorder |
| `/comenzile-mele` | ComenzileMele | Istoric comenzi cu modal detalii |
| `/produse` | Produse | Preț/rolă, promoții active informative, specs tehnice, PDF datasheet |
| `/favorite` | Favorite | Produse favorite (persistent în localStorage) |
| `/rapoarte` | ClientRapoarte | Grafice vânzări proprii |
| `/profil` | Profil | Date firmă, delegați, newsletter opt-in, locații livrare |

### Admin
| Rută | Pagină | Note |
|------|--------|------|
| `/admin/comenzi` | AdminComenzi | Aprobare, status, proformă, push SS |
| `/admin/clienti` | AdminClienti | Aprobare, prețuri, credit, notițe interne, newsletter icon |
| `/admin/produse` | AdminProduse | Catalog, vizibilitate, sync SS, specs tehnice, PDF upload |
| `/admin/promotii` | AdminPromotii | Reguli promo (cantitate, valoare, mix) |
| `/admin/oferte` | AdminOferte | Oferte speciale per client (PDF save/view/edit) |
| `/admin/rapoarte` | AdminRapoarte | Rapoarte globale |
| `/admin/survey` | AdminSurvey | CRUD survey-uri (tipuri: prima_logare, la_cerere, mereu) |
| `/admin/comisioane` | AdminComisioane | Agenți și reguli comision |
| `/admin/locatii` | AdminLocatii | Locații livrare globale |
| `/admin/uom` | AdminUoM | Unități de măsură + coeficienți |
| `/admin/bannere` | AdminBannere | Bannere promo la login (F4) — upload imagine, multi-select grupuri |
| ~~`/admin/retetar`~~ | ~~AdminRetetar~~ | **Eliminat din navigație** (pagina există în cod, ruta scoasă) |

---

## Baza de date (SQL Server)

Tabelele principale. Schema se auto-crează/extinde la pornire (`server.js` → `runMigrations()`).

| Tabel | Rol |
|-------|-----|
| `users` | Conturi (client/admin), `customer_id`, `first_login_done` |
| `customers` | Firme: pricing, credit, agent, `vizibilitate_produse`, `paletizare_preferata`, `newsletter_opt_in` |
| `products` | Catalog: `vizibilitate` (public/privat), `private_brand_firm_id`, `specs_json`, `datasheet_url` |
| `product_uom` | UoM per produs cu coeficienți (role→palet_duba→palet_camion) |
| `product_prices` | Prețuri active per produs |
| `orders` | Comenzi: `net_total`, `tva_total`, `gross_total`, `proforma_nr_intern`, `ss_nr_intern`, `payment_status` |
| `order_lines` | Linii comandă: `line_total` (net), `line_total_with_tva` (gross) |
| `promotions` | Definiții promoții (câmpuri cheie: `eticheta`, `combinabil`/`cumulative`) |
| `promotion_rules` | Condiții + acțiuni promoții |
| `agents` | Agenți vânzări |
| `credit_limits` | Limite credit per client |
| `email_log` | Tracking emailuri trimise (dedup `onboarding_approved` etc.) |
| `surveys` / `survey_results` | Survey onboarding |
| `exchange_rates` | Curs EUR/RON (sync BNR zilnic 00:05 Romania) |
| `promo_banners` | Bannere promo la login (F4) |

**Coloane adăugate dinamic** (IF NOT EXISTS la pornire în `runMigrations()`):
- `orders`: `proforma_nr_intern`, `payment_status`, `payment_confirmed_at`, `ss_nr_intern`, `discount_lines_json`
- `customers`: `newsletter_opt_in` (BIT DEFAULT 0)
- `products`: `specs_json` (NVARCHAR MAX), `datasheet_url` (NVARCHAR 500)

---

## Logica de prețuri

```
pretClient (per rolă, net fără TVA)
  = base_price
  + comision agent (%)
  - discount clientPricing (dacă există)

pretAfisatPerUm = pretClient × coeficient_uom   ← DOAR la coș/comandă
totalBrutLinie  = pretClient × cantitate_role
totalNet        = totalBrut + sum(discountLinii)   ← negativ pentru discounturi
tvaTotal        = totalNet × 0.21
grossTotal      = totalNet + tvaTotal
```

**IMPORTANT:**
- `order.total` = `gross_total` (CU TVA). Afișat cu `lei(order.total)` — NU `leiCuTva(order.total)`.
- `order.netTotal` = net fără TVA → folosit în summary box.
- `line.total` = `line_total` (NET per linie) → `cuTva(l.total)` pentru afișaj gross.
- Pe pagina **Produse & prețuri**: afișăm DOAR prețul per ROLĂ, fără UoM. UoM-ul se aplică DOAR la coș.
- Clienți cu `currency = 'EUR'`: prețurile se convertesc cu `db.exchange.applied_rate`.

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

## Favorite

Stocate în **localStorage** cu cheia `gixen_favorites_{userId}`. Salvate la fiecare toggle în StoreContext, încărcate la init. Nu necesită backend/DB.

---

## Integrare Selectsoft

API local pe `http://localhost:6081`, POST pe toate endpoint-urile, token în header.

| Funcție | Endpoint SS | Când se apelează |
|---------|-------------|------------------|
| `insertComanda` | `/insertcom` | La plasare comandă (dacă `SELECTSOFT_PUSH_ORDERS=true`) sau după confirmare plată proformă |
| `getRestante` | `/restdoc` | La verificare plată proformă (filtrare `lst_nr_intern`) |
| `getProduse` | `/produse` | Sync manual produse — ia `MAX(pret_van)` per `cod` |
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
2. `rm -rf portal-api/dist && cp -r dist/* portal-api/dist/`
3. Creează ZIP: `zip -rq deploy.zip portal-api/routes/ portal-api/middleware/ portal-api/server.js portal-api/db.js portal-api/emailService.js portal-api/selectsoftService.js portal-api/package.json portal-api/dist/ -x "portal-api/dist/images/*"`
4. Pe server: dezarhivează peste folderul existent
5. `cd portal-api && npm install` (doar dacă s-au schimbat dependențele — `package.json` diferit)
6. Restart: `pm2 restart portal` sau `node server.js`
7. Browser: CTRL+F5 pentru cache bust

---

## TODO / Note
> Adaugă aici ce mai e de știut sau de făcut

### BLOCKER
- [ ] **Selectsoft CON→CMC**: Contactat suport SS (+40 374 490 844) să schimbe tipul documentului `insertcom` din CON în CMC

### În lucru / de implementat
- [ ] **PDF datasheet upload** — upload direct pe card admin produs, nu URL
- [ ] **Bannere upload imagine** — upload direct în loc de URL
- [ ] **Favorite cu tabelă DB** — momentan în localStorage; dacă se cere persistență cross-device, adăugăm tabelă `favorites`
- [ ] **Locații livrare multiple per client** — clientul să poată adăuga/gestiona mai multe adrese în Profil și să le selecteze la comandă
- [ ] **EUR complet** — clienți cu `currency=EUR` să vadă prețurile în EUR pretutindeni (cards, coș, comenzi)
- [ ] **Oferte emise PDF** — save/view/edit PDF complet
- [ ] **Survey reminder funcțional** — butonul trimite email real (nu toast fake)
- [ ] **Gestiuni** — tabela `gestiuni` cu tip 'depozit', extensibilă (nu mai e ridicata/amănunt)
- [ ] **HTTPS** — migrare la HTTPS; opțiuni: Nginx reverse-proxy cu cert Let's Encrypt sau cert self-signed pe rețea internă
- [ ] **Curs valutar ora corectă** — `SYSDATETIME()` returnează ora serverului; dacă serverul e în altă TZ față de așteptări, soluție: `AT TIME ZONE 'UTC'` în query sau formatare ISO în response
- [ ] **Reorder funcțional** — precompletează coșul cu produsele din comanda selectată

### Confirmat OK
- [x] Proformare plată: folosim `suma_incasari >= suma_cu_tva` din `/restdoc` (nu câmpul `restant`)
- [x] Logo email: base64 SVG embedded în emailService.js (funcționează fără URL extern)
- [x] Survey popup: folosim `user.needsSurvey` (din login response), nu `user.survey_completed`
- [x] Email aprobare: trimis o singură dată (dedup pe `prev_status !== 'activ'`)
- [x] TVA afișaj: `order.total` = gross → afișăm cu `lei()`, nu `leiCuTva()`
- [x] SS sync: `MAX(pret_van)` per cod produs
- [x] Rețetar: eliminat din navigație (pagina AdminRetetar.jsx rămâne în cod)
- [x] Newsletter opt-in: câmp `newsletter_opt_in` pe `customers`, vizibil în Profil (client) și AdminClienti (admin)
- [x] Specs tehnice: câmpuri `specs_json` + `datasheet_url` pe `products`
- [x] Bannere promo: tabelă `promo_banners`, pagină AdminBannere, popup la login (doar clienți)
- [x] Promoții afișaj: filtrate per produs + firma, afișate informativ (fără calcul) în modalul produsului
