import { NextRequest, NextResponse } from "next/server";
import { inspectChivoInvoice } from "@/lib/bolt11";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { bolt11Invoice, btcPriceUsd } = body as {
      bolt11Invoice?: string;
      btcPriceUsd?: number;
    };

    const decoded = inspectChivoInvoice(bolt11Invoice || "", btcPriceUsd || 88500);
    return NextResponse.json({ decoded });
  } catch {
    return NextResponse.json(
      { error: "No se pudo verificar el formato de la factura." },
      { status: 400 }
    );
  }
}
