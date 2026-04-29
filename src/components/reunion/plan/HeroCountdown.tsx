import Image from "next/image";
import type { Reunion } from "@/types";

const FALLBACK_HERO_IMAGE_URL =
  "/images/Outdoor_gathering_banner_ratio_219_prompt_wide_cin_8fd89a70be.jpeg";

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(`${dateStr}T00:00:00`);
  return Math.max(
    0,
    Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  );
}

interface HeroCountdownProps {
  reunion: Reunion;
  dateLabel: string | null;
}

export function HeroCountdown({ reunion, dateLabel }: HeroCountdownProps) {
  const heroSrc = reunion.heroImageUrl || FALLBACK_HERO_IMAGE_URL;
  const locationText = reunion.lockedLocationName ?? null;
  const whereWhen = [dateLabel, locationText].filter(Boolean).join(" - ");
  const countdownDays = daysUntil(reunion.lockedDate);

  return (
    <section className="kc-plan-hero">
      <Image
        src={heroSrc}
        alt=""
        fill
        priority
        sizes="100vw"
        unoptimized={Boolean(reunion.heroImageUrl?.startsWith("http"))}
        className="object-cover"
      />
      <div className="kc-plan-hero-inner">
        <div className="kc-plan-preamble">It&apos;s official</div>
        <h1>
          The <em>{reunion.name}</em>
        </h1>
        {whereWhen && (
          <p className="kc-plan-where-when">{whereWhen}</p>
        )}
        <div className="kc-countdown-block">
          <span className="kc-countdown-num">
            <em>{countdownDays ?? "--"}</em>
          </span>
          <span className="kc-countdown-label">days to go</span>
        </div>
      </div>
    </section>
  );
}
