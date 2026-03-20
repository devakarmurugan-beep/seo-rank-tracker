# Payments: DodoPayments Integration

## Overview

Provider: **DodoPayments**
Files: `api/services/payments.js`, `api/index.js` (routes)

---

## Plan → Product ID Mapping

```js
{
  'plan_starter_monthly':  'pdt_0NZ6bKfPJGxfhCjh6nJu3',
  'plan_starter_yearly':   'pdt_0NZ6bb13QGSEJyqjyQdN2',
  'plan_pro_monthly':      'pdt_0NZ6biixjrLKkfyij1nQk',
  'plan_pro_yearly':       'pdt_0NZ6boV8o4T7IQ1eeqtke',
  'plan_agency_monthly':   'pdt_0NZ6bxKrySCuiit42wqGa',
  'plan_agency_yearly':    'pdt_0NZ6c2Bq4Q901tZkaeLfV',
}
```

Plan IDs used in Supabase `user_metadata.plan`: `starter`, `pro`, `agency`
(monthly/yearly suffix stripped when writing to user metadata)

---

## Checkout Flow

1. Frontend calls `POST /api/payments/create-checkout` with `{ userId, userEmail, planId }`
2. API creates Dodo session with metadata: `{ supabase_user_id, plan_id }`
3. Returns `{ checkout_url }` → frontend redirects user to Dodo payment form
4. Fallback: if `DODO_PAYMENTS_API_KEY` missing, simulates checkout URL

---

## Webhook Flow

**Endpoint:** `POST /api/payments/webhook`

Listens for:
- `payment.succeeded`
- `subscription.active`

On success:
1. Extracts `metadata.supabase_user_id` and `metadata.plan_id`
2. Calls Supabase admin SDK: `auth.admin.updateUserById(userId, { user_metadata: { plan } })`
3. Plan stored in Supabase `auth.users.user_metadata.plan`

---

## Frontend Permission Check

`apps/app/src/lib/permissions.js`:
```js
getUserPlan(user)          // reads user.user_metadata.plan, defaults to 'free_trial'
canAddSite(user, count)    // checks against PLAN_LIMITS
isTrialEnded(user)         // 7-day expiry from created_at
getSiteLimit(user)         // returns max sites number
```

## Frontend Checkout Trigger

`apps/app/src/lib/api.js`:
```js
createSubscription(userId, userEmail, planId)
```
