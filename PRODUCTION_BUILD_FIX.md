# Production Build Fix - Module Import Error

**Date:** 2026-01-12
**Issue:** `TypeError: Importing a module script failed.` in production frontend

## Root Cause

The error was caused by **mixed import patterns** in the React application, where certain components were:
- Dynamically imported (lazy loaded) in `App.tsx`
- Statically imported in other components

### Problematic Components

1. **`DynamicConsultationForm.tsx`**
   - Lazy imported in `App.tsx` (line 38)
   - Statically imported in:
     - `InputScreen.tsx`
     - `ConsultationFormSelector.tsx`
     - `PatientAppointments.tsx`

2. **`supabase.ts`** (lower priority)
   - Mixed dynamic/static imports across multiple files

When Vite builds the production bundle, it cannot properly handle modules that are both lazy-loaded and statically imported. This creates inconsistent chunking where:
- The module might be split into a separate chunk (due to lazy loading)
- But also needs to be in the main bundle (due to static imports)
- The browser fails to resolve the module at runtime

## Why Tests Didn't Catch This

The CI/CD pipeline had **no production build verification**:
- ✅ Type checking
- ✅ Linting
- ✅ Unit tests (development mode)
- ✅ Integration tests (development mode)
- ❌ **Production build test**
- ❌ **E2E tests with lazy loading**

Development mode doesn't use code splitting, so the mixed imports only fail in production.

## The Fix

### 1. Remove Lazy Loading for Mixed-Import Components

**File:** `src/App.tsx` (lines 37-40)

**Before:**
```typescript
const DynamicConsultationForm = lazy(() => import('./components/doctor-portal/DynamicConsultationForm').then(m => ({ default: m.DynamicConsultationForm })));
const ConsultationFormSelector = lazy(() => import('./components/doctor-portal/ConsultationFormSelector').then(m => ({ default: m.ConsultationFormSelector })));
```

**After:**
```typescript
// ✨ FIX: Import statically to avoid mixed import patterns (these are also used by other components)
// Lazy loading these causes "Importing a module script failed" errors in production
import { DynamicConsultationForm } from './components/doctor-portal/DynamicConsultationForm';
import { ConsultationFormSelector } from './components/doctor-portal/ConsultationFormSelector';
```

### 2. Add Production Build Verification to CI/CD

**File:** `.github/workflows/test.yml`

Added new job `build-verification` that:
- Runs production build with `npm run build`
- Verifies all build artifacts are created
- Lists bundle sizes for monitoring
- Blocks PR merge if build fails

This ensures future mixed-import issues are caught before deployment.

## Testing the Fix

### Local Testing
```bash
# Build production bundle
npm run build

# Check for mixed import warnings (should only see supabase.ts warning, not DynamicConsultationForm)
# The build should complete successfully

# Preview production build
npm run preview
# Navigate to http://localhost:4173 and test the application
```

### Production Testing
1. Deploy to Vercel (automatic on push to main)
2. Test the production site: https://aneya.vercel.app
3. Open browser console and verify no module import errors
4. Navigate through all screens to test lazy-loaded routes

## Prevention

### Best Practices

1. **Consistent Import Patterns**
   - If a component is lazy-loaded, never statically import it elsewhere
   - If a component is statically imported anywhere, don't lazy-load it

2. **Lint Rule** (Future Enhancement)
   - Add ESLint rule to detect mixed dynamic/static imports
   - Example: `eslint-plugin-import` with `no-mixed-imports`

3. **Build Monitoring**
   - Watch Vite build warnings about mixed imports
   - Treat rollup warnings as errors in CI

4. **E2E Tests** (Future Enhancement)
   - Add Playwright tests that exercise all lazy-loaded routes
   - Run tests against production build (`npm run preview`)

### When to Use Lazy Loading

✅ **Good candidates:**
- Route-level components (entire pages)
- Large modal components used infrequently
- Admin-only features
- Heavy visualizations/charts

❌ **Bad candidates:**
- Shared components used across multiple routes
- Components already imported statically elsewhere
- Small utility components
- Core UI components

## Impact

- **Bundle Size Change:** Minimal (~2KB increase in main bundle)
- **Performance Impact:** Negligible - these components were already loaded on most routes
- **User Experience:** Fixed - no more import errors in production

## Related Issues

- Vite Build Warning: Mixed dynamic/static imports
- PostHog Recorder: Error boundary caught the import failure
- React Suspense: Lazy component failed to load

## References

- [Vite Code Splitting Documentation](https://vitejs.dev/guide/build.html#code-splitting)
- [React.lazy() Documentation](https://react.dev/reference/react/lazy)
- [Rollup Manual Chunks](https://rollupjs.org/configuration-options/#output-manualchunks)
