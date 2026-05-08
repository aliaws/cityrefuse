

import { Permissions, webMethod } from "wix-web-module";
import { createHmac } from 'crypto';

const API_ACCESS_ID = "WrPJ6VbaKL";
const SECURE_KEY    = "c61d36bdebae7d7fe069dae4d9bcaeb4";
const MERCHANT_ID   = "301919";

export const multiply = webMethod(
  Permissions.Anyone, 
  (factor1, factor2) => { 
    return factor1 * factor2 
  }
);



export const getPaymentSignature = webMethod(
  Permissions.Anyone, async(amount) => { 
    
     const orderNumber = "ORDER_" + Date.now();
        const version     = "2.0";
        const transType   = "10";
        const utcTime     = await getUTCTime();

        const hashString = [
            API_ACCESS_ID, transType, version,
            amount, utcTime, orderNumber,
            "", "insert", "insert"
        ].join("|");

        const hash = createHmac("md5", SECURE_KEY)
            .update(hashString)
            .digest("hex");

        const params =  {
            pg_api_login_id:             API_ACCESS_ID,
            pg_merchant_id:              MERCHANT_ID,
            pg_transaction_type:         transType,
            pg_version_number:           version,
            pg_total_amount:             amount,
            pg_utc_time:                 utcTime,
            pg_transaction_order_number: orderNumber,
            pg_ts_hash:                  hash,
            pg_return_url:               "https://lammersmedia.wixsite.com/capitalcityrefuse/success-payment-page",
        };

        const payment_url = "https://swp.paymentsgateway.net/co/default.aspx?" +
        Object.entries(params)
            .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
            .join("&");
        return [payment_url, params];
  }
);

async function getUTCTime() {
    const res   = await fetch("https://checkout.forte.net/getUTC?callback=?");
    const text  = await res.text();
    const match = text.match(/\((\d+)\)/);
    if (!match) throw new Error("Invalid UTC response: " + text);
    return String(match[1]).trim();
}
