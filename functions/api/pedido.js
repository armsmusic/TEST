/**
 * ARMS Music — Cloudflare Pages Function
 * GET /api/pedido?data=...
 *
 * Proxea el envío de pedido al Apps Script de Google Sheets.
 * La URL real del Apps Script vive en la variable de entorno SHEETS_URL.
 *
 * Incluye validación básica anti-spam:
 * - Verifica que el parámetro 'data' existe y es JSON válido
 * - Verifica que el honeypot 'hp' esté vacío
 * - Rate limiting básico por IP (Cloudflare lo maneja a nivel de plan)
 */

export async function onRequestGet(context) {
  const { request, env } = context;

  if (!env.SHEETS_URL) {
    return new Response(JSON.stringify({ ok: false, error: 'SHEETS_URL no configurada' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const url    = new URL(request.url);
  const data   = url.searchParams.get('data');
  const hp     = url.searchParams.get('hp'); // honeypot

  // Honeypot — si está lleno es spam
  if (hp && hp.length > 0) {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Validar que viene el parámetro data
  if (!data) {
    return new Response(JSON.stringify({ ok: false, error: 'Datos del pedido faltantes' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Validar que es JSON válido
  let payload;
  try {
    payload = JSON.parse(decodeURIComponent(data));
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: 'Formato de datos inválido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Validar campos mínimos requeridos
  const requeridos = ['nombre', 'telefono', 'direccion', 'departamento', 'municipio'];
  for (const campo of requeridos) {
    if (!payload[campo] || String(payload[campo]).trim().length === 0) {
      return new Response(JSON.stringify({ ok: false, error: `Campo requerido faltante: ${campo}` }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  try {
    const sheetsUrl = env.SHEETS_URL + '?pedido=' + encodeURIComponent(JSON.stringify(payload));
    const res       = await fetch(sheetsUrl, {
      headers: { 'User-Agent': 'ARMS-Music-Proxy/1.0' }
    });
    const result = await res.json();

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      }
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: 'Error al procesar el pedido' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
