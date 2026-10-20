import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { demoDataDir } from "@/lib/data/demo-repository";
import { isDemoMode } from "@/lib/data";

const TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
};

/** Serves photos uploaded in demo mode (production uses Supabase Storage URLs). */
export async function GET(_request: Request, { params }: RouteContext<"/api/media/[file]">) {
  const { file } = await params;
  const name = path.basename(file);
  const type = TYPES[path.extname(name).toLowerCase()];
  if (!isDemoMode() || name !== file || !type || !/^[a-f0-9-]+\.[a-z]+$/.test(name)) {
    return new NextResponse("Not found", { status: 404 });
  }
  try {
    const data = await fs.readFile(path.join(demoDataDir(), "uploads", name));
    return new NextResponse(new Uint8Array(data), {
      headers: { "Content-Type": type, "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
