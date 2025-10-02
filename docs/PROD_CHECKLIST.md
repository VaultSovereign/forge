# Production Checklist (Placeholder)

Minimum gates to pass before promoting to production:

- [ ] CI green on `main`
- [ ] Smoke tests passing
- [ ] Docs link check passing
- [ ] Image published to GHCR with semantic tag
- [ ] Verify GHCR image builds (see [Docker (GHCR)](../README.md#-docker-ghcr)).
- [ ] Confirm GitHub Release notes were generated correctly from CHANGELOG.
- [ ] Rollback plan documented
- [ ] Security review complete (see SECURITY.md)
