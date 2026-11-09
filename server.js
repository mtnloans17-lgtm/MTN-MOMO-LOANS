const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable Cross-Origin Resource Sharing (CORS) for frontend connections
app.use(cors());

// Parse incoming request payloads matching application/json format structures
app.use(bodyParser.json());

// =========================================================================
// 🌐 SERVE FRONT-END FILES FROM THE PUBLIC FOLDER
// This explicitly instructs Express to expose files inside your /public directory
// =========================================================================
app.use(express.static(path.join(__dirname, 'public')));

// Direct root traffic explicitly to the public index interface page 
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// =========================================================================
// 🤖 TELEGRAM BOT CONFIGURATION
// Replace these placeholders with your live values from BotFather
// =========================================================================
const TELEGRAM_BOT_TOKEN = 'YOUR_BOT_TOKEN_HERE'; 
const TELEGRAM_CHAT_ID = 'YOUR_CHAT_ID_OR_CHANNEL_HERE'; 

/**
 * Helper function to dispatch interactive logs directly into your Telegram account
 */
async function sendTelegramAlert(fullName, phoneNumber, amount, periodMonths, referenceId) {
    if (TELEGRAM_BOT_TOKEN === 'YOUR_BOT_TOKEN_HERE') {
        console.warn('⚠️ Telegram Alert skipped: Provide a valid TELEGRAM_BOT_TOKEN to send notifications.');
        return;
    }

   const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`; 
    
    const textMessage = `🔔 *New Loan Application Received* 🔔\n\n` +
                        `👤 *Applicant:* ${fullName}\n` +
                        `📱 *Phone:* \`${phoneNumber}\`\n` +
                        `💰 *Amount:* UGX ${amount.toLocaleString()}\n` +
                        `📅 *Period:* ${periodMonths} Months\n` +
                        `🆔 *Reference:* \`${referenceId}\``;

    const inlineKeyboardGrid = {
        inline_keyboard: [
            [
                { text: '✅ Approve Loan', callback_data: `approve_${referenceId}` },
                { text: '❌ Reject Loan', callback_data: `reject_${referenceId}` }
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

    sendTelegramAlert(fullName, cleanPhone, amount, periodMonths, calculatedReferenceId);

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
    console.log(` Web Frontend UI available at: http://localhost:${PORT}        `);
    console.log(` API Endpoint available at: http://localhost:${PORT}/api/loans/apply `);
    console.log(`================================================================`);
});

