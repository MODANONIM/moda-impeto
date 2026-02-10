const nodemailer = require('nodemailer');

// Create a transporter
// For development, we can use Ethereal or just log to console if no env vars
// In production, use real SMTP credentials from .env
const createTransporter = async () => {
    // If we have real credentials
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        return nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT || 587,
            secure: false, // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
    }

    // Fallback for development: Generate test account from ethereal.email
    /* 
    try {
        const testAccount = await nodemailer.createTestAccount();
        console.log('Using Ethereal Email for testing');
        console.log('User:', testAccount.user);
        console.log('Pass:', testAccount.pass);

        return nodemailer.createTransport({
            host: "smtp.ethereal.email",
            port: 587,
            secure: false,
            auth: {
                user: testAccount.user,
                pass: testAccount.pass,
            },
        });
    } catch (err) {
        console.error('Failed to create test account. Emails will clearly fail.', err);
        return null; // Or a dummy transporter that just logs
    }
    */
    console.log('Skipping Ethereal (Test Account) creation due to potential timeout. Using Console Logger.');
    return null;
};

const sendOrderConfirmation = async (order, userEmail) => {
    console.log('Start sending order confirmation for order:', order.orderId);
    try {
        const transporter = await createTransporter();

        if (!transporter) {
            console.log('Email Transporter not available. Logging email content instead:');
            console.log(`To: ${userEmail}`);
            console.log(`Subject: Order Confirmation #${order.orderId}`);
            return;
        }

        const itemsHtml = order.items.map(item => `
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">
                    <img src="${item.image}" alt="${item.name}" style="width: 50px; height: 50px; object-fit: cover;">
                </td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">
                    ${item.name} <br> <span style="font-size: 12px; color: #777;">Size: ${item.size || 'Free'}</span>
                </td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">
                    x${item.quantity}
                </td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">
                    ¥${item.price.toLocaleString()}
                </td>
            </tr>
        `).join('');

        const mailOptions = {
            from: '"MODA IMPETO" <noreply@modaimpeto.com>',
            to: userEmail,
            subject: `Order Confirmation #${order.orderId}`,
            html: `
                <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee;">
                    <h1 style="text-align: center; color: #000; letter-spacing: 2px;">MODA IMPETO</h1>
                    <p>Dear ${order.customer.firstName},</p>
                    <p>Thank you for your order. We are processing it now.</p>
                    
                    <h3>Order Details</h3>
                    <p><strong>Order ID:</strong> ${order.orderId}</p>
                    <p><strong>Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
                    
                    <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                        <thead>
                            <tr style="background-color: #f9f9f9;">
                                <th style="padding: 10px; text-align: left;">Image</th>
                                <th style="padding: 10px; text-align: left;">Item</th>
                                <th style="padding: 10px; text-align: left;">Qty</th>
                                <th style="padding: 10px; text-align: right;">Price</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsHtml}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colspan="3" style="padding: 10px; text-align: right; font-weight: bold;">Total:</td>
                                <td style="padding: 10px; text-align: right; font-weight: bold;">¥${order.totalAmount.toLocaleString()}</td>
                            </tr>
                        </tfoot>
                    </table>
                    
                    <div style="margin-top: 30px; text-align: center; font-size: 12px; color: #999;">
                        <p>This is an automated message. Please do not reply directly to this email.</p>
                        <p>© 2026 MODA IMPETO</p>
                    </div>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log("Message sent: %s", info.messageId);
        // Preview only available when sending through an Ethereal account
        console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));

    } catch (error) {
        console.error("Error sending email:", error);
    }
};

module.exports = {
    sendOrderConfirmation
};
