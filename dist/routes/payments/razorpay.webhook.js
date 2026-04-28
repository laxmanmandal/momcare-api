"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = razorpayWebhook;
const crypto_1 = __importDefault(require("crypto"));
const client_1 = __importDefault(require("../../prisma/client"));
async function razorpayWebhook(app) {
    app.post("/razorpay", {
        config: {
            rawBody: true,
            swaggerPublic: true
        },
        schema: {
            tags: ['Payments']
        }
    }, async (req, reply) => {
        try {
            // 🚀 1. Get raw body exactly as received
            const rawBody = typeof req.rawBody === "string"
                ? req.rawBody
                : Buffer.isBuffer(req.rawBody)
                    ? req.rawBody.toString("utf8")
                    : "";
            console.log("🔹 webhook rawBody:", rawBody);
            // 🚀 2. Validate signature
            const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
            if (!secret) {
                console.error("Webhook secret not configured");
                return reply.code(500).send({ error: "Webhook secret missing" });
            }
            const signatureHeader = req.headers["x-razorpay-signature"] || "";
            const expectedSignature = crypto_1.default
                .createHmac("sha256", secret)
                .update(rawBody)
                .digest("hex");
            console.log("Signature received:", signatureHeader);
            console.log("Expected signature:", expectedSignature);
            if (expectedSignature !== signatureHeader) {
                console.error("❌ Webhook signature mismatch");
                return reply.code(400).send({ error: "Invalid webhook signature" });
            }
            console.log("✅ Razorpay webhook verified");
            // 🚀 3. Parse JSON
            let payload;
            try {
                payload = JSON.parse(rawBody);
            }
            catch (err) {
                console.error("❌ Invalid JSON webhook payload:", err.message);
                return reply.code(400).send({ error: "Invalid JSON webhook payload" });
            }
            const event = payload.event;
            const paymentEntity = payload?.payload?.payment?.entity;
            console.log("Event:", event);
            // if payment entity doesn’t exist
            if (!paymentEntity || !paymentEntity.id) {
                console.warn("⚠️ No payment entity in webhook dispatch");
                return reply.code(200).send({ message: "No payment entity found" });
            }
            const orderId = paymentEntity.order_id;
            const razorpayPaymentId = paymentEntity.id;
            console.log("Webhook order_id:", orderId);
            console.log("Webhook payment_id:", razorpayPaymentId);
            // 🔎 Try to find existing payment
            const existingPayment = await client_1.default.payments.findFirst({
                where: { razorpay_order_id: orderId }
            });
            if (!existingPayment) {
                console.warn("⚠️ No matching payment record found for order:", orderId);
                return reply.code(200).send({ message: "Payment record not found" });
            }
            console.log("Existing payment found. Current status:", existingPayment.status);
            // 🚀 4. Handle different events
            const updateData = {
                razorpay_payment_id: razorpayPaymentId,
                gateway_response: JSON.stringify(payload),
                updated_at: new Date()
            };
            if (event === "payment.captured") {
                updateData.status = "captured";
                updateData.payment_method = paymentEntity.method;
            }
            else if (event === "payment.failed") {
                updateData.status = "failed";
                updateData.failure_reason =
                    paymentEntity.error_description || "Payment failed";
            }
            else if (event === "refund.processed" || event === "refund.refunded") {
                updateData.status = "refunded";
            }
            else {
                console.log("ℹ️ Unhandled webhook event:", event);
            }
            // no change required? skip
            if (!updateData.status) {
                return reply.code(200).send({ message: "No status change applied" });
            }
            // Only update if the status changed
            const prismaResult = await client_1.default.payments.updateMany({
                where: {
                    razorpay_order_id: orderId,
                    status: { not: updateData.status }
                },
                data: updateData
            });
            console.log(`➡️ Prisma updated ${prismaResult.count} row(s) for ${event}`);
            return reply.code(200).send({
                message: "Webhook processed",
                updated: prismaResult.count
            });
        }
        catch (err) {
            console.error("❌ WEBHOOK error:", err);
            return reply.code(500).send({ error: err.message });
        }
    });
}
//# sourceMappingURL=razorpay.webhook.js.map