import type {
  MetaWaba,
  MetaPaginatedResponse,
  Template,
  Waba,
  WabaPhoneNumber,
} from "@/types/template";

const META_API = "https://graph.facebook.com/v23.0";
const FETCH_TIMEOUT_MS = 15_000;

function metaFetch(url: string, token: string): Promise<Response> {
  return fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    next: { revalidate: 300 },
  });
}

async function fetchAllTemplates(
  wabaId: string,
  token: string
): Promise<Template[]> {
  const templates: Template[] = [];
  let url:
    | string
    | null = `${META_API}/${wabaId}/message_templates?fields=id,name,status,category,language,components,quality_score&limit=500`;

  while (url) {
    const res = await metaFetch(url, token);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(
        `Failed to fetch templates for WABA ${wabaId}: ${JSON.stringify(err)}`
      );
    }

    const data: MetaPaginatedResponse<Template> = await res.json();
    templates.push(...(data.data ?? []));
    url = data.paging?.next ?? null;
  }

  return templates;
}

async function fetchPhoneNumbers(
  wabaId: string,
  token: string
): Promise<WabaPhoneNumber[]> {
  const url = `${META_API}/${wabaId}/phone_numbers?fields=id,display_phone_number,verified_name,quality_rating,status`;
  const res = await metaFetch(url, token);
  if (!res.ok) return [];
  const data: MetaPaginatedResponse<WabaPhoneNumber> = await res.json();
  return data.data ?? [];
}

export async function fetchWabasWithTemplates(): Promise<Waba[]> {
  const token = process.env.META_ACCESS_TOKEN;
  const businessId = process.env.META_BUSINESS_ID;

  if (!token || !businessId) {
    throw new Error("Missing META_ACCESS_TOKEN or META_BUSINESS_ID");
  }

  const wabasRes = await metaFetch(
    `${META_API}/${businessId}/owned_whatsapp_business_accounts?fields=id,name&limit=100`,
    token
  );

  if (!wabasRes.ok) {
    const err = await wabasRes.json();
    throw new Error(`Failed to fetch WABAs: ${JSON.stringify(err)}`);
  }

  const wabasData: MetaPaginatedResponse<MetaWaba> = await wabasRes.json();
  const wabas = wabasData.data ?? [];

  const settled = await Promise.allSettled(
    wabas.map(async (waba): Promise<Waba> => {
      const [templates, phone_numbers] = await Promise.all([
        fetchAllTemplates(waba.id, token),
        fetchPhoneNumbers(waba.id, token),
      ]);
      return {
        waba_id: waba.id,
        waba_name: waba.name,
        phone_numbers,
        templates,
      };
    })
  );

  return settled
    .filter(
      (r): r is PromiseFulfilledResult<Waba> => r.status === "fulfilled"
    )
    .map((r) => r.value);
}
