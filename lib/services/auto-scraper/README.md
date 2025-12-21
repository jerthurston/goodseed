# Auto Scraper Services Documentation

## 📋 **Services Overview**

Auto Scraper system có **2 service layers** riêng biệt với chức năng và trách nhiệm khác nhau:

### **1️⃣ AutoScraperScheduler** - Backend Service Layer
### **2️⃣ AutoScraperService** - Frontend Service Layer

---

## 🔧 **Service Architecture**

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend Layer                       │
│  React Components, Hooks (useAutoScraper)              │
└─────────────────┬───────────────────────────────────────┘
                  │ 
                  ▼ HTTP Calls
┌─────────────────────────────────────────────────────────┐
│              Frontend Service Layer                     │
│  lib/services/auto-scraper.service.ts  ✅ CREATED      │ ← **Client-Side**
│  - startAllAutoScraper()                                │
│  - stopAllAutoScraper()                                 │
│  - startSellerAutoScraper()                             │
│  - getSellerAutoScraperStatus()                         │
└─────────────────┬───────────────────────────────────────┘
                  │ 
                  ▼ API Calls
┌─────────────────────────────────────────────────────────┐
│                   API Layer                             │
│  app/api/admin/scraper/schedule-all/route.ts           │
│  app/api/admin/sellers/[id]/scraper/schedule/route.ts  │
└─────────────────┬───────────────────────────────────────┘
                  │ 
                  ▼ Business Logic
┌─────────────────────────────────────────────────────────┐
│              Backend Service Layer                      │
│  lib/services/auto-scraper-scheduler.service.ts ✅     │ ← **Server-Side**
│  - initializeAllAutoJobs()                              │
│  - stopAllAutoJobs()                                    │
│  - scheduleSellerAutoJob()                              │
└─────────────────┬───────────────────────────────────────┘
                  │ 
                  ▼ Database & Queue Operations
┌─────────────────────────────────────────────────────────┐
│              Infrastructure Layer                       │
│  lib/helpers/server/scheduleAutoScrapeJob.ts           │
│  lib/queue/scraper-queue.ts                            │
│  Database (Prisma), Queue (Bull.js)                    │
└─────────────────────────────────────────────────────────┘
```

---

## 📂 **1. AutoScraperScheduler Service** - Backend Business Logic

### **📁 File:** `lib/services/auto-scraper/auto-scraper-scheduler.service.ts`

#### **🎯 Purpose:**
- **Layer:** Infrastructure + Business Logic (Server-side only)
- **Position:** Giữa API endpoints và database/queue operations
- **Responsibility:** Core business logic cho auto scraper system

#### **📊 Methods:**

```typescript
export class AutoScraperScheduler {
  // Bulk Operations
  static async initializeAllAutoJobs()     // Lấy sellers từ DB + tạo jobs
  static async stopAllAutoJobs()           // Stop tất cả jobs + cleanup
  
  // Individual Operations  
  static async scheduleSellerAutoJob()     // Schedule 1 seller specific
  static async unscheduleSellerAutoJob()   // Unschedule 1 seller
  
  // System Operations
  static async initializeOnServerStart()   // Worker startup logic
  static async getAutoScraperHealth()      // Health monitoring
}
```

#### **💡 Characteristics:**
- **✅ Direct Database Access:** Sử dụng `prisma` trực tiếp
- **✅ Queue Integration:** Call `createScheduleAutoScrapeJob()`, `unscheduleAutoScrapeJob()`
- **✅ Business Logic:** Complex logic cho bulk operations, health monitoring
- **✅ Server-Only:** Không được gọi từ frontend/client-side
- **✅ Dependencies:** `prisma`, `Bull.js`, helper functions

#### **🔧 Used By:**
- API endpoints (`/api/admin/scraper/schedule-all`)
- Worker initialization (`lib/workers/scraper-worker.ts`)
- Health monitoring systems
- Server startup processes

---

## 📂 **2. AutoScraperService** - Frontend HTTP Client

### **📁 File:** `lib/services/auto-scraper.service.ts`

#### **🎯 Purpose:**
- **Layer:** Frontend Abstraction (Client-side focused)
- **Position:** Giữa React components và API endpoints
- **Responsibility:** HTTP client wrapper cho frontend consumption

#### **📊 Methods:**

```typescript
export class AutoScraperService {
  // API wrappers - HTTP calls only
  static async startAllAutoScraper()           // POST /admin/scraper/schedule-all
  static async stopAllAutoScraper()            // DELETE /admin/scraper/schedule-all  
  static async startSellerAutoScraper()        // POST /admin/sellers/{id}/scraper/schedule
  static async stopSellerAutoScraper()         // DELETE /admin/sellers/{id}/scraper/schedule
  static async getSellerAutoScraperStatus()    // GET /admin/sellers/{id}/scraper/schedule
  static async getAutoScraperHealth()          // GET /admin/scraper/schedule-all
}
```

#### **💡 Characteristics:**
- **✅ HTTP Client Only:** Sử dụng `api` (axios) để call APIs
- **❌ No Database Access:** Không trực tiếp access database
- **✅ Frontend Ready:** Có thể import và sử dụng trong React components
- **✅ Error Handling:** Format errors cho frontend consumption
- **✅ Dependencies:** `axios`, `apiLogger` only

#### **🔧 Used By:**
- React hooks (`hooks/admin/useAutoScraper.ts`)
- Frontend components
- Client-side logic
- Dashboard UI controls

---

## 📋 **Detailed Comparison**

| **Aspect** | **AutoScraperScheduler** | **AutoScraperService** |
|------------|---------------------------|------------------------|
| **Location** | Server-side only | Client + Server |
| **Purpose** | Core business logic | HTTP API wrapper |
| **Database** | ✅ Direct Prisma access | ❌ No database access |
| **Queue** | ✅ Direct Bull.js calls | ❌ No queue access |
| **HTTP** | ❌ No API calls | ✅ Only API calls |
| **Used By** | API endpoints, Workers | React hooks, Components |
| **Error Handling** | Database/Queue errors | HTTP/Network errors |
| **Complexity** | HIGH (business logic) | LOW (HTTP wrappers) |
| **Dependencies** | Prisma, Bull, Helpers | Axios, ApiLogger |
| **Import Location** | Server-side files only | Client + Server files |
| **Testing** | Integration with DB/Queue | API endpoint testing |

---

## 🚀 **Usage Examples**

### **Backend Usage (AutoScraperScheduler):**

```typescript
// In API endpoint
import { AutoScraperScheduler } from '@/lib/services/auto-scraper/auto-scraper-scheduler.service';

export async function POST() {
  const results = await AutoScraperScheduler.initializeAllAutoJobs();
  return NextResponse.json({ data: results });
}

// In worker process
import { AutoScraperScheduler } from '@/lib/services/auto-scraper/auto-scraper-scheduler.service';

// Server startup initialization
await AutoScraperScheduler.initializeOnServerStart();
```

### **Frontend Usage (AutoScraperService):**

```typescript
// In React hook
import { AutoScraperService } from '@/lib/services/auto-scraper.service';

export function useAutoScraper() {
  const startAll = useMutation({
    mutationFn: AutoScraperService.startAllAutoScraper,
    onSuccess: (data) => {
      toast.success(`Started ${data.data.scheduled} auto scrapers`);
    }
  });
}

// In React component
import { AutoScraperService } from '@/lib/services/auto-scraper.service';

const handleStartAll = async () => {
  try {
    const result = await AutoScraperService.startAllAutoScraper();
    console.log('Started:', result.data.scheduled);
  } catch (error) {
    console.error('Failed:', error);
  }
};
```

---

## 💡 **Design Principles**

### **🔹 Separation of Concerns:**
- **AutoScraperScheduler:** Backend business logic, database operations
- **AutoScraperService:** Frontend abstraction, HTTP communication

### **🔹 Clean Architecture:**
- **Server Layer:** Complex business logic, data persistence, queue management
- **Client Layer:** HTTP calls, error formatting, logging for UI

### **🔹 Single Responsibility:**
- **Scheduler:** Database queries, job scheduling, system health
- **Service:** API communication, response formatting

### **🔹 Reusability:**
- **Scheduler:** Used by multiple server-side consumers
- **Service:** Used by multiple frontend components

---

## 🔄 **Data Flow**

### **Frontend → Backend Flow:**
```
React Component 
  → AutoScraperService (HTTP call)
    → API Endpoint 
      → AutoScraperScheduler (business logic)
        → Database/Queue Operations
```

### **Backend → Frontend Flow:**
```
Database/Queue 
  → AutoScraperScheduler (format data)
    → API Response
      → AutoScraperService (handle response)
        → React Component (update UI)
```

---

## 📈 **Benefits of This Architecture**

### **🎯 Maintainability:**
- Clear separation between client và server concerns
- Easy to modify without affecting other layers

### **🎯 Testability:**
- Backend logic có thể test độc lập
- Frontend HTTP calls có thể mock easily

### **🎯 Scalability:**
- Backend service có thể handle multiple consumers
- Frontend service có thể reuse across components

### **🎯 Security:**
- Database access chỉ ở server layer
- Frontend chỉ access qua controlled APIs

---

## 🧪 **Testing Strategy**

### **AutoScraperScheduler Testing:**
```typescript
// Test database operations
// Test job scheduling logic
// Test error handling
// Integration tests với Prisma và Bull.js
```

### **AutoScraperService Testing:**
```typescript
// Test API calls
// Test error handling
// Mock HTTP responses
// Integration tests với real API endpoints
```

---

## 🚀 **Current Status**

- **✅ AutoScraperScheduler:** Implemented và tested
- **✅ AutoScraperService:** Created và ready for testing
- **⏳ Integration Testing:** In progress
- **🔜 React Hook:** Ready for implementation
- **🔜 Dashboard UI:** Waiting for hooks

**Next Steps:** Test AutoScraperService integration → Create React hooks → Dashboard UI