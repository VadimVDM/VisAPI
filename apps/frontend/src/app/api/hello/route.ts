export const dynamic = 'force-static';

export function GET(_request: Request) {
  return new Response('Hello, from API!');
}
