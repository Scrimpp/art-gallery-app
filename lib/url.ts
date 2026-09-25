export function buildRequestOrigin(request: Request) {
  const url = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");

  if (!forwardedHost) {
    return url.origin;
  }

  return `${forwardedProto ?? url.protocol.replace(":", "")}://${forwardedHost}`;
}
