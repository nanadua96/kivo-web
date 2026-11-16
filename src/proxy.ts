import { type NextRequest, NextResponse } from "next/server";

function hasAuthenticatedUser(
  session: unknown,
): session is { user: { id: string } } {
  return (
    typeof session === "object" &&
    session !== null &&
    "user" in session &&
    typeof session.user === "object" &&
    session.user !== null &&
    "id" in session.user &&
    typeof session.user.id === "string"
  );
}

async function getApiSession(request: NextRequest) {
  const apiUrl = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL;

  if (!apiUrl) {
    throw new Error("API_URL is not configured.");
  }

  const headers = new Headers();
  const cookie = request.headers.get("cookie");
  if (cookie) headers.set("cookie", cookie);
  headers.set("origin", request.nextUrl.origin);

  const response = await fetch(new URL("/api/auth/get-session", apiUrl), {
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Fastify session check failed with status ${response.status}.`,
    );
  }

  return response.json() as Promise<unknown>;
}

export async function proxy(request: NextRequest) {
  const session = await getApiSession(request);

  if (!hasAuthenticatedUser(session)) {
    const signInUrl = new URL("/sign-in", request.url);

    signInUrl.searchParams.set(
      "callbackUrl",
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
    );

    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/c/:path*", "/settings/:path*"],
};
