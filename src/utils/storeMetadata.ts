export interface StoreReview {
  id: string;
  author_name: string;
  rating: number; // 1 to 5
  comment: string;
  created_at: string;
}

export interface StoreMetadata {
  bio: string;
  location?: string;
  phone?: string;
  whatsapp?: string; // phone number or chat/group link
  shop_photo_url?: string;
  reviews?: StoreReview[];
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
  });
}
