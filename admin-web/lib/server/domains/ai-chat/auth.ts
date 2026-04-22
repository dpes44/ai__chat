import { auth } from "@/lib/firebase-admin";

function bearerToken(request: Request): string | null {
  const value = request.headers.get("authorization");
  if (!value || !value.toLowerCase().startsWith("bearer ")) {
    return null;
  }
  return value.slice(7).trim();
}

export async function authenticateBearerUid(
  request: Request,
): Promise<
  | { uid: string }
  | {
      status: number;
      body: Record<string, unknown>;
    }
> {
  const idToken = bearerToken(request);
  if (!idToken) {
    return { status: 401, body: { error: "Missing bearer token." } };
  }

  try {
    const decoded = await auth.verifyIdToken(idToken);
    return { uid: decoded.uid };
  } catch {
    return { status: 401, body: { error: "Invalid auth token." } };
  }
}
