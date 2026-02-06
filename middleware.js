import { NextResponse } from "next/server";

export function middleware(request) {
    const origin = request.headers.get("origin");

    // Check if the request is for the API
    if (request.nextUrl.pathname.startsWith("/api/")) {
        // Handle preflight OPTIONS request
        if (request.method === "OPTIONS") {
            return new NextResponse(null, {
                status: 200,
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version",
                    "Access-Control-Max-Age": "86400",
                },
            });
        }

        // Handle simple requests
        const response = NextResponse.next();

        response.headers.set("Access-Control-Allow-Origin", "*");
        response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
        response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version");

        return response;
    }

    return NextResponse.next();
}

export const config = {
    matcher: "/api/:path*",
};
