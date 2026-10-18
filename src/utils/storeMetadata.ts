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
    };
  }

  try {
    const trimmed = rawBio.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      const parsed = JSON.parse(trimmed);
      return {
        bio: parsed.bio || "",
        location: parsed.location || "",
        phone: parsed.phone || "",
        whatsapp: parsed.whatsapp || "",
        shop_photo_url: parsed.shop_photo_url || "",
        reviews: Array.isArray(parsed.reviews) ? parsed.reviews : [],
        orders: Array.isArray(parsed.orders) ? parsed.orders : [],
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
  };
}

export function serializeStoreBio(meta: Partial<StoreMetadata>): string {
  return JSON.stringify({
    bio: meta.bio || "",
    location: meta.location || "",
    phone: meta.phone || "",
    whatsapp: meta.whatsapp || "",
    shop_photo_url: meta.shop_photo_url || "",
    reviews: Array.isArray(meta.reviews) ? meta.reviews : [],
    orders: Array.isArray(meta.orders) ? meta.orders : [],
  });
}
