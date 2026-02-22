# Product and domain

## Problem and goals

**Problem**: People who need small, local jobs done (e.g. landscaping, moving help, handyman tasks) often struggle to find reliable workers. Workers who do these jobs lack a simple way to find and get paid for gigs.

**Goals**:

- Connect **clients** (job posters) with **workers** (gig providers) for small, one-off or short-term jobs.
- Make posting a job, finding a worker, and completing a booking simple and trustworthy.
- Enable clear pricing, scheduling, and payment in one place.

**Success criteria** (to be refined):

- Clients can post a job and receive qualified worker interest or matches.
- Workers can discover jobs, accept bookings, and get paid.
- Bookings have a clear lifecycle (requested → confirmed → in progress → completed).
- Payments are held and released appropriately; disputes can be escalated.

---

## User personas

| Persona       | Description |
|---------------|-------------|
| **Client**    | Someone who posts a job (e.g. homeowner needing lawn care). Creates jobs, selects or accepts a worker, confirms completion, pays. |
| **Worker**    | Someone who performs gigs (e.g. landscaper). Has a profile, skills, availability; browses or is matched to jobs; accepts bookings and gets paid. |
| **Admin**     | (Optional) Platform operator for support, disputes, and moderation. |

---

## Core flows

### Happy path

1. **Post a job** — Client creates a job (category e.g. landscaping, location, description, budget, preferred schedule).
2. **Discovery** — Workers see the job (browse or match); workers apply or client invites.
3. **Booking** — Client selects a worker (or worker accepts); booking is created and confirmed.
4. **Work** — Worker performs the job; status moves to in progress, then completed.
5. **Payment & review** — Payment is released (or was held and is released); client and worker can leave ratings/reviews.

### Key alternatives

- **Cancel** — Client or worker cancels before or after confirmation; policy for refunds/cancellation fees to be defined.
- **Reschedule** — Client or worker requests a new date/time; booking stays linked.
- **Dispute** — Issue with completion or payment; escalation path (e.g. admin, support) to be defined.

---

## Bounded contexts

Domains that will map to services or subsystems:

| Context            | Responsibility |
|--------------------|----------------|
| **Identity & auth**| Who you are; registration, login, roles (client vs worker). |
| **Jobs**           | Job creation, categories (e.g. landscaping), location, budget, schedule, draft/published. |
| **Workers**        | Worker profiles, skills, availability, ratings (aggregate). |
| **Bookings**       | Matching/assigning a worker to a job; status lifecycle (requested, confirmed, in progress, completed, cancelled). |
| **Payments**       | Holds, release, refunds, payouts to workers. |
| **Notifications**  | In-app and/or email/SMS for status changes and reminders. |
| **Reviews**        | Ratings and feedback after a job; may feed into Workers context. |

This gives a shared language and scope before touching AWS or code.
