import { NextResponse } from "next/server";
import { BUILD_ID } from "@/lib/build-id";

// Devolve a versão que está no ar. As telas abertas comparam com a versão
// com que foram carregadas e avisam quando há uma nova.
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ buildId: BUILD_ID }, { headers: { "Cache-Control": "no-store" } });
}
