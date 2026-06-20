import { NextRequest, NextResponse } from "next/server";

const ACCESS_COOKIE = "crediflex_access";
const ACCESS_VALUE = "granted";

function isPublicPath(pathname: string) {
  return (
    pathname.startsWith("/acceso") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/robots.txt") ||
    pathname.startsWith("/sitemap.xml")
  );
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const hasAccess = request.cookies.get(ACCESS_COOKIE)?.value === ACCESS_VALUE;

  if (hasAccess) {
    return NextResponse.next();
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/acceso";
  loginUrl.searchParams.set("next", `${pathname}${search}`);

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!.*\\..*).*)", "/creditos/:path*/comprobante"],
};
