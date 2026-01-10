# NextAuth Events Documentation

## 📚 Tổng quan

Events trong NextAuth là các **handlers được gọi SAU KHI một action đã hoàn thành**. Khác với callbacks (chạy trước và có thể block action), events chỉ dùng để trigger side effects.

## 🎯 Events vs Callbacks

| Aspect | Events | Callbacks |
|--------|--------|-----------|
| **Timing** | SAU action hoàn thành | TRƯỚC action thực thi |
| **Có thể block?** | ❌ Không | ✅ Có (return false) |
| **Use case** | Logging, analytics, side effects | Validation, authorization |
| **Nên throw error?** | ❌ Không (dùng try-catch) | ✅ Có thể |
| **Example** | Gửi email welcome | Kiểm tra user banned |

## 📁 Cấu trúc thư mục

```
auth/
├── auth.ts (import events)
└── events/
    ├── index.ts (barrel export)
    └── linkAccount.event.ts
```

## 🔗 linkAccount Event

### Mục đích

Xử lý logic sau khi OAuth account được liên kết với user.

### Khi nào được fired?

```
User click "Login with Google"
         ↓
NextAuth xử lý OAuth flow
         ↓
PrismaAdapter.linkAccount() → Tạo Account record trong DB
         ↓
events.linkAccount được fired ← ĐÂY!
         ↓
Cập nhật User.emailVerified
```

### Parameters

```typescript
{
  user: User;      // User object từ database
  account: Account; // Account object vừa được link
}
```

### Code example

```typescript
// auth/events/linkAccount.event.ts
export async function linkAccountEvent({
  user,
  account,
}: {
  user: User;
  account: Account;
}): Promise<void> {
  try {
    // Chỉ xử lý OAuth providers
    if (!['google', 'facebook'].includes(account.provider)) {
      return;
    }

    // ⚠️ QUAN TRỌNG: Chỉ verify email nếu KHÔNG phải temp email
    // Facebook có thể tạo temp email: facebook_123@temp.local
    const isRealEmail = user.email && !user.email.includes('@temp.local');

    if (isRealEmail) {
      // Cập nhật emailVerified vì OAuth providers đã verify email thật
      await prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: new Date() }
      });
    } else {
      // Log warning nếu là temp email
      apiLogger.warn('Skipped emailVerified for temp email', {
        userId: user.id,
        email: user.email,
      });
    }
  } catch (error) {
    // ⚠️ KHÔNG throw! Chỉ log
    apiLogger.logError('linkAccount.event', error);
  }
}
```

### 🔍 Logic xử lý email

#### Vấn đề: Facebook không cho email

Khi user đăng nhập Facebook mà **không grant email permission**:
- `signin.callback.ts` tạo temp email: `facebook_123@temp.local`
- User có thể login nhưng email chưa verified
- `emailVerified` = `null` trong database

#### Giải pháp: Conditional email verification

```typescript
const isRealEmail = user.email && !user.email.includes('@temp.local');

if (isRealEmail) {
  // ✅ Email thật → Set emailVerified
  emailVerified: new Date()
} else {
  // ❌ Temp email → Giữ emailVerified = null
  // Log warning để track
}
```

#### Flow comparison

**Scenario 1: Google OAuth (luôn có email)**
```
User login Google
    ↓
email = "real@gmail.com"
    ↓
linkAccount.event → isRealEmail = true
    ↓
emailVerified = new Date() ✅
```

**Scenario 2: Facebook với email thật**
```
User login Facebook (grant email)
    ↓
email = "real@facebook.com"
    ↓
linkAccount.event → isRealEmail = true
    ↓
emailVerified = new Date() ✅
```

**Scenario 3: Facebook KHÔNG có email**
```
User login Facebook (deny email)
    ↓
email = "facebook_123@temp.local"
    ↓
linkAccount.event → isRealEmail = false
    ↓
emailVerified = null ❌ (KHÔNG update)
    ↓
Log warning ⚠️
```

### ⚠️ Những điều KHÔNG NÊN làm

#### ❌ 1. Verify tất cả email (kể cả temp)

```typescript
// ❌ SAI: Temp email cũng được verify!
events: {
  async linkAccount({ user, account }) {
    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: new Date() } // BUG: facebook_123@temp.local cũng verified!
    });
  }
}
```

#### ✅ ĐÚNG: Kiểm tra email thật

```typescript
// ✅ ĐÚNG: Chỉ verify email thật
const isRealEmail = user.email && !user.email.includes('@temp.local');
if (isRealEmail) {
  await prisma.user.update({
    data: { emailVerified: new Date() }
  });
}
```

#### ❌ 2. Tạo Account record (adapter đã làm)

```typescript
// ❌ SAI
events: {
  async linkAccount({ user, account }) {
    // PrismaAdapter đã tạo rồi!
    await prisma.account.create({ ... }); // DUPLICATE!
  }
}
```

#### ❌ 2. Throw errors

```typescript
// ❌ SAI: Throw error sẽ break auth flow
events: {
  async linkAccount({ user }) {
    if (!user.email) {
      throw new Error("No email"); // User không login được!
    }
  }
}
```

#### ✅ ĐÚNG: Dùng try-catch

```typescript
// ✅ ĐÚNG: Graceful error handling
export async function linkAccountEvent({ user, account }) {
  try {
    const isRealEmail = user.email && !user.email.includes('@temp.local');
    
    if (isRealEmail) {
      await doSomething();
    } else {
      // Chỉ log warning, KHÔNG throw
      apiLogger.warn('Temp email detected', { email: user.email });
    }
  } catch (error) {
    apiLogger.logError('linkAccount.event', error);
    // Không throw, để auth flow tiếp tục
  }
}
```

#### ❌ 3. Block async operations

```typescript
// ❌ SAI
events: {
  async linkAccount({ user }) {
    // Nếu sendEmail bị lỗi, user không login được!
    await sendEmail(user.email); // Nếu fail → user bị stuck
  }
}
```

#### ✅ ĐÚNG: Fire and forget với queue

```typescript
// ✅ ĐÚNG
export async function linkAccountEvent({ user }) {
  try {
    // Đưa vào queue để xử lý async
    await queue.add('sendWelcomeEmail', { userId: user.id });
  } catch (error) {
    apiLogger.logError('linkAccount.event', error);
  }
}
```

## 🔄 Flow diagram

### Google OAuth Login với linkAccount event

```
┌─────────────────────────────────────────────────────┐
│ 1. User click "Login with Google"                  │
└────────────────────┬────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────┐
│ 2. NextAuth redirect → Google OAuth                │
└────────────────────┬────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────┐
│ 3. User approve → Google callback với code         │
└────────────────────┬────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────┐
│ 4. NextAuth exchange code → access_token           │
└────────────────────┬────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────┐
│ 5. signIn callback: Tạo/tìm User                   │
└────────────────────┬────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────┐
│ 6. PrismaAdapter.linkAccount()                     │
│    → INSERT INTO account (...)                     │
│    → Account record được tạo trong DB              │
└────────────────────┬────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────┐
│ 7. events.linkAccount được fired ← EVENT!         │
│    ⚠️ Kiểm tra isRealEmail                         │
│    ✅ Cập nhật emailVerified (nếu email thật)      │
│    ⚠️ Log warning (nếu temp email)                 │
│    ✅ Trigger side effects                          │
└────────────────────┬────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────┐
│ 8. jwt callback: Tạo JWT token                     │
└────────────────────┬────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────┐
│ 9. session callback: Map JWT → Session             │
└────────────────────┬────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────┐
│ 10. User được redirect về app với session          │
└─────────────────────────────────────────────────────┘
```

## 📊 Use cases cho events

### 1. ✅ Logging & Analytics

```typescript
export async function linkAccountEvent({ user, account }) {
  // Track OAuth provider usage
  analytics.track('oauth_login', {
    userId: user.id,
    provider: account.provider,
    timestamp: new Date(),
  });
}
```

### 2. ✅ Cập nhật metadata (với email validation)

```typescript
export async function linkAccountEvent({ user, account }) {
  // ⚠️ Chỉ update emailVerified nếu email thật
  const isRealEmail = user.email && !user.email.includes('@temp.local');
  
  if (isRealEmail) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: new Date(),
        lastLoginAt: new Date(),
        loginCount: { increment: 1 },
      }
    });
  } else {
    // Temp email: Chỉ update metadata khác
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        loginCount: { increment: 1 },
        // KHÔNG update emailVerified
      }
    });
  }
}
```

### 3. ✅ Trigger notifications (async)

```typescript
export async function linkAccountEvent({ user }) {
  // Đưa vào queue, không chờ
  await queue.add('sendWelcomeEmail', {
    userId: user.id,
    email: user.email,
  });
}
```

### 4. ✅ Sync với external services

```typescript
export async function linkAccountEvent({ user, account }) {
  try {
    // Sync với CRM
    await crm.createContact({
      email: user.email,
      name: user.name,
      source: account.provider,
    });
  } catch (error) {
    // Không throw, chỉ log
    apiLogger.logError('crm.sync', error);
  }
}
```

## 🚫 Use cases KHÔNG NÊN dùng events

### ❌ 1. Validation (dùng callbacks)

```typescript
// ❌ SAI: Event không thể block
events: {
  async linkAccount({ user }) {
    if (user.banned) {
      throw new Error("Banned"); // Quá muộn! User đã login rồi
    }
  }
}

// ✅ ĐÚNG: Dùng signIn callback
callbacks: {
  async signIn({ user }) {
    if (user.banned) {
      return false; // Block login
    }
    return true;
  }
}
```

### ❌ 2. Tạo records (adapter đã làm)

```typescript
// ❌ SAI: Tạo duplicate
events: {
  async linkAccount({ user, account }) {
    await prisma.account.create({ ... }); // Adapter đã tạo!
  }
}

// ✅ ĐÚNG: Để adapter xử lý
// Không cần làm gì cả!
```

### ❌ 3. Critical operations

```typescript
// ❌ SAI: Nếu payment fail, user vẫn login được
events: {
  async linkAccount({ user }) {
    await stripe.createCustomer(user); // Nếu fail?
  }
}

// ✅ ĐÚNG: Dùng callback để validate
callbacks: {
  async signIn({ user }) {
    try {
      await stripe.createCustomer(user);
      return true;
    } catch (error) {
      return false; // Block login nếu fail
    }
  }
}
```

## 📝 Best practices

### 1. ✅ Luôn dùng try-catch với email validation

```typescript
export async function linkAccountEvent({ user, account }) {
  try {
    // Validate email trước khi xử lý
    const isRealEmail = user.email && !user.email.includes('@temp.local');
    
    if (isRealEmail) {
      await doSomething();
    } else {
      apiLogger.warn('Temp email detected', { 
        userId: user.id, 
        email: user.email 
      });
    }
  } catch (error) {
    apiLogger.logError('linkAccount.event', error, {
      userId: user.id,
      provider: account.provider,
    });
    // KHÔNG throw
  }
}
```

### 2. ✅ Provider-specific logic

```typescript
export async function linkAccountEvent({ user, account }) {
  const oauthProviders = ['google', 'facebook'];
  
  // Chỉ xử lý OAuth
  if (!oauthProviders.includes(account.provider)) {
    return;
  }
  
  // Logic xử lý...
}
```

### 3. ✅ Structured logging với email type

```typescript
const isRealEmail = user.email && !user.email.includes('@temp.local');

if (isRealEmail) {
  apiLogger.info('OAuth account linked with real email', {
    userId: user.id,
    provider: account.provider,
    providerAccountId: account.providerAccountId,
    emailType: 'real',
    timestamp: new Date().toISOString(),
  });
} else {
  apiLogger.warn('OAuth account linked with temp email', {
    userId: user.id,
    provider: account.provider,
    email: user.email,
    emailType: 'temp',
    timestamp: new Date().toISOString(),
  });
}
```

### 4. ✅ Async operations → Queue

```typescript
// KHÔNG chờ sendEmail (có thể chậm)
await queue.add('sendWelcomeEmail', { userId: user.id });

// Thay vì:
await sendEmail(user.email); // ❌ Block auth flow
```

### 5. ✅ Idempotent operations với email validation

```typescript
// Event có thể được fired nhiều lần
// → Đảm bảo operation idempotent

const isRealEmail = user.email && !user.email.includes('@temp.local');

if (isRealEmail) {
  // ✅ OK: update emailVerified nhiều lần không sao
  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: new Date() }
  });
} else {
  // ⚠️ Không update emailVerified cho temp email
  // Đảm bảo temp email không bao giờ được mark verified
}

// ❌ SAI: Tạo notification mỗi lần (duplicate)
await prisma.notification.create({ ... }); 
```

### 6. ✅ Email validation helper

```typescript
// Tạo helper function để reuse
function isRealEmail(email?: string | null): boolean {
  return !!email && !email.includes('@temp.local');
}

// Sử dụng
export async function linkAccountEvent({ user, account }) {
  if (isRealEmail(user.email)) {
    // Xử lý email thật
  } else {
    // Xử lý temp email
  }
}
```

## 🧪 Testing

### Unit test

```typescript
// linkAccount.event.test.ts
import { linkAccountEvent } from './linkAccount.event';

describe('linkAccountEvent', () => {
  it('should update emailVerified for real email', async () => {
    const user = { id: '123', email: 'real@gmail.com' };
    const account = { provider: 'google', providerAccountId: '456' };

    await linkAccountEvent({ user, account });

    const updated = await prisma.user.findUnique({
      where: { id: '123' }
    });

    expect(updated.emailVerified).toBeTruthy();
  });

  it('should NOT update emailVerified for temp email', async () => {
    const user = { id: '123', email: 'facebook_456@temp.local' };
    const account = { provider: 'facebook', providerAccountId: '456' };

    await linkAccountEvent({ user, account });

    const updated = await prisma.user.findUnique({
      where: { id: '123' }
    });

    expect(updated.emailVerified).toBeNull(); // Vẫn null
  });

  it('should not throw on error', async () => {
    const user = { id: 'invalid' };
    const account = { provider: 'google' };

    // Không throw
    await expect(
      linkAccountEvent({ user, account })
    ).resolves.not.toThrow();
  });

  it('should skip non-OAuth providers', async () => {
    const user = { id: '123', email: 'test@example.com' };
    const account = { provider: 'credentials' }; // Not OAuth

    await linkAccountEvent({ user, account });

    // Không có update nào
    const updated = await prisma.user.findUnique({
      where: { id: '123' }
    });

    expect(updated.emailVerified).toBeNull();
  });
});
```

## 📚 Tham khảo

- [NextAuth Events](https://next-auth.js.org/configuration/events)
- [NextAuth Callbacks](https://next-auth.js.org/configuration/callbacks)
- [PrismaAdapter Source](https://github.com/nextauthjs/next-auth/tree/main/packages/adapter-prisma)

## 🎓 Key takeaways

1. ✅ **Events chạy SAU action** → Không thể block login flow
2. ✅ **Dùng try-catch** → KHÔNG throw errors (graceful failure)
3. ✅ **Adapter tạo records** → KHÔNG tạo duplicate Account
4. ✅ **Validate email type** → Chỉ verify email thật, không verify temp email
5. ✅ **Async operations** → Dùng queue để không block
6. ✅ **Critical logic** → Dùng callbacks thay vì events
7. ✅ **Structured logging** → Track email type (real vs temp)

## 🐛 Common pitfalls

### 1. ❌ Verify temp email

```typescript
// ❌ BUG: Temp email cũng được verified
await prisma.user.update({
  data: { emailVerified: new Date() } // facebook_123@temp.local verified!
});
```

**Fix**: Kiểm tra `!email.includes('@temp.local')`

### 2. ❌ Throw errors trong events

```typescript
// ❌ BUG: User không login được
if (!user.email) throw new Error("No email");
```

**Fix**: Dùng try-catch và log, không throw

### 3. ❌ Tạo duplicate records

```typescript
// ❌ BUG: Adapter đã tạo, code này tạo thêm
await prisma.account.create({ ... });
```

**Fix**: Để adapter xử lý, không tạo trong event

---

