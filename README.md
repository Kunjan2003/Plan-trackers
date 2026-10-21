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
5. To enable household sharing, rerun `supabase/schema.sql` to apply warranty-source, claim-detail, and item-sharing columns and RLS policies. Deploy `supabase/functions/share-item/index.ts` with `supabase functions deploy share-item` and set the Edge Function secret `APP_URL` to your app's deployed origin (add `RESEND_API_KEY` and `RESEND_FROM_EMAIL` to send invitations).
6. Sharing is per item. The invited person must have a WarrantyVault account. Owners can grant view or edit access and revoke it later; only owners can delete items or manage sharing. Shared editors can edit product details but cannot replace the owner's receipt.

## Background email reminders

Browser notifications only run while WarrantyVault is open. To email users when the app is closed:

1. Verify a sender domain with Resend.
2. Set Edge Function secrets: `CRON_SECRET`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL` (for example, `WarrantyVault <warranty@example.com>`), and `APP_URL` (your deployed app origin).
3. Set `APP_URL` as an Edge Function secret with `supabase secrets set APP_URL=https://your-app.example` and deploy the function: `supabase functions deploy send-warranty-reminders`.
4. In Supabase Vault, add `project_url`, `publishable_key`, and `warranty_cron_secret` (the value must equal `CRON_SECRET`).
5. Run `supabase/schedule-reminders.sql` in the SQL editor. The scheduled function checks daily at 09:00 UTC.
6. In app Settings, enable email reminders and set the destination address.

The scheduler claims each due reminder before sending and marks it sent, skipped, or failed. Abandoned claims are retried after 30 minutes. Reminder emails include the item name, expiry, a direct claim-helper button, and a seven-day signed receipt link when available. It uses the Supabase service role only inside the Edge Function; never place that key in the frontend.

## Features

- Quick add with optional details, receipt photo upload, side-by-side OCR review, and editable product, store, date, and price fields
- Warranty source tracking (receipt, manufacturer, or user entered) so users can verify coverage confidently
- Serial number and issue details carried into a claim checklist and generated email
- Duration-based or exact-date warranty entry and an expiry-sorted dashboard
- Green active, amber expiring within 30 days, and red expired states
- Browser alerts and configurable 30/7/1-day email reminder records
- Claim message preview, copy, mailto draft, or `.eml` download with receipt attachment
- Search, category/status filters, item editing, light/dark appearance, and INR/USD/EUR/GBP currency
- CSV and PDF exports plus a ZIP backup with a versioned manifest and receipts; restore merges records and skips duplicates
- Clear local-only versus account-sync status and household sharing for selected items
- Secure email magic-link / Google auth when Supabase is configured

## Notes

- The starter dashboard has demo data. Add your own purchases or remove the samples before connecting an account.
- PDF receipts can be stored and exported; OCR currently scans image files only.
- Web browsers do not allow attaching a file automatically to a `mailto:` draft. Download the `.eml` from Claim Helper for a message file with the receipt attached, or attach it manually to the opened draft.
- Brand support contact details are entered per item. The app does not guess support addresses.
- Local demo data is stored in this browser and is not automatically synced. Download a ZIP backup before clearing browser storage or moving devices.
- Household sharing uses private RLS-protected database rows and private receipt storage. Sharing email invitations require the Resend and `APP_URL` secrets; the invited account must already exist.
- The schema and functions configure app infrastructure, but background email delivery requires a Resend account, verified sender, and the setup steps above.
