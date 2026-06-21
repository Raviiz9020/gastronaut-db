'use strict';

// ✅ Imports (no functional change — just consistent formatting)
const functions = require('@google-cloud/functions-framework');
const admin = require('firebase-admin');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { CloudEvent } = require('@google-cloud/functions-framework/build/src/cloudevents');

// ✅ Initialize Firebase Admin — explicitly connect to Firestore in `hyperdelivery-c381b`
admin.initializeApp({
  projectId: 'hyperdelivery-c381b', // Firestore DB project ID
});

const db = getFirestore();
console.log('✅ Connected to Firestore project:', db.projectId);

// CloudEvent Trigger for Firestore Order Updates
functions.cloudEvent('manageHyperPoints', async (cloudEvent) => {
  // ✅ DECODE THE PROTOBUF DATA
  const decodedData = new CloudEvent(cloudEvent).data;
  console.log('🚀 Decoded CloudEvent received:', JSON.stringify(decodedData));

  const value = decodedData?.value;
  const oldValue = decodedData?.oldValue;

  if (!value || !oldValue) {
    console.warn('⚠ No before/after document state found — exiting');
    return;
  }

  const after = extract(value.fields);
  const before = extract(oldValue.fields);

  const orderPath = decodedData.document;
  const orderId = orderPath?.split('/').pop();
  if (!orderId) {
    console.error('❌ Unable to extract orderId');
    return;
  }

  console.log(`📦 Order Update Triggered: ${orderId}`);

  const customerUsername = after.customerUsername;
  const vendorUsername = after.vendorUsername;
  const statusNow = after.status;
  const statusBefore = before.status;

  const pointsEarned = Number(after.pointsEarned || 0);
  const pointsRedeemed = Number(after.pointsRedeemed || 0);

  if (!customerUsername || !vendorUsername) {
    console.warn('⚠ customerUsername/vendorUsername missing — exiting');
    return;
  }

  const customerRef = db.collection('customers').doc(customerUsername);

  // ✅ CASE 1️⃣: NEW ORDER CREATED → Lock points immediately
  const isNewOrder = !before.status && after.status === 'Order Placed';
  if (isNewOrder && pointsRedeemed > 0) {
    console.log(`🔒 Locking ${pointsRedeemed} HP for ${customerUsername}`);
    await customerRef.update({
      [`lockedPoints.${vendorUsername}`]: FieldValue.increment(pointsRedeemed),
    });
    return;
  }

  // ✅ CASE 2️⃣: Order Completed → finalize redemption OR award points
  const isNowCompleted =
    (statusNow === 'Delivered' || statusNow === 'Picked Up') &&
    statusBefore !== statusNow;

  if (isNowCompleted) {
    const nowIso = new Date().toISOString();

    // Award new points
    if (pointsEarned > 0) {
      console.log(`✅ Awarding +${pointsEarned} HP to ${customerUsername}`);
      await customerRef.update({
        [`hyperPoints.${vendorUsername}`]: FieldValue.increment(pointsEarned),
        lastActivityDate: nowIso,
      });
    }

    // Finalize redeemed points
    if (pointsRedeemed > 0) {
      console.log(`💳 Finalizing redemption of ${pointsRedeemed} HP`);
      await customerRef.update({
        [`hyperPoints.${vendorUsername}`]: FieldValue.increment(-Math.abs(pointsRedeemed)),
        [`lockedPoints.${vendorUsername}`]: FieldValue.increment(-Math.abs(pointsRedeemed)),
        lastActivityDate: nowIso,
      });
    }

    if (pointsEarned > 0 || pointsRedeemed > 0) {
        console.log('✅ Points processed successfully for completed order.');
        return;
    }
  }


  // ✅ CASE 3️⃣: Order Cancelled → Unlock points back
  const isNowCancelled =
    statusNow === 'Cancelled' && statusBefore !== 'Cancelled';
  if (isNowCancelled && pointsRedeemed > 0) {
    console.log(`↩️ Refunding locked ${pointsRedeemed} HP for cancellation`);
    await customerRef.update({
      [`lockedPoints.${vendorUsername}`]: FieldValue.increment(
        -Math.abs(pointsRedeemed)
      ),
    });
  }
});

// ✅ Helper: Extract Firestore CloudEvent fields
function extract(firestoreFields = {}) {
  const result = {};
  for (const key in firestoreFields) {
    const field = firestoreFields[key];
    if (field.stringValue !== undefined) result[key] = field.stringValue;
    else if (field.integerValue !== undefined)
      result[key] = parseInt(field.integerValue, 10);
    else if (field.doubleValue !== undefined)
      result[key] = Number(field.doubleValue);
    else if (field.booleanValue !== undefined) result[key] = field.booleanValue;
    else if (field.mapValue?.fields)
      result[key] = extract(field.mapValue.fields);
    else result[key] = null;
  }
  return result;
}
