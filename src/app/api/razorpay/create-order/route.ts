import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const rawKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID;
    const rawKeySecret = process.env.RAZORPAY_KEY_SECRET;

    const keyId = rawKeyId?.trim().replace(/^["']|["']$/g, "");
    const keySecret = rawKeySecret?.trim().replace(/^["']|["']$/g, "");

    if (!keyId || !keySecret) {
      return NextResponse.json(
        { error: "Razorpay keys are not configured in environment variables." },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const amountInRupees = Number(body.amount) || 39;
    const amountInPaise = Math.round(amountInRupees * 100);

    // Dynamic receipt and notes based on order type (product purchase vs seller subscription)
    const isProductOrder = body.type === "product_purchase" || Boolean(body.orderRef);
    const receipt = (body.receipt || (isProductOrder ? `ord_${Date.now()}` : `sub_${Date.now()}`)).slice(0, 40);

    const notes = body.notes || (isProductOrder
      ? {
          type: "product_order",
          order_ref: body.orderRef || "",
          customer_name: body.customerName || "",
          phone: body.customerPhone || "",
        }
      : {
          plan: "Seller 3 Months Launch Pass",
          shop_name: body.shopName || "",
          phone: body.phone || "",
        });

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
        receipt,
        notes,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Razorpay order creation failed:", response.status, errorData);
      
      const desc = errorData?.error?.description || "";
      let userFriendlyError = desc || "Failed to create Razorpay order.";
      if (desc === "Authentication failed") {
        userFriendlyError = `Razorpay Authentication Failed: If your Razorpay dashboard is in Live Mode, please generate and use Live API Keys (rzp_live_...) instead of test keys.`;
      }

      return NextResponse.json(
        { error: userFriendlyError },
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

