/**
 * Stripe Webhook Handler — Talk-to-My-Lawyer
 * Handles checkout.session.completed, customer.subscription.*, invoice.paid
 */

import type { Request, Response } from "express";
import Stripe from "stripe";
import { ENV } from "./_core/env";
import { getStripe, activateSubscription } from "./stripe";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

async function getUserIdFromStripeCustomer(customerId: string): Promise<number | null> {
  const stripe = getStripe();
  try {
    const customer = await stripe.customers.retrieve(customerId);
    if (customer.deleted) return null;
    const meta = (customer as Stripe.Customer).metadata;
    if (meta?.userId) return parseInt(meta.userId, 10);
    return null;
  } catch {
    return null;
  }
}

export async function stripeWebhookHandler(req: Request, res: Response): Promise<void> {
  const sig = req.headers["stripe-signature"];

  if (!sig) {
    res.status(400).json({ error: "Missing stripe-signature header" });
    return;
  }

  let event: Stripe.Event;

  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(
      req.body as Buffer,
      sig,
      ENV.stripeWebhookSecret
    );
  } catch (err: any) {
    console.error("[StripeWebhook] Signature verification failed:", err.message);
    res.status(400).json({ error: `Webhook signature verification failed: ${err.message}` });
    return;
  }

  // ─── Handle test events ───────────────────────────────────────────────────
  if (event.id.startsWith("evt_test_")) {
    console.log("[StripeWebhook] Test event detected, returning verification response");
    res.json({ verified: true });
    return;
  }

  console.log(`[StripeWebhook] Processing event: ${event.type} (${event.id})`);

  try {
    switch (event.type) {
      // ─── One-time payment completed ────────────────────────────────────────
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = parseInt(session.metadata?.user_id ?? session.client_reference_id ?? "0", 10);
        const planId = session.metadata?.plan_id ?? "per_letter";

        if (!userId) {
          console.warn("[StripeWebhook] checkout.session.completed: no userId in metadata");
          break;
        }

        if (session.mode === "payment") {
          // One-time per_letter payment
          const paymentIntentId = typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent?.id ?? null;

          await activateSubscription({
            userId,
            stripeCustomerId: typeof session.customer === "string" ? session.customer : session.customer?.id ?? "",
            stripeSubscriptionId: null,
            stripePaymentIntentId: paymentIntentId,
            planId,
            status: "active",
            currentPeriodStart: new Date(),
            currentPeriodEnd: null, // one-time, no period end
          });

          console.log(`[StripeWebhook] Per-letter payment activated for user ${userId}`);
        }
        // For subscription mode, the subscription.* events handle activation
        break;
      }

      // ─── Subscription created or updated ──────────────────────────────────
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as any;
        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
        const resolvedUserId = parseInt(sub.metadata?.user_id ?? "0", 10);
        const userId = resolvedUserId || (await getUserIdFromStripeCustomer(customerId)) || 0;

        if (!userId) {
          console.warn(`[StripeWebhook] ${event.type}: could not resolve userId`);
          break;
        }

        const planId = sub.metadata?.plan_id ?? "monthly";
        const status = mapStripeStatus(sub.status);

        await activateSubscription({
          userId,
          stripeCustomerId: customerId,
          stripeSubscriptionId: sub.id,
          stripePaymentIntentId: null,
          planId,
          status,
          currentPeriodStart: new Date(sub.current_period_start * 1000),
          currentPeriodEnd: new Date(sub.current_period_end * 1000),
          cancelAtPeriodEnd: sub.cancel_at_period_end,
        });

        console.log(`[StripeWebhook] Subscription ${event.type} for user ${userId}, status: ${status}`);
        break;
      }

      // ─── Subscription deleted/canceled ────────────────────────────────────
      case "customer.subscription.deleted": {
        const sub = event.data.object as any;
        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
        const resolvedUserId = parseInt(sub.metadata?.user_id ?? "0", 10);
        const userId = resolvedUserId || (await getUserIdFromStripeCustomer(customerId)) || 0;

        if (!userId) break;

        const planId = sub.metadata?.plan_id ?? "monthly";

        await activateSubscription({
          userId,
          stripeCustomerId: customerId,
          stripeSubscriptionId: sub.id,
          stripePaymentIntentId: null,
          planId,
          status: "canceled",
          currentPeriodStart: new Date(sub.current_period_start * 1000),
          currentPeriodEnd: new Date(sub.current_period_end * 1000),
          cancelAtPeriodEnd: true,
        });

        console.log(`[StripeWebhook] Subscription canceled for user ${userId}`);
        break;
      }

        // ─── Invoice paid (renewal) ────────────────────────────────────────
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        // In Stripe v20, subscription is accessed via parent.subscription_details
        const parentSub = (invoice.parent as any)?.subscription_details?.subscription;
        const subId = typeof parentSub === "string" ? parentSub : parentSub?.id;

        if (subId) {
          const stripe = getStripe();
          const sub = await stripe.subscriptions.retrieve(subId) as any;
          const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
          const resolvedUserId = parseInt(sub.metadata?.user_id ?? "0", 10);
          const userId = resolvedUserId || (await getUserIdFromStripeCustomer(customerId)) || 0;

          if (userId) {
            const planId = sub.metadata?.plan_id ?? "monthly";
            await activateSubscription({
              userId,
              stripeCustomerId: customerId,
              stripeSubscriptionId: sub.id,
              stripePaymentIntentId: null,
              planId,
              status: "active",
              currentPeriodStart: sub.current_period_start ? new Date(sub.current_period_start * 1000) : null,
              currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null,
              cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
            });
            console.log(`[StripeWebhook] Invoice paid, subscription renewed for user ${userId}`);
          }
        }
        break;
      }

      // ─── Invoice payment failedd ────────────────────────────────────────────
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        console.warn(`[StripeWebhook] Invoice payment failed: ${invoice.id}`);
        // Could send email notification here
        break;
      }

      default:
        console.log(`[StripeWebhook] Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (err: any) {
    console.error("[StripeWebhook] Error processing event:", err);
    res.status(500).json({ error: "Webhook processing failed" });
  }
}

function mapStripeStatus(
  stripeStatus: Stripe.Subscription.Status
): "active" | "canceled" | "past_due" | "trialing" | "incomplete" | "none" {
  switch (stripeStatus) {
    case "active": return "active";
    case "canceled": return "canceled";
    case "past_due": return "past_due";
    case "trialing": return "trialing";
    case "incomplete":
    case "incomplete_expired": return "incomplete";
    default: return "none";
  }
}
