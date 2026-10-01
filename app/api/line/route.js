import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { messages } = body;

    const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    const userId = process.env.LINE_USER_ID;

    if (!channelAccessToken || !userId) {
      console.error('Missing LINE configuration environment variables');
      return NextResponse.json(
        { error: 'LINE Environment variables are missing' },
        { status: 500 }
      );
    }

    // แปลงข้อความให้อยู่ใน Format messages array ของ LINE
    const messagePayload = Array.isArray(messages)
      ? messages.map((text) => ({ type: 'text', text }))
      : [{ type: 'text', text: messages }];

    // ยิง Push Message ไปยัง LINE Messaging API
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${channelAccessToken}`,
      },
      body: JSON.stringify({
        to: userId,
        messages: messagePayload,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('LINE API Error Response:', data);
      return NextResponse.json({ error: data }, { status: response.status });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Failed to send LINE notification:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
