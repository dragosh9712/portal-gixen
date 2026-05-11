# portal.gixen.ro — Prototip local

## Pornire rapidă

```bash
npm install
npm run dev
```

Aplicația rulează la `http://localhost:5173`

---

## Conturi demo

| Rol | User / Email | Parolă |
|-----|-------------|--------|
| Admin (test) | `test.admin` | `test.admin` |
| Client (test) | `test.client` | `test.client` |
| Admin | `admin@gixen.ro` | `admin123` |
| Client Papirus | `contact@papirus.ro` | `client123` |
| Client CleanPro | `achizitii@cleanpro.ro` | `client123` |
| Cont în aprobare | `nou@firma.ro` | `client123` |

---

## Structură proiect

```
src/
├── db.json              ← Toată baza de date mock (editabil direct)
├── AuthContext.jsx      ← Login / logout / sesiune
├── StoreContext.jsx     ← Operații CRUD în memorie peste db.json
├── utils.jsx            ← Helpers: formatare, calcul prețuri, badge-uri
├── Layout.jsx           ← Shell comun: sidebar + topbar
├── App.jsx              ← Router + guards pe roluri
├── index.css            ← Stiluri globale
└── pages/
    ├── Login.jsx
    ├── Onboarding.jsx
    ├── Dashboard.jsx
    ├── ComandaNoua.jsx
    ├── ComenzileMele.jsx
    ├── Produse.jsx
    ├── Profil.jsx
    ├── AdminDashboard.jsx
    ├── AdminComenzi.jsx
    ├── AdminClienti.jsx
    ├── AdminProduse.jsx
    └── AdminPromotii.jsx
```

---

## Cum adaugi produse cu imagini

Pune imaginea în `public/images/` și în `db.json` setează:

```json
{ "imagine": "/images/hartie-premium.jpg" }
```

Câmpul e deja pregătit în fiecare produs — îl activăm împreună când trimiți imaginile.

---

## Cum funcționează prețurile

Logica e în `src/utils.jsx` → `calcLinePrice()`:

1. **Tier pricing** — preț/unitate scade automat la cantități mai mari
2. **Discount per produs/client** — setat din Admin → Clienți → Prețuri
3. **Promoție activă** — globală sau per client, interval de date
4. **Discount global firmă** — procent aplicat pe toată comanda

---

## Note

- Date în memorie — refresh resetează la `db.json` original (normal pentru prototip)
- Pentru producție: `StoreContext.jsx` se înlocuiește cu apeluri REST
