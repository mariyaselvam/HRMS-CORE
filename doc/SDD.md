# PeopleOps HRMS - System Design Document (SDD)

**Version:** 1.0  
**Status:** Draft  
**Core Stack:** Node.js, TypeScript, PostgreSQL, Redis, BullMQ

---

## 1. Database Design
**Engine:** PostgreSQL  
**ORM:** TypeORM  
**Strategy:** Shared-schema, Row-level Multi-Tenancy

### 1.1 Entity Relationship Overview
The database is organized into seven functional domains. Every tenant-scoped table carries a `company_id` foreign key.

#### Domain Mapping:
- **Identity & Auth:** `companies`, `users`, `roles`, `permissions`, `role_permissions`
- **Organization:** `departments`, `teams`, `work_locations`, `shifts`, `employee_shifts`
- **Employees:** `employees`, `employee_documents`, `salary_structures`
- **Attendance:** `attendance_logs`, `attendance_requests`, `overtime_records`
- **Leave:** `leave_types`, `leave_balances`, `leave_requests`, `holidays`
- **Payroll:** `payroll_cycles`, `payroll_records`, `payslips`
- **Workflow:** `workflows`, `approval_steps`, `approval_logs`
- **Platform:** `plans`, `subscriptions`, `invoices`, `payments`, `audit_logs`

### 1.2 Multi-Tenancy Strategy
Isolation is enforced at three levels:

| Level | Mechanism | Where Enforced |
| :--- | :--- | :--- |
| **Database** | `company_id` NOT NULL FK | PostgreSQL constraints |
| **ORM** | `BaseRepository` automatic filter | Custom TypeORM Repository base |
| **API** | `company_id` from JWT payload | JWT Middleware |
| **Super Admin** | Isolated token & strategy | `SuperAdminGuard` |

### 1.3 Schema Details (Key Tables)

#### Domain 1: Identity & Auth
| Table | Key Columns | Notes |
| :--- | :--- | :--- |
| **companies** | `id`, `name`, `industry_type`, `employee_limit`, `status` | Root tenant entity |
| **users** | `id`, `company_id`, `email`, `password_hash`, `role_id` | Authentication entity |
| **roles** | `id`, `company_id`, `name`, `description` | RBAC roles |
| **permissions**| `id`, `code`, `description` | Global permission codes |

#### Domain 2: Organization
- **work_locations**: Stores geo-fencing data (`latitude`, `longitude`, `radius_meters`).
- **shifts**: Defines work hours (`start_time`, `end_time`, `grace_minutes`).
- **employee_shifts**: Links employees to shifts with history (`effective_from`, `effective_to`).

#### Domain 3: Employees
- **employees**: Central employee profile.
- **salary_structures**: Versioned salary data (HRA, Basic, Transport, etc.).

---

## 2. API Design & Contracts
**Base URL:** `https://api.peopleops.com/v1`

### 2.1 Conventions
- **Auth:** `Authorization: Bearer <token>`
- **Format:** ISO 8601 UTC for timestamps; YYYY-MM-DD for dates.
- **Pagination:** `page` and `limit` query params.
- **Envelope:**
  ```json
  {
    "success": true,
    "data": { ... },
    "meta": { "total": 100, "page": 1, ... }
  }
  ```

### 2.2 Versioning
Prefix `/v1`. Breaking changes require `/v2`. 6-month support for deprecated versions.

---

## 3. Auth & Security
### 3.1 Strategy
- **JWT Lifecycle:** Access Token (15m in memory) + Refresh Token (7d in HttpOnly Cookie).
- **Encryption:** BCrypt (cost factor 12) for passwords.
- **RBAC:** Permissions cached in Redis (5-minute TTL).
- **Super Admin:** Separate secret, MFA required (TOTP).

---

## 4. Module-by-Module Logic

### 4.1 Attendance
1. **Check-In:** Validate geo-fence → Resolve shift → Upsert log.
2. **Cron:** At 00:30, mark missing check-ins as "absent".

### 4.2 Leave
1. **Submission:** Validate duration, overlapping dates, and balance.
2. **Approval:** Workflow engine handles multi-level steps → Deduct balance on final approval.

### 4.3 Payroll
Calculated via **BullMQ** to avoid timeouts.
- **Process:** Fetch employees → Resolve current salary structure → Calculate working/present days → Apply deductions/overtime → Persist → Finalize.
- **Payslips:** Asynchronously generated as PDFs (Pupeteer/PDFMake) and stored on S3.

---

## 5. Workflow Engine
A generic engine for multi-level approvals.
- **Steps:** Initiated by module → Resolve approvers by role → Notify via BullMQ → Log actions → Finalize status.

---

## 6. Job Queue (BullMQ)
| Worker | Queue | Trigger |
| :--- | :--- | :--- |
| **PayrollWorker** | `payroll-computation` | Manual/Cron |
| **PdfWorker** | `pdf-generation` | Post-payroll |
| **NotificationWorker**| `notifications` | Events (Email, Push, SMS) |

---

## 7. Error Handling & Logging
- **Global Handler:** Catches all errors, categorizes by type (Validation, Auth, Business Rule, etc.).
- **Logging:** Winston (Console/File) + Sentry for 5xx errors.

---

## 8. Deployment (MVP)
- **API:** Dockerized on DigitalOcean / Railway (2 replicas).
- **Static:** Admin panels on Vercel/Netlify.
- **Data:** Managed PostgreSQL + Managed Redis.
- **Storage:** S3-compatible (DigitalOcean Spaces).

---

## 9. Scalability
- **Horizontal:** Add API replicas.
- **Workers:** Parallelize `PayrollWorker` by batching if employee count > 10,000.
- **DB:** Add read replicas for reporting.

---
*Created by PeopleOps Design Team*
