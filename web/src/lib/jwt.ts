export interface JwtPayload {
  sub?: string;
  exp?: number;
  iat?: number;
  username?: string;
  role?: string;
  [key: string]: unknown;
}

export function decodeJwt(token: string): JwtPayload | null {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join(""),
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error("Failed to decode JWT:", error);
    return null;
  }
}

export function getUserIdFromToken(token: string | null): string | null {
  if (!token) return null;
  const decoded = decodeJwt(token);
  return decoded?.sub || null;
}
