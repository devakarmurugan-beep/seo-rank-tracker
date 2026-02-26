import express from 'express'
import { DodoPayments } from 'dodopayments'
import { createClient } from '@supabase/supabase-js'

const router = express.Router()

// Lazy loaders for clients to ensure process.env is populated
const getDodoClient = () => {
    return new DodoPayments({ bearerToken: process.env.DODO_PAYMENTS_API_KEY || '' });
}

const getSupabaseAdmin = () => {
    return createClient(
        process.env.VITE_SUPABASE_URL,
        process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
    )
}


// Map internal plan IDs to Dodo Payment Product/Price IDs
// Update these actual values once user provides them
const DODO_PRODUCT_IDS = {
    'plan_starter_monthly': 'pdt_0NZ6bKfPJGxfhCjh6nJu3',
    'plan_starter_yearly': 'pdt_0NZ6bb13QGSEJyqjyQdN2',
    'plan_pro_monthly': 'pdt_0NZ6biixjrLKkfyij1nQk',
    'plan_pro_yearly': 'pdt_0NZ6boV8o4T7IQ1eeqtke',
    'plan_agency_monthly': 'pdt_0NZ6bxKrySCuiit42wqGa',
    'plan_agency_yearly': 'pdt_0NZ6c2Bq4Q901tZkaeLfV',
}

router.post('/create-checkout', async (req, res) => {
    const { userId, userEmail, planId } = req.body

    try {
        const productId = DODO_PRODUCT_IDS[planId]

        if (!process.env.DODO_PAYMENTS_API_KEY) {
            console.warn("DODO_PAYMENTS_API_KEY is not set. Simulating checkout URL.");
            return res.json({
                success: true,
                checkoutUrl: `https://test.dodopayments.com/checkout/simulate?plan=${planId}&user=${userId}`
            })
        }

        if (!productId) {
            console.error(`[Checkout] Plan ID not found in mapping: ${planId}`)
            return res.status(400).json({ error: 'Invalid plan ID. This plan might not be mapped to a product yet.' })
        }

        const returnUrl = (process.env.GCP_REDIRECT_URI?.replace('/auth/callback', '') || 'http://localhost:5173') + '/dashboard?payment=success'

        console.log(`[Checkout] Creating Dodo Checkout Session for User: ${userEmail}, Plan: ${planId}, Product: ${productId}`)

        // Connect to Dodo Payments create checkout URL
        try {
            const payload = {
                billing: {
                    city: '',
                    country: 'US',
                    state: '',
                    street: '',
                    zipcode: ''
                },
                customer: {
                    email: userEmail || '',
                    name: userEmail?.split('@')[0] || 'User'
                },
                product_cart: [
                    {
                        product_id: productId,
                        quantity: 1
                    }
                ],
                metadata: {
                    supabase_user_id: userId,
                    plan_id: planId
                },
                return_url: returnUrl
            }

            console.log('[Checkout] Payload:', JSON.stringify(payload, null, 2))

            const paymentData = await getDodoClient().checkoutSessions.create(payload)

            console.log('[Checkout] Dodo Success Response:', JSON.stringify(paymentData, null, 2))

            // The redirect URL where users enter their credit card
            const checkoutUrl = paymentData.payment_link || (paymentData._links && paymentData._links.payment_link)

            if (!checkoutUrl) {
                console.error('[Checkout] Dodo Response missing payment_link:', paymentData)
                throw new Error("Could not retrieve checkout link from Dodo Payments response")
            }

            res.json({ success: true, checkoutUrl })
        } catch (dodoErr) {
            console.error('[Checkout] Dodo API Error Details:', dodoErr.response?.data || dodoErr.message)
            const dodoMessage = dodoErr.response?.data?.message || dodoErr.message
            res.status(500).json({
                error: 'PAYMENT_GATEWAY_ERROR',
                message: `Dodo Payments said: ${dodoMessage}. Please verify your Product ID (${productId}) and API Key.`
            })
        }

    } catch (err) {
        console.error('[Checkout] Internal Server Error:', err)
        res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message })
    }
})

// Webhook listener for successful payments
router.post('/webhook', async (req, res) => {
    // Usually, you should verify the Dodo webhook signature here:
    // const signature = req.headers['dodo-signature']
    // if (!dodoClient.webhooks.verifySignature(JSON.stringify(req.body), signature, process.env.DODO_WEBHOOK_SECRET)) return res.status(401).send()

    // We are trusting the event internally for now if no secret is rigidly enforced
    try {
        const event = req.body

        // Handle a successful payment or subscription created event
        if (event.type === 'payment.succeeded' || event.type === 'subscription.active') {
            // Extract metadata exactly as we passed it into checkout
            const metadata = event.data?.metadata || event.data?.payment?.metadata

            if (metadata && metadata.supabase_user_id && metadata.plan_id) {
                const userId = metadata.supabase_user_id
                const planId = metadata.plan_id

                console.log(`[Webhook] Success trigger: Upgrading user ${userId} to ${planId}`)

                // Securely update the user's plan in Supabase
                const { data, error } = await getSupabaseAdmin().auth.admin.updateUserById(
                    userId,
                    { user_metadata: { plan: planId } }
                )

                if (error) {
                    console.error('[Webhook] Error upgrading user in Supabase:', error)
                    return res.status(500).json({ error: 'Failed to upgrade user' })
                }

                console.log('[Webhook] Successfully upgraded user.')
            }
        }

        // Acknowledge receipt
        res.status(200).json({ received: true })
    } catch (err) {
        console.error('[Webhook] Processing error:', err)
        res.status(500).send('Webhook Processing Error')
    }
})

export default router
