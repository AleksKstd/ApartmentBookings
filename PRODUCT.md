# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Visitors to Burgas, Bulgarian and foreign.** They come to the city for its concerts, music festivals and other events, not only for a beach holiday, and need a central place to stay for a few nights around that.
- **Bulgarian holidaymakers** on the coast, mostly in summer.
- **Foreign tourists** on a Black Sea holiday.

Visitors arrive in Bulgarian (default) or English and usually compare this apartment against the same kind of listing on Booking.com or Airbnb before deciding.

## Product Purpose

A direct-booking website for one holiday apartment, Morski Briz, in central Burgas. A guest checks real availability, sees the full price for their dates and sends a booking request (or pays by card when Stripe is configured); the host confirms by email and manages bookings, prices, photos and content in the admin area. Success: guests book here instead of through a platform.

## Positioning

- **Booking direct with the host**: no platform commission, so a lower price, and terms the host can make more flexible than the platforms allow.
- **Location**: in a house (not a block of flats) right next to Bogoridi Boulevard, the main pedestrian street of the city centre, within walking distance of the Sea Garden and the beach. This is what a platform listing elsewhere in Burgas cannot claim.

## Operating Context

- Guests often plan around a specific concert, festival or event date, so availability on exact dates matters more than browsing.
- The calendar is synced with outside platforms via iCal, so the same nights may also be sold elsewhere.
- Bilingual: Bulgarian is the source language, English must be complete. Admin is Bulgarian only.

## Capabilities and Constraints

- Next.js app; demo mode runs without credentials. Supabase for data, Stripe optional, email notifications.
- Request-to-book when Stripe is off (no charge until the host confirms); instant payment with a timed hold when Stripe is on. Copy must not promise one mode in the other.
- Host-editable content in admin: texts, photos, nearby places and walking times, host details, reply time, cancellation policy. Values in [square brackets] are placeholders and are hidden on the public site.
- Undecided: exact cancellation terms, the host's public name and photo, real walking times.

## Brand Commitments

- Name: Morski Briz Apartment ("Морски бриз", sea breeze).
- No logo or brand colours exist yet.

## Evidence on Hand

- No real photos yet; `public/demo/*.svg` are placeholders to be replaced.
- No guest reviews, ratings, awards or press. Do not invent testimonials, review scores, guest counts or festival partnerships.
- No specific events may be named as guaranteed or affiliated; events can be referred to generally (concerts, festivals in the city).

## Product Principles

1. The price and the free dates come first; nothing stands between a visitor and an honest total.
2. Make booking direct feel as safe as a platform: who the host is, when they reply, what happens next, what it costs to cancel.
3. Sell the place, not a template: the house, the boulevard outside the door, the city's events and the sea within walking distance.
4. Bulgarian and English are equals; every claim must be true in both.

## Accessibility & Inclusion

WCAG 2.2 AA: contrast, keyboard use (including the availability calendar), screen-reader labels, 200% text zoom and reduced motion are already met and must not regress.
