import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const rutasProtegidas = ["/", "/admin"];
  const esRutaProtegida = rutasProtegidas.some((ruta) => pathname === ruta);

  if (!esRutaProtegida) {
    return NextResponse.next();
  }

  const auth = req.cookies.get("fidelinook_auth")?.value;

  if (auth !== "ok") {
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/admin"],
};