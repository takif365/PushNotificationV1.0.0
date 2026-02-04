import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
    return new Response(null, {
        status: 204,
        headers: corsHeaders,
    });
}

export async function GET(req) {
    try {
        // Extract location from Vercel/Cloudflare headers
        const country = req.headers.get('x-vercel-ip-country') || req.headers.get('cf-ipcountry') || 'XX';
        const city = req.headers.get('x-vercel-ip-city') || 'Unknown';
        const latitude = req.headers.get('x-vercel-ip-latitude');
        const longitude = req.headers.get('x-vercel-ip-longitude');

        return NextResponse.json({
            country,
            city,
            coordinates: {
                lat: latitude ? parseFloat(latitude) : null,
                lng: longitude ? parseFloat(longitude) : null
            }
        }, {
            headers: corsHeaders
        });
    } catch (error) {
        console.error('[API] Get location error:', error);
        return NextResponse.json({
            error: error.message,
            country: 'XX',
            city: 'Unknown',
            coordinates: { lat: null, lng: null }
        }, {
            status: 500,
            headers: corsHeaders
        });
    }
}
