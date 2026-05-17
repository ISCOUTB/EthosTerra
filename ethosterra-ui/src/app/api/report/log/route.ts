import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  const root = process.env.ETHOSTERRA_ROOT || path.resolve(process.cwd(), '..');
  const logPath = path.resolve(root, 'reports', 'analysis', 'orchestrator.log');

  if (!fs.existsSync(logPath)) {
    return new NextResponse('Sin log disponible.', { status: 404, headers: { 'Content-Type': 'text/plain' } });
  }

  const stat = fs.statSync(logPath);
  const size = stat.size;
  // Return last 8KB of log
  const maxBytes = 8192;
  const start = Math.max(0, size - maxBytes);
  const buf = Buffer.alloc(Math.min(size, maxBytes));
  const fd = fs.openSync(logPath, 'r');
  fs.readSync(fd, buf, 0, buf.length, start);
  fs.closeSync(fd);

  return new NextResponse(buf.toString('utf-8'), {
    status: 200,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
