import { NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabase";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL}/login?error=token`
      );
    }

    const { data: cliente } = await supabase
      .from("clientes")
      .select("*")
      .eq("token_verificacion", token)
      .single();

    if (!cliente) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL}/login?error=invalid`
      );
    }

    // ✅ SOLO verificar email (NO tocar tarjeta)
    await supabase
      .from("clientes")
      .update({
        email_verificado: true,
        token_verificacion: null,
      })
      .eq("id", cliente.id);

    const response = NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL}/mi-cuenta`
    );

    // ✅ login automático
    response.cookies.set("fidelinook_auth", "ok", { path: "/" });
    response.cookies.set("fidelinook_role", "cliente", { path: "/" });

    return response;
  } catch (error) {
    console.error("Error verify register:", error);

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL}/login?error=server`
    );
  }
}