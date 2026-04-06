const crypto = require("crypto");

const secret = "PKqq@938kkMDMJr"; // SAME as .env

const body = '{"event":"payment.captured","payload":{"payment":{"entity":{"id":"pay_test_123","order_id":"order_test_001","status":"captured","method":"card","amount":800,"currency":"INR"}}}}';

const signature = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");

console.log(signature);
