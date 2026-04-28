# MomCare API — Developer Documentation

## Table of Contents

1. [Overview](#overview)
2. [Base URL & Environments](#base-url--environments)
3. [Authentication](#authentication)
4. [Role-Based Access Control (RBAC)](#role-based-access-control-rbac)
5. [Rate Limiting](#rate-limiting)
6. [Error Handling & Status Codes](#error-handling--status-codes)
7. [File Uploads](#file-uploads)
8. [API Endpoints](#api-endpoints)
   - [Auth](#auth)
   - [Users](#users)
   - [Entities](#entities)
   - [Courses & Lessons](#courses--lessons)
   - [Subscription Plans](#subscription-plans)
   - [Allocation & Payments](#allocation--payments)
   - [Community](#community)
   - [Community Posts](#community-posts)
   - [Community Comments](#community-comments)
   - [Community Reactions (Likes)](#community-reactions-likes)
   - [Expert Posts](#expert-posts)
   - [Experts](#experts)
   - [Resources (Conceive)](#resources-conceive)
   - [Media Files](#media-files)
   - [Daily Tips](#daily-tips)
   - [Diet Nuskha Tool](#diet-nuskha-tool)
   - [Coupons](#coupons)
   - [Health (Symptoms)](#health-symptoms)
   - [Webhooks](#webhooks)
   - [Bulk Upload (Excel)](#bulk-upload-excel)
   - [Server Logs](#server-logs)
   - [IP / Login Logs](#ip--login-logs)
9. [Request & Response Examples](#request--response-examples)
10. [Environment Variables](#environment-variables)
11. [Development Setup](#development-setup)
12. [Deployment](#deployment)

---

## Overview

MomCare API is a RESTful backend service built with **Fastify** (Node.js / TypeScript) and **Prisma ORM** backed by **MariaDB**. It powers the MomCare platform — a Learning Management System (LMS) focused on maternal health — providing user management, course delivery, subscription billing, community features, expert content, and payment processing via Razorpay.

Interactive Swagger documentation is available at `/docs` on any running instance.

---

## Base URL & Environments

| Environment | Base URL |
|-------------|----------|
| Production  | `https://momcare-api-production.up.railway.app` |
| Local dev   | `http://localhost:3000` (default port, configurable via `PORT`) |

All endpoints are relative to the base URL. Example:

```
GET https://momcare-api-production.up.railway.app/users/me
```

---

## Authentication

The API uses **JWT Bearer token** authentication. Two tokens are issued on login:

| Token | Lifetime | Purpose |
|-------|----------|---------|
| `accessToken` | 7 days | Sent with every authenticated request |
| `refreshToken` | 30 days | Used to obtain a new access token pair |

### Sending the token

Include the access token in the `Authorization` header on every protected request:

```
Authorization: Bearer <accessToken>
```

### Token payload

The decoded access token contains:

```json
{
  "id": 42,
  "uuid": "USR-0042",
  "name": "Jane Doe",
  "email": "jane@example.com",
  "role": "USER",
  "belongsToId": 7,
  "createdBy": 1,
  "sid": "<session-id>",
  "type": "access",
  "iat": 1700000000,
  "exp": 1700604800
}
```

### Session invalidation

Each user has a single active session. Logging in from a new device invalidates the previous session. Requests using a stale token receive:

```json
{ "code": "REMOTE_LOGIN", "message": "Logged in from another device" }
```

### OTP-based login (phone)

Users can also authenticate via a one-time password sent to their phone number:

1. `POST /auth/request-otp` — sends OTP to the phone number
2. `POST /auth/verify-otp` — verifies OTP and returns `accessToken` + `refreshToken`

---

## Role-Based Access Control (RBAC)

Every authenticated route is guarded by a permission policy. Roles and their permissions:

| Role | Description | Key Permissions |
|------|-------------|-----------------|
| `SUPER_ADMIN` | Full platform access | All permissions (`*`) |
| `ADMIN` | Org-level admin | List users/entities, view reports, change password |
| `CHANNEL_SUPER_ADMIN` | Full channel control | Create/update users & entities, plan allocation |
| `CHANNEL_ADMIN` | Limited channel ops | List users/partners, plan allocation |
| `PARTNER_SUPER_ADMIN` | Partner top-level admin | Create/update users, plan allocation |
| `PARTNER_ADMIN` | Partner admin | List users, update users |
| `USER` | Regular end-user | View own profile, make & confirm payments |

Permission checks are enforced via the `accessControl.check('<PERMISSION>')` preHandler. Attempting an action without the required permission returns `403 Forbidden`.

---

## Rate Limiting

Rate limiting is applied selectively (not globally) to sensitive endpoints:

| Endpoint | Limit | Block Duration |
|----------|-------|----------------|
| `POST /auth/login` | 3 failed attempts per IP+email | 30 minutes |
| `POST /auth/request-otp` | 5 OTP sends per phone | 30 minutes |
| `POST /auth/verify-otp` | 5 failed verifications per phone | 30 minutes |

Blocked requests receive `HTTP 429` with a message indicating when to retry.

---

## Error Handling & Status Codes

All error responses follow a consistent JSON shape:

```json
{
  "success": false,
  "message": "Human-readable description",
  "error": "Optional technical detail"
}
```

Authentication errors include a `code` field:

```json
{
  "code": "SESSION_EXPIRED",
  "message": "Session expired"
}
```

### Common HTTP status codes

| Code | Meaning |
|------|---------|
| `200` | OK — request succeeded |
| `201` | Created — resource created successfully |
| `400` | Bad Request — invalid input or business rule violation |
| `401` | Unauthorized — missing, invalid, or expired token |
| `403` | Forbidden — authenticated but insufficient permissions |
| `404` | Not Found — resource does not exist |
| `409` | Conflict — e.g. remote login detected |
| `429` | Too Many Requests — rate limit exceeded |
| `500` | Internal Server Error — unexpected server failure |

### Auth error codes

| Code | Meaning |
|------|---------|
| `NO_TOKEN` | `Authorization` header is missing |
| `SESSION_EXPIRED` | Token expired or session no longer exists |
| `INVALID_TOKEN` | Token is malformed or has wrong type |
| `REMOTE_LOGIN` | User logged in from another device |
| `UNAUTHORIZED` | Generic auth failure |

---

## File Uploads

File uploads use `multipart/form-data`. The server accepts files up to **500 MB** per request.

- In **local** mode, files are saved to the directory specified by `UPLOAD_DIR` (default: `./momcare-media`) and served as static assets.
- In **remote** mode (when `UPLOAD_DIR` is an `http(s)://` URL), files are forwarded to the configured remote storage (e.g. Cloudinary).

### Upload field conventions

| Route context | File field name | Folder |
|---------------|-----------------|--------|
| User profile image | `imageUrl` | `user-profile` |
| Subscription plan thumbnail | `thumbnail` | `subscription-plans` |
| Community image | `imageUrl` | `_community` |
| Community post media | `media` | `community_posts` |
| Expert post media | `media` | `_expert_posts` |
| Expert profile image | `image` | `_experts` |
| Daily tip icon | `icon` | `daily-tips` |
| Diet chart icon | `icon` | `diet-chart` |
| Dadi-Nani Nuskhe icon | `icon` | `dadiNaniNuskhe` |
| Coupon image | `image` | `_coupons` |
| Resource (conceive) thumbnail | `thumbnail` | `conceive` |
| Resource (conceive) image | `image` | `conceive` |
| Media resource file | `url` | `resources` |
| Media resource thumbnail | `thumbnail` | `resources` |
| Entity image | `imageUrl` | `Entities` |

### Universal file upload

A generic upload endpoint is available for single-file uploads:

```
POST /api/upload?table=<tableName>
Content-Type: multipart/form-data
```

Supported `table` values: `concieve`, `user`, `entitytable`. Returns parsed row counts and any validation errors.

---

## API Endpoints

### Auth

**Prefix:** `/auth`

| Method | Path | Auth | Permission | Description |
|--------|------|------|------------|-------------|
| `POST` | `/request-otp` | No | — | Send OTP to phone number |
| `POST` | `/verify-otp` | No | — | Verify OTP, receive tokens |
| `POST` | `/login` | No | — | Email + password login |
| `POST` | `/signup` | Yes | `CREATE_USER` | Create a new user (admin action) |
| `POST` | `/refresh` | No | — | Refresh access token |
| `POST` | `/change-password` | Yes | `CHANGE_PASSWORD` | Change own password |

---

### Users

**Prefix:** `/users`  
All routes require authentication.

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| `GET` | `/me` | `VIEW_OWN_PROFILE` | Get authenticated user's profile |
| `GET` | `/list/:entityId` | `LIST_USER` | Paginated user list for an entity |
| `GET` | `/list/:entityId/:role` | `LIST_USER` | Users filtered by role within an entity |
| `GET` | `/entity/:entityId` | — | Users belonging to an entity |
| `PATCH` | `/:uuid/status` | `UPDATE_USER_STATUS` | Toggle user active/inactive |
| `PATCH` | `/update` | `UPDATE_USER` | Update own profile (supports image upload) |

**Query parameters for `GET /list/:entityId`:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 10 | Results per page |
| `search` | string | — | Search by name/email/phone |
| `role` | string | — | Filter by role |
| `type` | string | — | Filter by user type |
| `isActive` | boolean | — | Filter by active status |
| `sortField` | string | — | Field to sort by |
| `sortOrder` | `asc`\|`desc` | — | Sort direction |

---

### Entities

**Prefix:** `/entities`  
All routes require authentication.

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| `GET` | `/channel/list` | `LIST_CHANNEL` | List channel entities |
| `GET` | `/partner/list` | `LIST_PARTNER` | List partner entities |
| `GET` | `/all` | `LIST_ENTITY` | List all entities for the caller's org |
| `GET` | `/:id` | `LIST_ENTITY` | Get entity by ID |
| `POST` | `/create` | `CREATE_ENTITY` | Create a new entity (supports image upload) |
| `POST` | `/register` | — | Public entity registration |
| `PATCH` | `/:id/update` | `UPDATE_ENTITY` | Update entity (supports image upload) |

---

### Courses & Lessons

**Prefix:** `/courses`  
All routes require authentication. Write operations (`POST`, `PATCH`) additionally require `SUPER_ADMIN` role.

#### Courses

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | List all courses |
| `GET` | `/:uuid` | Get course by UUID |
| `GET` | `/many/:ids` | Get multiple courses by comma-separated IDs |
| `GET` | `/:courseUuid/lessons` | Get all lessons for a course |
| `POST` | `/` | Create a course |
| `PATCH` | `/:uuid` | Update a course |
| `PATCH` | `/:uuid/status` | Toggle course active status |

#### Lessons

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/lessons` | List all lessons (supports query filters) |
| `GET` | `/lesson/:uuid` | Get lesson by UUID |
| `POST` | `/lessons` | Create a lesson |
| `PATCH` | `/lesson/:uuid` | Update a lesson |
| `PATCH` | `/lesson/:uuid/status` | Toggle lesson active status |

#### Lesson Media

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/lessons/:lessonUuid/medias` | Get all media for a lesson |
| `GET` | `/lesson-media/:id` | Get single lesson media by ID |
| `POST` | `/lesson-medias` | Create or update lesson media (bulk) |
| `PATCH` | `/lesson-medias/:id/status` | Toggle lesson media active status |

---

### Subscription Plans

**Prefix:** `/subscriptions`  
All routes require authentication. Write operations require `SUPER_ADMIN` role.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/plans` | List all subscription plans (includes course count) |
| `GET` | `/plans/:uuid` | Get plan by UUID |
| `GET` | `/plans/many/:ids` | Get multiple plans by comma-separated IDs |
| `POST` | `/plans` | Create a plan (multipart: `name`, `price`, `courseIds`, optional `thumbnail`) |
| `PATCH` | `/plans/:uuid` | Update a plan |
| `PATCH` | `/plan/:uuid/status` | Toggle plan active/inactive |
| `PATCH` | `/plan/:uuid/visiblity` | Toggle plan visibility |

---

### Allocation & Payments

**Prefix:** `/allocation`  
All routes require authentication.

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| `GET` | `/:entityId/:page/:limit/purchase` | — | Paginated purchase/sale transactions for an entity |
| `GET` | `/:entityId/:planId` | — | Plan-wise balance for an entity |
| `POST` | `/create` | `PLAN_ALLOCATION` | Allocate, sell, or revoke a plan for a user |
| `POST` | `/user/allotment` | — | Create Razorpay order for self-purchase (app flow) |
| `POST` | `/payments/create` | `MAKE_PAYMENT` | Create Razorpay order (web flow) |
| `POST` | `/payments/confirm-payment` | `CONFIRM_PAYMENT` | Confirm Razorpay payment after client-side completion |

**`POST /allocation/create` body:**

```json
{
  "type": "ALLOCATE",
  "planId": 3,
  "receiverId": 12,
  "userId": 45,
  "quantity": 1
}
```

`type` must be one of: `ALLOCATE`, `SELL`, `REVOKE`.

**`POST /allocation/payments/create` body:**

```json
{
  "amount": 999,
  "planId": 3,
  "coupon_code": "SAVE20"
}
```

**`POST /allocation/payments/confirm-payment` body:**

```json
{
  "razorpay_order_id": "order_XXXX",
  "razorpay_payment_id": "pay_XXXX",
  "razorpay_signature": "<hmac-sha256-signature>"
}
```

---

### Community

**Prefix:** `/community`  
All routes require authentication. Write operations require `SUPER_ADMIN` role.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | List all communities |
| `GET` | `/:id` | Get community by ID |
| `POST` | `/` | Create a community (multipart: `name`, `description`, optional `imageUrl`) |
| `POST` | `/join` | Join or leave a community (`userId`, `communityId`) |
| `PATCH` | `/:id` | Update a community (multipart, optional `imageUrl`) |
| `PATCH` | `/:id/status` | Toggle community active status |

---

### Community Posts

**Prefix:** `/community-posts`  
All routes require authentication.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | List all community posts |
| `GET` | `/:id` | Get post by ID |
| `GET` | `/communityId/:id` | Get posts by community ID |
| `GET` | `/type/:type` | Get posts filtered by media type |
| `GET` | `/user/posts` | Get posts by user |
| `POST` | `/` | Create a post (multipart: `title`, `content`, `communityId`, `userId`, `mediaType`, optional `media`) |
| `PATCH` | `/:id` | Update a post (multipart, optional `media`) |
| `PATCH` | `/:id/status` | Toggle post active status |
| `PATCH` | `/share/:postId` | Increment share count |
| `PATCH` | `/view/:postId` | Increment view count |

---

### Community Comments

**Prefix:** `/post-comments`  
All routes require authentication.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/:postId` | Get nested comments for a post |
| `POST` | `/` | Create a comment (`postId`, `userId`, `content`, optional `parentId` for replies) |
| `PATCH` | `/:id` | Update comment content |
| `PATCH` | `/:id/status` | Remove/hide a comment |

---

### Community Reactions (Likes)

**Prefix:** `/post-comment-likes`  
All routes require authentication.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Get reactions (query: `postId` or `commentId`) |
| `POST` | `/create` | Toggle like on a post or comment (`postId` or `commentId`) |

Reactions are toggled — calling `POST /create` on an already-liked item removes the like.

---

### Expert Posts

**Prefix:** `/expert-posts`  
All routes require authentication.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | List all expert posts |
| `GET` | `/:id` | Get expert post by ID |
| `GET` | `/profession/:professionId` | Get posts by profession ID |
| `GET` | `/professions` | List all professions |
| `POST` | `/` | Create an expert post (multipart: `title`, `content`, `expert_id`, `mediaType`, optional `media`) |
| `POST` | `/profession` | Create a profession (`name`) |
| `PATCH` | `/:id` | Update an expert post (multipart, optional `media`) |
| `PATCH` | `/:id/status` | Toggle post active status |
| `PATCH` | `/share/:postId` | Increment share count |
| `PATCH` | `/view/:postId` | Increment view count |

---

### Experts

**Prefix:** `/experts`  
All routes require authentication. Write operations require `SUPER_ADMIN` role.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | List all experts |
| `GET` | `/:id` | Get expert by ID |
| `POST` | `/` | Create an expert (multipart: `name`, `profession_id`, `name_org`, `qualification`, optional `image`) |
| `PATCH` | `/:id` | Update an expert (multipart, optional `image`) |

---

### Resources (Conceive)

**Prefix:** `/resources`  
All routes require authentication. Write operations require `SUPER_ADMIN` role.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/conceive/type/:type` | Get conceive resources by type |
| `GET` | `/conceive/:id` | Get conceive resource by ID |
| `POST` | `/conceive` | Create a conceive resource (multipart: `week`, `title`, `subtitle`, `type`, `description`, `height`, `weight`, optional `thumbnail` + `image`) |
| `PATCH` | `/conceive/:id` | Update a conceive resource (multipart, optional `thumbnail` + `image`) |

---

### Media Files

**Prefix:** `/media`  
All routes require authentication. Write operations require `SUPER_ADMIN` role.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | List all media resources |
| `GET` | `/:uuid` | Get media by UUID |
| `GET` | `/mediaId/:id` | Get media by numeric ID |
| `GET` | `/search` | Search media (query: `query`, `type`, `mimeType`) |
| `POST` | `/` | Create a media resource (multipart: `title`, `type`, `mimetype`, `url` or file, optional `thumbnail`) |
| `PATCH` | `/:uuid` | Update a media resource (multipart, optional `url` + `thumbnail`) |

---

### Daily Tips

**Prefix:** `/dailytips`  
All routes require authentication. Write operations require `SUPER_ADMIN` role.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | List all daily tips |
| `GET` | `/:id` | Get daily tip by ID |
| `POST` | `/` | Create a daily tip (multipart: `title`, `heading`, `subheading`, `content`, `category`, optional `icon`) |
| `PATCH` | `/:id` | Update a daily tip (multipart, optional `icon`) |
| `PATCH` | `/:id/status` | Toggle daily tip active status |

---

### Diet Nuskha Tool

**Prefix:** `/diet-nuskha`  
All routes require authentication. Write operations require `SUPER_ADMIN` role.

#### Diet Charts

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/diet-chart` | List all diet charts |
| `GET` | `/diet-chart/:id` | Get diet chart by ID |
| `GET` | `/diet-chart-by-week-id/:id` | Get diet charts by week ID |
| `POST` | `/diet-chart` | Create a diet chart (multipart: `heading`, `weekId`, `category`, `subheading`, `content`, `toolType`, optional `icon`) |
| `PATCH` | `/diet-chart/:id` | Update a diet chart (multipart, optional `icon`) |
| `PATCH` | `/diet-chart/:id/status` | Toggle diet chart active status |

#### Dadi-Nani Nuskhe

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/dadi-nani-nuskhe` | List all Dadi-Nani Nuskhe |
| `GET` | `/dadi-nani-nuskhe/:id` | Get Nuskha by ID |
| `POST` | `/dadi-nani-nuskhe` | Create a Nuskha (multipart: `category`, `heading`, `subheading`, `content`, optional `icon`) |
| `PATCH` | `/dadi-nani-nuskhe/:id` | Update a Nuskha (multipart, optional `icon`) |
| `PATCH` | `/dadi-nani-nuskhe/:id/status` | Toggle Nuskha active status |

#### Weeks

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/weeks` | List all weeks |
| `GET` | `/week/:id` | Get week by ID |
| `POST` | `/week` | Create a week (`name`, `order`) |
| `PATCH` | `/week/:id` | Update a week (`name`) |

---

### Coupons

**Prefix:** `/coupons`  
All routes require authentication. Write operations require `SUPER_ADMIN` role.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | List all coupons |
| `GET` | `/available` | Get coupons available to the authenticated user |
| `GET` | `/:coupon_code` | Get coupon by code |
| `POST` | `/create` | Create a coupon (multipart; provide either `percent` or `fixed_amount`, not both) |
| `POST` | `/process` | Validate a coupon and calculate final price (`couponCode`, `planId`) |
| `PATCH` | `/:id` | Update a coupon (multipart) |
| `PATCH` | `/:id/status` | Toggle coupon active status |
| `DELETE` | `/delete/:id` | Delete a coupon |

**`POST /coupons/process` response:**

```json
{
  "success": true,
  "data": {
    "isValid": true,
    "message": "Coupon applied",
    "originalAmount": 999,
    "discountAmount": 200,
    "finalAmount": 799,
    "coupon": {
      "code": "SAVE20",
      "percent": null,
      "fixed_amount": 200
    }
  }
}
```

---

### Health (Symptoms)

**Prefix:** `/health`  
All routes require authentication.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/symptoms` | Get authenticated user's symptom entries from the last 30 days |
| `POST` | `/symptoms` | Log symptoms (`symptoms`: array of strings) |

---

### Webhooks

**Prefix:** `/webhooks`  
No authentication required (signature-verified).

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/razorpay` | Razorpay payment webhook (HMAC-SHA256 signature verified via `x-razorpay-signature` header) |

The webhook handles the following Razorpay events:

| Event | Action |
|-------|--------|
| `payment.captured` | Marks payment as `captured`, records payment method |
| `payment.failed` | Marks payment as `failed`, records failure reason |
| `refund.processed` / `refund.refunded` | Marks payment as `refunded` |

---

### Bulk Upload (Excel)

**Prefix:** `/api`  
Requires authentication and `UPLOAD_EXCEL` permission.

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/upload?table=<name>` | Upload an Excel file to bulk-insert records |
| `GET` | `/upload-configs` | List all available upload configurations |
| `GET` | `/upload-config?table=<name>` | Get configuration and sample template for a specific table |

Supported `table` values: `concieve`, `user`, `entitytable`.

---

### Server Logs

**Prefix:** `/logs`  
Requires authentication and `SUPER_ADMIN` role.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | View server logs as plain text |
| `GET` | `/json` | View server logs as parsed JSON lines |
| `GET` | `/download` | Download the `app.log` file |
| `DELETE` | `/clear` | Clear the log file |

---

### IP / Login Logs

**Prefix:** `/ip-logs`  
Requires authentication and `SUPER_ADMIN` role.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Paginated login history for all users |
| `GET` | `/:userId` | Paginated login history for a specific user |

**Query parameters:**

| Param | Type | Default | Max | Description |
|-------|------|---------|-----|-------------|
| `page` | number | 1 | — | Page number |
| `limit` | number | 10 | 100 | Results per page |
| `search` | string | — | — | Search by IP or user name |

---

## Request & Response Examples

### Login with email and password

**Request:**
```http
POST /auth/login
Content-Type: application/json

{
  "email": "admin@momcare.in",
  "password": "SecurePass123"
}
```

**Response `200 OK`:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### OTP login flow

**Step 1 — Request OTP:**
```http
POST /auth/request-otp
Content-Type: application/json

{ "phone": "9876543210" }
```

**Response `200 OK`:**
```json
{ "ok": true, "message": "OTP sent" }
```

**Step 2 — Verify OTP:**
```http
POST /auth/verify-otp
Content-Type: application/json

{ "phone": "9876543210", "otp": "482910" }
```

**Response `200 OK`:**
```json
{
  "success": true,
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "user": { "id": 42, "name": "Jane Doe", "role": "USER" }
}
```

---

### Refresh access token

**Request:**
```http
POST /auth/refresh
Content-Type: application/json

{ "refreshToken": "eyJ..." }
```

**Response `200 OK`:**
```json
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ..."
}
```

---

### Get own profile

**Request:**
```http
GET /users/me
Authorization: Bearer <accessToken>
```

**Response `200 OK`:**
```json
{
  "id": 42,
  "uuid": "USR-0042",
  "name": "Jane Doe",
  "email": "jane@example.com",
  "phone": "9876543210",
  "role": "USER",
  "isActive": true,
  "belongsToEntity": { "name": "MomCare Channel" },
  "memberCounts": { "USER": 120, "PARTNER_ADMIN": 5 }
}
```

---

### Create a subscription plan

**Request:**
```http
POST /subscriptions/plans
Authorization: Bearer <accessToken>
Content-Type: multipart/form-data

name=Premium Plan
price=999
courseIds=[1,2,3]
thumbnail=<file>
```

**Response `201 Created`:**
```json
{
  "success": true,
  "message": "Subscription plan created successfully",
  "data": {
    "id": 7,
    "uuid": "plan-0007",
    "name": "Premium Plan",
    "price": 999,
    "thumbnail": "/subscription-plans/thumb_abc.jpg",
    "isActive": true
  }
}
```

---

### Initiate a payment

**Request:**
```http
POST /allocation/payments/create
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "amount": 999,
  "planId": 7,
  "coupon_code": "SAVE20"
}
```

**Response `200 OK`:**
```json
{
  "razorpay_order_id": "order_OXYZabc123",
  "amount": 799,
  "currency": "INR",
  "key": "rzp_live_XXXXXXXX"
}
```

---

### Post a community comment

**Request:**
```http
POST /post-comments
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "postId": 15,
  "userId": 42,
  "content": "This is really helpful, thank you!"
}
```

**Response `200 OK`:**
```json
{
  "success": true,
  "message": "Comment posted successfully",
  "data": {
    "id": 88,
    "postId": 15,
    "userId": 42,
    "content": "This is really helpful, thank you!",
    "parentId": null
  }
}
```

---

### Toggle a like

**Request:**
```http
POST /post-comment-likes/create
Authorization: Bearer <accessToken>
Content-Type: application/json

{ "postId": 15 }
```

**Response `200 OK`:**
```json
{
  "success": true,
  "message": "Liked",
  "data": { "id": 201, "postId": 15, "userId": 42 }
}
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | MariaDB connection string (Prisma format) |
| `JWT_SECRET` | Yes | Secret key for signing JWT tokens |
| `PORT` | No | Server port (default: `3000`) |
| `UPLOAD_DIR` | No | Local upload directory or remote storage URL (default: `./momcare-media`) |
| `RAZORPAY_KEY_ID` | Yes* | Razorpay API key ID (*required for payments) |
| `RAZORPAY_KEY_SECRET` | Yes* | Razorpay API key secret |
| `RAZORPAY_WEBHOOK_SECRET` | Yes* | Razorpay webhook signing secret |
| `NODE_ENV` | No | `development` or `production` |

> **Note:** SMS/OTP delivery requires additional service credentials depending on the SMS provider configured in `src/services/otpsms.service.ts/smsService.ts`.

---

## Development Setup

### Prerequisites

- Node.js >= 22.0.0
- npm >= 10
- MariaDB instance (local or remote)

### Steps

1. **Clone the repository:**
   ```bash
   git clone https://github.com/madhujikashyap/momcare-api.git
   cd momcare-api
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your DATABASE_URL, JWT_SECRET, and other values
   ```

4. **Sync the Prisma schema with the database:**
   ```bash
   npx prisma db pull      # Pull schema from existing DB
   npx prisma generate     # Generate Prisma client
   ```

5. **Start the development server:**
   ```bash
   npm run dev
   ```
   The server starts with hot-reload via `tsx watch`. Swagger UI is available at `http://localhost:3000/docs`.

### After pulling new changes

Always re-sync Prisma when the database schema may have changed:

```bash
npx prisma db pull
npx prisma generate
```

### Available scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server with hot-reload |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled production build |

---

## Deployment

The API is deployed on **Railway** and served at:

```
https://momcare-api-production.up.railway.app
```

### Build & start process

Railway runs the `Procfile` command on deploy:

```
web: npm run build && npm start
```

This compiles TypeScript (`tsc`) and then starts the compiled `dist/index.js`. The server binds to `0.0.0.0` on the port provided by Railway via the `PORT` environment variable.

### Swagger UI (production)

```
https://momcare-api-production.up.railway.app/docs
```

### Health check

```
GET https://momcare-api-production.up.railway.app/
```

Returns:
```json
{
  "status": "ok",
  "message": "Server is running 🚀",
  "uptime": 3600.5,
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```
