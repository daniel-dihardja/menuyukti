import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createLocationSchema } from "./schema";
import { ZodError } from "zod";
import { graphqlQuery } from "@/lib/graphql/client";
import {
  CREATE_LOCATION_MUTATION,
  type CreateLocationData,
} from "@/lib/graphql/queries";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const json = await req.json();
    const { name } = createLocationSchema.parse(json);

    const data = await graphqlQuery<CreateLocationData>(
      CREATE_LOCATION_MUTATION,
      { name },
      userId,
    );

    const location = data.createLocation;
    if (!location) {
      return NextResponse.json(
        { message: "Failed to create location" },
        { status: 500 }
      );
    }

    return NextResponse.json(location, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          message: "Invalid input",
          issues: error.issues,
        },
        { status: 400 }
      );
    }

    console.error(error);
    return NextResponse.json(
      { message: "Failed to create location" },
      { status: 500 }
    );
  }
}
