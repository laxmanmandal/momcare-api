import crypto from "crypto";
import { FastifyInstance } from 'fastify'
import prisma from "../../prisma/client";

export default async function razorpayWebhook(app: FastifyInstance) {

    app.post(
        "/razorpay",
        {
            config: {
                rawBody: true
            }
        },
        async (req: any, reply) => {
            try {
                // 🚀 1. Get raw body exactly as received
                const rawBody =
                    typeof req.rawBody === "string"
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

                const signatureHeader =
                    (req.headers["x-razorpay-signature"] as string) || "";
                const expectedSignature = crypto
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
                let payload: any;
                try {
                    payload = JSON.parse(rawBody);
                } catch (err: any) {
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
                const existingPayment = await prisma.payments.findFirst({
                    where: { razorpay_order_id: orderId }
                });

                if (!existingPayment) {
                    console.warn("⚠️ No matching payment record found for order:", orderId);
                    return reply.code(200).send({ message: "Payment record not found" });
                }

                console.log(
                    "Existing payment found. Current status:",
                    existingPayment.status
                );

                // 🚀 4. Handle different events
                const updateData: any = {
                    razorpay_payment_id: razorpayPaymentId,
                    gateway_response: JSON.stringify(payload),
                    updated_at: new Date()
                };

                if (event === "payment.captured") {
                    updateData.status = "captured";
                    updateData.payment_method = paymentEntity.method;
                } else if (event === "payment.failed") {
                    updateData.status = "failed";
                    updateData.failure_reason =
                        paymentEntity.error_description || "Payment failed";
                } else if (event === "refund.processed" || event === "refund.refunded") {
                    updateData.status = "refunded";
                } else {
                    console.log("ℹ️ Unhandled webhook event:", event);
                }

                // no change required? skip
                if (!updateData.status) {
                    return reply.code(200).send({ message: "No status change applied" });
                }

                // Only update if the status changed
                const prismaResult = await prisma.payments.updateMany({
                    where: {
                        razorpay_order_id: orderId,
                        status: { not: updateData.status }
                    },
                    data: updateData
                });

                console.log(
                    `➡️ Prisma updated ${prismaResult.count} row(s) for ${event}`
                );

                return reply.code(200).send({
                    message: "Webhook processed",
                    updated: prismaResult.count
                });
            } catch (err: any) {
                console.error("❌ WEBHOOK error:", err);
                return reply.code(500).send({ error: err.message });
            }
        }
    );


}