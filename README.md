# Wardrobe

A subscription web app built from the Wardrobe Lookbook. People sign up, photograph their clothes, and get a
lookbook of their own closet, with AI tagging, outfit suggestions, a closet review, and affiliate "Shop this"
links for pieces they're missing.

- **Stack:** Next.js 16 (App Router) · Supabase (sign-in, Postgres, photo storage) · Stripe (monthly billing) · Claude API (AI) · Vercel (hosting)
- **Plans:** Free (30 pieces, no AI) · Pro $7/month (unlimited pieces, AI with monthly caps). Edit both in `src/lib/plans.ts`; the 30-piece limit is also in `supabase/migrations/0001_init.sql`.

## What's in it

The app has three sections.

**Closet:** everything you own.
| Page | What it does |
|---|---|
| `/closet` | All pieces: category and status filters, search, piece details, keep / tailor / donate, favorites, notes, outfit tray |
| `/closet/add` | Upload photos. Pro: AI fills in category, type, color and details and flags duplicates. Codes like `LS-53` are assigned automatically |
| `/closet/review` | AI closet review: summary, piece-by-piece advice, and "What's missing" with shop links |

**My Style:** what you want to look like.
| Page | What it does |
|---|---|
| `/style` | Style board: drop in photos of looks you like. Pro: the AI names each look and lists its key pieces; "Get this look" opens the stylist |
| `/style/me` | Up to 6 photos of yourself; the AI writes editable styling notes (colors and fits that suit you). Plus your style in your own words |
| `/style/stylist` | Chat with the AI stylist. It knows your closet, board and notes, shows the pieces it mentions, accepts a photo, and links anything to buy |

**Outfits:** what to wear.
| Page | What it does |
|---|---|
| `/outfits` | Request outfits for any occasion. Suggestions come back with Save / Dismiss; every garment you're missing shows as a "+ to buy" tile with shop links |

Other pages: `/` landing and pricing, `/login`, `/settings` (plan, AI usage, billing), `/admin` (owner-only numbers), `/disclosure`, and `/go/<id>?r=amazon` (the affiliate redirect).

**Photos of the user:** stored in the private bucket, sent to the Claude API only for that user's styling notes, deletable anytime.
The prompt limits the AI to color and fit guidance (no rating of looks, no guessing age, weight, ethnicity or health).

### How affiliate revenue works

1. The AI suggests pieces to buy in three places: an outfit's missing garments, the stylist chat, and closet-review gaps.
2. Each suggestion is stored in `shop_suggestions` with a search query (e.g. "mens navy slim chinos").
3. "Shop this" links point to `/go/<suggestion id>?r=<retailer>`. That route logs a row in `affiliate_clicks`,
   then redirects to the retailer's search results with your tracking:
   - **Amazon:** `&tag=AMAZON_ASSOCIATE_TAG` is added to the URL.
   - **Nordstrom, Uniqlo, J.Crew (and any retailer you add):** wrapped in a Skimlinks or Sovrn redirect, which
     turns ordinary links into affiliate links for thousands of merchants. The suggestion ID goes along as the sub-ID.
4. Commissions are paid by Amazon / Skimlinks / Sovrn and show in their dashboards. `/admin` shows clicks.

Add or change retailers in `src/lib/retailers.ts`. Links are marked `rel="sponsored"`, and the footer and
`/disclosure` page carry the FTC disclosure and Amazon's required "As an Amazon Associate…" line. Keep them.

## Setup (about an hour, once)

### 1. Supabase (accounts, database, photos)
1. Create a project at supabase.com.
2. **SQL Editor** → run `supabase/migrations/0001_init.sql`, then `0002_my_style.sql`. This creates the tables,
   security rules, the free-plan limit and the private `closet` photo bucket.
3. **Authentication → URL Configuration:** set Site URL to your domain and add `https://YOUR-DOMAIN/auth/callback`
   (and `http://localhost:3000/auth/callback`) to Redirect URLs.
4. **Project Settings → API:** copy the URL, anon key and service-role key into your env vars.

### 2. Stripe (monthly billing)
1. **Products** → add "Wardrobe Pro", recurring, $7/month. Copy the **price ID** (`price_…`) to `STRIPE_PRO_PRICE_ID`.
2. **Developers → API keys** → copy the secret key to `STRIPE_SECRET_KEY`.
3. **Developers → Webhooks** → add endpoint `https://YOUR-DOMAIN/api/stripe/webhook` with events
   `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`,
   `customer.subscription.deleted`. Copy the signing secret to `STRIPE_WEBHOOK_SECRET`.
4. **Settings → Billing → Customer portal** → turn it on (lets people cancel and change cards).
5. Use test mode first; switch the keys to live when you launch.

For local testing: `stripe listen --forward-to localhost:3000/api/stripe/webhook`.

### 3. Claude API
Create a key at console.anthropic.com and set `ANTHROPIC_API_KEY`. Each Pro user's AI use is capped per month
(500 photo tags, 100 outfit requests, 300 stylist messages, 150 style-photo reads, 20 reviews) in `src/lib/plans.ts`.
Estimated spend shows on `/admin`.

### 4. Affiliate programs (optional, apply any time)
- **Amazon Associates** (affiliate-program.amazon.com) → `AMAZON_ASSOCIATE_TAG`.
- **Skimlinks** (skimlinks.com) or **Sovrn Commerce** (sovrn.com) → `SKIMLINKS_PUBLISHER_ID` or `SOVRN_API_KEY`.
  Both review your site before approving, so apply once it's live.

### 5. Deploy on Vercel
1. Import this GitHub repo at vercel.com/new.
2. Add every variable from `.env.example` under **Settings → Environment Variables**.
3. Deploy, then update `NEXT_PUBLIC_SITE_URL`, the Supabase redirect URLs and the Stripe webhook to the real domain.

## Local development

```bash
npm install
cp .env.example .env.local   # then fill it in
npm run dev
```

## Import the original lookbook (154 pieces)

Sign up in the app with your email first, then:

```bash
node --env-file=.env.local scripts/import-lookbook.mjs you@example.com scripts/lookbook-export/lookbook.html
```

This comps your account to Pro, uploads every photo, creates the pieces with their original codes, and imports
saved outfits from `scripts/lookbook-export/outfits/`. The export folder holds personal photos and is git-ignored.

## Project map

```
supabase/migrations/0001_init.sql   tables, row-level security, free limit, storage bucket
src/proxy.ts                        refreshes the sign-in session, guards app pages
src/lib/plans.ts                    plan names, prices, limits, AI caps
src/lib/ai.ts                       Claude calls: tagPhoto, suggestOutfits, reviewCloset, analyzeInspo, analyzeSelf, stylistChat
src/lib/affiliate.ts, retailers.ts  affiliate URL building and retailer list
src/lib/data.ts                     session, data loading, AI quota checks
src/app/(app)/closet, style, outfits  the three sections (signed in)
src/app/api/...                     JSON routes, Stripe checkout / portal / webhook
src/app/go/[id]/route.ts            affiliate click redirect
scripts/import-lookbook.mjs         one-time import of the original lookbook
```
