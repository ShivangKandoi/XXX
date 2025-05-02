import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getCurrentDateTime() {
  const now = new Date()
  return now.toISOString()
}

export function getLocalStartOfDay() {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return now.toISOString()
}

export function getLocalEndOfDay() {
  const now = new Date()
  now.setHours(23, 59, 59, 999)
  return now.toISOString()
}
