# Baseline

Recorded on 2026-09-08, Windows, Node 24.18.0, npm 11.16.0, Expo SDK 54.

The initial working tree was clean. There was no Supabase configuration, linked project, migration, test suite, native project or patch directory. All active application source and repository configuration were read before implementation. The tracked `.history` archive contained 7,983 editor snapshots.

| Check | Result |
| --- | --- |
| `npm ci` | Passed: 1,020 packages installed. Initial sandbox attempt failed on npm cache permissions; retried with approval. `patch-package` reported no patch files. |
| `npm run lint` | Passed with 22 warnings, 0 errors. |
| `npx tsc --noEmit` | Passed. JavaScript service/context files were not meaningfully checked. |
| `npx expo-doctor` | Failed: 17/18 checks passed. Required expo ~54.0.37, expo-constants ~18.0.14, expo-file-system ~19.0.24 and react-native-webview 13.15.0. |
| `EXPO_NO_TELEMETRY=1 npx expo export --platform web --clear` | Passed with the invalid `(main)/postDetails` route warning and deprecated expo-av. Exported 13 routes; web bundle 10.2 MB. |
| `npm audit --omit=dev` | Failed: 178 findings, 11 moderate and 167 high, including inherited dependency chains. See baseline-audit.json. |
| Database tests | No schema or tests existed. Docker was installed but stopped; started with approval. |

PowerShell's script execution policy prevents the npm.ps1/npx.ps1 shims. Commands use the equivalent npm.cmd/npx.cmd executables without changing system execution policy.

The install-time audit reported 33 findings (19 moderate, 14 high); the separate requested production audit reported the totals above. Audit metadata can change independently of the lockfile. Raw production audit output is retained for comparison.

## Final checks

On 2026-09-09, after the implementation:

| Check | Result |
| --- | --- |
| `npm run lint` | Passed with 0 errors and 0 warnings after removing unused starter configuration and disabling noisy legacy rules. |
| `npm run typecheck` | Passed. |
| `npm test -- --runInBand` | Passed: 1 suite, 4 tests. |
| `npx supabase test db` | Passed: 1 pgTAP file, 4 tests. |
| `npx expo-doctor` | Passed: 18/18 checks. |
| web export | Passed: 15 static routes, including forgot/reset password and no invalid post-details route warning. |
| `npm audit --omit=dev` | Failed with 179 transitive findings (10 moderate, 169 high). Findings are primarily Expo CLI, Metro, navigation, plist/xmldom, js-yaml, nanoid and uuid chains. No compatible non-breaking fix removes all findings; `npm audit fix --force` was not used. |

The local Supabase stack applied all four migrations successfully. Native Android/iOS builds and push/OAuth provider flows were not run because native credentials and provider configuration are not present in this repository.
