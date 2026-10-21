# WarrantyVault

A polished, mobile-first receipt and warranty organizer. Add purchases from a receipt photo, review OCR results, track warranty expiry, prepare claim emails, and export your data.

## Run locally

```bash
npm install
npm run dev
```

Without Supabase credentials, the app opens in demo mode with example purchases. Your added items and settings stay in this browser; uploaded receipts use IndexedDB. Receipt images are scanned locally with Tesseract.js. OCR is best-effort, so confirm every extracted field before saving.

## Supabase setup

1. Create a Supabase project and run `supabase/schema.sql` in its SQL editor.
2. Copy `.env.example` to `.env.local`, add the project URL and publishable/anon key, then restart Vite.
3. Enable email OTP and/or Google in Supabase Auth and add your deployed app URL to allowed redirect URLs.
4. Deploy the app. Authenticated items, private receipt storage, settings, and reminder records will sync through Supabase.

## Background email reminders

Browser notifications only run while WarrantyVault is open. To email users when the app is closed:

1. Verify a sender domain with Resend.
2. Set Edge Function secrets: `CRON_SECRET`, `RESEND_API_KEY`, and `RESEND_FROM_EMAIL` (for example, `WarrantyVault <warranty@example.com>`).
3. Deploy the function: `supabase functions deploy send-warranty-reminders`.
4. In Supabase Vault, add `project_url`, `publishable_key`, and `warranty_cron_secret` (the value must equal `CRON_SECRET`).
5. Run `supabase/schedule-reminders.sql` in the SQL editor. The scheduled function checks daily at 09:00 UTC.
6. In app Settings, enable email reminders and set the destination address.

The scheduler claims each due reminder before sending and marks it sent, skipped, or failed. It uses the Supabase service role only inside the Edge Function; never place that key in the frontend.

## Features

- Receipt photo upload and client-side image OCR with editable product, store, date, and price fields
- Duration-based or exact-date warranty entry and an expiry-sorted dashboard
- Green active, amber expiring within 30 days, and red expired states
- Browser alerts and configurable 30/7/1-day email reminder records
- Claim message preview, copy, mailto draft, or `.eml` download with receipt attachment
- Search, category/status filters, item editing, light/dark appearance, and INR/USD/EUR/GBP currency
- CSV and PDF exports plus a ZIP backup containing receipt files
- Secure email magic-link / Google auth when Supabase is configured

## Notes

- The starter dashboard has demo data. Add your own purchases or remove the samples before connecting an account.
- PDF receipts can be stored and exported; OCR currently scans image files only.
- Web browsers do not allow attaching a file automatically to a `mailto:` draft. Download the `.eml` from Claim Helper for a message file with the receipt attached, or attach it manually to the opened draft.
- Brand support contact details are entered per item. The app does not guess support addresses.
- The schema and function configure the app infrastructure, but email delivery requires a Resend account, verified sender, and the setup steps above.
