import { NextResponse } from "next/server";
import { getOperationSession } from "../../../../../lib/operation-auth";
import { buildSaleDocument } from "../../../../../lib/documents/sales/build-sale-document";

export async function GET(req: Request) {
  const session = await getOperationSession();

  if (!session.ok) {
    return NextResponse.json(
      {
        ok: false,
        message: "No autenticado.",
      },
      { status: 401 },
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const saleId = Number(searchParams.get("saleId"));

    if (!Number.isInteger(saleId) || saleId <= 0) {
      return NextResponse.json(
        {
          ok: false,
          message: "La venta indicada no es válida.",
        },
        { status: 400 },
      );
    }

    const document = await buildSaleDocument(saleId);

    return NextResponse.json({
      ok: true,
      document,
    });
  } catch (error) {
    console.error("Error construyendo documento de venta:", error);

    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "No se pudo construir el documento.",
      },
      { status: 500 },
    );
  }
}
