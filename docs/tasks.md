# Byewalls Tasks

## Phase 1 — Foundation

- [ ] Create the project structure.
- [ ] Configure TypeScript.
- [ ] Configure linting and formatting.
- [ ] Configure unit tests.
- [ ] Configure end-to-end tests.
- [ ] Create the CI pipeline.
- [ ] Configure environment variables.
- [ ] Define the API error format.
- [ ] Add structured logging.

---

## Phase 2 — URL Processing

- [ ] Create the URL analysis endpoint.
- [ ] Allow only HTTP and HTTPS protocols.
- [ ] Block localhost.
- [ ] Block private IP ranges.
- [ ] Block cloud metadata endpoints.
- [ ] Implement request timeouts.
- [ ] Limit response size.
- [ ] Validate the response content type.
- [ ] Control redirects.
- [ ] Add SSRF security tests.
- [ ] Add invalid URL tests.

---

## Phase 3 — Content Extraction

- [ ] Implement the content fetcher.
- [ ] Implement main content extraction.
- [ ] Extract the page title.
- [ ] Extract the author when available.
- [ ] Extract the publication date when available.
- [ ] Sanitize HTML.
- [ ] Remove scripts.
- [ ] Remove iframes.
- [ ] Remove dangerous elements.
- [ ] Create HTML fixtures.
- [ ] Add a fallback for pages without extractable content.

---

## Phase 4 — Artificial Intelligence

- [x] Create the `AIProvider` interface.
- [x] Create a configurable remote provider.
- [x] Create the Ollama adapter.
- [x] Create the OpenCode adapter.
- [x] Create the summary prompt.
- [x] Limit input and output tokens.
- [x] Handle provider timeouts.
- [x] Handle provider unavailability.
- [ ] Cache summary responses (requires Redis).
- [ ] Record aggregate usage metrics (requires Redis).

---

## Phase 5 — Temporary Links

- [ ] Create the sharing data model.
- [ ] Generate secure tokens.
- [ ] Store only token hashes.
- [ ] Create the link creation endpoint.
- [ ] Create the link lookup endpoint.
- [ ] Create the link revocation endpoint.
- [ ] Implement link expiration.
- [ ] Implement view limits.
- [ ] Add security headers.
- [ ] Create the public share page.
- [ ] Create the cleanup job.

---

## Phase 6 — Sharing

- [ ] Add a copy-link button.
- [ ] Implement the Web Share API.
- [ ] Add WhatsApp sharing.
- [ ] Add X sharing.
- [ ] Add a desktop fallback.
- [ ] Display a confirmation before sharing.
- [ ] Record aggregate sharing events.
- [ ] Do not store contacts or private messages.

---

## Phase 7 — Internet Archive

- [ ] Create the `ArchiveProvider` interface.
- [ ] Implement historical snapshot lookup.
- [ ] Add request timeouts.
- [ ] Add rate limiting.
- [ ] Normalize snapshot responses.
- [ ] Display the external source clearly.
- [ ] Handle empty results.
- [ ] Add tests with mocked responses.
- [ ] Do not automatically archive pages in the MVP.

---

## Phase 8 — Security and Abuse Prevention

- [ ] Implement IP-based rate limiting.
- [ ] Implement user-based rate limiting.
- [ ] Detect excessive share-link creation.
- [ ] Detect token enumeration attempts.
- [ ] Add XSS protection.
- [ ] Add a Content Security Policy.
- [ ] Delete expired data.
- [ ] Add audit logs.
- [ ] Review personal data exposure.
- [ ] Document the acceptable-use policy.

---

## Phase 9 — Quality

- [ ] Add unit tests.
- [ ] Add integration tests.
- [ ] Add end-to-end tests.
- [ ] Add security tests.
- [ ] Test link expiration.
- [ ] Test link revocation.
- [ ] Test rate limiting.
- [ ] Test external provider failures.
- [ ] Run controlled load tests.
- [ ] Review the final documentation.

---

## MVP Acceptance Criteria

- [ ] Users can process a public URL.
- [ ] Private and internal URLs are rejected.
- [ ] Content is sanitized before rendering.
- [ ] Users can generate temporary links.
- [ ] Temporary links expire correctly.
- [ ] Temporary links can be revoked.
- [ ] Links can be copied.
- [ ] Links can be shared through WhatsApp.
- [ ] Links can be shared through X.
- [ ] The system can query Internet Archive references.
- [ ] External failures do not expose internal data.
- [ ] Security tests cover the main risks.