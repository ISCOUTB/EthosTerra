/**
 * Estado compartido del proceso Java.
 * Al ser un módulo singleton en Node.js, persiste entre llamadas a las API Routes.
 */
import { ChildProcess } from "child_process";

interface ProcessState {
  process: ChildProcess | null;
}

const state: ProcessState = { process: null };

export function getJavaProcess(): ChildProcess | null {
  return state.process;
}

export function setJavaProcess(p: ChildProcess | null): void {
  state.process = p;
}

export function clearJavaProcess(): void {
  state.process = null;
}
