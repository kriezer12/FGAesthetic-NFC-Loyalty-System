/**
 * File Validation Utilities
 * ==========================
 * 
 * Handles file type validation, size checks, and error management
 */

export interface ValidationError {
  field: string
  message: string
}

export interface FileValidationOptions {
  maxSize?: number // in bytes
  allowedTypes?: string[]
}

const DEFAULT_MAX_SIZE = 50 * 1024 * 1024 // 50MB
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
]

/**
 * Validate file before processing
 */
export function validateFile(
  file: File | null,
  options: FileValidationOptions = {}
): ValidationError[] {
  const errors: ValidationError[] = []
  const {
    maxSize = DEFAULT_MAX_SIZE,
    allowedTypes = ALLOWED_IMAGE_TYPES,
  } = options

  if (!file) {
    errors.push({
      field: "file",
      message: "Please select a file",
    })
    return errors
  }

  // Check file type
  if (!allowedTypes.includes(file.type)) {
    errors.push({
      field: "type",
      message: `Invalid file type. Allowed types: ${allowedTypes.join(", ")}`,
    })
  }

  // Check file size
  if (file.size > maxSize) {
    const maxSizeMB = Math.round(maxSize / 1024 / 1024)
    errors.push({
      field: "size",
      message: `File size exceeds maximum limit of ${maxSizeMB}MB`,
    })
  }

  // Check file name
  if (!file.name || file.name.trim().length === 0) {
    errors.push({
      field: "name",
      message: "File must have a valid name",
    })
  }

  return errors
}

/**
 * Check if file is a valid image type
 */
export function isValidImageType(file: File): boolean {
  return ALLOWED_IMAGE_TYPES.includes(file.type)
}

/**
 * Check if file size is within limits
 */
export function isFileSizeValid(file: File, maxSize: number = DEFAULT_MAX_SIZE): boolean {
  return file.size <= maxSize
}

/**
 * Get error message for a specific field
 */
export function getErrorMessage(errors: ValidationError[], field: string): string | null {
  const error = errors.find((e) => e.field === field)
  return error?.message ?? null
}
