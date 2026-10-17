# Supabase setup

The initial schema migration is at `migrations/20261017000000_initial_schema.sql`.

## Apply the schema

Open the project's Supabase Dashboard → SQL Editor → New query, paste the entire migration file and run it. Verify that the tables appear under Table Editor. This migration is designed to be re-runnable for policies/triggers and seeds a small set of virtual shop items; review the file before applying it to an existing production database.

## Authentication

Email/password signup is enabled in the project. For local development set Site URL to `http://localhost:5173`. Add the final production HTTPS URL to Site URL and Redirect URLs after hosting is deployed.

## Admin access

Create a user through the app and verify the email first. Then run the owner bootstrap SQL shown in `../frontend/README.md`. Do not add an admin role to an unverified or unrelated account.

## Security notes

- RLS is enabled on all application tables.
- Public browser configuration uses only the publishable key.
- Wallet transactions and inventory cannot be written directly by normal browser clients.
- Shop purchases use a database function that checks auth, ownership, active item state and balance while locking the user's profile row.
- Never put service-role/secret keys or database passwords in the web bundle or Git.
