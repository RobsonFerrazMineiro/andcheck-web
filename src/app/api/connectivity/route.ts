export function GET() {
  return Response.json(
    { ok: true, checkedAt: new Date().toISOString() },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

export function HEAD() {
  return new Response(null, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
