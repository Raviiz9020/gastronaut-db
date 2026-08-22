const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const Razorpay = require('razorpay');
const crypto = require('crypto');

// Initialize Firebase Admin if not already initialized
if (admin.apps.length === 0) {
  admin.initializeApp();
}
const db = admin.firestore();

// ==========================================
// 1️⃣ Create Razorpay Order
// ==========================================
exports.createRazorpayOrder = onRequest(
  {
    cors: true,
    secrets: ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET'],
  },
  async (req, res) => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
      const { amount, receipt, notes } = req.body;

      if (!amount || Number(amount) <= 0) {
        return res.status(400).json({ error: 'Valid amount is required.' });
      }

      const keyId = process.env.RAZORPAY_KEY_ID;
      const keySecret = process.env.RAZORPAY_KEY_SECRET;

      if (!keyId || !keySecret) {
        console.error('❌ Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET in environment.');
        return res.status(500).json({ error: 'Payment gateway configuration missing on server.' });
      }

      const razorpay = new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
      });

      // Amount in paise (₹10.24 -> 1024 paise)
      const options = {
        amount: Math.round(Number(amount) * 100),
        currency: 'INR',
        receipt: receipt || `rcpt_${Date.now()}`,
        notes: notes || {},
      };

      const razorpayOrder = await razorpay.orders.create(options);
      console.log('✅ Razorpay order created successfully:', razorpayOrder.id);

      return res.status(200).json({
        success: true,
        orderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        keyId: keyId,
      });
    } catch (error) {
      console.error('❌ Error creating Razorpay order:', error);
      return res.status(500).json({
        error: 'Failed to create Razorpay order',
        details: error.message,
      });
    }
  }
);

// ==========================================
// 2️⃣ Verify Payment & Update Firestore
// ==========================================
exports.verifyRazorpayPayment = onRequest(
  {
    cors: true,
    secrets: ['RAZORPAY_KEY_SECRET'],
  },
  async (req, res) => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
      const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        orderIds,
        paymentGatewayFee,
        amountPaid,
      } = req.body;

      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({ error: 'Missing payment signature verification parameters.' });
      }

      const keySecret = process.env.RAZORPAY_KEY_SECRET;
      if (!keySecret) {
        console.error('❌ Missing RAZORPAY_KEY_SECRET in environment.');
        return res.status(500).json({ error: 'Gateway secret missing on server.' });
      }

      // Step 1: Verify HMAC SHA-256 signature
      const expectedSignature = crypto
        .createHmac('sha256', keySecret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      if (expectedSignature !== razorpay_signature) {
        console.error('❌ Payment signature verification failed');
        return res.status(400).json({ success: false, error: 'Invalid payment signature.' });
      }

      console.log('✅ Payment verified successfully:', razorpay_payment_id);

      // Step 2: Securely update orders to 'PAID' in Firestore
      if (Array.isArray(orderIds) && orderIds.length > 0) {
        const batch = db.batch();
        const nowIso = new Date().toISOString();

        for (const id of orderIds) {
          const orderRef = db.collection('orders').doc(id);
          const updateData = {
            paymentStatus: 'PAID',
            paymentMethod: 'Pay Now',
            paymentGateway: 'Razorpay',
            razorpayOrderId: razorpay_order_id,
            razorpayPaymentId: razorpay_payment_id,
            paymentConfirmedAt: nowIso,
          };
          if (typeof paymentGatewayFee === 'number') {
            updateData.paymentGatewayFee = paymentGatewayFee;
          }
          if (typeof amountPaid === 'number') {
            updateData.amountPaid = amountPaid;
          }
          batch.update(orderRef, updateData);
        }

        await batch.commit();
        console.log(`✅ Updated ${orderIds.length} orders to PAID in Firestore.`);
      }

      return res.status(200).json({
        success: true,
        message: 'Payment verified and orders updated to PAID.',
      });
    } catch (error) {
      console.error('❌ Error verifying payment:', error);
      return res.status(500).json({
        error: 'Payment verification failed',
        details: error.message,
      });
    }
  }
);
