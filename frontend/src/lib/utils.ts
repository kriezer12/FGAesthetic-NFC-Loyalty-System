/**
 * Utility Functions
 * =================
 * 
 * Common utility functions used throughout the application.
 */

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Combines class names with Tailwind CSS class merging.
 * Uses clsx for conditional classes and tailwind-merge to handle conflicts.
 * 
 * @param inputs - Class values to combine
 * @returns Merged class string
 * 
 * @example
 *   cn("px-4 py-2", isActive && "bg-blue-500", className)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
