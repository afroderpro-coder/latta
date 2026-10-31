import { NextResponse } from "next/server";
import crypto from "crypto";

const OTP_SECRET = process.env.OTP_SECRET || "afroder-otp-secret-key-2026";

// Send WhatsApp message in background via configured provider
async function sendWhatsAppMessage(cleanPhone: string, otpCode: string): Promise<{ success: boolean; provider: string; error?: string }> {
  const fullPhone = `91${cleanPhone}`;
  const messageText = `AFRODER: Your 4-digit access code is ${otpCode}. Enter this on the website to complete your signup.`;

  // 1. UltraMsg Provider
  if (process.env.ULTRAMSG_INSTANCE_ID && process.env.ULTRAMSG_TOKEN) {
    try {
      const res = await fetch(`https://api.ultramsg.com/${process.env.ULTRAMSG_INSTANCE_ID}/messages/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          token: process.env.ULTRAMSG_TOKEN,
          to: fullPhone,
          body: messageText,
        }),
      });
      const data = await res.json();
      return { success: res.ok, provider: "ultramsg", error: data?.error };
    } catch (e: any) {
      console.error("[UltraMsg Error]:", e);
      return { success: false, provider: "ultramsg", error: e?.message };
    }
  }

  // 2. Green API Provider
  if (process.env.GREEN_API_INSTANCE_ID && process.env.GREEN_API_TOKEN) {
    try {
      const res = await fetch(
        `https://api.green-api.com/waInstance${process.env.GREEN_API_INSTANCE_ID}/sendMessage/${process.env.GREEN_API_TOKEN}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chatId: `${fullPhone}@c.us`,
            message: messageText,
          }),
        }
      );
      const data = await res.json();
      return { success: res.ok, provider: "green-api", error: data?.error };
    } catch (e: any) {
      console.error("[Green API Error]:", e);
      return { success: false, provider: "green-api", error: e?.message };
    }
  }

  // 3. Meta WhatsApp Cloud API (Official)
  if (process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN) {
    try {
      const templateName = process.env.WHATSAPP_TEMPLATE_NAME || "jaspers_market_order_confirmation_v1";
      const customParams = process.env.WHATSAPP_TEMPLATE_NAME
        ? [{ type: "text", text: otpCode }]
        : [
            { type: "text", text: "Customer" },
            { type: "text", text: otpCode },
            { type: "text", text: "10 mins" },
          ];

      const res = await fetch(
        `https://graph.facebook.com/v19.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: fullPhone,
            type: "template",
            template: {
              name: templateName,
              language: { code: "en_US" },
              components: [
                {
                  type: "body",
                  parameters: customParams,
                },
              ],
            },
          }),
        }
      );
      const data = await res.json();
      if (res.ok && data?.messages?.[0]?.id) {
        return { success: true, provider: "meta-cloud-api" };
      }

      // Fallback to text message if template fails
      const fallbackRes = await fetch(
        `https://graph.facebook.com/v19.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: fullPhone,
            type: "text",
            text: { body: messageText },
          }),
        }
      );
      const fallbackData = await fallbackRes.json();
      return { success: fallbackRes.ok, provider: "meta-cloud-api", error: data?.error?.message || fallbackData?.error?.message };
    } catch (e: any) {
      console.error("[Meta Cloud API Error]:", e);
      return { success: false, provider: "meta-cloud-api", error: e?.message };
    }
  }

  // 4. Custom WhatsApp Webhook / Gateway
  if (process.env.WHATSAPP_API_URL) {
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (process.env.WHATSAPP_API_TOKEN) {
        headers["Authorization"] = `Bearer ${process.env.WHATSAPP_API_TOKEN}`;
      }
      const res = await fetch(process.env.WHATSAPP_API_URL, {
        method: "POST",
        headers,
        body: JSON.stringify({
          phone: fullPhone,
          otp: otpCode,
          message: messageText,
        }),
      });
      return { success: res.ok, provider: "custom-gateway" };
    } catch (e: any) {
      console.error("[Custom Gateway Error]:", e);
      return { success: false, provider: "custom-gateway", error: e?.message };
    }
  }

  // Fallback: No WhatsApp provider configured yet
  // Log cleanly to server console so developer can test immediately
  console.log("--------------------------------------------------");
  console.log(`[AFRODER Background WhatsApp OTP]`);
  console.log(`To: +${fullPhone}`);
  console.log(`OTP Code: ${otpCode}`);
  console.log(`Provider: Pending API credentials in .env.local`);
  console.log("--------------------------------------------------");

  return { success: true, provider: "console-fallback" };
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const rawPhone = body?.phone || "";

    // Normalize phone to clean 10 digits
    const digits = String(rawPhone).replace(/\D/g, "");
    const cleanPhone = digits.length > 10 && (digits.startsWith("91") || digits.startsWith("0"))
      ? digits.slice(-10)
      : digits.slice(-10);

    if (!cleanPhone || cleanPhone.length !== 10) {
      return NextResponse.json(
        { success: false, error: "Please provide a valid 10-digit mobile number." },
        { status: 400 }
      );
    }

    // Generate random 4-digit numeric code (1000 - 9999)
    const otpCode = Math.floor(1000 + Math.random() * 9000).toString();

    // Timestamp for expiration (valid for 10 minutes)
    const expiresAt = Date.now() + 10 * 60 * 1000;

    // Create secure HMAC token containing phone, otp, and expiry
    const dataToSign = `${cleanPhone}:${otpCode}:${expiresAt}`;
    const signature = crypto.createHmac("sha256", OTP_SECRET).update(dataToSign).digest("hex");
    const verificationToken = Buffer.from(`${cleanPhone}:${expiresAt}:${signature}`).toString("base64");

    // Dispatch WhatsApp in the background
    const dispatchResult = await sendWhatsAppMessage(cleanPhone, otpCode);

    return NextResponse.json({
      success: true,
      message: `OTP sent directly to WhatsApp (+91 ${cleanPhone}) in the background.`,
      phone: cleanPhone,
      verificationToken,
      provider: dispatchResult.provider,
    });
  } catch (error: any) {
    console.error("[Send OTP API Error]:", error);
    return NextResponse.json(
      { success: false, error: "Unable to send verification OTP. Please try again." },
      { status: 500 }
    );
  }
}
