import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import staticNewArrivals from "@/data/new_arrivals.json";
import { parseStoreBio, serializeStoreBio, StoreMetadata } from "@/utils/storeMetadata";

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

const ROOT_FILE_PATH = path.join(process.cwd(), ".new_arrivals.json");
const SRC_FILE_PATH = path.join(process.cwd(), "src", "data", "new_arrivals.json");

function getLocalCuratedIds(): string[] {
  try {
    if (fs.existsSync(ROOT_FILE_PATH)) {
      const content = fs.readFileSync(ROOT_FILE_PATH, "utf-8");
      const list = JSON.parse(content || "[]");
      if (Array.isArray(list) && list.length > 0) return list;
    }
  } catch (e) {
    console.warn("Could not read .new_arrivals.json:", e);
  }

  try {
    if (fs.existsSync(SRC_FILE_PATH)) {
      const content = fs.readFileSync(SRC_FILE_PATH, "utf-8");
      const list = JSON.parse(content || "[]");
      if (Array.isArray(list) && list.length > 0) return list;
    }
  } catch (e) {
    console.warn("Could not read src/data/new_arrivals.json:", e);
  }

  return Array.isArray(staticNewArrivals) ? staticNewArrivals : [];
}

function saveLocalCuratedIds(ids: string[]) {
  try {
    fs.writeFileSync(ROOT_FILE_PATH, JSON.stringify(ids, null, 2), "utf-8");
  } catch (e) {
    console.warn("Could not save to ROOT_FILE_PATH:", e);
  }

  try {
    if (fs.existsSync(path.dirname(SRC_FILE_PATH))) {
      fs.writeFileSync(SRC_FILE_PATH, JSON.stringify(ids, null, 2), "utf-8");
    }
  } catch (e) {
    console.warn("Could not save to SRC_FILE_PATH:", e);
  }
}

// ── GET: Fetch curated New Arrivals product IDs (and optionally full product objects) ──
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const includeProducts = searchParams.get("includeProducts") === "true";

    const supabaseAdmin = getSupabaseAdmin();
    let curatedIds: string[] = [];

    // 1. Try checking the official brand store bio in Supabase for curated_new_arrivals
    try {
      const { data: store } = await supabaseAdmin
        .from("stores")
        .select("id, shop_name, bio")
        .ilike("shop_name", "%AFRODER%")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (store?.bio) {
        const meta = parseStoreBio(store.bio);
        if (Array.isArray(meta.curated_new_arrivals) && meta.curated_new_arrivals.length > 0) {
          curatedIds = meta.curated_new_arrivals;
        }
      }
    } catch (e) {
      console.warn("Notice checking store bio for curated arrivals:", e);
    }

    // 2. Fallback to local file persistence if not found in database
    if (curatedIds.length === 0) {
      curatedIds = getLocalCuratedIds();
    }

    // 3. If full product objects requested (e.g. for Web Controller display)
    if (includeProducts && curatedIds.length > 0) {
      const { data: products } = await supabaseAdmin
        .from("products")
        .select("*, stores(id, shop_name)")
        .in("id", curatedIds);

      // Sort strictly in the exact order of curatedIds
      const orderMap = new Map(curatedIds.map((id, index) => [id, index]));
      const sortedProducts = (products || []).sort(
        (a, b) => (orderMap.get(a.id) ?? 999) - (orderMap.get(b.id) ?? 999)
      );

      return NextResponse.json({
        success: true,
        productIds: curatedIds,
        products: sortedProducts,
      });
    }

    return NextResponse.json({
      success: true,
      productIds: curatedIds,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message, productIds: getLocalCuratedIds() },
      { status: 500 }
    );
  }
}

// ── POST: Update curated New Arrivals product IDs & their sequence ──
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { productIds } = body;

    if (!Array.isArray(productIds)) {
      return NextResponse.json(
        { success: false, error: "productIds must be an array of product IDs" },
        { status: 400 }
      );
    }

    const cleanIds = productIds.filter((id) => typeof id === "string" && id.trim() !== "");

    // 1. Save locally in server files
    saveLocalCuratedIds(cleanIds);

    // 2. Persist in official AFRODER brand store bio (or first store) in Supabase
    const supabaseAdmin = getSupabaseAdmin();
    try {
      const { data: store } = await supabaseAdmin
        .from("stores")
        .select("id, shop_name, bio")
        .ilike("shop_name", "%AFRODER%")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (store) {
        const meta = parseStoreBio(store.bio);
        meta.curated_new_arrivals = cleanIds;
        const serialized = serializeStoreBio(meta);

        await supabaseAdmin
          .from("stores")
          .update({ bio: serialized })
          .eq("id", store.id);
      }
    } catch (dbErr) {
      console.warn("Could not save curated arrivals to store bio:", dbErr);
    }

    return NextResponse.json({
      success: true,
      productIds: cleanIds,
      count: cleanIds.length,
      message: "Homepage New Arrivals sequence updated successfully",
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

