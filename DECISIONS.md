# Decisions

## Confirmed Project Decisions

1. Project folder name: `contract-finder`
2. Database: MySQL
3. Initial Phase output: logs only
4. Initial Phase scheduler: local script
5. Primary data source: Adzuna

## Phase 0 Auth Decision

Recommended approach for Phase 0:

1. Use `Auth.js` with a credentials-based login flow.
2. Store users, sessions, and related auth data in MySQL.
3. Use hashed passwords only.
4. Keep auth simple in Phase 0:
   - sign up
   - sign in
   - sign out
   - protected routes

## Why This Auth Choice

1. It stays aligned with the MySQL decision.
2. It avoids introducing another hosted auth dependency before the product is validated.
3. It supports the narrow Phase 0 scope without adding email-provider or social-login complexity.

## Deferred Decisions

1. Social login support
2. Password reset flow
3. Email verification
4. Production scheduler location beyond the local spike
5. ORM choice if one is needed during implementation
