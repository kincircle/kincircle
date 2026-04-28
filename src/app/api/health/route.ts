import { NextResponse } from "next/server";

import {
  getBetterAuthSecret,
  getBetterAuthUrl,
  getDatabaseUrl,
  getEmailFrom,
  getResendApiKey,
} from "@/lib/env";

export function GET() {
  getBetterAuthSecret();
  getBetterAuthUrl();
  getDatabaseUrl();
  getEmailFrom();
  getResendApiKey();

  return NextResponse.json({ ok: true });
}
