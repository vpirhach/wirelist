# Frontend Endpoints Migration List

This document lists all API endpoints used by the frontend that need to be migrated from the Java Spring Boot backend to the Node.js NestJS backend.

## 📋 Migration Status Overview

| Category               | Status             | Priority | Endpoints     |
| ---------------------- | ------------------ | -------- | ------------- |
| **Authentication**     | ✅ **COMPLETED**   | High     | 8/8 endpoints |
| **Wires Management**   | 🔄 **IN PROGRESS** | High     | 5/5 endpoints |
| **Units & Panels**     | ❌ **PENDING**     | Medium   | 2/2 endpoints |
| **File Upload**        | ❌ **PENDING**     | Medium   | 1/1 endpoint  |
| **Wire Changes/Audit** | ❌ **PENDING**     | Low      | 1/1 endpoint  |
| **Progress/SSE**       | ❌ **PENDING**     | Low      | 1/1 endpoint  |

---

## 🔐 Authentication Endpoints (✅ COMPLETED)

**File:** `src/api/auth.ts`  
**Backend:** Node.js (V2) ✅

| Method | Endpoint                    | Description             | Status      |
| ------ | --------------------------- | ----------------------- | ----------- |
| POST   | `/api/auth/login`           | User login              | ✅ Migrated |
| POST   | `/api/auth/register`        | User registration       | ✅ Migrated |
| POST   | `/api/auth/refresh`         | Refresh JWT token       | ✅ Migrated |
| GET    | `/api/auth/profile`         | Get user profile        | ✅ Migrated |
| POST   | `/api/auth/validate`        | Validate JWT token      | ✅ Migrated |
| PUT    | `/api/auth/change-password` | Change user password    | ✅ Migrated |
| PUT    | `/api/auth/activate/{id}`   | Activate user (Admin)   | ✅ Migrated |
| PUT    | `/api/auth/deactivate/{id}` | Deactivate user (Admin) | ✅ Migrated |

---

## 🔌 Wires Management Endpoints (🔄 IN PROGRESS)

**File:** `src/api/wireslist.ts`  
**Backend:** Java (V1) → Node.js (V2)  
**Priority:** HIGH

| Method | Endpoint             | Description                 | Status     | Migration Notes                             |
| ------ | -------------------- | --------------------------- | ---------- | ------------------------------------------- |
| GET    | `/wires`             | Get paginated wires list    | ❌ Pending | ✅ Basic endpoint exists, needs enhancement |
| GET    | `/wires/search`      | Search wires with keyword   | ❌ Pending | Need to implement search functionality      |
| PUT    | `/wires/{id}`        | Update wire                 | ❌ Pending | Need to implement update endpoint           |
| DELETE | `/wires/{id}`        | Delete wire                 | ❌ Pending | Need to implement delete endpoint           |
| POST   | `/wires`             | Create new wire             | ❌ Pending | Need to implement create endpoint           |
| GET    | `/wires/unitSummary` | Get unit summary statistics | ❌ Pending | Need to implement statistics endpoint       |

### Current Implementation Status:

- ✅ Basic `GET /wires` with pagination exists
- ❌ Missing search functionality
- ❌ Missing CRUD operations (Create, Update, Delete)
- ❌ Missing unit summary statistics

---

## 🏢 Units & Panels Endpoints (❌ PENDING)

**File:** `src/api/unitsAndPanels.ts`  
**Backend:** Java (V1) → Node.js (V2)  
**Priority:** MEDIUM

| Method | Endpoint              | Description    | Status     |
| ------ | --------------------- | -------------- | ---------- |
| GET    | `/unit-panels/units`  | Get all units  | ❌ Pending |
| GET    | `/unit-panels/panels` | Get all panels | ❌ Pending |

### Usage in Frontend:

- Used in `src/stores/wires.ts` for filtering
- Used in `src/components/Header.vue` for dropdowns

---

## 📁 File Upload Endpoints (❌ PENDING)

**File:** `src/api/upload.ts`  
**Backend:** Java (V1) → Node.js (V2)  
**Priority:** MEDIUM

| Method | Endpoint        | Description           | Status     |
| ------ | --------------- | --------------------- | ---------- |
| POST   | `/wires/upload` | Upload Excel/CSV file | ❌ Pending |

### Upload Features:

- File upload with FormData
- `isDeleteAllInList` parameter
- Returns `processId` for progress tracking

---

## 📊 Wire Changes/Audit Endpoints (❌ PENDING)

**File:** `src/api/wireChanges.ts`  
**Backend:** Java (V1) → Node.js (V2)  
**Priority:** LOW

| Method | Endpoint           | Description             | Status     |
| ------ | ------------------ | ----------------------- | ---------- |
| GET    | `/api/wire-audits` | Get wire change history | ❌ Pending |

### Features:

- Paginated audit trail
- Filter by date range
- Show CREATE/UPDATE/DELETE operations
- Author information

---

## 📡 Server-Sent Events (SSE) (❌ PENDING)

**File:** `src/services/sseService.ts`  
**Backend:** Java (V1) → Node.js (V2)  
**Priority:** LOW

| Method | Endpoint                              | Description             | Status     |
| ------ | ------------------------------------- | ----------------------- | ---------- |
| GET    | `/api/progress/subscribe/{processId}` | SSE for upload progress | ❌ Pending |

### Features:

- Real-time progress updates
- Upload status tracking
- Message logging
- Process completion notifications

---

## 🎯 Migration Priority Order

### Phase 1: Core Wires Management (HIGH PRIORITY)

1. **Enhance existing `/wires` endpoint**
   - Add search functionality
   - Add filtering by unit/panel
   - Add sorting options

2. **Implement CRUD operations**
   - `POST /wires` - Create wire
   - `PUT /wires/{id}` - Update wire
   - `DELETE /wires/{id}` - Delete wire

3. **Add statistics endpoint**
   - `GET /wires/unitSummary` - Unit summary

### Phase 2: Supporting Features (MEDIUM PRIORITY)

4. **Units & Panels endpoints**
   - `GET /unit-panels/units`
   - `GET /unit-panels/panels`

5. **File Upload**
   - `POST /wires/upload`
   - `GET /api/progress/subscribe/{processId}` (SSE)

### Phase 3: Advanced Features (LOW PRIORITY)

6. **Audit/Changes**
   - `GET /api/wire-audits`

---

## 🔧 Implementation Notes

### Data Models Required:

```typescript
// Wire model (already exists)
interface Wire {
  id: number;
  fromDestination: string;
  toDestination: string;
  wireCodeId: number;
  colorId: number;
  ioTypeId: string;
  sub: number;
  word: number;
  bits: number;
  power: string;
  origin: string;
  wireNumber: string;
  hwModelsId: number;
  remarks: string;
  noteCode: string;
  changeNumber: string;
  changeDate: string;
  hwAddress: string;
  coord: string;
  decommissioned: string;
  createdAt: string;
}

// Unit Summary model
interface UnitSummary {
  total: number;
  unit: string;
}

// Wire Change model
interface WireChange {
  id: number;
  // ... wire fields
  auditType: 'DELETE' | 'CREATE' | 'UPDATE';
  reason: string;
  auditDate: string;
  author: string;
}
```

### Response Format Compatibility:

All endpoints must return responses compatible with the existing frontend expectations:

```typescript
// Paginated response format
interface PaginatedResponse<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  last: boolean;
  size: number;
  number: number;
  sort: null;
  first: boolean;
  numberOfElements: number;
  pageable: {
    offset: number;
    pageNumber: number;
    pageSize: number;
  };
}
```

---

## 🚀 Next Steps

1. **Start with Phase 1** - Enhance the existing wires endpoint
2. **Implement CRUD operations** for wires management
3. **Add search and filtering** capabilities
4. **Create unit summary endpoint**
5. **Test with frontend** to ensure compatibility
6. **Move to Phase 2** - Units, panels, and file upload
7. **Implement Phase 3** - Audit and SSE features

---

## 📝 Notes

- All endpoints should maintain the same request/response format as the Java backend
- JWT authentication is already working for all endpoints
- Database connection is established and working
- Frontend is configured to use both backends via `API_CONFIG.features`
- Migration can be done incrementally without breaking existing functionality
