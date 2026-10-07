# Integrations

## Goal

Byewalls allows users to share temporary results generated from public URL processing through:

- Temporary Byewalls links
- WhatsApp
- X
- Web Share API
- Internet Archive / Wayback Machine references

Integrations must only share content processed by Byewalls. They must not be used to bypass authentication, paid paywalls, CAPTCHAs, or other access controls.

---

## Architecture

```text
Byewalls Web
    |
    v
Share API
    |
    +── Temporary Link Service
    +── WhatsApp Sharing
    +── X Sharing
    +── Archive Provider
    +── Web Share API
```

External integrations should be isolated behind independent providers or adapters.

```ts
interface ShareProvider {
  name: string;

  createShareUrl(input: {
    resultUrl: string;
    title?: string;
    text?: string;
  }): Promise<string>;
}
```

---

## Temporary Byewalls Links

Temporary links are the primary sharing mechanism.

The user can generate a public link to view a processed result.

### Requirements

- Use cryptographically secure random tokens.
- Tokens must not be predictable.
- Tokens must not contain the original URL.
- Tokens must not contain personal information.
- Apply a mandatory expiration time.
- Allow manual revocation.
- Apply rate limiting.
- Do not index links in search engines.
- Display the original source URL.
- Remove expired data automatically.

Example:

```text
https://byewalls.app/share/<token>
```

---

## WhatsApp

The initial WhatsApp integration should share a temporary Byewalls link.

### Suggested flow

1. Byewalls generates a temporary link.
2. The user selects WhatsApp.
3. WhatsApp opens with a pre-filled message.
4. The user selects the recipient and confirms the message.

Suggested message:

```text
Check out this content processed by Byewalls:

{{title}}

{{temporary_link}}
```

### MVP limitations

- Do not send messages automatically.
- Do not store contacts or phone numbers.
- Do not store private messages.
- Do not use user credentials.
- Do not support bulk messaging.

A future WhatsApp Business Platform integration must include explicit opt-in, approved templates, abuse controls, delivery limits, and secure webhooks.

---

## X

The initial X integration should use link sharing instead of automatic publishing.

Suggested message:

```text
{{title}}

Read the temporary result:
{{temporary_link}}
```

### Requirements

- The user must confirm the share action.
- Byewalls must not publish automatically.
- Do not store access tokens unless required.
- Use the minimum OAuth scopes for future authenticated integrations.
- Allow users to revoke access.
- Apply publishing rate limits.
- Show the content before publishing.

---

## Internet Archive

The Internet Archive, including the Wayback Machine, may be used as an optional historical reference provider.

### Suggested flow

1. The user submits a public URL.
2. Byewalls processes the URL.
3. The user requests historical references.
4. Byewalls queries the archive provider.
5. Available snapshots are displayed.
6. The user opens a selected archived URL.

### MVP limitations

- Do not archive pages automatically.
- Do not archive protected or private content.
- Do not perform bulk crawling.
- Do not store archived content indefinitely.
- Clearly identify external archived content.
- Do not use the integration to bypass access controls.

### Provider interface

```ts
interface ArchiveProvider {
  findSnapshots(input: {
    url: string;
    from?: Date;
    to?: Date;
  }): Promise<Snapshot[]>;
}

type Snapshot = {
  timestamp: string;
  archivedUrl: string;
  status: number;
};
```

The provider must handle:

- Invalid URLs.
- No snapshots found.
- Provider unavailability.
- Request timeouts.
- Rate limits.
- Incomplete responses.

---

## Web Share API

When available, the browser should use the Web Share API.

```ts
await navigator.share({
  title,
  text,
  url: temporaryLink,
});
```

Fallback actions:

- Copy the link.
- Open WhatsApp.
- Open X.
- Display a confirmation message.

---

## Implementation Order

1. Temporary links.
2. Copy link.
3. Web Share API.
4. WhatsApp sharing.
5. X sharing.
6. Internet Archive snapshot lookup.
7. Optional authenticated integrations.

---

## Security Requirements

- Use secure random tokens.
- Store only token hashes.
- Require link expiration.
- Support link revocation.
- Apply rate limiting.
- Protect against token enumeration.
- Set `X-Robots-Tag: noindex, nofollow, noarchive`.
- Sanitize all rendered HTML.
- Avoid storing sensitive data in logs.
- Delete expired data automatically.