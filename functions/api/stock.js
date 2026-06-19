/**
 * ARMS Music — Cloudflare Pages Function
 * GET /api/stock
 *
 * Proxea el request de inventario al Apps Script de Google Sheets.
 * La URL real del Apps Script vive en la variable de entorno SHEETS_URL
 * configurada en el dashboard de Cloudflare Pages — nunca en el código.
 */

export async function onRequestGet(context) {
  const { env } = context;

  if (!env.SHEETS_URL) {
    return new Response(JSON.stringify({ ok: false, error: 'SHEETS_URL no configurada' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const res  = await fetch(env.SHEETS_URL, {
      headers: { 'User-Agent': 'ARMS-Music-Proxy/1.0' }
    });
    const data = await res.json();

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      }
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: 'Error al conectar con el servidor' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
