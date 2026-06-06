import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getErrorMessage(
  err: unknown,
  fallback = 'Something went wrong'
): string {
  if (err instanceof Error && 'response' in err) {
    const data = (err as { response?: { data?: { message?: unknown } } })
      .response?.data?.message;

    if (typeof data === 'string') return data;
    if (Array.isArray(data) && typeof data[0] === 'string') return data[0];

    // Nested message object — backend wraps validation errors
    if (typeof data === 'object' && data !== null && 'message' in data) {
      const inner = (data as { message?: unknown }).message;
      if (typeof inner === 'string') return inner;
      if (Array.isArray(inner) && typeof inner[0] === 'string') return inner[0];
    }
  }
  return fallback;
}
