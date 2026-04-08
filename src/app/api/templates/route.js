const META_API = "https://graph.facebook.com/v23.0";

export async function GET() {
  const token = process.env.META_ACCESS_TOKEN;
  const businessId = process.env.META_BUSINESS_ID;

  if (!token || !businessId) {
    return Response.json(
      { error: "Missing META_ACCESS_TOKEN or META_BUSINESS_ID" },
      { status: 500 }
    );
  }

  // Step 1: Get all WABAs for the business
  const wabasRes = await fetch(
    `${META_API}/${businessId}/owned_whatsapp_business_accounts?fields=id,name&limit=100`,
    { headers: { Authorization: `Bearer ${token}` }, next: { revalidate: 0 } }
  );

  if (!wabasRes.ok) {
    const err = await wabasRes.json();
    return Response.json({ error: "Failed to fetch WABAs", details: err }, { status: 502 });
  }

  const wabasData = await wabasRes.json();
  const wabas = wabasData.data || [];

  // Step 2: Fetch templates for each WABA in parallel
  const results = await Promise.all(
    wabas.map(async (waba) => {
      const templatesRes = await fetch(
        `${META_API}/${waba.id}/message_templates?fields=id,name,status,category,language,components,quality_score&limit=500`,
        { headers: { Authorization: `Bearer ${token}` }, next: { revalidate: 0 } }
      );

      let templates = [];
      if (templatesRes.ok) {
        const data = await templatesRes.json();
        templates = data.data || [];
      }

      return {
        waba_id: waba.id,
        waba_name: waba.name,
        templates,
      };
    })
  );

  return Response.json({ wabas: results });
}
