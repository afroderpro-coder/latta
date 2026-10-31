import { NextResponse } from "next/server";
import crypto from "crypto";

const OTP_SECRET = process.env.OTP_SECRET || "afroder-otp-secret-key-2026";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { phone: rawPhone, otp, verificationToken } = body;

    const digits = String(rawPhone || "").replace(/\D/g, "");
    const cleanPhone = digits.length > 10 && (digits.startsWith("91") || digits.startsWith("0"))
      ? digits.slice(-10)
      : digits.slice(-10);

    const cleanOtp = String(otp || "").trim();

    if (!cleanPhone || cleanPhone.length !== 10) {
      return NextResponse.json(
        { success: false, error: "Invalid phone number." },
        { status: 400 }
      );
    }

    if (!cleanOtp || cleanOtp.length !== 4) {
      return NextResponse.json(
        { success: false, error: "Please enter the exact 4-digit OTP." },
        { status: 400 }
      );
    }

    if (!verificationToken) {
      return NextResponse.json(
        { success: false, error: "Verification token missing. Please request a new OTP." },
        { status: 400 }
      );
    }

    // Decode token
    let decoded = "";
    try {
      decoded = Buffer.from(verificationToken, "base64").toString("utf-8");
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid verification session." },
        { status: 400 }
      );
    }

    const parts = decoded.split(":");
    if (parts.length !== 3) {
      return NextResponse.json(
        { success: false, error: "Malformed verification session." },
        { status: 400 }
      );
    }

    const [tokenPhone, tokenExpiresAtStr, tokenSignature] = parts;
    const tokenExpiresAt = Number(tokenExpiresAtStr);

    if (tokenPhone !== cleanPhone) {
      return NextResponse.json(
        { success: false, error: "Phone number mismatch. Please request a new OTP." },
        { status: 400 }
      );
    }

    if (Date.now() > tokenExpiresAt) {
      return NextResponse.json(
        { success: false, error: "OTP has expired. Please click 'Resend OTP' to get a fresh code." },
        { status: 400 }
      );
    }

    // Verify signature using the entered OTP
    const expectedData = `${cleanPhone}:${cleanOtp}:${tokenExpiresAt}`;
    const expectedSignature = crypto.createHmac("sha256", OTP_SECRET).update(expectedData).digest("hex");

    const sigBufA = Buffer.from(tokenSignature);
    const sigBufB = Buffer.from(expectedSignature);

    if (sigBufA.length !== sigBufB.length || !crypto.timingSafeEqual(sigBufA, sigBufB)) {
      return NextResponse.json(
        {
          success: false,
          verified: false,
          error: "Incorrect 4-digit OTP. Please check the code sent to your WhatsApp and try again.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      verified: true,
      message: "Phone number verified successfully!",
    });
  } catch (error: any) {
    console.error("[Verify OTP API Error]:", error);
    return NextResponse.json(
      { success: false, error: "Verification failed. Please try again." },
      { status: 500 }
    );
  }
}
