// Simple health check endpoint for CORS testing
export async function GET() {
    return Response.json({ status: 'ok', timestamp: new Date().toISOString() });
}
