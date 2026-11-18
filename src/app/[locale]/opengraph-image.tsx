import { ImageResponse } from "next/og";
import { pick } from "@/i18n";
import { formatMoney } from "@/lib/pricing";
import { getSiteData } from "@/lib/site";

// Social preview card (Facebook, WhatsApp, Viber, X…) generated from the live property settings.
export const alt = "Apartment preview";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const { property, pricing, lowestNightly } = await getSiteData();
  // The bundled OG font covers Latin script, so the card uses the English city name and plain numbers.
  const facts = [
    `${property.bedrooms} BR`,
    `${property.beds} beds`,
    `${pricing.maxGuests} guests`,
    `${property.areaSqm} m²`,
  ].join("  ·  ");
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "linear-gradient(135deg, #102c35 0%, #1d4e5f 55%, #2f7184 100%)",
          color: "white",
        }}
      >
        <div style={{ fontSize: 28, letterSpacing: 6, textTransform: "uppercase", color: "#d9896a" }}>{pick(property.city, "en")}</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 92, fontWeight: 700, lineHeight: 1.05 }}>{property.name}</div>
          <div style={{ marginTop: 24, fontSize: 32, color: "#d5e8ec" }}>{facts}</div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", fontSize: 34 }}>
          <div style={{ display: "flex" }}>
            from&nbsp;<b>{formatMoney(lowestNightly, pricing.currency, "en")}</b>&nbsp;/ night
          </div>
          <div style={{ padding: "14px 30px", borderRadius: 999, background: "#a14f2c", fontSize: 30 }}>
            Book direct · no fees
          </div>
        </div>
      </div>
    ),
    size,
  );
}
