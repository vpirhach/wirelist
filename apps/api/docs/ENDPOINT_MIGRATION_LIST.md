# Endpoint Migration List: Java → Node.js

## Overview

This document lists all endpoints from the Java backend that need to be migrated to the Node.js (NestJS) backend.

| Status | Count |
|--------|-------|
| ✅ Implemented | 22 |
| ❌ Not Implemented | 12 |
| ⏭️ Skipped (unused) | 1 |
| **Total** | **35** |

---

## 1. Authentication Controller (`/api/auth`)

| # | Method | Endpoint | Java | Node.js | Priority | Notes |
|---|--------|----------|------|---------|----------|-------|
| 1 | POST | `/login` | ✅ | ✅ Done | - | Fully implemented |
| 2 | POST | `/register` | ✅ | ✅ Done | - | Fully implemented |
| 3 | POST | `/refresh` | ✅ | ✅ Done | - | Fully implemented |
| 4 | GET | `/profile` | ✅ | ✅ Done | - | Fully implemented |
| 5 | POST | `/change-password` | ✅ | ✅ Done | - | Fully implemented |
| 6 | POST | `/admin/deactivate/:userId` | ✅ | ✅ Done | - | Admin only |
| 7 | POST | `/admin/activate/:userId` | ✅ | ✅ Done | - | Admin only |
| 8 | GET | `/validate` | ✅ | ✅ Done | - | Fully implemented |

**Auth Status:** ✅ **100% Complete**

---

## 2. Wire Controller (`/wires`)

| # | Method | Endpoint | Java | Node.js | Priority | Notes |
|---|--------|----------|------|---------|----------|-------|
| 1 | GET | `/` | ✅ | ✅ Done | - | With pagination & filters |
| 2 | GET | `/:id` | ✅ | ✅ Done | - | Get by ID |
| 3 | POST | `/` | ✅ | ✅ Done | - | Create new wire + audit |
| 4 | PUT | `/:id` | ✅ | ✅ Done | - | Update wire + audit |
| 5 | DELETE | `/:id` | ✅ | ✅ Done | - | Delete wire + audit (Admin) |
| 6 | GET | `/byUnit` | ✅ | ✅ Done | - | Dedicated endpoint |
| 7 | GET | `/byPanel` | ✅ | ✅ Done | - | Dedicated endpoint |
| 8 | GET | `/unitSummary` | ✅ | ✅ Done | - | Full implementation |
| 9 | GET | `/search` | ✅ | ✅ Done | - | Search by keyword |
| 10 | POST | `/upload` | ✅ | ❌ TODO | 🔴 High | CSV file upload |
| 11 | DELETE | `/dev/delete-all` | ✅ | ✅ Done | - | Dev endpoint (Admin) |

**Wire Status:** ✅ **91% Complete** (10/11)

---

## 3. Wire Audit Controller (`/api/wire-audits`)

| # | Method | Endpoint | Java | Node.js | Priority | Notes |
|---|--------|----------|------|---------|----------|-------|
| 1 | GET | `/` | ✅ | ❌ TODO | 🔴 High | All audits paginated |
| 2 | GET | `/wire/:wireId` | ✅ | ❌ TODO | 🔴 High | Audits by wire ID |
| 3 | GET | `/type/:auditType` | ✅ | ❌ TODO | 🟠 Medium | By type (CREATE/UPDATE/DELETE) |
| 4 | GET | `/author/:author` | ✅ | ❌ TODO | 🟠 Medium | By author username |
| 5 | GET | `/date-range` | ✅ | ❌ TODO | 🟠 Medium | By date range |
| 6 | GET | `/wire/:wireId/latest` | ✅ | ❌ TODO | 🟠 Medium | Latest audit for wire |
| 7 | GET | `/wire/:wireId/type/:auditType` | ✅ | ❌ TODO | 🟡 Low | By wire and type |

**Audit Status:** ❌ **0% Complete** (0/7)

---

## 4. Unit Panel Controller (`/unit-panels`)

| # | Method | Endpoint | Java | Node.js | Priority | Notes |
|---|--------|----------|------|---------|----------|-------|
| 1 | GET | `/units` | ✅ | ✅ Done | - | All unit codes |
| 2 | GET | `/panels` | ✅ | ✅ Done | - | All panel codes |
| 3 | GET | `/units/:unitCode/panels` | ✅ | ✅ Done | - | Panels by unit |
| 4 | GET | `/wires` | ✅ | ❌ Skip | 🟡 Low | Not used by frontend |

**Unit Panel Status:** ✅ **100% Complete** (3/3 used endpoints)

---

## 5. Backup Controller (`/api/backup`)

| # | Method | Endpoint | Java | Node.js | Priority | Notes |
|---|--------|----------|------|---------|----------|-------|
| 1 | POST | `/create` | ✅ | ❌ TODO | 🟡 Low | Manual backup trigger |
| 2 | GET | `/status` | ✅ | ❌ TODO | 🟡 Low | Backup status & history |
| 3 | POST | `/cleanup` | ✅ | ❌ TODO | 🟡 Low | Cleanup old backups |
| 4 | GET | `/config` | ✅ | ❌ TODO | 🟡 Low | Backup configuration |

**Backup Status:** ❌ **0% Complete** (0/4)

---

## 6. Progress Controller (`/api/progress`)

| # | Method | Endpoint | Java | Node.js | Priority | Notes |
|---|--------|----------|------|---------|----------|-------|
| 1 | GET | `/subscribe/:processId` | ✅ | ❌ TODO | 🟠 Medium | SSE for CSV upload progress |

**Progress Status:** ❌ **0% Complete** (0/1)

---

## Migration Priority Order

### 🔴 Phase 1 - Critical (Core CRUD)
1. `POST /wires` - Create wire
2. `PUT /wires/:id` - Update wire  
3. `DELETE /wires/:id` - Delete wire
4. `GET /unit-panels/units` - Get all units
5. `GET /unit-panels/panels` - Get all panels

### 🟠 Phase 2 - Important (Audit & Search)
6. `GET /api/wire-audits` - Get all audits
7. `GET /api/wire-audits/wire/:wireId` - Wire audit history
8. `GET /wires/search` - Search wires
9. `GET /api/progress/subscribe/:processId` - SSE progress

### 🟡 Phase 3 - Enhancement
10. `POST /wires/upload` - CSV upload
11. `GET /api/wire-audits/type/:type` - Audits by type
12. `GET /api/wire-audits/author/:author` - Audits by author
13. `GET /api/wire-audits/date-range` - Audits by date
14. `GET /unit-panels/units/:unitCode/panels` - Panels by unit

### 🟢 Phase 4 - Optional
15. `DELETE /wires/dev/delete-all` - Dev delete all
16. Backup endpoints (can use external tools)

---

## Modules to Create

### New Modules Needed

```
src/modules/
├── wire-audits/           # NEW - Wire audit tracking
│   ├── wire-audits.controller.ts
│   ├── wire-audits.service.ts
│   ├── wire-audits.module.ts
│   └── dto/
│       ├── wire-audit-response.dto.ts
│       └── get-audits.dto.ts
│
├── unit-panels/           # NEW - Unit and panel management
│   ├── unit-panels.controller.ts
│   ├── unit-panels.service.ts
│   └── unit-panels.module.ts
│
├── backup/                # NEW - Database backup (optional)
│   ├── backup.controller.ts
│   ├── backup.service.ts
│   └── backup.module.ts
│
└── progress/              # NEW - SSE progress tracking
    ├── progress.controller.ts
    ├── progress.service.ts
    └── progress.module.ts
```

### Existing Modules to Extend

```
src/modules/wires/
├── wires.controller.ts    # Add: POST, PUT, DELETE, search, upload
├── wires.service.ts       # Add: create, update, delete, search, CSV
└── dto/
    ├── create-wire.dto.ts   # NEW
    ├── update-wire.dto.ts   # NEW
    └── search-wires.dto.ts  # NEW
```

---

## Prisma Schema Check

The following models should exist in `schema.prisma`:

```prisma
✅ Wire (wireslist)
✅ User (users)  
✅ wireslist_audit (WireAudit)
```

---

## Quick Commands

### Generate new module:
```bash
nest g module modules/wire-audits
nest g controller modules/wire-audits
nest g service modules/wire-audits

nest g module modules/unit-panels
nest g controller modules/unit-panels
nest g service modules/unit-panels
```

---

## Checklist

- [ ] **Phase 1: Core CRUD**
  - [ ] Create wire endpoint
  - [ ] Update wire endpoint
  - [ ] Delete wire endpoint
  - [ ] Get all units endpoint
  - [ ] Get all panels endpoint

- [ ] **Phase 2: Audit & Search**
  - [ ] Wire audit module
  - [ ] Wire audit endpoints (all 7)
  - [ ] Wire search endpoint
  - [ ] SSE progress module

- [ ] **Phase 3: Enhancement**
  - [ ] CSV upload with progress
  - [ ] Unit-panel relationships
  - [ ] Advanced audit filters

- [ ] **Phase 4: Optional**
  - [ ] Dev delete-all endpoint
  - [ ] Backup module (if needed)

---

## Notes

1. **Authentication**: Guards are commented out in `wires.controller.ts` - need to enable them
2. **Audit Integration**: When creating/updating/deleting wires, need to create audit records
3. **CSV Upload**: Requires file handling and progress tracking via SSE
4. **BigInt**: Prisma uses BigInt for IDs - ensure proper serialization

---

*Last Updated: December 2025*

