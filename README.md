# MomCare API

A RESTful backend service for the MomCare platform — a maternal health Learning Management System (LMS). Built with **Fastify**, **TypeScript**, **Prisma ORM**, and **MariaDB**. Deployed on Railway.

---

## Features

- JWT-based authentication with OTP (phone) and email/password login
- Role-based access control (RBAC) with 7 role tiers
- Course and lesson management
- Subscription plans and Razorpay payment integration
- Community, posts, comments, and reactions
- Expert profiles and expert posts
- Daily tips, diet charts, and Dadi-Nani Nuskhe content
- File uploads (local filesystem or remote storage)
- Bulk data import via Excel
- Server log viewer

---

## Quick Start

### Prerequisites

- Node.js >= 22.0.0
- MariaDB instance

### Installation

```bash
# Clone the repository
git clone https://github.com/madhujikashyap/momcare-api.git
cd momcare-api

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env — set DATABASE_URL, JWT_SECRET, and other required values
```

### Database setup

```bash
npx prisma db pull      # Sync schema from existing database
npx prisma generate     # Generate Prisma client
```

### Run locally

```bash
npm run dev
```

The server starts on `http://localhost:3000` (or the port set in `PORT`).  
Swagger UI is available at `http://localhost:3000/docs`.

---

## After pulling new changes

Always re-sync Prisma when the database schema may have changed:

```bash
git pull
npx prisma db pull
npx prisma generate
npm run dev
```

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot-reload |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled production build |

---

## API Documentation

Full developer documentation is in **[API_DOCUMENTATION.md](./API_DOCUMENTATION.md)**, covering:

- Authentication (JWT Bearer + OTP flow)
- All endpoints organised by feature area
- Request/response examples
- Role-based access control reference
- Rate limiting rules
- File upload guidelines
- Environment variables
- Deployment info

Interactive Swagger docs are served at `/docs` on any running instance:

- **Production:** https://momcare-api-production.up.railway.app/docs
- **Local:** http://localhost:3000/docs

---

## Deployment

Deployed on **Railway** at:

```
https://momcare-api-production.up.railway.app
```

Railway runs `npm run build && npm start` (via `Procfile`) on each deploy.

---

## Contributing

1. Create a feature branch from `main`
2. Make your changes and ensure the TypeScript build passes (`npm run build`)
3. Re-sync Prisma if you changed the database schema (`npx prisma db pull && npx prisma generate`)
4. Open a pull request with a clear description of what changed and why
