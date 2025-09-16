import { NextResponse } from "next/server";

export async function middleware(req) {
    const url = req.nextUrl.clone();
    const isBuySolar = url.pathname === "/buySolar";
    const isAddEnergy = url.pathname === "/admin/add-energy";
    //const isUpdatePrice = url.pathname === "/admin/update-price";
    const isAdminRoute =
        url.pathname === "/admin" || url.pathname.startsWith("/admin/") || url.pathname.startsWith("/api/admin/");

    if (url.pathname === "/api/generate-token") {
        return NextResponse.next();
    }
    // Check if the contract is paused for /buySolar or /admin/add-energy
    if (isBuySolar || isAddEnergy) {
        try {
            const pauseResponse = await fetch(`${req.nextUrl.origin}/api/check-paused`, {
                method: "GET",
            });

            if (pauseResponse.ok) {
                const data = await pauseResponse.json();
                //console.log(data);
                const { isPaused } = data;
                //console.log(isPaused);
                if (isPaused) {
                    url.pathname = isBuySolar ? "/maintenance" : "/admin/maintenance";
                    return NextResponse.redirect(url);
                }
            } else {
                console.error("Failed to check pause state:", pauseResponse.statusText);
                url.pathname = isAddEnergy ? "/admin/maintenance" : "/maintenance";
                return NextResponse.redirect(url);
            }
        } catch (error) {
            console.error("Error checking pause state:", error);
            url.pathname = isAddEnergy ? "/admin/maintenance" : "/maintenance";
            return NextResponse.redirect(url);
        }
    }

    if (isAdminRoute) {
        const token = req.cookies.get("__session")?.value;
        if (!token) {
            url.pathname = "/unauthorized";
            return NextResponse.redirect(url);
        }

        try {
            const verifyResponse = await fetch(`${req.nextUrl.origin}/api/verify-role`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!verifyResponse.ok) {
                url.pathname = "/unauthorized";
                return NextResponse.redirect(url);
            }

            const { role } = await verifyResponse.json();
            if (role !== "admin") {
                url.pathname = "/unauthorized";
                return NextResponse.redirect(url);
            }

            return NextResponse.next();
        } catch (error) {
            console.error("Middleware error:", error);
            url.pathname = "/unauthorized";
            return NextResponse.redirect(url);
        }
    }
    // Existing authentication and role checks for /admin/* routes
    // if (url.pathname === "/admin" || url.pathname.startsWith("/admin/")) {
    //     const token = req.cookies.get("__session")?.value;
    //     if (!token) {
    //         url.pathname = "/unauthorized";
    //         return NextResponse.redirect(url);
    //     }

    //     try {
    //         const verifyResponse = await fetch(`${req.nextUrl.origin}/api/verify-role`, {
    //             method: "GET",
    //             headers: {
    //                 Authorization: `Bearer ${token}`,
    //             },
    //         });

    //         if (!verifyResponse.ok) {
    //             url.pathname = "/unauthorized";
    //             return NextResponse.redirect(url);
    //         }

    //         const { role } = await verifyResponse.json();
    //         if (role !== "admin") {
    //             url.pathname = "/unauthorized";
    //             return NextResponse.redirect(url);
    //         }

    //         return NextResponse.next();
    //     } catch (error) {
    //         console.error("Middleware error:", error);
    //         url.pathname = "/unauthorized";
    //         return NextResponse.redirect(url);
    //     }
    // }

    return NextResponse.next();
}

export const config = {
    matcher: ["/admin/:path*", "/buySolar"], // Protect /admin/* and /buySolar routes
};
