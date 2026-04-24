"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSaleTransaction = getSaleTransaction;
exports.getPlanWiseBalance = getPlanWiseBalance;
exports.createPlanAllocation = createPlanAllocation;
exports.hasAlreadyPurchased = hasAlreadyPurchased;
exports.appAllotment = appAllotment;
exports.createPaymentOrder = createPaymentOrder;
exports.confirmPayment = confirmPayment;
const client_1 = require("@prisma/client");
const couponService_1 = require("./couponService");
const razorpay_1 = __importDefault(require("razorpay"));
const prisma = new client_1.PrismaClient();
const crypto_1 = __importDefault(require("crypto"));
const uuidPlugin_1 = require("../plugins/uuidPlugin");
const http_errors_1 = require("http-errors");
async function getSaleTransaction(user, entityId, page = 1, limit = 10) {
    const sameEntity = entityId === user.belongsToId;
    const isAdmin = user.role === client_1.Role.SUPER_ADMIN || user.role === client_1.Role.ADMIN;
    // Get ALL transactions where entity is EITHER sender OR receiver
    const whereClause = (isAdmin && sameEntity)
        ? {}
        : {
            OR: [
                { senderId: entityId },
                { receiverId: entityId }
            ]
        };
    // Get total allocation count for pagination
    const totalAllocations = await prisma.planAllocation.count({
        where: whereClause
    });
    const totalPages = Math.ceil(totalAllocations / limit);
    const skip = (page - 1) * limit;
    // Get paginated sales
    const sales = await prisma.planAllocation.findMany({
        where: whereClause,
        include: {
            plan: { select: { id: true, name: true, price: true } },
            sender: { select: { id: true, name: true } },
            receiver: { select: { name: true } },
            user: { select: { name: true } },
            allocatedBy: { select: { name: true } }
        },
        orderBy: { allocatedAt: 'desc' },
        skip: skip,
        take: limit
    });
    // Get ALL allocations for calculations
    const allAllocations = await prisma.planAllocation.findMany({
        where: whereClause,
        include: {
            plan: {
                select: {
                    name: true,
                    price: true
                }
            }
        }
    });
    const planMap = new Map();
    // First, process all allocations
    for (const alloc of allAllocations) {
        const planId = alloc.planId ?? -1;
        const name = alloc.plan?.name ?? 'Unknown';
        const price = alloc.plan?.price ?? 0;
        const qty = alloc.quantity ?? 0;
        const t = alloc.type;
        const isIncoming = alloc.receiverId === entityId;
        // Use stored discount and amount values from PlanAllocation
        const storedDiscount = alloc.discount ?? 0;
        const storedAmount = alloc.amount ?? 0;
        // Get or create plan entry
        const entry = planMap.get(planId) || {
            planId,
            name,
            price,
            allocated: 0,
            sold: 0,
            revoked: 0,
            balance: 0,
            subtotal: 0,
            discount: 0,
            total: 0
        };
        // Adjust quantity calculations based on direction and type
        if (t === 'ALLOCATE') {
            entry.allocated += Math.abs(qty);
        }
        else if (t === 'SELL') {
            if (!isIncoming) {
                entry.sold += qty;
            }
        }
        else if (t === 'REVOKE') {
            entry.revoked += qty;
        }
        // Add to subtotal and discount from ALL transactions
        // For subtotal, use stored amount if available, otherwise calculate from quantity * price
        const transactionAmount = storedAmount > 0 ? storedAmount : qty * price;
        entry.subtotal += transactionAmount;
        entry.discount += storedDiscount;
        planMap.set(planId, entry);
    }
    // Compute balances and totals
    for (const entry of planMap.values()) {
        entry.balance = entry.allocated - entry.sold - entry.revoked;
        entry.total = entry.subtotal - entry.discount;
    }
    // Convert to array and sort
    const allPlans = Array.from(planMap.values()).sort((a, b) => a.planId - b.planId);
    // Calculate totals
    const totalAllocated = allPlans.reduce((s, p) => s + p.allocated, 0);
    const totalSold = allPlans.reduce((s, p) => s + p.sold, 0);
    const totalRevoked = allPlans.reduce((s, p) => s + p.revoked, 0);
    const totalBalance = allPlans.reduce((s, p) => s + p.balance, 0);
    const totalSubtotal = allPlans.reduce((s, p) => s + p.subtotal, 0);
    const totalDiscount = allPlans.reduce((s, p) => s + p.discount, 0);
    const grandTotal = allPlans.reduce((s, p) => s + p.total, 0);
    // Add discount details to sales items for display
    const salesWithDiscount = sales.map(sale => {
        const price = sale.amount || 0;
        const quantity = sale.quantity || 0;
        // Use stored amount if available, otherwise calculate
        const subtotal = sale.amount > 0 ? sale.amount : 0;
        // Use stored discount
        const discount = sale.discount || 0;
        return {
            ...sale,
            subtotal: subtotal,
            discount: discount,
            total: subtotal
        };
    });
    // Return in your desired format
    return {
        entityId,
        page,
        limit,
        totalPlans: allPlans.length,
        totalAllocations,
        totalPages,
        planSummaries: allPlans,
        sales: salesWithDiscount,
        totals: {
            allocated: totalAllocated,
            sold: totalSold,
            revoked: totalRevoked,
            balance: totalBalance,
            subtotal: totalSubtotal,
            discount: totalDiscount,
            grandTotal: grandTotal
        },
        allocationCount: totalAllocations
    };
}
async function getPlanWiseBalance(entityId, planId) {
    // Fetch all rows for this sender + plan
    const rows = await prisma.planAllocation.findMany({
        where: { receiverId: entityId, planId },
        include: {
            plan: { select: { id: true, name: true, price: true } }
        }
    });
    if (rows.length === 0) {
        return {
            planId,
            name: null,
            price: 0,
            allocated: 0,
            sold: 0,
            revoked: 0,
            balance: 0
        };
    }
    const planInfo = rows[0].plan;
    let allocated = 0;
    let sold = 0;
    let revoked = 0;
    for (const row of rows) {
        if (row.type === "ALLOCATE")
            allocated += row.quantity;
        else if (row.type === "SELL")
            sold += row.quantity;
        else if (row.type === "REVOKE")
            revoked += row.quantity;
    }
    const netAllocated = allocated - revoked;
    const balance = netAllocated - sold;
    return {
        planId,
        name: planInfo.name,
        price: planInfo.price,
        allocated,
        sold,
        revoked,
        balance
    };
}
async function createPlanAllocation(input, user) {
    const generateTransactionId = () => Math.floor(1000000000 + Math.random() * 9000000000).toString();
    const qty = input.userId ? 1 : Number(input.quantity ?? 0);
    if (!qty || qty <= 0)
        throw new Error("Invalid quantity");
    const planId = Number(input.planId);
    if (!planId || isNaN(planId))
        throw new Error("Invalid planId");
    const type = String(input.type).toUpperCase();
    if (!["ALLOCATE", "SELL", "REVOKE"].includes(type))
        throw new Error("Invalid transaction type");
    const senderId = input.senderId !== undefined ? Number(input.senderId) : Number(user?.belongsToId ?? null);
    const receiverId = input.receiverId !== undefined ? Number(input.receiverId) : null;
    return await prisma.$transaction?.(async (tx) => { }) ?? await prisma.$transaction(async (tx) => {
        const entity = await prisma.entityTable.findFirst({
            where: { belongsToId: senderId }
        });
        if (!entity) {
            throw new Error("Entity not found!");
        }
        if (user.role === client_1.Role.USER) {
            throw new Error("User cannot perform this operation!");
        }
        if (entity.belongsToId !== user.belongsToId) {
            throw new Error("Entity doesnt belong to you!");
        }
        if (input.type === 'SELL') {
            const alreadyPurchased = await hasAlreadyPurchased(planId, input.userId);
            if (alreadyPurchased) {
                throw new Error("Subscription plan already exists for this user.");
            }
        }
        if (!isOrgAdmin(user) && type === "SELL") {
            if (!senderId)
                throw new Error("SenderId required for SELL (senderId or user.belongsToId)");
            const balance = await getPlanWiseBalance(senderId, planId);
            if (qty > balance.balance) {
                throw new Error(`SELL failed — insufficient balance.`);
            }
        }
        if (!isOrgAdmin(user) && type === "ALLOCATE") {
            if (!senderId)
                throw new Error("SenderId required for SELL (senderId or user.belongsToId)");
            const balance = await getPlanWiseBalance(senderId, planId);
            if (qty > balance.balance) {
                throw new Error(`ALLOCATION failed — Insufficient balance.`);
            }
        }
        // REVOKE validation
        if (type === "REVOKE") {
            if (!receiverId)
                throw new Error("ReceiverId required for REVOKE operation");
            const balance = await getPlanWiseBalance(receiverId, planId);
            if (qty > balance.balance) {
                throw new Error(`Insufficient Balance to return.`);
            }
        }
        // Coupon validation
        const userID = input.userId ?? receiverId;
        // SAFE extraction
        const calculation = await (0, couponService_1.calculateFinalPrice)({
            userId: userID,
            planId
        });
        if (!calculation.finalAmount) {
            throw new Error("Price calculation failed");
        }
        // Create record
        const allocation = await tx.planAllocation.create({
            data: {
                transactionId: generateTransactionId(),
                planId,
                senderId: senderId ?? null,
                receiverId: receiverId ?? null,
                userId: input.userId ?? null,
                allocatedById: user.id,
                quantity: user.role === 'USER' ? 1 : qty,
                type: type ?? "SELL",
                amount: calculation.finalAmount * (user.role === 'USER' ? 1 : qty),
                discount: calculation.discountAmount * (user.role === 'USER' ? 1 : qty),
                coupon_code: calculation.coupon?.code ?? null,
            },
        });
        return allocation;
    });
}
function isOrgAdmin(user) {
    if (!user)
        return false;
    if (typeof user.role === 'string' && ['SUPER_ADMIN', 'ADMIN'].includes(user.role.toUpperCase()))
        return true;
    if (Array.isArray(user.roles) && user.roles.some((r) => ['SUPER_ADMIN', 'ADMIN'].includes(String(r).toUpperCase())))
        return true;
    if (user.isAdmin === true || user.isSuperAdmin === true)
        return true;
    return false;
}
async function hasAlreadyPurchased(planId, userId) {
    console.log(planId, 'and', userId);
    const existing = await prisma.planAllocation.findFirst({
        where: {
            planId,
            userId: userId,
            type: "SELL",
        },
        select: { id: true },
    });
    console.log(existing);
    return !!existing;
}
const razorpay = new razorpay_1.default({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});
async function appAllotment(userId, amount, planId, coupon_code) {
    // 1️⃣ Validate input early
    if (!userId || !planId) {
        throw new http_errors_1.BadRequest("Invalid userId or planId");
    }
    // 2️⃣ Prevent duplicate purchase
    const alreadyPurchased = await hasAlreadyPurchased(planId, userId);
    if (alreadyPurchased) {
        throw new http_errors_1.BadRequest("Subscription plan already exists for this user.");
    }
    // 3️⃣ Calculate final price on server
    const calculation = await (0, couponService_1.calculateFinalPrice)({
        couponCode: coupon_code ?? undefined,
        planId,
        userId
    });
    if (!calculation.finalAmount) {
        throw new http_errors_1.BadRequest("Price calculation failed");
    }
    // 4️⃣ Amount tampering check
    if (Number(calculation.finalAmount) !== Number(amount)) {
        throw new Error("Amount mismatch, possible tampering detected");
    }
    // 5️⃣ Generate transaction ID (sync)
    const transactionId = (0, uuidPlugin_1.generateTransactionId)();
    // 6️⃣ DB transaction (atomic)
    await prisma.$transaction(async (tx) => {
        await tx.planAllocation.create({
            data: {
                transactionId,
                planId,
                userId,
                allocatedById: userId,
                senderId: 1,
                receiverId: null,
                quantity: 1,
                type: "SELL",
                amount: calculation.finalAmount,
                discount: calculation.discountAmount ?? 0,
                coupon_code: calculation.coupon?.code ?? null,
            }
        });
    });
    return {
        success: true,
        transactionId,
        message: "Plan allocated successfully"
    };
}
async function createPaymentOrder(userId, amount, planId, coupon_code) {
    // Razorpay order
    const razorpayOrder = await razorpay.orders.create({
        amount: Math.round(amount * 100), // INR → paise
        currency: "INR",
        receipt: `rcpt_${Date.now()}`
    });
    if (userId && planId) {
        const alreadyPurchased = await hasAlreadyPurchased(planId, userId);
        if (alreadyPurchased) {
            throw new http_errors_1.BadRequest("Subscription plan already exists for this user.");
        }
    }
    const calculation = await (0, couponService_1.calculateFinalPrice)({ couponCode: coupon_code, planId, userId });
    if (calculation.finalAmount !== amount) {
        throw new Error(`Amount mismatch, could be altered! Expected ${calculation.finalAmount}, got ${razorpayOrder.amount},parameter amount ${amount} `);
    }
    await prisma.payments.create({
        data: {
            user_id: userId,
            planId: planId,
            coupon_code: coupon_code,
            order_id: razorpayOrder.receipt,
            razorpay_order_id: razorpayOrder.id,
            amount,
            status: "created",
        }
    });
    return {
        razorpay_order_id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        key: process.env.RAZORPAY_KEY_ID
    };
}
async function confirmPayment(razorpay_order_id, razorpay_payment_id, razorpay_signature, req) {
    // 3️⃣ Calculate final price on server
    /* ────────────── 1️⃣ Validate input ────────────── */
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        throw new http_errors_1.BadRequest("Missing payment confirmation parameters");
    }
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret)
        throw new http_errors_1.BadRequest("RAZORPAY_KEY_SECRET not configured");
    /* ────────────── 2️⃣ Verify Razorpay signature ────────────── */
    const expectedSignature = crypto_1.default
        .createHmac("sha256", secret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");
    if (expectedSignature !== razorpay_signature) {
        throw new http_errors_1.BadRequest("Invalid Razorpay signature");
    }
    /* ────────────── 3️⃣ Fetch payment from DB ────────────── */
    const payment = await prisma.payments.findUnique({
        where: { razorpay_order_id }
    });
    const calculation = await (0, couponService_1.calculateFinalPrice)({
        userId: req.user?.id,
        planId: Number(payment?.planId),
    });
    if (!calculation.finalAmount) {
        throw new http_errors_1.BadRequest("Price calculation failed");
    }
    // 4️⃣ Amount tampering check
    if (Number(calculation.finalAmount) !== Number(payment?.amount)) {
        throw new Error("Amount mismatch, possible tampering detected");
    }
    if (!payment)
        throw new http_errors_1.BadRequest("Payment record not found");
    if (!payment.user_id)
        throw new http_errors_1.BadRequest("Payment user missing");
    /* ────────────── 4️⃣ Fetch payment from Razorpay ────────────── */
    const razorpayPayment = await razorpay.payments.fetch(razorpay_payment_id);
    if (razorpayPayment.status !== "captured") {
        return {
            success: false,
            message: `Payment not successful yet (status: ${razorpayPayment.status})`
        };
    }
    /* ────────────── 5️⃣ TRANSACTION: payment + allocation ────────────── */
    return await prisma.$transaction(async (tx) => {
        /* 5.1 Update payment ONLY if not captured */
        if (payment.status !== "captured") {
            await tx.payments.update({
                where: { id: payment.id },
                data: {
                    razorpay_payment_id,
                    razorpay_signature,
                    payment_method: razorpayPayment.method,
                    status: "captured"
                }
            });
        }
        /* 5.2 Allocation idempotency */
        const existingAllocation = await tx.planAllocation.findFirst({
            where: { transactionId: razorpay_payment_id }
        });
        if (!existingAllocation) {
            await tx.planAllocation.create({
                data: {
                    transactionId: (0, uuidPlugin_1.generateTransactionId)(),
                    planId: payment.planId,
                    userId: payment.user_id,
                    allocatedById: payment.user_id ?? 1,
                    senderId: 1,
                    receiverId: null,
                    quantity: 1,
                    type: "SELL",
                    amount: calculation.finalAmount,
                    discount: calculation.discountAmount ?? 0,
                }
            });
        }
        return {
            success: true,
            message: existingAllocation
                ? "Payment already confirmed, allocation exists"
                : "Payment confirmed & plan allocated"
        };
    });
}
//# sourceMappingURL=SubscriptionSaleService.js.map