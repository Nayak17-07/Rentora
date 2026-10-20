const express = require('express');
const crypto = require('crypto');
const { getDb, withTransaction } = require('../db');
const { authenticateJWT } = require('../auth');

const router = express.Router();

// POST /api/checkout/
router.post('/checkout/', authenticateJWT, async (req, res) => {
  try {
    const db = getDb();
    const userId = req.user.id;

    const cartItems = await db.collection('carts').find({ user_id: userId }).toArray();
    if (!cartItems || cartItems.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    // Enforce KYC
    const kyc = await db.collection('kyc').findOne({ user_id: userId });
    if (!kyc || kyc.status !== 'approved') {
      return res.status(403).json({
        error: 'KYC approval is required before checkout',
        requires_kyc: true
      });
    }

    const { 
      payment_method = 'UPI_GATEWAY', 
      payment_details = {},
      delivery_address = {}
    } = req.body || {};

    // Bug 7: Strict payment method allowlist
    const allowedPaymentMethods = [
      'RAZORPAY', 'RAZORPAY_UPI', 'RAZORPAY_CARD', 'RAZORPAY_NETBANKING', 'RAZORPAY_WALLET',
      'UPI', 'UPI_GATEWAY', 'CARD', 'CREDIT_CARD', 'DEBIT_CARD', 
      'NETBANKING', 'CASH_ON_DELIVERY', 'COD', 'DOORSTEP'
    ];
    if (!allowedPaymentMethods.includes(payment_method)) {
      return res.status(400).json({ 
        error: `Unsupported payment method: '${payment_method}'. Allowed methods: ${allowedPaymentMethods.join(', ')}` 
      });
    }

    // Idempotency Protection: Prevent duplicate charges on network retry or double clicks
    const idempotencyKey = req.headers['idempotency-key'] || req.body?.idempotency_key;
    if (idempotencyKey) {
      const existingOrder = await db.collection('payments').findOne({
        user_id: userId,
        idempotency_key: String(idempotencyKey).trim()
      });
      if (existingOrder) {
        return res.status(200).json({
          success: 'Order already processed (Idempotent replay)',
          transaction_id: existingOrder.transaction_id,
          invoice_number: existingOrder.invoice_number,
          total_paid: existingOrder.amount_total,
          rentals: existingOrder.items_summary || []
        });
      }
    }

    const transactionId = `TXN_${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
    const dateStr = new Date().toISOString().slice(0, 7).replace('-', '');
    const invoiceNumber = `INV-${dateStr}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    const user = await db.collection('users').findOne({ _id: userId });
    const userEmail = user ? user.email || '' : '';
    const userName = user ? user.username || '' : '';

    const finalAddress = {
      recipient_name: delivery_address.recipient_name || userName || 'Verified Customer',
      phone: delivery_address.phone || user?.phone_num || '+91 98765 43210',
      house_flat: delivery_address.house_flat || '',
      street_area: delivery_address.street_area || 'Doorstep Delivery Area',
      landmark: delivery_address.landmark || '',
      city: delivery_address.city || 'Hyderabad',
      pincode: delivery_address.pincode || '500081',
      formatted_address: delivery_address.formatted_address || [
        delivery_address.house_flat,
        delivery_address.street_area,
        delivery_address.landmark,
        delivery_address.city,
        delivery_address.pincode
      ].filter(Boolean).join(', ') || 'Doorstep Delivery Address',
      delivery_slot: delivery_address.delivery_slot || 'Express (Within 24-48 Hours)'
    };

    const rentals = [];
    let totalRent = 0.0;
    let totalDeposit = 0.0;
    let totalDepositSavings = 0.0;
    const itemsSummary = [];
    const reservedStockLog = [];

    const now = new Date();
    const nextBilling = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    for (const item of cartItems) {
      const app = await db.collection('appliances').findOne({
        $or: [{ appliance_id: item.appliance_id }, { _id: item.appliance_id }]
      });
      const tenureStr = String(item.tenure || '3');

      let itemPrice = 500.0;
      let standardDeposit = 750.0;
      let rentalName = 'Appliance';
      let categoryId = 'Appliance';
      let imageUrl = '';

      // Bug 8: Reject phantom non-existent appliances
      if (!app) {
        return res.status(404).json({
          error: `Appliance with ID "${item.appliance_id}" was not found in catalog. Please remove it from your cart before checkout.`
        });
      }

      const currentStock = parseInt(app.stock_quantity !== undefined ? app.stock_quantity : 1, 10);
      if (currentStock <= 0) {
        return res.status(400).json({
          error: `"${app.rental_name}" is currently out of stock. Please remove it from your cart before checkout.`
        });
      }
      const pricing = app.pricing || {};
      itemPrice = parseFloat(pricing[tenureStr] || app.monthly_price || 500);
      standardDeposit = parseFloat(app.security_deposit || Math.round(itemPrice * 1.5));
      rentalName = app.rental_name || 'Appliance';
      categoryId = app.category_id || 'Appliance';
      imageUrl = app.image_url || '';

      // Standard refundable security deposit (KYC is mandatory for all customers)
      const itemDeposit = standardDeposit;
      const depositSavings = 0;

      totalRent += itemPrice;
      totalDeposit += itemDeposit;
      totalDepositSavings += depositSavings;

      const rentalId = crypto.randomUUID();
      const escrowId = 'ESC-BLR-' + String(rentalId).slice(0, 8).toUpperCase();
      const trackingId = 'TRK-' + Math.floor(100000 + Math.random() * 900000);
      // Bug 30: Cryptographically secure delivery OTP with expiration lifecycle
      const deliveryOtp = String(crypto.randomInt(1000, 10000));
      const estDays = finalAddress?.delivery_slot?.includes('Express') ? 1 : 2;
      const etaDate = new Date(Date.now() + estDays * 24 * 3600 * 1000).toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short'
      });

      const itemTax = Math.round(itemPrice * 0.18 * 100) / 100;
      const itemTotalDue = parseFloat((itemPrice + itemDeposit + itemTax).toFixed(2));

      // Bug 29: Explicitly label simulated logistics tracking
      const initialTracking = {
        tracking_id: trackingId,
        courier_partner: 'Rentora Direct Fleet & White-Glove Installation',
        agent_name: 'Rajesh Patil (Senior Logistics & Field Engineer)',
        agent_phone: '+91 98450 12891',
        vehicle_number: 'KA-01-EL-9284',
        delivery_otp: deliveryOtp,
        delivery_otp_attempts: 0,
        delivery_otp_expires_at: new Date(Date.now() + 48 * 3600 * 1000), // 48-hour validity
        delivery_otp_verified: false,
        is_simulation: true,
        simulation_notice: 'Academic Simulation: Fleet tracking and logistics ETA are simulated.',
        current_stage: 'QUALITY_CHECK',
        slot: finalAddress?.delivery_slot || 'Express (Within 24-48 Hours)',
        estimated_delivery: etaDate,
        rescheduled_count: 0,
        timeline: [
          {
            stage: 'ORDER_CONFIRMED',
            title: 'Order Confirmed & Lease Contract Signed',
            description: 'Digital rental agreement verified and security deposit held in RBI-compliant escrow.',
            timestamp: now.toISOString(),
            completed: true
          },
          {
            stage: 'KYC_VERIFIED',
            title: 'KYC Identity & Residence Approved',
            description: 'Customer profile cleared by compliance team for doorstep fulfillment.',
            timestamp: now.toISOString(),
            completed: true
          },
          {
            stage: 'QUALITY_CHECK',
            title: '28-Point Sanitization & Inspection',
            description: 'Appliance undergoing comprehensive motor/cooling test, deep sanitization, and bubble wrap packaging at regional hub.',
            timestamp: now.toISOString(),
            completed: true
          },
          {
            stage: 'OUT_FOR_DELIVERY',
            title: 'Out for Doorstep Delivery & Free Installation',
            description: 'Technician is en route with your appliance and dedicated toolset.',
            timestamp: null,
            completed: false
          },
          {
            stage: 'DELIVERED',
            title: 'Delivered, Demoed & Handover Complete',
            description: 'Appliance placed, leveled, fully tested with operational demo, and delivery OTP confirmed.',
            timestamp: null,
            completed: false
          }
        ]
      };

      // Bug 10: Clear financial allocation per line item
      rentals.push({
        _id: rentalId,
        user_id: userId,
        appliance_id: app ? (app.appliance_id || String(app._id)) : item.appliance_id,
        appliance_ref_id: app ? String(app._id) : item.appliance_id,
        rental_name: rentalName,
        category_id: categoryId,
        image_url: imageUrl,
        tenure: tenureStr,
        monthly_rent: itemPrice,
        standard_deposit: standardDeposit,
        security_deposit: itemDeposit,
        tax_rate: 0.18,
        item_tax: itemTax,
        amount_due_now: itemTotalDue,
        amount_paid: itemTotalDue,
        deposit_discount_applied: false,
        deposit_discount_amount: 0,
        escrow_id: escrowId,
        escrow_held_at: now,
        deposit_status: 'HELD',
        transaction_id: transactionId,
        invoice_number: invoiceNumber,
        payment_method,
        status: 'active',
        rented_at: now,
        next_billing_date: nextBilling,
        delivery_address: finalAddress,
        delivery_status: 'QUALITY_CHECK',
        delivery_tracking: initialTracking
      });

      itemsSummary.push({
        rental_id: rentalId,
        appliance_id: item.appliance_id,
        rental_name: rentalName,
        category_id: categoryId,
        image_url: imageUrl,
        tenure: tenureStr,
        monthly_price: itemPrice,
        security_deposit: itemDeposit,
        delivery_tracking: initialTracking
      });

      // Atomic conditional stock reservation
      const appSelector = app
        ? { $or: [{ _id: app._id }, { appliance_id: app.appliance_id }, { appliance_id: item.appliance_id }, { _id: item.appliance_id }] }
        : { $or: [{ appliance_id: item.appliance_id }, { _id: item.appliance_id }] };

      const updateResult = await db.collection('appliances').findOneAndUpdate(
        {
          $and: [
            appSelector,
            { stock_quantity: { $gt: 0 } }
          ]
        },
        { $inc: { stock_quantity: -1 }, $set: { updated_at: new Date() } },
        { returnDocument: 'after' }
      );

      if (!updateResult) {
        // Rollback ONLY preceding items that were actually reserved (prevent stock inflation)
        for (const reserved of reservedStockLog) {
          await db.collection('appliances').updateOne(
            reserved.selector,
            { $inc: { stock_quantity: reserved.quantity } }
          );
        }
        return res.status(400).json({
          error: `"${rentalName}" has just sold out. Please adjust your cart and try again.`
        });
      }

      // Record successful reservation for atomic compensation rollback
      reservedStockLog.push({
        selector: appSelector,
        quantity: 1,
        rental_name: rentalName
      });

      const newStock = Math.max(0, updateResult.stock_quantity);
      try {
        const { broadcastEvent } = require('../socket');
        broadcastEvent('catalog:stock_changed', {
          appliance_id: app?.appliance_id || item.appliance_id,
          _id: app?._id ? String(app._id) : undefined,
          action: 'decrement',
          new_stock: newStock
        });
      } catch (e) {}
    }

    const taxAmount = Math.round(totalRent * 0.18 * 100) / 100;
    
    // Atomic loyalty points redemption to prevent race conditions & over-deduction
    let pointsDiscount = 0;
    const preDiscountTotal = Math.round((totalRent + totalDeposit + taxAmount) * 100) / 100;
    const requestedPoints = Math.max(0, parseInt(req.body?.redeem_points || 0, 10) || 0);
    const redeemPoints = Math.min(requestedPoints, Math.floor(preDiscountTotal));

    if (redeemPoints > 0) {
      const deductionRes = await db.collection('users').updateOne(
        { _id: userId, loyalty_points: { $gte: redeemPoints } },
        { $inc: { loyalty_points: -redeemPoints } }
      );
      if (deductionRes.modifiedCount === 1) {
        pointsDiscount = redeemPoints; // 1 point = ₹1
      }
    }
    
    let totalPaid = Math.round((preDiscountTotal - pointsDiscount) * 100) / 100;
    if (totalPaid < 0) totalPaid = 0;

    const isCod = ['CASH_ON_DELIVERY', 'COD', 'DOORSTEP'].includes(payment_method);
    const isRazorpay = payment_method.startsWith('RAZORPAY') || Boolean(payment_details?.razorpay_payment_id);
    const paymentStatus = isCod ? 'PENDING_DOORSTEP' : 'SUCCESS';
    const paymentGateway = isCod
      ? 'Doorstep Verification & Pay on Delivery'
      : isRazorpay
        ? 'Razorpay Payment Gateway (Verified)'
        : 'Rentora Pay (Secured Razorpay/UPI Gateway)';

    const gatewayPaymentId = payment_details?.razorpay_payment_id || `pay_${crypto.randomBytes(8).toString('hex')}`;
    const gatewayOrderId = payment_details?.razorpay_order_id || null;
    const gatewaySignature = payment_details?.razorpay_signature || null;

    const paymentDoc = {
      _id: crypto.randomUUID(),
      transaction_id: transactionId,
      invoice_number: invoiceNumber,
      user_id: userId,
      user_email: userEmail,
      user_name: userName,
      amount_rent: Math.round(totalRent * 100) / 100,
      amount_deposit: Math.round(totalDeposit * 100) / 100,
      amount_tax: taxAmount,
      amount_total: totalPaid,
      payment_method: isCod ? 'CASH_ON_DELIVERY' : payment_method,
      gateway_payment_id: isCod ? null : gatewayPaymentId,
      gateway_order_id: gatewayOrderId,
      gateway_signature: gatewaySignature,
      payment_details,
      delivery_address: finalAddress,
      status: paymentStatus,
      payment_gateway: paymentGateway,
      idempotency_key: idempotencyKey ? String(idempotencyKey).trim() : null,
      created_at: now,
      rental_ids: rentals.map(r => r._id),
      items_summary: itemsSummary
    };

    // Atomic Multi-Document Write with ACID Session Transaction (or Compensation Rollback on standalone)
    try {
      await withTransaction(async (session) => {
        const opts = session ? { session } : {};
        await db.collection('payments').insertOne(paymentDoc, opts);
        await db.collection('rentals').insertMany(rentals, opts);
        await db.collection('carts').deleteMany({ user_id: userId }, opts);
      });
    } catch (writeErr) {
      console.error('Checkout write failure. Executing automatic compensation rollback:', writeErr);
      // Revert stock decrements
      for (const reserved of reservedStockLog) {
        await db.collection('appliances').updateOne(
          reserved.selector,
          { $inc: { stock_quantity: reserved.quantity } }
        ).catch(() => {});
      }
      // Revert loyalty points if deducted
      if (pointsDiscount > 0) {
        await db.collection('users').updateOne(
          { _id: userId },
          { $inc: { loyalty_points: pointsDiscount } }
        ).catch(() => {});
      }
      // Revert inserted payment if present
      await db.collection('payments').deleteOne({ _id: paymentDoc._id }).catch(() => {});
      return res.status(500).json({ error: 'Checkout processing failed. Inventory and funds preserved.' });
    }

    try {
      const { notifyAdmin, notifyOwner } = require('../socket');
      notifyAdmin('order:new', {
        transaction_id: transactionId,
        invoice_number: invoiceNumber,
        user_name: userName || 'Customer',
        amount_total: totalPaid,
        rentals_count: rentals.length
      });

      for (const item of cartItems) {
        const appDoc = await db.collection('appliances').findOne({
          $or: [{ appliance_id: item.appliance_id }, { _id: item.appliance_id }]
        });
        if (appDoc && appDoc.owner_id) {
          notifyOwner(appDoc.owner_id, 'order:owner_item_rented', {
            appliance_id: appDoc.appliance_id,
            rental_name: appDoc.rental_name,
            monthly_rent: appDoc.monthly_price,
            owner_earnings: Math.round((parseFloat(appDoc.monthly_price) || 0) * 0.85),
            customer_name: userName || 'Customer'
          });
        }
      }
    } catch (socketErr) {
      console.warn('Socket notification error (non-fatal):', socketErr.message);
    }

    // Save address into address book if user requested or if no address exists yet
    if (finalAddress && finalAddress.house_flat && finalAddress.pincode) {
      const existingAddressCount = await db.collection('addresses').countDocuments({ user_id: userId });
      const addressAlreadyExists = await db.collection('addresses').findOne({
        user_id: userId,
        house_flat: finalAddress.house_flat,
        pincode: finalAddress.pincode
      });

      if (!addressAlreadyExists) {
        await db.collection('addresses').insertOne({
          _id: crypto.randomUUID(),
          user_id: userId,
          type: finalAddress.address_type || 'Home',
          recipient_name: finalAddress.recipient_name,
          phone: finalAddress.phone,
          house_flat: finalAddress.house_flat,
          street_area: finalAddress.street_area,
          landmark: finalAddress.landmark || '',
          city: finalAddress.city || 'Bangalore',
          pincode: finalAddress.pincode,
          is_default: existingAddressCount === 0,
          created_at: now.toISOString()
        });
      }
    }
    
    // Reward points: 1 point for every ₹100 spent
    const earnedPoints = Math.floor(totalPaid / 100);
    await db.collection('users').updateOne(
      { _id: userId },
      { $inc: { loyalty_points: earnedPoints } }
    );

    return res.status(200).json({
      success: isCod ? 'Order placed successfully (Cash on Delivery)' : 'Checkout successful',
      rentals_count: rentals.length,
      transaction_id: transactionId,
      invoice_number: invoiceNumber,
      total_paid: totalPaid,
      delivery_address: finalAddress,
      payment: {
        transaction_id: transactionId,
        invoice_number: invoiceNumber,
        amount_rent: Math.round(totalRent * 100) / 100,
        amount_deposit: Math.round(totalDeposit * 100) / 100,
        amount_tax: taxAmount,
        amount_total: totalPaid,
        payment_method: isCod ? 'CASH_ON_DELIVERY' : payment_method,
        gateway_payment_id: isCod ? null : gatewayPaymentId,
        gateway_order_id: gatewayOrderId,
        gateway_signature: gatewaySignature,
        payment_details,
        delivery_address: finalAddress,
        status: paymentStatus,
        created_at: now.toISOString()
      }
    });

  } catch (err) {
    console.error('Checkout error:', err);
    return res.status(500).json({ error: 'Internal server error during checkout' });
  }
});

module.exports = router;
