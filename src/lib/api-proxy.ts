const requestHeadersToForward = [
  "accept",
  "authorization",
  "content-type",
  "cookie",
  "origin",
  "user-agent",
] as const;

const responseHeadersToForward = [
  "cache-control",
  "content-disposition",
  "content-type",
  "etag",
  "last-modified",
  "location",
  "retry-after",
  "vary",
  "x-accel-buffering",
] as const;

export async function proxyToApi(
  request: Request,
  pathSegments: string[],
): Promise<Response> {
  const apiUrl = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL;

  if (!apiUrl) {
    return new Response("API_URL is not configured.", { status: 500 });
  }

  const incomingUrl = new URL(request.url);
  const upstreamUrl = new URL(
    `/${pathSegments.map((segment) => encodeURIComponent(segment)).join("/")}`,
    apiUrl,
  );
  upstreamUrl.search = incomingUrl.search;

  const headers = new Headers();
  for (const name of requestHeadersToForward) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  const method = request.method.toUpperCase();
  const body =
    method === "GET" || method === "HEAD" || method === "OPTIONS"
      ? undefined
      : await request.arrayBuffer();

  const upstreamResponse = await fetch(upstreamUrl, {
    method,
    headers,
    body,
    cache: "no-store",
    redirect: "manual",
    signal: request.signal,
  });

  const responseHeaders = new Headers();
  for (const name of responseHeadersToForward) {
    const value = upstreamResponse.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }
  for (const cookie of upstreamResponse.headers.getSetCookie()) {
    responseHeaders.append("set-cookie", cookie);
  }

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: responseHeaders,
  });
}
