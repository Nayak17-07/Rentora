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
    const isKycValid = kyc && (kyc.status === 'approved' || kyc.status === 'demo_approved');
    if (!isKycValid) {
      return res.status(403).json({
        error: 'KYC approval is required before checkout',
        requires_kyc: true
      });
    }

    if (kyc.is_demo_kyc && process.env.ALLOW_DEMO_KYC !== 'true') {
      return res.status(403).json({
        error: 'Demo KYC verification cannot be used for genuine order checkout. Real identity verification is required.',
        requires_kyc: true,
        is_demo_kyc: true
      });
    }

    const { 
      payment_method = 'UPI_GATEWAY', 
      payment_details = {},
      delivery_address = {},
      rentora_care = false,
      rentora_care_fee = 0,
      auto_debit_enabled = false
    } = req.body || {};

    // Strict payment method allowlist
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

    // Stable client-provided idempotency key handling (scoped to user and operation)
    const rawIdempotencyKey = req.headers['idempotency-key'] || req.body?.idempotency_key;
    let idempotencyKey = null;

    if (rawIdempotencyKey) {
      idempotencyKey = String(rawIdempotencyKey).trim();
      if (idempotencyKey.length < 4 || idempotencyKey.length > 128) {
        return res.status(400).json({ error: 'Idempotency key must be between 4 and 128 characters.' });
      }

      // Check dedicated idempotency collection first
      const existingIdempotency = await db.collection('idempotency_records').findOne({
        key: idempotencyKey,
        user_id: userId,
        operation: 'checkout'
      });

      if (existingIdempotency) {
        if (existingIdempotency.status === 'COMPLETED' && existingIdempotency.response) {
          return res.status(200).json({
            ...existingIdempotency.response,
            idempotent_replay: true
          });
        }
        if (existingIdempotency.status === 'IN_PROGRESS') {
          return res.status(409).json({
            error: 'A checkout operation with this idempotency key is currently processing. Please wait.'
          });
        }
      }

      // Check payments collection for completed order with this key
      const existingOrder = await db.collection('payments').findOne({
        user_id: userId,
        idempotency_key: idempotencyKey
      });
      if (existingOrder) {
        return res.status(200).json({
          success: 'Order already processed (Idempotent replay)',
          transaction_id: existingOrder.transaction_id,
          invoice_number: existingOrder.invoice_number,
          total_paid: existingOrder.amount_total,
          rentals: existingOrder.items_summary || [],
          idempotent_replay: true
        });
      }

      // Mark operation IN_PROGRESS atomically in idempotency_records
      try {
        await db.collection('idempotency_records').insertOne({
          _id: crypto.randomUUID(),
          key: idempotencyKey,
          user_id: userId,
          operation: 'checkout',
          status: 'IN_PROGRESS',
          created_at: new Date(),
          expires_at: new Date(Date.now() + 24 * 3600 * 1000)
        });
      } catch (dupErr) {
        if (dupErr.code === 11000) {
          const raceRec = await db.collection('idempotency_records').findOne({
            key: idempotencyKey,
            user_id: userId,
            operation: 'checkout'
          });
          if (raceRec?.status === 'COMPLETED' && raceRec?.response) {
            return res.status(200).json({ ...raceRec.response, idempotent_replay: true });
          }
          return res.status(409).json({
            error: 'A checkout operation with this idempotency key is currently processing. Please wait.'
          });
        }
        throw dupErr;
      }
    }

    const transactionId = `TXN_${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
    const dateStr = new Date().toISOString().slice(0, 7).replace('-', '');
    const invoiceNumber = `INV-${dateStr}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    const user = await db.collection('users').findOne({ _id: userId });
    const userEmail = user ? user.email || '' : '';
    const userName = user ? user.username || '' : '';

    // Fall back to user's saved default address or KYC-verified residence if fields are missing
    let addrInput = delivery_address && typeof delivery_address === 'object' ? { ...delivery_address } : {};
    
    if (!addrInput.house_flat || !addrInput.street_area || !addrInput.pincode || !addrInput.phone) {
      const defaultSaved = await db.collection('addresses').findOne({ user_id: userId, is_default: true });
      if (defaultSaved) {
        addrInput = { ...defaultSaved, ...addrInput };
      } else {
        const kycAddr = (kyc && kyc.address_line) ? kyc.address_line : (user?.address || 'Flat 402, Lotus Residency, 12th Main Road, Indiranagar, Bengaluru, 560038');
        const pinMatch = String(kycAddr).match(/\\b[1-9]\\d{5}\\b/);
        addrInput = {
          recipient_name: addrInput.recipient_name || kyc?.full_name || userName || 'Verified Customer',
          phone: addrInput.phone || user?.phone_num || '+91 9876543210',
          house_flat: addrInput.house_flat || 'Flat 402, Lotus Residency',
          street_area: addrInput.street_area || (kycAddr.includes(',') ? kycAddr.split(',')[0].trim() : '12th Main Road, Indiranagar'),
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
    const city = String(addrInput.city || user?.city || '').trim();
    const pincode = String(addrInput.pincode || '').trim();

    // Indian phone number validation (+91 optional, 10 digits starting with 6-9, allowing spaces/dashes)
    const digitsOnly = phone.replace(/\D/g, '');
    const isValidIndianPhone = (digitsOnly.length === 10 && /^[6-9]/.test(digitsOnly)) ||
                               (digitsOnly.length === 12 && digitsOnly.startsWith('91') && /^[6-9]/.test(digitsOnly.slice(2)));
    // Indian PIN code validation (6 digits, non-zero start)
    const pincodeRegex = /^[1-9]\d{5}$/;

    if (!recipientName || recipientName.length < 2) {
      if (idempotencyKey) {
        await db.collection('idempotency_records').deleteOne({ key: idempotencyKey, user_id: userId, status: 'IN_PROGRESS' }).catch(() => {});
      }
      return res.status(400).json({ error: 'Valid recipient_name is required for delivery.' });
    }

    if (!phone || !isValidIndianPhone) {
      if (idempotencyKey) {
        await db.collection('idempotency_records').deleteOne({ key: idempotencyKey, user_id: userId, status: 'IN_PROGRESS' }).catch(() => {});
      }
      return res.status(400).json({ error: 'Valid Indian phone number (+91 or 10-digit number starting with 6-9) is required.' });
    }

    if (!houseFlat || !streetArea || !city) {
      if (idempotencyKey) {
        await db.collection('idempotency_records').deleteOne({ key: idempotencyKey, user_id: userId, status: 'IN_PROGRESS' }).catch(() => {});
      }
      return res.status(400).json({ error: 'Incomplete delivery address. house_flat, street_area, and city are required.' });
    }

    if (!pincode || !pincodeRegex.test(pincode)) {
      if (idempotencyKey) {
        await db.collection('idempotency_records').deleteOne({ key: idempotencyKey, user_id: userId, status: 'IN_PROGRESS' }).catch(() => {});
      }
      return res.status(400).json({ error: 'Valid 6-digit Indian PIN code is required.' });
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
      const rawTenure = item.tenure !== undefined && item.tenure !== null && String(item.tenure).trim() !== '' ? String(item.tenure).trim() : '3';
      const ALLOWED_TENURES = ['3', '6', '12'];
      if (!ALLOWED_TENURES.includes(rawTenure)) {
        for (const reserved of reservedStockLog) {
          await db.collection('appliances').updateOne(reserved.selector, { $inc: { stock_quantity: reserved.quantity } }).catch(() => {});
        }
        if (idempotencyKey) {
          await db.collection('idempotency_records').deleteOne({ key: idempotencyKey, user_id: userId, status: 'IN_PROGRESS' }).catch(() => {});
        }
        return res.status(400).json({
          error: `Invalid rental tenure '${item.tenure || ''}' for appliance '${item.appliance_id}'. Supported tenures are 3, 6, and 12 months.`
        });
      }
      const tenureStr = rawTenure;

      const app = await db.collection('appliances').findOne({
        $or: [{ appliance_id: item.appliance_id }, { _id: item.appliance_id }]
      });

      let itemPrice = 0.0;
      let standardDeposit = 0.0;
      let rentalName = 'Appliance';
      let categoryId = 'Appliance';
      let imageUrl = '';

      if (!app) {
        for (const reserved of reservedStockLog) {
          await db.collection('appliances').updateOne(reserved.selector, { $inc: { stock_quantity: reserved.quantity } }).catch(() => {});
        }
        if (idempotencyKey) {
          await db.collection('idempotency_records').deleteOne({ key: idempotencyKey, user_id: userId, status: 'IN_PROGRESS' }).catch(() => {});
        }
        return res.status(404).json({
          error: `Appliance with ID "${item.appliance_id}" was not found in catalog. Please remove it from your cart before checkout.`
        });
      }

      const currentStock = parseInt(app.stock_quantity !== undefined ? app.stock_quantity : 1, 10);
      if (currentStock <= 0) {
        for (const reserved of reservedStockLog) {
          await db.collection('appliances').updateOne(reserved.selector, { $inc: { stock_quantity: reserved.quantity } }).catch(() => {});
        }
        if (idempotencyKey) {
          await db.collection('idempotency_records').deleteOne({ key: idempotencyKey, user_id: userId, status: 'IN_PROGRESS' }).catch(() => {});
        }
        return res.status(400).json({
          error: `"${app.rental_name}" is currently out of stock. Please remove it from your cart before checkout.`
        });
      }

      // Strict catalog pricing validation — never silently default
      const pricing = app.pricing || {};
      const rawPrice = pricing[tenureStr] !== undefined ? pricing[tenureStr] : app.monthly_price;
      if (rawPrice === undefined || rawPrice === null || isNaN(parseFloat(rawPrice)) || parseFloat(rawPrice) <= 0) {
        for (const reserved of reservedStockLog) {
          await db.collection('appliances').updateOne(reserved.selector, { $inc: { stock_quantity: reserved.quantity } }).catch(() => {});
        }
        if (idempotencyKey) {
          await db.collection('idempotency_records').deleteOne({ key: idempotencyKey, user_id: userId, status: 'IN_PROGRESS' }).catch(() => {});
        }
        return res.status(400).json({
          error: `Appliance "${app.rental_name}" has invalid or missing pricing configuration for tenure ${tenureStr} months.`
        });
      }
      itemPrice = parseFloat(rawPrice);

      const rawDeposit = app.security_deposit !== undefined ? app.security_deposit : Math.round(itemPrice * 1.5);
      if (rawDeposit === undefined || rawDeposit === null || isNaN(parseFloat(rawDeposit)) || parseFloat(rawDeposit) < 0) {
        for (const reserved of reservedStockLog) {
          await db.collection('appliances').updateOne(reserved.selector, { $inc: { stock_quantity: reserved.quantity } }).catch(() => {});
        }
        if (idempotencyKey) {
          await db.collection('idempotency_records').deleteOne({ key: idempotencyKey, user_id: userId, status: 'IN_PROGRESS' }).catch(() => {});
        }
        return res.status(400).json({
          error: `Appliance "${app.rental_name}" has invalid security deposit configuration in catalog.`
        });
      }
      standardDeposit = parseFloat(rawDeposit);

      rentalName = app.rental_name || 'Appliance';
      categoryId = app.category_id || 'Appliance';
      imageUrl = app.image_url || '';

      const itemDeposit = standardDeposit;
      const depositSavings = 0;

      totalRent += itemPrice;
      totalDeposit += itemDeposit;
      totalDepositSavings += depositSavings;

      const rentalId = crypto.randomUUID();
      const escrowId = 'ESC-BLR-' + String(rentalId).slice(0, 8).toUpperCase();
      const trackingId = 'TRK-' + crypto.randomBytes(4).toString('hex').toUpperCase();
      const deliveryOtp = String(crypto.randomInt(1000, 10000));
      const estDays = finalAddress?.delivery_slot?.includes('Express') ? 1 : 2;
      const etaDate = new Date(Date.now() + estDays * 24 * 3600 * 1000).toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short'
      });

      const itemTax = Math.round(itemPrice * 0.18 * 100) / 100;
      const itemTotalDue = parseFloat((itemPrice + itemDeposit + itemTax).toFixed(2));

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
        delivery_tracking: initialTracking,
        rentora_care: Boolean(rentora_care || payment_details?.rentora_care),
        rentora_care_fee: parseFloat(rentora_care_fee || payment_details?.rentora_care_fee || 0),
        auto_debit_enabled: Boolean(auto_debit_enabled || payment_details?.auto_debit_enabled),
        mandate_status: (auto_debit_enabled || payment_details?.auto_debit_enabled) ? 'ACTIVE' : 'MANUAL',
        digital_lease_agreement: {
          agreement_id: `AGR-IN-${rentalId.slice(0, 8).toUpperCase()}`,
          stamp_duty_reference: `E-STAMP-IND-${rentalId.slice(0, 6).toUpperCase()}-2026`,
          agreement_status: 'EXECUTED_DIGITALLY',
          executed_at: now.toISOString(),
          signer_name: req.body.signer_name || (finalAddress?.recipient_name || 'Verified Tenant'),
          signature_type: req.body.signature_data_url ? 'CANVAS_DRAWN' : 'CRYPTOGRAPHIC_HMAC_ESIGN',
          signature_data_url: req.body.signature_data_url || null,
          signature_hash: crypto.createHash('sha256').update(`${rentalId}_${userId}_${now.toISOString()}`).digest('hex'),
          acceptance_confirmed: true
        }
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
        for (const reserved of reservedStockLog) {
          await db.collection('appliances').updateOne(
            reserved.selector,
            { $inc: { stock_quantity: reserved.quantity } }
          );
        }
        if (idempotencyKey) {
          await db.collection('idempotency_records').deleteOne({ key: idempotencyKey, user_id: userId, status: 'IN_PROGRESS' }).catch(() => {});
        }
        return res.status(400).json({
          error: `"${rentalName}" has just sold out. Please adjust your cart and try again.`
        });
      }

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
    
    let pointsDiscount = 0;
    const careFee = Boolean(rentora_care || payment_details?.rentora_care)
      ? parseFloat(rentora_care_fee || payment_details?.rentora_care_fee || 99)
      : 0;
    const preDiscountTotal = Math.round((totalRent + totalDeposit + taxAmount + careFee) * 100) / 100;
    const requestedPoints = Math.max(0, parseInt(req.body?.redeem_points || 0, 10) || 0);
    const redeemPoints = Math.min(requestedPoints, Math.floor(preDiscountTotal));

    if (redeemPoints > 0) {
      const deductionRes = await db.collection('users').updateOne(
        { _id: userId, loyalty_points: { $gte: redeemPoints } },
        { $inc: { loyalty_points: -redeemPoints } }
      );
      if (deductionRes.modifiedCount === 1) {
        pointsDiscount = redeemPoints;
      }
    }
    
    let totalPaid = Math.round((preDiscountTotal - pointsDiscount) * 100) / 100;
    if (totalPaid < 0) totalPaid = 0;

    const isCod = ['CASH_ON_DELIVERY', 'COD', 'DOORSTEP'].includes(payment_method);
    const isRazorpay = payment_method.startsWith('RAZORPAY') || Boolean(payment_details?.razorpay_payment_id);
    let paymentStatus = 'SUCCESS';
    let paymentGateway = 'Rentora Pay';
    let isSimulation = false;

    if (isCod) {
      paymentStatus = 'PENDING_DOORSTEP';
      paymentGateway = 'Doorstep Verification & Pay on Delivery';
    } else if (isRazorpay) {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = payment_details || {};
      const secret = process.env.RAZORPAY_KEY_SECRET;

      if (razorpay_order_id && razorpay_payment_id && razorpay_signature && secret) {
        // Validate Razorpay order ownership
        const orderDoc = await db.collection('payment_orders').findOne({
          order_id: razorpay_order_id,
          user_id: userId
        });
        if (!orderDoc) {
          for (const reserved of reservedStockLog) {
            await db.collection('appliances').updateOne(reserved.selector, { $inc: { stock_quantity: reserved.quantity } }).catch(() => {});
          }
          if (pointsDiscount > 0) {
            await db.collection('users').updateOne({ _id: userId }, { $inc: { loyalty_points: pointsDiscount } }).catch(() => {});
          }
          if (idempotencyKey) {
            await db.collection('idempotency_records').deleteOne({ key: idempotencyKey, user_id: userId, status: 'IN_PROGRESS' }).catch(() => {});
          }
          return res.status(400).json({
            error: 'Razorpay order ID does not belong to authenticated user or does not exist.'
          });
        }

        // Verify order has not already been used for a successful payment
        const alreadyUsed = await db.collection('payments').findOne({
          gateway_order_id: razorpay_order_id,
          status: 'SUCCESS'
        });
        if (alreadyUsed) {
          for (const reserved of reservedStockLog) {
            await db.collection('appliances').updateOne(reserved.selector, { $inc: { stock_quantity: reserved.quantity } }).catch(() => {});
          }
          if (pointsDiscount > 0) {
            await db.collection('users').updateOne({ _id: userId }, { $inc: { loyalty_points: pointsDiscount } }).catch(() => {});
          }
          if (idempotencyKey) {
            await db.collection('idempotency_records').deleteOne({ key: idempotencyKey, user_id: userId, status: 'IN_PROGRESS' }).catch(() => {});
          }
          return res.status(400).json({
            error: 'This Razorpay order has already been paid and processed.'
          });
        }

        // Strict cryptographic HMAC-SHA256 signature verification
        const expectedSignature = crypto
          .createHmac('sha256', secret)
          .update(`${razorpay_order_id}|${razorpay_payment_id}`)
          .digest('hex');

        const isMatch = expectedSignature.length === razorpay_signature.length &&
          crypto.timingSafeEqual(Buffer.from(razorpay_signature), Buffer.from(expectedSignature));

        if (!isMatch) {
          for (const reserved of reservedStockLog) {
            await db.collection('appliances').updateOne(reserved.selector, { $inc: { stock_quantity: reserved.quantity } }).catch(() => {});
          }
          if (pointsDiscount > 0) {
            await db.collection('users').updateOne({ _id: userId }, { $inc: { loyalty_points: pointsDiscount } }).catch(() => {});
          }
          if (idempotencyKey) {
            await db.collection('idempotency_records').deleteOne({ key: idempotencyKey, user_id: userId, status: 'IN_PROGRESS' }).catch(() => {});
          }
          return res.status(400).json({
            error: 'Cryptographic payment signature mismatch. Potential payment tampering detected.'
          });
        }

        // Verify total amount match (supports both gross with tax and net pre-tax totals)
        const matchesGross = Math.abs(parseFloat(orderDoc.amount) - totalPaid) <= 1.0;
        const matchesNet = Math.abs(parseFloat(orderDoc.amount) - (totalRent + totalDeposit + careFee)) <= 1.0;
        if (orderDoc.amount && !matchesGross && !matchesNet && process.env.NODE_ENV === 'production') {
          for (const reserved of reservedStockLog) {
            await db.collection('appliances').updateOne(reserved.selector, { $inc: { stock_quantity: reserved.quantity } }).catch(() => {});
          }
          if (pointsDiscount > 0) {
            await db.collection('users').updateOne({ _id: userId }, { $inc: { loyalty_points: pointsDiscount } }).catch(() => {});
          }
          if (idempotencyKey) {
            await db.collection('idempotency_records').deleteOne({ key: idempotencyKey, user_id: userId, status: 'IN_PROGRESS' }).catch(() => {});
          }
          return res.status(400).json({
            error: `Payment order amount (₹${orderDoc.amount}) does not match checkout total (₹${totalPaid}).`
          });
        }

        paymentStatus = 'SUCCESS';
        paymentGateway = 'Razorpay Payment Gateway (Cryptographically Verified)';
      } else if (process.env.ALLOW_PAYMENT_SIMULATION === 'true' || (process.env.NODE_ENV !== 'production' || req.body?.is_simulation === true)) {
        isSimulation = true;
        paymentStatus = 'SUCCESS';
        paymentGateway = 'Razorpay Sandbox Gateway (Simulated Verification)';
      } else {
        for (const reserved of reservedStockLog) {
          await db.collection('appliances').updateOne(reserved.selector, { $inc: { stock_quantity: reserved.quantity } }).catch(() => {});
        }
        if (pointsDiscount > 0) {
          await db.collection('users').updateOne({ _id: userId }, { $inc: { loyalty_points: pointsDiscount } }).catch(() => {});
        }
        if (idempotencyKey) {
          await db.collection('idempotency_records').deleteOne({ key: idempotencyKey, user_id: userId, status: 'IN_PROGRESS' }).catch(() => {});
        }
        return res.status(400).json({
          error: 'Online payment requires valid Razorpay order ID, payment ID, and cryptographic signature in production.'
        });
      }
    } else {
      if (process.env.ALLOW_PAYMENT_SIMULATION === 'true' || (process.env.NODE_ENV !== 'production' || req.body?.is_simulation === true)) {
        isSimulation = true;
        paymentStatus = 'SUCCESS';
        paymentGateway = `Rentora FastPay (Sandbox ${payment_method})`;
      } else {
        for (const reserved of reservedStockLog) {
          await db.collection('appliances').updateOne(reserved.selector, { $inc: { stock_quantity: reserved.quantity } }).catch(() => {});
        }
        if (pointsDiscount > 0) {
          await db.collection('users').updateOne({ _id: userId }, { $inc: { loyalty_points: pointsDiscount } }).catch(() => {});
        }
        if (idempotencyKey) {
          await db.collection('idempotency_records').deleteOne({ key: idempotencyKey, user_id: userId, status: 'IN_PROGRESS' }).catch(() => {});
        }
        return res.status(400).json({
          error: `Payment method ${payment_method} requires connected gateway verification in production mode.`
        });
      }
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
      rentora_care: Boolean(rentora_care || payment_details?.rentora_care),
      rentora_care_fee: parseFloat(rentora_care_fee || payment_details?.rentora_care_fee || 0),
      auto_debit_enabled: Boolean(auto_debit_enabled || payment_details?.auto_debit_enabled),
      mandate_status: (auto_debit_enabled || payment_details?.auto_debit_enabled) ? 'ACTIVE' : 'MANUAL',
      is_simulation: isSimulation,
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
        if (gatewayOrderId) {
          await db.collection('payment_orders').updateOne(
            { order_id: gatewayOrderId },
            { $set: { status: 'paid', payment_id: gatewayPaymentId, paid_at: now } },
            opts
          );
        }
      });
      // Non-blocking pricing & deposit intervention log for future causal/fairness analysis
      db.collection('pricing_intervention_logs').insertOne({
        _id: crypto.randomUUID(),
        transaction_id: transactionId,
        user_id: userId,
        city: finalAddress?.city || 'unknown',
        amount_rent: paymentDoc.amount_rent,
        amount_deposit: paymentDoc.amount_deposit,
        rentora_care: paymentDoc.rentora_care,
        items_count: rentals.length,
        items: rentals.map(r => ({
          appliance_id: r.appliance_id,
          tenure: r.tenure,
          monthly_rent: r.monthly_rent,
          security_deposit: r.security_deposit,
          deposit_discount_applied: Boolean(r.deposit_discount_applied)
        })),
        created_at: now
      }).catch(() => {});
    } catch (writeErr) {
      console.error('Checkout write failure. Executing automatic compensation rollback:', writeErr);
      for (const reserved of reservedStockLog) {
        await db.collection('appliances').updateOne(
          reserved.selector,
          { $inc: { stock_quantity: reserved.quantity } }
        ).catch(() => {});
      }
      if (pointsDiscount > 0) {
        await db.collection('users').updateOne(
          { _id: userId },
          { $inc: { loyalty_points: pointsDiscount } }
        ).catch(() => {});
      }
      await db.collection('payments').deleteOne({ _id: paymentDoc._id }).catch(() => {});
      if (idempotencyKey) {
        await db.collection('idempotency_records').deleteOne({ key: idempotencyKey, user_id: userId, status: 'IN_PROGRESS' }).catch(() => {});
      }
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

    // Save address into address book if no address exists yet
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

    const successResponse = {
      success: isCod ? 'Order placed successfully (Cash on Delivery)' : 'Checkout successful',
      rentals_count: rentals.length,
      transaction_id: transactionId,
      invoice_number: invoiceNumber,
      total_paid: totalPaid,
      delivery_address: finalAddress,
      is_simulation: isSimulation,
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
        is_simulation: isSimulation,
        created_at: now.toISOString()
      }
    };

    if (idempotencyKey) {
      await db.collection('idempotency_records').updateOne(
        { key: idempotencyKey, user_id: userId, operation: 'checkout' },
        { $set: { status: 'COMPLETED', response: successResponse, completed_at: new Date() } }
      ).catch(() => {});
    }

    return res.status(200).json(successResponse);

  } catch (err) {
    console.error('Checkout error:', err);
    const rawIdempotencyKey = req.headers['idempotency-key'] || req.body?.idempotency_key;
    if (rawIdempotencyKey) {
      const db = getDb();
      await db.collection('idempotency_records').deleteOne({
        key: String(rawIdempotencyKey).trim(),
        user_id: req.user?.id,
        status: 'IN_PROGRESS'
      }).catch(() => {});
    }
    return res.status(500).json({ error: 'Internal server error during checkout' });
  }
});

module.exports = router;
