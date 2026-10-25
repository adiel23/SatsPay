import { existsSync } from "fs";
import { getBlinkAccountStatus } from "../src/lib/blink";
import { inspectChivoInvoice } from "../src/lib/bolt11";

if (existsSync(".env") && typeof process.loadEnvFile === "function") {
  try {
    process.loadEnvFile(".env");
  } catch {
    // Ignorar si ya fue cargado
  }
}

async function main() {
  console.log("==========================================================");
  console.log("⚡ DIAGNÓSTICO DE CONEXIÓN CON BLINK API (FASE 1.1)");
  console.log("==========================================================");

  const status = await getBlinkAccountStatus();

  console.log(`Modo configurado (PAYMENT_MODE): ${status.mode.toUpperCase()}`);
  console.log(`Endpoint GraphQL:               ${status.endpoint}`);
  console.log(`Conectado exitosamente:         ${status.connected ? "SÍ ✅" : "NO ❌"}`);

  if (!status.connected) {
    console.error(`\n❌ Detalle del error: ${status.error}`);
    console.log(
      "\n💡 Sugerencia: Agrega tu BLINK_API_KEY en el archivo .env y cambia PAYMENT_MODE=\"production\" para probar en vivo."
    );
    process.exit(1);
  }

  console.log(`ID de Cuenta Blink:             ${status.accountId}`);
  if (status.btcPriceUsd) {
    console.log(`Precio Referencia BTC/USD:      $${status.btcPriceUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`);
  }

  console.log("\n--- Billetera Stablesats (USD) ---");
  if (status.usdWallet) {
    console.log(`  Wallet ID (USD): ${status.usdWallet.id}`);
    console.log(
      `  Saldo Actual:    $${(status.usdWallet.balance / 100).toFixed(2)} USD (${status.usdWallet.balance} centavos)`
    );
  } else {
    console.log("  ⚠️ No se encontró billetera USD en esta cuenta.");
  }

  console.log("\n--- Billetera Bitcoin (BTC) ---");
  if (status.btcWallet) {
    console.log(`  Wallet ID (BTC): ${status.btcWallet.id}`);
    console.log(`  Saldo Actual:    ${status.btcWallet.balance.toLocaleString()} satoshis`);
  } else {
    console.log("  ⚠️ No se encontró billetera BTC en esta cuenta.");
  }

  console.log("==========================================================\n");
}

main().catch((err) => {
  console.error("Error fatal ejecutando check-blink:", err);
  process.exit(1);
});
