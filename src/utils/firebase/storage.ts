import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { storage, isFirebaseConfigured } from "./client";
import { supabase } from "../supabase/client";
import { isCloudinaryConfigured, uploadToCloudinary } from "../cloudinary/storage";

export interface UploadMediaOptions {
  folder?: "products" | "store_logos" | "receipts" | "media";
  userId?: string;
  onProgress?: (progress: number) => void;
}

/**
 * Checks whether a given media URL is a video.
 */
export function isVideoMedia(url: string): boolean {
  if (!url) return false;
  return (
    /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(url) ||
    url.includes("/video/upload/") ||
    url.includes("video%2F") ||
    url.includes("/video/")
  );
}

/**
 * Unified media upload handler.
 * Priority:
 * 1. Cloudinary (25 GB free storage & fast CDN, zero credit card required)
 * 2. Firebase Cloud Storage (GCS bucket for high-capacity media)
 * 3. Graceful fallback to Supabase Storage if neither external provider is configured.
 */
export async function uploadMediaToStorage(
  file: File,
  options?: UploadMediaOptions
): Promise<string> {
  const folder = options?.folder || "products";
  const userId = options?.userId || "user";
  const onProgress = options?.onProgress;

  // 1. Try Cloudinary if configured (25GB free storage, no credit card required)
  if (isCloudinaryConfigured) {
    try {
      return await uploadToCloudinary(file, {
        folder,
        onProgress,
      });
    } catch (cldErr: any) {
      console.warn("[Cloudinary] Upload error, falling back:", cldErr?.message || cldErr);
    }
  }

  // Sanitize filename & extension
  const rawExt = file.name.split(".").pop()?.toLowerCase() || (file.type.startsWith("video/") ? "mp4" : "jpg");
  const cleanExt = rawExt.replace(/[^a-z0-9]/g, "");
  const randomSuffix = Math.random().toString(36).substring(2, 9);
  const fileName = `${userId}-${Date.now()}-${randomSuffix}.${cleanExt}`;
  const filePath = `${folder}/${fileName}`;

  // 2. Try Firebase Cloud Storage if configured
  if (isFirebaseConfigured && storage) {
    try {
      const storageRef = ref(storage, filePath);
      const metadata = {
        contentType: file.type || (file.name.endsWith(".mp4") ? "video/mp4" : "image/jpeg"),
      };

      return await new Promise<string>((resolve, reject) => {
        const uploadTask = uploadBytesResumable(storageRef, file, metadata);

        uploadTask.on(
          "state_changed",
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            if (onProgress) onProgress(Math.round(progress));
          },
          (error) => {
            console.error("[Firebase Storage] Upload error:", error);
            reject(error);
          },
          async () => {
            try {
              const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(downloadUrl);
            } catch (urlErr) {
              reject(urlErr);
            }
          }
        );
      });
    } catch (fbErr: any) {
      console.warn("[Firebase Storage] Error during upload, attempting fallback to Supabase:", fbErr?.message || fbErr);
    }
  }

  // 2. Fallback to Supabase Storage if Firebase is not active or encountered an issue
  const supabaseBucket = folder === "store_logos" ? "store_logos" : "product_images";
  const { error: uploadError } = await supabase.storage
    .from(supabaseBucket)
    .upload(fileName, file, {
      contentType: file.type || undefined,
      upsert: true,
    });

  if (uploadError) {
    throw new Error(
      `Media upload failed: ${uploadError.message}. Make sure storage permissions or Firebase environment variables are configured.`
    );
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(supabaseBucket).getPublicUrl(fileName);

  if (onProgress) onProgress(100);
  return publicUrl;
}

/**
 * Upload multiple media files sequentially or concurrently with progress.
 */
export async function uploadMultipleMedia(
  files: File[],
  options?: UploadMediaOptions
): Promise<string[]> {
  const uploadedUrls: string[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const url = await uploadMediaToStorage(file, {
      ...options,
      onProgress: (p) => {
        if (options?.onProgress) {
          const overallProgress = Math.round(((i + p / 100) / files.length) * 100);
          options.onProgress(overallProgress);
        }
      },
    });
    uploadedUrls.push(url);
  }

  return uploadedUrls;
}

/**
 * Delete a media file from storage (best-effort clean-up).
 */
export async function deleteMediaFromStorage(url: string): Promise<void> {
  if (!url) return;

  try {
    if (url.includes("firebasestorage.googleapis.com") && storage) {
      // Decode Firebase storage path from URL
      const matches = url.match(/\/o\/(.*?)\?/);
      if (matches && matches[1]) {
        const decodedPath = decodeURIComponent(matches[1]);
        const storageRef = ref(storage, decodedPath);
        await deleteObject(storageRef);
      }
    } else if (url.includes("supabase.co/storage")) {
      const parts = url.split("/public/");
      if (parts[1]) {
        const [bucket, ...pathParts] = parts[1].split("/");
        const filePath = pathParts.join("/");
        await supabase.storage.from(bucket).remove([filePath]);
      }
    }
  } catch (err) {
    console.warn("[Storage] Non-critical delete notice:", err);
  }
}

