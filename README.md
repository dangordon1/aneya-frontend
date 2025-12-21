# Aneya Monorepo

React Native mobile app development workspace for Aneya clinical decision support system.

## Structure

```
aneya-mobile/
├── apps/
│   ├── web/          # Existing React web app (Vite + TypeScript)
│   └── mobile/       # React Native mobile app (to be created)
├── packages/
│   ├── shared-types/      # TypeScript types (database, drug info)
│   ├── shared-api/        # API clients (Supabase, Firebase)
│   ├── shared-business/   # Business logic and React hooks
│   └── shared-utils/      # Utility functions
├── package.json      # Root monorepo config
├── pnpm-workspace.yaml
└── turbo.json
```

## Technology Stack

- **Monorepo:** Turborepo with pnpm workspaces
- **Web:** React 18 + TypeScript + Vite + Tailwind CSS
- **Mobile:** React Native + Expo (to be created)
- **Backend:** FastAPI on Google Cloud Run
- **Database:** Supabase PostgreSQL
- **Auth:** Firebase Authentication

## Code Reuse

**Target: 60-70% code sharing between web and mobile**

### Shared Packages

- **`@aneya/shared-types`** - All TypeScript interfaces and types
- **`@aneya/shared-api`** - Platform-agnostic API clients
- **`@aneya/shared-business`** - React hooks and contexts
- **`@aneya/shared-utils`** - Date helpers, validation, etc.

## Development

### Prerequisites

- Node.js 18+
- pnpm 9.0+

### Installation

```bash
pnpm install
```

### Running the Web App

```bash
cd apps/web
pnpm dev
```

### Running All Apps (when mobile is created)

```bash
pnpm dev
```

## Next Steps

1. **Phase 2:** Initialize Expo mobile app in `apps/mobile/`
2. **Update imports:** Migrate web app to use shared packages
3. **Add navigation:** Set up Expo Router
4. **Implement features:** Port web components to React Native

## Git Workflow

This is a git worktree based on the `mobile-monorepo` branch.

**Main repo:** `/Users/dgordon/aneya/aneya-frontend`
**Worktree:** `/Users/dgordon/aneya-mobile`

When ready, merge `mobile-monorepo` branch back to main.

## Environment Variables

### Web App (`apps/web/.env`)

```
VITE_API_URL=
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

### Mobile App (to be created)

Environment variables will be managed via Expo EAS secrets.

## Documentation

- [Implementation Plan](/Users/dgordon/.claude/plans/nifty-shimmying-acorn.md)
- [Web App README](README-web.md)

## License

Private - Aneya Healthcare
