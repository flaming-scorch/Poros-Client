# Validation

Verified during portfolio cleanup:

- `npm ci` installs dependencies.
- `npx tsc --noEmit` passes.
- `npx expo export --platform ios` produces an iOS bundle.
- The AI service files no longer contain provider keys or direct provider calls.

`npm run lint` still reports existing repository-wide style and typing-rule violations; it is not a passing gate. TypeScript compilation is verified separately. Bundling does not constitute a simulator/device end-to-end test.

AI and upload flows need a configured backend, developer-owned Supabase project and optional AI provider accounts. These external flows were not exercised against paid/live services. The backend and client changes must be used together.

A deleted upload remains in historical backend commits. Do not mirror that history into a public portfolio without inspecting the document and deciding whether to sanitize history. Team authorship must remain credited.
