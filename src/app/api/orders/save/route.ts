import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { parseStoreBio, serializeStoreBio, StoreOrder } from "@/utils/storeMetadata";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const getSupabaseAdmin = () => {
  return createClient(supabaseUrl, serviceRoleKey || anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};

interface OrderItem {
  product_id: string;
  product_title: string;
  size?: string;
  quantity: number;
  price: number;
  image_url?: string;
}

interface SaveOrderRequest {
  orderRef: string;
  paymentMethod: "razorpay" | "whatsapp";
  paymentStatus: "paid" | "pending";
  paymentId?: string;
  razorpayOrderId?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  deliveryAddress: string;
  customerNotes?: string;
  estimatedDelivery?: string;
  // Items grouped by store
  itemsByStore: Record<
    string,
    {
      items: OrderItem[];
      storeTotal: number;
    }
  >;
}

export async function POST(request: Request) {
  try {
    const body: SaveOrderRequest = await request.json();
    const {
      orderRef,
      paymentMethod,
      paymentStatus,
      paymentId,
      razorpayOrderId,
      customerName,
      customerPhone,
      customerEmail,
      deliveryAddress,
      customerNotes,
      estimatedDelivery,
      itemsByStore,
    } = body;

    if (!orderRef || !itemsByStore || Object.keys(itemsByStore).length === 0) {
      return NextResponse.json(
        { success: false, error: "orderRef and itemsByStore are required" },
        { status: 400 }
      );
    }

    // Calculate default estimated delivery (5 business days from now)
    const defaultDeliveryDate = new Date();
    defaultDeliveryDate.setDate(defaultDeliveryDate.getDate() + 5);
    const formattedDefaultDelivery = defaultDeliveryDate.toISOString().split("T")[0];
    const finalEstimatedDelivery = estimatedDelivery || formattedDefaultDelivery;

    const supabaseAdmin = getSupabaseAdmin();
    const storeIds = Object.keys(itemsByStore);

    // Fetch all involved stores
    const { data: stores, error: fetchErr } = await supabaseAdmin
      .from("stores")
      .select("id, shop_name, bio")
      .in("id", storeIds);

    if (fetchErr) {
      return NextResponse.json(
        { success: false, error: "Failed to fetch stores: " + fetchErr.message },
        { status: 500 }
      );
    }

    const storeMap: Record<string, { shop_name: string; bio?: string }> = {};
    (stores || []).forEach((s) => {
      storeMap[s.id] = { shop_name: s.shop_name, bio: s.bio };
    });

    const errors: string[] = [];

    // Save order to each store's metadata
    for (const [storeId, storeData] of Object.entries(itemsByStore)) {
      const currentStore = storeMap[storeId];
      if (!currentStore) {
        errors.push(`Store ${storeId} not found`);
        continue;
      }

      try {
        const storeMeta = parseStoreBio(currentStore.bio);

        const storeOrder: StoreOrder = {
          id: orderRef,
          created_at: new Date().toISOString(),
          customer_name: customerName || "Guest Customer",
          customer_phone: customerPhone || "Not provided",
          customer_email: customerEmail || undefined,
          delivery_address: deliveryAddress || "Not provided",
          customer_notes: customerNotes || "",
          items: storeData.items,
          total_amount: storeData.storeTotal,
          status: paymentStatus === "paid" ? "processing" : "pending",
          estimated_delivery: finalEstimatedDelivery,
          payment_method: paymentMethod,
          payment_status: paymentStatus,
          payment_id: paymentId,
          razorpay_order_id: razorpayOrderId,
          paid_at: paymentStatus === "paid" ? new Date().toISOString() : undefined,
        };

        // Filter out old version if re-saving same orderRef, then prepend new
        const existingOrders = (storeMeta.orders || []).filter((o) => o.id !== orderRef);
        const updatedOrders = [storeOrder, ...existingOrders];
        const updatedBio = serializeStoreBio({
          ...storeMeta,
          orders: updatedOrders,
        });

        const { error: updateErr } = await supabaseAdmin
          .from("stores")
          .update({ bio: updatedBio })
          .eq("id", storeId);

        if (updateErr) {
          errors.push(`Failed to save order to store ${storeId}: ${updateErr.message}`);
        }
      } catch (err: any) {
        errors.push(`Error processing store ${storeId}: ${err.message}`);
      }
    }

    return NextResponse.json({
      success: errors.length === 0,
      storeMap: Object.fromEntries(
        Object.entries(storeMap).map(([id, s]) => [id, { shop_name: s.shop_name }])
      ),
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

