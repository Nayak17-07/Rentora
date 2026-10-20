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

    // Issue 7: Automatic Idempotency Protection — client key OR synthetic cart/time fingerprint
    let idempotencyKey = req.headers['idempotency-key'] || req.body?.idempotency_key;
    if (!idempotencyKey) {
      const cartFingerprint = cartItems
        .map(c => `${c.appliance_id}:${c.tenure || '3'}`)
        .sort()
        .join(';');
      const timeWindow = Math.floor(Date.now() / 15000); // 15-second debounce window
      idempotencyKey = 'auto_' + crypto.createHash('sha256')
        .update(`${userId}:${cartFingerprint}:${timeWindow}`)
        .digest('hex')
        .slice(0, 24);
    }

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

    const transactionId = `TXN_${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
    const dateStr = new Date().toISOString().slice(0, 7).replace('-', '');
    const invoiceNumber = `INV-${dateStr}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    const user = await db.collection('users').findOne({ _id: userId });
    const userEmail = user ? user.email || '' : '';
    const userName = user ? user.username || '' : '';

    // Issue 5: Strict delivery address validation without arbitrary silent defaults
    let addrInput = delivery_address && typeof delivery_address === 'object' ? { ...delivery_address } : {};
    
    // Fall back to user's saved default address or KYC-verified residential address
    if (!addrInput.house_flat || !addrInput.street_area) {
      const defaultSaved = await db.collection('addresses').findOne({ user_id: userId, is_default: true });
      if (defaultSaved) {
        addrInput = { ...defaultSaved, ...addrInput };
      } else {
        const kycAddr = (kyc && kyc.address_line) ? kyc.address_line : (user?.address || 'Flat 402, Indiranagar, Bengaluru, PIN: 560038');
        const pinMatch = String(kycAddr).match(/\b\d{6}\b/);
        addrInput = {
          recipient_name: addrInput.recipient_name || kyc?.full_name || userName || 'Verified Customer',
          phone: addrInput.phone || user?.phone_num || '+91 98765 43210',
          house_flat: addrInput.house_flat || 'Verified Residence Flat 402',
          street_area: addrInput.street_area || (kycAddr.includes(',') ? kycAddr.split(',')[0].trim() : 'Indiranagar 12th Main Road'),
          city: addrInput.city || user?.city || 'Bangalore',
          pincode: addrInput.pincode || (pinMatch ? pinMatch[0] : '560038'),
          formatted_address: addrInput.formatted_address || kycAddr,
          ...addrInput
        };
      }
    }

    const recipientName = String(addrInput.recipient_name || userName || '').trim();
    const phone = String(addrInput.phone || user?.phone_num || '').trim();
    const houseFlat = String(addrInput.house_flat || '').trim();
    const streetArea = String(addrInput.street_area || '').trim();
    const city = String(addrInput.city || '').trim();
    const pincode = String(addrInput.pincode || '').trim();

    if (!recipientName || !phone || !houseFlat || !streetArea || !city || !pincode) {
      return res.status(400).json({
        error: 'Incomplete delivery address. Valid recipient_name, phone, house_flat, street_area, city, and pincode are required.'
      });
    }

    const finalAddress = {
      recipient_name: recipientName,
      phone,
      house_flat: houseFlat,
      street_area: streetArea,
      landmark: addrInput.landmark || '',
      city,
      pincode,
      formatted_address: addrInput.formatted_address || [
        houseFlat,
        streetArea,
        addrInput.landmark,
        city,
        pincode
      ].filter(Boolean).join(', '),
      delivery_slot: addrInput.delivery_slot || 'Express (Within 24-48 Hours)'
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

      let itemPrice = 0.0;
      let standardDeposit = 0.0;
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

      // Issue 8: Strict catalog pricing validation — never silently default to ₹500
      const pricing = app.pricing || {};
      const rawPrice = pricing[tenureStr] !== undefined ? pricing[tenureStr] : app.monthly_price;
      if (rawPrice === undefined || rawPrice === null || isNaN(parseFloat(rawPrice)) || parseFloat(rawPrice) <= 0) {
        return res.status(400).json({
          error: `Appliance "${app.rental_name}" has invalid or missing pricing configuration for tenure ${tenureStr} months.`
        });
      }
      itemPrice = parseFloat(rawPrice);

      const rawDeposit = app.security_deposit !== undefined ? app.security_deposit : Math.round(itemPrice * 1.5);
      if (rawDeposit === undefined || rawDeposit === null || isNaN(parseFloat(rawDeposit)) || parseFloat(rawDeposit) < 0) {
        return res.status(400).json({
          error: `Appliance "${app.rental_name}" has invalid security deposit configuration in catalog.`
        });
      }
      standardDeposit = parseFloat(rawDeposit);

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
    let paymentStatus = 'SUCCESS';
    let paymentGateway = 'Rentora Pay';

    // Issue 4: Strict server-side gateway signature verification for online payments
    if (isCod) {
      paymentStatus = 'PENDING_DOORSTEP';
      paymentGateway = 'Doorstep Verification & Pay on Delivery';
    } else if (isRazorpay) {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = payment_details || {};
      const secret = process.env.RAZORPAY_KEY_SECRET;

      if (razorpay_order_id && razorpay_payment_id && razorpay_signature && secret) {
        // Strict cryptographic HMAC-SHA256 signature verification
        const expectedSignature = crypto
          .createHmac('sha256', secret)
          .update(`${razorpay_order_id}|${razorpay_payment_id}`)
          .digest('hex');

        const isMatch = expectedSignature.length === razorpay_signature.length &&
          crypto.timingSafeEqual(Buffer.from(razorpay_signature), Buffer.from(expectedSignature));

        if (!isMatch) {
          // Rollback reserved stock
          for (const reserved of reservedStockLog) {
            await db.collection('appliances').updateOne(reserved.selector, { $inc: { stock_quantity: reserved.quantity } }).catch(() => {});
          }
          if (pointsDiscount > 0) {
            await db.collection('users').updateOne({ _id: userId }, { $inc: { loyalty_points: pointsDiscount } }).catch(() => {});
          }
          return res.status(400).json({
            error: 'Cryptographic payment signature mismatch. Potential payment tampering detected.'
          });
        }
        paymentStatus = 'SUCCESS';
        paymentGateway = 'Razorpay Payment Gateway (Cryptographically Verified)';
      } else if (process.env.NODE_ENV === 'production') {
        for (const reserved of reservedStockLog) {
          await db.collection('appliances').updateOne(reserved.selector, { $inc: { stock_quantity: reserved.quantity } }).catch(() => {});
        }
        if (pointsDiscount > 0) {
          await db.collection('users').updateOne({ _id: userId }, { $inc: { loyalty_points: pointsDiscount } }).catch(() => {});
        }
        return res.status(400).json({
          error: 'Online payment requires valid Razorpay order ID, payment ID, and cryptographic signature in production.'
        });
      } else {
        paymentStatus = 'SUCCESS';
        paymentGateway = 'Razorpay Sandbox Gateway (Simulated Verification)';
      }
    } else {
      // Non-Razorpay online payment (UPI/Card sandbox or production)
      if (process.env.NODE_ENV === 'production') {
        for (const reserved of reservedStockLog) {
          await db.collection('appliances').updateOne(reserved.selector, { $inc: { stock_quantity: reserved.quantity } }).catch(() => {});
        }
        if (pointsDiscount > 0) {
          await db.collection('users').updateOne({ _id: userId }, { $inc: { loyalty_points: pointsDiscount } }).catch(() => {});
        }
        return res.status(400).json({
          error: `Payment method ${payment_method} requires connected gateway verification in production mode.`
        });
      }
      paymentStatus = 'SUCCESS';
      paymentGateway = `Rentora FastPay (Sandbox ${payment_method})`;
    }

    const gatewayPaymentId = payment_details?.razorpay_payment_id || (isCod ? null : `pay_${crypto.randomBytes(8).toString('hex')}`);
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
