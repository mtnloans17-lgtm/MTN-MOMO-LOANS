// ----------------------------------------------------------------------
// ⚙️ 3B. EXPRESS ROUTING ENGINE & INTERACTIVE TELEGRAM CORE (Save as server.js)
// ----------------------------------------------------------------------
const express = require('express');
const path = require('path');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Set environment parameters string keys
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;const MINI_APP_URL = process.env.MINI_APP_URL || 'https://YOUR_DEPLOYED_WEB_URL';

// Configure live bot interface lifecycle instances
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });
const activeApplicationsRegistry = {};

// Handle chat entry launch points commands
bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, `✨ *MTN MoMo Loan Application Gateway*\n\nTap the button inline keyboard launcher row below to start your processing configuration forms wizard profile inside Telegram.`, {
        reply_markup: { inline_keyboard: [[{ text: '🚀 Launch MoMo App', web_app: { url: MINI_APP_URL } }]] },
        parse_mode: 'Markdown'
    }).catch(err => console.error(err.message));
});

// Capture and process inline verification keystroke triggers (Approve / Decline options mapping) from Admin chat
bot.on('callback_query', (query) => {
    const [action, appId] = query.data.split('_');
    const record = activeApplicationsRegistry[appId];
    if (!record) return bot.answerCallbackQuery(query.id, { text: "Error: Application expired or missing." });

    record.status = (action === 'approve') ? 'APPROVED' : 'DECLINED';
    const statusHeader = (action === 'approve') ? `✅ *REQUEST APPROVED*` : `❌ *REQUEST DECLINED*`;

    const editedTemplate = `${statusHeader}\n\n👤 *Applicant:* ${record.name}\n📱 *Phone:* ${record.phone}\n💰 *Amount:* ${record.amount}\n📅 *Period:* ${record.period}\n\n🏷️ *Review Status:* \`${record.status}\``;

    bot.editMessageText(editedTemplate, {
        chat_id: query.message.chat.id, message_id: query.message.message_id, parse_mode: 'Markdown', reply_markup: { inline_keyboard: [] }
    }).then(() => {
        bot.answerCallbackQuery(query.id, { text: `Application updated to: ${record.status}` });
        if (record.userChatId) {
            const clientNotice = (action === 'approve') 
                ? `🎉 Success! Your application for *${record.amount}* has been *APPROVED* by administration.`
                : `⚠️ Notice: Your loan application profile request for *${record.amount}* was *DECLINED*.`;
            bot.sendMessage(record.userChatId, clientNotice, { parse_mode: 'Markdown' }).catch(() => {});
        }
    }).catch(err => console.error(err.message));
});

// REST Endpoint pipeline receiving payloads details from index.html form wizard submission
app.post('/api/loans/submit', (req, res) => {
    const { name, phone, amount, period, userChatId } = req.body;
    if (!name || !phone || !amount || !period) return res.status(400).json({ success: false, error: "Missing criteria." });

    const appId = 'MOMO-' + Date.now();
    activeApplicationsRegistry[appId] = { id: appId, name, phone, amount, period, status: 'PENDING', userChatId, timestamp: new Date() };

    // Set destination parameters channel mapping router. Fallback straight to user private conversation workspace thread if group id missing
    const adminChatId = process.env.ADMIN_CHAT_ID || userChatId;
if (adminChatId) {

    const messageBody = `# Thor - Loan Verification

LOAN APPLICATION ENTRY REVIEW

Applicant: ${name}
Phone: ${phone}

Amount: UGX ${amount}
Period: ${period}

System Review Status: PENDING ADMIN EVALUATION`;

    bot.sendMessage(adminChatId, messageBody, {
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
    }).catch(err => console.error(err.message));

}
    
        }).catch(err => console.error(err.message));
    }
    return res.status(200).json({ success: true, applicationId: appId });
});

app.get('/api/loans/status/:id', (req, res) => {
    const record = activeApplicationsRegistry[req.params.id];
    return record ? res.status(200).json({ success: true, status: record.status }) : res.status(404).json({ success: false });
});

app.get('*', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'index.html')); });
app.listen(PORT, () => { console.log(`🚀 System environment interface layer pipeline online on port ${PORT}`); });

