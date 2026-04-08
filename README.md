# WhatsApp Template Hub

A dashboard to visualize and search WhatsApp Business message templates across all your WABAs (WhatsApp Business Accounts).

## Features

- **Multi-WABA support** -- fetches templates from every WABA under your Meta Business account
- **Text search** -- filter by template name, body text, language, or category
- **WABA filter** -- toggle visibility per WABA with clickable chips
- **Status filter** -- filter by Approved, Pending, or Rejected
- **Grouped view** -- templates displayed in cards, grouped by WABA
- **Responsive** -- works on desktop and mobile

## Prerequisites

- Node.js 18+
- A Meta Business account with WhatsApp Business API access
- A System User access token with `whatsapp_business_management` permission

## Getting started

```bash
git clone https://github.com/Gonzalez8/whatsapp-template-hub.git
cd whatsapp-template-hub
cp .env.example .env.local
# Fill in your credentials in .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

| Variable | Description |
|---|---|
| `META_ACCESS_TOKEN` | System User token with `whatsapp_business_management` permission |
| `META_BUSINESS_ID` | Your Meta Business account ID |

## How it works

1. The API route (`/api/templates`) calls the Meta Graph API v23.0
2. It fetches all WABAs owned by your business account
3. For each WABA, it fetches all message templates in parallel
4. The frontend renders them grouped by WABA with client-side filtering

## Deploy on Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FGonzalez8%2Fwhatsapp-template-hub&env=META_ACCESS_TOKEN,META_BUSINESS_ID&envDescription=Meta%20Business%20API%20credentials)

Set `META_ACCESS_TOKEN` and `META_BUSINESS_ID` in your Vercel project's environment variables.

## License

[MIT](LICENSE)
