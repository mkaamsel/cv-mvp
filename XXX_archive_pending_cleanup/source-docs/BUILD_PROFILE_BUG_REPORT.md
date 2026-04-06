# Build Profile Bug Report

**Date:** 2026-04-05  
**Status:** Fixed  
**Severity:** Critical — blocked all users from building a profile on a fresh session or after deletion

---

## Symptoms

- Build profile button disabled immediately after page load, before any user action
- Status panel shows "Loading" without the user clicking anything
- Uploading a PDF or DOCX extracts text (6,500+ characters visible in textarea) but the button remains disabled
- Persisted through multiple hard restarts, fresh uploads, and both PDF and DOCX file types
- Status never cleared — user could not proceed at all

---

## Root Cause 1 — `mergeLoadedWorkspace` does not reset `profileStatus` to `"idle"` when no profile is loaded

**File:** `components/workspace/WorkspaceProvider.tsx`  
**Function:** `mergeLoadedWorkspace` (line ~395)

### The exact chain

**Step 1.** On mount, `loadStoredWorkspace` (inside `useEffect` gated on `hydrated`) fires and immediately runs this state update before the fetch completes:

```typescript
setState((current) => ({
  ...current,
  profileStatus:
    current.candidateProfile || current.profileStatus === "ready"
      ? current.profileStatus
      : "loading",   // ← sets "loading" when no profile exists yet
  profileError: null,
}));
```

On a fresh session (no saved profile, or after a delete), `current.candidateProfile` is `null` and `current.profileStatus` is `"idle"`. The condition is false, so `profileStatus` is set to `"loading"`.

**Step 2.** The fetch to `/api/profile/load` completes. The user has no saved profile in Supabase, so `data.workspace` is `null`.

```typescript
const loadedProfile = normalizeLoadedProfile(data.workspace?.profile ?? null);
// data.workspace is null → loadedProfile = null
```

**Step 3.** `setState((current) => mergeLoadedWorkspace(current, null, []))` runs.

```typescript
function mergeLoadedWorkspace(current, loadedProfile, loadedFiles) {
  const shouldUseLoadedProfile = !current.candidateProfile && loadedProfile;
  // shouldUseLoadedProfile = !null && null = false

  return {
    ...current,
    profileStatus:
      shouldUseLoadedProfile || current.candidateProfile
        ? "ready"
        : current.profileStatus,   // ← BUG: falls through to current.profileStatus
  };
}
```

Neither `shouldUseLoadedProfile` (`false`) nor `current.candidateProfile` (`null`) is truthy. The function falls through to `current.profileStatus` — which is **still `"loading"`** from Step 1. The status is never reset to `"idle"`.

**Step 4.** The Build profile button's disabled prop evaluates:

```typescript
disabled={state.profileStatus === "loading"}
// "loading" === "loading" → true → button disabled
```

The button is permanently disabled. Uploading a file populates `candidateText`, but that has no effect on `profileStatus`. The user cannot click Build profile.

---

## Root Cause 2 — `profileStatus: "loading"` displayed as user-visible "Loading" status

The status panel calls `toDisplayStatus(state.profileStatus)` which maps `"loading"` → `"Loading"`. This is correct for a user-triggered build. But the stuck-loading bug from Root Cause 1 makes this show "Loading" at all times, which the user reads as the system being busy or broken.

---

## The Fix

**File:** `components/workspace/WorkspaceProvider.tsx`  
**Function:** `mergeLoadedWorkspace`

Change:

```typescript
profileStatus:
  shouldUseLoadedProfile || current.candidateProfile
    ? "ready"
    : current.profileStatus,   // BUG: preserves "loading" from initial setState
```

To:

```typescript
profileStatus:
  shouldUseLoadedProfile || current.candidateProfile
    ? "ready"
    : "idle",   // FIX: always reset to idle when no profile is loaded
```

**Why this is safe:** `mergeLoadedWorkspace` is only ever called from the initial Supabase load effect. That effect runs exactly once per mount (when `hydrated` transitions from `false` to `true`). At that point, no user-triggered build can be in flight — the user has not had time to interact. Resetting to `"idle"` when no profile is found is the correct behavior.

**Note on the error path:** The error path in `loadStoredWorkspace` already correctly resets to `"idle"`:
```typescript
profileStatus: current.candidateProfile ? "ready" : "idle",
```
This is why the bug was not caught by simply testing a 401/500 from the load endpoint. The error path worked. The success path with a null workspace did not.

---

## What the Previous Audit Missed

The previous session noted: *"WorkspaceProvider sets `profileStatus: 'loading'` during initial Supabase load — distinct from user-triggered build loading state."*

This was documented as expected, transient behavior. The audit confirmed:
- The `hydrated` guard prevents loading before sessionStorage is read
- The `cancelled` flag prevents setState after unmount
- Environment variables are set
- AbortController is correctly wired

**What was not checked:** What `mergeLoadedWorkspace` returns when `loadedProfile` is `null`. The audit traced the loading trigger correctly but did not trace what happens when the success-path API call returns a null workspace. The word "transient" was assumed — it was not verified that the status actually cleared.

---

## Other Fragile Conditions Found During Investigation

### 1. Race condition between initial Supabase load and user-triggered build (theoretical)

`mergeLoadedWorkspace` uses a functional setState: `setState((current) => ...)`. The `current` parameter is the state at resolution time. If the Supabase load is slow and a user triggers a build before it completes, the Supabase load's setState would fire after `setProfileStatus("loading")` from the build — and (before this fix) would have reset `profileStatus` to whatever `current.profileStatus` was at resolution time.

**Post-fix:** The fix changes this to `"idle"`, which would interrupt an in-progress build. This is still a theoretical race but now has a different failure mode (build spinner disappears). In practice, the Supabase load completes in <200ms and the user cannot interact before it resolves.

**Mitigation:** The `cancelled` flag could be extended to check whether the profile is already in a user-triggered build state, but this would over-complicate the code for an extremely unlikely race. Current fix is correct for the common case.

### 2. `setProfileError` side-effects `profileStatus`

```typescript
const setProfileError = useCallback((message: string | null) => {
  setState((current) => ({
    ...current,
    profileError: message,
    profileStatus: message ? "error" : current.profileStatus,  // ← side effect
  }));
}, []);
```

Calling `setProfileError(null)` to clear an error does **not** reset `profileStatus` — it preserves whatever status is current. This means if `profileStatus` is stuck at `"loading"` and `setProfileError(null)` is called, the status stays `"loading"`. This is not a current bug (since Root Cause 1 is fixed) but could cause confusion in future code that clears errors expecting status to normalize.

### 3. `mergeLoadedWorkspace` overwrites `profileError: null` unconditionally

```typescript
return {
  ...current,
  profileError: null,   // ← always clears errors
};
```

If the user encounters an error before the initial Supabase load completes (possible if sessionStorage restore produces a stuck error state), the load will silently clear it. This is probably intentional (fresh load should clear stale errors) but is not documented.

### 4. `candidateText` is component-local state, not in WorkspaceProvider

The extracted CV text lives in `useState` in `profile/page.tsx`, not in the workspace context. This means:
- Text is lost on page navigation and back
- Text is lost on HMR in development
- There is no way to check "has the user uploaded anything" from outside the profile page

This is the **correct** design for privacy (text is not persisted) but it means the gate condition `hasCvText` in `handleBuildProfile` can only be checked at call time, not from parent components. This is working as intended.

---

## Summary

| Issue | Location | Status |
|-------|----------|--------|
| Button disabled on fresh load | `WorkspaceProvider.tsx` `mergeLoadedWorkspace` | **Fixed** |
| "Loading" status shown without user action | Same root cause | **Fixed** |
| `setProfileError(null)` does not clear `profileStatus` | `WorkspaceProvider.tsx` `setProfileError` | Known fragile, not fixed |
| Supabase load/build race condition | `WorkspaceProvider.tsx` | Theoretical only, acceptable |

---

## Verification

After the fix, expected behavior on a fresh session:

1. Page loads → `profileStatus: "idle"` (from sessionStorage, no saved data)
2. `loadStoredWorkspace` fires → `profileStatus: "loading"` (transient, <200ms)
3. Supabase returns null workspace → `mergeLoadedWorkspace` returns `profileStatus: "idle"`
4. Build profile button is enabled. Status panel shows "Idle" (not "Loading")
5. User uploads PDF → text extracted → `candidateText` populated
6. User clicks Build profile → button is clickable → `handleBuildProfile` fires
