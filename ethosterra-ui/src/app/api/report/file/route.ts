import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  const root = process.env.ETHOSTERRA_ROOT || path.resolve(process.cwd(), '..');
  const dir = path.resolve(root, 'reports', 'analysis', 'html');

  if (!fs.existsSync(dir)) {
    return new NextResponse('No hay informe generado todavía.', { status: 404, headers: { 'Content-Type': 'text/plain' } });
  }

  const files = fs.readdirSync(dir)
    .filter(f => f.startsWith('analysis_') && f.endsWith('.html'))
    .sort((a, b) => {
      const ta = fs.statSync(path.join(dir, a)).mtimeMs;
      const tb = fs.statSync(path.join(dir, b)).mtimeMs;
      return tb - ta;
    });

  if (!files.length) {
    return new NextResponse('No hay informe generado todavía.', { status: 404, headers: { 'Content-Type': 'text/plain' } });
  }

  const html = fs.readFileSync(path.join(dir, files[0]), 'utf-8');
  return new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
