import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Update seller active status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { isActive } = body

    const updatedSeller = await prisma.seller.update({
      where: { id },
      data: { isActive },
    })

    return NextResponse.json(updatedSeller)
  } catch (error) {
    console.error("Error updating seller:", error)
    return NextResponse.json(
      { error: "Failed to update seller" },
      { status: 500 }
    )
  }
}
