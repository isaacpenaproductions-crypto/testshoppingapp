import os
import json
import asyncio
from supabase import create_client, Client
from telegram import Update, Bot
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes

# Environment variables
SUPABASE_URL = os.environ.get('SUPABASE_URL')
SUPABASE_KEY = os.environ.get('SUPABASE_KEY')
TELEGRAM_TOKEN = os.environ.get('TELEGRAM_TOKEN')

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle incoming messages."""
    text = update.message.text
    chat_id = update.message.chat_id

    if not text:
        return

    # Add Item: If the message starts with 'Add' (e.g., 'Add apples')
    if text.lower().startswith('add '):
        item_name = text[4:].strip()
        if item_name:
            try:
                response = supabase.table('shopping_list').insert({"name": item_name}).execute()
                await update.message.reply_text(f"✅ Added '{item_name}' to the shopping list.")
            except Exception as e:
                await update.message.reply_text(f"❌ Error adding item: {str(e)}")
        else:
            await update.message.reply_text("❓ Please specify what to add (e.g., 'Add apples').")

    # Retrieve List: If the message is exactly 'List'
    elif text.strip().lower() == 'list':
        try:
            response = supabase.table('shopping_list').select("*").execute()
            items = response.data
            if items:
                formatted_list = "\n".join([f"• {item['name']}" for item in items])
                await update.message.reply_text(f"🛒 **Your Shopping List:**\n{formatted_list}", parse_mode='Markdown')
            else:
                await update.message.reply_text("🛒 Your shopping list is empty.")
        except Exception as e:
            await update.message.reply_text(f"❌ Error retrieving list: {str(e)}")

    # Clear List: If the message is 'Clear'
    elif text.strip().lower() == 'clear':
        try:
            # Delete all rows: we use a filter that matches all items
            supabase.table('shopping_list').delete().neq('name', '___impossible_value___').execute()
            await update.message.reply_text("🗑️ Shopping list cleared.")
        except Exception as e:
            await update.message.reply_text(f"❌ Error clearing list: {str(e)}")

async def main(event, context):
    """Netlify function entry point."""
    try:
        # Initialize the bot and application
        application = Application.builder().token(TELEGRAM_TOKEN).build()
        
        # Add handlers
        application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
        
        # Initialize application
        await application.initialize()

        # Parse the update from the Netlify event body
        body = json.loads(event.get('body', '{}'))
        update = Update.de_json(body, application.bot)
        
        # Process the update
        await application.process_update(update)
        
        # Shutdown application to clean up
        await application.shutdown()

        return {
            "statusCode": 200,
            "body": json.dumps({"status": "ok"})
        }
    except Exception as e:
        print(f"Error: {e}")
        return {
            "statusCode": 500,
            "body": json.dumps({"error": str(e)})
        }

def handler(event, context):
    """Sync wrapper for the async main function."""
    return asyncio.run(main(event, context))
