
 // ----------------------------------------------------------------------
 // 3B. EXPRESS ROUTING ENGINE & INTERACTIVE TELEGRAM CORE
 // Save as server.js
 // ----------------------------------------------------------------------

const express = require('express');
const path = require('path');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Environment variables
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const MINI_APP_URL = process.env.MINI_APP_URL || 'https://YOUR_DEPLOYED_WEB_URL';
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;

if (!TELEGRAM_TOKEN) {
    throw new Error('TELEGRAM_BOT_TOKEN is missing.');
}

if (!ADMIN_CHAT_ID) {
    throw new Error('ADMIN_CHAT_ID is missing.');
}

// Telegram bot
const bot = new TelegramBot(TELEGRAM_TOKEN, {
    polling: true
});

// Active applications registry
const activeApplicationsRegistry = {};

// Escape special Markdown characters in submitted values
function escapeMarkdown(value) {
    return String(value ?? '').replace(/([_*`\[])/g, '\\$1');
}

// ----------------------------------------------------------------------
// UGX AMOUNT FORMATTER - PREVENT DUPLICATE UGX
// ----------------------------------------------------------------------

function formatUGXAmount(value) {

    // Remove existing UGX prefixes, including repeated prefixes
    const cleanAmount = String(value ?? '')
        .replace(/^(?:\s*UGX\b\s*)+/i, '')
        .trim();

    // Add UGX exactly once
    return `UGX ${cleanAmount}`;
}

// ----------------------------------------------------------------------
// TELEGRAM START COMMAND
// ----------------------------------------------------------------------

bot.onText(/\/start/, (msg) => {

    bot.sendMessage(
        msg.chat.id,
        'Loan Application Gateway\n\nTap below to open the application.',
        {
            reply_markup: {
                inline_keyboard: [[
                    {
                        text: 'Launch Loan App',
                        web_app: {
                            url: MINI_APP_URL
                        }
                    }
                ]]
            }
        }
    ).catch(err => console.error('Start command error:', err.message));

});

// ----------------------------------------------------------------------
// APPROVE / DECLINE APPLICATION
// ----------------------------------------------------------------------

bot.on('callback_query', async (query) => {

    try {

        const [action, appId] = query.data.split('_');
        const record = activeApplicationsRegistry[appId];

        if (!record) {
            return bot.answerCallbackQuery(query.id, {
                text: 'Application expired or not found.'
            });
        }

        // Verify administrator
        if (query.message.chat.id.toString() !== ADMIN_CHAT_ID.toString()) {
            return bot.answerCallbackQuery(query.id, {
                text: 'You are not authorized to review this application.'
            });
        }

        if (action !== 'approve' && action !== 'decline') {
            return bot.answerCallbackQuery(query.id, {
                text: 'Invalid action.'
            });
        }

        if (record.status !== 'PENDING') {
            return bot.answerCallbackQuery(query.id, {
                text: 'Application has already been reviewed.'
            });
        }

        // Update status
        record.status = action === 'approve'
            ? 'APPROVED'
            : 'DECLINED';

        const statusHeader = record.status === 'APPROVED'
            ? '✅ APPROVED'
            : '❌ DECLINED';

        // Updated Telegram message
        const editedTemplate =
`# Thor - Loan Verification

LOAN APPLICATION RECEIVED

USER DETAILS:
• Applicant: *${escapeMarkdown(record.name)}*
• Phone Number: *${escapeMarkdown(record.phone)}*

━━━━━━━━━━━━━━━━━━━━

LOAN DETAILS:
• Application ID: *${escapeMarkdown(record.id)}*
• Loan Type: *${escapeMarkdown(record.loanType)}*
• Amount: *${escapeMarkdown(formatUGXAmount(record.amount))}*
• Term: *${escapeMarkdown(record.period)}*

━━━━━━━━━━━━━━━━━━━━

STATUS: *${record.status === 'APPROVED' ? 'Approved' : 'Declined'}*

[Status Updated: ${statusHeader}]`;

        await bot.editMessageText(editedTemplate, {
            chat_id: query.message.chat.id,
            message_id: query.message.message_id,
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: []
            }
        });

        await bot.answerCallbackQuery(query.id, {
            text: `Application updated: ${record.status}`
        });

        // Notify applicant if Telegram chat ID was supplied
        if (record.userChatId) {

            const clientNotice = record.status === 'APPROVED'
                ? 'Your application status is APPROVED.'
                : 'Your application status is DECLINED.';

            await bot.sendMessage(
                record.userChatId,
                clientNotice
            ).catch(err => {
                console.error('Client notification error:', err.message);
            });

        }

    } catch (err) {

        console.error('Approval callback error:', err.message);

        bot.answerCallbackQuery(query.id, {
            text: 'Could not update application.'
        }).catch(() => {});

    }

});

// ----------------------------------------------------------------------
// RECEIVE LOAN APPLICATION
// ----------------------------------------------------------------------

app.post('/api/loans/submit', async (req, res) => {

    try {

        const {
            name,
            phone,
            amount,
            period,
            loanType,
            userChatId
        } = req.body;

        // Validate required application details
        if (!name || !phone || !amount || !period || !loanType) {
            return res.status(400).json({
                success: false,
                error: 'Missing required application details.'
            });
        }

        // KEEP ORIGINAL APPLICATION ID FORMAT
        const appId = 'MOMO-' + Date.now();

        // Save application
        activeApplicationsRegistry[appId] = {
            id: appId,
            name,
            phone,
            amount,
            period,
            loanType,
            status: 'PENDING',
            userChatId,
            timestamp: new Date()
        };

        const record = activeApplicationsRegistry[appId];

        // Initial Telegram message
        const messageBody =
`# Thor - Loan Verification

LOAN APPLICATION RECEIVED

USER DETAILS:
• Applicant: *${escapeMarkdown(record.name)}*
• Phone Number: *${escapeMarkdown(record.phone)}*

━━━━━━━━━━━━━━━━━━━━

LOAN DETAILS:
• Application ID: *${escapeMarkdown(record.id)}*
• Loan Type: *${escapeMarkdown(record.loanType)}*
• Amount: *${escapeMarkdown(formatUGXAmount(record.amount))}*
• Term: *${escapeMarkdown(record.period)}*

━━━━━━━━━━━━━━━━━━━━

STATUS: *PENDING REVIEW*`;

        // Send to administrator
        await bot.sendMessage(
            ADMIN_CHAT_ID,
            messageBody,
            {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [[
                        {
                            text: '✅ Approve',
                            callback_data: `approve_${appId}`
                        },
                        {
                            text: '❌ Decline',
                            callback_data: `decline_${appId}`
                        }
                    ]]
                }
            }
        );

        return res.status(200).json({
            success: true,
            applicationId: appId,
            status: record.status
        });

    } catch (err) {

        console.error('Application submission error:', err.message);

        return res.status(500).json({
            success: false,
            error: 'Could not submit application.'
        });

    }

});

// ----------------------------------------------------------------------
// CHECK APPLICATION STATUS
// ----------------------------------------------------------------------

app.get('/api/loans/status/:id', (req, res) => {

    const record = activeApplicationsRegistry[req.params.id];

    if (!record) {
        return res.status(404).json({
            success: false,
            error: 'Application not found.'
        });
    }

    return res.status(200).json({
        success: true,
        applicationId: record.id,
        status: record.status,
        loanType: record.loanType,
        amount: record.amount,
        period: record.period
    });

});

// ----------------------------------------------------------------------
// FRONTEND FALLBACK
// ----------------------------------------------------------------------

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ----------------------------------------------------------------------
// START SERVER
// ----------------------------------------------------------------------

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

