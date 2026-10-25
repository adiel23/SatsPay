import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getBlinkAccountStatus, getZeroFeePublicMode } from "@/lib/blink";
import { createRemittance, listRemittances } from "@/lib/store";

export async function GET() {
  const isAdmin = await isAdminAuthenticated();
  const zeroFeePublicMode = getZeroFeePublicMode();

  // Si no es administrador, jamás devolver el listado de remesas
  if (!isAdmin) {
    return NextResponse.json({
      zeroFeePublicMode,
    });
  }

  const remittances = listRemittances();
  const stats = {
    totalCount: remittances.length,
    completedCount: remittances.filter((r) => r.status === "COMPLETED").length,
    readyToClaimCount: remittances.filter((r) => r.status === "READY_TO_CLAIM").length,
    lockedCount: remittances.filter((r) => r.isLocked).length,
    totalNetVolumeUsdCents: remittances
      .filter((r) => r.status === "COMPLETED")
      .reduce((acc, r) => acc + r.netPayoutUsdCents, 0),
  };

  return NextResponse.json({ remittances, stats, zeroFeePublicMode });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { senderName, recipientName, securityPin, amountUsd } = body as {
      senderName?: string;
      recipientName?: string;
      securityPin?: string;
      amountUsd?: number;
    };

    if (!senderName?.trim() || !recipientName?.trim()) {
      return NextResponse.json(
        { error: "Por favor completa tu nombre y el nombre de quien recibe en El Salvador." },
        { status: 400 }
      );
    }

    const cleanedPin = (securityPin || "").trim();
    if (!/^\d{4}$/.test(cleanedPin)) {
      return NextResponse.json(
        { error: "El PIN de seguridad debe ser exactamente de 4 dígitos numéricos (ej. 4829)." },
        { status: 400 }
      );
    }

    const numericAmount = Number(amountUsd);
    if (!Number.isFinite(numericAmount) || numericAmount < 0.05) {
      return NextResponse.json(
        { error: "El monto mínimo de envío es de $0.05 USD." },
        { status: 400 }
      );
    }

    const zeroFeePublicMode = getZeroFeePublicMode();
    const netOrGrossCents = Math.round(numericAmount * 100);
    const feeUsdCents = zeroFeePublicMode
      ? 0
      : Math.max(10, Math.round(netOrGrossCents * 0.015) + 50);
    const amountSentUsdCents = netOrGrossCents + feeUsdCents;
    const netPayoutUsdCents = netOrGrossCents;

    // Verificación interna de liquidez (sin exponer nombres de proveedores ni detalles técnicos al cliente)
    const blinkStatus = await getBlinkAccountStatus();
    if (!blinkStatus.connected) {
      return NextResponse.json(
        {
          error:
            "El servicio de envíos se encuentra en mantenimiento temporal. Por favor intenta de nuevo en unos minutos.",
        },
        { status: 503 }
      );
    }

    const availableUsdCents = blinkStatus.usdWallet?.balance ?? 0;
    if (availableUsdCents < netPayoutUsdCents) {
      return NextResponse.json(
        {
          error:
            "En este momento el monto solicitado supera la liquidez inmediata disponible. Por favor intenta con un monto menor.",
        },
        { status: 400 }
      );
    }

    const remittance = createRemittance({
      senderName,
      recipientName,
      securityPin: cleanedPin,
      amountSentUsdCents,
      feeUsdCents,
      netPayoutUsdCents,
      paymentMode: blinkStatus.mode,
      usPaymentMethod: zeroFeePublicMode ? "TEST_ZERO_FEE" : "STRIPE_CARD",
    });

    // Devolver únicamente los datos seguros para el recibo del cliente
    return NextResponse.json({
      receipt: {
        claimCode: remittance.claimCode,
        securityPin: remittance.securityPin,
        senderName: remittance.senderName,
        recipientName: remittance.recipientName,
        amountSentUsdCents: remittance.amountSentUsdCents,
        feeUsdCents: remittance.feeUsdCents,
        netPayoutUsdCents: remittance.netPayoutUsdCents,
        createdAt: remittance.createdAt,
      },
      claimUrl: `/reclamar/${remittance.claimCode}`,
    });
  } catch {
    return NextResponse.json(
      {
        error: "No se pudo procesar tu envío en este momento. Intenta nuevamente.",
      },
      { status: 500 }
    );
  }
}
