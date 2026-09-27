import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const rutasProtegidas = ["/", "/admin"];
  const esRutaProtegida = rutasProtegidas.some((ruta) => pathname === ruta);

  if (!esRutaProtegida) {
    return NextResponse.next();
  }

  const operationalAccessToken = req.cookies.get("nook_op_access_token")?.value;

  const legacyAuth = req.cookies.get("fidelinook_auth")?.value;

  const tieneSesionOperacional =
    Boolean(operationalAccessToken) || legacyAuth === "ok";

  if (!tieneSesionOperacional) {
    const loginUrl = new URL("/admin/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/admin"],
};
