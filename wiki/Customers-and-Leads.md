# Customers & Leads

Track every customer relationship from first contact to repeat business. Manage leads through your sales pipeline and convert them into loyal customers.

---

## Customers

### Adding a Customer

1. Go to **Customers** in the sidebar
2. Click **+ Add Customer**
3. Fill in their details:
   - **Name** — Full name or business name
   - **Email** — For quotes, invoices, and communication
   - **Phone** — For calls and SMS
   - **Address** — Street, city, state, zip (for job site locations)
   - **Notes** — Any special details about this customer
   - **SMS Consent** — Whether they've opted in to text messages
4. Click **Save**

### Customer Dashboard

Your customer list shows key stats at the top:
- **Total Customers** — Your complete customer count
- **Active Jobs** — Jobs currently scheduled or in progress
- **Unpaid Invoices** — Outstanding balances
- **Total Revenue** — Lifetime revenue across all customers

### Searching & Filtering

- Use the **search bar** to find customers by name, email, or phone
- Customer cards show job count, invoice count, and quick action buttons

### Customer Actions

From any customer card, you can:
- **View Jobs** — See all jobs linked to this customer
- **Create Quote** — Start a new quote for them
- **Edit** — Update their contact information
- **Delete** — Remove the customer record

### SMS Consent Tracking

ToolTime Pro tracks SMS opt-in status with:
- Consent toggle (yes/no)
- Consent date timestamp
- Required for compliance with TCPA regulations

---

## Leads

Leads are potential customers who haven't booked yet. Track them through your sales pipeline from first contact to closed deal.

### Lead Sources

Leads come into your system from:
- **Online Booking** — Someone books through your website
- **Jenny AI Chatbot** — Jenny captures visitor info from your site
- **Manual Entry** — You add them yourself
- **Website Form** — Contact form submissions

### Adding a Lead

1. Go to **Leads** in the sidebar
2. Click **+ Add Lead**
3. Enter their details:
   - **Name** — Contact name
   - **Email** and **Phone**
   - **Service Requested** — What they're interested in
   - **Estimated Value** — Potential deal value
   - **Source** — Where the lead came from
   - **Notes** — Any context from the conversation
4. Click **Save**

### Lead Pipeline

Track each lead through your sales funnel:

| Status | Meaning |
|--------|---------|
| **New** | Just came in — needs first contact |
| **Contacted** | You've reached out, awaiting response |
| **Quoted** | You've sent a quote or estimate |
| **Booked** | They've committed to a job |
| **Won** | Deal closed, converted to customer |
| **Lost** | Didn't convert (track why for improvement) |

### Pipeline Stats

At the top of the Leads page, stat cards show how many leads are in each stage so you can see your pipeline health at a glance.

### Lead Actions

- **Call** — Quick-dial the lead's phone number
- **Convert to Customer** — One-click conversion that creates a full customer record
- **Delete** — Remove leads that are no longer relevant

### Converting Leads to Customers

When a lead is ready to become a customer:

1. Click the **Convert** button on their lead card
2. Their information is automatically copied to a new customer record
3. The lead status updates to "Won"
4. You can now create jobs, quotes, and invoices for them

---

## Importing Customers (CRM Migration)

<!-- AUTO-INJECTED by generate-wiki.js from src/lib/crm-field-mappings.ts — do not edit this section manually -->

Already have customers in another system? ToolTime Pro includes a self-service import wizard that migrates your customer data in minutes — no White-Glove setup required.

### How to Import

1. Go to **Customers** in the sidebar
2. Click **Import Customers** (or navigate to **Dashboard → Import Customers**)
3. **Select your source CRM** — choose from the supported platforms below, or pick "Generic CSV" for any spreadsheet
4. **Export your data** — follow the on-screen instructions to export a CSV from your old system
5. **Upload your CSV** — drag and drop or click to upload (max 10 MB)
6. **Map fields** — ToolTime Pro auto-detects column mappings; adjust any that need correction
7. **Preview** — review the first 10 rows, see valid vs. error counts
8. **Import** — click "Import" to bring in all valid rows

### Supported CRM Platforms

| Platform | Auto-Detected? | Export Path |
|----------|:--------------:|-------------|
| **Housecall Pro** | Yes | Customers → Export → CSV |
| **Jobber** | Yes | Clients → Export → CSV |
| **ServiceTitan** | Yes | Reports > Customer Reports → Export → CSV |
| **FieldPulse** | Yes | Contacts > Customers → Export → CSV |
| **GorillaDesk** | Yes | Customers → Export → CSV |
| **Workiz** | Yes | Contacts → Export → CSV |
| **Generic CSV / Spreadsheet** | Manual mapping | Any CSV with a header row |

### Imported Fields

| ToolTime Pro Field | Required? | Notes |
|--------------------|:---------:|-------|
| **Full Name** | Yes | Or separate First + Last Name columns (auto-combined) |
| **Email** | No | Used for quotes, invoices, and communication |
| **Phone** | No | Normalized to (XXX) XXX-XXXX format |
| **Street Address** | No | Job site / mailing address |
| **City** | No |  |
| **State** | No | 2-letter abbreviation (e.g. CA, TX) |
| **ZIP Code** | No |  |
| **Notes** | No | Multiple note-like columns are merged |
| **Lead Source** | No | Where the customer originally came from |

### Duplicate Handling

- By default, **Skip Duplicates** is enabled — customers that already exist (matched by email or phone) are skipped
- You can uncheck this option during the preview step if you want to allow duplicates
- The import summary shows exactly how many rows were imported, skipped, or failed

### Tips for a Smooth Import

1. **Clean your CSV first** — remove test rows, blank rows, or internal notes
2. **Use the preview step** — check the first 10 rows before committing
3. **State abbreviations** — use 2-letter codes (CA, not California) to avoid validation errors
4. **Phone numbers** — any format works (the importer normalizes them automatically)
5. **Large lists** — the importer handles files up to 10 MB, which covers thousands of customers

---

## How Customers & Leads Connect to Other Features

```
Lead → Convert → Customer → Quote → Job → Invoice
                     ↑
              Online Booking (auto-creates both)
              Jenny AI (captures lead info)
```

- **Quotes** are linked to customers — see all quotes sent to a customer
- **Jobs** are linked to customers — track service history
- **Invoices** are linked to customers — track payment history
- **Online Booking** auto-creates both a lead and a customer record
- **Jenny AI** captures lead information and can auto-create leads

---

## Tips

1. **Follow up on new leads within 1 hour** — Response time is the #1 factor in conversion
2. **Use the pipeline view** to identify stale leads that need attention
3. **Track lead sources** to know which marketing channels work best
4. **Keep customer notes updated** — Your team will thank you on the next visit
5. **Enable SMS consent** during the first interaction for future communication

---

## Need Help?

- **Email:** support@tooltimepro.com
- **Phone:** 1-888-980-8665
- **Live Chat:** Click the chat icon in your dashboard
