import asyncio
import os
import json
from unittest.mock import MagicMock, patch

# Mock handler and dependencies
from handler import main

async def test_mock_event():
    # Mock environment variables
    os.environ['SUPABASE_URL'] = 'https://example.supabase.co'
    os.environ['SUPABASE_KEY'] = 'fake-key'
    os.environ['TELEGRAM_TOKEN'] = 'fake-token'

    # Mock Supabase
    with patch('handler.create_client') as mock_supabase:
        mock_client = MagicMock()
        mock_supabase.return_value = mock_client
        mock_table = MagicMock()
        mock_client.table.return_value = mock_table
        
        # Mock Telegram Application
        with patch('handler.Application.builder') as mock_builder:
            mock_app = MagicMock()
            mock_builder.return_value.token.return_value.build.return_value = mock_app
            
            # Simulate a Netlify event with a Telegram Update
            event = {
                "body": json.dumps({
                    "update_id": 12345,
                    "message": {
                        "message_id": 1,
                        "from": {"id": 1, "is_bot": False, "first_name": "Test"},
                        "chat": {"id": 123, "type": "private"},
                        "date": 1600000000,
                        "text": "Add apples"
                    }
                })
            }
            
            # Run the handler
            result = await main(event, None)
            
            print(f"Test Result: {result}")
            assert result['statusCode'] == 200

if __name__ == "__main__":
    asyncio.run(test_mock_event())
