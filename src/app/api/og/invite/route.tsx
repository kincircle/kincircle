/* eslint-disable @next/next/no-img-element -- ImageResponse renders raw image elements, not next/image. */
import { ImageResponse } from "next/og";
import { getAppBaseUrl } from "@/lib/env";

export const runtime = "edge";

const size = {
  width: 1200,
  height: 630,
};

function clampText(value: string | null, fallback: string, maxLength: number) {
  const normalized = value?.replace(/\s+/g, " ").trim();
  const text = normalized || fallback;

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 1).trim()}...`;
}

function safeImageUrl(
  value: string | null,
  allowedOrigin: string
): string | null {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }

    if (url.origin === allowedOrigin || url.hostname === "res.cloudinary.com") {
      return url.toString();
    }

    return null;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const { searchParams } = requestUrl;
  const allowedOrigin = new URL(getAppBaseUrl()).origin;
  const title = clampText(searchParams.get("title"), "Family reunion", 72);
  const host = clampText(searchParams.get("host"), "KinCircle", 48);
  const date = clampText(searchParams.get("date"), "Date TBD", 56);
  const imageUrl = safeImageUrl(searchParams.get("image"), allowedOrigin);

  return new ImageResponse(
    (
      <div
        style={{
          position: "relative",
          display: "flex",
          width: "100%",
          height: "100%",
          overflow: "hidden",
          background: "#263f35",
          color: "#fff7ea",
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
      >
        {imageUrl && (
          <img
            src={imageUrl}
            alt=""
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        )}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(90deg, rgba(24, 30, 25, 0.92) 0%, rgba(24, 30, 25, 0.68) 52%, rgba(24, 30, 25, 0.28) 100%)",
          }}
        />
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "100%",
            height: "100%",
            padding: "68px 76px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              fontSize: 26,
              fontWeight: 700,
              letterSpacing: 0,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 54,
                height: 54,
                borderRadius: 54,
                background: "#f0bc67",
                color: "#263f35",
              }}
            >
              K
            </div>
            KinCircle
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                color: "#f7dfbb",
                fontSize: 34,
                lineHeight: 1.15,
                marginBottom: 18,
              }}
            >
              {host} invited you to
            </div>
            <div
              style={{
                display: "flex",
                maxWidth: 790,
                fontSize: 78,
                fontWeight: 800,
                lineHeight: 0.98,
                letterSpacing: 0,
              }}
            >
              {title}
            </div>
            <div
              style={{
                display: "flex",
                alignSelf: "flex-start",
                marginTop: 34,
                padding: "16px 22px",
                borderRadius: 999,
                background: "rgba(255, 247, 234, 0.16)",
                border: "1px solid rgba(255, 247, 234, 0.38)",
                color: "#fff7ea",
                fontSize: 28,
                fontWeight: 700,
              }}
            >
              {date}
            </div>
          </div>
        </div>
      </div>
    ),
    size
  );
}
