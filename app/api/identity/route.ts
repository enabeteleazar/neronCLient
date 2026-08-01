import { NextResponse } from "next/server";

const CORE_URL = (process.env.NERON_CORE_URL ?? "http://localhost:8010").replace(/\/$/, "");

export async function GET() {
  try {
    const headers: Record<string, string> = {};
    // Le Core ne lit que l en-tete Authorization, pas X-API-Key (cf. Dashboard, 22/07).
    if (process.env.NERON_API_KEY) headers["Authorization"] = `Bearer ${process.env.NERON_API_KEY}`;
    const response = await fetch(`${CORE_URL}/self-model/context`, {
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    const payload = await response.json();
    return NextResponse.json(payload.identity ?? {}, { status: response.status });
  } catch {
    return NextResponse.json({}, { status: 502 });
  }
}
