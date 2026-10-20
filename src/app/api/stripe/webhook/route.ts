import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { applyCheckoutSession } from "@/lib/booking-service";
import { getRepository } from "@/lib/data";
import { getStripe, isStripeConfigured } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!isStripeConfigured() || !secret) {
    return NextResponse.json({ error: "Stripe is not configured" }, { status: 503 });
  }
  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    // Signature verification needs the exact raw body.
    event = getStripe().webhooks.constructEvent(await request.text(), signature, secret);
  } catch (error) {
    console.warn("[stripe] invalid webhook signature", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
      case "checkout.session.expired":
        await applyCheckoutSession(event.data.object);
        break;
      case "checkout.session.async_payment_failed": {
        const booking = await getRepository().getBookingByStripeSession(event.data.object.id);
        if (booking && booking.status === "awaiting_payment") {
          await getRepository().updateBooking(booking.id, {
            status: "cancelled",
            paymentStatus: "failed",
            cancelledAt: new Date().toISOString(),
          });
        }
        break;
      }
      case "charge.refunded": {
        const charge = event.data.object;
        const intent = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
        if (intent && charge.refunded) {
          const [booking] = (await getRepository().listBookings()).filter((b) => b.stripePaymentIntent === intent);
          if (booking) await getRepository().updateBooking(booking.id, { paymentStatus: "refunded" });
        }
        break;
      }
      default:
        break;
    }
  } catch (error) {
    console.error("[stripe] webhook handling failed", error);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 }); // Stripe retries
  }
  return NextResponse.json({ received: true });
}
