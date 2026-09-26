# Email sign-in: Supabase settings

Email sign-in was added on 26 Sep 2026 for people who can't reach Google, which covers most of mainland China. The code is in `src/components/SignInDialog.tsx`, `src/lib/supabase/sign-in.ts` and `src/app/auth/callback/route.ts`. The site side is done. Email sign-in works only once the four dashboard steps below are also done.

## 1. Run the SQL

Run `email_signin.sql` in the SQL editor. It stops new accounts from getting the part of their email address before the @ as their public name.

## 2. Turn on the Email provider

Go to Authentication → Sign In / Providers → Email and switch it on. Leave "Confirm email" on. You don't need to change "Secure email change".

## 3. Custom SMTP (required)

Supabase's built-in mailer only sends to members of your Supabase team, and only a few emails an hour. Everyone else gets an error, which the dialog shows as "Signing in by email isn't available yet."

- **Set up a sender.** Resend is the easiest: it has a free tier and Supabase has a one-click integration. Add fuzhounese.org as a domain in Resend and put the DNS records it gives you (SPF, DKIM, and ideally DMARC) at your registrar. These records matter for Chinese mailboxes like QQ and 163, which send unauthenticated mail to junk.
- **Add it to Supabase.** Go to Authentication → Emails → SMTP Settings and enter the Resend SMTP details. Use the sender `Fuzhounese Dictionary <signin@fuzhounese.org>`.
- **Raise the email rate limit.** Go to Authentication → Rate Limits, find "Rate limit for sending emails" and raise it from its default to something like 100 an hour.

## 4. Email templates (put the code in the email)

Go to Authentication → Emails → Templates. Paste the template below into **both** "Magic Link" and "Confirm signup". A first-time address gets the Confirm signup email; everyone after that gets Magic Link.

Subject:

```
Your Fuzhounese Dictionary sign-in code 登入驗證碼
```

Body:

```html
<div style="font-family: Georgia, serif; font-size: 16px; line-height: 1.5; color: #16150F; max-width: 480px">
  <p>Your sign-in code for the Fuzhounese Dictionary:<br>你的福州話辭典登入驗證碼：</p>
  <p style="font-size: 32px; font-weight: bold; letter-spacing: 6px; margin: 16px 0">{{ .Token }}</p>
  <p>Type it into the sign-in box, or <a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email" style="color: #C22E1B">sign in with this link</a>.<br>
     請在登入框輸入驗證碼，或<a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email" style="color: #C22E1B">點這個連結登入</a>。</p>
  <p style="color: #6B6858; font-size: 13px">If you didn't ask to sign in, ignore this email.<br>如果你沒有要求登入，請忽略這封郵件。</p>
  <p style="color: #6B6858; font-size: 13px">fuzhounese.org</p>
</div>
```

Why this link and not the default one: `{{ .ConfirmationURL }}` only works in the browser that asked for the code. The link above goes to `/auth/callback` with a `token_hash`, which the server checks, so it works on any device.

`{{ .RedirectTo }}` is the site's `/auth/callback?next=…` address. It is the same address Google sign-in returns to, so it's already under Authentication → URL Configuration → Redirect URLs. If an emailed link ever lands on a broken address, check that list first.

## Check it

1. Open the site in a private window, click Sign in, enter an address and press "Email me a sign-in code".
2. You should get the email within a minute. Typing the code should sign you in.
3. Test the link in the same email as well, opened on a phone.
4. New accounts appear under Authentication → Users with the provider "email".

Someone who already signed in with Google and later uses email with the same address lands on the same account, because Supabase links the two.

## Limits

The code is valid for an hour and can be used once. A new code can be requested every 60 seconds. To change either, go to Authentication → Sign In / Providers → Email ("Email OTP expiration") or Rate Limits.

Getting past Google doesn't guarantee the site is reachable from mainland China. The site is on Vercel and the database is on Supabase, and both are usually reachable there, often slowly. If people in China report problems, the next step would be a China-friendly CDN in front of the site.
