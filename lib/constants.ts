// lib/constants.ts
/** Max length for user comments (read from .env, fallback to 3000). */
export const COMMENT_MAX_LENGTH =
  Number(process.env.NEXT_PUBLIC_COMMENT_MAX_LENGTH) || 3000;

/** How many community reports hide a comment (env-overrideable). */
export const REPORT_THRESHOLD =
  Number(process.env.NEXT_PUBLIC_REPORT_THRESHOLD) || 5;
