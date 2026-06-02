import { Permissions, webMethod } from "wix-web-module";
import { createHmac } from 'crypto';
import { getSecret } from 'wix-secrets-backend';

export const getPaymentSignature = webMethod(
  Permissions.Anyone,
  async (amount) => {

    const API_ACCESS_ID = await getSecret("API_ACCESS_ID");
    const SECURE_KEY = await getSecret("SECURE_KEY");
    const MERCHANT_ID = await getSecret("MERCHANT_ID");

    const baseAmount = parseFloat(amount);

    // 3% credit card fee
    const ccFee = +(baseAmount * 0.03).toFixed(2);

    // final amount sent to gateway
    const totalAmount = +(baseAmount + ccFee).toFixed(2);

    const orderNumber = "ORDER_" + Date.now();
    const version = "2.0";
    const transType = "10";
    const utcTime = await getUTCTime();

    const hashString = [
      API_ACCESS_ID,
      transType,
      version,
      totalAmount, // IMPORTANT: use final amount here
      utcTime,
      orderNumber,
      "",
      "insert",
      "insert"
    ].join("|");

    const hash = createHmac("md5", SECURE_KEY)
      .update(hashString)
      .digest("hex");

    const params = {
      pg_api_login_id: API_ACCESS_ID,
      pg_merchant_id: MERCHANT_ID,
      pg_transaction_type: transType,
      pg_version_number: version,
      pg_total_amount: totalAmount,
      pg_utc_time: utcTime,
      pg_transaction_order_number: orderNumber,
      pg_ts_hash: hash,
      pg_return_url: "https://www.capitalcityrefuse.com/success-payment-page",
    };

    const payment_url = "https://swp.paymentsgateway.net/co/default.aspx";

    return {
      payment_url,
      params,
      breakdown: {
        subtotal: baseAmount,
        creditCardFee: ccFee,
        total: totalAmount
      }
    };
  }
);

async function getUTCTime() {
  const res = await fetch("https://checkout.forte.net/getUTC?callback=?");
  const text = await res.text();
  const match = text.match(/\((\d+)\)/);

  if (!match) throw new Error("Invalid UTC response: " + text);

  return String(match[1]).trim();
}