export const SELF_HOSTED = (process.env.SELF_HOSTED ?? "true") === "true";
export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "";
