import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return NextResponse.json(
        { error: "Razorpay keys are not configured in environment variables." },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const amountInRupees = body.amount || 39;
    const amountInPaise = Math.round(amountInRupees * 100);

    // Call Razorpay REST API to create an order
    const authHeader = `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;
    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: "INR",
        receipt: `seller_sub_${Date.now()}`,
        notes: {
          plan: "Seller 3 Months Launch Pass",
          shop_name: body.shopName || "",
          phone: body.phone || "",
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Razorpay order creation failed:", errorData);
      return NextResponse.json(
        { error: errorData?.error?.description || "Failed to create Razorpay order." },
        { status: response.status }
      );
    }

    const order = await response.json();

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId,
    });
  } catch (error: any) {
    console.error("Razorpay create-order error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error." },
      { status: 500 }
    );
  }
}

