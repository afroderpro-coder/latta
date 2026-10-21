import { NextResponse } from "next/server";
import crypto from "crypto";

// Default SHA-256 hash of the master password "Afridi.dvlpr47"
// Never store or expose plaintext passwords in client code or repositories
const DEFAULT_HASH = "f613ed26c9c080b744e5d12d686308bfff7c7a91e6919e52ed9bea0d09c14a82";

// In-memory rate limiting to protect against automated brute-force attempts
const failedAttempts = new Map<string, { count: number; lastAttempt: number }>();

export async function POST(request: Request) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      request.headers.get("x-real-ip") ||
      "unknown-ip";

    const now = Date.now();
    const record = failedAttempts.get(ip);

    // Rate limit: 5 failed attempts locks for 5 minutes
    if (record && record.count >= 5) {
      const remainingTime = 5 * 60 * 1000 - (now - record.lastAttempt);
      if (remainingTime > 0) {
        const remainingMinutes = Math.ceil(remainingTime / 60000);
        return NextResponse.json(
          {
            success: false,
            error: `Too many failed attempts. Access temporarily locked for ${remainingMinutes} minute(s).`,
          },
          { status: 429 }
        );
      } else {
        // Reset lock after time window expires
        failedAttempts.delete(ip);
      }
    }

    const body = await request.json().catch(() => ({}));
    const { password } = body;

    if (!password || typeof password !== "string") {
      return NextResponse.json(
        { success: false, error: "Password is required." },
        { status: 400 }
      );
    }

    // Determine target hash from environment variable or default hash
    const envPassword = process.env.WEB_CONTROLLER_PASSWORD;
    const targetHashBuffer = envPassword
      ? crypto.createHash("sha256").update(envPassword).digest()
      : Buffer.from(DEFAULT_HASH, "hex");

    const inputHashBuffer = crypto.createHash("sha256").update(password).digest();

    // Constant-time comparison to prevent timing attacks
    const isMatch = crypto.timingSafeEqual(inputHashBuffer, targetHashBuffer);

    if (!isMatch) {
      const currentCount = record && now - record.lastAttempt < 5 * 60 * 1000 ? record.count + 1 : 1;
      failedAttempts.set(ip, { count: currentCount, lastAttempt: now });

      return NextResponse.json(
        {
          success: false,
          error: "Incorrect password. Access denied.",
        },
        { status: 401 }
      );
    }

    // Clear failed attempts upon successful verification
    failedAttempts.delete(ip);

    // Success response
    return NextResponse.json({
      success: true,
      message: "Web Controller unlocked successfully.",
    });
  } catch (err) {
    console.error("Web Controller authentication error:", err);
    return NextResponse.json(
      { success: false, error: "Internal authentication error." },
      { status: 500 }
    );
  }
}
