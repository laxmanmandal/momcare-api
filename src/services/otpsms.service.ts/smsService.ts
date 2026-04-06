
import axios from "axios";
import dotenv from "dotenv";
import { BadRequest } from "http-errors";
dotenv.config();

export async function sendSMS(phone: string, otp: string): Promise<any> {

  let normalized = phone.replace(/\D/g, "");
  if (normalized.length === 10) normalized = "91" + normalized;
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
    const resp = await axios.get(url!, {
      params,
      timeout: 15000,
    });

    return resp.data;
  } catch (err: any) {
    const errorMsg = err.response?.data ?? err.message;
    throw new BadRequest(`[SMS] Failed: ${errorMsg}`);
  }
}