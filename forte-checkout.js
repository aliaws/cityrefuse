const crypto = require("crypto");
const https = require("https");
const http = require("http");

const API_ACCESS_ID = "WrPJ6VbaKL";
const SECURE_KEY = "c61d36bdebae7d7fe069dae4d9bcaeb4";
const MERCHANT_ID = "301919";

// ✅ USE NGROK IN PRODUCTION (NOT localhost)
const BASE_URL = "https://YOUR-NGROK-URL.ngrok-free.app";

// ---------------- GET UTC ----------------
function getUTCTime() {
  return new Promise((resolve, reject) => {
    https
      .get("https://checkout.forte.net/getUTC?callback=?", (res) => {
        let data = "";

        res.on("data", (chunk) => (data += chunk));

        res.on("end", () => {
          console.log("Raw UTC response:", data);

          const match = data.match(/\((\d+)\)/);

          if (!match) {
            return reject(new Error("Invalid UTC response: " + data));
          }

          const utcTime = String(match[1]).trim();

          console.log("UTC Time:", utcTime);
          console.log("UTC Length:", utcTime.length);

          resolve(utcTime);
        });
      })
      .on("error", reject);
  });
}

// ---------------- BUILD FORTE PARAMS ----------------
async function buildForteParams({ amount, orderNumber }) {
  const version = "2.0";
  const transType = "10";

  const utcTime = await getUTCTime();

  // ✅ EXACT PHP MATCH STRING
  const hashString =
    API_ACCESS_ID +
    "|" +
    transType +
    "|" +
    version +
    "|" +
    amount +
    "|" +
    utcTime +
    "|" +
    orderNumber +
    "||insert||insert";

  console.log("HASH STRING:", hashString);

  const hash = crypto
    .createHmac("md5", SECURE_KEY)
    .update(hashString)
    .digest("hex");

  console.log("HASH:", hash);

  return {
    pg_api_login_id: API_ACCESS_ID,
    pg_transaction_type: transType,
    pg_version_number: version,
    pg_total_amount: amount,
    pg_utc_time: utcTime,
    pg_transaction_order_number: orderNumber,
    pg_ts_hash: hash,

    // ✅ FIXED RETURN URL (NO DOUBLE /return)
    pg_return_url: `${BASE_URL}/return`,
  };
}

// ---------------- HTML FORM ----------------
function buildPostForm(params) {
  const fields = Object.entries(params)
    .map(([k, v]) => `<input type="hidden" name="${k}" value="${v}" />`)
    .join("\n");

  return `
  <html>
    <body>
      <p>Redirecting to Forte...</p>

      <form id="payForm" method="POST" action="https://swp.paymentsgateway.net/co/default.aspx">
        ${fields}
      </form>

      <script>
        document.getElementById('payForm').submit();
      </script>
    </body>
  </html>
  `;
}

// ---------------- SERVER ----------------
const server = http.createServer(async (req, res) => {
  if (req.url === "/pay") {
    try {
      const amount = "45.00"; // ✅ MUST be string
      const orderNumber = "TEST_" + Date.now();

      const params = await buildForteParams({ amount, orderNumber });

      const html = buildPostForm(params);

      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(html);
    } catch (err) {
      console.error("ERROR:", err.message);

      res.writeHead(500, { "Content-Type": "text/html" });
      res.end(`<h2>Error</h2><pre>${err.message}</pre>`);
    }
  } else if (req.url === "/return") {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end("<h2>Payment Complete</h2>");
  } else {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(`
      <h2>Forte Test</h2>
      <a href="/pay">
        <button>Pay $45</button>
      </a>
    `);
  }
});

server.listen(3000, () => {
  console.log("Server running at http://localhost:3000");
});