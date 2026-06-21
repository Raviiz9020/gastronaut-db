'use strict';

/**
 * Cloud Run – HyperPoints Manager
 * Works even when Firestore event payload is raw binary (protobuf) or JSON.
 * No external @google/events dependency (no ESM import issues).
 */

const functions = require('@google-cloud/functions-framework');
const admin = require('firebase-admin');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

// Initialize Firebase Admin
admin.initializeApp({ projectId: 'hyperdelivery-c381b' });
const db = getFirestore();
console.log('✅ Connected to Firestore project:', db.projectId);

// Helper to safely extract Firestore-like fields to plain JS
function extract(firestoreFields = {}) {
  const result = {};
  for (const key in firestoreFields) {
    const field = firestoreFields[key];
    if (field == null) { result[key] = null; continue; }
    if (field.stringValue !== undefined) result[key] = field.stringValue;
    else if (field.integerValue !== undefined) result[key] = parseInt(field.integerValue, 10);
    else if (field.doubleValue !== undefined) result[key] = Number(field.doubleValue);
    else if (field.booleanValue !== undefined) result[key] = field.booleanValue;
    else if (field.mapValue?.fields) result[key] = extract(field.mapValue.fields);
    else result[key] = null;
  }
  return result;
}

// ✅ CloudEvent entrypoint
functions.cloudEvent('manageHyperPoints', async (event) => {
  console.log('🚀 CloudEvent received - subject:', event.subject || 'N/A');

  let value = null;
  let oldValue = null;

  try {
    // 1️⃣ JSON-style CloudEvent (most common if Eventarc sends JSON)
    if (event.data?.value || event.data?.oldValue) {
      value = event.data.value || null;
      oldValue = event.data.oldValue || null;
      console.log('✅ Parsed JSON CloudEvent (value/oldValue detected)');
    }

    // 2️⃣ If still nothing, and payload looks like binary array
    else if (Array.isArray(event.data?.data)) {
      const buf = Buffer.from(event.data.data);
      const text = buf.toString('utf8');
      console.log(`🧩 Received binary payload, ${buf.length} bytes`);
      try {
        const parsed = JSON.parse(text);
        value = parsed.value || null;
        oldValue = parsed.oldValue || null;
        console.log('✅ Extracted JSON from binary payload');
      } catch {
        console.warn('⚠ Binary payload not JSON (likely protobuf)');
      }
    }

    // 3️⃣ Fallback: Firestore-style wrapper
    else if (event.data?.document) {
      value = event.data.document || null;
      oldValue = event.data.oldDocument || null;
      console.log('✅ Used fallback document/oldDocument structure');
    }

  } catch (err) {
    console.error('❌ Error decoding event data:', err);
  }

  if (!value && !oldValue) {
    console.warn('⚠ No before/after document state found — exiting.');
    return;
  }

  const after = extract(value?.fields || {});
  const before = extract(oldValue?.fields || {});
  const orderPath = event.subject || value?.name || '';
  const orderId = orderPath.split('/').pop() || '(unknown)';

  console.log(`📦 Order Triggered: ${orderId}`);
  console.log(`🆕 New status: ${after.status} | 🧾 Previous: ${before.status}`);

  const customerUsername = after.customerUsername || after.customer?.username;
  const vendorUsername = after.vendorUsername || after.vendor?.username;
  const statusNow = after.status;
  const statusBefore = before.status;
  const pointsEarned = Number(after.pointsEarned || 0);
  const pointsRedeemed = Number(after.pointsRedeemed || 0);

  if (!customerUsername || !vendorUsername) {
    console.warn('⚠ Missing customer/vendor username — exiting.');
    return;
  }

  const customerRef = db.collection('customers').doc(customerUsername);

  // CASE 1️⃣: New Order → Lock points
  const isNewOrder = !statusBefore && statusNow === 'Order Placed';
  if (isNewOrder && pointsRedeemed > 0) {
    console.log(`🔒 Locking ${pointsRedeemed} HP for ${customerUsername}`);
    await customerRef.update({
      [`lockedPoints.${vendorUsername}`]: FieldValue.increment(pointsRedeemed),
    });
    return;
  }

  // CASE 2️⃣: Order Completed → Redeem/Award points
  const isNowCompleted =
    (statusNow === 'Delivered' || statusNow === 'Picked Up') &&
    statusBefore !== statusNow;

  if (isNowCompleted) {
    const nowIso = new Date().toISOString();

    if (pointsEarned > 0) {
      console.log(`✅ Awarding +${pointsEarned} HP to ${customerUsername}`);
      await customerRef.update({
        [`hyperPoints.${vendorUsername}`]: FieldValue.increment(pointsEarned),
        lastActivityDate: nowIso,
      });
    }

    if (pointsRedeemed > 0) {
      console.log(`💳 Finalizing redemption of ${pointsRedeemed} HP`);
      await customerRef.update({
        [`hyperPoints.${vendorUsername}`]: FieldValue.increment(-Math.abs(pointsRedeemed)),
        [`lockedPoints.${vendorUsername}`]: FieldValue.increment(-Math.abs(pointsRedeemed)),
        lastActivityDate: nowIso,
      });
    }

    if (pointsEarned > 0 || pointsRedeemed > 0) {
      console.log('✅ Points processed successfully.');
      return;
    }
  }

  // CASE 3️⃣: Cancelled → Unlock points
  const isNowCancelled = statusNow === 'Cancelled' && statusBefore !== 'Cancelled';
  if (isNowCancelled && pointsRedeemed > 0) {
    console.log(`↩️ Refunding locked ${pointsRedeemed} HP for cancellation`);
    await customerRef.update({
      [`lockedPoints.${vendorUsername}`]: FieldValue.increment(-Math.abs(pointsRedeemed)),
    });
  }
});