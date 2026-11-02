# Echo.TGPCOP recruitment setup

The static application page uses the existing Supabase URL and publishable/anon key from `env.js`. Applicants must sign in with Google first; the page fills and locks the account email. The `submit-team-application` Edge Function independently validates the bearer session and matches the email before writing. The service-role key is used only by Supabase as a server secret and must never be put in `env.js` or Vercel frontend variables.

## 1. Check the database, then run the SQL

The Supabase connection currently available to Codex does not grant access to the project referenced in `supabase.sql` (`gdwfptmtvzdfjcduhcvg`). No live table schema was inspected or changed. In that project's Supabase Dashboard, first inspect `public.echo_team_applications` if it already exists. If it is absent, run [`recruitment.sql`](recruitment.sql) in SQL Editor. If a table by that name already exists, compare its columns/policies first and adapt the migration instead of assuming its schema.

The SQL creates the private application table and photo bucket, RLS admin policies, and the private rate-limit ledger. Public `anon` and ordinary authenticated users cannot read or insert applications. Only the server-side Edge Function can insert; admins can select/update through their authenticated session.

## 2. Deploy the Edge Function

From the repository root, with the Supabase CLI installed and authenticated:

```powershell
supabase login
supabase link --project-ref gdwfptmtvzdfjcduhcvg
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
supabase functions deploy submit-team-application --no-verify-jwt
```

Set the service role key as a Supabase Function secret only. Deploy with `--no-verify-jwt` so the Supabase gateway allows the browser's unauthenticated CORS `OPTIONS` preflight. The function itself requires and verifies a Google session JWT on every `POST`, matches its email to the application, then validates the input, declarations, honeypot and IP request limit before writing. If deployed from the Supabase Dashboard, turn off gateway JWT verification for this function, then redeploy the code.

In Supabase Dashboard → Authentication → URL Configuration, add the production join page to Redirect URLs (for example `https://www.echotgpcopmedia.site/join-us`, plus the apex domain if it is used). Ensure Google is enabled as an Auth provider. Add any local development redirect URL only while testing locally.

## 3. Give admins access

In SQL Editor, grant the role only to each approved admin's exact Google sign-in email (replace the placeholder):

```sql
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"echo_admin"}'::jsonb
where email = 'approved-admin@example.com';
```

Have the user sign out and back in to refresh the JWT. The private admin page is `/applications-admin`; its database queries are still protected by RLS. Do not assign this app metadata role to applicants.

## Notes

- `join-us.html` is the compact four-step public form. Applicants provide a valid Instagram profile URL; tool choices use the supplied Canva/Adobe/DaVinci/CapCut/VN logos.
- Motivation questions were removed from the shorter form; the SQL keeps those old columns nullable for compatibility with submissions made before the form change.
- `/applications-admin` provides search, department/experience filters, full application detail, status/notes updates, private signed photo access, and CSV export.
- The repo has no configured secure mail provider or recruitment recipient. Email confirmation/team notification is therefore not enabled; successful database submissions still return the application reference ID.
- Apply the SQL and deploy the Edge Function before publishing the static page. No live Supabase changes were made from this session.
