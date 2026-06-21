import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getAdminDb } from '@/lib/firebaseAdmin';
import type { GmbAuth, Vendor } from '@/types';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state'); // vendorId
  const dashboardUrl = new URL('/admin/dashboard', 'https://hyperdelivery.shop');

  if (!code || !state) {
    dashboardUrl.searchParams.set('error', 'oauth_failed');
    return NextResponse.redirect(dashboardUrl);
  }

  try {
    const adminDb = getAdminDb();
    const vendorId = state;
    const redirectUri = 'https://hyperdelivery.shop/api/oauth/google/callback';

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      redirectUri
    );

    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.access_token) {
        throw new Error('Authentication failed, no access token received.');
    }
    
    if (!tokens.refresh_token) {
      dashboardUrl.searchParams.set(
        'error',
        encodeURIComponent(
          'No refresh token received. This can happen if you have already authorized this app. Please try removing app access from your Google Account settings and try again.'
        )
      );
      return NextResponse.redirect(dashboardUrl);
    }

    oauth2Client.setCredentials(tokens);

    const gmbAuthPayload: GmbAuth = {
      accessToken: tokens.access_token!,
      refreshToken: tokens.refresh_token!,
      expiryDate: tokens.expiry_date!,
      scope: tokens.scope!,
    };

    const vendorRef = adminDb.collection('vendors').doc(vendorId);
    
    // Step 1: List accounts using the account management API
    const myBusinessAccountManagement = google.mybusinessaccountmanagement({
      version: 'v1',
      auth: oauth2Client,
    });
    const accountsResponse = await myBusinessAccountManagement.accounts.list();
    const accounts = accountsResponse.data.accounts;

    if (!accounts || accounts.length === 0) {
      console.warn('⚠️ No Google Business accounts found for this user.');
      dashboardUrl.searchParams.set('gmb_status', 'no_locations_found');
      return NextResponse.redirect(dashboardUrl);
    }
    const primaryAccount = accounts[0];
    const accountId = primaryAccount.name?.split('/').pop() || null;

    // Combine auth payload and account ID and save to Firestore
    await vendorRef.set({ 
        gmbAuth: gmbAuthPayload,
        gmbAccountId: accountId
    }, { merge: true });


    // Step 2: List locations using a direct fetch call
    const locationsApiUrl = `https://mybusinessbusinessinformation.googleapis.com/v1/${primaryAccount.name}/locations?readMask=name,title`;
    
    const locationsResponse = await fetch(locationsApiUrl, {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
      },
    });

    if (!locationsResponse.ok) {
        const errorBody = await locationsResponse.json();
        console.error('❌ Error fetching locations via REST:', errorBody);
        throw new Error(`Failed to fetch locations: ${errorBody.error?.message || 'Unknown error'}`);
    }

    const locationsData = await locationsResponse.json();
    const locations = locationsData.locations || [];


    if (locations.length === 0) {
      console.warn('⚠️ No locations found under this account.');
      dashboardUrl.searchParams.set('gmb_status', 'no_locations_found');
      return NextResponse.redirect(dashboardUrl);
    }

    console.log(`✅ Found ${locations.length} locations via REST API.`);
    const formattedLocations = locations.map((loc: any) => ({
      locationId: loc.name!,
      locationName: loc.title || 'Unnamed Location',
    }));

    dashboardUrl.searchParams.set('gmb_status', 'success');
    dashboardUrl.searchParams.set(
      'locations',
      encodeURIComponent(JSON.stringify(formattedLocations))
    );
    return NextResponse.redirect(dashboardUrl);

  } catch (error: any) {
    console.error('❌ Callback handler error:', {
      message: error.message,
      stack: error.stack,
      response: error.response?.data,
    });
    dashboardUrl.searchParams.set(
      'error',
      encodeURIComponent(error.message || 'OAuth callback failed.')
    );
    return NextResponse.redirect(dashboardUrl);
  }
}
