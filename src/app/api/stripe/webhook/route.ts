export async function POST() {
  return new Response('stripe webhook', { status: 200 });
}
