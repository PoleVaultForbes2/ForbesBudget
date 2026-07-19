# Authentication setup

1. In Supabase, open **SQL Editor** and run `supabase/migrations/202607190001_multi_user_auth.sql`.
2. In **Authentication > Providers > Email**, keep email/password enabled. For the least friction, email confirmation may be disabled for this private app; if enabled, new users must confirm their email before their first login.
3. Set **Authentication > URL Configuration** to the deployed site URL and add the local Vite URL as an allowed redirect URL.
4. Create/sign up the account that should own the existing budget, copy its User UID from **Authentication > Users**, replace the placeholder in `supabase/assign_legacy_data.sql`, and run that script once.
5. Recommended Auth security settings: minimum password length 8, leaked-password protection on, CAPTCHA on sign-up if the site is publicly reachable, and a restrictive sign-up policy once the small intended user list has registered.

The browser only receives the Supabase anon/publishable key. That key is safe to expose when Row Level Security is enabled; never put the service-role key in a `VITE_` environment variable.
