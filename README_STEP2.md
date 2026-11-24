# BloodBond — Step 2: Backend (Node.js + Express + SQL Server)

Simple API. Step 1-er database-er sathe kotha bole. Kono table ekhane banano hoy na — sob kaj Step 1-er Stored Procedure / View / Function diye hoy.

## File gulo ki ki

| File | Kaj |
|---|---|
| `server.js` | Server start kore, route gulo jora dey |
| `config/db.js` | SQL Server-e connect kore (pool) |
| `middleware/auth.js` | Login check (JWT) + role check (Donor / Acceptor / Admin) |
| `routes/auth.js` | Register + Login (bcrypt password hash, JWT token) |
| `routes/donors.js` | Available donors, contact (login lagbe), nijer status |
| `routes/requests.js` | Blood request dewa, pending list, approve, stock theke dewa |
| `routes/stock.js` | Stock dekha + Admin stock update |
| `routes/admin.js` | Dashboard count, pending user, user approve |
| `sql/create_login.sql` | Backend-er jonno SQL login banano (Step 2A) |
| `.env.example` | `.env` file-er nomuna — copy kore `.env` banate hobe |
| `package.json` | Package list + `npm start` command |

## API list (sob URL `http://localhost:5000` theke suru)

| Method | URL | Login? | Kaj |
|---|---|---|---|
| GET | `/api/health` | Na | Server cholche kina check |
| GET | `/api/stock` | Na | Sob blood group-er stock |
| POST | `/api/auth/register` | Na | Donor / Acceptor register (Pending thake) |
| POST | `/api/auth/login` | Na | Login → JWT token dey |
| GET | `/api/donors/available?bloodGroup=A+&division=Dhaka` | Na | Donor list (phone/email NAI — login lagbe) |
| GET | `/api/donors/:id/contact` | Ha | Donor-er phone/email |
| GET | `/api/donors/me` | Donor | Nijer profile + kobe dite parbe |
| PUT | `/api/donors/status` | Donor | Nijer status Yes/No/NotSure |
| POST | `/api/requests` | Acceptor | Blood request dewa |
| GET | `/api/requests/mine` | Acceptor | Nijer request gulo |
| GET | `/api/requests/pending` | Admin | Pending request gulo |
| PUT | `/api/requests/:id/approve` | Admin | Request approve |
| PUT | `/api/requests/:id/fulfil-from-stock` | Admin | Stock theke blood dewa |
| PUT | `/api/stock` | Admin | Stock barano/komano |
| GET | `/api/admin/dashboard` | Admin | Dashboard count |
| GET | `/api/admin/users/pending` | Admin | Approve-er opekkhay thaka user |
| PUT | `/api/admin/users/:id/approve` | Admin | User approve |

## Run korar niyom — ekta ekta kore (Step 2A → 2B → 2C → 2D)

### Step 2A — SQL login banano (SSMS)
1. SSMS kholo (localhost, Windows Authentication).
2. `backend/sql/create_login.sql` kholo.
3. `TomarStrongPassword123` er jaygay TOMAR nijer password bosao (boro okkhor + choto okkhor + number, 8+ okkhor). Password ta nijer khata/note-e likhe rakho — kothao pathaba na.
4. F5 chapo. Asbe: "Commands completed successfully."
5. Amake bolo: **"2A done"**

### Step 2B — Backend folder + package install (VS Code terminal)
1. `Desktop > BloodBond` folder-e `backend` folder-ta rakho (zip theke).
2. VS Code-e `backend` folder kholo. Terminal kholo (Terminal > New Terminal).
3. Chalao: `npm install`
4. Seshe kono laal error na ashle amake bolo: **"2B done"**

### Step 2C — `.env` file banano
1. `backend` folder-e `.env.example` file-ta copy kore notun file banayo, nam: `.env`
2. `.env` file-er vitore `DB_PASSWORD=TomarPassword123` er jaygay Step 2A-er TOMAR password-ta bosao.
3. `JWT_SECRET=...` er jaygay nijer ekta lomba random lekha bosao (example: `amar-secret-2026-bloodbond-xyz`).
4. File save koro. Amake bolo: **"2C done"**
5. Mone rakho: `.env` file kokhono GitHub-e jabe na, kauke pathaba na.

### Step 2D — Server chalano + test
1. Terminal-e chalao: `npm start`
2. Dekhba: `BloodBond API cholche: http://localhost:5000`
3. Browser-e jao: `http://localhost:5000/api/health` → asbe `{"status":"ok",...}`
4. Browser-e jao: `http://localhost:5000/api/stock` → 8 ta blood group-er stock dekhabe.
5. Duitar screenshot / result amake dao, ar bolo: **"2D done"**

## Mone rakhar kotha
- Demo seed user-ra (Rahim, Karim, Nusrat) login korte parbe NA — tader password asol hash na, sudhu `DEMO_HASH_CHANGE_IN_STEP2` lekha. Register diye notun user baniye test koro.
- Register korar por user **Pending** thake. Login hobe na jotokkhon Admin approve na kore. Admin approve korar jonno: Admin user-er token lagbe — eita Step 2D test-er por ami bole dibo, na parle jigges koro.
- Password kokhono plain text-e save hoy na — bcrypt hash save hoy.
- Phone/email public list-e ashe na — sudhu login-er por contact-e ashe (tomar idea onujayi).
