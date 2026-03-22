# Olivia Version Bump

Bump the Olivia app version across all locations that track it. This ensures the npm package, iOS Xcode project, and changelog stay in sync.

## Files to update

1. **`package.json`** (root) — update the `"version"` field
2. **`apps/pwa/ios/App/App.xcodeproj/project.pbxproj`** — update `MARKETING_VERSION` in both Debug and Release build configurations
3. **`CHANGELOG.md`** — add a new version entry above the previous version

## Steps

1. Read the current version from `package.json`.
2. Determine the new version using semver: PATCH for fixes, MINOR for features, MAJOR reserved for 1.0.0 launch.
3. Update `package.json` `"version"` to the new version.
4. Update `MARKETING_VERSION` in `project.pbxproj` — there are two occurrences (Debug and Release). Replace all.
5. Add a new changelog section to `CHANGELOG.md` above the previous version entry. Use this format:

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added
- Description of new features in plain, user-facing language

### Fixed
- Description of bug fixes in plain, user-facing language
```

6. Commit all three files together in a single commit:
   ```
   chore(OLI-XXX): bump version to X.Y.Z and update changelog
   ```

## Important notes

- `CURRENT_PROJECT_VERSION` (build number) in `project.pbxproj` is separate from `MARKETING_VERSION`. Only bump it if Apple requires a new build number for the same marketing version (e.g., rejected build resubmission). Normally leave it as-is.
- The changelog should use plain language a household member would understand — no internal jargon.
- Always verify the version is consistent across all three files after bumping.
