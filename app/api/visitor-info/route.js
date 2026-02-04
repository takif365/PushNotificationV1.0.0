import { NextResponse } from 'next/server';

export async function GET(req) {
    try {
        // Extract real client IP from various hosting environments
        const forwarded = req.headers.get('x-forwarded-for');
        const realIp = req.headers.get('x-real-ip');
        const cfConnectingIp = req.headers.get('cf-connecting-ip'); // Cloudflare
        const trueClientIp = req.headers.get('true-client-ip'); // Cloudflare Enterprise

        // Priority: CF headers > x-forwarded-for > x-real-ip > fallback
        let ip = cfConnectingIp || trueClientIp;
        if (!ip && forwarded) {
            ip = forwarded.split(',')[0].trim();
        }
        if (!ip) {
            ip = realIp || 'unknown';
        }

        console.log('[Visitor Info] Extracted IP:', ip);
        console.log('[Visitor Info] Headers:', {
            forwarded,
            realIp,
            cfConnectingIp,
            trueClientIp
        });

        // Get user agent and accept-language from headers
        const ua = req.headers.get('user-agent') || 'unknown';
        const lang = req.headers.get('accept-language')?.split(',')[0] || 'en-US';

        // If IP is unknown or localhost, return without API calls
        if (ip === 'unknown' || ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
            console.log('[Visitor Info] Local/unknown IP, skipping geolocation APIs');
            return NextResponse.json({
                ip: ip,
                country: 'Unknown',
                country_code: 'XX',
                ua,
                lang
            }, {
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type',
                }
            });
        }

        // Try ipapi.co first (server-side has no CORS issues)
        try {
            console.log('[Visitor Info] Trying ipapi.co for IP:', ip);
            const response = await fetch(`https://ipapi.co/${ip}/json/`, {
                headers: { 'User-Agent': 'Push-Notification-System/1.0' }
            });

            if (response.ok) {
                const ipInfo = await response.json();
                console.log('[Visitor Info] ipapi.co response:', ipInfo);
                return NextResponse.json({
                    ip: ipInfo.ip || ip,
                    country: ipInfo.country_name || 'Unknown',
                    country_code: ipInfo.country_code || 'XX',
                    ua,
                    lang
                }, {
                    headers: {
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'GET, OPTIONS',
                        'Access-Control-Allow-Headers': 'Content-Type',
                    }
                });
            }
        } catch (err) {
            console.log('[Visitor Info] ipapi.co failed:', err.message);
        }

        // Fallback to ip-api.com
        try {
            console.log('[Visitor Info] Trying ip-api.com for IP:', ip);
            const response = await fetch(`http://ip-api.com/json/${ip}`);
            if (response.ok) {
                const ipInfo = await response.json();
                console.log('[Visitor Info] ip-api.com response:', ipInfo);
                return NextResponse.json({
                    ip: ipInfo.query || ip,
                    country: ipInfo.country || 'Unknown',
                    country_code: ipInfo.countryCode || 'XX',
                    ua,
                    lang
                }, {
                    headers: {
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'GET, OPTIONS',
                        'Access-Control-Allow-Headers': 'Content-Type',
                    }
                });
            }
        } catch (err) {
            console.log('[Visitor Info] ip-api.com failed:', err.message);
        }

        // Return minimal data if both APIs fail
        console.log('[Visitor Info] Both APIs failed, returning fallback data');
        return NextResponse.json({
            ip,
            country: 'Unknown',
            country_code: 'XX',
            ua,
            lang
        }, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
            }
        });
    } catch (error) {
        console.error('[Visitor Info] Error:', error);
        return NextResponse.json({
            ip: 'unknown',
            country: 'Unknown',
            country_code: 'XX',
            ua: 'unknown',
            lang: 'en-US'
        }, {
            status: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
            }
        });
    }
}

// Handle OPTIONS preflight request
export async function OPTIONS(req) {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        }
    });
}
