# ShiftSync — Multi-Location Staff Scheduling Platform

Full-stack scheduling platform for **Coastal Eats** restaurant group (4 locations, 2 time zones).

---

## Quick Start

```bash
# 1. Start PostgreSQL
docker-compose up -d

# 2. Backend
cd backend
npm install
npx prisma migrate deploy
npx prisma db seed
npm run start:dev   # http://localhost:3001

# 3. Frontend
cd frontend
npm install
npm run dev         # http://localhost:3000
```

---

## Test Accounts

### Admins — `admin123`

| Name | Email | Manages | Timezone |
|---|---|---|---|
| Admin User | admin@coastaleats.com | All locations | Pacific |
| Bob Admin | admin2@coastaleats.com | All locations | Eastern |

### Managers — `manager123`

| Name | Email | Manages | Timezone |
|---|---|---|---|
| Mike Manager | mike@coastaleats.com | Downtown SF, Marina SF | Pacific |
| Nina Manager | nina@coastaleats.com | Midtown NYC | Eastern |
| Oscar Manager | oscar@coastaleats.com | Brooklyn NYC | Eastern |
| Pat Manager | pat@coastaleats.com | Downtown SF (shared with Mike) | Pacific |

### Staff — `staff123`

| Name | Email | Skills | Certified Locations | Availability | Timezone | Notes |
|---|---|---|---|---|---|---|
| Sarah Server | sarah@coastaleats.com | Server, Host | Downtown SF | Mon–Fri 9am–5pm | Pacific | Standard |
| John Bartender | john@coastaleats.com | Bartender, Server | Downtown SF, Marina SF | Mon–Sun 4pm–12am | Pacific | Multi-location |
| Maria Cook | maria@coastaleats.com | Line Cook | Downtown SF | Tue–Sat 6am–4pm | Pacific | Weekend worker |
| Alex Flex | alex@coastaleats.com | Server, Bartender, Host | All 4 locations | Mon–Sun 8am–8pm | Pacific | Super flexible |
| Lisa Weekend | lisa@coastaleats.com | Server | Marina SF | Fri–Sun only | Pacific | Weekend only |
| Tom Overtime | tom@coastaleats.com | Bartender | Downtown SF | Mon–Sun all day | Pacific | **Hits overtime** |
| Emma Part | emma@coastaleats.com | Host | Midtown NYC | Mon–Wed 10am–6pm | Eastern | Part-time |
| Chris Cross | chris@coastaleats.com | Server | Downtown SF, Midtown NYC | Mon–Fri 9am–5pm | Pacific | **Cross-timezone** |
| Dana Double | dana@coastaleats.com | Line Cook | Marina SF | Mon–Fri 6am–6pm | Pacific | Long availability |
| Frank Night | frank@coastaleats.com | Bartender | Brooklyn NYC | Mon–Sun 6pm–3am | Eastern | Night shift |
| Grace New | grace@coastaleats.com | Server | Brooklyn NYC | Mon–Fri 9am–5pm | Eastern | New hire |
| Henry Host | henry@coastaleats.com | Host | Midtown NYC, Brooklyn NYC | Mon–Sun 10am–10pm | Eastern | Multi-NYC |
| Ivy Irregular | ivy@coastaleats.com | Server | Marina SF | Many exceptions | Pacific | Irregular schedule |
| Jake Junior | jake@coastaleats.com | Host | Downtown SF | Sat–Sun only | Pacific | Student |
| Kate Kitchen | kate@coastaleats.com | Line Cook | Midtown NYC | Mon–Sat 5am–2pm | Eastern | Early bird |
| Leo Limited | leo@coastaleats.com | Bartender | Brooklyn NYC | Tue–Thu only | Eastern | Very limited |

---

## Evaluation Scenario Setup

| Scenario | How to test |
|---|---|
| **Sunday Night Chaos** | Log in as Mike → Schedule → remove Sarah from a shift → system suggests Alex, John, Lisa |
| **Overtime Trap** | Log in as Mike → assign Tom to shifts until he hits 35h → warning appears, 40h+ blocks |
| **Timezone Tangle** | Try to assign Chris to a 9am–5pm ET shift at Midtown NYC → blocked (= 6am–2pm PT) |
| **Simultaneous Assignment** | Open two browser windows as Mike and Pat → both try to assign John at the same time |
| **Fairness Complaint** | Check Jake's shift history vs Lisa's for Saturday evenings |
| **Regret Swap** | Sarah initiates swap with Lisa → Lisa accepts → Sarah cancels before manager approves |

---

## Architecture

```
frontend/   Next.js 14 (App Router) — port 3000
backend/    NestJS — port 3001
            PostgreSQL — port 5433 (Docker)
```

**Key tech:** Prisma ORM · NextAuth.js (JWT) · Socket.io · TanStack Query · shadcn/ui · Tailwind CSS

---

## Documented Ambiguity Decisions

| Ambiguity | Decision |
|---|---|
| Historical data when de-certified | Kept — soft delete via `decertifiedAt` |
| Desired hours vs availability | Availability = hard constraint; desired hours = fairness metric only |
| Consecutive days (1h vs 11h shift) | Any shift counts as a worked day |
| Shift edited after swap approval | Swap auto-cancelled, both parties notified |
| Location spanning timezone boundary | Single canonical timezone per location |
| User availability timezone | Interpreted in user's home timezone, not location timezone |
| Headcount over-assignment | Allowed with warning |
| 7th consecutive day override | Requires documented reason from predefined dropdown |
