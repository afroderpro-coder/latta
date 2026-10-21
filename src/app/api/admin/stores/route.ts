import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { parseStoreBio, serializeStoreBio, StoreMetadata } from "@/utils/storeMetadata";
import fs from "fs";
import path from "path";
import staticDeletedStores from "@/data/deleted_stores.json";

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

const DELETED_STORES_PATH = path.join(process.cwd(), ".deleted_stores.json");
const SRC_DELETED_PATH = path.join(process.cwd(), "src", "data", "deleted_stores.json");

function getDeletedStoreIds(): string[] {
  const ids = new Set<string>(staticDeletedStores || []);
  try {
    if (fs.existsSync(DELETED_STORES_PATH)) {
      const content = fs.readFileSync(DELETED_STORES_PATH, "utf-8");
      const list = JSON.parse(content || "[]");
      if (Array.isArray(list)) {
        list.forEach((id) => ids.add(id));
      }
    }
  } catch (err) {
    console.warn("Could not read .deleted_stores.json:", err);
  }
  return Array.from(ids);
}

function saveDeletedStoreId(storeId: string) {
  try {
    const list = getDeletedStoreIds();
    if (!list.includes(storeId)) {
      list.push(storeId);
      fs.writeFileSync(DELETED_STORES_PATH, JSON.stringify(list, null, 2), "utf-8");
      if (fs.existsSync(path.dirname(SRC_DELETED_PATH))) {
        fs.writeFileSync(SRC_DELETED_PATH, JSON.stringify(list, null, 2), "utf-8");
      }
    }
  } catch (err) {
    console.warn("Could not save to deleted stores file:", err);
  }
}

// ── GET: Fetch all stores with deleted filter applied ──
export async function GET() {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { data: storesData, error } = await supabaseAdmin
      .from("stores")
      .select("*, profiles:seller_id(id, email, full_name)")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const deletedIds = getDeletedStoreIds();
    const filtered = (storesData || []).filter((s) => !deletedIds.includes(s.id));

    return NextResponse.json({
      success: true,
      stores: filtered,
      deletedCount: deletedIds.length,
      hasServiceRole: Boolean(serviceRoleKey),
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// ── DELETE: Permanently delete a store and its products ──
export async function DELETE(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { storeId } = body;

    if (!storeId || typeof storeId !== "string") {
      return NextResponse.json({ success: false, error: "storeId is required" }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // 1. Delete all products under this store
    const { error: prodErr } = await supabaseAdmin
      .from("products")
      .delete()
      .eq("store_id", storeId);

    if (prodErr) {
      console.warn("Notice deleting products:", prodErr);
    }

    // 2. Delete the store record
    const { error: storeErr } = await supabaseAdmin
      .from("stores")
      .delete()
      .eq("id", storeId);

    if (storeErr) {
      console.warn("Notice deleting store:", storeErr);
    }

    // 3. Persist to server deleted list so it NEVER shows up on any device/refresh
    saveDeletedStoreId(storeId);

    return NextResponse.json({
      success: true,
      message: `Store ${storeId} deleted successfully.`,
      hasServiceRole: Boolean(serviceRoleKey),
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// ── PATCH: Update store approval status (Approve, Reject, Revoke) ──
export async function PATCH(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { storeId, status, rejectionReason } = body;

    if (!storeId || !status) {
      return NextResponse.json(
        { success: false, error: "storeId and status are required" },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Fetch current store bio
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

    const meta: StoreMetadata = parseStoreBio(store.bio);
    meta.approval_status = status;
    meta.reviewed_at = new Date().toISOString();
    if (rejectionReason !== undefined) {
      meta.rejection_reason = rejectionReason;
    }

    const serializedBio = serializeStoreBio(meta);

    const { error: updateErr } = await supabaseAdmin
      .from("stores")
      .update({ bio: serializedBio })
      .eq("id", storeId);

    if (updateErr) {
      return NextResponse.json({ success: false, error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Store status updated to ${status}.`,
      updatedBio: serializedBio,
      hasServiceRole: Boolean(serviceRoleKey),
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
