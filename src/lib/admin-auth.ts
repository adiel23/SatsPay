import { createHash } from "crypto";
import { cookies } from "next/headers";
import { getAdminPassword } from "./blink";

export const ADMIN_COOKIE_NAME = "remesas_sv_admin_token";

export function computeAdminToken(password: string): string {
  return createHash("sha256")
    .update(`remesas-sv-admin-salt:${password}`)
    .digest("hex");
}

export function verifyAdminPassword(inputPassword: string): boolean {
  const expected = getAdminPassword();
  return inputPassword === expected;
}

export async function isAdminAuthenticated(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const tokenCookie = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
    if (!tokenCookie) return false;
    const expectedToken = computeAdminToken(getAdminPassword());
    return tokenCookie === expectedToken;
  } catch {
    return false;
  }
}
