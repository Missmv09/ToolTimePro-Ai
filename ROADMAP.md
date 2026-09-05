# Task Iguana — Future Roadmap

## Replace Housecall Pro + GoHighLevel (one vendor, one bill)
- [x] **Two-Way SMS Inbox** — Owner replies to any Jenny thread from the dashboard; Jenny pauses on takeover and resumes on hand-back
- [x] **Instant Lead Alerts** — Website form → in-app + SMS to owner in seconds; optional Jenny auto-reply that opens a booking thread
- [x] **Customer Win-Back** — Jenny texts opted-in customers quiet for 6+ months (autonomous action `customer_reactivation`)
- [x] **Missed-Call Text-Back** — Owner ring-through, then Jenny texts the caller and books via SMS
- [ ] **Google Business / Facebook Messenger in the inbox** — same thread view, more channels
- [ ] **Email drip campaigns** — Jenny follow-ups over email for leads without a phone
- [ ] **Zapier / webhook out** — `src/lib/zapier.ts` is still a stub

## Review & Reputation (Add-on Revenue Opportunities)
- [ ] **Review Monitoring Dashboard** — Track Google rating over time, review volume trends, competitor comparison
- [ ] **AI Review Response Writer** — Jenny drafts professional replies to Google reviews (positive and negative)
- [ ] **Multi-Platform Reviews** — Send review requests to Google + Yelp + Facebook + Nextdoor simultaneously
- [ ] **Review Gating** — Ask customer for star rating first, only send to Google if 4-5 stars (filter negative to private feedback)

## Pricing & Supplier Integration
- [ ] **Home Depot Pro Xtra API** — In-store purchase tracking via contractor's Pro account
- [ ] **Lowe's API Integration** — Price comparison alongside Home Depot
- [ ] **Live Supplier Pricing** — Real-time prices from HD/Lowe's APIs instead of static database
- [ ] **Shopping Cart Push** — One-click push material list into HD/Lowe's online cart
- [ ] **Sherwin-Williams Partnership** — Paint-specific live pricing for painting contractors

## Payroll (Build When Ready)
- [ ] **Built-In Payroll** — Auto-calculate hours from time entries, apply state OT rules, generate pay stubs, direct deposit
- [ ] **Tax Withholding Engine** — Federal + state tax calculations per worker
- [ ] **1099-NEC Generation** — Year-end 1099 forms for contractors from contractor_invoices data
- [ ] **W-2 Generation** — Year-end W-2 forms for employees

## Jenny AI Expansion
- [ ] **Jenny Phone Answering** — AI answers business phone calls, books appointments, takes messages
- [ ] **Jenny Estimates by Voice** — Contractor describes job verbally, Jenny generates full quote
- [ ] **Jenny Customer Chat** — AI chat on contractor's website that books jobs and answers questions
- [ ] **Jenny Predictive Scheduling** — Suggest optimal crew assignments based on historical patterns

## Multi-State Compliance Expansion
- [ ] **More States** — Add MA, NJ, WA, OR, CO, AZ, GA, NC, VA, OH
- [ ] **Auto-Update Detection** — Jenny monitors state labor department websites for law changes
- [ ] **Compliance Certification** — Contractors earn "Task Iguana Certified Compliant" badge for their website

## Customer Portal Expansion
- [ ] **Job Photos in Portal** — Before/after photos visible to customers
- [ ] **Recurring Appointment Management** — Customers manage weekly/monthly service schedules
- [ ] **Service History Timeline** — Full history of all work done at a property
- [ ] **Referral Program** — Customers refer friends through portal, contractor tracks referral source

## Platform Growth
- [ ] **Spanish-First Full UI** — Complete platform translation (not just AI responses)
- [ ] **Franchise/Multi-Location Support** — One owner, multiple service areas with separate crews
- [ ] **Subcontractor Marketplace** — Find and hire subs directly through Task Iguana
- [ ] **Equipment Tracking** — Track company tools/equipment assigned to workers
- [ ] **Vehicle/Fleet Management** — Mileage, maintenance schedules, fuel tracking

## Marketing & SEO
- [ ] **More Competitor Pages** — GorillaDesk, Kickserv, mHelpDesk, Workiz, Zuper
- [ ] **Industry-Specific Landing Pages** — SEO pages for each of the 60+ supported industries
- [ ] **Case Studies / Testimonials** — Real contractor success stories
- [ ] **ROI Calculator** — "How much will you save switching to Task Iguana?" interactive tool
