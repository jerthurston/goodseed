- standar Authjs project structure

src/
├─ app/
│  ├─ api/
│  │  └─ auth/
│  │     └─ [...nextauth]/
│  │        └─ route.ts
│  └─ middleware.ts
│
├─ auth/
│  ├─ index.ts              # NextAuth() config export
│  ├─ options.ts            # callbacks, session, pages
│  ├─ providers/
│  │  ├─ google.provider.ts
│  │  ├─ facebook.provider.ts
│  │  └─ credentials.provider.ts
│  │
│  ├─ adapters/
│  │  └─ prisma.adapter.ts
│  │
│  ├─ callbacks/
│  │  ├─ jwt.callback.ts
│  │  ├─ session.callback.ts
│  │  └─ signIn.callback.ts
│  │
│  ├─ types.ts              # extend next-auth types
│  └─ constants.ts
│
├─ lib/
│  ├─ prisma.ts
│  └─ logger.ts
│
├─ types/
│  └─ next-auth.d.ts