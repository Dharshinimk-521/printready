# PrintReady AI — v1.0.0

Customers upload artwork. The platform analyses it, scores it against real vendor print specifications, automatically resizes and converts it with Sharp, and generates a print-ready PDF with bleed and crop marks. Printers log in to a shop-scoped dashboard to review, approve, or reject incoming jobs.

**Live deployment:** Frontend on Vercel · Backend on Render · Database on Neon · File storage on Azure Blob Storage

---

## Target users

- **Print shops** — small to medium independent shops currently juggling WhatsApp, email, and Drive links from customers, doing manual Photoshop fixes before printing
- **Their customers** — people ordering custom prints (T-shirts, stickers, business cards, posters) who want confidence their file will print correctly before paying

---

## What's included in v1.0.0

- **Customer upload** — guests upload freely with no account required; logging in saves job history
- **Vendor + Product templates** — 5 vendors, 17 product specs: Printify (T-Shirt, Mug, Poster, Phone Case), Sticker Mule (Die-Cut Sticker, Sheet Sticker, Label), Redbubble (Poster, T-Shirt, Sticker), Vistaprint (Business Card, Flyer, Banner), ID Photo Services (India/US Passport)
- **Real image analysis**:
  - Effective DPI — calculated from pixel dimensions ÷ physical print size, not guessed from file size
  - Sharpness/blur detection — edge-variance analysis via Sharp convolution
  - Aspect ratio matching against the selected template
- **PrintReady Score** — 9 rule-based checks: dimensions, effective DPI, aspect ratio, sharpness, background/transparency, safe margins, bleed area, colour mode, file format — each returns pass/warn/fail with a specific, actionable detail
- **Print-ready PDF generation** — correct physical page size, bleed area, crop marks, embedded DPI metadata, image centred (not stretched) regardless of `fitMode`
- **Smart fit modes** — `cover` (fills frame, crops as needed — T-shirts, mugs, business cards) vs `inside` (fits within frame, no cropping — posters, large art prints), chosen per product
- **Azure Blob Storage** — original, processed image, and PDF all stored privately; served via 60-minute SAS URLs; automatic 7-day lifecycle deletion configured at the storage account level
- **Authentication** — JWT-based register/login, `customer` and `printer` roles, bcrypt password hashing (12 rounds)
- **Multi-tenant foundation** — every printer account and job is scoped to a `shop_id`; one default shop active now, architecture ready for onboarding additional print shops without a schema rewrite
- **Printer Dashboard** — shop-scoped job queue, status filtering (queued/processing/completed/rejected), mark Completed or Rejected with a reason visible to the customer afterward
- **Security hardening**:
  - Rate limiting on every route group — general (100/15min), auth (5/15min), uploads (20/15min), printer actions (60/15min)
  - Input validation and sanitisation on auth endpoints via `express-validator`
  - Payload size limits (2MB JSON, 50MB file uploads)
  - 0 known moderate/high vulnerabilities (`npm audit`) — see [Known Issues](#known-issues)
- **Docker** — multi-stage Dockerfiles for both frontend (Nginx-served static build) and backend, `docker-compose.yml` for full-stack local testing
- **Cloud database** — migrated from local PostgreSQL to Neon for production

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React (Vite) + Tailwind CSS |
| Backend | Node.js + Express |
| Image processing | Sharp |
| PDF generation | pdf-lib |
| Database | PostgreSQL via Neon |
| File storage | Azure Blob Storage |
| Auth | JWT + bcryptjs |
| Validation | express-validator |
| Rate limiting | express-rate-limit |
| Logging | Winston + Morgan |
| Containers | Docker + Docker Compose |
| Deployment | Vercel (frontend) · Render (backend) |

---

## Project structure

```
printready/
├── backend/
│   ├── config/
│   │   ├── db.js              # PostgreSQL pool, table creation, shop seeding
│   │   └── azure.js           # Azure Blob upload + SAS URL generation
│   ├── controllers/
│   │   ├── authController.js  # register, login, shop_id assignment
│   │   └── jobController.js   # upload pipeline, history, printer dashboard
│   ├── middleware/
│   │   ├── auth.js            # JWT verification: protect, optionalAuth, restrictTo
│   │   ├── upload.js          # Multer config
│   │   └── errorHandler.js    # Global error handler + asyncHandler
│   ├── routes/
│   │   ├── auth.js            # rate-limited + validated
│   │   ├── jobs.js            # rate-limited uploads
│   │   └── printer.js         # rate-limited, role-restricted
│   ├── services/
│   │   ├── imageService.js    # analyseImage, scoreImage, processImage
│   │   ├── pdfService.js      # generatePdf - bleed, crop marks, centred drawing
│   │   └── vendorTemplates.js # all vendor/product specs
│   ├── utils/
│   │   └── logger.js
│   ├── Dockerfile
│   ├── server.js
│   ├── package.json
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AuthModal.jsx
│   │   │   ├── DropZone.jsx
│   │   │   ├── TemplateSelector.jsx
│   │   │   └── ResultCard.jsx
│   │   ├── pages/
│   │   │   ├── LandingPage.jsx
│   │   │   ├── UploadPage.jsx
│   │   │   ├── HistoryPage.jsx
│   │   │   └── PrinterDashboard.jsx
│   │   ├── hooks/
│   │   │   ├── useAuth.js
│   │   │   └── useUpload.js
│   │   ├── api.js              # shared axios instance, env-aware base URL
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── vite.config.js
│   └── package.json
│
├── docker-compose.yml
├── .gitignore
├── LICENSE                      # MIT
└── README.md
```

---

## Local setup (without Docker)

**Prerequisites:** Node.js 18+, PostgreSQL installed locally (optional - Neon works too)

```bash
git clone https://github.com/Dharshinimk-521/printready.git
cd printready

# Backend
cd backend
npm install
cp .env.example .env
# Fill in DATABASE_URL (local or Neon), JWT_SECRET, Azure credentials
npm run dev

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

Backend: `http://localhost:5000`
Frontend: `http://localhost:5173`

---

## Local setup (with Docker)

```bash
cp backend/.env.example backend/.env
# Fill in JWT_SECRET and Azure credentials
# DATABASE_URL is overridden automatically to point at the local db container

docker-compose up --build
```

Frontend: `http://localhost:3000`
Backend: `http://localhost:5000`

> Note: `config/db.js` detects whether `DATABASE_URL` points to Neon (`.includes("neon.tech")`) to decide whether to enable SSL - this allows the same codebase to work against local Docker Postgres (no SSL) and Neon (SSL required) without any manual switching.

---

## Environment variables

### `backend/.env`

| Variable | Description |
|---|---|
| `PORT` | Backend port (default 5000) |
| `NODE_ENV` | `development` or `production` |
| `DATABASE_URL` | PostgreSQL connection string (Neon in production) |
| `JWT_SECRET` | Random 64-char string - generate with `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `JWT_EXPIRES_IN` | Token lifetime (e.g. `7d`) |
| `AZURE_STORAGE_CONNECTION_STRING` | From Azure Portal -> Storage Account -> Access Keys |
| `AZURE_CONTAINER_NAME` | Your blob container name |
| `CLIENT_URL` | Deployed frontend URL (for CORS) |

### `frontend/.env`

| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend URL. Empty for local dev (uses Vite proxy); set to deployed backend URL for production builds |

---

## API reference

| Method | Endpoint | Auth | Rate limit | Description |
|---|---|---|---|---|
| POST | `/api/auth/register` | No | 5/15min | Create account |
| POST | `/api/auth/login` | No | 5/15min | Login, get JWT |
| GET | `/api/auth/me` | Yes | General | Get current user |
| GET | `/api/jobs/vendors` | No | General | List vendors |
| GET | `/api/jobs/vendors/:id/products` | No | General | Products for a vendor |
| POST | `/api/jobs/upload` | Optional | 20/15min | Upload + process a single file |
| GET | `/api/jobs/history` | Yes | General | Job history for logged-in user |
| GET | `/api/jobs/:id` | Yes | General | Single job detail |
| GET | `/api/printer/jobs` | Printer only | 60/15min | All jobs for the printer's shop |
| PATCH | `/api/printer/jobs/:id/status` | Printer only | 60/15min | Mark Completed/Rejected |
| GET | `/health` | No | - | Health check |

---

## Security

- Passwords hashed with bcrypt (12 rounds), never stored or logged in plain text
- JWT tokens expire after 7 days; same generic error message for wrong email/password (no account enumeration)
- Azure files are private; access only via 60-minute SAS URLs; 7-day automatic deletion via Azure Lifecycle Management
- Printers can only see and act on jobs belonging to their own shop (`shop_id` scoping, enforced server-side regardless of frontend behaviour)
- Rate limiting on every route group, with stricter limits on auth (brute-force protection) and uploads (cost protection)
- Input validation/sanitisation via `express-validator` on all auth inputs
- `.env` files never committed - verified via `.gitignore`
- `npm audit`: 0 moderate/high vulnerabilities on both frontend and backend

## Known Issues

- 1 low-severity vulnerability in esbuild's dev server (`npm audit`), specific to Windows and only affects `npm run dev` - does not impact the production build or deployed site. Will be resolved once `@vitejs/plugin-react` releases compatibility with a patched esbuild/Vite version.

---

## Deployment

**Frontend -> Vercel**
- Root directory: `frontend`
- Build command: `npm run build`
- Output directory: `dist`
- Env var: `VITE_API_URL` = deployed backend URL

**Backend -> Render**
- Root directory: `backend`
- Build command: `npm install`
- Start command: `node server.js`
- All `.env` variables added in Render's Environment tab

**Database -> Neon** (cloud PostgreSQL, SSL auto-detected by connection string)

**Storage -> Azure Blob Storage** with Lifecycle Management rule deleting blobs after 7 days

---

## Roadmap - Version 2

**Print production features**
- Customer approval workflow - preview processed PDF before the printer proceeds
- Bulk upload - ZIP in, ZIP out, up to 20 files at once
- Print cost estimation per product/material
- Order intake portal framing (positioning the upload flow as a full WhatsApp/email replacement)

**Platform & scale**
- Admin stats panel (total users, jobs, completed, rejected)
- pg-boss job queue for async processing at higher volume
- AI-assisted upscaling for low-resolution uploads
- Claude Vision AI - selective enhanced review for borderline scores (55-84 range)
- Face-centering for ID/passport photo templates

**Business**
- Shop directory (name, contact, services, address) shown to customers post-processing
- Map integration (Mapbox) via a lightweight proxy backend to keep API keys server-side
- Stripe-based subscription billing for print shops (B2B); end customers remain free to upload
- Pricing model finalised after V2 feature costs are measured in production

---

## License

MIT - see [LICENSE](./LICENSE)