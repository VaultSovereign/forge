## Summary

- What changed and why (1–3 lines max).

## Linked Issues

- Closes #<issue-id>

## Validation

- [ ] Ran `pnpm install --frozen-lockfile`
- [ ] Ran `pnpm run build`
- [ ] Ran tests locally: `pnpm test` (attach snippet if behavior changed)
- [ ] For security scans without providers, set `FORGE_SKIP_REMOTE_SCANS=1` and ran `make forge-prepush`

## Screenshots / CLI Output (if behavior changed)

```
<paste relevant CLI output>
```

## Risk / Rollback

- Risk level: low / medium / high
- Rollback plan: revert commit or disable feature flag

## Schema / Contract Updates

- [ ] Updated `schemas/` and validators (if necessary)
- [ ] Synchronized dispatcher and doctor checks

