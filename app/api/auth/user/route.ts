import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { UserUpdateSchema } from "@/validations/auth";
import { NextRequest, NextResponse } from "next/server";
import z from "zod";

// --> Read users info
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, name: true, email: true, bio: true, image: true, role: true },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  return NextResponse.json({ user });
}
// --> Update user info
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const parse = UserUpdateSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: "Invalid input", details: z.treeifyError(parse.error) }, { status: 400 });
  }
  const { username, email, bio } = parse.data;
  try {
    const updated = await prisma.user.update({
      where: { email: session.user.email },
      data: { name: username, email, bio },
      select: { id: true, name: true, email: true, bio: true, image: true, role: true },
    });
    return NextResponse.json({ user: updated, success: true });
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

// DELETE: Delete current user (optional, for admin/self-service)
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    await prisma.user.delete({ where: { email: session.user.email } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}