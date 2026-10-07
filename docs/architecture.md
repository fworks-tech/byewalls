# Byewalls Architecture

## Goal

Byewalls processes public URLs, extracts the main content, and optionally generates summaries using artificial intelligence.

The system must not bypass:

- Authentication.
- Paid paywalls.
- CAPTCHAs.
- Technical access controls.
- Contractual restrictions.
- Security mechanisms intended to prevent unauthorized access.

---

## System Components

```text
┌──────────────┐
│ Web Client   │
└──────┬───────┘
       │
       v
┌──────────────┐
│ API          │
└──────┬───────┘
       │
       ├── URL Validator
       ├── Abuse Protection
       ├── Content Fetcher
       ├── Content Extractor
       ├── HTML Sanitizer
       ├── AI Provider
       ├── Share Service
       ├── Archive Service
       └── Observability
```

---

## Processing Flow

```text
User submits a URL
        |
        v
Validate the URL
        |
        v
Apply SSRF protection
        |
        v
Fetch public content
        |
        v
Extract the main content
        |
        v
Sanitize the content
        |
        v
Generate an optional summary
        |
        v
Create a temporary result
        |
        v
Share the result
```

---

## Modules

### Web Client

Responsibilities:

- URL submission form.
- Processing state.
- Content display.
- Summary display.
- Temporary link generation.
- Sharing actions.
- Error messages.

### API

Responsibilities:

- Validate requests.
- Apply authentication in future releases.
- Process URLs.
- Enforce limits.
- Create temporary links.
- Integrate with external services.

### Content Fetcher

Responsibilities:

- Make HTTP requests.
- Apply request timeouts.
- Follow safe redirects.
- Limit response size.
- Validate `Content-Type`.
- Block internal destinations.

### Content Extractor

Responsibilities:

- Extract the page title.
- Extract the main content.
- Extract the author when available.
- Extract the publication date when available.
- Remove irrelevant elements.

### AI Provider

Planned providers:

- Configurable remote provider.
- Ollama.
- OpenCode.

Interface:

```ts
interface AIProvider {
  summarize(input: {
    title?: string;
    content: string;
  }): Promise<{
    text: string;
    inputTokens?: number;
    outputTokens?: number;
  }>;
}
```

### Share Service

Responsibilities:

- Create temporary links.
- Validate tokens.
- Revoke links.
- Enforce expiration.
- Track aggregate sharing metrics.

### Archive Service

Responsibilities:

- Query historical references.
- Normalize external responses.
- Apply timeouts.
- Respect provider limits.

---

## Suggested Repository Structure

```text
apps/
  web/
  api/

packages/
  types/
  config/
  security/
  content-extraction/
  ai/
  sharing/
  archive/
  observability/

docs/
  architecture.md
  integrations.md
  sharing.md
  tasks.md
```

---

## Initial Stack

- TypeScript.
- Node.js.
- React.
- Next.js.
- Zod.
- PostgreSQL.
- Redis.
- Vitest.
- Playwright.
- Docker.
- Structured logging.

---

## Persistence

### PostgreSQL

Use PostgreSQL for:

- Share links.
- Persistent results, when required.
- Audit records.
- User configuration.
- Aggregate metrics.

### Redis

Use Redis for:

- Caching.
- Rate limiting.
- Distributed locks.
- Temporary state.
- Background job coordination.

---

## Non-Functional Requirements

- Apply timeouts to external services.
- Make scheduled jobs idempotent.
- Apply rate limiting.
- Provide structured observability.
- Sanitize HTML before rendering.
- Protect against SSRF.
- Delete expired data automatically.
- Separate public content from internal data.
- Prevent external service failures from taking down the whole application.