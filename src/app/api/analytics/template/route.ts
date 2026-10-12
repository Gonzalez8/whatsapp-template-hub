import { getTemplateAnalytics } from "@/lib/analytics";
import { PRIVATE_JSON, analyticsError, guardAnalytics, parseRange } from "@/lib/analytics/http";
import { InvalidQueryParam } from "@/lib/analytics/queries";

/** GET /api/analytics/template?waba=<id>&name=<template>&lang=<language>&range=90d */
export async function GET(request: Request) {
  const denied = await guardAnalytics();
  if (denied) return denied;

  try {
    const params = new URL(request.url).searchParams;
    const range = parseRange(params.get("range"));
    const waba = params.get("waba");
    const name = params.get("name");
    const language = params.get("lang");
    if (!waba || !name || !language) throw new InvalidQueryParam("Faltan waba, name o lang");
    // Values are validated again against strict patterns when building the SQL.
    const data = await getTemplateAnalytics(waba, name, language.toLowerCase(), range);
    return Response.json(data, { headers: PRIVATE_JSON });
  } catch (error) {
    return analyticsError(error);
  }
}
