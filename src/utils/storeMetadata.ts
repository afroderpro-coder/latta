export interface StoreReview {
  id: string;
  author_name: string;
  rating: number; // 1 to 5
  comment: string;
  created_at: string;
}

export interface StoreOrderItem {
  product_id: string;
  product_title: string;
  size?: string;
  quantity: number;
  price: number;
  image_url?: string;
}

export interface StoreOrder {
  id: string;
  created_at: string;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  customer_notes?: string;
  items: StoreOrderItem[];
  total_amount: number;
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
}

export interface StoreMetadata {
  bio: string;
  location?: string;
  phone?: string;
  whatsapp?: string; // phone number or chat/group link
  shop_photo_url?: string;
  reviews?: StoreReview[];
  orders?: StoreOrder[];
  // Seller approval workflow fields
  approval_status?: "pending" | "approved" | "rejected";
  seller_name?: string;
  seller_email?: string;
  contact_number?: string;
  applied_at?: string;
  reviewed_at?: string;
  rejection_reason?: string;
  // Seller subscription & fee fields
  subscription_plan?: string;
  payment_amount?: number;
  payment_receipt_url?: string;
  payment_utr?: string;
}

export function parseStoreBio(rawBio: string | null | undefined): StoreMetadata {
  if (!rawBio) {
    return {
      bio: "",
      location: "",
      phone: "",
      whatsapp: "",
      shop_photo_url: "",
      reviews: [],
      orders: [],
      approval_status: "approved", // Existing stores without bio default to approved
    };
  }

  try {
    const trimmed = rawBio.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      const parsed = JSON.parse(trimmed);
      return {
        bio: parsed.bio || "",
        location: parsed.location || "",
        phone: parsed.phone || parsed.contact_number || "",
        whatsapp: parsed.whatsapp || parsed.contact_number || "",
        shop_photo_url: parsed.shop_photo_url || "",
        reviews: Array.isArray(parsed.reviews) ? parsed.reviews : [],
        orders: Array.isArray(parsed.orders) ? parsed.orders : [],
        approval_status: parsed.approval_status || "approved",
        seller_name: parsed.seller_name || "",
        seller_email: parsed.seller_email || "",
        contact_number: parsed.contact_number || parsed.phone || "",
        applied_at: parsed.applied_at || "",
        reviewed_at: parsed.reviewed_at || "",
        rejection_reason: parsed.rejection_reason || "",
        subscription_plan: parsed.subscription_plan || "",
        payment_amount: parsed.payment_amount,
        payment_receipt_url: parsed.payment_receipt_url || "",
        payment_utr: parsed.payment_utr || "",
      };
    }
  } catch {
    // Treat as plain text bio
  }

  return {
    bio: rawBio,
    location: "",
    phone: "",
    whatsapp: "",
    shop_photo_url: "",
    reviews: [],
    orders: [],
    approval_status: "approved",
  };
}

export function serializeStoreBio(meta: Partial<StoreMetadata>): string {
  return JSON.stringify({
    bio: meta.bio || "",
    location: meta.location || "",
    phone: meta.phone || meta.contact_number || "",
    whatsapp: meta.whatsapp || meta.contact_number || "",
    shop_photo_url: meta.shop_photo_url || "",
    reviews: Array.isArray(meta.reviews) ? meta.reviews : [],
    orders: Array.isArray(meta.orders) ? meta.orders : [],
    approval_status: meta.approval_status || "approved",
    seller_name: meta.seller_name || "",
    seller_email: meta.seller_email || "",
    contact_number: meta.contact_number || meta.phone || "",
    applied_at: meta.applied_at || "",
    reviewed_at: meta.reviewed_at || "",
    rejection_reason: meta.rejection_reason || "",
    subscription_plan: meta.subscription_plan || "",
    payment_amount: meta.payment_amount,
    payment_receipt_url: meta.payment_receipt_url || "",
    payment_utr: meta.payment_utr || "",
  });
}

