// lib/constants.ts
/** Max length for user comments (read from .env, fallback to 3000). */
export const COMMENT_MAX_LENGTH =
  Number(process.env.NEXT_PUBLIC_COMMENT_MAX_LENGTH) || 3000;

export const COMMENT_MIN_LENGTH =
  Number(process.env.NEXT_PUBLIC_COMMENT_MIN_LENGTH) || 10;

/** How many community reports hide a comment (env-overrideable). */
export const REPORT_THRESHOLD =
  Number(process.env.NEXT_PUBLIC_REPORT_THRESHOLD) || 5;


/** Maximum comments per subject per IP/fingerprint. */
export const COMMENTS_PER_SUBJECT_LIMIT = 2;

/** Maximum comments per subject per IP (higher limit for shared networks like universities). */
export const COMMENTS_PER_SUBJECT_IP_LIMIT = 20;
