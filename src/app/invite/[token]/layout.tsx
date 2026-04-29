import type { Metadata } from "next";
import { getAppBaseUrl } from "@/lib/env";
import { getInvitePreview } from "@/lib/invite-preview";

const FALLBACK_INVITE_IMAGE =
  "/images/Kids_grandparents_family_reunion_4a2cad3fce.jpeg";

function resolveAbsoluteUrl(value: string, baseUrl: string): string {
  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return new URL(FALLBACK_INVITE_IMAGE, baseUrl).toString();
  }
}

function buildInviteOgImageUrl({
  baseUrl,
  title,
  host,
  date,
  image,
}: {
  baseUrl: string;
  title: string;
  host: string;
  date: string;
  image: string;
}): string {
  const url = new URL("/api/og/invite", baseUrl);
  url.searchParams.set("title", title);
  url.searchParams.set("host", host);
  url.searchParams.set("date", date);
  url.searchParams.set("image", image);
  return url.toString();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const baseUrl = getAppBaseUrl();
  const inviteUrl = new URL(`/invite/${encodeURIComponent(token)}`, baseUrl);
  const preview = await getInvitePreview(token);

  if (preview.status !== "valid") {
    const title = "Invitation unavailable | KinCircle";
    const description = "This KinCircle invitation is unavailable or has expired.";
    const image = resolveAbsoluteUrl(FALLBACK_INVITE_IMAGE, baseUrl);

    return {
      title,
      description,
      robots: { index: false, follow: false },
      openGraph: {
        title,
        description,
        url: inviteUrl,
        siteName: "KinCircle",
        type: "website",
        images: [{ url: image, width: 1200, height: 630, alt: title }],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [image],
      },
    };
  }

  const host = preview.hostName ?? "KinCircle";
  const title = `${preview.reunionName} | KinCircle invite`;
  const description =
    preview.description ??
    `${host} invited you to RSVP for ${preview.reunionName}.`;
  const sourceImage = resolveAbsoluteUrl(
    preview.heroImageUrl ?? FALLBACK_INVITE_IMAGE,
    baseUrl
  );
  const ogImage = buildInviteOgImageUrl({
    baseUrl,
    title: preview.reunionName,
    host,
    date: preview.dateLabel,
    image: sourceImage,
  });

  return {
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: {
      title,
      description,
      url: inviteUrl,
      siteName: "KinCircle",
      type: "website",
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: `${preview.reunionName} reunion invite`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

export default function InviteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
