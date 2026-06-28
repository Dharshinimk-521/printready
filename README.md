# PrintReady AI — v1.0.0

Customers upload artwork. The platform analyses it, scores it against real vendor print specifications, automatically resizes and converts it with Sharp, and generates a print-ready PDF with bleed and crop marks. Printers log in to a shop-scoped dashboard to review, approve, or reject incoming jobs.

**Live deployment:** Frontend on Vercel · Backend on Render · Database on Neon · File storage on Azure Blob Storage

> Setup instructions, environment variables, and local installation steps live in [SETUP.md](./SETUP.md).

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
- **Print-ready PDF generation** — correct physical page size, bleed area, crop marks, embedded DPI metadata, image centred (not stretched) regardless of fit mode
- **Smart fit modes** — `cover` (fills frame, crops as needed — T-shirts, mugs, business cards) vs `inside` (fits within frame, no cropping — posters, large art prints), chosen per product
- **Azure Blob Storage** — original, processed image, and PDF all stored privately; served via 60-minute SAS URLs; automatic 7-day lifecycle deletion configured at the storage account level
- **Authentication** — JWT-based register/login, `customer` and `printer` roles, bcrypt password hashing (12 rounds)
- **Multi-tenant foundation** — printer accounts and jobs are shop-scoped, ready for onboarding additional print shops without a schema rewrite
- **Printer Dashboard** — shop-scoped job queue, status filtering (queued/processing/completed/rejected), mark Completed or Rejected with a reason visible to the customer afterward
- **Security hardening**:
  - Rate limiting on every route group — general, auth, uploads, and printer actions each have their own limits
  - Input validation and sanitisation on auth endpoints via `express-validator`
  - Payload size limits on JSON and file uploads
  - 0 known moderate/high vulnerabilities (`npm audit`) — see [Known Issues](#known-issues)
- **Docker** — multi-stage Dockerfiles for both frontend (Nginx-served static build) and backend, `docker-compose.yml` for full-stack local testing
- **Cloud database** — PostgreSQL via Neon in production

---

## Tech stack

| Layer            | Technology                           |
| ---------------- | ------------------------------------ |
| Frontend         | React (Vite) + Tailwind CSS          |
| Backend          | Node.js + Express                    |
| Image processing | Sharp                                |
| PDF generation   | pdf-lib                              |
| Database         | PostgreSQL via Neon                  |
| File storage     | Azure Blob Storage                   |
| Auth             | JWT + bcryptjs                       |
| Validation       | express-validator                    |
| Rate limiting    | express-rate-limit                   |
| Logging          | Winston + Morgan                     |
| Containers       | Docker + Docker Compose              |
| Deployment       | Vercel (frontend) · Render (backend) |

---

## Project structure

```
printready/
├── backend/
│   ├── config/         # Database pool + Azure Blob integration
│   ├── controllers/    # Auth and job pipeline logic
│   ├── middleware/     # JWT verification, file upload, error handling
│   ├── routes/         # Rate-limited, validated route definitions
│   ├── services/       # Image analysis, scoring, PDF generation, vendor specs
│   ├── utils/           # Logger
│   └── server.js
│
├── frontend/
│   └── src/
│       ├── components/  # AuthModal, DropZone, TemplateSelector, ResultCard
│       ├── pages/        # Landing, Upload, History, PrinterDashboard
│       ├── hooks/        # useAuth, useUpload
│       └── api.js        # Shared axios instance
│
├── docker-compose.yml
├── README.md
└── SETUP.md
```

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

## Security

- Passwords hashed with bcrypt (12 rounds), never stored or logged in plain text
- JWT tokens expire after 7 days; identical error message for wrong email/password (no account enumeration)
- Azure files are private; access only via 60-minute SAS URLs; 7-day automatic deletion via Azure Lifecycle Management
- Printers can only see and act on jobs belonging to their own shop, enforced server-side regardless of frontend behaviour
- Rate limiting on every route group, with stricter limits on auth (brute-force protection) and uploads (cost protection)
- Input validation/sanitisation via `express-validator` on all auth inputs
- `npm audit`: 0 moderate/high vulnerabilities on both frontend and backend

## Known Issues

- 1 low-severity vulnerability in esbuild's dev server (`npm audit`), specific to Windows and only affects the local dev server — does not impact the production build or deployed site. Will be resolved once `@vitejs/plugin-react` releases compatibility with a patched esbuild/Vite version.

---

## Roadmap — Version 2

**Print production features**

- Customer approval workflow — preview the processed PDF and approve before the printer proceeds
- Bulk upload — process up to 20 files at once
- Print cost estimation per product/material

**Platform & scale**

- Admin stats panel
- Background job queue (pg-boss) for async processing at higher volume
- AI-assisted upscaling for low-resolution uploads
- Selective AI vision review for borderline-score files
- Face-centering for ID/passport photo templates

**Business**

- Shop directory shown to customers post-processing, with map integration
- Subscription billing for print shops

---

## License

MIT — see [LICENSE](./LICENSE)
