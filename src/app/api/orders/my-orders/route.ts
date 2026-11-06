import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { parseStoreBio, StoreOrder } from "@/utils/storeMetadata";

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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email")?.trim().toLowerCase();
    const phone = searchParams.get("phone")?.replace(/\D/g, "");
    const orderId = searchParams.get("orderId")?.trim().toUpperCase();

    if (!email && !phone && !orderId) {
      return NextResponse.json({ success: true, orders: [] });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data: stores, error } = await supabaseAdmin
      .from("stores")
      .select("id, shop_name, bio");

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const matchedOrders: (StoreOrder & { storeName: string; storeId: string })[] = [];

    (stores || []).forEach((store) => {
      const meta = parseStoreBio(store.bio);
      if (Array.isArray(meta.orders)) {
        meta.orders.forEach((order) => {
          let match = false;

          // Match by Order ID
          if (orderId && order.id?.toUpperCase() === orderId) {
            match = true;
          }

          // Match by Customer Email
          if (!match && email && order.customer_email?.toLowerCase() === email) {
            match = true;
          }

          // Match by Phone (last 10 digits comparison)
          if (!match && phone && phone.length >= 10) {
            const orderPhoneClean = order.customer_phone?.replace(/\D/g, "") || "";
            if (
              orderPhoneClean === phone ||
              (orderPhoneClean.length >= 10 && orderPhoneClean.slice(-10) === phone.slice(-10))
            ) {
              match = true;
            }
          }

          if (match) {
            matchedOrders.push({
              ...order,
              storeName: store.shop_name || "AFRODER Partner Store",
              storeId: store.id,
            });
          }
        });
      }
    });

    matchedOrders.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return NextResponse.json({ success: true, orders: matchedOrders });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
