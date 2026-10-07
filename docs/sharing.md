# Sharing Results

## Goal

Byewalls provides a secure and temporary way to share the result of a processed public URL.

A shared link must not provide access to:

- Credentials.
- Cookies.
- Private headers.
- Authentication tokens.
- Private content.
- Protected resources.
- Internal application data.

---

## Data Model

```ts
type SharedResult = {
  id: string;
  tokenHash: string;
  resultId: string;
  expiresAt: Date;
  revokedAt?: Date;
  createdAt: Date;
  viewCount: number;
  maxViews?: number;
};
```

The original token must never be stored in plain text.

---

## Create a Share Link

### Endpoint

```http
POST /api/share
```

### Request

```json
{
  "resultId": "result_123",
  "expiresIn": 86400
}
```

### Response

```json
{
  "shareUrl": "https://byewalls.app/share/token",
  "expiresAt": "2026-10-07T20:00:00.000Z"
}
```

---

## Expiration

A link is invalid when:

- The token is not found.
- The link has expired.
- The link has been revoked.
- The maximum view count has been reached.
- The original result has been deleted.

Expected response:

```json
{
  "code": "SHARE_LINK_UNAVAILABLE",
  "message": "This link is no longer available."
}
```

---

## Recommended Durations

- Default: 24 hours.
- Minimum: 10 minutes.
- Maximum: 7 days.

Users should be able to revoke a link before it expires.

---

## Public Share Page

The public page should display:

- Content title.
- Original source URL.
- Processing date.
- Extracted content.
- Optional summary.
- Expiration date.
- Notice that the content was processed by Byewalls.

The page must not display:

- Cookies.
- Authentication headers.
- Tokens.
- Internal IDs.
- Credentials.
- Data belonging to other users.
- Unauthorized content.

---

## Routes

```text
POST   /api/share
GET    /api/share/:token
DELETE /api/share/:shareId
GET    /share/:token
```

---

## Recommended Headers

```http
Cache-Control: private, max-age=300
X-Robots-Tag: noindex, nofollow, noarchive
Content-Security-Policy: default-src 'self'
Referrer-Policy: no-referrer
X-Content-Type-Options: nosniff
```

---

## Abuse Protection

Apply limits to:

- Share links created per IP.
- Share links created per user.
- Views per minute.
- Requests for the same source URL.
- Invalid token attempts.
- Repeated sharing actions.

Abuse events should be logged without storing unnecessary content.

---

## Automatic Cleanup

A scheduled job must:

1. Find expired share links.
2. Delete token hashes.
3. Delete associated results when allowed.
4. Clear related cache entries.
5. Record the number of deleted items.

The cleanup job must be idempotent.