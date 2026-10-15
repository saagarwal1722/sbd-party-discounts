# Shree Balaji Decor — Party Discount Manager

A mobile-friendly web app for maintaining one general discount per party, with city filters, name/phone search, exact/minimum/range discount filters, add/edit/delete, and Excel import/export. Records are stored in Supabase (cloud database).

## What you need
- A free GitHub account
- A free Vercel account
- A free Supabase account
- A web browser

No local coding environment is required if you use GitHub's browser upload flow. The first setup is easiest on a laptop/desktop.

## Step 1 — Create the cloud database in Supabase
1. Open https://supabase.com and create a project.
2. Give it a name such as `sbd-party-discounts`. Save the database password somewhere safe.
3. Wait for the project to finish setting up.
4. Open **SQL Editor** → **New query**.
5. Open the `supabase/schema.sql` file from this project, copy all its contents, paste into the SQL Editor, and click **Run**.
6. In Supabase, open **Project Settings → API** (or **Data API / API Keys**, depending on the dashboard layout).
7. Copy the **Project URL** and the **publishable key** (or legacy `anon` public key). Never use or expose the `service_role` or secret key in this app.

## Step 2 — Upload this project to GitHub
1. Open https://github.com and create a new repository named `sbd-party-discounts`.
2. Keep it private if you prefer; Vercel can deploy a private repository when connected.
3. On the new repository page, choose **Add file → Upload files**.
4. Extract this ZIP on your computer first, then upload the files and folders *inside* the extracted folder. Make sure `package.json`, `app/`, and `supabase/` appear at the repository's top level.
5. Commit the upload.

## Step 3 — Deploy on Vercel
1. Open https://vercel.com and sign in with GitHub.
2. Click **Add New → Project**, select `sbd-party-discounts`, and import it.
3. Before deploying, open **Environment Variables** and add these two variables:
   - `NEXT_PUBLIC_SUPABASE_URL` = your Supabase Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your Supabase publishable/anon key
4. Click **Deploy**. Wait for the build to complete.
5. Open the deployed URL. If you see “Connect your database”, check that the two variables were entered exactly and redeploy.

## Step 4 — Create your owner login
1. On the deployed app's sign-in screen, enter your business email and a strong password (8+ characters).
2. Click **Create a new account**.
3. If Supabase asks you to confirm your email, open the confirmation email and follow the link. If the link takes you to an unexpected localhost URL, configure Supabase **Authentication → URL Configuration**:
   - Site URL: your Vercel app URL, e.g. `https://your-project.vercel.app`
   - Add that same URL to Redirect URLs.
   Then request a new confirmation email if needed.
4. Sign in. Add a test party and verify it remains after refreshing the page.
5. Once your owner account works, consider turning off public sign-ups in Supabase Authentication settings. Do not share your login.

## Step 5 — Use the app
- **Add party:** party name, city and general discount are required. Phone and notes are optional.
- **Edit:** use the pencil icon on a party row.
- **Delete:** use the trash icon. It asks for confirmation.
- **Search:** matches party name or phone number.
- **City filter:** select a city or “All cities”.
- **Discount filter:** any, exactly, minimum, or a range. For a range, enter both the starting and ending percentages.
- **Export Excel:** exports the currently filtered results.
- **Import Excel:** imports rows from the first worksheet. Expected columns: `Party Name`, `City`, `Discount (%)`, `Phone`, `Notes`. `Name`, `Discount`, and `Discount %` are also accepted aliases. Rows with missing name/city or invalid discount are skipped. Import adds rows; it does not merge or overwrite existing records.

## Important privacy and data notes
- Supabase stores your party data in the cloud so you can access it on different devices.
- This starter database policy allows any authenticated account in this Supabase project to access the records. For a single-owner setup, turn off public sign-ups after creating your account and do not share the owner login. If multiple staff need separate accounts, tighten the database policies before inviting them.
- Do not place the Supabase service-role/secret key in Vercel's `NEXT_PUBLIC_` variables or in frontend code.
- Export regular backups using the Excel export button.
- The import currently adds rows and does not automatically detect duplicates. Review your sheet before importing.

## If deployment fails
- Check Vercel → Project → Deployments → latest deployment → Build Logs.
- Ensure `package.json` is at the repository root, not inside an extra nested folder.
- Ensure both environment variables are set with no quotes or spaces around the values, then redeploy.
- For “Invalid API key” or database errors, re-copy the Project URL and publishable/anon key from Supabase.
