import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

function getCsvPath(): string {
  const root = process.env.ETHOSTERRA_ROOT || path.resolve(process.cwd(), '..');
  const logsPath = process.env.ETHOSTERRA_LOGS_PATH || 'data/logs/wpsSimulator.csv';
  const resolved = path.resolve(root, logsPath);
  return resolved;
}

export async function GET() {
  try {
    const csvFile = getCsvPath();
    if (!fs.existsSync(csvFile)) {
      return NextResponse.json({ data: '', success: true, rows: 0, path: csvFile });
    }
    const data = fs.readFileSync(csvFile, 'utf-8');
    const lines = data.trim().split('\n').length - 1;
    return NextResponse.json({ data, success: true, rows: Math.max(0, lines) });
  } catch (err) {
    return NextResponse.json({ data: '', success: false, error: String(err) });
  }
}
