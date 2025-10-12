import { NextResponse } from "next/server";

const isProd = process.env.NODE_ENV === "production";

export interface ErrorOptions {
  code?: string;
  details?: unknown;
}

export function errorJson(status: number, message: string, opts: ErrorOptions = {}) {
  const body: any = {
    error: isProd ? simplifyMessage(message) : message,
  };
  if (opts.code) body.code = opts.code;
  if (!isProd) {
    if (opts.details !== undefined) body.details = opts.details;
    const stack = (opts.details as any)?.stack ?? undefined;
    if (stack) body.stack = String(stack);
  }
  return NextResponse.json(body, { status });
}

export function errorFromException(status: number, e: unknown, opts: ErrorOptions = {}) {
  const msg = normalizeError(e);
  return errorJson(status, msg, opts);
}

function normalizeError(e: unknown) {
  if (!e) return "Unknown error";
  if (typeof e === "string") return e;
  const anyE = e as any;
  return String(anyE?.message || anyE);
}

function simplifyMessage(msg: string) {
  // Avoid leaking internal details in production
  if (!msg) return "Internal server error occurred";
  // Provide short generic message in production
  return "Internal server error occurred";
}