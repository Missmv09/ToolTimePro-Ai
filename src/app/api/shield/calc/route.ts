import { NextResponse } from "next/server";
import { calcDailyWage, calcPenalty } from "@/lib/calc";

export async function POST(req: Request) {
  const data = await req.json();
  const daily = calcDailyWage(data);
  const result = calcPenalty(daily, data.daysLate);
  return NextResponse.json(result);
}
