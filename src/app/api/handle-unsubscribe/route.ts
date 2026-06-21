
export const runtime = 'nodejs'; // Force Node.js runtime for Firestore Admin SDK compatibility

import { NextRequest, NextResponse } from 'next/server';
import { handleUnsubscribe } from '@/ai/flows/handle-unsubscribe';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ success: false, message: 'Email is required.' }, { status: 400 });
    }

    // Call the simplified, direct Firestore function
    const result = await handleUnsubscribe({ email });

    if (result.success) {
      return NextResponse.json(result, { status: 200 });
    } else {
      // The function itself might determine failure (e.g., email not found).
      // Return a 200 OK with the failure message for the client to handle.
      return NextResponse.json(result, { status: 200 });
    }
  } catch (error: any) {
    console.error('API Error: /api/handle-unsubscribe', error);
    return NextResponse.json(
      { success: false, message: 'An internal server error occurred.' },
      { status: 500 }
    );
  }
}
