export interface CategoryItem {
  name: string;
  sizeType: "apparel" | "waist" | "footwear" | "volume" | "free_size" | "belt";
  defaultSizes: string[];
  unitLabel: string;
  isAccessory: boolean;
}

export interface CategoryGroup {
  groupName: string;
  categories: CategoryItem[];
}

export const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    groupName: "Topwear & Apparel",
    categories: [
      { name: "T-Shirt", sizeType: "apparel", defaultSizes: ["XS", "S", "M", "L", "XL", "XXL", "3XL"], unitLabel: "Size", isAccessory: false },
      { name: "Oversized T-Shirt", sizeType: "apparel", defaultSizes: ["S", "M", "L", "XL", "XXL"], unitLabel: "Size", isAccessory: false },
      { name: "Shirt", sizeType: "apparel", defaultSizes: ["S", "M", "L", "XL", "XXL"], unitLabel: "Size", isAccessory: false },
      { name: "Polo T-Shirt", sizeType: "apparel", defaultSizes: ["S", "M", "L", "XL", "XXL"], unitLabel: "Size", isAccessory: false },
      { name: "Hoodie", sizeType: "apparel", defaultSizes: ["S", "M", "L", "XL", "XXL"], unitLabel: "Size", isAccessory: false },
      { name: "Sweatshirt", sizeType: "apparel", defaultSizes: ["S", "M", "L", "XL", "XXL"], unitLabel: "Size", isAccessory: false },
      { name: "Jacket", sizeType: "apparel", defaultSizes: ["S", "M", "L", "XL", "XXL"], unitLabel: "Size", isAccessory: false },
      { name: "Suit / Blazer", sizeType: "apparel", defaultSizes: ["36", "38", "40", "42", "44"], unitLabel: "Chest Size", isAccessory: false },
      { name: "Kurta & Ethnic", sizeType: "apparel", defaultSizes: ["S", "M", "L", "XL", "XXL"], unitLabel: "Size", isAccessory: false },
      { name: "Complete Wear", sizeType: "apparel", defaultSizes: ["S", "M", "L", "XL", "XXL"], unitLabel: "Size", isAccessory: false },
    ],
  },
  {
    groupName: "Bottomwear & Pants",
    categories: [
      { name: "Jeans", sizeType: "waist", defaultSizes: ["28", "30", "32", "34", "36", "38", "40"], unitLabel: "Waist (Inches)", isAccessory: false },
      { name: "Formal Pants", sizeType: "waist", defaultSizes: ["28", "30", "32", "34", "36", "38", "40"], unitLabel: "Waist (Inches)", isAccessory: false },
      { name: "Trousers & Chinos", sizeType: "waist", defaultSizes: ["28", "30", "32", "34", "36", "38", "40"], unitLabel: "Waist (Inches)", isAccessory: false },
      { name: "Lower & Trackpants", sizeType: "waist", defaultSizes: ["28", "30", "32", "34", "36", "38", "40"], unitLabel: "Waist (Inches)", isAccessory: false },
      { name: "Cargo Pants", sizeType: "waist", defaultSizes: ["28", "30", "32", "34", "36", "38", "40"], unitLabel: "Waist (Inches)", isAccessory: false },
      { name: "Shorts", sizeType: "waist", defaultSizes: ["28", "30", "32", "34", "36", "38"], unitLabel: "Waist (Inches)", isAccessory: false },
    ],
  },
  {
    groupName: "Footwear & Shoes",
    categories: [
      { name: "Sneakers", sizeType: "footwear", defaultSizes: ["UK 6", "UK 7", "UK 8", "UK 9", "UK 10", "UK 11", "UK 12"], unitLabel: "Shoe Size (UK/IND)", isAccessory: false },
      { name: "Casual Shoes", sizeType: "footwear", defaultSizes: ["UK 6", "UK 7", "UK 8", "UK 9", "UK 10", "UK 11"], unitLabel: "Shoe Size (UK/IND)", isAccessory: false },
      { name: "Formal Shoes", sizeType: "footwear", defaultSizes: ["UK 6", "UK 7", "UK 8", "UK 9", "UK 10", "UK 11"], unitLabel: "Shoe Size (UK/IND)", isAccessory: false },
      { name: "Loafers", sizeType: "footwear", defaultSizes: ["UK 6", "UK 7", "UK 8", "UK 9", "UK 10", "UK 11"], unitLabel: "Shoe Size (UK/IND)", isAccessory: false },
      { name: "Boots", sizeType: "footwear", defaultSizes: ["UK 7", "UK 8", "UK 9", "UK 10", "UK 11"], unitLabel: "Shoe Size (UK/IND)", isAccessory: false },
      { name: "Slides & Slippers", sizeType: "footwear", defaultSizes: ["UK 6", "UK 7", "UK 8", "UK 9", "UK 10", "UK 11"], unitLabel: "Shoe Size (UK/IND)", isAccessory: false },
    ],
  },
  {
    groupName: "Watches & Timepieces",
    categories: [
      { name: "Watch", sizeType: "free_size", defaultSizes: ["Free Size", "Dial 40mm", "Dial 42mm", "Dial 44mm"], unitLabel: "Dial / Size", isAccessory: true },
      { name: "Analog Watch", sizeType: "free_size", defaultSizes: ["Free Size"], unitLabel: "Size", isAccessory: true },
      { name: "Digital Watch", sizeType: "free_size", defaultSizes: ["Free Size"], unitLabel: "Size", isAccessory: true },
      { name: "Chronograph Watch", sizeType: "free_size", defaultSizes: ["Free Size"], unitLabel: "Size", isAccessory: true },
      { name: "Smartwatch", sizeType: "free_size", defaultSizes: ["Free Size", "40mm", "44mm", "45mm"], unitLabel: "Case Size", isAccessory: true },
    ],
  },
  {
    groupName: "Eyewear & Sunglasses",
    categories: [
      { name: "Sunglasses", sizeType: "free_size", defaultSizes: ["Free Size", "Medium", "Wide"], unitLabel: "Fit", isAccessory: true },
      { name: "Aviator Sunglasses", sizeType: "free_size", defaultSizes: ["Free Size"], unitLabel: "Fit", isAccessory: true },
      { name: "Wayfarer Sunglasses", sizeType: "free_size", defaultSizes: ["Free Size"], unitLabel: "Fit", isAccessory: true },
      { name: "Optical Frames", sizeType: "free_size", defaultSizes: ["Free Size", "Medium", "Wide"], unitLabel: "Frame Size", isAccessory: true },
    ],
  },
  {
    groupName: "Fragrances & Perfumes",
    categories: [
      { name: "Perfume", sizeType: "volume", defaultSizes: ["30ml", "50ml", "100ml", "150ml", "200ml"], unitLabel: "Bottle Volume", isAccessory: true },
      { name: "Eau De Parfum (EDP)", sizeType: "volume", defaultSizes: ["50ml", "100ml"], unitLabel: "Bottle Volume", isAccessory: true },
      { name: "Eau De Toilette (EDT)", sizeType: "volume", defaultSizes: ["50ml", "100ml"], unitLabel: "Bottle Volume", isAccessory: true },
      { name: "Attar / Ittar", sizeType: "volume", defaultSizes: ["6ml", "12ml", "24ml"], unitLabel: "Bottle Volume", isAccessory: true },
      { name: "Body Spray / Deodorant", sizeType: "volume", defaultSizes: ["150ml", "200ml"], unitLabel: "Bottle Volume", isAccessory: true },
    ],
  },
  {
    groupName: "Men's Fashion Accessories",
    categories: [
      { name: "Belt", sizeType: "belt", defaultSizes: ["Free Size", "28-32", "32-36", "36-40", "38-42"], unitLabel: "Waist Fit", isAccessory: true },
      { name: "Leather Wallet", sizeType: "free_size", defaultSizes: ["Free Size"], unitLabel: "Size", isAccessory: true },
      { name: "Cap / Hat", sizeType: "free_size", defaultSizes: ["Free Size", "Adjustable"], unitLabel: "Size", isAccessory: true },
      { name: "Jewelry & Chains", sizeType: "free_size", defaultSizes: ["Free Size", "18 inch", "20 inch", "22 inch", "24 inch"], unitLabel: "Length", isAccessory: true },
      { name: "Bracelet / Kada", sizeType: "free_size", defaultSizes: ["Free Size", "Standard"], unitLabel: "Fit", isAccessory: true },
      { name: "Rings", sizeType: "free_size", defaultSizes: ["Size 7", "Size 8", "Size 9", "Size 10", "Free Size"], unitLabel: "Ring Size", isAccessory: true },
      { name: "Bags & Backpacks", sizeType: "free_size", defaultSizes: ["Free Size", "Standard"], unitLabel: "Size", isAccessory: true },
      { name: "Socks", sizeType: "free_size", defaultSizes: ["Free Size", "UK 7-11"], unitLabel: "Shoe Fit", isAccessory: true },
    ],
  },
];

// Flat list of all predefined category names
export const ALL_CATEGORY_NAMES = CATEGORY_GROUPS.flatMap((group) =>
  group.categories.map((c) => c.name)
);

/**
 * Given a category string (or title), determines its sizing type, unit label, and default size presets.
 */
export function detectCategoryConfig(categoryOrName?: string) {
  const query = (categoryOrName || "").trim().toLowerCase();

  // 1. Direct match with our predefined items
  for (const group of CATEGORY_GROUPS) {
    for (const cat of group.categories) {
      if (cat.name.toLowerCase() === query) {
        return {
          sizeType: cat.sizeType,
          label: getSectionLabel(cat.sizeType, cat.unitLabel),
          unitLabel: cat.unitLabel,
          presetSizes: cat.defaultSizes,
          isAccessory: cat.isAccessory,
        };
      }
    }
  }

  // 2. Pattern detection for custom/free-text category entries
  if (/\b(shoe|shoes|sneaker|sneakers|loafer|loafers|boot|boots|footwear|slides|slippers|sandals)\b/i.test(query)) {
    return {
      sizeType: "footwear" as const,
      label: "Select Shoe Size (UK / India)",
      unitLabel: "Shoe Size (UK/IND)",
      presetSizes: ["UK 6", "UK 7", "UK 8", "UK 9", "UK 10", "UK 11", "UK 12"],
      isAccessory: false,
    };
  }

  if (/\b(jean|jeans|denim|pant|pants|trouser|trousers|lower|lowers|cargo|cargos|chinos|formal pants|shorts|trackpants)\b/i.test(query)) {
    return {
      sizeType: "waist" as const,
      label: "Select Waist Size (Inches)",
      unitLabel: "Waist (Inches)",
      presetSizes: ["28", "30", "32", "34", "36", "38", "40", "42"],
      isAccessory: false,
    };
  }

  if (/\b(perfume|perfumes|fragrance|fragrances|attar|ittar|cologne|edp|edt|mist|deodorant|scent)\b/i.test(query)) {
    return {
      sizeType: "volume" as const,
      label: "Select Bottle Volume",
      unitLabel: "Volume",
      presetSizes: ["30ml", "50ml", "100ml", "150ml", "200ml"],
      isAccessory: true,
    };
  }

  if (/\b(watch|watches|smartwatch|chronograph|timepiece)\b/i.test(query)) {
    return {
      sizeType: "free_size" as const,
      label: "Select Watch Size / Dial",
      unitLabel: "Dial / Size",
      presetSizes: ["Free Size", "Dial 40mm", "Dial 42mm", "Dial 44mm"],
      isAccessory: true,
    };
  }

  if (/\b(sunglass|sunglasses|eyewear|shades|goggles|spectacles|frames)\b/i.test(query)) {
    return {
      sizeType: "free_size" as const,
      label: "Select Eyewear Fit",
      unitLabel: "Fit",
      presetSizes: ["Free Size", "Medium", "Wide"],
      isAccessory: true,
    };
  }

  if (/\b(belt|belts)\b/i.test(query)) {
    return {
      sizeType: "belt" as const,
      label: "Select Belt Waist Fit",
      unitLabel: "Waist Range",
      presetSizes: ["Free Size", "28-32", "32-36", "36-40", "38-42"],
      isAccessory: true,
    };
  }

  if (/\b(wallet|wallets|cap|caps|hat|hats|chain|chains|bracelet|bracelets|ring|rings|jewelry|jewellery|bag|backpack|purse)\b/i.test(query)) {
    return {
      sizeType: "free_size" as const,
      label: "Select Size",
      unitLabel: "Size",
      presetSizes: ["Free Size", "One Size", "Standard"],
      isAccessory: true,
    };
  }

  // Default to standard apparel
  return {
    sizeType: "apparel" as const,
    label: "Select Apparel Size",
    unitLabel: "Clothing Size",
    presetSizes: ["XS", "S", "M", "L", "XL", "XXL", "3XL"],
    isAccessory: false,
  };
}

function getSectionLabel(sizeType: string, unitLabel: string): string {
  switch (sizeType) {
    case "waist":
      return "Select Waist Size (Inches)";
    case "footwear":
      return "Select Shoe Size (UK / India)";
    case "volume":
      return "Select Bottle Volume";
    case "belt":
      return "Select Belt Waist Fit";
    case "free_size":
      return "Select Size / Fit";
    case "apparel":
    default:
      return "Select Size";
  }
}

/**
 * Returns a human-friendly single noun for product type (e.g. "watch", "shoes", "jeans", "perfume", "shirt").
 */
export function getProductTypeNoun(title?: string, description?: string, category?: string): string {
  const text = `${title || ""} ${description || ""} ${category || ""}`.toLowerCase();
  if (/\b(watch|watches|smartwatch)\b/.test(text)) return "watch";
  if (/\b(sunglass|sunglasses|shades|goggles)\b/.test(text)) return "sunglasses";
  if (/\b(perfume|perfumes|fragrance|cologne|attar|ittar)\b/.test(text)) return "perfume";
  if (/\b(shoe|shoes|sneaker|sneakers|loafer|boots)\b/.test(text)) return "shoes";
  if (/\b(jean|jeans|denim)\b/.test(text)) return "jeans";
  if (/\b(pant|pants|trouser|trousers|lower|lowers|cargo|cargos|shorts)\b/.test(text)) return "pants";
  if (/\b(belt|belts)\b/.test(text)) return "belt";
  if (/\b(wallet|wallets)\b/.test(text)) return "wallet";
  if (/\b(cap|caps|hat|hats)\b/.test(text)) return "cap";
  if (/\b(hoodie|hoodies|sweatshirt)\b/.test(text)) return "hoodie";
  if (/\b(jacket|jackets|coat)\b/.test(text)) return "jacket";
  if (/\b(polo|shirt|shirts)\b/.test(text)) return "shirt";
  if (/\b(t-?shirt|tee|tees)\b/.test(text)) return "T-shirt";
  if (/\b(kurta|kurti)\b/.test(text)) return "kurta";
  return "product";
}

/**
 * Checks if a product's size list only represents standard / single size (so auto-selection is seamless).
 */
export function isFreeSizeOrSingle(sizes?: string[]): boolean {
  if (!Array.isArray(sizes) || sizes.length === 0) return true;
  if (sizes.length === 1) {
    const val = sizes[0].trim().toLowerCase();
    return val === "free size" || val === "one size" || val === "standard" || val === "free" || val === "all";
  }
  return false;
}

