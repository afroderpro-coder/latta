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

// ── GET: Fetch all orders across all stores ──
export async function GET() {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { data: stores, error } = await supabaseAdmin
      .from("stores")
      .select("id, shop_name, seller_id, bio, profiles:seller_id(id, email, full_name)");

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const allOrders: (StoreOrder & {
      storeId: string;
      storeName: string;
      sellerId?: string;
      sellerName?: string;
    })[] = [];

    (stores || []).forEach((store: any) => {
      const meta = parseStoreBio(store.bio);
      if (Array.isArray(meta.orders)) {
        meta.orders.forEach((o) => {
          allOrders.push({
            ...o,
            storeId: store.id,
            storeName: store.shop_name || "AFRODER Partner Store",
            sellerId: store.seller_id,
            sellerName: meta.seller_name || store.profiles?.full_name || "Merchant",
          });
        });
      }
    });

    allOrders.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return NextResponse.json({ success: true, orders: allOrders });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// ── PATCH: Update order status, estimated delivery, courier tracking ──
export async function PATCH(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { storeId, orderId, status, estimatedDelivery, courierName, trackingNumber } = body;

    if (!storeId || !orderId) {
      return NextResponse.json(
        { success: false, error: "storeId and orderId are required" },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    const { data: store, error: fetchErr } = await supabaseAdmin
      .from("stores")
      .select("id, bio")
      .eq("id", storeId)
      .single();

    if (fetchErr || !store) {
      return NextResponse.json(
        { success: false, error: fetchErr?.message || "Store not found" },
        { status: 404 }
      );
    }

    const meta = parseStoreBio(store.bio);
    let orderFound = false;

    const updatedOrders = (meta.orders || []).map((o) => {
      if (o.id === orderId) {
        orderFound = true;
        const updated: StoreOrder = {
          ...o,
          status: status || o.status,
          estimated_delivery: estimatedDelivery !== undefined ? estimatedDelivery : o.estimated_delivery,
          courier_name: courierName !== undefined ? courierName : o.courier_name,
          tracking_number: trackingNumber !== undefined ? trackingNumber : o.tracking_number,
          completed_at: status === "delivered" ? new Date().toISOString() : o.completed_at,
        };
        return updated;
      }
      return o;
    });

    if (!orderFound) {
      return NextResponse.json({ success: false, error: "Order not found in store" }, { status: 404 });
    }

    const updatedBio = serializeStoreBio({
      ...meta,
      orders: updatedOrders,
    });

    const { error: updateErr } = await supabaseAdmin
      .from("stores")
      .update({ bio: updatedBio })
      .eq("id", storeId);

    if (updateErr) {
      return NextResponse.json({ success: false, error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Order updated successfully",
      orders: updatedOrders,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

