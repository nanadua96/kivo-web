export async function GET() {
  return Response.json({ hello: 'world' }, { status: 201 });
}

export async function POST(request: Request) {
  const data = await request.json();
  return Response.json(data);
}
