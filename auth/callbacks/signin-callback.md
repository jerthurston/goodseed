# SignIn Callback Documentation

## Tổng quan

File `signin.callback.ts` chứa logic xử lý đăng nhập cho tất cả authentication providers trong NextAuth. Callback này được NextAuth **tự động gọi** mỗi khi có request đăng nhập.

## Cấu trúc Callback

```typescript
export async function signInCallback(params: {
  user: User;
  account?: Account | null;
  profile?: Profile;
  email?: { verificationRequest?: boolean };
  credentials?: Record<string, any>;
})
```

## Giải thích Parameters

NextAuth tự động truyền object `params` chứa các thuộc tính tùy theo provider đang sử dụng:

### 1. `user: User` (Luôn có)

- **Nguồn**: Được tạo từ response của OAuth provider hoặc từ Credentials provider
- **Nội dung**: Thông tin cơ bản như `id`, `name`, `email`, `image`
- **Ví dụ Google OAuth**:
  ```typescript
  {
    id: "google-user-id-123",
    name: "John Doe",
    email: "john@example.com",
    image: "https://lh3.googleusercontent.com/..."
  }
  ```

### 2. `account?: Account | null` (Có khi dùng OAuth/Credentials)

- **Nguồn**: Chứa thông tin về tài khoản OAuth (access_token, refresh_token, expires_at, v.v.)
- **Khi nào có**:
  - ✅ **Có** khi đăng nhập Google/Facebook (OAuth)
  - ✅ **Có** khi đăng nhập Credentials lần đầu
  - ❌ **Null** khi JWT session được refresh (không phải lần đăng nhập mới)
- **Ví dụ Google OAuth**:
  ```typescript
  {
    provider: "google",
    type: "oauth",
    providerAccountId: "12345678901234567890",
    access_token: "ya29.a0AfH6SMBx...",
    refresh_token: "1//0gHZ...",
    expires_at: 1704614400,
    token_type: "Bearer",
    scope: "openid profile email",
    id_token: "eyJhbGciOiJSUzI1NiIsImtpZCI6IjU..."
  }
  ```

### 3. `profile?: Profile` (Chỉ có với OAuth)

- **Nguồn**: Raw profile data từ OAuth provider (trước khi được transform thành `user`)
- **Khi nào có**: Chỉ khi đăng nhập qua OAuth providers (Google, Facebook, GitHub, v.v.)
- **Ví dụ Google**:
  ```typescript
  {
    sub: "12345678901234567890",
    name: "John Doe",
    given_name: "John",
    family_name: "Doe",
    picture: "https://lh3.googleusercontent.com/...",
    email: "john@example.com",
    email_verified: true,
    locale: "en"
  }
  ```

### 4. `email?: { verificationRequest?: boolean }` (Chỉ có với Email/Magic Link)

- **Nguồn**: Khi dùng Email provider (Resend, Nodemailer, Sendgrid)
- **Khi nào có**: Khi user click vào magic link trong email
- **Ví dụ**:
  ```typescript
  {
    verificationRequest: true
  }
  ```

### 5. `credentials?: Record<string, any>` (Chỉ có với Credentials)

- **Nguồn**: Dữ liệu từ form đăng nhập (email/password)
- **Khi nào có**: Khi dùng Credentials provider
- **Ví dụ**:
  ```typescript
  {
    email: "user@example.com",
    password: "hashed_password_here"
  }
  ```

## Luồng dữ liệu theo Scenario

### Scenario 1: Đăng nhập Google OAuth

```typescript
// Luồng:
// 1. User click "Sign in with Google"
// 2. NextAuth redirect đến Google
// 3. User đồng ý consent
// 4. Google redirect về với authorization code
// 5. NextAuth exchange code → access_token + profile
// 6. NextAuth gọi signInCallback với:

signInCallback({
  user: {
    id: "google-sub-id",
    name: "John Doe",
    email: "john@example.com",
    image: "https://..."
  },
  account: {
    provider: "google",
    access_token: "ya29...",
    refresh_token: "1//...",
    expires_at: 1704614400,
    token_type: "Bearer",
    scope: "openid profile email",
    id_token: "eyJ..."
  },
  profile: {
    sub: "google-sub-id",
    email_verified: true,
    given_name: "John",
    family_name: "Doe"
  },
  email: undefined,      // Không có vì không phải magic link
  credentials: undefined // Không có vì không phải credentials
})
```

### Scenario 2: Đăng nhập Credentials (email/password)

```typescript
// Luồng:
// 1. User submit form với email + password
// 2. NextAuth gọi authorize() trong Credentials provider
// 3. authorize() validate và return user object
// 4. NextAuth gọi signInCallback với:

signInCallback({
  user: {
    id: "user-db-id",
    name: "Jane Smith",
    email: "jane@example.com",
    image: null
  },
  account: {
    provider: "credentials",
    type: "credentials",
    providerAccountId: "user-db-id"
  },
  profile: undefined,    // Không có vì không phải OAuth
  email: undefined,      // Không có vì không phải magic link
  credentials: {
    email: "jane@example.com",
    password: "••••••••"  // Đã được hash trong authorize()
  }
})
```

### Scenario 3: Facebook OAuth (không có email scope)

```typescript
// Luồng:
// 1. User đăng nhập Facebook
// 2. Facebook app chưa được duyệt email scope
// 3. NextAuth nhận về profile không có email
// 4. NextAuth gọi signInCallback với:

signInCallback({
  user: {
    id: "facebook-id-123",
    name: "Bob Lee",
    email: null,           // ⚠️ Facebook chưa cấp email scope
    image: "https://platform-lookaside.fbsbx.com/..."
  },
  account: {
    provider: "facebook",
    access_token: "EAAG...",
    refresh_token: null,   // ⚠️ Facebook không cung cấp refresh_token
    expires_at: 1709817600,
    token_type: "bearer",
    scope: "public_profile"
  },
  profile: {
    id: "facebook-id-123",
    name: "Bob Lee",
    picture: {
      data: {
        url: "https://..."
      }
    }
  },
  email: undefined,
  credentials: undefined
})
```

## Bảng so sánh Parameters theo Provider

| Field | Google OAuth | Facebook OAuth | Credentials | Email/Magic Link |
|-------|-------------|----------------|-------------|------------------|
| `user` | ✅ Có | ✅ Có | ✅ Có | ✅ Có |
| `account` | ✅ Có | ✅ Có | ✅ Có | ✅ Có |
| `profile` | ✅ Có | ✅ Có | ❌ Không | ❌ Không |
| `email` | ❌ Không | ❌ Không | ❌ Không | ✅ Có |
| `credentials` | ❌ Không | ❌ Không | ✅ Có | ❌ Không |

## Tại sao các field là Optional?

```typescript
account?: Account | null;   // Có thể null khi refresh session
profile?: Profile;          // Chỉ có với OAuth
email?: { ... };            // Chỉ có với Email provider
credentials?: Record<...>;  // Chỉ có với Credentials
```

NextAuth gọi callback này trong **nhiều tình huống**:

1. ✅ Lần đăng nhập đầu tiên → có đầy đủ data
2. ✅ Session refresh → `account` có thể null
3. ✅ Provider khác nhau → các field khác nhau available

Sử dụng optional (`?`) đảm bảo type-safe và tránh lỗi runtime khi access các field không tồn tại.

## Logic xử lý trong Callback

### 1. Kiểm tra account tồn tại

```typescript
if (!account) {
  throw new Error("Account not found");
}
```

### 2. Route theo provider

```typescript
if (account.provider === "google") {
  return await handleGoogleSignIn(user, account);
}

if (account.provider === "facebook") {
  return await handleFacebookSignIn(user, account);
}

if (account.provider === "credentials") {
  return true;
}
```

### 3. Google OAuth Handler

**Nhiệm vụ**:
- Tạo user mới nếu chưa tồn tại (sign-up)
- Link Google account nếu user đã tồn tại
- Yêu cầu email verification nếu đăng ký qua credentials trước đó

**Flow**:
```typescript
async function handleGoogleSignIn(user, account) {
  // 1. Tìm user theo email
  const existingUser = await prisma.user.findUnique({ where: { email } });
  
  // 2. Nếu chưa có → tạo mới
  if (!existingUser) {
    const newUser = await prisma.user.create({ ... });
    await prisma.account.create({ ... }); // Link Google account
    return true;
  }
  
  // 3. Nếu có nhưng chưa verify email → yêu cầu verify
  if (!existingUser.emailVerified) {
    return "/auth/verify";
  }
  
  // 4. Nếu có và đã verify → link Google account nếu chưa
  const existingGoogleAccount = await prisma.account.findFirst({ ... });
  if (!existingGoogleAccount) {
    await prisma.account.create({ ... });
  }
  
  return true;
}
```

### 4. Facebook OAuth Handler

**Nhiệm vụ**:
- Xử lý trường hợp không có email (tạo email fallback)
- Track acquisition source
- Link Facebook account

**Email Fallback Strategy**:
```typescript
const userEmail = user.email || `facebook_${account.providerAccountId}@temp.local`;
```

**Flow**:
```typescript
async function handleFacebookSignIn(user, account) {
  const userEmail = user.email || `facebook_${providerAccountId}@temp.local`;
  
  // 1. Tìm user
  const existingUser = await prisma.user.findUnique({ where: { email: userEmail } });
  
  // 2. Tạo mới nếu chưa có
  if (!existingUser) {
    await prisma.user.create({
      email: userEmail,
      emailVerified: user.email ? new Date() : null, // Chỉ verify nếu email thật
      acquisitionSource: "facebook_oauth",
      ...
    });
    await prisma.account.create({ ... });
    return true;
  }
  
  // 3. Link Facebook account nếu chưa
  const existingFacebookAccount = await prisma.account.findFirst({ ... });
  if (!existingFacebookAccount) {
    await prisma.account.create({ ... });
  }
  
  return true;
}
```

## Return Values

Callback có thể return:

| Return Value | Ý nghĩa |
|-------------|---------|
| `true` | Cho phép đăng nhập, tiếp tục flow |
| `false` | Từ chối đăng nhập, redirect về sign-in page |
| `"/auth/verify"` | Redirect đến trang xác minh email |
| `throw Error` | Hiển thị lỗi trên error page |

## Error Handling

```typescript
try {
  // ... logic
} catch (error) {
  apiLogger.logError("Sign-in error:", error as Error);
  const errorMessage = error instanceof Error ? error.message : "Unknown error";
  throw new Error(`signInError=${encodeURIComponent(errorMessage)}`);
}
```

Error message được encode vào query string và hiển thị trên `/auth/error` page.

## Best Practices

1. **Luôn kiểm tra `account` trước khi access**: Có thể null trong một số trường hợp
2. **Xử lý email nullable**: Đặc biệt với Facebook OAuth
3. **Log đầy đủ**: Dùng `apiLogger` để track authentication flow
4. **Tách logic theo provider**: Dễ maintain và test
5. **Handle token fields carefully**: Facebook không có `refresh_token`, `id_token`

## Liên quan

- **File**: `auth/callbacks/signin.callback.ts`
- **Được gọi từ**: `auth/auth.ts`
- **Providers config**: `auth/auth.config.ts`
- **Database models**: `prisma/schema.prisma` (User, Account)
- **Error page**: `/app/auth/error/page.tsx`
