# PrintReady AI — Version 1

Customers upload artwork. The platform analyses it, scores it against real vendor print specifications, automatically resizes and converts it with Sharp, and generates a print-ready PDF with bleed and crop marks. Printers log in to a dashboard to review, approve, or reject incoming jobs.

This is **Version 1** — a complete, working MVP. See [Roadmap](#roadmap--version-2) for what's planned next.

---

## What's included in V1

- **Customer upload** — guests can upload freely; logging in saves job history
- **Vendor + Product templates** — Printify, Sticker Mule, Redbubble, Vistaprint, ID Photo Services
- **Real image analysis** — effective DPI (pixels ÷ physical print size), sharpness/blur detection via edge-variance, aspect ratio matching
- **PrintReady Score** — 9 rule-based checks: dimensions, DPI, aspect ratio, sharpness, background/transparency, safe margins, bleed, colour mode, file format
- **Print-ready PDF generation** — correct page size, bleed area, crop marks, embedded DPI metadata
- **Azure Blob Storage** — original, processed image, and PDF all stored securely; served via time-limited SAS URLs
- **Authentication** — JWT-based register/login, `customer` and `printer` roles
- **Printer Dashboard** — shop-scoped job queue, status filtering, mark Completed/Rejected with reason
- **Multi-tenant foundation** — `shop_id` on every job and printer account, ready for multiple print shops later (currently one default shop)
- **Docker** — both frontend and backend containerised, `docker-compose` for local full-stack testing

---

## Tech stack

| Layer            | Technology                  |
| ---------------- | --------------------------- |
| Frontend         | React (Vite) + Tailwind CSS |
| Backend          | Node.js + Express           |
| Image processing | Sharp                       |
| PDF generation   | pdf-lib                     |
| Database         | PostgreSQL (local for V1)   |
| File storage     | Azure Blob Storage          |
| Auth             | JWT + bcryptjs              |
| Logging          | Winston + Morgan            |
| Containers       | Docker + Docker Compose     |

---

## Project structure

```
printready/
├── backend/
│   ├── config/
│   │   ├── db.js              # PostgreSQL pool + table creation + shop seeding
│   │   └── azure.js           # Azure Blob Storage upload + SAS URL generation
│   ├── controllers/
│   │   ├── authController.js  # register, login, shop_id assignment
│   │   └── jobController.js   # upload pipeline, history, printer dashboard
│   ├── middleware/
│   │   ├── auth.js            # JWT verification, protect/optionalAuth/restrictTo
│   │   ├── upload.js          # Multer config
│   │   └── errorHandler.js    # Global error handler + asyncHandler
│   ├── routes/
│   │   ├── auth.js
│   │   ├── jobs.js
│   │   └── printer.js
│   ├── services/
│   │   ├── imageService.js    # analyseImage, scoreImage, processImage
│   │   ├── pdfService.js      # generatePdf with bleed + crop marks
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
│   │   ├── api.js             # shared axios instance
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
└── README.md
```

---

## Local setup (without Docker)

**Prerequisites:** Node.js 18+, PostgreSQL installed locally

```bash
git clone https://github.com/yourname/printready.git
cd printready

# Backend
cd backend
npm install
cp .env.example .env
# Fill in DATABASE_URL, JWT_SECRET, Azure credentials in .env
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
# (DATABASE_URL is overridden automatically by docker-compose)

docker-compose up --build
```

Frontend: `http://localhost:3000`
Backend: `http://localhost:5000`

---

## Environment variables

### `backend/.env`

| Variable                          | Description                                                                                                      |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `PORT`                            | Backend port (default 5000)                                                                                      |
| `NODE_ENV`                        | `development` or `production`                                                                                    |
| `DATABASE_URL`                    | PostgreSQL connection string                                                                                     |
| `JWT_SECRET`                      | Random 64-char string — generate with `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `JWT_EXPIRES_IN`                  | Token lifetime (e.g. `7d`)                                                                                       |
| `AZURE_STORAGE_CONNECTION_STRING` | From Azure Portal → Storage Account → Access Keys                                                                |
| `AZURE_CONTAINER_NAME`            | Your blob container name                                                                                         |
| `CLIENT_URL`                      | Frontend URL (for CORS)                                                                                          |

### `frontend/.env`

| Variable       | Description                                                                                         |
| -------------- | --------------------------------------------------------------------------------------------------- |
| `VITE_API_URL` | Backend URL. Leave empty for local dev (uses Vite proxy); set to deployed backend URL in production |

---

## API reference

| Method | Endpoint                         | Auth         | Description                     |
| ------ | -------------------------------- | ------------ | ------------------------------- |
| POST   | `/api/auth/register`             | No           | Create account                  |
| POST   | `/api/auth/login`                | No           | Login, get JWT                  |
| GET    | `/api/auth/me`                   | Yes          | Get current user                |
| GET    | `/api/jobs/vendors`              | No           | List vendors                    |
| GET    | `/api/jobs/vendors/:id/products` | No           | Products for a vendor           |
| POST   | `/api/jobs/upload`               | Optional     | Upload + process a single file  |
| GET    | `/api/jobs/history`              | Yes          | Job history for logged-in user  |
| GET    | `/api/jobs/:id`                  | Yes          | Single job detail               |
| GET    | `/api/printer/jobs`              | Printer only | All jobs for the printer's shop |
| PATCH  | `/api/printer/jobs/:id/status`   | Printer only | Mark Completed/Rejected         |
| GET    | `/health`                        | No           | Health check                    |

---

## Deployment

**Frontend → Vercel**

- Root directory: `frontend`
- Build command: `npm run build`
- Env var: `VITE_API_URL` = your deployed backend URL

**Backend → Render**

- Root directory: `backend`
- Build command: `npm install`
- Start command: `node server.js`
- Add all `.env` variables in Render's Environment tab

**Database → local PostgreSQL for V1.** Neon migration is planned for V2.

---

## Roadmap — Version 2

- Migrate to Neon (cloud PostgreSQL)
- Batch processing — up to 20 images at once
- AI-assisted upscaling for low-resolution uploads
- Admin stats panel (total users, jobs, completed, rejected)
- pg-boss job queue for async processing at scale
- Claude Vision AI — selective enhanced review for borderline scores (55–84 range)
- Face-centering for ID/passport photo templates
- Updated Docker setup for the V2 stack

---

## Security notes

- `.env` files are never committed — see `.gitignore`
- Passwords hashed with bcrypt (12 rounds)
- JWT tokens expire after 7 days
- Azure files are private; access only via time-limited (60 min) SAS URLs
- Printers only see jobs belonging to their own shop (`shop_id` scoping)
