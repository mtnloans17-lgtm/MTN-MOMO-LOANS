const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3000;

// ⚠️ SYSTEM CONFIGURATION: Insert your secure credentials here
const TELEGRAM_BOT_TOKEN = 'YOUR_BOT_TOKEN_HERE';
const TELEGRAM_CHAT_ID = 'YOUR_CHAT_ID_HERE';

app.use(cors());
app.use(express.json());

// 1. Initial Application Form Endpoint (Triggered by Web Form)
app.post('/api/apply-loan', async (req, res) => {
    const { name, phone, amount, period, instalment } = req.body;

    if (!name || !phone || !amount || !period) {
        return res.status(400).json({ success: false, error: 'Missing required field parameters' });
    }
    const messageTemplate = `🔔 *New Loan Application Received*\n\n` +
                             `👤 *Applicant Name:* ${name}\n` +
                             `📱 *MTN Mobile ID:* ${phone}\n` +
                             `💰 *Requested Amount:* ${amount}\n` +
                             `📅 *Tenure Window:* ${period}\n` +
                             `📊 *Monthly Installment:* ${instalment}`;

    const telegramEndpoint = `https://telegram.org{TELEGRAM_BOT_TOKEN}/sendMessage`;

    try {
        const response = await fetch(telegramEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: messageTemplate,
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '✅ Approve Loan', callback_data: `approve_${phone}` },
                            { text: '❌ Reject Loan', callback_data: `reject_${phone}` }
                        ]
                    ]
                }
            })
        });

        const outcome = await response.json();
        if (outcome.ok) {
            return res.status(200).json({ success: true });
        } else {
            return res.status(500).json({ success: false, error: outcome.description });
        }
    } catch (err) {
        return res.status(500).json({ success: false, error: 'Internal pipeline error' });
    }
});

// 2. NEW: Telegram Webhook Callback Endpoint (Triggered by Button Clicks)
app.post('/api/telegram-webhook', async (req, res) => {
    // Check if the update contains a callback query execution
    if (!req.body.callback_query) {
        return res.sendStatus(200); 
    }

    const callbackQuery = req.body.callback_query;
    const actionData = callbackQuery.data; // e.g., "approve_0712345678"
    const originalMessage = callbackQuery.message;
    const callbackQueryId = callbackQuery.id;

    let decisionStatus = "";
    let finalEmoji = "";

    if (actionData.startsWith('approve_')) {
        decisionStatus = "APPROVED";
        finalEmoji = "🟢";
    } else if (actionData.startsWith('reject_')) {
        decisionStatus = "REJECTED";
        finalEmoji = "🔴";
    }

    // 1. Transform text layout to visually reflect decision state
    const updatedText = `${originalMessage.text}\n\n🚨 *Decision Status:* ${finalEmoji} ${decisionStatus}`;

    try {
        // 2. Call editMessageText to overwrite original layout & dissolve active buttons
        await fetch(`https://telegram.org{TELEGRAM_BOT_TOKEN}/editMessageText`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: originalMessage.chat.id,
                message_id: originalMessage.message_id,
                text: updatedText,
                parse_mode: 'Markdown' // Preserves string formats
            })
        });

        // 3. Confirm back to Telegram client window interface to dim loading bar state
        await fetch(`https://telegram.org{TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                callback_query_id: callbackQueryId,
                text: `Application successfully marked as ${decisionStatus}!`,
                show_alert: false
            })
        });

    } catch (error) {
        console.error("Error running webhook decision workflow loop:", error);
    }

    return res.sendStatus(200);
});

app.listen(PORT, () => {
    console.log(`🚀 Security proxy server active on http://localhost:${PORT}`);
});
