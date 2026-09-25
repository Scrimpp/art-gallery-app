import { env } from "@/lib/env";

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
  if (env.siteUrl) {
    return env.siteUrl;
  }

  const forwardedHost = headers.get("x-forwarded-host") ?? headers.get("host");
  const forwardedProto = headers.get("x-forwarded-proto") ?? "https";

  if (!forwardedHost) {
    return "http://localhost:3000";
  }

  return `${forwardedProto}://${forwardedHost}`;
}

function normalizeAllowedHost(value: string) {
  return value.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function readAllowedAuthHosts() {
  const hosts = new Set<string>(["localhost:3000", "127.0.0.1:3000"]);

  if (env.siteUrl) {
    hosts.add(new URL(env.siteUrl).host.toLowerCase());
  }

  for (const host of env.allowedAuthRedirectHosts.split(",")) {
    const normalized = normalizeAllowedHost(host);

    if (normalized) {
      hosts.add(normalized);
    }
  }

  return hosts;
}

function isAllowedAuthHost(host: string, allowedHosts: Set<string>) {
  const normalizedHost = host.toLowerCase();

  for (const entry of allowedHosts) {
    if (entry.startsWith("*.") && normalizedHost.endsWith(entry.slice(1))) {
      return true;
    }

    if (entry.startsWith(".") && normalizedHost.endsWith(entry)) {
      return true;
    }

    if (normalizedHost === entry) {
      return true;
    }
  }

  return false;
}

export function buildTrustedOrigin(request: Request) {
  const allowedHosts = readAllowedAuthHosts();
  const candidateOrigin = buildRequestOrigin(request);
  const candidateHost = new URL(candidateOrigin).host.toLowerCase();

  if (isAllowedAuthHost(candidateHost, allowedHosts)) {
    return candidateOrigin;
  }

  if (env.siteUrl) {
    return env.siteUrl;
  }

  return "http://localhost:3000";
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
