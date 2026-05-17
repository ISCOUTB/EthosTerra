import { NextRequest, NextResponse } from 'next/server';

// Server-side: usa SIMULATOR_API_URL (nombre de servicio Docker) en lugar de localhost
const API_URL = process.env.SIMULATOR_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const res = await fetch(`${API_URL}/report/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ started: false, error: String(err) }, { status: 502 });
  }
}
