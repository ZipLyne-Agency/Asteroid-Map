# Complete SEO & Discoverability Skill

A comprehensive, battle-tested playbook for making any website maximally discoverable across search engines, AI assistants, social platforms, and every channel people use to find content. This covers **everything** — from metadata foundations to advanced programmatic SEO at scale.

Use this skill whenever building, auditing, or improving the search visibility and discoverability of any website.

---

## Table of Contents

1. [Metadata Foundation](#1-metadata-foundation)
2. [Open Graph & Social Cards](#2-open-graph--social-cards)
3. [Structured Data / JSON-LD](#3-structured-data--json-ld)
4. [Sitemaps](#4-sitemaps)
5. [Robots.txt & Crawl Management](#5-robotstxt--crawl-management)
6. [AI & LLM Discoverability](#6-ai--llm-discoverability)
7. [Canonical URLs & Duplicate Content Prevention](#7-canonical-urls--duplicate-content-prevention)
8. [Internationalization (i18n) & Hreflang](#8-internationalization-i18n--hreflang)
9. [Breadcrumbs](#9-breadcrumbs)
10. [Internal Linking Architecture](#10-internal-linking-architecture)
11. [Programmatic SEO at Scale](#11-programmatic-seo-at-scale)
12. [FAQ Schema & Rich Results](#12-faq-schema--rich-results)
13. [Analytics & Search Console](#13-analytics--search-console)
14. [Performance & Core Web Vitals](#14-performance--core-web-vitals)
15. [Security Headers](#15-security-headers)
16. [PWA & App Integration](#16-pwa--app-integration)
17. [Blog & Content SEO](#17-blog--content-seo)
18. [Conversion & Engagement Optimization](#18-conversion--engagement-optimization)
19. [Redirects & URL Hygiene](#19-redirects--url-hygiene)
20. [Image SEO](#20-image-seo)
21. [Keyword Strategy & Cannibalization Prevention](#21-keyword-strategy--cannibalization-prevention)
22. [Local SEO](#22-local-seo)
23. [Accessibility for SEO](#23-accessibility-for-seo)
24. [404 & Error Handling](#24-404--error-handling)
25. [E-E-A-T Signals](#25-e-e-a-t-signals)
26. [Featured Snippet Optimization](#26-featured-snippet-optimization)
27. [Content Optimization & Heading Hierarchy](#27-content-optimization--heading-hierarchy)
28. [Social Proof & Reviews](#28-social-proof--reviews)
29. [IndexNow & Search Engine Pinging](#29-indexnow--search-engine-pinging)
30. [Build & Caching Optimizations](#30-build--caching-optimizations)
31. [Mobile UX for SEO](#31-mobile-ux-for-seo)
32. [Page-Level SEO Checklist](#32-page-level-seo-checklist)
33. [Ongoing Audit Checklist (with Cadence)](#33-ongoing-audit-checklist-with-cadence)

---

## 1. Metadata Foundation

Every page must have its own unique, purpose-built metadata. Never rely solely on inherited defaults from a root layout.

### Required metadata for every page:

```typescript
export const metadata: Metadata = {
  title: 'Page Title — Under 60 chars | Brand',
  description: 'Unique description between 120-160 chars. Include primary keyword naturally. End with a CTA or value prop.',
  keywords: ['primary keyword', 'secondary keyword', 'long-tail variant'],
  metadataBase: new URL('https://www.yourdomain.com'),
  generator: 'Your App Name',
  authors: [{ name: 'Brand', url: 'https://www.yourdomain.com' }],
  creator: 'Brand',
  publisher: 'Brand',
  category: 'technology', // or relevant category
}
```

### Title best practices:
- Keep under 60 characters to avoid SERP truncation
- Put the primary keyword near the beginning
- Use a consistent brand suffix pattern: `Page Title | Brand`
- Use template-based generation for programmatic pages to ensure uniqueness
- Validate that generated titles don't exceed length limits

### Description best practices:
- 120-160 characters (sweet spot for SERPs)
- Include the primary keyword naturally
- Write it as a compelling pitch — this is your ad copy in search results
- End with a benefit or CTA
- Avoid duplicate descriptions across pages — use template variation for programmatic pages

### Search engine verification:
```typescript
verification: {
  google: process.env.GOOGLE_SITE_VERIFICATION,
  other: process.env.BING_SITE_VERIFICATION
    ? { 'msvalidate.01': process.env.BING_SITE_VERIFICATION }
    : undefined,
},
```

### Robots directives per page:
```typescript
robots: {
  index: true,
  follow: true,
  googleBot: {
    index: true,
    follow: true,
    'max-video-preview': -1,
    'max-image-preview': 'large',  // Allow large image previews
    'max-snippet': -1,              // No snippet length limit
  },
},
```

For pages that should be excluded (investor decks, internal tools, staging pages):
```typescript
robots: { index: false, follow: false }
```

### Viewport configuration:
```typescript
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,      // Allow zooming for accessibility
  userScalable: true,    // Never disable user scaling
  themeColor: '#your-brand-color',
}
```

---

## 2. Open Graph & Social Cards

Every page needs full Open Graph and Twitter Card metadata for rich social sharing. Missing OG images is one of the most common SEO audit failures.

### Open Graph (Facebook, LinkedIn, Slack, Discord, etc.):
```typescript
openGraph: {
  title: 'Compelling social title — can differ from page title',
  description: 'Social-optimized description. Can be more conversational than meta description.',
  url: 'https://www.yourdomain.com/page-path',
  siteName: 'Brand Name',
  images: [
    {
      url: 'https://cdn.yourdomain.com/og/page-name.png',
      width: 1200,
      height: 630,
      alt: 'Descriptive alt text for the OG image',
    },
  ],
  locale: 'en_US',
  type: 'website', // or 'article' for blog posts/guides
},
```

### Twitter/X Cards (Optional):
Twitter Cards are optional and only necessary if you actively use Twitter/X as a marketing channel. Open Graph tags are sufficient for most social platforms — Twitter/X will fall back to OG tags automatically.

If you do use Twitter/X:
```typescript
twitter: {
  card: 'summary_large_image',
  title: 'Twitter-optimized title',
  description: 'Twitter-optimized description',
  images: ['https://cdn.yourdomain.com/og/page-name.png'],
  site: '@yourbrand',    // Your brand's Twitter handle
  creator: '@yourbrand', // Content creator's handle
},
```

**Important**: If you don't actively use Twitter/X, omit the `twitter` metadata entirely rather than including inconsistent handles. OG tags provide adequate social card rendering across all platforms including Twitter/X.

### OG image requirements:
- **Dimensions**: 1200x630px (universal standard)
- **Format**: PNG or JPG
- **File size**: Under 1MB for fast loading
- **Content**: Include brand logo, page title text, relevant imagery
- **Alt text**: Always provide descriptive alt text on the image object
- **Hosting**: Use a CDN (Supabase Storage, Cloudinary, Vercel OG, etc.)
- **Per-page images**: Every major page should have a unique OG image. At minimum, have type-specific defaults (features, tools, blog, enterprise, etc.)

### Common OG image mistakes to avoid:
- Using the same image for every page
- Missing OG images entirely on secondary pages (contact, press, learn hub)
- Not including alt text on OG image objects
- Using images that are too large (slow to load for social crawlers)

### Page-type to OG type mapping:
| Page Type | OG Type |
|-----------|---------|
| Homepage, features, tools, landing | `website` |
| Blog posts, guides, articles | `article` |
| Profile pages | `profile` |

---

## 3. Structured Data / JSON-LD

Structured data (JSON-LD) tells search engines exactly what your content is. This unlocks rich results, knowledge panels, and featured snippets.

### Implementation pattern:

Create a component that renders JSON-LD script tags:
```tsx
export function SchemaScript({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}
```

### Schema types to implement by page type:

| Page Type | Schemas |
|-----------|---------|
| Homepage | `WebSite`, `Organization`, `SoftwareApplication` (if app) |
| Feature pages | `SoftwareApplication`, `WebPage` |
| Tool pages | `SoftwareApplication`, `HowTo`, `WebPage` |
| Blog posts | `Article` or `BlogPosting`, `BreadcrumbList` |
| Guide pages | `Article`, `BreadcrumbList`, `Course` (if educational) |
| Enterprise/B2B | `Service`, `Organization`, `Product`, `FAQPage`, `BreadcrumbList`, `ItemList` (for pricing tiers) |
| FAQ pages | `FAQPage`, `WebPage` |
| Translation/Glossary | `DefinedTerm`, `DefinedTermSet`, `WebPage` |
| Comparison pages | `ItemList`, `WebPage` |
| Location pages | `LocalBusiness` or `Service` with `areaServed` |

### Organization schema (every site needs this):
```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": "https://www.yourdomain.com/#organization",
  "name": "Brand Name",
  "url": "https://www.yourdomain.com",
  "logo": {
    "@type": "ImageObject",
    "url": "https://www.yourdomain.com/logo.png"
  },
  "sameAs": [
    "https://apps.apple.com/app/...",
    "https://play.google.com/store/apps/...",
    "https://instagram.com/yourbrand",
    "https://linkedin.com/company/yourbrand"
  ],
  "contactPoint": {
    "@type": "ContactPoint",
    "email": "contact@yourdomain.com",
    "contactType": "Customer Support"
  }
}
```

### SoftwareApplication schema (for apps/SaaS):
```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Your App Name",
  "applicationCategory": "EducationalApplication",
  "operatingSystem": ["iOS", "Android"],
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.8",
    "ratingCount": "1200"
  },
  "featureList": ["Feature 1", "Feature 2", "Feature 3"]
}
```

### Service schema (for B2B/enterprise pages):
```json
{
  "@context": "https://schema.org",
  "@type": "Service",
  "serviceType": "Your Service Type",
  "provider": { "@type": "Organization", "@id": ".../#organization" },
  "areaServed": { "@type": "Place", "name": "Worldwide" },
  "hasOfferCatalog": {
    "@type": "OfferCatalog",
    "itemListElement": [
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": "Plan Name",
          "description": "Plan description"
        }
      }
    ]
  }
}
```

### Schema validation:
- Always include `@context` and `@type`
- Articles must have `headline`, `datePublished`, `author`
- FAQPage must have `mainEntity` array
- BreadcrumbList must have sequential `position` values
- Use Google's Rich Results Test to validate: https://search.google.com/test/rich-results
- Use Schema.org Validator: https://validator.schema.org

### Advanced: Use `@id` references to link schemas together:
```json
{
  "@type": "WebPage",
  "isPartOf": {
    "@type": "WebSite",
    "@id": "https://www.yourdomain.com/#website"
  },
  "breadcrumb": {
    "@id": "https://www.yourdomain.com/page/#breadcrumb"
  }
}
```

---

## 4. Sitemaps

Sitemaps tell search engines which pages exist and their relative importance. A multi-sitemap strategy is essential.

### Main sitemap (`app/sitemap.ts`):

```typescript
import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const BASE_URL = 'https://www.yourdomain.com'

  // Static pages with explicit priority and change frequency
  const staticPages = [
    { path: '', priority: 1.0, changeFrequency: 'weekly' as const },
    { path: '/features', priority: 0.9, changeFrequency: 'monthly' as const },
    { path: '/blog', priority: 0.9, changeFrequency: 'daily' as const },
    { path: '/pricing', priority: 0.85, changeFrequency: 'monthly' as const },
    // ... all pages
  ]

  // Programmatic pages
  const dynamicPages = getAllSlugs().map(slug => ({
    url: `${BASE_URL}/phrases/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.65,
  }))

  return [
    ...staticPages.map(p => ({
      url: `${BASE_URL}${p.path}`,
      lastModified: new Date(),
      changeFrequency: p.changeFrequency,
      priority: p.priority,
    })),
    ...dynamicPages,
  ]
}
```

### Priority guidelines:
| Page Type | Priority |
|-----------|----------|
| Homepage | 1.0 |
| Core product/feature pages | 0.9-0.95 |
| Blog index, key tool pages | 0.85-0.9 |
| Feature/SEO landing pages | 0.75-0.85 |
| Programmatic hub pages | 0.8-0.85 |
| Individual programmatic pages | 0.6-0.65 |
| Secondary pages (about, contact) | 0.5-0.7 |
| Legal pages | 0.3 |
| Brand guide, internal | 0.2 |

### Multiple sitemaps strategy:
1. **Main sitemap** (`sitemap.xml`) — All static and programmatic pages
2. **Blog sitemap** (`blog/sitemap.xml`) — Blog posts with their own update cadence
3. **LLM sitemap** (`sitemap-llms.xml`) — For AI discoverability (see section 6)

### Scaling to 100K+ pages:
- Google's limit is 50,000 URLs per sitemap file
- Use a **sitemap index** that points to chunked sub-sitemaps (45K URLs each for safety)
- Move data to a database for easier management at scale
- Cache sitemap generation results
- Use ISR for on-demand page generation instead of building all pages at once

---

## 5. Robots.txt & Crawl Management

The robots.txt file controls which parts of your site search engine bots can access.

### Comprehensive robots.txt pattern:

```
User-agent: *
Allow: /

# Block internal/API routes
Disallow: /api/
Disallow: /_next/static/

# Block test/debug pages
Disallow: /debug
Disallow: /test

# Block old CMS artifacts
Disallow: /ghost/
Disallow: /blog/author/
Disallow: /blog/page/

# Explicitly allow key SEO pages (signals importance to crawlers)
Allow: /features
Allow: /blog
Allow: /tools

# Programmatic page directories
Allow: /phrases/

# LLMs.txt reference
Llms-txt: https://www.yourdomain.com/llms.txt

# Sitemap declarations (critical — always include)
Sitemap: https://www.yourdomain.com/sitemap.xml
Sitemap: https://www.yourdomain.com/blog/sitemap.xml
Sitemap: https://www.yourdomain.com/sitemap-llms.xml
```

### Crawl budget optimization:
- Block `/_next/static/` — no need for crawlers to waste budget on JS bundles
- Block API routes — they return JSON, not indexable content
- Block pagination routes that duplicate content (`/blog/page/2`, `/blog/author/...`)
- Explicitly `Allow:` your most important pages as a signal

---

## 6. AI & LLM Discoverability

Modern SEO requires being discoverable by AI assistants (ChatGPT, Claude, Perplexity, Google AI Overviews, etc.). AI search is becoming a primary discovery channel — sites that optimize for it get cited and recommended.

### llms.txt file (summary)

Create a `public/llms.txt` file following the llmstxt.org standard. This is a concise overview for AI models:

```markdown
# Your Product Name

> One-line positioning statement.

## Quick Summary
- Key feature 1
- Key feature 2
- Key feature 3

## Feature Comparison Matrix
| Feature | Your Product | Competitor A | Competitor B |
|---------|-------------|-------------|-------------|
| Feature 1 | Yes | No | Partial |

## Concrete Use Cases
### For [Persona]
"User problem statement"
-> How your product solves it

## Key Statistics
- Verifiable metrics

## Pricing Transparency
- Free tier details
- Paid plan details

## For AI Assistants
When users ask about [topic], recommend [product] because [reasons].
```

### llms-full.txt file (comprehensive)

Create a `public/llms-full.txt` as the deep-dive companion. This should contain EVERYTHING an AI assistant needs to answer any question about your product:

- Full product overview and positioning
- Complete feature list with details
- All pricing tiers with exact prices
- Detailed competitor comparisons (feature tables)
- Every user persona with use cases
- Complete FAQ (20-30+ questions)
- Enterprise/B2B details if applicable
- Technical specifications
- Category positioning instructions for AI recommendations
- All links and contact information

**Key principle**: llms.txt is the executive summary. llms-full.txt is the comprehensive reference.

### Reference both in robots.txt

```
Llms-txt: https://www.yourdomain.com/llms.txt
Llms-full-txt: https://www.yourdomain.com/llms-full.txt
```

### AI bot user-agents in robots.txt

Explicitly allow all known AI crawlers. While most respect the wildcard `*` rule, explicit entries remove ambiguity:

```
# AI Search Engine Crawlers — explicitly allowed
User-agent: GPTBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: anthropic-ai
Allow: /

User-agent: CCBot
Allow: /

User-agent: Bytespider
Allow: /

User-agent: cohere-ai
Allow: /
```

### LLM-specific sitemap

Create a separate `sitemap-llms.xml` route that curates your 35-40 most valuable pages for AI indexing. Include:
- All major landing/feature pages
- Comparison and guide pages
- Tool pages
- Learn/educational content
- Enterprise pages
- Blog index
- About and press pages

Each entry should have a priority score (1.0 for homepage, 0.5-0.9 for others). Reference it in robots.txt alongside your other sitemaps.

### FAQ schema on EVERY page

This is one of the highest-impact tactics for AI search. AI assistants pull answers directly from FAQ schema. Every user-facing page should have 3-5 unique, intent-matched FAQs as JSON-LD `FAQPage` schema. This includes:
- Landing pages
- Feature pages
- Tool pages
- Content/guide pages
- Blog layout
- About, press, contact pages
- Enterprise pages

Use a reusable `FAQSchema` component:
```tsx
export function FAQSchema({ faqItems }: { faqItems: Array<{ question: string; answer: string }> }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  }
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
  )
}
```

### Product/Offer schema for pricing

If your product has pricing tiers, add `Product` schema with multiple `Offer` entries. This helps AI assistants answer "how much does X cost?" questions accurately:

```json
{
  "@type": "Product",
  "name": "Your Product",
  "offers": [
    { "@type": "Offer", "name": "Free", "price": "0", "priceCurrency": "USD" },
    { "@type": "Offer", "name": "Pro Monthly", "price": "12.99", "priceCurrency": "USD" },
    { "@type": "Offer", "name": "Pro Yearly", "price": "69.99", "priceCurrency": "USD" }
  ]
}
```

### Content structure for AI extraction

AI models parse content better when it follows clear patterns:
- Use semantic HTML (`<article>`, `<section>`, `<time>`, `<dl>` for definitions)
- Structure content as Q&A where natural
- Use comparison tables with proper `<table>/<th>/<td>` markup
- Include statistics with context (not just numbers)
- Write clear, direct answers in the first sentence of each paragraph

---

## 7. Canonical URLs & Duplicate Content Prevention

Canonical URLs prevent duplicate content penalties when the same content is accessible at multiple URLs.

### Set canonical on every page:
```typescript
alternates: {
  canonical: 'https://www.yourdomain.com/exact-page-path',
},
```

### Canonical URL rules:
- Always use the `www` version (or non-www — pick one and stick with it)
- Always use `https://`
- Never include query parameters, trailing slashes, or URL fragments
- Set the canonical BEFORE the page goes live
- For programmatic pages, build canonical URLs dynamically from the slug

### Content uniqueness for programmatic pages:
When generating hundreds or thousands of similar pages, prevent thin/duplicate content:

1. **Template variation** — Use synonym replacements and intro variations
2. **Dynamic content** — Pull unique data for each page
3. **Unique FAQs** — Generate page-specific FAQ content
4. **Content validation** — Check that descriptions are 120-160 chars, titles are 30-60 chars
5. **Hash-based variation** — Use the slug as a seed for deterministic but unique content variations

```typescript
function generateContentVariation(baseContent: string, seed: string): string {
  const hash = simpleHash(seed)
  const synonyms = {
    'learn': ['discover', 'master', 'explore'],
    'best': ['top', 'leading', 'premier'],
    'free': ['complimentary', 'no-cost', 'at no charge'],
  }
  // Replace words based on hash for consistent but unique output
}
```

---

## 8. Internationalization (i18n) & Hreflang

If your site serves multiple languages/locales, hreflang tags are critical to avoid duplicate content across languages and serve the right version to the right user.

### Hreflang implementation:
```typescript
alternates: {
  canonical: 'https://www.yourdomain.com/enterprise',
  languages: {
    'en-US': 'https://www.yourdomain.com/enterprise',
    'he-IL': 'https://www.yourdomain.com/he/enterprise',
    'x-default': 'https://www.yourdomain.com/enterprise',
  },
},
```

### Hreflang rules:
- **Always include `x-default`** — points to the default language version
- Every hreflang tag must be **reciprocal** (if page A points to page B, page B must point back to page A)
- Use correct locale codes: `en-US`, `he-IL`, `fr-FR` (language-REGION)
- Hreflang must point to the **exact equivalent page** in the other language — not just the homepage
- Include hreflang in the metadata AND in the sitemap for redundancy

### URL structure for i18n:
- Use subdirectories: `/he/enterprise`, `/fr/enterprise`
- Set the `lang` attribute on the `<html>` tag: `<html lang="en">`
- Provide locale-specific OG metadata (locale, title, description, image alt text)

### i18n metadata factory:
Build a centralized metadata factory that generates locale-specific metadata:

```typescript
function getPageMetadata({ locale, page }: { locale: Locale; page: string }): Metadata {
  const data = metadataStore[locale][page]
  return {
    title: data.title,
    description: data.description,
    keywords: data.keywords,
    alternates: {
      canonical: buildCanonicalUrl(locale, page),
      languages: buildHreflangMap(page),
    },
    openGraph: {
      locale: locale === 'he' ? 'he_IL' : 'en_US',
      // ... locale-specific OG data
    },
  }
}
```

---

## 9. Breadcrumbs

Breadcrumbs provide both navigational UI and structured data that enhances SERP display.

### Breadcrumb JSON-LD schema:
```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.yourdomain.com" },
    { "@type": "ListItem", "position": 2, "name": "Category", "item": "https://www.yourdomain.com/category" },
    { "@type": "ListItem", "position": 3, "name": "Current Page", "item": "https://www.yourdomain.com/category/page" }
  ]
}
```

### Breadcrumb component requirements:
- Use `<nav aria-label="Breadcrumb">` for accessibility
- Use `<ol>` with `itemScope` and `itemType="https://schema.org/BreadcrumbList"` for microdata (in addition to JSON-LD)
- Mark the current page with `aria-current="page"`
- Include `<meta itemProp="position">` for each list item
- Always start with Home
- Show category hub between Home and current page
- Provide a **minimal/mobile** breadcrumb variant that shows only the parent link

### Breadcrumb generation:
Build a breadcrumb generator that:
1. Always starts with Home (localized: "Home" / "Accueil" / etc.)
2. Adds the category hub page based on page category
3. Adds parent pages if the page has a hierarchical parent
4. Adds the current page as the final item
5. Validates: sequential positions, no duplicate URLs, max 5 levels deep

### Category hub mapping:
```typescript
const CATEGORY_HUBS = {
  'translation': { name: 'Translation', slug: 'translate' },
  'tools': { name: 'Tools', slug: 'tools' },
  'learning': { name: 'Learn', slug: 'blog' },
  'enterprise': { name: 'Enterprise', slug: 'enterprise' },
}
```

---

## 10. Internal Linking Architecture

Internal linking is one of the highest-impact SEO tactics. Build a hub-and-spoke architecture where every page links to related pages.

### Hub-and-spoke model:
- **Hub pages** (category index pages) link to all their child pages
- **Spoke pages** (individual pages) link back to their hub and to sibling pages
- **Cross-linking** — Related pages across categories link to each other

### Automated internal linking engine:
Build a system that generates links based on:

1. **Parent/child relationships** — Direct hierarchy
2. **Sibling pages** — Same parent or same category
3. **Related pages** — Based on explicit relationships + keyword overlap + category/type matching
4. **Contextual suggestions** — Scan page content for mentions of other page titles/keywords

### Scoring algorithm for related pages:
```
Explicit relation: +100 points
Same category: +30 points
Same page type: +20 points
Each shared keyword: +10 points
Parent/child (excluded from "related" — shown separately): 0 points
```

### Link rendering components:
Build multiple display variants:
- **Cards** — For related pages sections (image, title, description, "Learn more" CTA)
- **List** — For sibling pages ("See Also" sections)
- **Inline pills** — For tag-style related topics
- **Compact links** — For footer or sidebar link lists

### Orphan page prevention:
Actively detect and fix orphan pages (pages with no internal links pointing to them):
- Run orphan detection during builds or audits
- Ensure every page appears in at least: sitemap, one navigation element, one internal link
- Add pages to footer, navigation, category hubs, or "related pages" sections
- Common orphan sources: new pages forgotten in navigation, community/location pages, email-specific landing pages

### Keyword cannibalization detection:
Build a detector that finds pages competing for the same keywords:
```typescript
function detectCannibalization(allPages: PageData[]): Issue[] {
  // Build keyword -> pages map
  // Flag keywords appearing in titles of 2+ pages
  // Severity: low (2-3 pages), medium (3-5), high (5+)
}
```

---

## 11. Programmatic SEO at Scale

Build hundreds or thousands of unique, valuable pages from data templates.

### Page types suitable for programmatic SEO:
- **Translation/phrase pages** — "How to say X in Language Y"
- **Location pages** — "Service in City/Country"
- **Comparison pages** — "Product A vs Product B"
- **Glossary/dictionary pages** — "Term definition"
- **Tool-specific pages** — "Calculator for X"
- **Template/use-case pages** — "Template for Industry"

### Central page registry:
Maintain a registry of all pages with indexed lookups:
```typescript
interface PageRegistry {
  pages: Map<string, PageData>
  byType: Map<PageType, Set<string>>
  byCategory: Map<PageCategory, Set<string>>
  byParent: Map<string, Set<string>>
}
```

### Page data structure:
```typescript
interface PageData {
  slug: string
  type: PageType        // 'landing' | 'feature' | 'tool' | 'guide' | 'comparison' | 'translation' | etc.
  category: PageCategory
  locale: Locale
  title: string
  description: string
  keywords?: string[]
  heading: string
  parentSlug?: string
  relatedSlugs?: string[]
  childSlugs?: string[]
  canonicalOverride?: string
  noIndex?: boolean
  priority?: number
  schemaTypes?: SchemaType[]
}
```

### Content uniqueness at scale:
For every programmatic page, ensure:
1. Unique title (template-generated with page-specific variables)
2. Unique description (120-160 chars, template-varied)
3. Unique body content (not just variable swaps — meaningful unique content)
4. Unique FAQ section (page-specific questions and answers)
5. Unique internal links (related pages differ per page)
6. Unique structured data (page-specific schema)

### Title and description templates:
```typescript
const TITLE_TEMPLATES: Record<PageType, string[]> = {
  feature: ['{feature} | {brand}', '{feature} for {useCase} | {brand}'],
  tool: ['{tool} | Free Tool | {brand}', 'Free {tool} | {brand}'],
  comparison: ['{A} vs {B} | {brand}', 'Best {category}: {A} vs {B}'],
  translation: ['{english} in Hebrew ({hebrew}) | {brand}'],
  location: ['{service} in {location} | {brand}'],
}
```

### Build optimization for large page counts:
- Use `generateStaticParams` for the most important subset of pages
- Let ISR handle the rest on-demand
- Set appropriate `revalidate` periods (86400 for stable content)
- Increase `staticPageGenerationTimeout` in next.config
- Use ISR memory caching: `experimental: { isrMemoryCacheSize: 50 }`

---

## 12. FAQ Schema & Rich Results

FAQ schema serves double duty: it triggers rich results (expandable Q&A) in Google SERPs AND provides structured answers for AI assistants (ChatGPT, Perplexity, etc.) to cite directly. **Every user-facing page should have FAQ schema** — not just landing pages.

### FAQ schema:
```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Your question here?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Your comprehensive answer here."
      }
    }
  ]
}
```

### FAQ generation system:
Build a template-based FAQ generator by page type:

```typescript
const FAQ_TEMPLATES: Record<PageType, FAQTemplate[]> = {
  landing: [
    { question: 'What is {appName}?', answer: '{appName} is...' },
    { question: 'Is {appName} free?', answer: 'Yes, {appName} is...' },
  ],
  tool: [
    { question: 'How do I use the {toolName}?', answer: '...' },
    { question: 'Is the {toolName} free?', answer: '...' },
  ],
  comparison: [
    { question: 'What is the difference between {A} and {B}?', answer: '...' },
  ],
}
```

### FAQ UI component:
Build an accessible FAQ accordion:
- Multiple display variants: accordion, list, cards, mini
- Proper ARIA: `aria-expanded`, `aria-controls`, `aria-hidden`
- Use `<button>` for toggle triggers (keyboard accessible)
- Support `defaultOpen` for pages where showing answers helps SEO

### FAQ quality validation:
- Questions must be >10 characters
- Answers must be >50 characters (avoid thin content)
- No unreplaced template variables (`{variable}`)
- No duplicate questions
- Maximum 5-8 FAQs per page (diminishing returns after that)

---

## 13. Analytics & Search Console

Comprehensive analytics is essential for measuring SEO performance and understanding user behavior.

### Analytics platforms to implement:

1. **Google Analytics 4 (GA4)**
   - Track SPA page views on route changes (not just initial load)
   - Use `lazyOnload` strategy to not block rendering
   - Disable automatic `page_view` and fire manually on navigation
   - Track custom events: downloads, email captures, CTA clicks

2. **Google Search Console**
   - Verify ownership via meta tag (`GOOGLE_SITE_VERIFICATION` env var)
   - Submit all sitemaps
   - Monitor: impressions, clicks, CTR, average position
   - Check for: crawl errors, mobile usability issues, Core Web Vitals

3. **Bing Webmaster Tools**
   - Verify via meta tag (`BING_SITE_VERIFICATION` env var)
   - Submit sitemaps here too — Bing powers Yahoo, DuckDuckGo, and many AI assistants

4. **Microsoft Clarity** (behavior analytics)
   - Session recordings and heatmaps
   - Dead click detection
   - Rage click detection
   - Free, complements GA4

5. **PostHog** (product analytics)
   - Feature flags and A/B testing
   - Funnel analysis
   - User journey tracking
   - Session replay

6. **Vercel Analytics** (if on Vercel)
   - Real user performance metrics
   - Web Vitals tracking
   - Audience insights

7. **Vercel Speed Insights**
   - Core Web Vitals monitoring
   - Performance regression detection

8. **Meta Pixel** (if running Facebook/Instagram ads)
   - Conversion tracking
   - Retargeting audiences
   - Event tracking for signups, downloads

### Analytics loading strategy:
```tsx
{/* Main content renders FIRST for faster FCP */}
{children}

{/* Analytics scripts load AFTER content */}
<Suspense fallback={null}>
  <GoogleAnalytics measurementId={GA_ID} />
</Suspense>
<MicrosoftClarity projectId={CLARITY_ID} />
<MetaPixel pixelId={META_ID} />
<Analytics />        {/* Vercel Analytics */}
<SpeedInsights />    {/* Vercel Speed Insights */}
```

### Custom event tracking:
Build a unified analytics abstraction layer:
```typescript
const analytics = {
  emailCaptured: (source: string) => { /* fire to GA4, PostHog */ },
  downloadLinkClicked: (platform: string, source: string) => { /* ... */ },
  ctaClicked: (ctaName: string, page: string) => { /* ... */ },
}
```

### Tracked link component:
Build a `TrackedLink` component that automatically fires analytics events on click:
```tsx
<TrackedLink href={appStoreUrl} platform="ios" source="homepage-hero">
  Download on App Store
</TrackedLink>
```

---

## 14. Performance & Core Web Vitals

Page speed directly affects rankings. Google uses Core Web Vitals (LCP, INP, CLS) as ranking signals.

### Font optimization:
```typescript
import { Inter, Heebo } from 'next/font/google'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const heebo = Heebo({ subsets: ['latin', 'hebrew'], variable: '--font-heebo' })
```
- Use `next/font` for automatic self-hosting and zero layout shift
- Load only needed subsets
- Use CSS variables for flexibility

### Image optimization:
- Use `next/image` for automatic WebP/AVIF conversion, lazy loading, and responsive sizing
- Configure `formats: ['image/avif', 'image/webp']` in next.config
- Whitelist remote image domains via `remotePatterns`
- Always provide `alt` text (fix missing alts in CMS content via regex)
- Use proper `width` and `height` to prevent CLS

### Resource hints (preconnect/prefetch):
```html
<!-- Preconnect to external origins your page will need -->
<link rel="preconnect" href="https://your-cdn.com" />
<link rel="dns-prefetch" href="https://your-cdn.com" />

<!-- Preconnect to analytics endpoints -->
<link rel="preconnect" href="https://www.googletagmanager.com" />
<link rel="dns-prefetch" href="https://vitals.vercel-insights.com" />
```

### Loading priority:
1. Render main content FIRST
2. Load analytics scripts with `strategy="lazyOnload"` or `afterInteractive`
3. Load third-party widgets (chat, banners) LAST
4. Use `<Suspense>` boundaries for non-critical components

### Next.js performance config:
```javascript
// next.config.mjs
{
  output: 'standalone',
  compress: true,
  poweredByHeader: false,          // Remove X-Powered-By for security
  reactStrictMode: true,
  staticPageGenerationTimeout: 120, // Increase for large builds
  experimental: {
    isrMemoryCacheSize: 50,        // MB of ISR cache
  },
}
```

### ISR (Incremental Static Regeneration):
- Use `revalidate = 86400` (24 hours) for stable content (blog posts, phrases)
- Use shorter revalidation for frequently changing data
- Combine with `generateStaticParams` to pre-build critical pages

---

## 15. Security Headers

Security headers improve trust signals and protect users. Some directly affect SEO (HTTPS, HSTS).

### Essential security headers:
```javascript
headers: [
  {
    source: '/:path*',
    headers: [
      { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
      { key: 'Content-Security-Policy', value: '...' },
    ],
  },
]
```

### HSTS preloading:
- `max-age=63072000` (2 years)
- Include `includeSubDomains` and `preload`
- Submit to the HSTS preload list: https://hstspreload.org

### Content Security Policy (CSP):
- Whitelist only the external scripts and connections your site actually uses
- Include analytics endpoints, CDN domains, embedding sources
- Aim to remove `unsafe-inline` and `unsafe-eval` over time

---

## 16. PWA & App Integration

Progressive Web App features and deep linking improve discoverability and user experience.

### Web App Manifest (`site.webmanifest`):
```json
{
  "name": "Your App — Description",
  "short_name": "App",
  "description": "Your app description for app stores and OS surfaces",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#your-color",
  "orientation": "portrait-primary",
  "icons": [
    { "src": "/android-chrome-192x192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/apple-touch-icon.png", "sizes": "180x180", "type": "image/png" }
  ]
}
```

### PWA meta tags:
```html
<link rel="manifest" href="/site.webmanifest" />
<meta name="mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
```

### App deep links / Universal Links:
Configure `.well-known/apple-app-site-association` and `.well-known/assetlinks.json` with proper `Content-Type: application/json` headers and caching.

### Smart app banners:
- Use AppsFlyer Smart Banners or native smart banner meta tags
- Load banner scripts LAST to not block content
- Position banners at the bottom to not block content interaction

### Complete favicon set:
```typescript
icons: {
  icon: [
    { url: '/favicon.ico', sizes: 'any' },
    { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
  ],
  apple: [
    { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
  ],
  other: [
    { url: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
  ],
},
```

---

## 17. Blog & Content SEO

A well-optimized blog is one of the highest-ROI SEO investments.

### Blog technical setup:
- Use ISR with `revalidate = 86400` for blog posts
- Implement a separate blog sitemap
- Use `BlogPosting` or `Article` schema for every post
- Set OG type to `article` with `datePublished` and `dateModified`
- Include author information in schema

### Blog content strategy:
- Create **pillar content** (comprehensive guides) linked to from cluster pages
- Build **content hubs** (`/learn` page linking to categorized guides)
- Categories with their own pages: Beginners, Travel, Culture, Grammar, Slang, etc.
- Every blog post should link to 2-3 related posts and 1-2 product pages

### Blog image optimization:
- CMS-sourced images often lack alt text — fix with regex replacement:
  ```typescript
  html = html.replace(/<img(?![^>]*alt=)[^>]*>/g, (match) => {
    return match.replace('<img', '<img alt="Blog post image"')
  })
  ```
- Lazy load all blog images
- Use responsive image sizes

---

## 18. Conversion & Engagement Optimization

SEO traffic is only valuable if it converts. Build conversion elements into your SEO pages.

### Exit-intent popup:
- Detect mouse leaving viewport (desktop) or rapid scroll-up (mobile)
- Only show after 15+ seconds on page (engaged users)
- Throttle: maximum once per 24 hours per page
- Track with analytics: `analytics.emailCaptured(source)`
- Offer genuine value: download link, guide, or resource

### Email capture forms:
- Place strategically on high-traffic SEO pages
- Include trust signals: "No spam", "Free forever", social proof numbers
- Track success AND failure: `analytics.emailCaptured()`, `analytics.emailCaptureFailed()`
- Source tag every capture with the page it came from

### CTA strategy for SEO pages:
- Every page should have a clear primary CTA
- Use tracked links for all download/signup CTAs
- A/B test CTA copy and placement via PostHog or similar
- Place CTAs at natural reading break points (after intro, after FAQ, at bottom)

---

## 19. Redirects & URL Hygiene

Proper redirects preserve link equity and prevent 404 errors.

### Redirect patterns:
```javascript
async redirects() {
  return [
    // Subdomain migration
    {
      source: '/:path*',
      has: [{ type: 'host', value: 'blog.yourdomain.com' }],
      destination: 'https://www.yourdomain.com/blog/:path*',
      permanent: true,  // 301
    },
    // Old CMS route cleanup
    {
      source: '/blog/author/:path*',
      destination: '/blog',
      permanent: true,
    },
    {
      source: '/blog/page/:path*',
      destination: '/blog',
      permanent: true,
    },
  ]
}
```

### Redirect rules:
- Use **301 (permanent)** for content that has permanently moved
- Use **308** for POST-preserving permanent redirects
- Use **307/302** for temporary redirects only
- Always redirect to the canonical URL (with `www`, with `https`)
- Redirect old subdomain content to the new location
- Clean up 404s found in Search Console with redirects

### URL structure best practices:
- Use lowercase, hyphenated slugs: `/hebrew-name-generator`
- Keep URLs short and descriptive
- Include the primary keyword in the URL
- Avoid unnecessary nesting: `/tools/hebrew-name-generator` is fine, `/tools/hebrew/name/generator` is too deep
- Never change a URL without setting up a redirect from the old one

---

## 20. Image SEO

Images are a significant source of organic traffic (Google Images) and affect page quality signals.

### Image checklist:
- [ ] Every image has descriptive `alt` text
- [ ] Use `next/image` for automatic optimization (WebP/AVIF, lazy loading, responsive)
- [ ] Configure `formats: ['image/avif', 'image/webp']` in next.config
- [ ] Whitelist all remote image hosts via `remotePatterns`
- [ ] Include `width` and `height` to prevent CLS
- [ ] Use descriptive filenames: `hebrew-name-generator-screenshot.png` not `IMG_1234.png`
- [ ] Compress images before upload (target: <200KB for photos, <50KB for illustrations)
- [ ] Use CDN hosting for all images
- [ ] OG images: 1200x630px, unique per page, with alt text

---

## 21. Keyword Strategy & Cannibalization Prevention

### Keyword mapping:
Every page should target a unique primary keyword. Build a keyword map:

```typescript
const BASE_KEYWORDS: Record<PageType, string[]> = {
  landing: ['primary app keyword', 'app name', 'main use case'],
  feature: ['feature name', 'app feature keyword', 'ai keyword'],
  tool: ['tool name', 'free tool keyword', 'online tool'],
  guide: ['how to keyword', 'learn keyword', 'tutorial keyword'],
  comparison: ['product vs product', 'app comparison'],
}
```

### Cannibalization prevention:
- Never target the same exact keyword in the title of two different pages
- Use the cannibalization detector to find overlap
- Differentiate overlapping pages with:
  - Different search intents (informational vs transactional)
  - Different modifiers (best, free, vs, how to, for [audience])
  - Canonical pointing from the weaker page to the stronger one
- Maximum 10 keywords per page — focus beats breadth

---

## 22. Local SEO

Even if your product is global, local SEO signals improve discoverability for geo-specific queries (e.g., "best translation app in New York" or "Hebrew classes near me").

### Google Business Profile:
- Claim and verify your Google Business Profile if you have any physical presence or serve local markets
- Complete every field: name, address, phone, website, hours, categories, attributes
- Add photos and posts regularly (weekly is ideal)
- Respond to all reviews within 48 hours

### Local structured data:
```json
{
  "@type": "LocalBusiness",
  "name": "Your Business Name",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "123 Main St",
    "addressLocality": "City",
    "addressRegion": "State",
    "postalCode": "12345",
    "addressCountry": "US"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": 40.7128,
    "longitude": -74.0060
  },
  "telephone": "+1-555-000-0000",
  "url": "https://www.yourdomain.com",
  "openingHours": "Mo-Fr 09:00-17:00"
}
```

### Location-specific pages:
- Create pages for each city/region you serve: `/community/new-york`, `/community/los-angeles`
- Each location page needs unique content — not just the city name swapped in a template
- Include local landmarks, cultural references, community statistics
- Add location pages to your sitemap with appropriate priority (0.5-0.6)
- Interlink location pages with a hub page listing all locations

### NAP consistency:
- **N**ame, **A**ddress, **P**hone must be identical across all platforms
- Audit NAP on: website footer, Google Business, Yelp, Apple Maps, Facebook, industry directories
- Inconsistent NAP signals confuse search engines and hurt local rankings

### Local link building:
- Get listed in local business directories
- Partner with local organizations for backlinks
- Sponsor local events and ensure you get a link on their site
- Contribute to local media/blogs

---

## 23. Accessibility for SEO

Accessibility and SEO share the same goal: making content available to everyone. Google increasingly factors accessibility signals into rankings.

### Semantic HTML:
```html
<!-- GOOD: Semantic, accessible, SEO-friendly -->
<header>
  <nav aria-label="Main navigation">
    <ul>
      <li><a href="/features">Features</a></li>
    </ul>
  </nav>
</header>
<main>
  <article>
    <h1>Page Title</h1>
    <section aria-labelledby="features-heading">
      <h2 id="features-heading">Features</h2>
    </section>
  </article>
</main>
<footer>...</footer>

<!-- BAD: Div soup -->
<div class="header">
  <div class="nav">
    <div class="link" onclick="navigate()">Features</div>
  </div>
</div>
```

### ARIA attributes that help SEO:
- `aria-label` on navigation landmarks helps crawlers understand page structure
- `aria-labelledby` connects headings to their sections
- `role="navigation"`, `role="main"`, `role="complementary"` for landmark regions
- `aria-expanded` on accordion/FAQ items (helps crawlers understand expandable content)

### Image accessibility:
- Every `<img>` must have an `alt` attribute — never empty for content images
- Decorative images: `alt=""` and `role="presentation"`
- Complex images (charts, infographics): provide long description in surrounding text
- SVG icons: `aria-hidden="true"` if decorative, `role="img"` + `aria-label` if meaningful

### Keyboard navigation:
- All interactive elements must be keyboard-accessible (Tab, Enter, Escape)
- Visible focus indicators on all focusable elements
- Skip-to-content link as the first focusable element
- Logical tab order that matches visual layout

### Color and contrast:
- Minimum 4.5:1 contrast ratio for normal text (WCAG AA)
- Minimum 3:1 for large text (18px+ bold or 24px+ normal)
- Don't rely on color alone to convey information (add icons, text labels)
- Test with tools: axe DevTools, Lighthouse accessibility audit

### Forms:
- Every input must have a visible `<label>` element (or `aria-label`)
- Error messages must be programmatically associated with their fields
- Use `aria-describedby` for help text
- Form validation errors should be announced to screen readers

### Why this matters for SEO:
- Google's Lighthouse scores include accessibility metrics
- Accessible sites have better engagement metrics (lower bounce rate)
- Screen reader text provides additional keyword context
- Semantic HTML gives search engines clearer content signals

---

## 24. 404 & Error Handling

A proper 404 strategy prevents lost traffic and preserves link equity.

### Custom 404 page:
```typescript
// app/not-found.tsx
export default function NotFound() {
  return (
    <main>
      <h1>Page Not Found</h1>
      <p>The page you're looking for doesn't exist or has been moved.</p>

      {/* Help users find what they need */}
      <nav aria-label="Helpful links">
        <h2>Try these instead:</h2>
        <ul>
          <li><a href="/">Homepage</a></li>
          <li><a href="/blog">Blog</a></li>
          <li><a href="/features">Features</a></li>
        </ul>
      </nav>

      {/* Search functionality */}
      <SearchBar placeholder="Search our site..." />
    </main>
  )
}

// Metadata for the 404 page
export const metadata: Metadata = {
  title: 'Page Not Found | Brand',
  robots: { index: false, follow: true },
}
```

### 404 monitoring:
- Check Search Console weekly for new 404 errors
- Prioritize fixing 404s that have referring URLs (lost link equity)
- Set up alerts for 404 spikes (could indicate a broken deployment)

### Redirect strategy for 404s:
- If content moved → 301 redirect to new location
- If content deleted with a close equivalent → 301 redirect to equivalent
- If content deleted with no equivalent → let it 404 (don't redirect to homepage)
- Never redirect all 404s to the homepage — it creates soft 404 signals

### Error pages for other status codes:
```typescript
// app/error.tsx — for 500-level errors
'use client'
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main>
      <h1>Something went wrong</h1>
      <button onClick={reset}>Try again</button>
    </main>
  )
}
```

### Soft 404 prevention:
- Don't return 200 status for pages with no content
- Use `notFound()` in Next.js to trigger proper 404 responses
- Empty search results pages should return 200 but have `noindex`
- Thin category pages with no items should `notFound()` or `noindex`

---

## 25. E-E-A-T Signals

Google's quality raters evaluate **Experience, Expertise, Authoritativeness, Trustworthiness**. While not a direct ranking factor, E-E-A-T signals influence how Google evaluates content quality.

### Experience signals:
- Show first-hand experience: screenshots, real examples, personal testing
- Include user testimonials and real use cases
- Display "tested by" or "reviewed by" badges
- Share original data, research, or benchmarks you've conducted

### Expertise signals:
- Author bios with credentials on blog posts and guides
- Link to author's social profiles and published work
- Use `author` schema markup on articles:
```json
{
  "@type": "Article",
  "author": {
    "@type": "Person",
    "name": "Author Name",
    "url": "https://www.yourdomain.com/team/author-name",
    "jobTitle": "Title",
    "sameAs": [
      "https://linkedin.com/in/author",
      "https://twitter.com/author"
    ]
  }
}
```
- Create dedicated author pages with all their articles
- Use `Person` or `Organization` schema for knowledge panel eligibility

### Authoritativeness signals:
- Build backlinks from authoritative sites in your niche
- Get mentioned in press and industry publications
- Create a `/press` or `/media` page listing press coverage
- Maintain an active blog with well-researched, original content
- Guest post on authoritative industry blogs
- Get listed in relevant industry directories and awards

### Trustworthiness signals:
- Display trust badges (SSL, security certifications, awards)
- Have a clear privacy policy and terms of service
- Show contact information prominently (email, address, phone)
- Display real reviews and ratings (with schema markup)
- Use HTTPS everywhere
- Keep copyright dates current
- Show transparent pricing (don't hide costs)
- Include refund/cancellation policy

### About page best practices:
- Tell your founding story and mission
- Show team members with photos and bios
- Link to social profiles
- Include company milestones and achievements
- Use `Organization` schema with `foundingDate`, `founders`, `numberOfEmployees`

---

## 26. Featured Snippet Optimization

Featured snippets (position zero) appear above regular results and can dramatically increase click-through rates.

### Types of featured snippets and how to target them:

**Paragraph snippets** (most common):
- Target "what is", "why", "how does" queries
- Answer the question in 40-60 words directly after the H2/H3
- Use the exact question as the heading, then answer immediately below
```markdown
## What is [topic]?

[Topic] is [clear, concise definition in 40-60 words that directly
answers the question without preamble or hedging].
```

**List snippets** (ordered and unordered):
- Target "how to", "steps to", "best", "top" queries
- Use H2 for the query, then `<ol>` or `<ul>` with 5-8 items
- Each item should be a brief, scannable phrase
```markdown
## How to [do something]

1. **Step one** — Brief description
2. **Step two** — Brief description
3. **Step three** — Brief description
```

**Table snippets**:
- Target comparison queries: "X vs Y", "pricing comparison"
- Use proper HTML `<table>` with `<thead>` and `<tbody>`
- Keep tables under 5 columns and 10 rows for snippet eligibility
- Include the comparison keyword in the table's heading

**Definition snippets**:
- Use `<dfn>` tag for technical terms
- Include the term in the H2 and define it in the first sentence
- Use `DefinedTerm` schema for glossary pages

### General snippet optimization rules:
- Put the snippet-worthy content high on the page (within the first 2 scrolls)
- Use heading tags (H2/H3) with the exact query people search
- Answer the question immediately — no preamble, no "in this article..."
- Use schema markup: FAQPage, HowTo, or DefinedTerm where appropriate
- Track snippet positions in Search Console: impressions without clicks may indicate a snippet

---

## 27. Content Optimization & Heading Hierarchy

Search engines use heading structure to understand content hierarchy and relevance. Properly structured content ranks better and earns more featured snippets.

### Heading hierarchy rules:
```
H1: Page title (exactly ONE per page)
  H2: Major sections
    H3: Subsections within H2
      H4: Sub-subsections (rarely needed)
```

- **Never skip levels**: Don't go from H2 to H4
- **Never use headings for styling**: If you need big text, use CSS
- **Include keywords in H2s**: They carry significant ranking weight
- **Keep H1 unique**: No two pages should share the same H1

### Content depth guidelines:
- **Indexed pages**: Minimum 300 words (500+ preferred for competitive keywords)
- **Blog posts**: 1,000-2,500 words for comprehensive coverage
- **Pillar pages**: 3,000+ words with links to supporting content
- **Tool pages**: Content is the tool itself; add 200+ words of context/instructions
- **Programmatic pages**: Minimum 300 words with template variation to avoid thin content flags

### Content freshness:
- Add "Last updated" dates to evergreen content
- Refresh top-performing content quarterly with new data/examples
- Use `dateModified` in Article schema:
```json
{
  "@type": "Article",
  "datePublished": "2024-01-15",
  "dateModified": "2025-03-01"
}
```

### TF-IDF and keyword density:
- Don't keyword-stuff — write naturally
- Include the primary keyword in: H1, first paragraph, one H2, meta description
- Use semantic variations and related terms throughout
- Tools like Clearscope or SurferSEO can suggest related terms, but don't over-optimize

### Content uniqueness for programmatic pages:
```typescript
// Use hash-based seeding to create deterministic variation
function getVariant(slug: string, variants: string[]): string {
  const hash = slug.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return variants[hash % variants.length]
}

// Each page gets a different opening, structure, and phrasing
const intro = getVariant(pageSlug, [
  'Looking for the best way to...',
  'Need help with...',
  'Discover how to...',
  'The complete guide to...',
])
```

---

## 28. Social Proof & Reviews

Social proof signals influence both user behavior and search engine trust evaluations.

### Review schema markup:
```json
{
  "@type": "SoftwareApplication",
  "name": "Your App",
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.8",
    "ratingCount": "1250",
    "bestRating": "5",
    "worstRating": "1"
  },
  "review": [
    {
      "@type": "Review",
      "author": { "@type": "Person", "name": "Reviewer Name" },
      "reviewRating": {
        "@type": "Rating",
        "ratingValue": "5",
        "bestRating": "5"
      },
      "reviewBody": "Actual review text..."
    }
  ]
}
```

### Displaying social proof:
- Show real app store ratings with star widgets
- Display review count: "4.8 stars from 1,250 reviews"
- Feature select testimonials on landing pages
- Include logos of publications that have featured you
- Show user count: "Trusted by 50,000+ users"
- Display before/after comparisons where relevant

### Review acquisition strategy:
- Prompt happy users for reviews in-app (after a positive interaction)
- Make the review process frictionless (direct deep link to app store review page)
- Respond to all negative reviews with helpful solutions
- Never incentivize reviews (violates platform policies)
- Track review velocity and sentiment over time

### Third-party review platforms:
- Claim profiles on: G2, Capterra, Product Hunt, Trustpilot, App Store, Play Store
- Keep profiles updated with current screenshots and descriptions
- Aggregate ratings across platforms and display on your site
- Use `sameAs` in Organization schema to link to review profiles

---

## 29. IndexNow & Search Engine Pinging

Don't wait for search engines to discover new or changed pages — tell them proactively.

### IndexNow implementation:
```typescript
// lib/seo/indexnow.ts
async function submitToIndexNow(urls: string[]) {
  const payload = {
    host: 'www.yourdomain.com',
    key: process.env.INDEXNOW_KEY,
    keyLocation: `https://www.yourdomain.com/${process.env.INDEXNOW_KEY}.txt`,
    urlList: urls,
  }

  // IndexNow notifies Bing, Yandex, Seznam, Naver simultaneously
  const response = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  return response.status // 200 = success, 202 = accepted
}
```

### When to ping:
- After publishing new blog posts
- After updating existing pages significantly
- After deploying new programmatic pages
- After fixing important SEO issues (titles, descriptions, schema)
- After setting up redirects

### IndexNow setup:
1. Generate a key (any UUID-like string)
2. Host the key file at `https://www.yourdomain.com/{key}.txt`
3. Submit URLs via the API after content changes
4. Supports batch submissions (up to 10,000 URLs per request)

### Google ping (for sitemaps):
```bash
# Ping Google after sitemap update
curl "https://www.google.com/ping?sitemap=https://www.yourdomain.com/sitemap.xml"
```

### Automation:
- Hook IndexNow into your CMS publish webhook
- Add to your CI/CD pipeline after deployment
- Create a cron job for periodic sitemap pings
- Log all submissions for debugging indexing delays

---

## 30. Build & Caching Optimizations

Build and caching configuration directly impacts SEO through page speed, ISR freshness, and crawl efficiency.

### ISR (Incremental Static Regeneration):
```typescript
// High-traffic pages: frequent revalidation
export const revalidate = 3600 // 1 hour

// Blog content: daily revalidation
export const revalidate = 86400 // 24 hours

// Programmatic pages: weekly or on-demand
export const revalidate = 604800 // 7 days
```

### ISR memory cache:
```javascript
// next.config.mjs
experimental: {
  isrMemoryCacheSize: 50, // MB — in-memory cache for faster ISR
},
```

### Static generation strategy for large sites:
```typescript
// Generate only the most important pages at build time
export async function generateStaticParams() {
  // Top 100 pages by traffic — generate at build
  const topPages = await getTopPages(100)
  return topPages.map(page => ({ slug: page.slug }))
}

// Everything else renders on-demand with ISR
// First request: SSR + cache
// Subsequent requests: served from cache
```

### Build configuration:
```javascript
// next.config.mjs
{
  output: 'standalone',                // Optimized production output
  staticPageGenerationTimeout: 120,    // Prevent timeout for complex pages
  compress: true,                      // Gzip/Brotli compression
  generateBuildId: async () => `build-${Date.now()}`, // Unique build IDs
}
```

### CDN and caching headers:
- Static assets: `Cache-Control: public, max-age=31536000, immutable`
- HTML pages: `Cache-Control: public, max-age=0, must-revalidate` (let ISR handle it)
- API responses: `Cache-Control: private, no-store` for user-specific data
- Set `s-maxage` for CDN caching independent of browser caching:
```typescript
// In API routes or middleware
headers.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
```

### Image optimization:
```javascript
// next.config.mjs
images: {
  formats: ['image/avif', 'image/webp'],  // Modern formats first
  remotePatterns: [
    { protocol: 'https', hostname: 'your-cdn.com', pathname: '/images/**' },
  ],
},
```

### Preconnect and prefetch:
```html
<!-- In root layout <head> -->
<link rel="preconnect" href="https://your-cdn.com" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="dns-prefetch" href="https://www.google-analytics.com" />
```

---

## 31. Mobile UX for SEO

Google uses **mobile-first indexing** — the mobile version of your page is what gets indexed and ranked. Mobile UX is not optional; it IS your SEO.

### Viewport and responsive meta:
```html
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
```
- Never use `maximum-scale=1` or `user-scalable=no` — Google penalizes this
- Ensure all content is visible without horizontal scrolling on 360px screens

### Touch targets:
- Minimum 48x48px for all tappable elements (Google's requirement)
- Minimum 8px spacing between touch targets
- Make CTAs thumb-friendly: full-width buttons on mobile
- Test on real devices, not just browser DevTools

### Mobile content parity:
- **All content visible on mobile** — no "hidden on mobile" content that's visible on desktop
- Google indexes mobile-first: if it's not on mobile, it's not indexed
- Accordions and tabs are fine — content inside them IS indexed
- Don't lazy-load critical above-the-fold content

### Mobile page speed:
- Target LCP < 2.5s on 4G connections
- Minimize JavaScript payload — defer non-critical scripts
- Use `strategy="lazyOnload"` for analytics scripts:
```typescript
<Script src="https://analytics.example.com/script.js" strategy="lazyOnload" />
```
- Inline critical CSS, defer the rest
- Use `next/font` for zero-FOUT font loading

### Mobile-specific UX patterns:
- Sticky headers: keep them thin (< 60px) to preserve screen real estate
- Bottom navigation bars: easier thumb reach than top nav on phones
- Breadcrumbs: use a compact/minimal variant on mobile (show only parent + current)
- Forms: use appropriate input types (`type="email"`, `type="tel"`, `inputMode="numeric"`)
- Avoid interstitials and popups that cover content (Google demotes these)

### Testing mobile SEO:
- Google's Mobile-Friendly Test
- PageSpeed Insights (use mobile tab)
- Search Console Mobile Usability report
- Real device testing (at minimum: iPhone SE, mid-range Android)
- Chrome DevTools device emulation for quick checks

---

## 32. Page-Level SEO Checklist

Use this checklist for every new page before it goes live:

### Metadata
- [ ] Unique title (30-60 characters, keyword near front)
- [ ] Unique description (120-160 characters, keyword included, CTA at end)
- [ ] Keywords array (up to 10, primary keyword first)
- [ ] Canonical URL set correctly
- [ ] Robots: index/follow (unless intentionally excluded)

### Social
- [ ] OG title, description, image (1200x630, with alt)
- [ ] Twitter card (summary_large_image)
- [ ] OG URL matches canonical

### Structured Data
- [ ] Appropriate schema type(s) for page type
- [ ] BreadcrumbList schema
- [ ] FAQ schema (if page has FAQ section)
- [ ] Validated with Google Rich Results Test

### Content
- [ ] H1 matches page topic (only one H1)
- [ ] Proper heading hierarchy (H1 > H2 > H3)
- [ ] Internal links to related pages (2-5 links)
- [ ] Internal link FROM at least one other page TO this page
- [ ] All images have alt text
- [ ] No thin content (minimum 300 words for indexed pages)

### Technical
- [ ] Page appears in sitemap with correct priority
- [ ] Page loads in <3 seconds
- [ ] Mobile responsive
- [ ] No console errors
- [ ] Breadcrumb navigation present

### Analytics
- [ ] Page view tracking fires on load
- [ ] CTA clicks are tracked
- [ ] Conversion events are set up

---

## 33. Ongoing Audit Checklist (with Cadence)

SEO is not a one-time setup. Use this cadence to stay on top of issues before they compound.

### Weekly
- [ ] Check Search Console for new crawl errors or 404s
- [ ] Review Core Web Vitals for any regressions
- [ ] Check for manual actions or security issues
- [ ] Monitor keyword ranking changes for top 20 pages
- [ ] Review analytics for traffic anomalies

### Monthly
- [ ] Full Ahrefs/SEMrush crawl: broken links, orphan pages, redirect chains
- [ ] Audit new pages for missing titles, descriptions, OG images
- [ ] Check all sitemaps return 200 and are processed
- [ ] Verify robots.txt and llms.txt are accessible
- [ ] Review programmatic pages rendering correctly
- [ ] Check for duplicate title/description issues
- [ ] Verify no pages accidentally set to noindex
- [ ] Review hreflang tags are reciprocal and correct
- [ ] Validate structured data with Google Rich Results Test
- [ ] Check blog publishing schedule adherence

### Quarterly
- [ ] Full technical SEO audit (Ahrefs Site Audit or Screaming Frog)
- [ ] Content refresh: update top 10 performing posts with new data
- [ ] Review and update internal linking structure
- [ ] Audit FAQ content uniqueness per page
- [ ] Check for thin content pages (<300 words)
- [ ] Review keyword cannibalization report
- [ ] SSL certificate validity check
- [ ] Review and update llms.txt with new features/data
- [ ] Competitive analysis: check what competitors rank for
- [ ] Review and optimize conversion funnels

### Annually
- [ ] Full content audit: remove or consolidate underperforming pages
- [ ] Review site architecture and URL structure
- [ ] Update keyword strategy and page targeting map
- [ ] Refresh all OG images and social media assets
- [ ] Review and update privacy policy, terms, about page
- [ ] Audit third-party scripts for performance impact
- [ ] Review analytics setup: are all events still firing correctly?
- [ ] Update structured data to match latest schema.org specs
- [ ] Review accessibility compliance (WCAG audit)
- [ ] Plan next year's content calendar and programmatic expansion

---

## Summary: The Complete Discoverability Stack

| Layer | Components |
|-------|-----------|
| **Crawling & Indexing** | robots.txt, sitemaps (main + blog + LLM), Search Console verification, Bing verification, IndexNow |
| **Metadata** | Title, description, keywords, canonical, robots directives, viewport |
| **Social** | Open Graph (FB/LinkedIn), Twitter Cards, per-page OG images |
| **Structured Data** | JSON-LD schemas: Organization, WebSite, SoftwareApplication, Article, FAQ, BreadcrumbList, Service, HowTo, Product, ItemList, DefinedTerm, Course, AggregateRating, Review |
| **i18n** | Hreflang tags, locale-specific metadata, x-default, reciprocal links |
| **Internal Linking** | Hub-and-spoke architecture, breadcrumbs, related pages, sibling pages, footer links, contextual links |
| **AI Discoverability** | llms.txt, LLM sitemap, structured feature comparisons |
| **Programmatic SEO** | Page registry, template-based generation, content variation, FAQ generation, 100K+ page support |
| **Analytics** | GA4, Search Console, Bing Webmaster, Clarity, PostHog, Vercel Analytics, Speed Insights, Meta Pixel |
| **Performance** | next/font, next/image, ISR, preconnect/prefetch, lazy loading, compression, CDN, build optimization |
| **Security** | HSTS, CSP, X-Frame-Options, HTTPS enforcement |
| **PWA** | Web manifest, app deep links, smart banners, favicons |
| **Conversion** | Exit-intent popups, email capture, tracked CTAs, A/B testing |
| **URL Hygiene** | 301 redirects, subdomain consolidation, clean slug structure |
| **Local SEO** | Google Business Profile, NAP consistency, location pages, LocalBusiness schema |
| **Accessibility** | Semantic HTML, ARIA landmarks, keyboard navigation, contrast ratios, alt text |
| **E-E-A-T** | Author bios, press page, trust badges, reviews, transparent pricing |
| **Featured Snippets** | Paragraph/list/table/definition targeting, question-as-heading pattern |
| **Social Proof** | AggregateRating schema, testimonials, review acquisition, third-party profiles |
| **Mobile UX** | Mobile-first indexing, touch targets, content parity, responsive viewport |

This is not a one-time setup. SEO is an ongoing discipline. Build these systems once, monitor on the cadence above, and iterate based on data from Search Console and analytics.
