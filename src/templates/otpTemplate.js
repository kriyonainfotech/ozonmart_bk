// templates/otpTemplate.js

const otpTemplate = ({ fullName, otp, minutes = 10 }) => {
  console.log(`[OTP Email] Preparing email for ${fullName || "Seller"} with OTP: ${otp}`);

  return `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width,initial-scale=1"/>
    <title>Verify your email</title>
  </head>
  <body style="margin:0;padding:0;font-family:Inter,system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#f4f6f8;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td align="center" style="padding:30px 12px">
          <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 6px 18px rgba(0,0,0,0.06)">
            <tr>
              <td style="padding:28px 36px 10px;">
                <!-- Header -->
                <div style="display:flex;align-items:center;gap:12px">
                  
                  <div>
                    <h2 style="margin:0;font-size:18px;color:#0f172a">Ozonemart Seller Panel</h2>
                    <p style="margin:0;font-size:13px;color:#65748b">Verify your email address</p>
                  </div>
                </div>
              </td>
            </tr>

            <tr>
              <td style="padding:12px 36px 22px;">
                <h3 style="margin:0 0 8px;font-size:20px;color:#0f172a">
                  Hello ${fullName || "Seller"},
                </h3>
                <p style="margin:0 0 18px;color:#515f74">
                  Use the One-Time Password (OTP) below to verify your email. This OTP is valid for <strong>${minutes} minutes</strong>.
                </p>

                <!-- OTP Card -->
                <div style="margin:10px 0 18px;padding:18px;border-radius:10px;background:#f8fafc;display:inline-block">
                  <h1 style="letter-spacing:8px;margin:0;font-size:28px;color:#0b6b4f">${otp}</h1>
                </div>

                <p style="margin:0 0 12px;color:#596674;font-size:13px">
                  Didn’t request this? Ignore this email or contact our support team.
                </p>

                <hr style="border:none;border-top:1px solid #eef2f6;margin:18px 0"/>

                <p style="font-size:12px;color:#8b98a7;margin:0">
                  Ozonemart Seller Panel • <a href="https://ozonemart.in/" style="color:#2a6fdb;text-decoration:none">ozonemart.in</a><br/>
                  If you need help, reply to this email or visit our <a href="https://ozonemart.in/support" style="color:#2a6fdb;text-decoration:none">Support Page</a>.
                </p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;
};

module.exports = otpTemplate;

{/* <img src="https://ozonemart.in/logo.png" alt="Ozonemart Logo" width="48" style="display:block;border-radius:8px" /> */ }