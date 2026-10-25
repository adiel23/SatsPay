import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  ADMIN_COOKIE_NAME,
  computeAdminToken,
  isAdminAuthenticated,
  verifyAdminPassword,
} from "@/lib/admin-auth";

export async function GET() {
  const authenticated = await isAdminAuthenticated();
  return NextResponse.json({ authenticated });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, password } = body as {
      action?: "login" | "logout";
      password?: string;
    };

    const cookieStore = await cookies();

    if (action === "logout") {
      cookieStore.delete(ADMIN_COOKIE_NAME);
      return NextResponse.json({ authenticated: false });
    }

    if (!password || !verifyAdminPassword(password)) {
      return NextResponse.json(
        { error: "Contraseña de administrador incorrecta." },
        { status: 401 }
      );
    }

    const token = computeAdminToken(password);
    cookieStore.set(ADMIN_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 días
    });

    return NextResponse.json({ authenticated: true });
  } catch {
    return NextResponse.json(
      { error: "Error procesando autenticación de administrador." },
      { status: 500 }
    );
  }
}
