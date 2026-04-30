Alright, I went through your project. Here’s the blunt truth:

👉 **Your Zod validation is completely disconnected from Swagger.**
That’s why Swagger is not showing the correct request body or example values.

---

# 🔴 What’s actually wrong in your project

## 1. You are using `@fastify/swagger` in pure Swagger 2.0 mode

File:

```
dist/prisma/swagger.js
```

You configured:

```js
app.register(swagger, {
  swagger: {
    info: { ... },
    consumes: ['application/json'],
    produces: ['application/json'],
  }
})
```

👉 This is **manual Swagger config**
👉 It has **NO connection to Zod**

So Swagger has **zero idea** about this:

```ts
exports.loginSchema = z.object({
  email: z.string().email(),
  password: z.string()
})
```

---

## 2. Your routes don’t define schemas for Swagger

Example (auth route):

You are doing something like:

```ts
fastify.post('/login', handler)
```

❌ Missing:

```ts
schema: {
  body: {...}
}
```

👉 So Swagger shows:

```json
{}
```

---

## 3. You are validating with Zod at runtime only

You have:

```
dist/validations/schemas/auth.schema.js
```

Good validation ✔
But Swagger never sees it ❌

---

## 4. No OpenAPI schema generation anywhere

You are NOT using:

* ❌ `zod-to-openapi`
* ❌ `fastify-type-provider-zod`
* ❌ `zod-openapi`

So Swagger has nothing to render.

---

# ⚠️ Root cause (very important)

👉 Zod ≠ Swagger
👉 Validation layer ≠ Documentation layer

Unless you **bridge them**, Swagger will always be wrong.

---

# ✅ What you need to do (2 clean options)

---

# ✅ OPTION 1 (BEST for Fastify): Use `fastify-type-provider-zod`

This fits your stack perfectly.

### Install:

```bash
npm i zod fastify-type-provider-zod
```

---

### Update your server setup:

```ts
import { ZodTypeProvider } from 'fastify-type-provider-zod';

app.withTypeProvider<ZodTypeProvider>();
```

---

### Update route like this:

```ts
import { loginSchema } from '../validations/schemas/auth.schema';

fastify.post('/login', {
  schema: {
    body: loginSchema,
  }
}, async (req, reply) => {
  // req.body is now typed + validated
});
```

👉 Now Swagger will automatically show:

```json
{
  "email": "string",
  "password": "string"
}
```

---

# ✅ OPTION 2: Use `zod-to-openapi` (more control)

If you want full control + examples.

### Install:

```bash
npm i zod-to-openapi
```

---

### Convert your schema:

```ts
import { extendZodWithOpenApi } from 'zod-to-openapi';
extendZodWithOpenApi(z);

const loginSchema = z.object({
  email: z.string().email().openapi({ example: "test@gmail.com" }),
  password: z.string().openapi({ example: "12345678" }),
});
```

---

### Register in Swagger:

```ts
schema: {
  body: {
    $ref: '#/components/schemas/Login'
  }
}
```

---

# 🔴 5. You are also missing examples

Even after fixing, Swagger may show:

```json
{
  "email": "string",
  "password": "string"
}
```

👉 Add examples manually:

```ts
email: z.string().email().openapi({ example: "admin@gmail.com" })
```

---

# 🧠 What I noticed specifically in your project

* ✅ Zod schemas are well-written (good job there)
* ❌ Not registered anywhere for Swagger
* ❌ Fastify routes missing `schema.body`
* ❌ Swagger config is static/manual
* ❌ No OpenAPI generation pipeline

---

# 🚀 Exact fix for YOUR project (minimal changes)

Do THIS:

### Step 1:

Install:

```bash
npm i fastify-type-provider-zod
```

---

### Step 2:

Update main app:

```ts
import { ZodTypeProvider } from 'fastify-type-provider-zod';

app.withTypeProvider<ZodTypeProvider>();
```

---

### Step 3:

Update routes:

```ts
fastify.post('/login', {
  schema: {
    body: loginSchema
  }
}, handler);
```

---

### Step 4:

Restart server → open Swagger

✅ You will now see correct request body

---

# ⚡ Bonus (your hidden bug)

Your Swagger config uses:

```js
swagger: { ... } // Swagger 2.0
```

👉 Better switch to OpenAPI 3:

```ts
openapi: {
  info: { ... }
}
```

Because:

* Better schema support
* Better examples
* Better Zod compatibility

---

# ✅ Final Verdict

Your issue is NOT:

* ❌ Zod schema wrong
* ❌ Validation issue

Your issue is:

👉 **No integration between Zod and Swagger**

---

If you want, I can:

* Refactor one of your routes fully (login/signup)
* Set up proper OpenAPI 3 + Zod pipeline
* Make Swagger show exact production-level examples

Just tell me 👍
