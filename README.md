# Tripcelona Check-in

Ticketing, payments and boarding for Tripcelona day trips from Barcelona: one coach, one meeting point, one date per trip.

- **Customers** book seats online and **pay with Stripe**, then get QR boarding passes (email + WhatsApp).
- **Sellers** sell walk-up, platform (GetYourGuide, Viator…) and group bookings, and get paid by **Stripe payment link**, cash or card terminal.
- **Drivers** scan passes at the door.
- **The owner** manages trips, the team and their access keys, the two partner businesses and their Stripe accounts, and commissions.

## Roles

| Role | Signs in with | Can |
|---|---|---|
| **Owner** | Google | Everything: partners & Stripe, team & access keys, all bookings and reports, settle commissions |
| **Partner** | Google | Read-only: trips, manifests, bookings and revenue **for their own business** |
| **Coordinator** | Access key | Create/edit trips, assign drivers, manage manifests (move seats, rename, cancel), sell, board |
| **Seller** | Access key | Sell seats, send Stripe payment links, see **their own** sales and commission |
| **Driver** | Access key | Only the trips assigned to them: passenger list and QR scanner |
| **Customer** | No account | Book & pay on `/book/1` or `/book/2`, open their pass at `/pass/…` |

Permissions live in [`shared/permissions.ts`](shared/permissions.ts) and are enforced **on the server** for every request.

### Access keys
The owner adds a person in **Team & keys**. Coordinators, sellers and drivers get a personal key (`TCK-XXXXXX-XXXX-XXXX-XXXX`) and a one-tap invite link to send on WhatsApp. The key is shown once and stored only as a scrypt hash. **New key** or **Revoke** signs that person out on every device immediately; so does deactivating them or changing their role.

## How money flows

- **Two partner businesses, two Stripe accounts.** Each partner owns one booking link: customers on `/book/1` pay Stripe account 1, customers on `/book/2` pay Stripe account 2.
- **Online booking:** seats are held for 30 minutes while the customer pays on Stripe Checkout. Tickets are issued only when Stripe confirms payment (webhook, or a check from the success page). Abandoned checkouts release their seats.
- **Staff sales:** the seller picks **Stripe link** (default), cash, card terminal, invoice (groups) or free (owner/coordinator). A Stripe link charges the Stripe account of the booking's partner (the seller's partner by default). The booking turns *Paid* automatically when the customer pays.
- **Platforms:** recorded with the platform name, its booking reference and the amount received.
- **Commission:** each seller has a rate; it's computed on every booking they sell and counted once paid. The owner marks it as paid out in **Reports**.

## Security model

- The browser **never touches Firestore**. `firestore.rules` denies everything; the server uses the Firebase Admin SDK and checks roles itself.
- **Signed QR codes:** `TC1.<ticketId>.<HMAC>`. A pass can't be forged or guessed.
- **No double-booking:** every seat change runs in a Firestore transaction on `trips/{id}/seats/{seat}` locks, whatever the sales channel.
- Prices always come from the database, never from the browser. Stripe secret keys live only in environment variables.
- Every sensitive action is written to an `auditLog` collection.

## Run it locally

```bash
npm install
cp .env.example .env     # fill in the values (see comments in the file)
npm run dev              # http://localhost:3000
npm test                 # unit tests (crypto, reports, seat rules)
```

1. Set `OWNER_EMAILS` to your Google email, open `/login` and **Continue with Google**: you become Owner.
2. **Partners & Stripe:** create the two partner businesses (link 1 and link 2) and check both Stripe accounts show as connected.
3. **Team & keys:** add coordinators, sellers (with commission %) and drivers, and send them their invite links.
4. **Trips:** create a trip and assign a driver. It's on sale at `/book/1` and `/book/2`.

For Stripe webhooks locally: `stripe listen --forward-to localhost:3000/api/webhooks/stripe/1` (and `/2` for the second account).

## Deploy (Vercel)

`vercel.json` serves the React build and sends `/api/*` to `api/index.ts` (the Express API as a serverless function). Add every variable from `.env.example` in Vercel → Settings → Environment Variables, set `APP_URL` to the production URL, then in **each** Stripe dashboard add a webhook to `https://<your-domain>/api/webhooks/stripe/<1|2>` with the events listed on the **Partners & Stripe** page. Finally deploy `firestore.rules` (`firebase deploy --only firestore:rules`).

You can also run it on any Node host with `npm run build && npm start`.

## Project layout

```
shared/        types, role permissions, pure business logic (used by server + client)
server/        Express API: auth & keys, seat engine, Stripe, notifications, routes/
api/index.ts   Vercel entry point
src/           React app: pages/public (booking, success, pass), pages/staff (by role)
tests/         unit tests
```
