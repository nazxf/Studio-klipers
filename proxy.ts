export { auth as proxy } from "@/lib/auth";

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/upload/:path*",
    "/videos/:path*",
    "/clips/:path*",
    "/api/upload/:path*",
    "/api/videos/:path*",
    "/api/clips/:path*",
  ],
};
