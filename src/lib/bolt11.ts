import { decode } from "light-bolt11-decoder";

export interface DecodedBolt11Invoice {
  valid: boolean;
  network?: "mainnet" | "testnet" | "signet" | "regtest";
  isLightning: boolean;
  isOnChainAddress: boolean;
  satoshis?: number;
  millisatoshis?: string;
  estimatedUsd?: number;
  description?: string;
  paymentHash?: string;
  timestamp?: number;
  expirySeconds?: number;
  expiresAt?: string;
  isExpired?: boolean;
  error?: string;
}

/**
 * Decodifica y valida una factura Lightning (BOLT11) generada en Chivo Wallet o Blink.
 * Detecta errores comunes del usuario en El Salvador, como pegar una dirección On-Chain (bc1..., 1..., 3...)
 * en lugar de una factura Lightning (lnbc...).
 */
export function inspectChivoInvoice(
  rawInput: string,
  btcPriceUsd: number = 88500
): DecodedBolt11Invoice {
  const cleaned = rawInput.trim().replace(/^lightning:/i, "");

  if (!cleaned) {
    return {
      valid: false,
      isLightning: false,
      isOnChainAddress: false,
      error: "El campo de la factura está vacío.",
    };
  }

  // Detectar si el destinatario en Chivo Wallet copió por error una dirección On-Chain
  if (
    cleaned.startsWith("bc1") ||
    cleaned.startsWith("1") ||
    cleaned.startsWith("3") ||
    cleaned.toLowerCase().startsWith("bitcoin:")
  ) {
    return {
      valid: false,
      isLightning: false,
      isOnChainAddress: true,
      error:
        "Pegaste una dirección Bitcoin On-Chain (bc1/1/3). En Chivo Wallet debes ir a Recibir -> Bitcoin -> seleccionar pestaña 'Lightning' y moneda 'USD' para generar una factura que empiece con 'lnbc...'.",
    };
  }

  const lower = cleaned.toLowerCase();

  // Detectar si es una factura de Testnet / Signet
  if (lower.startsWith("lntbs") || lower.startsWith("lntb")) {
    const isSignet = lower.startsWith("lntbs");
    return {
      valid: false,
      network: isSignet ? "signet" : "testnet",
      isLightning: true,
      isOnChainAddress: false,
      error: `Esta factura pertenece a la red de pruebas (${
        isSignet ? "Bitcoin Signet - lntbs" : "Bitcoin Testnet - lntb"
      }). Chivo Wallet opera únicamente en Producción (Mainnet), cuyas facturas empiezan con 'lnbc...'.`,
    };
  }

  if (!lower.startsWith("lnbc")) {
    return {
      valid: false,
      isLightning: false,
      isOnChainAddress: false,
      error:
        "Formato no reconocido. Una factura Lightning válida de Chivo Wallet debe comenzar con 'lnbc...'.",
    };
  }

  // Soporte para facturas simuladas generadas en Modo Mock (lnbc<cents>u1p_mock_...)
  const mockMatch = lower.match(/^lnbc(\d+)u1p_mock_/);
  if (mockMatch) {
    const amountCents = parseInt(mockMatch[1], 10);
    const usd = amountCents / 100;
    const sats = Math.max(1, Math.round((usd / btcPriceUsd) * 100_000_000));
    return {
      valid: true,
      network: "mainnet",
      isLightning: true,
      isOnChainAddress: false,
      satoshis: sats,
      millisatoshis: String(sats * 1000),
      estimatedUsd: Number(usd.toFixed(2)),
      description: `Factura Simulada Modo Mock ($${usd.toFixed(2)} USD)`,
      paymentHash: "mock_payment_hash_" + amountCents,
      isExpired: false,
    };
  }

  try {
    const decoded = decode(cleaned);
    const sections = decoded.sections;

    const amountSection = sections.find((s) => s.name === "amount") as
      | { name: "amount"; value: string }
      | undefined;
    const descriptionSection = sections.find((s) => s.name === "description") as
      | { name: "description"; value: string }
      | undefined;
    const paymentHashSection = sections.find((s) => s.name === "payment_hash") as
      | { name: "payment_hash"; value: string }
      | undefined;
    const timestampSection = sections.find((s) => s.name === "timestamp") as
      | { name: "timestamp"; value: number }
      | undefined;
    const expirySection = sections.find((s) => s.name === "expiry") as
      | { name: "expiry"; value: number }
      | undefined;

    const millisatoshis = amountSection?.value;
    const satoshis = millisatoshis ? Math.round(Number(millisatoshis) / 1000) : undefined;
    const estimatedUsd =
      satoshis !== undefined ? Number(((satoshis / 100_000_000) * btcPriceUsd).toFixed(2)) : undefined;

    const timestamp = timestampSection?.value;
    const expirySeconds = expirySection?.value ?? decoded.expiry ?? 3600;

    let expiresAt: string | undefined;
    let isExpired = false;
    if (timestamp) {
      const expMs = (timestamp + expirySeconds) * 1000;
      expiresAt = new Date(expMs).toISOString();
      isExpired = Date.now() > expMs;
    }

    if (!satoshis || satoshis <= 0) {
      return {
        valid: false,
        network: "mainnet",
        isLightning: true,
        isOnChainAddress: false,
        description: descriptionSection?.value,
        paymentHash: paymentHashSection?.value,
        error:
          "La factura Lightning no tiene un monto especificado (factura de monto cero). Por seguridad, genera la factura en Chivo Wallet indicando el monto exacto en USD.",
      };
    }

    return {
      valid: !isExpired,
      network: "mainnet",
      isLightning: true,
      isOnChainAddress: false,
      satoshis,
      millisatoshis,
      estimatedUsd,
      description: descriptionSection?.value,
      paymentHash: paymentHashSection?.value,
      timestamp,
      expirySeconds,
      expiresAt,
      isExpired,
      error: isExpired
        ? "Esta factura Lightning ya expiró. Las facturas de Chivo Wallet tienen un tiempo límite corto; por favor genera una nueva."
        : undefined,
    };
  } catch (err) {
    return {
      valid: false,
      isLightning: true,
      isOnChainAddress: false,
      error: `Factura BOLT11 inválida o incompleta: ${
        err instanceof Error ? err.message : "No se pudo decodificar"
      }`,
    };
  }
}
