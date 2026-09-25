export function buildRequestOrigin(request: Request) {
  const url = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");

  if (!forwardedHost) {
    return url.origin;
  }

  return `${forwardedProto ?? url.protocol.replace(":", "")}://${forwardedHost}`;
}

export function buildOriginFromHeaders(headers: Pick<Headers, "get">) {
  const forwardedHost = headers.get("x-forwarded-host") ?? headers.get("host");
  const forwardedProto = headers.get("x-forwarded-proto") ?? "https";

  if (!forwardedHost) {
    return "http://localhost:3000";
  }

  return `${forwardedProto}://${forwardedHost}`;
}

export function buildSubmissionUrl(origin: string, submissionId: string) {
  return `${origin}/#submission-${submissionId}`;
}

export function buildXShareUrl(
  title: string,
  origin: string,
  submissionId: string,
) {
  const shareUrl = new URL("https://twitter.com/intent/tweet");
  shareUrl.searchParams.set("text", `I just minted ${title} on Garden 🌞`);
  shareUrl.searchParams.set("url", buildSubmissionUrl(origin, submissionId));

  return shareUrl.toString();
}
