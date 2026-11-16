import { proxyToApi } from "@/lib/api-proxy";

type RouteContext = {
  params: Promise<{ path?: string[] }>;
};

async function proxyAuthRequest(request: Request, context: RouteContext) {
  const { path = [] } = await context.params;
  return proxyToApi(request, ["api", "auth", ...path]);
}

export const GET = proxyAuthRequest;
export const HEAD = proxyAuthRequest;
export const POST = proxyAuthRequest;
export const PUT = proxyAuthRequest;
export const PATCH = proxyAuthRequest;
export const DELETE = proxyAuthRequest;
export const OPTIONS = proxyAuthRequest;
