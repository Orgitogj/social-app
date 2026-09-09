# LinkUp

LinkUp is a privacy-first social app for sharing thoughts and media, discovering people, following accounts, saving posts, and exchanging secure one-to-one messages.

## Features

Authentication with email confirmation, password recovery, secure session persistence, protected routes, public/private profiles, posts with rich text and media, likes, comments and replies, bookmarks, follows and requests, search, hashtags and mentions, notifications, blocks, mutes, reports, and member-only messaging.

## Architecture

Expo SDK 54 and Expo Router provide the native and web client. `contexts/` owns session and profile state. Typed feature services call Supabase RPCs and RLS-protected tables. `types/database.ts` is generated from the local schema; `types/domain.ts` holds UI domain models. Supabase migrations define tables, indexes, triggers, privacy rules, Storage rules, rate limits, and notification generation. Privileged account, push, and Storage cleanup actions are Edge Functions.

## Installation

Use Node 20.19 or newer. Copy `.env.example` to `.env`, then set the public Supabase URL and anon or publishable key. Never put a service-role or secret key in this file.

```sh
npm ci
npm run start
```

The application validates its public configuration on first Supabase access and reports a development setup error when values are missing or privileged.

## Environment

`EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` are required public client configuration. `EXPO_PUBLIC_APP_SCHEME`, `EXPO_PUBLIC_SITE_URL`, and `EXPO_PUBLIC_EAS_PROJECT_ID` enable deep links and push registration. Google and Apple providers are controlled by their `EXPO_PUBLIC_*_AUTH_ENABLED` flags and also require provider configuration in Supabase and native credentials. Edge Functions additionally require `SUPABASE_SERVICE_ROLE_KEY`, `PUSH_FUNCTION_SECRET`, and `STORAGE_CLEANUP_SECRET` in the Supabase Function environment; these values never ship to the client.

## Local Supabase

Install the Supabase CLI and Docker Desktop, then run:

```sh
npx supabase start
npm run db:reset
npm run db:types
npm run test:db
```

The local stack uses `supabase/config.toml`, migrations, and `supabase/seed.sql`. No migration command in this repository targets a linked or production project. Use `npx supabase link` and review `npx supabase db push` separately when you are ready to deploy.

## Development and testing

```sh
npm run start
npm run web
npm run lint
npm run typecheck
npm test -- --runInBand
npm run test:db
```

Tests use local Supabase only. Production data is never required.

## Build

```sh
EXPO_NO_TELEMETRY=1 npx expo export --platform web --clear
npx expo run:android
npx expo run:ios
```

Native commands require a local development build and platform toolchains. EAS builds require an EAS project and native identifiers supplied through environment or app configuration.

## OAuth and push notifications

Configure Google and Apple OAuth redirect URLs in Supabase and set the provider flags only after the native client IDs and URL scheme are available. Push notifications require an EAS project ID, native push credentials, and `expo-notifications` configuration in a development or production build; Expo Go cannot provide all native push functionality. Push delivery is performed only by `dispatch-push` with its server-side secret.

## Privacy and legal setup

Final Terms of Service and Privacy Policy text must be supplied by the product owner. The app's account export and deletion endpoints are server-side protected and should be verified against the organization's retention policy before release.

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
