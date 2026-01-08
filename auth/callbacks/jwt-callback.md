# JWT Callback Documentation

## Tổng quan

File `jwt.callback.ts` chứa logic quản lý JWT token trong NextAuth. Đây là callback **QUAN TRỌNG NHẤT** và **PHỨC TẠP NHẤT** vì nó chịu trách nhiệm:

1. **Lưu trữ OAuth tokens** khi user đăng nhập
2. **Populate user data từ database** vào token
3. **Refresh access token** khi hết hạn
4. **Handle session updates** từ client

## Vị trí trong Authentication Flow

```
User Login
    ↓
signIn callback (validate login)
    ↓
👉 jwt callback (lưu tokens + populate user data) 👈
    ↓
JWT Token stored in httpOnly cookie
    ↓
Every request → jwt callback (check expiry + refresh if needed)
    ↓
session callback (map token → session)
    ↓
Client receives session
```

## Cấu trúc Callback

```typescript
export async function jwtCallback(params: {
  token: JWT;
  user?: User;
  account?: Account | null;
  profile?: Profile;
  trigger?: "signIn" | "signUp" | "update";
  session?: any;
  isNewUser?: boolean;
})
```

## Giải thích Parameters

### 1. `token: JWT` (Luôn có)

- **Nguồn**: JWT token hiện tại (từ cookie)
- **Nội dung**: Chứa dữ liệu đã được lưu từ lần gọi trước
- **Ví dụ lần đầu (sau đăng nhập)**:
  ```typescript
  {
    sub: "user-id-123",        // User ID (JWT standard claim)
    iat: 1704528000,           // Issued at
    exp: 1705132800,           // Expires at
    jti: "unique-jwt-id"       // JWT ID
  }
  ```
- **Ví dụ lần sau (đã populate)**:
  ```typescript
  {
    sub: "user-id-123",
    name: "John Doe",
    email: "john@example.com",
    role: "USER",              // Custom fields
    isOAuth: true,
    isTwoFactorEnabled: false,
    is2FAVerified: false,
    accessToken: "ya29...",    // OAuth tokens
    refreshToken: "1//...",
    expiresAt: 1704614400,
    iat: 1704528000,
    exp: 1705132800
  }
  ```

### 2. `user?: User` (Chỉ có khi đăng nhập lần đầu)

- **Khi nào có**: Chỉ có trong lần gọi **đầu tiên** sau khi đăng nhập thành công
- **Nguồn**: User object từ `signIn` callback hoặc OAuth provider
- **Ví dụ**:
  ```typescript
  {
    id: "user-id-123",
    name: "John Doe",
    email: "john@example.com",
    image: "https://..."
  }
  ```

### 3. `account?: Account | null` (Chỉ có khi đăng nhập OAuth lần đầu)

- **Khi nào có**: Chỉ có trong lần gọi **đầu tiên** sau OAuth sign-in
- **Nguồn**: OAuth tokens từ provider (Google, Facebook, v.v.)
- **Ví dụ Google OAuth**:
  ```typescript
  {
    provider: "google",
    access_token: "ya29.a0AfH6SMBx...",
    refresh_token: "1//0gHZ...",
    expires_at: 1704614400,
    token_type: "Bearer",
    scope: "openid profile email",
    id_token: "eyJhbGciOiJS..."
  }
  ```

### 4. `profile?: Profile` (Chỉ có với OAuth)

- **Khi nào có**: Chỉ có trong lần gọi **đầu tiên** sau OAuth sign-in
- **Nguồn**: Raw profile từ OAuth provider
- **Ví dụ**: (giống như trong signin callback)

### 5. `trigger?: "signIn" | "signUp" | "update"` (Optional)

- **Nguồn**: NextAuth tự động set dựa trên context
- **Các giá trị**:
  - `"signIn"`: User vừa đăng nhập
  - `"signUp"`: User vừa đăng ký mới (hiếm khi dùng)
  - `"update"`: Client gọi `update()` để thay đổi session
- **Use case**: Phân biệt giữa đăng nhập mới và session update

### 6. `session?: any` (Chỉ có khi trigger === "update")

- **Khi nào có**: Khi client gọi `update()` từ `useSession()` hook
- **Nguồn**: Data mới từ client muốn merge vào token
- **Ví dụ client code**:
  ```typescript
  const { update } = useSession()
  
  // User vừa cập nhật profile
  await update({
    name: "New Name",
    image: "new-image-url"
  })
  ```

### 7. `isNewUser?: boolean` (Hiếm khi dùng)

- **Khi nào có**: Khi user vừa được tạo mới trong database
- **Use case**: Track user acquisition, send welcome email, v.v.

## Tần suất gọi JWT Callback

JWT callback được gọi **RẤT THƯỜNG XUYÊN**:

| Tình huống | Tần suất | Token có user? | Account có? |
|-----------|---------|---------------|-------------|
| **Lần đầu sau login** | 1 lần | ✅ Có | ✅ Có (nếu OAuth) |
| **Mỗi request đến server** | Mỗi request | ❌ Không | ❌ Không |
| **Client gọi update()** | Mỗi lần gọi | ❌ Không | ❌ Không |
| **Token refresh** | Khi gần hết hạn | ❌ Không | ❌ Không |

**Lưu ý**: Đa số các lần gọi chỉ có `token`, không có `user`/`account`. Vì vậy cần populate user data từ database mỗi lần.

## Logic xử lý (4 bước chính)

### Bước 1: Handle session update từ client

```typescript
if (trigger === "update" && session) {
  return { ...token, ...session };
}
```

**Khi nào xảy ra**: Client gọi `update()` hook để thay đổi session

**Ví dụ**:
```typescript
// Client code
const { update } = useSession()
await update({ name: "New Name" })

// JWT callback nhận được:
// token = { sub: "...", name: "Old Name", ... }
// session = { name: "New Name" }
// Result = { ...token, name: "New Name" }
```

**Tại sao cần**: Cho phép client cập nhật session mà không cần re-login

### Bước 2: Lưu trữ OAuth tokens khi đăng nhập

```typescript
if (account && account.access_token) {
  token.accessToken = account.access_token;
  token.refreshToken = account.refresh_token;
  token.expiresAt = account.expires_at;
  token.tokenType = account.token_type;
}
```

**Khi nào xảy ra**: Chỉ ở lần gọi **đầu tiên** sau OAuth login

**Tại sao quan trọng**:
- `accessToken`: Dùng để gọi Google/Facebook APIs
- `refreshToken`: Dùng để refresh `accessToken` khi hết hạn
- `expiresAt`: Biết khi nào cần refresh
- `tokenType`: Thường là "Bearer"

**Flow**:
```
User login với Google
    ↓
Google trả về tokens
    ↓
jwt callback lưu vào token
    ↓
Token được store trong httpOnly cookie
    ↓
Sau này dùng để gọi Gmail/Drive/Calendar APIs
```

### Bước 3: Populate user data từ database

```typescript
if (token.sub) {
  await populateUserData(token);
}
```

**Tại sao cần**: Token chỉ chứa `sub` (user ID), không có `name`, `email`, `role`, v.v. Cần fetch từ DB để có đầy đủ thông tin.

**Logic trong `populateUserData()`**:

```typescript
async function populateUserData(token: JWT): Promise<void> {
  // 1. Lấy user từ DB
  const existingUser = await getUserById(token.sub!);
  if (!existingUser) return;

  // 2. Lấy account info (check xem user có OAuth account không)
  const existingAccount = await getAccountByUserId(existingUser.id);

  // 3. Check 2FA status
  const twoFactorConfirmation = existingUser.isTwoFactorEnabled
    ? await getTwoFactorConfirmationByUserId(existingUser.id)
    : null;

  // 4. Populate token
  token.isOAuth = !!existingAccount;
  token.name = existingUser.name;
  token.email = existingUser.email;
  token.role = existingUser.role;           // ⭐ QUAN TRỌNG cho phân quyền
  token.isTwoFactorEnabled = existingUser.isTwoFactorEnabled;
  token.is2FAVerified = !!twoFactorConfirmation;
}
```

**Tại sao populate mỗi lần**:
- User có thể thay đổi role trong admin panel
- User có thể enable/disable 2FA
- Cần data realtime, không cache cũ

### Bước 4: Check expiry và refresh token

```typescript
return await handleTokenRefresh(token);
```

**Logic trong `handleTokenRefresh()`**:

```typescript
async function handleTokenRefresh(token: JWT): Promise<JWT> {
  // Case 1: Token còn hạn (> 1 phút)
  if (token.expiresAt && Date.now() < token.expiresAt * 1000 - 60000) {
    return token; // Không cần refresh
  }

  // Case 2: Token hết hạn, có refresh_token → refresh
  if (token.refreshToken) {
    try {
      const refreshedTokens = await refreshAccessToken(token.refreshToken);
      return {
        ...token,
        accessToken: refreshedTokens.access_token,
        refreshToken: refreshedTokens.refresh_token || token.refreshToken,
        expiresAt: Math.floor(Date.now() / 1000 + refreshedTokens.expires_in),
      };
    } catch (error) {
      // Refresh thất bại → mark error
      return { ...token, error: "RefreshAccessTokenError" };
    }
  }

  // Case 3: Không có refresh_token hoặc không cần refresh
  return token;
}
```

**Token Refresh Flow**:

```
┌────────────────────────────────────────────────┐
│  Token expiry check (mỗi request)              │
└────────────────────────────────────────────────┘
                    │
                    ▼
         ┌──────────────────────┐
         │ Token còn > 1 phút?  │
         └──────────────────────┘
              │           │
            Yes          No
              │           │
              ▼           ▼
        Return token   ┌──────────────────────┐
                      │ Có refresh_token?    │
                      └──────────────────────┘
                            │           │
                          Yes          No
                            │           │
                            ▼           ▼
                  ┌─────────────────┐  Return token
                  │ Call Google API │
                  │ /token endpoint │
                  └─────────────────┘
                            │
                    ┌───────┴────────┐
                  Success          Error
                    │                │
                    ▼                ▼
              Return new      Return token
              tokens          with error flag
```

## Tại sao refresh trước 1 phút?

```typescript
Date.now() < token.expiresAt * 1000 - 60000
```

**60000ms = 1 phút**. Refresh sớm để:
- Tránh race condition (request đang gọi thì token hết hạn)
- Đảm bảo luôn có token valid
- User experience mượt mà (không bị logout giữa chừng)

## Scenarios cụ thể

### Scenario 1: Lần đầu login với Google

```typescript
// Lần 1: Ngay sau login
jwtCallback({
  token: {
    sub: "user-id-123",
    iat: 1704528000,
    exp: 1705132800
  },
  user: {
    id: "user-id-123",
    name: "John Doe",
    email: "john@example.com"
  },
  account: {
    provider: "google",
    access_token: "ya29...",
    refresh_token: "1//...",
    expires_at: 1704614400
  },
  trigger: "signIn"
})

// Kết quả:
{
  sub: "user-id-123",
  name: "John Doe",
  email: "john@example.com",
  role: "USER",                  // ← Từ DB
  isOAuth: true,                 // ← Từ DB
  isTwoFactorEnabled: false,     // ← Từ DB
  is2FAVerified: false,          // ← Từ DB
  accessToken: "ya29...",        // ← Từ account
  refreshToken: "1//...",        // ← Từ account
  expiresAt: 1704614400,         // ← Từ account
  iat: 1704528000,
  exp: 1705132800
}
```

### Scenario 2: Request thứ 2 (token còn hạn)

```typescript
// Lần 2: 10 phút sau
jwtCallback({
  token: {
    sub: "user-id-123",
    name: "John Doe",
    email: "john@example.com",
    role: "USER",
    accessToken: "ya29...",
    refreshToken: "1//...",
    expiresAt: 1704614400,  // Còn 50 phút
    // ...
  },
  // Không có user, account (chỉ có lần đầu)
  user: undefined,
  account: undefined
})

// Logic:
// 1. Không có session update → skip bước 1
// 2. Không có account → skip bước 2
// 3. Có token.sub → populate user data từ DB (check role mới nhất)
// 4. Token còn 50 phút → không cần refresh → return token
```

### Scenario 3: Token gần hết hạn (< 1 phút)

```typescript
// Lần 3: 59 phút sau login
jwtCallback({
  token: {
    sub: "user-id-123",
    // ... data như trên
    expiresAt: 1704614400,  // Còn 0.5 phút
    refreshToken: "1//..."
  }
})

// Logic:
// 1-3. Giống scenario 2
// 4. Token còn < 1 phút → gọi refreshAccessToken()
//    → Nhận new access_token, refresh_token, expires_in
//    → Return token mới
```

### Scenario 4: Refresh thất bại

```typescript
// Refresh API trả lỗi 401 (refresh_token invalid)
jwtCallback({
  token: {
    // ...
    refreshToken: "expired-refresh-token"
  }
})

// Logic:
// Try refresh → catch error → return token with error flag
{
  ...token,
  error: "RefreshAccessTokenError"  // ← session callback sẽ thấy
}

// Client nhận được session.error → hiển thị "Please sign in again"
```

### Scenario 5: Client cập nhật session

```typescript
// Client code
const { update } = useSession()
await update({ name: "New Name" })

// JWT callback:
jwtCallback({
  token: {
    sub: "user-id-123",
    name: "Old Name",
    // ...
  },
  session: {
    name: "New Name"
  },
  trigger: "update"
})

// Kết quả:
{
  ...token,
  name: "New Name"  // ← Merged từ session
}
```

## Performance Considerations

### Vấn đề: JWT callback gọi quá nhiều lần

- Mỗi server request → 1 lần gọi
- Website có 100 requests/giây → 100 lần gọi/giây
- Mỗi lần populate user data → 3 DB queries

### Giải pháp:

1. **Cache user data trong token** (đang làm)
   - Lần đầu: Query DB, lưu vào token
   - Lần sau: Dùng data trong token

2. **Không query DB nếu không cần** (có thể cải thiện)
   ```typescript
   // Chỉ populate nếu data cũ hơn 5 phút
   if (!token.lastPopulatedAt || Date.now() - token.lastPopulatedAt > 300000) {
     await populateUserData(token);
     token.lastPopulatedAt = Date.now();
   }
   ```

3. **Optimize DB queries** (đã làm)
   - Sử dụng indexes trên `User.id`, `Account.userId`
   - Không fetch toàn bộ fields, chỉ lấy cần thiết

## Debug Tips

### Enable debug logging

```typescript
apiLogger.info('🔍 JWT Callback Debug:', {
  tokenSub: token.sub,
  hasAccount: !!account,
  hasUser: !!user,
  trigger: trigger,
  tokenExpiresIn: token.expiresAt 
    ? Math.round((token.expiresAt * 1000 - Date.now()) / 1000 / 60)
    : 'N/A'
});
```

### Common issues

1. **Role không cập nhật**: Check xem `populateUserData()` có chạy không
2. **Token refresh liên tục**: Check `expiresAt` có đúng không (unix timestamp, seconds)
3. **Refresh thất bại**: Check `refresh_token` còn valid không, Google có revoke không

## Best Practices

1. **Luôn populate user data từ DB**: Đảm bảo role/permissions realtime
2. **Handle refresh error gracefully**: Set error flag thay vì throw exception
3. **Log đầy đủ**: Dùng `apiLogger` để track token lifecycle
4. **Type safety**: Mở rộng JWT interface trong `next-auth.d.ts`
5. **Secure token storage**: Dùng httpOnly cookie (NextAuth mặc định)
6. **Token rotation**: Luôn lưu `refresh_token` mới sau refresh
7. **Expiry buffer**: Refresh sớm 1 phút để tránh race condition

## Security Considerations

1. **Không expose sensitive data**: Chỉ lưu data cần thiết vào token
2. **Validate token.sub**: Luôn check user tồn tại trước khi populate
3. **Handle refresh_token carefully**: Không log refresh_token ra console
4. **Error messages**: Không leak sensitive info trong error messages
5. **Token size**: JWT có giới hạn size (~4KB), không lưu quá nhiều data

## Liên quan

- **File**: `auth/callbacks/jwt.callback.ts`
- **Được gọi từ**: `auth/auth.ts`
- **Dependencies**: 
  - `getUserById()` - Lấy user từ DB
  - `getAccountByUserId()` - Check OAuth account
  - `getTwoFactorConfirmationByUserId()` - Check 2FA
  - `refreshAccessToken()` - Refresh OAuth token
- **Type definitions**: `next-auth.d.ts`, `next-auth/jwt`
- **Related callbacks**: `session.callback.ts`, `signin.callback.ts`

## Flow tổng thể (Chi tiết)

```
┌─────────────────────────────────────────────────────────────┐
│                   Authentication Flow                        │
└─────────────────────────────────────────────────────────────┘
                              │
            ┌─────────────────┼─────────────────┐
            │                 │                 │
    Google Login      Credentials Login   Facebook Login
            │                 │                 │
            └─────────────────┼─────────────────┘
                              ▼
                    ┌─────────────────┐
                    │ signIn callback │ (validate)
                    └─────────────────┘
                              ▼
                    ┌─────────────────┐
               ┌────│  jwt callback   │────┐
               │    └─────────────────┘    │
               │                           │
        1st call                    Subsequent calls
     (has account)                  (no account)
               │                           │
               ▼                           ▼
      Save OAuth tokens          Populate user data
      Populate user data         Check expiry
               │                  Refresh if needed
               │                           │
               └───────────┬───────────────┘
                           ▼
                 ┌─────────────────┐
                 │   JWT Token     │ (httpOnly cookie)
                 └─────────────────┘
                           │
                    Every request
                           │
                           ▼
                 ┌─────────────────┐
                 │  jwt callback   │ (check & refresh)
                 └─────────────────┘
                           │
                           ▼
                 ┌─────────────────┐
                 │session callback │ (map to session)
                 └─────────────────┘
                           │
                           ▼
                 ┌─────────────────┐
                 │ Client receives │
                 │     session     │
                 └─────────────────┘
```
