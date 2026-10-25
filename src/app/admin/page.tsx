"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Zap,
  ShieldCheck,
  Wallet,
  DollarSign,
  Bitcoin,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  KeyRound,
  FileCheck2,
  ArrowRight,
  Copy,
  Check,
  Lock,
  LogOut,
  Unlock,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import type { BlinkAccountStatus, BlinkInvoiceResult, PaymentMode } from "@/lib/blink";
import type { DecodedBolt11Invoice } from "@/lib/bolt11";
import type { RemittanceRecord } from "@/lib/store";

export default function AdminDashboardPage() {
  const [checkingAuth, setCheckingAuth] = useState<boolean>(true);
  const [authenticated, setAuthenticated] = useState<boolean>(false);
  const [passwordInput, setPasswordInput] = useState<string>("");
  const [authError, setAuthError] = useState<string | null>(null);

  const [status, setStatus] = useState<BlinkAccountStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedMode, setSelectedMode] = useState<PaymentMode>("mock");
  const [customApiKey, setCustomApiKey] = useState<string>("");

  // Historial completo de remesas para el administrador
  const [remittances, setRemittances] = useState<RemittanceRecord[]>([]);

  // Generador de facturas Stablesats USD
  const [invoiceAmountUsd, setInvoiceAmountUsd] = useState<string>("1.00");
  const [invoiceMemo, setInvoiceMemo] = useState<string>("Recarga Tesorería Stablesats USD");
  const [generatedInvoice, setGeneratedInvoice] = useState<BlinkInvoiceResult | null>(null);
  const [creatingInvoice, setCreatingInvoice] = useState<boolean>(false);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // Inspector BOLT11
  const [chivoInput, setChivoInput] = useState<string>("");
  const [inspectResult, setInspectResult] = useState<{
    decoded: DecodedBolt11Invoice;
    feeProbeCents?: number;
  } | null>(null);
  const [inspecting, setInspecting] = useState<boolean>(false);

  async function loadAdminData() {
    setLoading(true);
    try {
      const [statusRes, remRes] = await Promise.all([
        fetch("/api/blink/status"),
        fetch("/api/remittances"),
      ]);
      if (statusRes.status === 401) {
        setAuthenticated(false);
        return;
      }
      const statusData: BlinkAccountStatus = await statusRes.json();
      const remData = await remRes.json();
      setStatus(statusData);
      setSelectedMode(statusData.mode);
      setRemittances(remData.remittances || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetch("/api/admin/auth")
      .then((r) => r.json())
      .then((data) => {
        setAuthenticated(Boolean(data.authenticated));
        if (data.authenticated) {
          loadAdminData();
        }
      })
      .finally(() => setCheckingAuth(false));
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setAuthError(null);
    const res = await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "login", password: passwordInput }),
    });
    const data = await res.json();
    if (!res.ok || !data.authenticated) {
      setAuthError(data.error || "Contraseña incorrecta.");
    } else {
      setAuthenticated(true);
      setPasswordInput("");
      loadAdminData();
    }
  }

  async function handleLogout() {
    await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    });
    setAuthenticated(false);
    setStatus(null);
  }

  async function updateBlinkConfig(modeOverride?: PaymentMode, apiKeyOverride?: string) {
    setLoading(true);
    try {
      const res = await fetch("/api/blink/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "check_status",
          mode: modeOverride ?? selectedMode,
          apiKey: apiKeyOverride ?? customApiKey,
        }),
      });
      const data: BlinkAccountStatus = await res.json();
      setStatus(data);
      setSelectedMode(data.mode);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleFeeMode(zeroFee: boolean) {
    const res = await fetch("/api/blink/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "set_fee_mode",
        zeroFeePublicMode: zeroFee,
      }),
    });
    const data: BlinkAccountStatus = await res.json();
    setStatus(data);
  }

  async function handleUnlockRemittance(claimCode: string) {
    await fetch("/api/blink/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "unlock_remittance",
        claimCode,
      }),
    });
    loadAdminData();
  }

  async function handleCreateUsdInvoice(e: React.FormEvent) {
    e.preventDefault();
    if (!status?.usdWallet?.id) return;
    setCreatingInvoice(true);
    setInvoiceError(null);
    setGeneratedInvoice(null);

    const amountCents = Math.round(parseFloat(invoiceAmountUsd || "0") * 100);
    try {
      const res = await fetch("/api/blink/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_usd_invoice",
          mode: selectedMode,
          apiKey: customApiKey,
          usdWalletId: status.usdWallet.id,
          amountCents,
          memo: invoiceMemo,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setInvoiceError(data.error || "Error al crear factura USD en Blink");
      } else {
        setGeneratedInvoice(data.invoice);
      }
    } catch (err) {
      setInvoiceError(err instanceof Error ? err.message : "Error al crear factura");
    } finally {
      setCreatingInvoice(false);
    }
  }

  async function handleInspectInvoice(inputToTest?: string) {
    const raw = inputToTest ?? chivoInput;
    if (inputToTest !== undefined) {
      setChivoInput(inputToTest);
    }
    setInspecting(true);
    try {
      const res = await fetch("/api/blink/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "inspect_invoice",
          bolt11Invoice: raw,
          usdWalletId: status?.usdWallet?.id,
          btcPriceUsd: status?.btcPriceUsd || 88500,
        }),
      });
      const data = await res.json();
      setInspectResult(data);
    } finally {
      setInspecting(false);
    }
  }

  function copyText(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-sm text-slate-400">
        Verificando sesión de administrador...
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="h-12 w-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
              <Lock className="h-6 w-6" />
            </div>
            <h1 className="text-xl font-bold text-white">
              Panel Privado de Administración
            </h1>
            <p className="text-xs text-slate-400">
              Acceso exclusivo a tesorería Blink Stablesats, API Key y auditoría de remesas.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Contraseña de Administrador
              </label>
              <input
                type="password"
                required
                autoFocus
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Contraseña (por defecto: admin1234)"
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            {authError && (
              <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-200">
                {authError}
              </div>
            )}

            <button
              type="submit"
              className="w-full rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-3 text-sm transition"
            >
              Entrar al Panel de Control
            </button>
          </form>

          <div className="text-center pt-2 border-t border-slate-800">
            <Link href="/" className="text-xs text-slate-400 hover:text-white transition">
              ← Volver a la plataforma pública de clientes
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Header exclusivo de Admin */}
      <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-lg text-white">
                  RemesasSV <span className="text-amber-400">Admin & Tesorería</span>
                </h1>
                {status && (
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                      status.mode === "production"
                        ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                        : "bg-sky-500/15 text-sky-300 border-sky-500/30"
                    }`}
                  >
                    {status.mode === "production" ? "PRODUCCIÓN (Mainnet)" : "MOCK ($0)"}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Gestión interna de Blink Stablesats USD, API Keys y seguridad de remesas
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-medium text-slate-200 transition"
            >
              Ver Vista Pública de Clientes
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-xs font-medium text-rose-300 transition"
            >
              <LogOut className="h-3.5 w-3.5" />
              Cerrar Sesión
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* 1. Configuración de Blink API, Stablesats y Tarifa Pública */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
            <div>
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-400" />
                1. Motor de Pagos Blink GraphQL API & Tesorería Stablesats
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Solo visible para ti como administrador. Aquí controlas el entorno, la API Key y las comisiones al público.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedMode("mock");
                  updateBlinkConfig("mock", "");
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-medium transition border ${
                  selectedMode === "mock"
                    ? "bg-sky-500/20 text-sky-200 border-sky-500/40"
                    : "bg-slate-800/60 text-slate-400 border-slate-700 hover:text-slate-200"
                }`}
              >
                Modo Mock ($0)
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedMode("production");
                  updateBlinkConfig("production", customApiKey);
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-medium transition border ${
                  selectedMode === "production"
                    ? "bg-emerald-500/20 text-emerald-200 border-emerald-500/40"
                    : "bg-slate-800/60 text-slate-400 border-slate-700 hover:text-slate-200"
                }`}
              >
                Modo Producción (Blink Mainnet)
              </button>

              <button
                type="button"
                onClick={() => handleToggleFeeMode(!status?.zeroFeePublicMode)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium border transition ${
                  status?.zeroFeePublicMode
                    ? "bg-amber-500/15 text-amber-300 border-amber-500/40"
                    : "bg-slate-800 text-slate-300 border-slate-700"
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                {status?.zeroFeePublicMode
                  ? "Tarifa al Público: $0.00 (1:1 Activo)"
                  : "Tarifa al Público: 1.5% + $0.50"}
              </button>
            </div>
          </div>

          {/* API Key de Blink */}
          <div className="mt-6 bg-slate-950/60 rounded-xl p-4 border border-slate-800/80">
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
              <div className="flex-1">
                <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <KeyRound className="h-3.5 w-3.5 text-amber-400" />
                  Configurar <code className="text-amber-300">BLINK_API_KEY</code>{" "}
                  {status?.hasConfiguredApiKey && (
                    <span className="text-emerald-400 font-semibold">
                      (✓ Guardada en el servidor)
                    </span>
                  )}
                </label>
                <input
                  type="password"
                  value={customApiKey}
                  onChange={(e) => setCustomApiKey(e.target.value)}
                  placeholder={
                    status?.hasConfiguredApiKey
                      ? "API Key activa (pega otra aquí solo si deseas reemplazarla)"
                      : "Pega aquí tu API Key de Blink"
                  }
                  className="w-full rounded-xl bg-slate-900 border border-slate-700/80 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  const targetMode = customApiKey.trim() ? "production" : selectedMode;
                  setSelectedMode(targetMode);
                  updateBlinkConfig(targetMode, customApiKey);
                }}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-semibold px-5 py-2.5 text-sm transition"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                {customApiKey.trim() ? "Guardar API Key" : "Refrescar Saldos"}
              </button>
            </div>
          </div>

          {status && !status.connected && (
            <div className="mt-6 rounded-xl bg-rose-500/10 border border-rose-500/30 p-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-rose-200">Error de conexión con Blink API</p>
                <p className="text-rose-300/90 mt-1">{status.error}</p>
              </div>
            </div>
          )}

          {status && status.connected && (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/15 p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
                    Billetera Stablesats (USD)
                  </span>
                  <DollarSign className="h-4 w-4 text-emerald-300" />
                </div>
                <p className="text-3xl font-bold text-white mt-3">
                  ${((status.usdWallet?.balance ?? 0) / 100).toFixed(2)}{" "}
                  <span className="text-sm font-normal text-emerald-300">USD</span>
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Wallet ID: <code>{status.usdWallet?.id}</code>
                </p>
              </div>

              <div className="rounded-xl border border-amber-500/30 bg-amber-950/15 p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-amber-300">
                    Billetera Bitcoin (BTC)
                  </span>
                  <Bitcoin className="h-4 w-4 text-amber-300" />
                </div>
                <p className="text-3xl font-bold text-white mt-3">
                  {(status.btcWallet?.balance ?? 0).toLocaleString()}{" "}
                  <span className="text-sm font-normal text-amber-300">sats</span>
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Wallet ID: <code>{status.btcWallet?.id}</code>
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Cotización BTC/USD en Blink
                  </span>
                  <Wallet className="h-4 w-4 text-emerald-400" />
                </div>
                <p className="text-2xl font-bold text-white mt-3">
                  {status.btcPriceUsd
                    ? `$${status.btcPriceUsd.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}`
                    : "N/D"}
                </p>
                <p className="text-xs text-slate-400 mt-1 truncate">{status.endpoint}</p>
              </div>
            </div>
          )}
        </section>

        {/* 2. Auditoría Completa de Remesas (con vista de PIN y botón de Desbloqueo) */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-800">
            <div>
              <h2 className="text-lg font-semibold text-white">
                2. Historial y Auditoría de Remesas ({remittances.length})
              </h2>
              <p className="text-xs text-slate-400">
                Aquí puedes ver los códigos, PINs de 4 dígitos, estado de liquidación y desbloquear remesas bloqueadas por intentos fallidos.
              </p>
            </div>
            <button
              type="button"
              onClick={loadAdminData}
              className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 font-medium"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Actualizar tabla
            </button>
          </div>

          {remittances.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">
              No hay remesas registradas todavía.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="py-2.5 px-3">Código</th>
                    <th className="py-2.5 px-3">PIN (4 dígitos)</th>
                    <th className="py-2.5 px-3">Remitente → Destinatario</th>
                    <th className="py-2.5 px-3">Monto Neto</th>
                    <th className="py-2.5 px-3">Modo</th>
                    <th className="py-2.5 px-3">Estado / Seguridad</th>
                    <th className="py-2.5 px-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {remittances.map((rem) => (
                    <tr key={rem.id} className="hover:bg-slate-950/40">
                      <td className="py-3 px-3 font-mono font-bold text-amber-400">
                        {rem.claimCode}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-sky-300">
                        {rem.securityPin}
                      </td>
                      <td className="py-3 px-3 text-slate-200">
                        {rem.senderName} → <strong>{rem.recipientName}</strong>
                        {rem.failureReason && (
                          <span className="block text-[11px] text-rose-400 mt-0.5">
                            Último error: {rem.failureReason}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-bold text-emerald-400">
                        ${(rem.netPayoutUsdCents / 100).toFixed(2)} USD
                      </td>
                      <td className="py-3 px-3 uppercase text-slate-400">{rem.paymentMode}</td>
                      <td className="py-3 px-3">
                        {rem.isLocked ? (
                          <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold">
                            BLOQUEADA (5 fallos PIN)
                          </span>
                        ) : rem.status === "COMPLETED" ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold">
                            PAGADA A CHIVO
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold">
                            LISTA ({rem.failedPinAttempts}/5 fallos)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right space-x-2">
                        {rem.isLocked && (
                          <button
                            type="button"
                            onClick={() => handleUnlockRemittance(rem.claimCode)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 font-semibold transition"
                          >
                            <Unlock className="h-3 w-3" />
                            Desbloquear PIN
                          </button>
                        )}
                        <Link
                          href={`/reclamar/${rem.claimCode}`}
                          className="inline-flex items-center gap-1 text-slate-300 hover:text-white underline"
                        >
                          Abrir link
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* 3. Herramientas Técnicas de Tesorería e Inspector BOLT11 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl space-y-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <FileCheck2 className="h-5 w-5 text-amber-400" />
              Inspector Técnico de Facturas BOLT11
            </h2>
            <textarea
              rows={3}
              value={chivoInput}
              onChange={(e) => setChivoInput(e.target.value)}
              placeholder="Pega cualquier factura lnbc... para inspeccionar monto y fee de ruta"
              className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-xs font-mono text-slate-200"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleInspectInvoice()}
                disabled={inspecting || !chivoInput.trim()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 text-slate-950 font-semibold px-4 py-2 text-xs"
              >
                Inspeccionar Factura <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {inspectResult && (
              <div className="rounded-xl p-4 border border-slate-700 bg-slate-950 text-xs space-y-1">
                <p className="font-semibold text-white">
                  {inspectResult.decoded.valid ? "✓ Factura Válida" : "✗ Factura Inválida"}
                </p>
                {inspectResult.decoded.error && (
                  <p className="text-rose-300">{inspectResult.decoded.error}</p>
                )}
                {inspectResult.decoded.satoshis !== undefined && (
                  <p className="text-slate-300">
                    Satoshis: {inspectResult.decoded.satoshis.toLocaleString()} sats (~$
                    {inspectResult.decoded.estimatedUsd?.toFixed(2)} USD)
                  </p>
                )}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl space-y-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-emerald-400" />
              Recargar Tesorería Stablesats (USD)
            </h2>
            <form onSubmit={handleCreateUsdInvoice} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={invoiceAmountUsd}
                  onChange={(e) => setInvoiceAmountUsd(e.target.value)}
                  className="rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-sm text-white"
                />
                <input
                  type="text"
                  value={invoiceMemo}
                  onChange={(e) => setInvoiceMemo(e.target.value)}
                  className="rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-sm text-white"
                />
              </div>
              <button
                type="submit"
                disabled={creatingInvoice || !status?.usdWallet?.id}
                className="w-full rounded-xl bg-emerald-500 text-slate-950 font-semibold py-2.5 text-xs"
              >
                {creatingInvoice
                  ? "Generando..."
                  : `Generar Factura de Recarga ($${Number(invoiceAmountUsd || 0).toFixed(2)} USD)`}
              </button>
            </form>

            {invoiceError && <p className="text-xs text-rose-300">{invoiceError}</p>}

            {generatedInvoice && (
              <div className="rounded-xl bg-slate-950 border border-emerald-500/30 p-3 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-emerald-400 font-semibold">
                    Factura Lista para Pagar
                  </span>
                  <button
                    type="button"
                    onClick={() => copyText(generatedInvoice.paymentRequest)}
                    className="inline-flex items-center gap-1 text-xs text-slate-200 bg-slate-800 px-2.5 py-1 rounded-lg"
                  >
                    {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    {copied ? "Copiada" : "Copiar"}
                  </button>
                </div>
                <p className="text-[11px] font-mono text-slate-300 break-all">
                  {generatedInvoice.paymentRequest}
                </p>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
