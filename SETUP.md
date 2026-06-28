# Setup Guide — PrintReady AI

This document covers local installation, environment variables, and deployment. For a product overview and feature list, see [README.md](./README.md).

---

## Prerequisites

- Node.js 18+
- A PostgreSQL database (local install, or a free [Neon](https://neon.tech) project)
- An [Azure](https://azure.microsoft.com) account with a Blob Storage container
- (Optional) Docker Desktop, for containerised local testing

---

## Local setup (without Docker)

```bash
git clone https://github.com/Dharshinimk-521/printready.git
cd printready

# Backend
cd backend
npm install
cp .env.example .env
# Fill in .env - see "Environment variables" below
npm run dev

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

Backend runs at `http://localhost:5000`
Frontend runs at `http://localhost:5173`

---

## Local setup (with Docker)

```bash
cp backend/.env.example backend/.env
# Fill in JWT_SECRET and Azure credentials in backend/.env
# DATABASE_URL is overridden automatically by docker-compose to point
# at a local Postgres container - no changes needed for that variable

docker-compose up --build
```

Frontend: `http://localhost:3000`
Backend: `http://localhost:5000`

`config/db.js` detects whether `DATABASE_URL` points to Neon (checks for `neon.tech` in the string) to decide whether to enable SSL. This lets the same codebase work against local Docker Postgres (no SSL) and Neon (SSL required) without manual switching.

---

## Environment variables

### `backend/.env`

| Variable                          | Description                  | Example / how to get it                                                                                                                         |
| --------------------------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `PORT`                            | Backend port                 | `5000`                                                                                                                                          |
| `NODE_ENV`                        | Environment                  | `development` or `production`                                                                                                                   |
| `DATABASE_URL`                    | PostgreSQL connection string | Local: `postgresql://postgres:yourpassword@localhost:5432/printready` · Neon: copy from your Neon project dashboard, ends in `?sslmode=require` |
| `JWT_SECRET`                      | Signs auth tokens            | Generate with: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`                                                       |
| `JWT_EXPIRES_IN`                  | Token lifetime               | `7d`                                                                                                                                            |
| `AZURE_STORAGE_CONNECTION_STRING` | Azure Blob access            | Azure Portal → your storage account → Security + networking → Access keys → copy the connection string                                          |
| `AZURE_CONTAINER_NAME`            | Blob container name          | Whatever you named your container (e.g. `printready-uploads`)                                                                                   |
| `CLIENT_URL`                      | Frontend URL, used for CORS  | `http://localhost:5173` locally, your deployed frontend URL in production                                                                       |

### `frontend/.env`

| Variable       | Description                                                                                                              |
| -------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `VITE_API_URL` | Backend URL. Leave empty for local dev (Vite's proxy handles it); set to your deployed backend URL for production builds |

---

## Azure setup (one-time)

1. Create a Storage Account in the Azure Portal (any region, Standard performance, LRS redundancy is sufficient)
2. Create a Blob Container inside it, access level **Private**
3. Copy the connection string from **Access keys** into `AZURE_STORAGE_CONNECTION_STRING`
4. (Recommended) Set up a **Lifecycle Management** rule to auto-delete blobs after 7 days — Azure Portal → your storage account → Data management → Lifecycle Management → add a rule deleting blobs where "last modified" is more than 7 days ago. This keeps storage costs predictable with zero ongoing maintenance.

---

## Database

Tables are created automatically on server startup (`createTables()` in `config/db.js`), including a default shop seed row. No manual SQL needed for a fresh database.

---

## Deployment

**Frontend → Vercel**

- Root directory: `frontend`
- Build command: `npm run build`
- Output directory: `dist`
- Environment variable: `VITE_API_URL` = your deployed backend URL

**Backend → Render**

- Root directory: `backend`
- Build command: `npm install`
- Start command: `node server.js`
- Add every variable from the table above in Render's Environment tab

**Database → Neon**

- Create a project at neon.tech, copy the connection string into `DATABASE_URL` on Render

After both are deployed, update `CLIENT_URL` on Render to match your Vercel URL exactly (no trailing slash) so CORS allows the live frontend to call the live backend.

---

## Troubleshooting

| Symptom                                | Likely cause                                                                                            |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `ECONNREFUSED ::1:5432`                | Local PostgreSQL service isn't running — start it via Windows Services or `net start postgresql-x64-XX` |
| `column "X" does not exist`            | Table was created before a schema change — drop and let it recreate, or `ALTER TABLE` manually          |
| `Invalid DefaultEndpointsProtocol`     | Azure connection string has stray quotes or got corrupted on paste — re-copy directly from Azure Portal |
| CORS errors on deployed frontend       | `CLIENT_URL` on the backend doesn't exactly match your frontend's URL                                   |
| `npm install` peer dependency conflict | Delete `node_modules` and `package-lock.json`, reinstall fresh                                          |
