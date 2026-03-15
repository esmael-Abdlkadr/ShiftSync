# ShiftSync — Multi-Location Staff Scheduling Platform

Full-stack scheduling platform for **Coastal Eats** restaurant group (4 locations, 2 time zones).



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

## Live URLs

| Service | URL |
|---|---|
| Frontend | https://shift-sync-ten.vercel.app |
| Backend API | https://api.inovixtechnology.com |

## Architecture

```
frontend/   Next.js 14 (App Router)  — deployed on Vercel
backend/    NestJS                   — deployed on cPanel (Node.js)
database/   PostgreSQL               — hosted on Supabase
```

**Key tech:** Prisma ORM · NextAuth.js (JWT) · Socket.io · TanStack Query · shadcn/ui · Tailwind CSS

---

## Known Limitations

- Email notifications are simulated — events are logged to the backend console rather than sent via a real SMTP provider.

---

## Ambiguity Decisions

**De-certification history:** Past shifts are kept. A `decertifiedAt` date is recorded so history still appears in reports and the audit log. Only future assignments are blocked.

**Desired hours vs availability:** Availability is a hard block. Desired hours are a personal target that never blocks assignment — they only show up in the Reports page as a gap so managers can balance the schedule fairly.

**Consecutive days (1h vs 11h):** Any shift on a calendar day counts as a day worked, regardless of length. The 6th/7th day warnings are based on days, not hours.

**Shift edited after swap approval:** The swap is cancelled automatically and both staff get notified. They agreed to the original shift details, so any edit voids that agreement.

**Location spanning a timezone boundary:** Each location has one timezone set by the manager. If a business truly needs two, the right approach is two separate location records.

**Other calls made:**

| Area | Decision |
|---|---|
| Staff availability timezone | Interpreted in the staff member's own timezone, not the location's |
| Headcount over-assignment | Allowed with a warning |
| 7th consecutive day override | Manager must select a reason which is saved to the audit log |
