# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

**Do not report security vulnerabilities through public GitHub issues.**

Instead, please report security vulnerabilities to: security@vaultmesh.io

Please include:
- Type of issue (e.g. buffer overflow, SQL injection, cross-site scripting, etc.)
- Full paths of source file(s) related to the manifestation of the issue
- The location of the affected source code (tag/branch/commit or direct URL)
- Any special configuration required to reproduce the issue
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit the issue

## Security Measures

### Environment Variables
- API keys stored in `.env` files only
- No secrets in configuration files or code
- Environment variables validated at startup

### Dependencies
- Regular `npm audit` checks
- Pinned dependency versions
- Supply chain integrity monitoring

### Template Safety
- Schema validation on all inputs/outputs
- Guardrails enforcement before LLM execution
- Read-only operation defaults
- Audit trail for all template executions

### Reality Ledger
- Content-addressed storage with SHA-256 hashes
- Optional cryptographic signatures (ed25519)
- Immutable event log with verification capabilities
- No sensitive data logging (configurable redaction)

## Development Security

### Code Review
- All changes require code review
- Security-sensitive areas require additional review
- Automated security scanning in CI/CD

### Testing
- Security test cases in test suite
- Fuzzing for input validation
- Property-based testing for cryptographic functions