import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { shopeeItemId, shopeeModelId, quantity } = body;

    if (!shopeeItemId) {
      return NextResponse.json({ success: false, error: 'shopeeItemId is required' }, { status: 400 });
    }

    const qty = parseInt(quantity) || 1;
    const orderSn = 'SHP-' + Math.floor(Date.now() / 1000) + '-' + Math.floor(Math.random() * 1000);

    // Formulate a mock Shopee webhook payload (Order Status Changed push notification)
    const webhookPayload = {
      code: 3, // Code 3 indicates order status push notification
      data: {
        ordersn: orderSn,
        status: 'READY_TO_SHIP',
        item_list: [
          {
            item_id: shopeeItemId,
            model_id: shopeeModelId ? shopeeModelId : '0',
            model_quantity_purchased: qty,
            quantity: qty,
          }
        ]
      }
    };

    // Determine absolute callback URL (assuming standard localhost if headers are missing)
    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const webhookUrl = `${protocol}://${host}/api/shopee/webhook`;

    console.log(`[SIMULATOR] Dispatched simulated Shopee order to: ${webhookUrl}`);
    
    // Call our local webhook endpoint
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookPayload),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Webhook returned error status');
    }

    return NextResponse.json({ 
      success: true, 
      orderSn, 
      message: `Simulasi order berhasil dikirim ke webhook. ${data.message || ''}` 
    });
  } catch (error: any) {
    console.error('[SIMULATOR] Error firing mock webhook:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
