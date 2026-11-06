# Tripcelona · Catalan Coach Check-in & Stripe Payments

Official real-time coach reservation system, 55-seat bus capacity manager, driver optical QR check-in validator, and server-side Stripe Checkout integration.

---

## Stripe Dual Accounts Configuration (Production & Test)

All payments are processed securely server-side through official Stripe Checkout sessions. The application supports two independent Stripe merchant accounts, decided strictly by which booking route the passenger accesses:
- **Route `/book/1`** always charges **Stripe Account 1**.
- **Route `/book/2`** always charges **Stripe Account 2**.

No secret keys or publishable keys are hardcoded in the client bundle or stored in Firestore.

### 1. Environment Secrets to Configure

Set the following environment secrets in your hosting environment (or local `.env`):

| Variable | Description | Example |
| :--- | :--- | :--- |
| `APP_URL` | Public base URL of your application | `https://your-domain.com` or `http://localhost:3000` |
| `STRIPE_SECRET_KEY_1` | Secret key for Stripe Account 1 | `sk_live_...` or `sk_test_...` |
| `STRIPE_WEBHOOK_SECRET_1` | Webhook signing secret for Account 1 endpoint | `whsec_...` |
| `STRIPE_SECRET_KEY_2` | Secret key for Stripe Account 2 | `sk_live_...` or `sk_test_...` |
| `STRIPE_WEBHOOK_SECRET_2` | Webhook signing secret for Account 2 endpoint | `whsec_...` |

---

### 2. Register Webhooks in Stripe Dashboards

For each Stripe account, configure a webhook endpoint in the [Stripe Dashboard > Developers > Webhooks](https://dashboard.stripe.com/webhooks):

#### Stripe Account 1 Dashboard:
- **Endpoint URL:**
  ```text
  ${APP_URL}/api/webhooks/stripe/1
  ```
  *(e.g. `https://your-domain.com/api/webhooks/stripe/1`)*
- **Listen to events:**
  - `checkout.session.completed` (marks reservation ticket as `paid` and `valid`, records payment intent)
  - `checkout.session.expired` (releases the 15-minute held seat if customer abandons checkout)
- Copy the **Signing secret** (`whsec_...`) and assign it to `STRIPE_WEBHOOK_SECRET_1`.

#### Stripe Account 2 Dashboard:
- **Endpoint URL:**
  ```text
  ${APP_URL}/api/webhooks/stripe/2
  ```
  *(e.g. `https://your-domain.com/api/webhooks/stripe/2`)*
- **Listen to events:**
  - `checkout.session.completed`
  - `checkout.session.expired`
- Copy the **Signing secret** (`whsec_...`) and assign it to `STRIPE_WEBHOOK_SECRET_2`.

---

### 3. Booking Entry Points & Flow

1. **Client Booking Routes:**
   - Account 1: `${APP_URL}/book/1`
   - Account 2: `${APP_URL}/book/2`
2. **Reservation Hold:** When a passenger enters their details and picks a seat, `POST /api/checkout` validates the official price in Firestore and reserves the seat under `paymentStatus: 'pending'` for 15 minutes.
3. **Stripe Checkout:** The customer is redirected directly to Stripe's secure payment page.
4. **Instant Boarding Pass:** On successful checkout, the customer returns to `/book/{account}/success?session_id={CHECKOUT_SESSION_ID}`. The server verifies payment and presents the official printable/scannable QR boarding pass.
5. **Driver Validation:** The coach driver uses the **Driver Boarding & Scanner Console** (`?portal=driver`) to scan passenger passes upon boarding.
