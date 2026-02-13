import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";

type Context = {
  params: Promise<{
    locationId: string;
  }>;
};

export async function POST(req: NextRequest, context: Context) {
  try {
    // --------------------------------------------------
    // Await params (Next.js 15+ requirement)
    // --------------------------------------------------
    const { locationId: branchIdParam } = await context.params;

    const branchId = Number(branchIdParam);
    if (!Number.isInteger(branchId)) {
      return NextResponse.json({ error: "Invalid branchId" }, { status: 400 });
    }

    // --------------------------------------------------
    // Parse request body
    // --------------------------------------------------
    const body = await req.json();

    const {
      name,
      amount,
      category,
      notes,
      isActive = true,
    } = body as {
      name?: string;
      amount?: number;
      category?: string;
      notes?: string;
      isActive?: boolean;
    };

    // --------------------------------------------------
    // Validate payload
    // --------------------------------------------------
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    if (typeof amount !== "number" || Number.isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "Amount must be a positive number" },
        { status: 400 },
      );
    }

    // --------------------------------------------------
    // Ensure branch exists
    // --------------------------------------------------
    const branchExists = await prisma.branch.findUnique({
      where: { id: branchId },
      select: { id: true },
    });

    if (!branchExists) {
      return NextResponse.json({ error: "Branch not found" }, { status: 404 });
    }

    // --------------------------------------------------
    // Create fixed cost
    // --------------------------------------------------
    const fixedCost = await prisma.fixedCost.create({
      data: {
        branchId,
        name: name.trim(),
        amount,
        category: category?.trim() || null,
        notes: notes?.trim() || null,
        isActive,
      },
      select: {
        id: true,
        name: true,
        amount: true,
        category: true,
        notes: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ fixedCost }, { status: 201 });
  } catch (error) {
    console.error("Create fixed cost error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
