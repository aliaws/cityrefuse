import { Permissions, webMethod } from "wix-web-module";
import { createHmac } from 'crypto';
import { getSecret } from 'wix-secrets-backend';

// Forte SWP Checkout (swp.paymentsgateway.net/co/default.aspx) does not document
// any hosted-page fields for fee/surcharge/tax breakdown. Per Forte support docs:
// - Charge amount: pg_total_amount only (https://support.forte.net/.../1000100254)
// - HMAC fields: Standard Hash v2.0 (https://support.forte.net/.../1000107781)
// - pg_merchant_data_* are echoed on postback, not a documented checkout UI breakdown
// - service_fee_amount / line_item_* apply to REST API v2, not SWP hosted checkout
// Not supported for hosted UI: pg_surcharge_amount, pg_fee_amount, pg_base_amount,
// pg_tax_amount, pg_transaction_description (unreliable/absent on gateway page).
// Show fee breakdown on your site before redirect; gateway shows total only.

async function readCcFeePercentage() {
  return Number(await getSecret("CC_FEE_PERCENTAGE"));
}

export const getCcFeePercentage = webMethod(
  Permissions.Anyone,
  async () => readCcFeePercentage()
);

export const getPaymentSignature = webMethod(
  Permissions.Anyone,
  async (amount) => {

    const cc_fee_rate = (await readCcFeePercentage()) / 100;

    const API_ACCESS_ID = await getSecret("API_ACCESS_ID");
    const SECURE_KEY = await getSecret("SECURE_KEY");
    const MERCHANT_ID = await getSecret("MERCHANT_ID");

    const baseAmount = parseFloat(amount);
    const ccFee = +(baseAmount * cc_fee_rate).toFixed(2);
    const totalAmount = +(baseAmount + ccFee).toFixed(2);

    const orderNumber = "ORDER_" + Date.now();
    const version = "2.0";
    const transType = "10";
    const utcTime = await getUTCTime();

    const totalAmountStr = totalAmount.toFixed(2);

    const hashString = [
      API_ACCESS_ID,
      transType,
      version,
      totalAmountStr,
      utcTime,
      orderNumber,
      "",
      "insert",
      "",
      "insert",
    ].join("|");

    const hash = createHmac("md5", SECURE_KEY)
      .update(hashString)
      .digest("hex");

    const params = {
      pg_api_login_id: API_ACCESS_ID,
      pg_merchant_id: MERCHANT_ID,
      pg_transaction_type: transType,
      pg_version_number: version,
      pg_total_amount: totalAmountStr,
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
        total: totalAmount,
      },
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
