// BACKEND-OWNED. Runs before every page request.
import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  // Mock mode (frontend dev without Docker): no auth, every page is open.
  if (process.env.NEXT_PUBLIC_USE_MOCKS === "true" || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.next();
  }
  return updateSession(request);
}

export const config = {
  matcher: [
    // Everything except Next.js internals and static files.
    "/((?!_next/static|_next/image|favicon.ico|models/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|glb|gltf)$).*)",
  ],
};
