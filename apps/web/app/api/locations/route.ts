import { NextResponse } from "next/server";
import { createLocationSchema } from "./schema";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma/client";

export async function POST(req: Request) {
  try {
    const json = await req.json();

    const data = createLocationSchema.parse(json);

    const location = await prisma.location.create({
      data,
    });

    return NextResponse.json(location, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          message: "Invalid input",
          issues: error.issues,
        },
        { status: 400 },
      );
    }

    console.error(error);
    return NextResponse.json(
      {
        message: "Failed to create branch",
      },
      { status: 500 },
    );
  }
}
