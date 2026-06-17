# 💰 My Expense Logger

A mobile-first Progressive Web App for tracking business expenses. Built with Next.js 15, Supabase, and Tailwind CSS. Installable on iOS & Android via PWA.

---

## ✨ Features

- **Dashboard** — monthly spend, 6-month trend chart, top categories, recent expenses
- **Expense Logger** — add with category, sub-category, payment mode, notes
- **Category Master** — create/delete categories with color picker and sub-categories
- **Settings** — profile, dark mode toggle, sign out
- **Auth** — email/password signup & login via Supabase
- **PWA** — installable on home screen, works offline (cached pages)
- **Dark mode** — system preference + manual toggle
- **Currency** — ₹ INR throughout

---

## 🗂 Project Structure

```
my-expense-logger/
├── app/
│   ├── (auth)/login        → Login page
│   ├── (auth)/signup       → Signup page
│   ├── (app)/dashboard     → Dashboard with charts
│   ├── (app)/expenses      → Expense list + add + detail
│   ├── (app)/categories    → Category master CRUD
│   ├── (app)/settings      → Profile + preferences
│   └── api/                → REST API routes
├── components/shared/      → BottomNav, ThemeProvider
├── lib/supabase/           → Browser + server clients
├── lib/validations/        → Zod schemas
├── store/                  → Zustand state
├── types/                  → TypeScript types
└── supabase-schema.sql     → Full DB schema + RLS
```

---

## 🚀 Getting Started (Local)

### Step 1 — Clone & install

```bash
git clone <your-repo-url>
cd my-expense-logger
npm install
```

### Step 2 — Create Supabase project

1. Go to [supabase.com](https://supabase.com) → **New project** (free tier)
2. Note your **Project URL** and **anon public key** from Settings → API

### Step 3 — Run the SQL schema

1. In Supabase Dashboard → **SQL Editor** → **New Query**
2. Paste the entire contents of `supabase-schema.sql`
3. Click **Run**

### Step 4 — Configure environment variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### Step 5 — Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## ☁️ Deploy to Vercel (Free)

### Step 1 — Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/your-username/my-expense-logger.git
git push -u origin main
```

### Step 2 — Import to Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import your GitHub repository
3. In **Environment Variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Click **Deploy**

Your app will be live at `https://your-app.vercel.app` in ~60 seconds!

### Step 3 — Install as PWA

- **Android**: Open in Chrome → menu → **Add to Home Screen**
- **iPhone**: Open in Safari → Share → **Add to Home Screen**

---

## 📱 PWA Icons

Generate icons at [pwa-asset-generator](https://www.npmjs.com/package/pwa-asset-generator) or [realfavicongenerator.net](https://realfavicongenerator.net) and place them in `/public/icons/`:

```
icon-72.png, icon-96.png, icon-128.png, icon-144.png
icon-152.png, icon-180.png, icon-192.png, icon-512.png
```

---

## 🗄 Database Schema

| Table | Description |
|---|---|
| `profiles` | User profile (name, currency, FY start) |
| `categories` | Expense categories with color + icon |
| `subcategories` | Sub-categories linked to a category |
| `expenses` | Individual expense entries |

All tables have **Row Level Security (RLS)** — each user sees only their own data.

---

## 🛠 Tech Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 15 (App Router) + TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| State | Zustand |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| Icons | Lucide React |
| Auth + DB | Supabase (free tier) |
| Hosting | Vercel (free tier) |
| PWA | next-pwa |

---

## 🔧 Scripts

```bash
npm run dev        # Start dev server
npm run build      # Production build
npm run start      # Start production server
npm run type-check # TypeScript check
npm run lint       # ESLint
```

---

## 🔒 Security

- Supabase RLS enforces per-user data isolation at DB level
- Auth tokens stored in secure HTTP-only cookies via `@supabase/ssr`
- Middleware protects all `/dashboard`, `/expenses`, `/categories`, `/settings` routes
- Zod validation on all form inputs and API routes

---

## 📈 Extending Later

- **Budget tracking** — add a `budgets` table per category per month
- **Recurring expenses** — add `is_recurring` + `recurrence_rule` to expenses
- **CSV export** — `/api/export` route streaming CSV
- **Google OAuth** — one line in Supabase Auth settings
- **Multi-currency** — add `currency` field to expenses + conversion API
