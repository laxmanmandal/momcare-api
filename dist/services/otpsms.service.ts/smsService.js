"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendSMS = sendSMS;
const axios_1 = __importDefault(require("axios"));
const dotenv_1 = __importDefault(require("dotenv"));
const http_errors_1 = require("http-errors");
dotenv_1.default.config();
async function sendSMS(phone, otp) {
    let normalized = phone.replace(/\D/g, "");
    if (normalized.length === 10)
        normalized = "91" + normalized;
    const url = process.env.ULTRON_BASEURL?.trim(); // https://ultronsms.com/api/mt/SendSMS
    const params = {
        APIKey: process.env.ULTRON_API_KEY?.trim() || "",
        senderid: process.env.ULTRON_SENDERID?.trim() || "",
        channel: process.env.ULTRON_CHANNEL?.trim() || "Trans",
        DCS: "0",
        flashsms: "0",
        number: normalized,
        text: `Hello Customer, Your new password is ${otp}. Thank you. Regards, WebXion`,
        route: process.env.ULTRON_ROUTE?.trim() || "2",
        peid: process.env.ULTRON_PEID?.trim() || "",
        DLTTemplateId: process.env.ULTRON_DLT_TEMPLATE_ID?.trim() || "",
    };
    try {
        const resp = await axios_1.default.get(url, {
            params,
            timeout: 15000,
        });
        return resp.data;
    }
    catch (err) {
        const errorMsg = err.response?.data ?? err.message;
        throw new http_errors_1.BadRequest(`[SMS] Failed: ${errorMsg}`);
    }
}
//# sourceMappingURL=smsService.js.map