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

    const { data: cliente, error } = await supabase
      .from("clientes")
      .select("*")
      .eq("token_verificacion", token)
      .maybeSingle();

    if (error || !cliente) {
      console.error("Token inválido:", error);

      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL}/login?error=invalid`
      );
    }

    // ✅ actualizar cliente
    const { error: updateError } = await supabase
      .from("clientes")
      .update({
        email_verificado: true,
        token_verificacion: null,
      })
      .eq("id", cliente.id);

    if (updateError) {
      console.error("Error update cliente:", updateError);

      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL}/login?error=update`
      );
    }

    const response = NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL}/mi-cuenta`
    );

    // login automático
    response.cookies.set("fidelinook_auth", "ok", { path: "/" });
    response.cookies.set("fidelinook_role", "cliente", { path: "/" });

    return response;
  } catch (err) {
    console.error("Error verify register:", err);

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL}/login?error=server`
    );
  }
}