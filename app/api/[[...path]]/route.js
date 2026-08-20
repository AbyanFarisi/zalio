import { NextResponse } from 'next/server';

// API Gateway - routes requests to microservices
const AUTH_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:8081';
const MASTER_URL = process.env.MASTER_SERVICE_URL || 'http://localhost:8082';
const ANALYTICS_URL = process.env.ANALYTICS_SERVICE_URL || 'http://localhost:8083';

function resolveTarget(pathParts) {
  const first = pathParts[0];
  if (first === 'auth') return AUTH_URL;
  if (first === 'master') return MASTER_URL;
  if (first === 'analytics') return ANALYTICS_URL;
  return null;
}

async function proxy(request, params) {
  const pathParts = params?.path || [];
  const target = resolveTarget(pathParts);
  if (!target) {
    return NextResponse.json({
      service: 'zalio-api-gateway',
      status: 'ok',
      routes: { auth: AUTH_URL, master: MASTER_URL, analytics: ANALYTICS_URL },
      note: 'Prefix /api/auth, /api/master, /api/analytics to route to services'
    });
  }
  const url = new URL(request.url);
  const search = url.search || '';
  const targetUrl = `${target}/${pathParts.join('/')}${search}`;

  const headers = {};
  request.headers.forEach((v, k) => {
    if (!['host', 'connection', 'content-length'].includes(k.toLowerCase())) {
      headers[k] = v;
    }
  });

  let body = undefined;
  if (!['GET', 'HEAD'].includes(request.method)) {
    body = await request.text();
  }

  try {
    const resp = await fetch(targetUrl, {
      method: request.method,
      headers,
      body,
    });
    const text = await resp.text();
    const contentType = resp.headers.get('content-type') || 'application/json';
    return new NextResponse(text, {
      status: resp.status,
      headers: { 'content-type': contentType },
    });
  } catch (e) {
    return NextResponse.json({ error: 'gateway_error', detail: String(e) }, { status: 502 });
  }
}

export async function GET(request, { params }) {
  return proxy(request, await params);
}
export async function POST(request, { params }) {
  return proxy(request, await params);
}
export async function PUT(request, { params }) {
  return proxy(request, await params);
}
export async function PATCH(request, { params }) {
  return proxy(request, await params);
}
export async function DELETE(request, { params }) {
  return proxy(request, await params);
}
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
