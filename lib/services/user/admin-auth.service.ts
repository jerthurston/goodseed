import { auth } from "@/auth";
import { NextResponse } from "next/server";

export async function adminAuthService() {
    const session = await auth();
    const user = session?.user;

    if (!user || !user.id) {
        return NextResponse.json({
            error: "Unauthorized",
            status: 401
        })
    }

    if (user?.role !== "ADMIN") {
        return NextResponse.json({
            message: "Forbidden",
            status: 403
        })
    }

}