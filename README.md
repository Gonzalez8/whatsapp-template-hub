# WhatsApp Template Hub

A dashboard to visualize and search WhatsApp Business message templates across all your WABAs (WhatsApp Business Accounts).

## Features

- **Multi-WABA support** -- fetches templates from every WABA under your Meta Business account
- **Text search** -- filter by template name, body text, language, or category
- **WABA filter** -- toggle visibility per WABA with clickable chips
- **Status filter** -- filter by Approved, Pending, or Rejected
- **WhatsApp preview** -- realistic message bubble preview with formatted text, headers, footers, and buttons
- **Grouped view** -- templates displayed in cards, grouped by WABA
- **Auto-refresh** -- server-side data revalidation every 5 minutes (ISR)
- **Responsive** -- works on desktop and mobile

## Tech stack

- [Next.js 15](https://nextjs.org/) (App Router, Server Components)
- [React 19](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS 4](https://tailwindcss.com/)
- [Meta Graph API v23.0](https://developers.facebook.com/docs/graph-api)

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

| Variable            | Description                                                      |
| ------------------- | ---------------------------------------------------------------- |
| `META_ACCESS_TOKEN` | System User token with `whatsapp_business_management` permission |
| `META_BUSINESS_ID`  | Your Meta Business account ID                                    |

See [.env.example](.env.example) for reference.

## Project structure

```
src/
  app/
    page.tsx              # Home page (Server Component)
    layout.tsx            # Root layout
    error.tsx             # Error boundary
    api/
      templates/route.ts  # REST endpoint for templates
      revalidate/route.ts # On-demand revalidation endpoint
  components/
    Header.tsx
    FiltersBar.tsx
    TemplatesDashboard.tsx
    WabaSection.tsx
    TemplateCard.tsx
    WhatsAppPreview.tsx
    EmptyState.tsx
    SkeletonLoader.tsx
  hooks/
    useTemplateFilters.ts # Client-side filtering logic
  lib/
    meta-api.ts           # Meta Graph API client
    whatsapp-format.tsx   # WhatsApp text formatting (bold, italic, etc.)
  types/
    template.ts           # Shared TypeScript types
```

## How it works

1. The server component calls `fetchWabasWithTemplates()` from `meta-api.ts`
2. It fetches all WABAs owned by your business account via Meta Graph API v23.0
3. For each WABA, it fetches all message templates in parallel (with pagination support)
4. Data is cached and revalidated every 5 minutes using Next.js ISR
5. The client-side dashboard provides real-time filtering by search, WABA, and status

## Available scripts

| Command         | Description              |
| --------------- | ------------------------ |
| `npm run dev`   | Start development server |
| `npm run build` | Create production build  |
| `npm run start` | Start production server  |
| `npm run lint`  | Run ESLint               |

## Deploy on Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FGonzalez8%2Fwhatsapp-template-hub&env=META_ACCESS_TOKEN,META_BUSINESS_ID&envDescription=Meta%20Business%20API%20credentials)

Set `META_ACCESS_TOKEN` and `META_BUSINESS_ID` in your Vercel project's environment variables.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
