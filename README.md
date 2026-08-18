# TuitionHub

A local-first tuition management web application for solo tuition masters. Manage students, weekly class schedules, monthly LKR fee invoicing, assignments, tests with per-question marks, and progress reports — all from one dashboard.

## Features

- **Student Management** — Roster with guardian contacts, grades, monthly fees, and status tracking
- **Class Groups & Schedule** — Weekly recurring timetable with auto-generated sessions
- **Attendance** — Mark present/absent/late/excused per session with topic coverage
- **Fee Management** — Monthly invoice generation, partial payments, aging buckets (0-30 / 31-60 / 61-90 / 90+ days)
- **Assignments** — Create, track submissions, and grade per student
- **Tests & Gradebook** — Per-question marks entry with auto-calculated grades and topic mastery
- **Syllabus** — Topic tracking with coverage progress per class
- **Dashboard** — KPIs, collection charts, today's classes, pending actions queue
- **Reports** — Printable student progress reports with attendance, marks trend, and fee history

## Tech Stack

- Next.js 16 (App Router, Server Components, Server Actions)
- TypeScript, Tailwind CSS v4, shadcn/ui
- Prisma 7 + SQLite (local file database)
- Recharts, date-fns, Zod

## Getting Started

### Prerequisites

- Node.js 20+ (tested on v24)
- npm 10+

### Installation

```bash
# Install dependencies
npm install

# Run database migrations
npx prisma migrate dev

# Seed sample data (12 students, 3 classes, invoices, 1 test)
npm run seed

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build (Local)

```bash
npm run build
npm start
```

## Project Structure

```
src/
├── actions/          # Server Actions (mutations)
├── app/(dashboard)/  # All app pages with sidebar layout
├── components/       # UI components (layout, students, fees, etc.)
├── lib/              # Utilities (db, currency, dates, queries)
prisma/
├── schema.prisma     # Database schema
├── seed.ts           # Sample data seeder
└── dev.db            # SQLite database file (created on migrate)
```

## Key Routes

| Route | Description |
|-------|-------------|
| `/` | Dashboard with KPIs and pending actions |
| `/students` | Student roster |
| `/classes` | Class groups and enrollments |
| `/schedule` | Weekly timetable grid |
| `/fees` | Invoice management and aging |
| `/assignments` | Assignment tracking |
| `/tests` | Assessments and marks entry |
| `/syllabus` | Topic management and coverage |
| `/reports` | Student progress reports |
| `/settings` | Teacher profile and fee defaults |

## Database

Data is stored in `prisma/dev.db` (SQLite). To reset and re-seed:

```bash
npm run db:reset
npm run seed
```

To inspect data visually:

```bash
npm run db:studio
```

## Currency

All monetary values are stored as integer cents internally. Display uses LKR formatting via `formatLkr()` helper. Default monthly fee: Rs. 8,000 (800000 cents).

## Deploy (Railway)

TuitionHub uses SQLite with a persistent file database. **Railway** is recommended (Vercel serverless is not compatible with `better-sqlite3`).

### 1. Push to GitHub

```bash
git remote add origin https://github.com/YOUR_USER/tuition-management.git
git push -u origin main
```

### 2. Deploy on Railway

1. Go to [railway.app](https://railway.app) and create a project from your GitHub repo
2. Add a **Volume** mounted at `/data`
3. Set environment variable:
   ```
   DATABASE_URL=file:/data/tuitionhub.db
   ```
4. Railway will run `prisma migrate deploy` then `next start` (see `railway.toml`)
5. Optionally run seed once via Railway shell: `npm run seed`

Your app will be live at the Railway-generated URL.

## License

Private — all rights reserved.
