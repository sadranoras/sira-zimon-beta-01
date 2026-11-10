# Project memory

## Product intent & audience

- Persian-language education/class platform with separate areas for regular users and admins.
- Regular user panel modeled on biomaze.ir's "پنل ماز": home/schedule, my classes, calendar, profile.
- Audience includes students (regular users) attending online classes; admin area exists for management.

## Brand personality & voice

- UI copy is in Persian (Farsi); keep labels and navigation in Farsi.
- Tone is practical and student-facing, mirroring biomaze's panel naming ("پنل ماز", "کلاس های من").

## Visual design & UX direction

- Regular user panel uses a right-side sidebar menu (RTL layout), reusing admin sidebar styling.
- Panel sections: home (today's + upcoming classes with join buttons), my classes ("کلاس های من"), calendar grouped by month then day, profile.
- Join button becomes active at class start time; currently stays active after end because classes have only start time (no end time).
- Existing app previously had flat Dashboard + Profile pages; now consolidated under the panel layout.

## Decisions, constraints & rationale

- Built panel from biomaze guides because page-fetch budget was exhausted; not visually verified in browser yet.
- Type check and production build pass after changes.
- Calendar groups by month and day (updated from initial day-only grouping).
- Right-side menu chosen to match biomaze panel structure and RTL expectations.

## Open questions & assumptions

- Not yet built because app lacks underlying features: wallet, coins, invoices/payments, messages, attendance, Q&A tickets, downloadable files, teacher selection — user to choose next priorities.
- Classes lack end time, so join-button availability after class end is unresolved.
- Layout and join-button timing still need browser testing/visual verification.
- biomaze panel details are inferred from guides, not confirmed by live site inspection.