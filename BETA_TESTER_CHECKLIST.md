# ToolTime Pro - Beta Tester Checklist

## Saldana & Sons - Beta Testing Guide

**Company:** Saldana & Sons
**Platform:** ToolTime Pro
**Role:** Worker / Team Member
**Date:** February 2026

---

> **Instructions:** Work through each section below. Mark each item as you test it.
> Use the status markers: Pass / Fail / Blocked / N/A.
> If a test fails, note the issue in the "Notes" column and report it to the team lead.

---

## Table of Contents

1. [Account & Login](#1-account--login)
2. [Dashboard Overview](#2-dashboard-overview)
3. [Worker App (Mobile)](#3-worker-app-mobile)
4. [Time Tracking & Clock In/Out](#4-time-tracking--clock-inout)
5. [Jobs & Scheduling](#5-jobs--scheduling)
6. [Quotes](#6-quotes)
7. [Invoices & Payments](#7-invoices--payments)
8. [Customer Management](#8-customer-management)
9. [Lead Management](#9-lead-management)
10. [Services Catalog](#10-services-catalog)
11. [Team Management](#11-team-management)
12. [Reviews (Jenny Reviews)](#12-reviews-jenny-reviews)
13. [Smart Quoting (Jenny Quotes)](#13-smart-quoting-jenny-quotes)
14. [AI Chatbot (Jenny Lite)](#14-ai-chatbot-jenny-lite)
15. [Compliance & Shield Tools](#15-compliance--shield-tools)
16. [Booking System](#16-booking-system)
17. [Website Builder](#17-website-builder)
18. [Route Optimizer & Dispatch](#18-route-optimizer--dispatch)
19. [Settings & Company Profile](#19-settings--company-profile)
20. [Notifications & Communications](#20-notifications--communications)
21. [Public Pages & Free Tools](#21-public-pages--free-tools)
22. [Cross-Browser & Device Testing](#22-cross-browser--device-testing)
23. [Performance & Reliability](#23-performance--reliability)
24. [Security & Access Control](#24-security--access-control)

---

## 1. Account & Login

Test the authentication flow as a Saldana & Sons team member.

| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 1.1 | Sign up with company name | Go to `/auth/signup`, enter "Saldana & Sons" as company, fill all fields | Account created, confirmation email sent | | |
| 1.2 | Email confirmation | Click confirmation link in email | Email verified, redirected to login | | |
| 1.3 | Login with valid credentials | Go to `/auth/login`, enter valid email/password | Redirected to `/dashboard` | | |
| 1.4 | Login with wrong password | Enter valid email, wrong password | Error message displayed, not logged in | | |
| 1.5 | Login with unregistered email | Enter email not in system | Appropriate error message | | |
| 1.6 | Forgot password flow | Click "Forgot Password", enter email | Reset email received with valid link | | |
| 1.7 | Reset password | Use reset link, enter new password | Password updated, can login with new password | | |
| 1.8 | Session persistence | Login, close browser, reopen app | User remains logged in | | |
| 1.9 | Logout | Click logout from dashboard | Session ended, redirected to login | | |
| 1.10 | Auth timeout handling | Wait for session to near expiry | Session refreshes automatically or prompts re-login | | |

---

## 2. Dashboard Overview

Test the main dashboard view after logging in as a Saldana & Sons user.

| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 2.1 | Dashboard loads | Login and view `/dashboard` | Dashboard loads with stats cards | | |
| 2.2 | Today's jobs count | Check "Today's Jobs" card | Shows correct count of jobs for today | | |
| 2.3 | New leads count | Check "New Leads" card | Shows accurate lead count | | |
| 2.4 | Pending quotes | Check "Pending Quotes" card | Shows correct number of unsent/draft quotes | | |
| 2.5 | Unpaid invoices | Check "Unpaid Invoices" card | Shows correct unpaid invoice count | | |
| 2.6 | Monthly revenue | Check revenue display | Shows accurate revenue for current month | | |
| 2.7 | Navigation sidebar | Click each nav item in sidebar | Each link navigates to correct page | | |
| 2.8 | Dashboard data refresh | Create a new job, return to dashboard | Stats update to reflect new data | | |
| 2.9 | Mobile responsiveness | View dashboard on phone screen | Layout adapts, all data visible | | |

---

## 3. Worker App (Mobile)

Test the mobile worker experience for Saldana & Sons field workers.

| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 3.1 | Worker login page | Navigate to `/worker/login` | Login form appears, mobile-optimized | | |
| 3.2 | Worker PIN login | Enter worker PIN | Worker authenticated, sees worker dashboard | | |
| 3.3 | View assigned jobs | After login, check job list | Only jobs assigned to this worker appear | | |
| 3.4 | Job detail view | Tap on a job | Full job details display (customer, address, services, notes) | | |
| 3.5 | Update job status | Change job from "scheduled" to "in_progress" | Status updates and persists | | |
| 3.6 | Complete a job | Mark job as "completed" | Job moves to completed, timestamp recorded | | |
| 3.7 | Upload job photos | Take/upload a photo from job site | Photo uploads and appears in job record | | |
| 3.8 | Worker timeclock | Navigate to `/worker/timeclock` | Clock in/out interface loads | | |
| 3.9 | Worker time history | Navigate to `/worker/time` | Shows past time entries for this worker | | |
| 3.10 | Worker profile | Navigate to `/worker/profile` | Worker profile information displays correctly | | |
| 3.11 | Safety incident report | Navigate to `/worker/safety`, submit incident | Incident report created and saved | | |
| 3.12 | Mobile layout | Test all worker pages on phone | All pages usable, no horizontal scroll | | |

---

## 4. Time Tracking & Clock In/Out

Test time tracking and California labor compliance features.

| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 4.1 | Clock in | Click "Clock In" on timeclock | Time entry starts, GPS location captured | | |
| 4.2 | GPS location recorded | Clock in with location enabled | Location coordinates saved with entry | | |
| 4.3 | Clock out | Click "Clock Out" after working | Time entry ends, total hours calculated | | |
| 4.4 | Start a break | Click "Start Break" during shift | Break timer begins, type recorded (meal/rest) | | |
| 4.5 | End a break | Click "End Break" | Break duration logged | | |
| 4.6 | Meal break compliance | Work 5+ hours without 30-min meal break | Compliance alert generated | | |
| 4.7 | Rest break compliance | Work 3.5+ hours without 10-min rest break | Compliance alert generated | | |
| 4.8 | Overtime detection | Log 8+ hours in a day | Overtime (1.5x) flagged after 8 hours | | |
| 4.9 | Double-time detection | Log 12+ hours in a day | Double-time (2x) flagged after 12 hours | | |
| 4.10 | Weekly overtime | Log 40+ hours in a week | Weekly overtime flagged | | |
| 4.11 | View time log history | Navigate to `/dashboard/time-logs` | All past entries display with hours/breaks | | |
| 4.12 | Edit time entry (admin) | As admin, edit a worker's time entry | Entry updates correctly | | |
| 4.13 | Multiple clock-ins prevented | Try to clock in while already clocked in | System prevents duplicate clock-in | | |

---

## 5. Jobs & Scheduling

Test job creation, management, and scheduling for Saldana & Sons service calls.

| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 5.1 | Create a new job | Go to `/dashboard/jobs`, click "New Job" | Job creation form opens | | |
| 5.2 | Fill job details | Enter customer, address, services, date/time | All fields accept input | | |
| 5.3 | Save job | Submit the job form | Job saved and appears in job list | | |
| 5.4 | Assign worker to job | Select a Saldana & Sons worker for the job | Worker appears in assignments | | |
| 5.5 | Assign multiple workers | Add 2+ workers to the same job | All workers listed on job | | |
| 5.6 | View job list | Browse `/dashboard/jobs` | All company jobs listed with status | | |
| 5.7 | Filter jobs by status | Filter by scheduled/in_progress/completed | Only matching jobs shown | | |
| 5.8 | Edit job details | Open existing job, modify fields, save | Changes persisted | | |
| 5.9 | Cancel a job | Change job status to "cancelled" | Job marked cancelled, workers notified | | |
| 5.10 | Add job notes | Add internal notes to a job | Notes saved and visible to team | | |
| 5.11 | Job checklist | Add checklist items to a job | Items appear, can be marked complete | | |
| 5.12 | Complete checklist items | Check off items on job checklist | Items show as completed | | |
| 5.13 | Job photos | Upload before/during/after photos | Photos display in job record | | |
| 5.14 | Calendar view | Go to `/dashboard/schedule` | Jobs visible on calendar by date | | |
| 5.15 | Drag-and-drop scheduling | Drag a job to a new date on calendar | Job date updates | | |
| 5.16 | Job number auto-generation | Create a new job | Unique job number assigned automatically | | |

---

## 6. Quotes

Test the quoting system for Saldana & Sons estimates.

| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 6.1 | Create a new quote | Go to `/dashboard/quotes`, click "New Quote" | Quote form opens | | |
| 6.2 | Add line items | Add services/items with quantities and prices | Line items display with subtotals | | |
| 6.3 | Tax calculation | Verify tax is applied correctly | Tax based on California rate | | |
| 6.4 | Quote total | Check total after items + tax | Total calculates correctly | | |
| 6.5 | Save as draft | Save quote without sending | Quote saved with "draft" status | | |
| 6.6 | Quote number format | Check auto-generated quote number | Format: Q-YYYYMMDD-0001 | | |
| 6.7 | Send quote to customer | Click "Send" on a quote | Quote emailed to customer | | |
| 6.8 | Customer views quote | Open the public quote link | Quote displays correctly (no login needed) | | |
| 6.9 | Customer approves quote | Customer clicks "Approve" on public quote | Status changes to "approved" | | |
| 6.10 | Customer rejects quote | Customer clicks "Reject" on public quote | Status changes to "rejected" | | |
| 6.11 | Edit existing quote | Open a draft quote, modify, save | Changes persist | | |
| 6.12 | Delete a quote | Delete a draft quote | Quote removed from list | | |
| 6.13 | Convert quote to invoice | Approve a quote, convert to invoice | Invoice created with quote's line items | | |
| 6.14 | Quote expiration | Check expired quote behavior | Status shows "expired" after expiry date | | |
| 6.15 | View all quotes | Browse quote list | All quotes listed with status filters | | |

---

## 7. Invoices & Payments

Test invoicing and payment collection for Saldana & Sons.

| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 7.1 | Create a new invoice | Go to `/dashboard/invoices`, click "New Invoice" | Invoice form opens | | |
| 7.2 | Add line items | Add services with pricing | Line items calculated correctly | | |
| 7.3 | Invoice number format | Check auto-generated number | Format: INV-YYYYMMDD-0001 | | |
| 7.4 | Save invoice as draft | Save without sending | Invoice saved with "draft" status | | |
| 7.5 | Send invoice to customer | Click "Send" | Invoice emailed to customer | | |
| 7.6 | Customer views invoice | Open public invoice link | Invoice displays correctly (no login) | | |
| 7.7 | Record payment | Mark invoice as paid | Status updates to "paid", amount recorded | | |
| 7.8 | Partial payment | Record partial payment | Status shows "partial", balance remaining | | |
| 7.9 | Overdue invoice | Check invoice past due date | Status shows "overdue" | | |
| 7.10 | Payment via Stripe | Customer pays through Stripe link | Payment processed, invoice marked paid | | |
| 7.11 | Payment reminder | Trigger payment reminder for unpaid invoice | Reminder sent to customer | | |
| 7.12 | Edit draft invoice | Modify a draft invoice | Changes saved | | |
| 7.13 | View all invoices | Browse invoice list with filters | All invoices listed, filters work | | |
| 7.14 | Invoice from quote | Create invoice from approved quote | Line items carry over correctly | | |

---

## 8. Customer Management

Test the customer database for Saldana & Sons clients.

| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 8.1 | Add a new customer | Go to `/dashboard/customers`, click "Add Customer" | Customer form opens | | |
| 8.2 | Fill customer details | Enter name, email, phone, address | All fields accept input | | |
| 8.3 | Save customer | Submit the form | Customer saved and appears in list | | |
| 8.4 | View customer list | Browse `/dashboard/customers` | All company customers listed | | |
| 8.5 | Search customers | Use search bar to find customer by name | Matching results appear | | |
| 8.6 | Edit customer | Open customer record, modify details, save | Changes persist | | |
| 8.7 | Customer history | View customer's past jobs/quotes/invoices | History displays correctly | | |
| 8.8 | Add customer notes | Add internal notes to customer record | Notes saved and visible | | |
| 8.9 | Customer linked to job | Create a job for an existing customer | Customer info populates on job | | |
| 8.10 | Duplicate prevention | Try adding customer with same email | Warning or prevention of duplicate | | |

---

## 9. Lead Management

Test the lead pipeline for Saldana & Sons new business.

| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 9.1 | View leads | Go to `/dashboard/leads` | Lead list loads | | |
| 9.2 | Create a new lead | Add a lead manually | Lead saved with "new" status | | |
| 9.3 | Lead statuses | Change lead through: new > contacted > quoted > won | Each status change persists | | |
| 9.4 | Mark lead as lost | Change lead status to "lost" | Lead marked as lost | | |
| 9.5 | Assign lead to team member | Assign a lead to a Saldana & Sons worker | Assignment saved | | |
| 9.6 | Lead source tracking | Set source (website, referral, google, phone) | Source recorded on lead | | |
| 9.7 | Convert lead to customer | Win a lead and convert to customer record | Customer created from lead data | | |
| 9.8 | Lead follow-up notes | Add follow-up notes to a lead | Notes saved with timestamps | | |
| 9.9 | Filter/search leads | Filter by status or search by name | Correct results displayed | | |

---

## 10. Services Catalog

Test the service management for Saldana & Sons offered services.

| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 10.1 | View services | Go to `/dashboard/services` | Service list loads (if present) | | |
| 10.2 | Add a new service | Create a service (e.g., "Lawn Mowing") | Service saved with name and pricing | | |
| 10.3 | Pricing types | Set pricing as fixed / hourly / per sq ft | Each pricing type accepted | | |
| 10.4 | Set default duration | Enter default service duration | Duration saved | | |
| 10.5 | Deactivate a service | Toggle service to inactive | Service no longer appears in new jobs/quotes | | |
| 10.6 | Reactivate a service | Toggle inactive service back to active | Service available again | | |
| 10.7 | Edit service details | Modify name, price, or description | Changes persist | | |
| 10.8 | Service in quote | Add a service to a new quote | Service name and price populate correctly | | |
| 10.9 | Service in job | Add a service to a new job | Service attached to job record | | |

---

## 11. Team Management

Test team/worker management for Saldana & Sons crew.

| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 11.1 | View team members | Go to `/dashboard/team` | All team members listed | | |
| 11.2 | Invite a new worker | Send team invite via email | Invitation email sent | | |
| 11.3 | Worker accepts invite | New worker clicks invite link, sets up account | Worker added to Saldana & Sons account | | |
| 11.4 | Set worker role | Assign role: Owner / Admin / Worker | Role saved, permissions applied | | |
| 11.5 | Set hourly rate | Enter hourly rate for worker | Rate saved for payroll/costing | | |
| 11.6 | View team calendar | Check calendar view with team assignments | Workers' jobs visible on calendar | | |
| 11.7 | Deactivate team member | Deactivate a worker | Worker can no longer login, not available for assignments | | |
| 11.8 | Edit team member | Modify worker details | Changes persist | | |
| 11.9 | Role-based access | Login as Worker role, check restricted pages | Worker cannot access admin-only features | | |
| 11.10 | Owner permissions | Login as Owner role | Full access to all features | | |

---

## 12. Reviews (Jenny Reviews)

Test the automated review management system.

| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 12.1 | Review dashboard | Go to `/dashboard/reviews` | Review management page loads | | |
| 12.2 | Send review request | After completing a job, send SMS review request | Customer receives SMS with review link | | |
| 12.3 | Review request tracking | Check sent review requests | Shows sent/clicked/completed status | | |
| 12.4 | AI review response | Generate AI response to a review | Professional response generated | | |
| 12.5 | Negative review handling | Generate response for a negative review | Tactful, professional response created | | |
| 12.6 | Review metrics | View review stats on dashboard | Metrics display (sent, response rate, etc.) | | |

---

## 13. Smart Quoting (Jenny Quotes)

Test the AI-powered quoting feature.

| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 13.1 | Smart quote page | Go to `/dashboard/smart-quote` | AI quoting interface loads | | |
| 13.2 | Photo-based quote | Upload a photo of a job site | AI analyzes photo, suggests line items | | |
| 13.3 | Text-based quote | Describe a job in text | AI generates quote with appropriate items | | |
| 13.4 | Market-rate pricing | Check suggested prices | Prices align with market rates for the area | | |
| 13.5 | Edit AI suggestions | Modify AI-suggested line items | Changes applied, totals recalculated | | |
| 13.6 | Save smart quote | Save AI-generated quote | Quote saved to quote list | | |
| 13.7 | Send smart quote | Send the AI-generated quote to customer | Quote delivered via email | | |

---

## 14. AI Chatbot (Jenny Lite)

Test the AI chatbot / lead capture widget.

| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 14.1 | Chatbot config page | Go to `/dashboard/jenny-lite` | Configuration page loads | | |
| 14.2 | Chatbot widget | View chatbot on customer-facing page | Chat widget appears and responds | | |
| 14.3 | FAQ responses | Ask common service questions | Bot provides relevant answers | | |
| 14.4 | Lead capture | Provide name, phone, service need via chat | Lead created in system | | |
| 14.5 | Appointment booking | Request booking through chatbot | Appointment suggestion or booking created | | |
| 14.6 | Lead notification | New lead captured via chatbot | Notification sent to Saldana & Sons team | | |

---

## 15. Compliance & Shield Tools

Test California labor law compliance tools relevant to Saldana & Sons.

| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 15.1 | Shield dashboard | Go to `/dashboard/shield` | Compliance tools hub loads | | |
| 15.2 | Worker classification | Use ABC test tool | Interactive quiz determines employee vs. contractor | | |
| 15.3 | Penalty calculator | Go to penalty calculator, enter scenario | Waiting time penalties calculated correctly | | |
| 15.4 | Final wage rules | Check final wage guide | Correct payment deadlines shown by termination type | | |
| 15.5 | AB5 checklist | Go through AB5 compliance checklist | All items listed, can be checked/tracked | | |
| 15.6 | Compliance alerts | View compliance alerts from time tracking | Meal/rest break violations shown | | |
| 15.7 | HR toolkit | Go to `/dashboard/hr-toolkit` | HR resources and templates available | | |
| 15.8 | Compliance tracking | Go to `/dashboard/compliance` | Overall compliance status visible | | |

---

## 16. Booking System

Test the online booking for Saldana & Sons customers.

| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 16.1 | Booking page | Navigate to `/book/{companyId}` for Saldana & Sons | Booking form loads (no login needed) | | |
| 16.2 | Select service | Choose from available services | Service selected with pricing shown | | |
| 16.3 | Select date/time | Pick an available time slot | Slot highlighted, conflict check works | | |
| 16.4 | Enter contact info | Fill in customer name, phone, email, address | All fields accept input | | |
| 16.5 | Submit booking | Complete booking form | Confirmation shown, job/lead created | | |
| 16.6 | Booking appears in dashboard | Check jobs/leads in dashboard | New booking visible to Saldana & Sons team | | |
| 16.7 | Booking management | Go to `/dashboard/booking` | Bookings listed and manageable | | |

---

## 17. Website Builder

Test the website builder for Saldana & Sons online presence.

| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 17.1 | Website builder page | Go to `/dashboard/website-builder` | Builder interface loads | | |
| 17.2 | Select template | Choose a template for the trade | Template preview loads | | |
| 17.3 | Customize content | Edit business name, services, contact info | Changes reflected in preview | | |
| 17.4 | Mobile preview | Preview site in mobile view | Site is responsive and usable | | |
| 17.5 | Booking widget | Check if booking widget is embedded | Customers can book from website | | |
| 17.6 | Lead capture form | Submit a lead form on the website | Lead appears in dashboard | | |
| 17.7 | Save/publish site | Save and publish the website | Site accessible via URL | | |

---

## 18. Route Optimizer & Dispatch

Test routing and crew dispatch for Saldana & Sons daily operations.

| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 18.1 | Dispatch board | Go to `/dashboard/dispatch` | Dispatch view loads with today's jobs | | |
| 18.2 | View crew locations | Check worker locations on map | Workers' GPS positions shown | | |
| 18.3 | Route optimizer | Go to `/dashboard/route-optimizer` | Route planning interface loads | | |
| 18.4 | Optimize routes | Enter multiple job addresses | Optimized route order generated | | |
| 18.5 | Assign jobs from dispatch | Assign/reassign jobs to workers on dispatch board | Assignments update in real time | | |
| 18.6 | Job status on dispatch | Worker updates job status | Dispatch board reflects change | | |

---

## 19. Settings & Company Profile

Test settings and configuration for Saldana & Sons account.

| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 19.1 | Settings page | Go to `/dashboard/settings` | Settings page loads | | |
| 19.2 | Update company name | Change company name to "Saldana & Sons LLC" | Name updates across the platform | | |
| 19.3 | Update company address | Enter/change business address | Address saved | | |
| 19.4 | Update contact info | Change phone number and email | Contact info updates | | |
| 19.5 | Business logo upload | Upload company logo | Logo appears on quotes/invoices | | |
| 19.6 | Service area | Set service area / zip codes | Area saved for booking/dispatch | | |
| 19.7 | Tax rate settings | Verify California tax rate is applied | Correct tax on quotes/invoices | | |
| 19.8 | Notification preferences | Toggle email/SMS notifications | Preferences saved and applied | | |

---

## 20. Notifications & Communications

Test notifications and messaging features.

| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 20.1 | Email delivery | Send a quote via email | Customer receives the email | | |
| 20.2 | SMS delivery | Send review request via SMS | Customer receives the SMS | | |
| 20.3 | Welcome email | Invite a new team member | Welcome email received by new member | | |
| 20.4 | Quote approval notification | Customer approves a quote | Saldana & Sons team notified | | |
| 20.5 | Payment notification | Customer pays an invoice | Payment confirmation received | | |
| 20.6 | New lead notification | Lead submitted via booking/chatbot | Team notified of new lead | | |

---

## 21. Public Pages & Free Tools

Test pages accessible without logging in.

| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 21.1 | Homepage | Visit `/` | Homepage loads with features and pricing | | |
| 21.2 | Pricing page | Visit `/pricing` | Plans displayed (Starter, Pro, Elite) | | |
| 21.3 | Free penalty calculator | Visit `/tools/calculator` | Calculator works without login | | |
| 21.4 | Free worker classification | Visit `/tools/classification` | ABC test quiz works without login | | |
| 21.5 | Free AB5 checklist | Visit `/tools/checklist` | Checklist loads without login | | |
| 21.6 | Free final wage guide | Visit `/tools/final-wage` | Guide displays without login | | |
| 21.7 | Demo pages | Visit `/demo/dashboard` and other demo routes | Demo content loads without login | | |
| 21.8 | Public quote view | Open a quote's public link | Quote displays correctly | | |
| 21.9 | Public invoice view | Open an invoice's public link | Invoice displays correctly | | |
| 21.10 | Jenny feature page | Visit `/jenny` | Jenny AI features showcased | | |

---

## 22. Cross-Browser & Device Testing

Test the application across different environments.

| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 22.1 | Chrome (Desktop) | Full workflow in Chrome | All features function correctly | | |
| 22.2 | Safari (Desktop) | Full workflow in Safari | All features function correctly | | |
| 22.3 | Firefox (Desktop) | Full workflow in Firefox | All features function correctly | | |
| 22.4 | Edge (Desktop) | Full workflow in Edge | All features function correctly | | |
| 22.5 | iOS Safari (iPhone) | Test worker app and dashboard on iPhone | Mobile-optimized, all features usable | | |
| 22.6 | Android Chrome (Phone) | Test worker app and dashboard on Android | Mobile-optimized, all features usable | | |
| 22.7 | iPad / Tablet | Test dashboard on tablet | Responsive layout, no broken elements | | |
| 22.8 | Slow network (3G) | Throttle connection, test key flows | Pages load (slower), no crashes | | |

---

## 23. Performance & Reliability

Test application performance and data integrity.

| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 23.1 | Page load speed | Navigate between main pages | Pages load without excessive delay | | |
| 23.2 | Large data sets | Add 50+ jobs, check list performance | Lists render smoothly, pagination works | | |
| 23.3 | Concurrent users | Multiple Saldana & Sons workers logged in | No data conflicts, real-time sync works | | |
| 23.4 | Data persistence | Create records, log out, log back in | All data preserved | | |
| 23.5 | Error handling | Trigger errors (bad input, network loss) | User-friendly error messages, no crashes | | |
| 23.6 | Form validation | Submit forms with missing required fields | Validation errors shown before submission | | |
| 23.7 | Image upload limits | Upload very large photos | Handled gracefully (resized or error message) | | |

---

## 24. Security & Access Control

Test data isolation and access control for Saldana & Sons.

| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 24.1 | Multi-tenant isolation | Login as Saldana & Sons, check for other company data | Only Saldana & Sons data visible | | |
| 24.2 | Direct URL access | Try accessing another company's job by ID in URL | Access denied or 404 | | |
| 24.3 | Worker role restrictions | Login as Worker, try admin actions | Admin features blocked/hidden | | |
| 24.4 | Admin role access | Login as Admin, verify access | Can manage data but not billing | | |
| 24.5 | Owner full access | Login as Owner | All features accessible | | |
| 24.6 | Unauthenticated access | Visit `/dashboard` without login | Redirected to login page | | |
| 24.7 | API protection | Call API endpoints without auth token | 401/403 response | | |
| 24.8 | SQL injection | Enter `'; DROP TABLE --` in form fields | Input sanitized, no database impact | | |
| 24.9 | XSS prevention | Enter `<script>alert('xss')</script>` in text fields | Script not executed, input sanitized | | |

---

## Bug Report Template

When reporting issues, use this format:

```
Bug ID: [BETA-001]
Tester: [Your Name]
Date: [YYYY-MM-DD]
Test Case #: [e.g., 4.6]
Severity: Critical / High / Medium / Low
Summary: [One-line description]
Steps to Reproduce:
  1. ...
  2. ...
  3. ...
Expected Result: [What should happen]
Actual Result: [What actually happened]
Screenshots/Video: [Attach if possible]
Browser/Device: [e.g., Chrome 120 / iPhone 15]
```

---

## Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Beta Tester | | | |
| Team Lead | | | |
| QA Manager | | | |

---

*Saldana & Sons Beta Testing -- ToolTime Pro v1.0*
*Total Test Cases: 175*
