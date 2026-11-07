import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");

  if (!lat || !lng) {
    return NextResponse.json(
      { success: false, error: "lat and lng query parameters are required" },
      { status: 400 }
    );
  }

  const parsedLat = parseFloat(lat);
  const parsedLng = parseFloat(lng);

  if (isNaN(parsedLat) || isNaN(parsedLng)) {
    return NextResponse.json(
      { success: false, error: "Invalid coordinates" },
      { status: 400 }
    );
  }

  const googleMapsUrl = `https://www.google.com/maps?q=${parsedLat},${parsedLng}`;

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${parsedLat}&lon=${parsedLng}&addressdetails=1`,
      {
        headers: {
          "User-Agent": "AFRODER-Marketplace/1.0 (support@afroder.shop)",
          Accept: "application/json",
        },
      }
    );

    if (!res.ok) {
      throw new Error(`Reverse geocode failed with status: ${res.status}`);
    }

    const data = await res.json();
    const addr = data.address || {};

    const shopName = addr.shop || addr.building || addr.amenity || addr.office || "";
    const street = addr.road || addr.pedestrian || addr.suburb || addr.neighbourhood || "";
    const area = addr.suburb || addr.residential || addr.neighbourhood || "";
    const city = addr.city || addr.town || addr.village || addr.county || addr.state_district || "";
    const state = addr.state || "";
    const pincode = addr.postcode || "";

    // Build clean human-friendly address string
    const distinctParts: string[] = [];
    if (shopName) distinctParts.push(shopName);
    if (street && !distinctParts.includes(street)) distinctParts.push(street);
    if (area && !distinctParts.includes(area) && area !== street) distinctParts.push(area);
    if (city && !distinctParts.includes(city)) distinctParts.push(city);
    if (state && !distinctParts.includes(state)) distinctParts.push(state);
    if (pincode) distinctParts.push(pincode);

    const cleanAddress = distinctParts.length > 0 ? distinctParts.join(", ") : data.display_name || "";

    return NextResponse.json({
      success: true,
      address: cleanAddress || `${parsedLat.toFixed(5)}, ${parsedLng.toFixed(5)}`,
      street: street || cleanAddress,
      city: city || "",
      state: state || "",
      pincode: pincode || "",
      lat: parsedLat,
      lng: parsedLng,
      googleMapsUrl,
    });
  } catch (err: any) {
    // Graceful fallback: return valid GPS coordinates and Google Maps link
    return NextResponse.json({
      success: true,
      address: `GPS Location (${parsedLat.toFixed(5)}, ${parsedLng.toFixed(5)})`,
      street: "",
      city: "",
      state: "",
      pincode: "",
      lat: parsedLat,
      lng: parsedLng,
      googleMapsUrl,
    });
  }
}

