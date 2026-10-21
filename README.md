# WarrantyVault

A mobile-first warranty and receipt organizer built with React, Tailwind CSS, Vite, and optional Supabase. The MVP includes receipt OCR, editable purchase and warranty details, an expiry-sorted dashboard with status colors, browser reminders at 30/7/1 days, and a claim email helper.

## Run locally

```bash
npm install
npm run dev
```

The app opens in **demo mode** with sample items and local browser storage. Receipt images can be OCR-scanned locally with Tesseract.js. No receipt image is sent to a third-party OCR service. Demo-mode records are saved in this browser only.

## Supabase setup

1. Create a Supabase project.
2. Run [`supabase/schema.sql`](supabase/schema.sql) in the SQL editor.
3. Copy `.env.example` to `.env.local` and add the project URL and anon key.
4. In Supabase Auth, enable email OTP and Google OAuth as desired. Configure the site's redirect URL.
5. Restart Vite. Sign-in, user-owned items, private receipt uploads, and reminder records will use Supabase.

Reminder rows are created for 30, 7, and 1 day before expiry. Browser notifications work after permission is granted while WarrantyVault is open. For background notifications or email delivery while the app is closed, connect a scheduled Supabase Edge Function and an email/push provider; provider credentials are intentionally not stored in the browser app.

## MVP notes

- OCR supports receipt images (JPG, PNG, WebP) in the browser. PDF receipts can be stored, but are not OCR-scanned by this client flow.
- OCR is best-effort; always verify the extracted fields before saving.
- The claim helper prepares the email recipient, subject, and message. Browsers do not let web apps silently attach files to `mailto:` drafts, so it reminds the user to attach the stored receipt.
- Brand support email is entered by the user when adding an item. No external support-contact directory is configured in the MVP.

## Stack

- React 18 + Vite
- Tailwind CSS (with project-specific styling)
- Tesseract.js OCR
- Supabase Auth, Postgres, and private Storage (optional)
