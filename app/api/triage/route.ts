import { triageEnquiry } from "@/lib/triage";
import { enquiryInputSchema } from "@/lib/types";
import { getAllTeamLoads } from "@/lib/teams";
import { NextResponse } from "next/server";
import { z } from "zod";

const batchRequestSchema = z.object({
  enquiries: z.array(enquiryInputSchema).min(1).max(50),
});

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();

    const batchParsed = batchRequestSchema.safeParse(body);
    if (batchParsed.success) {
      const results = await Promise.all(
        batchParsed.data.enquiries.map((enquiry) => triageEnquiry(enquiry)),
      );
      return NextResponse.json({ results });
    }

    const singleParsed = enquiryInputSchema.safeParse(body);
    if (singleParsed.success) {
      const result = await triageEnquiry(singleParsed.data);
      return NextResponse.json(result);
    }

    return NextResponse.json(
      {
        error: "Invalid request body",
        details: "Expected a single enquiry or { enquiries: EnquiryInput[] }",
      },
      { status: 400 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const loads = getAllTeamLoads();
    return NextResponse.json({ teams: loads });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
