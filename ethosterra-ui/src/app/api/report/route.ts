import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

function getReportDir(): string {
  const root = process.env.ETHOSTERRA_ROOT || path.resolve(process.cwd(), '..');
  return path.resolve(root, 'reports', 'analysis', 'html');
}

function latestReport(dir: string): { name: string; sizeKb: number; generatedAt: string } | null {
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir)
    .filter(f => f.startsWith('analysis_') && f.endsWith('.html'))
    .map(f => ({ name: f, mtime: fs.statSync(path.join(dir, f)).mtimeMs, size: fs.statSync(path.join(dir, f)).size }))
    .sort((a, b) => b.mtime - a.mtime);
  if (!files.length) return null;
  const f = files[0];
  return {
    name: f.name,
    sizeKb: Math.round(f.size / 1024),
    generatedAt: new Date(f.mtime).toISOString(),
  };
}

export async function GET() {
  const dir = getReportDir();
  const report = latestReport(dir);
  if (!report) {
    return NextResponse.json({ exists: false });
  }
  return NextResponse.json({ exists: true, ...report });
}
