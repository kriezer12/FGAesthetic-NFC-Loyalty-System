/**
 * Supabase Storage Service
 * =========================
 * 
 * Handles uploads, listing, renaming, and deleting in Supabase storage buckets
 */

import { supabase } from "./supabase"

export interface UploadResult {
  success: boolean
  path?: string
  url?: string
  error?: string
}

export interface StoredFile {
  id: string
  name: string
  path: string
  url: string
  signedUrl: string
  size: number
  createdAt: string
  updatedAt: string
  mimeType: string
}

/**
 * Upload image blob to Supabase storage
 */
export async function uploadToSupabase(
  bucket: string,
  path: string,
  blob: Blob
): Promise<UploadResult> {
  try {
    // Upload file
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, blob, {
        // Set long cache duration for static content to improve repeat visit performance
        cacheControl: "31536000", // 1 year
        upsert: false,
      })

    if (error) {
      return {
        success: false,
        error: `Upload failed: ${error.message}`,
      }
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(path)

    return {
      success: true,
      path: data.path,
      url: urlData.publicUrl,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error occurred"
    return {
      success: false,
      error: `Upload error: ${message}`,
    }
  }
}

/**
 * List all files in a bucket folder
 */
export async function listFiles(
  bucket: string,
  folder: string = ""
): Promise<{ success: boolean; files: StoredFile[]; error?: string }> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(folder, {
        limit: 100,
        offset: 0,
        sortBy: { column: "created_at", order: "desc" },
      })

    if (error) {
      return { success: false, files: [], error: `List failed: ${error.message}` }
    }

    // Filter out the placeholder .emptyFolderPlaceholder
    const filtered = (data ?? []).filter(
      (file) => file.name !== ".emptyFolderPlaceholder"
    )

    // Build signed URLs so images render even if bucket is private
    const paths = filtered.map((f) => (folder ? `${folder}/${f.name}` : f.name))
    const { data: signedData } = await supabase.storage
      .from(bucket)
      .createSignedUrls(paths, 604800) // 7 days (signed URL expiration)

    const signedMap = new Map(
      (signedData ?? []).map((s) => [s.path ?? "", s.signedUrl ?? ""])
    )

    const files: StoredFile[] = filtered.map((file) => {
      const filePath = folder ? `${folder}/${file.name}` : file.name
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath)

      return {
        id: file.id ?? file.name,
        name: file.name,
        path: filePath,
        url: urlData.publicUrl,
        signedUrl: signedMap.get(filePath) ?? urlData.publicUrl,
        size: file.metadata?.size ?? 0,
        createdAt: file.created_at ?? "",
        updatedAt: file.updated_at ?? file.created_at ?? "",
        mimeType: file.metadata?.mimetype ?? "image/webp",
      }
    })

    return { success: true, files }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return { success: false, files: [], error: `List error: ${message}` }
  }
}

/**
 * Delete file from bucket
 */
export async function deleteFromSupabase(
  bucket: string,
  path: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.storage.from(bucket).remove([path])
    if (error) {
      return { success: false, error: `Delete failed: ${error.message}` }
    }
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return { success: false, error: `Delete error: ${message}` }
  }
}

/**
 * Rename / move file in bucket (copy + delete original)
 */
export async function renameInSupabase(
  bucket: string,
  oldPath: string,
  newPath: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const { error: moveError } = await supabase.storage
      .from(bucket)
      .move(oldPath, newPath)

    if (moveError) {
      return { success: false, error: `Rename failed: ${moveError.message}` }
    }

    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(newPath)

    return { success: true, url: urlData.publicUrl }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return { success: false, error: `Rename error: ${message}` }
  }
}

/**
 * Check if file exists in bucket
 */
export async function fileExists(
  bucket: string,
  path: string
): Promise<boolean> {
  try {
    const { data } = await supabase.storage.from(bucket).list()
    return data?.some((file) => file.name === path.split("/").pop()) ?? false
  } catch {
    return false
  }
}
/**
 * Get a signed URL for an avatar image (bypasses CORS issues)
 */
export async function getAvatarSignedUrl(
  bucket: string,
  path: string,
  expirationSeconds: number = 604800 // 7 days
): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expirationSeconds)

    if (error || !data?.signedUrl) {
      console.error("Error creating signed URL:", error)
      return null
    }

    return data.signedUrl
  } catch (error) {
    console.error("Error getting signed URL:", error)
    return null
  }
}

/**
 * Generate signed URL for a file (works for both public and private buckets)
 */
export async function getSignedUrl(
  bucket: string,
  path: string,
  expiresIn: number = 604800 // 7 days default
): Promise<string> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn)

    if (error) {
      console.warn("Failed to create signed URL, falling back to public URL:", error)
      // Fallback to public URL
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(path)
      return urlData.publicUrl
    }

    return data.signedUrl
  } catch (err) {
    console.warn("Error generating signed URL:", err)
    // Fallback to public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(path)
    return urlData.publicUrl
  }
}
