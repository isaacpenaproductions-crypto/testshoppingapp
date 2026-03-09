const TelegramBot = require('node-telegram-bot-api');
const { createClient } = require('@supabase/supabase-js');

// Environment variables will be populated at runtime by Netlify
exports.handler = async (event, context) => {
    // Initialize Supabase client inside the handler
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_KEY;
    const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;

    if (!SUPABASE_URL || !SUPABASE_KEY || !TELEGRAM_TOKEN) {
        return { statusCode: 500, body: JSON.stringify({ error: "Missing environment variables" }) };
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    // We use the Telegram bot in "no polling" mode for serverless functions
    const bot = new TelegramBot(TELEGRAM_TOKEN);
    
    // Only allow POST requests (webhooks)
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 200,
            body: JSON.stringify({ status: "Function is alive!", message: "Send a POST request from Telegram." }),
        };
    }

    try {
        const update = JSON.parse(event.body);
        const text = update?.message?.text;
        const chatId = update?.message?.chat?.id;

        if (!text || !chatId) {
            return { statusCode: 200, body: 'No text or chat_id found in update' };
        }

        console.log(`Processing message: ${text}`);

        // Handle commands
        // Add Item: If the message starts with 'Add' (e.g., 'Add apples')
        if (text.toLowerCase().startsWith('add ')) {
            const itemName = text.substring(4).trim();
            if (itemName) {
                console.log(`Attempting to add: ${itemName}`);
                const { data, error } = await supabase
                    .table('shopping_list')
                    .insert([{ name: itemName }])
                    .select(); // Ask Supabase to return the inserted row
                
                if (error) throw error;
                
                // Check if data was actually inserted (RLS check)
                if (data && data.length > 0) {
                    await bot.sendMessage(chatId, `✅ Added '${itemName}' to the shopping list.`);
                } else {
                    await bot.sendMessage(chatId, `⚠️ Operation blocked: The item wasn't added. This usually means Row Level Security (RLS) is enabled on your 'shopping_list' table without policies, or you are using the 'anon' key instead of the 'service_role' key.`);
                }
            } else {
                await bot.sendMessage(chatId, "❓ Please specify what to add (e.g., 'Add apples').");
            }
        } 
        // Retrieve List: If the message is exactly 'List'
        else if (text.trim().toLowerCase() === 'list') {
            const { data, error } = await supabase
                .table('shopping_list')
                .select('*');
            
            if (error) throw error;
            
            if (data && data.length > 0) {
                const formattedList = data.map(item => `• ${item.name}`).join("\n");
                await bot.sendMessage(chatId, `🛒 *Your Shopping List:*\n${formattedList}`, { parse_mode: 'Markdown' });
            } else {
                await bot.sendMessage(chatId, "🛒 Your shopping list is empty.");
            }
        }
        // Clear List: If the message is 'Clear'
        else if (text.trim().toLowerCase() === 'clear') {
            const { error: deleteError } = await supabase
                .table('shopping_list')
                .delete()
                .neq('name', '___impossible_value___');
                
            if (deleteError) throw deleteError;
                
            await bot.sendMessage(chatId, "🗑️ Shopping list cleared.");
        }

        // Return a 200 OK so Telegram knows we processed the webhook
        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Update processed successfully" }),
        };

    } catch (error) {
        console.error("Error processing update:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message }),
        };
    }
};
