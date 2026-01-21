import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";

type Context = {
  params: Promise<{
    branchId: string;
    fixedCostId: string;
  }>;
};

export async function PATCH(req: NextRequest, context: Context) {
  try {
    // --------------------------------------------------
    // Await params (Next.js 15+ requirement)
    // --------------------------------------------------
    const { branchId: branchIdParam, fixedCostId: fixedCostIdParam } =
      await context.params;

    const branchId = Number(branchIdParam);
    const fixedCostId = Number(fixedCostIdParam);

    if (!Number.isInteger(branchId) || !Number.isInteger(fixedCostId)) {
      return NextResponse.json(
        { error: "Invalid branchId or fixedCostId" },
        { status: 400 },
      );
    }

    // --------------------------------------------------
    // Parse request body
    // --------------------------------------------------
    const body = await req.json();

    const { name, amount, category, notes, isActive } = body as {
      name?: string;
      amount?: number;
      category?: string | null;
      notes?: string | null;
      isActive?: boolean;
    };

    // --------------------------------------------------
    // Validate payload (partial update allowed)
    // --------------------------------------------------
    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length === 0) {
        return NextResponse.json(
          { error: "Name must be a non-empty string" },
          { status: 400 },
        );
      }
    }

    if (amount !== undefined) {
      if (typeof amount !== "number" || Number.isNaN(amount) || amount <= 0) {
        return NextResponse.json(
          { error: "Amount must be a positive number" },
          { status: 400 },
        );
      }
    }

    if (isActive !== undefined && typeof isActive !== "boolean") {
      return NextResponse.json(
        { error: "isActive must be a boolean" },
        { status: 400 },
      );
    }

    // --------------------------------------------------
    // Ensure fixed cost exists & belongs to branch
    // --------------------------------------------------
    const existing = await prisma.fixedCost.findFirst({
      where: {
        id: fixedCostId,
        branchId,
      },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Fixed cost not found for this branch" },
        { status: 404 },
      );
    }

    // --------------------------------------------------
    // Build update payload
    // --------------------------------------------------
    const data: Record<string, unknown> = {};

    if (name !== undefined) data.name = name.trim();
    if (amount !== undefined) data.amount = amount;
    if (category !== undefined) data.category = category?.trim() || null;
    if (notes !== undefined) data.notes = notes?.trim() || null;
    if (isActive !== undefined) data.isActive = isActive;

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 },
      );
    }

    // --------------------------------------------------
    // Update fixed cost
    // --------------------------------------------------
    const updated = await prisma.fixedCost.update({
      where: { id: fixedCostId },
      data,
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

    return NextResponse.json({ fixedCost: updated }, { status: 200 });
  } catch (error) {
    console.error("Update fixed cost error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest, context: Context) {
  try {
    // --------------------------------------------------
    // Await params (Next.js 15+ requirement)
    // --------------------------------------------------
    const { branchId: branchIdParam, fixedCostId: fixedCostIdParam } =
      await context.params;

    const branchId = Number(branchIdParam);
    const fixedCostId = Number(fixedCostIdParam);

    if (!Number.isInteger(branchId) || !Number.isInteger(fixedCostId)) {
      return NextResponse.json(
        { error: "Invalid branchId or fixedCostId" },
        { status: 400 },
      );
    }

    // --------------------------------------------------
    // Ensure fixed cost exists & belongs to branch
    // --------------------------------------------------
    const existing = await prisma.fixedCost.findFirst({
      where: {
        id: fixedCostId,
        branchId,
      },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Fixed cost not found for this branch" },
        { status: 404 },
      );
    }

    // --------------------------------------------------
    // Soft delete (recommended)
    // --------------------------------------------------
    // await prisma.fixedCost.update({
    //   where: { id: fixedCostId },
    //   data: {
    //     isActive: false,
    //   },
    // });

    // return NextResponse.json({ ok: true }, { status: 200 });

    // --------------------------------------------------
    // Hard delete (optional alternative)
    // --------------------------------------------------
    await prisma.fixedCost.delete({
      where: { id: fixedCostId },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Delete fixed cost error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
