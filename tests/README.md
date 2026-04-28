# KinCircle Test Infrastructure

This test infrastructure provides comprehensive testing capabilities for KinCircle using Vitest for unit/integration tests and Playwright for E2E tests.

## Quick Start

### Start Test Database
```bash
npm run test:db:start
```

### Run Unit/Integration Tests
```bash
npm test              # Run all tests once
npm run test:watch    # Watch mode
npm run test:coverage # With coverage report
```

### Run E2E Tests
```bash
npm run test:e2e      # Run all E2E tests
npm run test:e2e:ui   # Run with Playwright UI
```

### Stop Test Database
```bash
npm run test:db:stop
```

## Architecture

### Database Setup
- **Docker Compose**: Runs PostgreSQL 16 on port 5433 with tmpfs for speed
- **Connection**: `postgresql://test:test@localhost:5433/kincircle_test`
- **Reset Strategy**: Truncates all tables between test files
- **Migrations**: Automatically applied during Playwright global setup

### Test Helpers

#### Auth Helpers (`tests/helpers/auth.ts`)
```typescript
import { createTestUser, createTestSession, getAuthCookies, createAuthenticatedUser } from '@/tests/helpers/auth';

// Create a user
const user = await createTestUser({ name: "Alice" });

// Create a session
const session = await createTestSession(user.id);

// Get cookies for Playwright
const cookies = getAuthCookies(session.token);

// Or create everything at once
const { user, session, cookies } = await createAuthenticatedUser();
```

#### Fixture Helpers (`tests/helpers/fixtures.ts`)
```typescript
import {
  createTestReunion,
  createTestHousehold,
  createTestInvite,
  createTestDateOption,
  createTestHouseholdMember,
  createTestDateVote,
  createTestReunionUpdate,
} from '@/tests/helpers/fixtures';

// Create test data
const reunion = await createTestReunion(userId, { name: "Summer 2026" });
const household = await createTestHousehold(reunion.id, { city: "Austin", state: "TX" });
const { invite, token } = await createTestInvite(reunion.id, "guest@example.com");
const dateOption = await createTestDateOption(reunion.id);
```

#### Database Helpers (`tests/setup/db.ts`)
```typescript
import { getTestDb, resetTestDb, closeTestDb } from '@/tests/setup/db';

// Use in E2E tests
const db = getTestDb();
await resetTestDb(); // Clean slate between tests
await closeTestDb(); // Cleanup after all tests
```

## External Service Mocking

### Email (src/lib/email.ts)
Emails are stubbed in test mode and logged to console:
```
[test-email] Magic link login -> user@example.com
```

### Geocoding (src/lib/geocode.ts)
Geocoding returns deterministic fixtures based on city/state/zip hash:
```typescript
// Austin, TX -> consistent lat/lng every time
const result = await geocodeAddress("Austin", "TX", "78701");
// { lat: 30.267, lng: -97.743, placeName: "Austin, TX 78701" }
```

## Environment Variables

The following are set automatically in test mode:

```bash
NODE_ENV=test
KINCIRCLE_TEST_MODE=1
DATABASE_URL=postgresql://test:test@localhost:5433/kincircle_test
BETTER_AUTH_SECRET=test-secret-key-for-better-auth-minimum-32-characters
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## File Structure

```
tests/
├── e2e/                          # Playwright E2E tests
│   ├── auth.spec.ts
│   ├── create-reunion.spec.ts
│   ├── date-voting.spec.ts
│   ├── finalize.spec.ts
│   └── invite-rsvp.spec.ts
├── helpers/                      # Test utilities
│   ├── auth.ts                   # User/session creation, cookies
│   └── fixtures.ts               # Domain model factories
├── setup/                        # Test configuration
│   ├── db.ts                     # Test DB connection & reset
│   ├── global-setup.ts           # Playwright: start DB, run migrations
│   ├── global-teardown.ts        # Playwright: stop DB
│   └── vitest-setup.ts           # Vitest: mocks, env vars
└── README.md                     # This file
```

## Configuration Files

- `docker-compose.test.yml` - Test database definition
- `playwright.config.ts` - E2E test configuration
- `vitest.config.ts` - Unit test configuration

## Writing Tests

### Unit Test Example
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { getTestDb, resetTestDb } from '@/tests/setup/db';
import { createTestUser } from '@/tests/helpers/auth';

describe('User operations', () => {
  beforeEach(async () => {
    await resetTestDb();
  });

  it('creates a user', async () => {
    const user = await createTestUser({ name: 'Alice' });
    expect(user.name).toBe('Alice');
  });
});
```

### E2E Test Example
```typescript
import { test, expect } from '@playwright/test';
import { resetTestDb } from '../setup/db';
import { createAuthenticatedUser } from '../helpers/auth';

test.beforeEach(async () => {
  await resetTestDb();
});

test('user can create reunion', async ({ page, context }) => {
  const { user, cookies } = await createAuthenticatedUser();

  // Set authentication cookies
  await context.addCookies([
    {
      name: 'better-auth.session_token',
      value: cookies.split('=')[1].split(';')[0],
      domain: 'localhost',
      path: '/',
    }
  ]);

  await page.goto('/dashboard');
  await expect(page.getByText('Create Reunion')).toBeVisible();
});
```

## Troubleshooting

### Test DB won't start
```bash
# Check if port 5433 is in use
lsof -i :5433

# Force stop and restart
npm run test:db:stop
npm run test:db:start
```

### Migrations out of sync
```bash
# Stop DB, restart (applies migrations on start)
npm run test:db:stop
npm run test:db:start
```

### TypeScript errors in tests
Make sure `@/` imports resolve correctly. Check `tsconfig.json` and `vitest.config.ts`.
