export function isSelfHosted(): boolean {
  return (process.env.SELF_HOSTED ?? "true") === "true";
}

export function getAdminEmail(): string {
  return process.env.ADMIN_EMAIL || "";
}
