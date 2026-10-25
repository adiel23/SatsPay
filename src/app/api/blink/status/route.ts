import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import {
  createStablesatsUsdInvoice,
  getBlinkAccountStatus,
  PaymentMode,
  probeLightningFeeFromUsd,
  saveRuntimeBlinkConfig,
} from "@/lib/blink";
import { inspectChivoInvoice } from "@/lib/bolt11";
import { unlockRemittanceByClaimCode } from "@/lib/store";

export async function GET() {
  const isAdmin = await isAdminAuthenticated();
  if (!isAdmin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const status = await getBlinkAccountStatus();
  return NextResponse.json(status);
}

export async function POST(req: NextRequest) {
  const isAdmin = await isAdminAuthenticated();
  if (!isAdmin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      action,
      apiKey,
      mode,
      usdWalletId,
      amountCents,
      memo,
      bolt11Invoice,
      btcPriceUsd,
      claimCode,
      zeroFeePublicMode,
      newAdminPassword,
    } = body as {
      action:
        | "check_status"
        | "create_usd_invoice"
        | "inspect_invoice"
        | "unlock_remittance"
        | "set_fee_mode"
        | "change_admin_password";
      apiKey?: string;
      mode?: PaymentMode;
      usdWalletId?: string;
      amountCents?: number;
      memo?: string;
      bolt11Invoice?: string;
      btcPriceUsd?: number;
      claimCode?: string;
      zeroFeePublicMode?: boolean;
      newAdminPassword?: string;
    };

    if (action === "check_status") {
      const status = await getBlinkAccountStatus({
        overrideMode: mode,
        overrideApiKey: apiKey?.trim() || undefined,
        persistIfValid: true,
      });
      return NextResponse.json(status);
    }

    if (action === "set_fee_mode") {
      saveRuntimeBlinkConfig({ zeroFeePublicMode: Boolean(zeroFeePublicMode) });
      const status = await getBlinkAccountStatus();
      return NextResponse.json(status);
    }

    if (action === "change_admin_password") {
      if (!newAdminPassword || newAdminPassword.trim().length < 4) {
        return NextResponse.json(
          { error: "La nueva contraseña debe tener al menos 4 caracteres." },
          { status: 400 }
        );
      }
      saveRuntimeBlinkConfig({ adminPassword: newAdminPassword.trim() });
      return NextResponse.json({ success: true });
    }

    if (action === "unlock_remittance") {
      if (!claimCode) {
        return NextResponse.json({ error: "Falta claimCode" }, { status: 400 });
      }
      const unlocked = unlockRemittanceByClaimCode(claimCode);
      return NextResponse.json({ remittance: unlocked });
    }

    if (action === "create_usd_invoice") {
      if (!usdWalletId) {
        return NextResponse.json(
          { error: "Se requiere el ID de la billetera USD (Stablesats)." },
          { status: 400 }
        );
      }
      const invoice = await createStablesatsUsdInvoice({
        usdWalletId,
        amountCents: Number(amountCents || 100),
        memo,
        overrideMode: mode,
        overrideApiKey: apiKey?.trim() || undefined,
      });
      return NextResponse.json({ invoice });
    }

    if (action === "inspect_invoice") {
      const decoded = inspectChivoInvoice(bolt11Invoice || "", btcPriceUsd || 88500);
      let feeProbeCents: number | undefined;
      let feeProbeError: string | undefined;

      if (decoded.valid && usdWalletId) {
        try {
          const probe = await probeLightningFeeFromUsd({
            usdWalletId,
            paymentRequest: bolt11Invoice || "",
            overrideMode: mode,
            overrideApiKey: apiKey?.trim() || undefined,
          });
          feeProbeCents = probe.feeUsdCents;
        } catch (err) {
          feeProbeError = err instanceof Error ? err.message : "No se pudo estimar fee";
        }
      }

      return NextResponse.json({
        decoded,
        feeProbeCents,
        feeProbeError,
      });
    }

    return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Error interno en el endpoint de administración",
      },
      { status: 500 }
    );
  }
}
