import { NextRequest, NextResponse } from "next/server";
import { extractAndParseCookies } from "@repo/web/utils";
import api from "./api";

export async function middleware(request: NextRequest) {
  const isAuth = request.cookies.get("accessToken")?.value ? true : false;

  const isPublicRoute =
    request.nextUrl.pathname.startsWith("/send-otp") ||
    request.nextUrl.pathname.startsWith("/verify-otp");
  const isPrivateRoute = !isPublicRoute;

  if (isPublicRoute && isAuth)
    return NextResponse.redirect(new URL("/", request.url));

  if (isPrivateRoute && !isAuth) {
    const refreshTokenRequest = await api.auth["refresh-token"].post();

    if (refreshTokenRequest.status === "OK") {
      const cookies = extractAndParseCookies(
        refreshTokenRequest.response.headers.getSetCookie().join("; "),
        ["accessToken", "refreshToken"]
      );
      const response = NextResponse.next();
      cookies.forEach((cookie) => {
        response.cookies.set(cookie.name, cookie.value, cookie);
      });
      return response;
    } else {
      return NextResponse.redirect(new URL("/send-otp", request.url));
    }
  }

  if (request.nextUrl.pathname.startsWith("/verify-otp")) {
    const { searchParams } = new URL(request.url);
    const phoneNumber = searchParams.get("phoneNumber");
    if (!phoneNumber)
      return NextResponse.redirect(new URL("/send-otp", request.url));

    const otpStatusRequest = await api.auth["otp/status"].post({
      body: {
        phoneNumber: phoneNumber,
      },
    });
    if (otpStatusRequest.status === "UNAUTHORIZED")
      return NextResponse.redirect(new URL("/send-otp", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
