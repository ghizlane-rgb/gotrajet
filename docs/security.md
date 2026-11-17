# GOTRAJET security

What protects the service, and how to put Cloudflare in front of it.

## Built into the app

| Threat | Protection |
| --- | --- |
| Stolen or guessed passwords | scrypt hashing; common passwords and passwords containing the name/e-mail refused; login limited to 8 tries / 15 min per account and 30 per IP; failed logins logged. |
| Robots creating accounts or trying passwords | Cloudflare Turnstile on sign-up, login and password reset (when keys are set). |
| Stolen admin password | Admins must enter a 6-digit code from an authenticator app (`ADMIN_REQUIRE_2FA`, on in production). A code works once. Optional IP allow-list (`ADMIN_ALLOWED_IPS`). Every admin action is in the audit log. |
| Session theft | Session cookie is `HttpOnly`, `Secure` (production) and `SameSite=Lax`. Password change/reset, suspension and 2FA activation log out every session. |
| Forged requests from another website (CSRF) | Any POST/PUT/PATCH/DELETE whose `Origin` is another site is refused. |
| Injected scripts (XSS) | All user text is escaped before display, plus a strict Content-Security-Policy: only the site's own scripts (and the one inline line, by hash), no `eval`, no plugins, cannot be framed by other sites. |
| Seeing or changing someone else's data | Every action checks ownership (sender, traveller, admin). The handoff code is shown only to the sender; contacts appear only after acceptance. |
| Money manipulation | Amounts in centimes on a ledger; prices computed on the server, never trusted from the browser; escrow released only with the recipient's code (5 tries); payouts limited to real earnings; cash agency webhooks signed (HMAC) and idempotent; sandbox payments refused in production. |
| Malicious uploads | Only real JPG/PNG/WebP/PDF (checked by content), 5 MB max, random names, stored outside the website, viewable only by admins. |
| Oversized requests | Refused above 6 MB. |
| Misconfiguration | With `ENV=prod` the server will not start without `SECRET_KEY` or with sandbox payments; API docs are hidden; HSTS is sent. |

## Cloudflare set-up (free plan is enough to start)

You need: a Cloudflare account, the domain (`gotrajet.ma`) and access to its registrar.

1. **Add the site** in Cloudflare → choose the Free plan → Cloudflare gives you two *nameservers*.
2. **At the registrar**, replace the domain's nameservers with Cloudflare's. Activation takes from minutes to 24 h.
3. **DNS**: create `A` (or `CNAME`) records for `gotrajet.ma` and `www` pointing to the server, with the **orange cloud ON** (proxied). This hides the server's real address.
4. **SSL/TLS** → mode **Full (strict)**. Enable **Always Use HTTPS**, **Automatic HTTPS Rewrites**, minimum TLS **1.2**.
5. **Security** → enable **Bot Fight Mode**. Keep the WAF *managed rules* on.
6. **Rate limiting rule** (Security → WAF → Rate limiting): path starts with `/api/auth/` → more than 20 requests per minute per IP → Block for 10 minutes.
7. **Optional custom rule**: path starts with `/admin` or `/api/admin` and country is not Morocco → Managed Challenge (or Block, plus `ADMIN_ALLOWED_IPS`).
8. **Cache**: leave the default. The app already sends `no-store` on `/api/` and `/admin`.
9. **Turnstile** (dashboard → Turnstile → Add site, domain `gotrajet.ma`, mode *Managed*): copy the keys into `TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY`, then restart. The check then appears on the sign-in forms automatically.
10. **Lock the server to Cloudflare**: on the server's firewall, allow ports 80/443 **only** from [Cloudflare's IP ranges](https://www.cloudflare.com/ips/). Then, and only then, set `TRUST_CLOUDFLARE=true` so rate limits use the visitor's real IP from `CF-Connecting-IP`. (Without the firewall lock, anyone could fake that header.)

## Still to do before launch

- [ ] An outside security test (penetration test) before handling real money; ask the payment partner, they often require one.
- [ ] Back-ups encrypted, stored elsewhere, and a restore tested.
- [ ] Error monitoring and alerts on repeated failed logins.
- [ ] Rate limits shared between servers (Redis) if you run more than one server.
- [ ] Pin exact package versions in `backend/requirements.txt` and update them monthly.
- [ ] Each team member gets their own admin account; never share one.
