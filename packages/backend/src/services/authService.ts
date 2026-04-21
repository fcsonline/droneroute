import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    const selfHosted = (process.env.SELF_HOSTED ?? "true") === "true";
    if (selfHosted) {
      // Self-hosted dev mode: use a default secret with a warning
      console.warn(
        "WARNING: JWT_SECRET is not set. Using insecure default. Set JWT_SECRET in production.",
      );
      return "droneroute-dev-secret-do-not-use-in-production";
    }
    throw new Error(
      "JWT_SECRET environment variable is required in cloud mode",
    );
  }
  if (secret.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters for security");
  }
  return secret;
}

const JWT_SECRET = getJwtSecret();
const TOKEN_EXPIRY = "7d";

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

export function comparePassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export function generateToken(userId: string, isAdmin: boolean): string {
  return jwt.sign({ userId, isAdmin }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

export function verifyToken(
  token: string,
): { userId: string; isAdmin: boolean } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as {
      userId: string;
      isAdmin: boolean;
    };
  } catch {
    return null;
  }
}
