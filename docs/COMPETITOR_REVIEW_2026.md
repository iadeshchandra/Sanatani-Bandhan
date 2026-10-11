# Competitor Review 2026 — Sanatani Bandhan vs The Market

**Date:** October 2026 · **Classification:** Internal strategy
**Scope:** Church Management Systems (ChMS) + Indian accounting incumbents, evaluated for the Hindu temple / dharmic institution market.

---

## 1. Competitor Cards

### Pushpay (ChurchStaq) — the enterprise ChMS leader
- **Pricing:** Quote-based; entry ~US$199/mo (Capterra 2026). Card 2.1–2.9% + $0.20–0.30; ACH 0.5–1.0% + $0.20–0.30. No free tier.
- **Standout:** Recurring giving grew 11% YoY across its churches (2025); >90% recurring-schedule retention through migrations; **failed-payment recovery** (auto-retries declined gifts); donor-covers-fees; Pushpay Insights flags disengaging donors; kids check-in; multi-site; branded mobile app.
- **Weakness vs temples:** US/CA/AU/NZ only. English/Spanish only. Zero Indian tax (80G/12A/Form 10BD), UPI, or festival logic. Overkill pricing for sub-500-member institutions.

### Planning Center — the modular favorite
- **Pricing:** $15/module/month (People, Giving, Services, Check-Ins, Registrations…), stacking to ~$239. Giving: 2.15% + $0.30 cards, $0 + $0.30 ACH. Free tier exists.
- **Standout:** Best-in-class **service planning** (drag-and-drop worship flow) + **volunteer scheduling with automated reminders**; 94% user recommendation; clean UX; API + QuickBooks/Mailchimp integrations.
- **Weakness vs temples:** Modular bill balloons fast; no fund accounting depth; no Indian compliance/localization; service-planning metaphor is Christian-liturgy-shaped, not puja-roster-shaped.

### Tithe.ly — the giving-led bundler
- **Pricing:** $0–$119/mo bundled. Card 2.9% + $0.30; ACH 1% + $0.30.
- **Standout:** Giving + text-to-give + kiosk; **pledge campaigns**; recurring giving; automated year-end tax statements; custom church app + website builder + live streaming in one box; kids check-in; volunteer management; background checks. 93% recommendation.
- **Weakness vs temples:** Giving-centric, thin on operations depth; no Indian payments/tax; no vernacular support.

### TouchPoint — the mid-market workhorse
- **Pricing:** From $600/yr (~$3 per *active* record/year). Free trial, 24/7 support.
- **Standout:** Attendance tracking, child check-in, email/SMS (Twilio/SendGrid), event management, member directory + portal, **multi-site management**, online giving, pledge management, small groups, volunteer management. Priced on active records, not seats.
- **Weakness vs temples:** Accounting is integration-only (no native GL/fund accounting); US-centric; no Indian compliance.

### Shelby Systems (ShelbyNext) — the fund-accounting veteran
- **Pricing:** Quote-based (~$79/mo entry per third-party listings). Since 1976.
- **Standout:** **True fund accounting** (GL, AP/AR, bank rec, fixed assets, purchasing, GAAP reporting); clergy-specific payroll; **purchasing approval workflows**; drill-down financial reporting; integrated volunteer background checks (Protect My Ministry); built for large organizations.
- **Weakness vs temples:** Expensive, steep learning curve, dated UX, no published pricing, zero Indian context.

### Realm (ACST / Ministry Brands) — the accounting-strong suite
- **Pricing:** Attendance-tiered: Inform $30/mo, Connect $46/mo, Multiply $209/mo + setup fees.
- **Standout:** **Built-in double-entry fund accounting** adhering to nonprofit standards; payroll; donor tax statements; full-suite (giving + ChMS + accounting) under one roof.
- **Weakness vs temples:** US nonprofit accounting ≠ Indian trust accounting (no 80G/12A/Form 10BD, no Tally bridge); pricing tiers punish growth.

### Tally Prime — the Indian incumbent
- **Pricing:** Perpetual license ~₹22,500 + GST (Silver, single user); TSS ~₹4,500/yr; rental ₹750/mo.
- **Standout:** 400+ MIS reports; GST + e-invoicing; deep inventory (batch/godown); audit trail; **every Indian CA already knows it** — the muscle-memory moat.
- **Weakness vs temples:** Desktop-first, weak multi-branch, no devotee CRM, no recurring-donation workflows, no engagement tools, no cloud collaboration. It is a ledger, not an institution OS.

### Zoho Books — the cloud-native Indian challenger
- **Pricing:** Free plan (<₹25L turnover); Standard ₹899/mo; Professional up to ₹3,599/mo.
- **Standout:** Cloud-native + mobile; direct GST filing (registered GSP); e-invoicing; **recurring invoices + workflow automation + payment reminders**; multi-organization; Zoho ecosystem (CRM/Inventory/Payroll).
- **Weakness vs temples:** No devotee/CRM depth, no 80G/12A/Form 10BD trust workflows, no festival/ritual logic, no offline-first for rural sites.

---

## 2. Feature-Gap Matrix vs Sanatani Bandhan

| Capability | SB (Oct 2026) | Pushpay | Planning Center | Tithe.ly | TouchPoint | Shelby | Realm | Tally Prime | Zoho Books |
|---|---|---|---|---|---|---|---|---|---|
| Recurring giving / mandates | **NEW — this sprint** | ✅✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ (invoices) |
| Failed-payment recovery | ❌ | ✅✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Pledge campaigns | ✅ (MandirCampaigns) | ✅ | ❌ | ✅✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Volunteer scheduling + reminders | ✅ | ✅ | ✅✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Child/family check-in | ✅ (Gate/QR) | ✅ | ✅✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Fund accounting depth | ✅ (corpus segregation) | ➖ | ❌ | ❌ | ➖ | ✅✅ | ✅✅ | ✅✅ | ✅ |
| 80G / 12A / Form 10BD | ✅✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Tally bridge | ✅ (XML export) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | n/a | ➖ |
| UPI / Indian payments | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Offline-first (rural) | ✅✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ (desktop) | ❌ |
| Multi-branch federation | ✅✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ | ➖ |
| Vedic domain (Panchang/gotra) | ✅✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Vernacular UI (10-language) | ➖ (partial) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ (Indian) | ✅ |
| Donor-covers-fees | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Disengagement analytics | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

**Reading:** Nobody in the ChMS world touches Indian trust compliance, UPI, offline-first, or Vedic domain logic. Nobody in the Indian accounting world touches devotee CRM, recurring seva, or federation. The white space is real — but recurring giving, failed-payment recovery, and pledge tooling are table stakes we must match.

---

## 3. Steal-Worthy List — ranked by impact, scored for effort

| # | Feature (stolen from) | Why it wins | Impact | Effort | Notes |
|---|---|---|---|---|---|
| 1 | **Recurring Seva mandates** (Pushpay/Tithe.ly) | Predictable revenue is the #1 retention lever in giving software | 10 | 4 | **SHIPPED this sprint** as RecurringSevaDesk |
| 2 | **Failed-payment recovery** (Pushpay) | Auto-retry + devotee nudge on declined/expired mandates; recovers ~2% of lapsing revenue silently | 9 | 5 | Natural Phase 2 on top of RecurringSevaDesk; needs payment-gateway webhooks |
| 3 | **Donor-covers-fees toggle** (Pushpay/Tithe.ly) | Lifts net collection 2–3% at zero cost to the trust | 8 | 2 | Trivial UI + math on the POS/giving flow |
| 4 | **Pledge campaigns with thermometers** (Tithe.ly) | Mandir Nirman / corpus drives convert far better with public progress + per-devotee pledge tracking | 8 | 4 | Extend MandirCampaignsDesk; add WhatsApp pledge nudges |
| 5 | **Volunteer shift reminders** (Planning Center) | Automated SMS/WhatsApp reminders cut sevadar no-shows; Planning Center's most-loved loop | 8 | 3 | Wire into SevadarRosterDesk + broadcaster |
| 6 | **Disengagement radar** (Pushpay Insights) | Flag devotees whose giving/attendance drops before they lapse; trustees intervene personally | 7 | 6 | Analytics on existing data; no new collection needed |
| 7 | **Purchasing approval workflows** (Shelby) | Dual-approval on purchase orders >₹X kills the #1 fraud vector in trusts | 7 | 5 | Extend SmartBhandarProcurementDesk |
| 8 | **Active-record (not per-seat) pricing** (TouchPoint) | Sevadars are volunteers — per-seat pricing kills deals; price per active devotee record | 7 | 1 | Pricing/packaging change, not code |
| 9 | **Drill-down financial reporting** (Shelby) | Click any KPI → the underlying vouchers; CAs live for this | 6 | 4 | Add to TreasuryLedgerDesk analytics section |
| 10 | **Branded devotee app feel** (Tithe.ly/Subsplash) | White-label temple app (logo, colors) per workspace — trusts *pay* for their name on the devotee's phone | 6 | 6 | PWA manifest + theme per workspace; Capacitor build per trust |

**Scoring:** Impact 1–10 (revenue/retention leverage), Effort 1–10 (10 = multi-sprint).

---

## 4. Strategic takeaways

1. **The ChMS giants can't follow us into India** — no 80G, no UPI, no Hindi/Tamil UI, no offline. Their moat (recurring giving ops) is now partially ours.
2. **The Indian incumbents can't follow us into the temple** — Tally/Zoho will never build Panchang, gotra, or devotee CRM. Our defense is domain depth; our offense is their accountants (Tally bridge + free auditor seats).
3. **Recurring revenue tooling is the highest-leverage category** — it compounds. Items #1–#3 on the steal list form one roadmap: mandates → recovery → fee coverage.
4. **Pricing is a feature.** TouchPoint's active-record model and Zoho's free tier are why small institutions adopt. Keep per-branch (not per-seat) SaaS and a genuine free tier.
