# Session Callback Documentation

## Tổng quan

File `session.callback.ts` chứa logic xử lý mapping từ JWT token sang Session object. Callback này được NextAuth **tự động gọi** mỗi khi client request session data (ví dụ: `useSession()` hook, `auth()` server function).

## Mục đích

Session callback có nhiệm vụ:
1. **Map dữ liệu từ JWT token vào session object** để client có thể access
2. **Thêm custom fields** như role, isOAuth, 2FA status vào session
3. **Expose access token** (nếu cần) để client có thể gọi external APIs
4. **Truyền error state** từ token refresh process đến client

## Cấu trúc Callback

```typescript
export async function sessionCallback(params: {
  session: Session;
  token: JWT;
  user?: any;
})
```

## Giải thích Parameters

### 1. `session: Session` (Luôn có)

- **Nguồn**: Object session ban đầu do NextAuth tạo ra
- **Nội dung mặc định**: Chỉ chứa `user.name`, `user.email`, `user.image`, `expires`
- **Ví dụ ban đầu**:
  ```typescript
  {
    user: {
      name: "John Doe",
      email: "john@example.com",
      image: "https://..."
    },
    expires: "2026-01-14T12:00:00.000Z"
  }
  ```

### 2. `token: JWT` (Luôn có)

- **Nguồn**: JWT token đã được populate từ `jwt` callback
- **Nội dung**: Chứa tất cả data đã được lưu trong JWT (user info, role, tokens, v.v.)
- **Ví dụ**:
  ```typescript
  {
    sub: "user-id-123",              // User ID
    name: "John Doe",
    email: "john@example.com",
    role: "USER",                    // Custom field
    isOAuth: true,                   // Custom field
    isTwoFactorEnabled: false,       // Custom field
    is2FAVerified: false,            // Custom field
    accessToken: "ya29.a0AfH6...",  // OAuth access token
    refreshToken: "1//0gHZ...",      // OAuth refresh token
    expiresAt: 1704614400,           // Token expiry timestamp
    error: null,                     // Error from token refresh
    iat: 1704528000,                 // Issued at
    exp: 1705132800                  // JWT expiry
  }
  ```

### 3. `user?: any` (Optional)

- **Nguồn**: Chỉ có khi sử dụng **database session strategy**
- **Khi nào có**: 
  - ✅ Strategy `database` → có user từ DB
  - ❌ Strategy `jwt` → không có (project này dùng JWT)
- **Lưu ý**: Project này dùng JWT strategy nên `user` luôn là `undefined`

## Tại sao cần Session Callback?

### Vấn đề: JWT token không thể access trực tiếp từ client

NextAuth sử dụng **httpOnly cookie** để lưu JWT token → Client JavaScript không thể đọc token này (bảo mật).

```typescript
// ❌ Client KHÔNG thể làm điều này:
const token = document.cookie // Cannot read httpOnly cookie
const role = token.role       // Cannot access
```

### Giải pháp: Session callback làm cầu nối

Session callback lấy data từ JWT token và "expose" chúng qua session object mà client có thể access:

```typescript
// ✅ Client CÓ THỂ làm điều này:
const { data: session } = useSession()
const role = session.user.role  // ✅ Có thể access
const isOAuth = session.user.isOAuth  // ✅ Có thể access
```

## Luồng dữ liệu

```
┌─────────────────────────────────────────────────────────────┐
│                     Authentication Flow                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   JWT Callback  │ ← Populate token với user data
                    └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   JWT Token     │ ← Stored in httpOnly cookie
                    │  (client can't  │
                    │   read directly)│
                    └─────────────────┘
                              │
                              ▼
                ┌─────────────────────────────┐
                │   Client requests session   │ ← useSession() or auth()
                └─────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │Session Callback │ ← Map token → session
                    └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │ Session Object  │ ← Client CAN access this
                    └─────────────────┘
```

## Logic xử lý trong Callback

### 1. Kiểm tra session.user tồn tại

```typescript
if (!session.user) return session;
```

**Lý do**: Đảm bảo session có user object trước khi mapping. Trường hợp edge case khi session chưa được initialize đúng.

### 2. Map dữ liệu cơ bản

```typescript
session.user.id = token.sub || "";
session.user.name = token.name;
session.user.email = token.email as string;
```

**Giải thích**:
- `token.sub` = Subject (user ID) từ JWT standard claim
- `token.name`, `token.email` = Thông tin cơ bản đã được lưu trong JWT

### 3. Map custom fields (Authorization & Authentication state)

```typescript
session.user.role = token.role as UserRole;
session.user.isOAuth = token.isOAuth as boolean;
session.user.isTwoFactorEnabled = token.isTwoFactorEnabled as boolean;
session.user.is2FAVerified = token.is2FAVerified as boolean;
```

**Mục đích**:
- `role`: Dùng cho phân quyền (ADMIN, USER)
- `isOAuth`: Kiểm tra user đăng nhập qua OAuth hay Credentials
- `isTwoFactorEnabled`: User có bật 2FA không
- `is2FAVerified`: User đã verify 2FA trong session này chưa

### 4. Thêm OAuth access token (Optional)

```typescript
if (token.accessToken) {
  session.accessToken = token.accessToken as string;
}
```

**Khi nào cần**:
- Client cần gọi Google APIs (Gmail, Drive, Calendar, v.v.)
- Client cần gọi Facebook Graph API
- Cần forward access token đến backend APIs khác

**Lưu ý bảo mật**: Chỉ expose access token khi thật sự cần thiết. Token có thể bị leak qua client-side code.

### 5. Truyền error state

```typescript
if (token.error) {
  session.error = token.error as string;
}
```

**Khi nào có error**:
- Token refresh thất bại (`RefreshAccessTokenError`)
- OAuth provider từ chối refresh request
- Network issues khi gọi token refresh endpoint

**Client có thể handle**:
```typescript
const { data: session } = useSession()

if (session?.error === "RefreshAccessTokenError") {
  // Show "Please sign in again" message
  signOut({ callbackUrl: '/auth/login' })
}
```

## So sánh Session trước và sau callback

### Trước khi qua Session Callback (Default NextAuth session)

```typescript
{
  user: {
    name: "John Doe",
    email: "john@example.com",
    image: "https://..."
  },
  expires: "2026-01-14T12:00:00.000Z"
}
```

### Sau khi qua Session Callback (Custom session)

```typescript
{
  user: {
    id: "user-id-123",              // ✅ Added
    name: "John Doe",
    email: "john@example.com",
    image: "https://...",
    role: "USER",                   // ✅ Added
    isOAuth: true,                  // ✅ Added
    isTwoFactorEnabled: false,      // ✅ Added
    is2FAVerified: false            // ✅ Added
  },
  accessToken: "ya29.a0AfH6...",    // ✅ Added (optional)
  error: null,                      // ✅ Added (optional)
  expires: "2026-01-14T12:00:00.000Z"
}
```

## Khi nào Session Callback được gọi?

### Server-side

```typescript
// 1. Trong Server Components
import { auth } from '@/auth/auth'

export default async function Page() {
  const session = await auth() // ← Session callback được gọi
  return <div>Hello {session?.user.name}</div>
}

// 2. Trong API Routes
export async function GET(req: Request) {
  const session = await auth() // ← Session callback được gọi
  if (!session) return new Response('Unauthorized', { status: 401 })
  // ...
}

// 3. Trong Server Actions
export async function updateProfile() {
  const session = await auth() // ← Session callback được gọi
  if (session?.user.role !== 'ADMIN') throw new Error('Forbidden')
  // ...
}
```

### Client-side

```typescript
// 1. Sử dụng useSession hook
'use client'
import { useSession } from 'next-auth/react'

export function ProfileCard() {
  const { data: session, status } = useSession() // ← Session callback được gọi
  
  if (status === 'loading') return <div>Loading...</div>
  if (status === 'unauthenticated') return <div>Not signed in</div>
  
  return <div>Welcome {session?.user.name}</div>
}

// 2. Sử dụng getSession
import { getSession } from 'next-auth/react'

async function checkAuth() {
  const session = await getSession() // ← Session callback được gọi
  if (session?.user.role === 'ADMIN') {
    // Show admin UI
  }
}
```

## Tần suất gọi

- **Mỗi request**: Session callback được gọi mỗi khi client/server request session
- **Không cache**: Luôn tính toán lại từ JWT token (vì JWT có thể thay đổi sau refresh)
- **Performance**: Vì chỉ là mapping, performance impact rất nhỏ

## Type Safety

Cần mở rộng NextAuth types để TypeScript biết về custom fields:

### `next-auth.d.ts`

```typescript
import { UserRole } from "@prisma/client"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: UserRole
      isOAuth?: boolean
      isTwoFactorEnabled?: boolean
      is2FAVerified?: boolean
    } & DefaultSession["user"]
    accessToken?: string
    error?: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: UserRole
    isOAuth?: boolean
    isTwoFactorEnabled?: boolean
    is2FAVerified?: boolean
    accessToken?: string
    refreshToken?: string
    expiresAt?: number
    error?: string
  }
}
```

## Debug Logging

Callback có 2 điểm log để debug:

### 1. Log Before (Debug token state)

```typescript
apiLogger.debug('🔍 Session Callback Debug:', {
  tokenRole: token.role,
  tokenEmail: token.email,
  sessionUserBefore: session.user.role
});
```

**Mục đích**: Kiểm tra dữ liệu trong token trước khi map

### 2. Log After (Verify mapping)

```typescript
apiLogger.debug('🔍 Session Final:', {
  sessionUserRole: session.user.role,
  sessionUserEmail: session.user.email
});
```

**Mục đích**: Verify session đã được populate đúng

## Use Cases thực tế

### 1. Phân quyền trong UI

```typescript
'use client'
import { useSession } from 'next-auth/react'

export function AdminPanel() {
  const { data: session } = useSession()
  
  if (session?.user.role !== 'ADMIN') {
    return <div>Access Denied</div>
  }
  
  return <AdminDashboard />
}
```

### 2. Conditional rendering dựa trên OAuth

```typescript
export function ProfileSettings() {
  const { data: session } = useSession()
  
  return (
    <div>
      {session?.user.isOAuth ? (
        <div>Connected via {session.user.email}</div>
      ) : (
        <ChangePasswordForm /> // Chỉ show nếu đăng nhập credentials
      )}
    </div>
  )
}
```

### 3. Handle 2FA flow

```typescript
export function SecureAction() {
  const { data: session } = useSession()
  
  if (session?.user.isTwoFactorEnabled && !session.user.is2FAVerified) {
    return <TwoFactorPrompt />
  }
  
  return <SensitiveOperation />
}
```

### 4. Call external APIs với access token

```typescript
async function syncGoogleCalendar() {
  const session = await getSession()
  
  if (!session?.accessToken) {
    throw new Error('No access token available')
  }
  
  const response = await fetch('https://www.googleapis.com/calendar/v3/calendars', {
    headers: {
      'Authorization': `Bearer ${session.accessToken}`
    }
  })
  
  return response.json()
}
```

## Best Practices

1. **Chỉ expose dữ liệu cần thiết**: Không map toàn bộ token vào session để tránh leak sensitive data
2. **Type safety**: Luôn mở rộng NextAuth types để có autocomplete và type checking
3. **Debug logging**: Sử dụng `apiLogger.debug` để track data flow, dễ troubleshoot
4. **Handle edge cases**: Kiểm tra `session.user` tồn tại trước khi mapping
5. **Conditional expose**: Chỉ expose `accessToken` khi thật sự cần cho external APIs
6. **Error propagation**: Truyền error từ token refresh để client có thể handle

## Liên quan

- **File**: `auth/callbacks/session.callback.ts`
- **Được gọi từ**: `auth/auth.ts`
- **Phụ thuộc**: `jwt.callback.ts` (populate token trước)
- **Type definitions**: `next-auth.d.ts`
- **Client hooks**: `useSession()`, `getSession()`
- **Server functions**: `auth()`

## Flow tổng thể (JWT + Session)

```
User Login
    ↓
signIn callback (validate)
    ↓
jwt callback (populate token với user data)
    ↓
JWT Token stored in httpOnly cookie
    ↓
Client requests session
    ↓
session callback (map token → session object)
    ↓
Client receives session
    ↓
Client uses session.user.role, session.accessToken, etc.
```
