import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const LOGS_PATH = process.env.ETHOSTERRA_LOGS_PATH || 'data/logs/wpsSimulator.csv';
const CSV_FILE = path.join(process.env.ETHOSTERRA_ROOT || process.cwd(), LOGS_PATH);

export async function GET() {
  try {
    if (!fs.existsSync(CSV_FILE)) {
      return NextResponse.json({ data: '', success: true, rows: 0 });
    }
    const data = fs.readFileSync(CSV_FILE, 'utf-8');
    const lines = data.trim().split('\n').length - 1;
    return NextResponse.json({ data, success: true, rows: Math.max(0, lines) });
  } catch {
    return NextResponse.json({ data: '', success: false, error: 'Failed to read CSV' });
  }
}
