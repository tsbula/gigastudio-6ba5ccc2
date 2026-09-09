import { NextResponse, type NextRequest } from "next/server";

/**
 * Превью студии открывает приложение через прокси: браузер шлёт Origin
 * внешнего домена, а до Next.js запрос доходит с внутренним Host
 * (localhost:3000). CSRF-проверка Server Actions сравнивает Origin с
 * x-forwarded-host / Host и отбрасывает каждый вызов с ошибкой
 * «Invalid Server Actions request». Выравниваем x-forwarded-host с Origin,
 * чтобы проверка видела совпадение.
 */
export function middleware(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return NextResponse.next();

  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return NextResponse.next();
  }

  if (
    request.headers.get("x-forwarded-host") === originHost ||
    request.headers.get("host") === originHost
  ) {
    return NextResponse.next();
  }

  const headers = new Headers(request.headers);
  headers.set("x-forwarded-host", originHost);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
