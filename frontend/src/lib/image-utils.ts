/**
 * Image Processing Utilities
 * ===========================
 * 
 * Handles image compression, WebP conversion using native Canvas API
 * (webp-wasm alternative with optimized performance)
 */

export interface ImageProcessingOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number
}

export interface ProcessedImage {
  blob: Blob
  format: string
  originalSize: number
  compressedSize: number
  width: number
  height: number
}

/**
 * Convert image to WebP format with compression
 * Uses Canvas API with WebP encoding for native browser support
 */
export async function convertToWebP(
  file: File,
  options: ImageProcessingOptions = {}
): Promise<ProcessedImage> {
  const {
    maxWidth = 1920,
    maxHeight = 1920,
    quality = 0.8,
  } = options

  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const img = new Image()

        img.onload = () => {
          try {
            // Calculate new dimensions while maintaining aspect ratio
            let width = img.width
            let height = img.height

            if (width > maxWidth || height > maxHeight) {
              const aspectRatio = width / height

              if (width > height) {
                width = Math.min(maxWidth, width)
                height = Math.round(width / aspectRatio)
              } else {
                height = Math.min(maxHeight, height)
                width = Math.round(height * aspectRatio)
              }
            }

            // Create canvas and draw resized image
            const canvas = document.createElement("canvas")
            canvas.width = width
            canvas.height = height

            const ctx = canvas.getContext("2d", { willReadFrequently: true })
            if (!ctx) {
              reject(new Error("Failed to get canvas context"))
              return
            }

            ctx.drawImage(img, 0, 0, width, height)

            // Convert to WebP using Canvas toBlob API
            canvas.toBlob(
              (blob) => {
                if (!blob) {
                  reject(new Error("Failed to convert image to blob"))
                  return
                }

                resolve({
                  blob,
                  format: "webp",
                  originalSize: file.size,
                  compressedSize: blob.size,
                  width,
                  height,
                })
              },
              "image/webp",
              quality
            )
          } catch (error) {
            reject(
              error instanceof Error ? error : new Error("Processing failed")
            )
          }
        }

        img.onerror = () => {
          reject(new Error("Failed to load image"))
        }

        img.src = e.target?.result as string
      } catch (error) {
        reject(
          error instanceof Error ? error : new Error("File read failed")
        )
      }
    }

    reader.onerror = () => {
      reject(new Error("Failed to read file"))
    }

    reader.readAsDataURL(file)
  })
}

/**
 * Generate unique filename with timestamp
 */
export function generateFileName(originalName: string, format: string = "webp"): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  const nameWithoutExt = originalName.split(".")[0]
  
  // Sanitize filename
  const sanitized = nameWithoutExt
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 50)
  
  return `${sanitized}-${timestamp}-${random}.${format}`
}

/**
 * Calculate file size in readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes"
  
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
}

/**
 * Calculate compression ratio
 */
export function calculateCompressionRatio(originalSize: number, compressedSize: number): number {
  return Math.round(((originalSize - compressedSize) / originalSize) * 100)
}
