import { NextRequest, NextResponse } from 'next/server';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID;

export async function POST(request: NextRequest) {
  try {
    // Validate environment variables
    if (!TELEGRAM_BOT_TOKEN) {
      return NextResponse.json(
        { error: 'Telegram bot token not configured' },
        { status: 500 }
      );
    }

    if (!TELEGRAM_CHANNEL_ID) {
      return NextResponse.json(
        { error: 'Telegram channel ID not configured' },
        { status: 500 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { message } = body;

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Send message to Telegram
    const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

    const response = await fetch(telegramUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHANNEL_ID,
        text: message,
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Telegram API error:', data);
      return NextResponse.json(
        { error: data.description || 'Failed to send message to Telegram' },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      message_id: data.result?.message_id,
    });
  } catch (error) {
    console.error('Telegram route error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  const configured = Boolean(TELEGRAM_BOT_TOKEN && TELEGRAM_CHANNEL_ID);

  return NextResponse.json({
    status: configured ? 'configured' : 'not_configured',
    bot_token: TELEGRAM_BOT_TOKEN ? 'set' : 'missing',
    channel_id: TELEGRAM_CHANNEL_ID ? 'set' : 'missing',
  });
}
