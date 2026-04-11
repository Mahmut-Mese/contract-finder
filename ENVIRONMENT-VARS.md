# Environment Variables

These are the planned environment variables for Contract Finder.

## Initial Phase

```env
ADZUNA_APP_ID=
ADZUNA_APP_KEY=
MYSQL_HOST=
MYSQL_PORT=3306
MYSQL_DATABASE=
MYSQL_USER=
MYSQL_PASSWORD=
LOG_LEVEL=info
```

## Phase 0 Additions

```env
AUTH_SECRET=
NEXTAUTH_URL=
```

## Notes

1. Do not commit real credentials to the repository.
2. Use `.env.local` for local development secrets.
3. Use provider-managed environment variables in hosting for deployment.
