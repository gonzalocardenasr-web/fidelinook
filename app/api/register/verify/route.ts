import { NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabase";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    console.log("TOKEN:", token);

    if (!token) {
      throw new Error("No token");
    }

    const result = await supabase
      .from("clientes")
      .select("*")
      .eq("token_verificacion", token)
      .limit(1);

    console.log("QUERY RESULT:", result);

    const cliente = result.data?.[0];

    if (!cliente) {
      throw new Error("Cliente no encontrado");
    }

    const update = await supabase
      .from("clientes")
      .update({
        email_verificado: true,
        token_verificacion: null,
      })
      .eq("id", cliente.id);

    console.log("UPDATE:", update);

    const response = NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL}/mi-cuenta`
    );

    response.cookies.set("fidelinook_auth", "ok", { path: "/" });
    response.cookies.set("fidelinook_role", "cliente", { path: "/" });

    return response;
  } catch (error) {
    console.error("ERROR VERIFY REGISTER:", error);

    return new Response("Error interno", { status: 500 });
  }
}