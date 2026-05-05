import { NextRequest, NextResponse } from 'next/server';
import { spawn, ChildProcess } from 'child_process';
import fs from 'fs';
import path from 'path';

let processRef: ChildProcess | null = null;

const PYTHON_BIN = process.env.PYTHON_BIN || 'python3';
const START_SCRIPT = process.env.ETHOSTERRA_START || 'ethosterra-python/ethosterra/start.py';

export async function GET() {
  return NextResponse.json({
    running: processRef !== null && !processRef.killed,
    pid: processRef?.pid || null,
  });
}

export async function POST(req: NextRequest) {
  if (processRef && !processRef.killed) {
    return NextResponse.json({ error: 'Simulation already running' }, { status: 409 });
  }
  try {
    const { args } = await req.json();
    const env = {
      ...process.env,
      PYTHONPATH: `${process.env.ETHOSTERRA_ROOT || '.'}/besa-python:${process.env.ETHOSTERRA_ROOT || '.'}/ethosterra-python`,
      ETHOSTERRA_ROOT: process.env.ETHOSTERRA_ROOT || '.',
    };

    const csvPath = path.join(process.env.ETHOSTERRA_ROOT || process.cwd(), 'data/logs/wpsSimulator.csv');
    if (fs.existsSync(csvPath)) {
      fs.writeFileSync(csvPath, '');
    }

    const cmdArgs = ['-u', START_SCRIPT, ...(args || [])];
    processRef = spawn(PYTHON_BIN, cmdArgs, { env, stdio: 'pipe' });

    processRef.on('close', () => { processRef = null; });

    return NextResponse.json({ success: true, pid: processRef.pid });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE() {
  if (processRef && !processRef.killed) {
    processRef.kill('SIGTERM');
    processRef = null;
    return NextResponse.json({ success: true, msg: 'Simulation stopped' });
  }
  return NextResponse.json({ success: true, msg: 'No simulation running' });
}
