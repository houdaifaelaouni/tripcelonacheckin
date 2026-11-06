# Tripcelona — Dual Stripe Accounts Seat Split & Email / WhatsApp Confirmation Plan

This revised plan incorporates automated **Email & WhatsApp boarding pass confirmations** into the passenger booking form, combined with the **Dual Stripe Accounts numerical seat payment split** (first half of coach seats to Stripe Account 1, second half to Stripe Account 2) and an administrative settings interface.

---

### User Review & Decisions Grounding

> [!IMPORTANT]
> - **Dual Stripe Accounts**: Coach seats are split numerically: Seats `1` to `Math.ceil(capacity / 2)` (e.g. 1 to 28) route payments to **Stripe Account 1**, while Seats `Math.ceil(capacity / 2) + 1` to `capacity` (e.g. 29 to 55) route to **Stripe Account 2**.
> - **Stripe Key Management**: Both Stripe Account keys and custom labels are configured in the **Admin Dashboard** settings modal.
> - **Passenger Form Requirements**: Required **Email** and **WhatsApp Number** (with country code prefix) in both the public client reservation form and staff check-in generator.
> - **Confirmation Delivery**: Instant post-payment dispatch:
>   1. **Email Confirmation**: Structured email with travel itinerary, seat number, QR code verification link, and PDF download button.
>   2. **WhatsApp Pass**: 1-click WhatsApp instant message integration (`wa.me`) sending the formatted boarding pass link, seat number, and departure time directly to the traveler's phone.

---

## 1. System Architecture & Information Flow

```
┌────────────────────────────────────────────────────────────────────────┐
│                   Passenger Booking Form Inputs                        │
│   • First & Last Name      • Passenger Email (Required for E-ticket)   │
│   • Coach Seat Selection   • WhatsApp Number with Country Code (+34)   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│              Seat Resolver & Dual Stripe Routing Engine                │
│    Seats 1 to 28 (50% Front)        │     Seats 29 to 55 (50% Rear)    │
│  ───────► Stripe Account 1          │   ───────► Stripe Account 2      │
│  (Publishable Key 1 / Merchant 1)   │   (Publishable Key 2 / Merchant) │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      Stripe Embedded Checkout                          │
│     Card authorization · Unified Tripcelona passenger branding         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ (On Payment Success)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                 Multi-Channel Confirmation Engine                      │
│                                                                        │
│   [1. Cloud Ticket Record]  Saved to Firestore with payment metadata   │
│   [2. Email Dispatch]       Automated booking confirmation sent        │
│   [3. WhatsApp Instant]     1-click WhatsApp pass with scannable link  │
│   [4. On-Screen Pass]       Gellix QR boarding pass + instant print    │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Key Components & Implementation Details

### A. Data Models (`src/types/index.ts`)
- **`Ticket` Extension**:
  - `contactEmail: string` (passenger email for e-ticket delivery)
  - `whatsappNumber: string` (e.g., `+34 612 345 678` for WhatsApp pass delivery)
  - `emailDeliveryStatus: 'sent' | 'pending' | 'failed'`
  - `whatsappDeliveryStatus: 'sent' | 'ready'`
  - `stripeAccountUsed: 'account_1' | 'account_2'`
  - `stripeAccountLabel: string`
- **`StripeAccountConfig` & `SystemSettings`**:
  - `stripeAccount1`: `id`, `label`, `publishableKey`, `isActive`, `seatsCovered: "1 to 28"`
  - `stripeAccount2`: `id`, `label`, `publishableKey`, `isActive`, `seatsCovered: "29 to 55"`

### B. Client Booking Form & WhatsApp / Email Integration (`ClientLandingPage.tsx`)
- **Form Step 1 (Passenger Contact & Delivery)**:
  - Required **Email Address** field with live validation.
  - Required **WhatsApp Mobile Number** field with international country code selector (Spain `+34`, France `+33`, UK `+44`, US `+1`, Germany `+49`, Morocco `+212`, etc.).
  - Notification preference notice explaining that the QR pass will be delivered via Email and WhatsApp.
- **Form Step 2 (Seat Selection & Routing)**:
  - Seat blueprint computes:
    `const stripeTarget = seatNumber <= Math.ceil(capacity / 2) ? 'account_1' : 'account_2';`
- **Form Step 3 (Embedded Stripe Checkout)**:
  - Charge tokenized using target Stripe account's key.
- **Form Step 4 (Confirmation & Multi-Channel Dispatch)**:
  - Generates verified `Ticket` in Firestore with payment and contact metadata.
  - Triggers email confirmation dispatch simulation / log.
  - Displays prominent **"Send / Open Pass on WhatsApp"** green button directly opening WhatsApp with pre-filled boarding pass details.
  - Interactive on-screen `TicketPass` with scannable QR code and 1-click **"Print Pass"** action.

### C. Admin Stripe Dual Accounts Modal (`StripeSettingsModal.tsx` & `AdminDashboard.tsx`)
- **Settings Modal**:
  - Configure Account 1: Custom Label, Publishable Key (`pk_live_...` or `pk_test_...`), status toggle.
  - Configure Account 2: Custom Label, Publishable Key (`pk_live_...` or `pk_test_...`), status toggle.
  - Visual seat distribution breakdown showing exact numerical seat ranges.
  - Persisted in Firestore settings collection (`settings/stripe_config`) and cached locally.
- **Admin Dashboard KPI & Manifest Analytics**:
  - Split revenue analytics:
    - **Account 1 Revenue (€)** (First half of coach seats)
    - **Account 2 Revenue (€)** (Second half of coach seats)
  - Passenger manifest table shows passenger Email, WhatsApp number, and Stripe account used.

### D. Check-in Form Update for Staff (`CheckInForm.tsx`)
- Add Email and WhatsApp Number fields to the staff check-in form as well so ticketing agents can issue passes and immediately send them to travelers via WhatsApp or Email.

---

## 3. Anti-AI Slop & Visual Hierarchy

- **Gellix Geometric Sans**: Strict adherence to Amplitude tokens, clean label spacing, and tabular numbers for seat IDs and pricing.
- **Zero-Pill Discipline**: Unboxed metadata text with `·` typographic separators.
- **Color Discipline (60-30-10)**: Clean white/slate canvas, `#0052F2` primary interactive controls, with official WhatsApp green (`#25D366`) reserved strictly for the functional WhatsApp action button.

---

## 4. Verification & Testing

1. Validate type compilation with `lint_applet` and `compile_applet`.
2. Configure custom Stripe Account 1 and Stripe Account 2 keys in Admin Dashboard.
3. Test reserving **Seat #8** (First Half) with Email and WhatsApp number $\rightarrow$ verify Stripe 1 routing and WhatsApp launch button.
4. Test reserving **Seat #35** (Second Half) $\rightarrow$ verify Stripe 2 routing.
5. Confirm passenger manifest shows Email, WhatsApp, and Stripe Account attribution for all bookings.
