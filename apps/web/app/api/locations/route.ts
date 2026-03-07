import { NextResponse } from "next/server";
import { createLocationSchema } from "./schema";
import { ZodError } from "zod";

const CREATE_LOCATION_MUTATION = `
  mutation CreateLocation($name: String!) {
    createLocation(name: $name) {
      id
      name
    }
  }
`;

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const { name } = createLocationSchema.parse(json);

    const endpoint = process.env.GRAPHQL_ENDPOINT;
    if (!endpoint) {
      return NextResponse.json(
        { message: "GraphQL endpoint is not configured" },
        { status: 500 }
      );
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: CREATE_LOCATION_MUTATION,
        variables: { name },
      }),
    });

    if (!res.ok) {
      console.error("GraphQL request failed", res.status, await res.text());
      return NextResponse.json(
        { message: "Failed to create location" },
        { status: 500 }
      );
    }

    const result = (await res.json()) as {
      data?: { createLocation: { id: string; name: string } };
      errors?: Array<{ message: string }>;
    };

    if (result.errors?.length) {
      return NextResponse.json(
        {
          message:
            result.errors[0]?.message ?? "Failed to create location",
        },
        { status: 400 }
      );
    }

    const location = result.data?.createLocation;
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
