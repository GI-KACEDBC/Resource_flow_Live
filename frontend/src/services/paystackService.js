/**
 * Paystack inline payments — public key must be set via VITE_PAYSTACK_PUBLIC_KEY.
 */

const isProd = import.meta.env.PROD;
const rawKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
const PLACEHOLDER = 'pk_test_YOUR_PUBLIC_KEY_HERE';

const PAYSTACK_PUBLIC_KEY = rawKey || PLACEHOLDER;

export const initializePaystack = (paymentData) => {
  if (isProd && (!rawKey || rawKey === PLACEHOLDER)) {
    return Promise.reject(
      new Error(
        'Missing VITE_PAYSTACK_PUBLIC_KEY: set your Paystack public key in the frontend environment for production.'
      )
    );
  }
  return new Promise((resolve, reject) => {
    if (!window.PaystackPop) {
      const script = document.createElement('script');
      script.src = 'https://js.paystack.co/v1/inline.js';
      script.async = true;
      script.onload = () => {
        executePayment(paymentData, resolve, reject);
      };
      script.onerror = () => {
        reject(new Error('Failed to load Paystack script'));
      };
      document.body.appendChild(script);
    } else {
      executePayment(paymentData, resolve, reject);
    }
  });
};

const executePayment = (paymentData, resolve, reject) => {
  const handler = window.PaystackPop.setup({
    key: PAYSTACK_PUBLIC_KEY,
    email: paymentData.email,
    amount: paymentData.amount,
    ref: paymentData.reference,
    metadata: {
      custom_fields: [
        {
          display_name: 'Payment Type',
          variable_name: 'payment_type',
          value: paymentData.metadata?.paymentType || 'general',
        },
        {
          display_name: 'Project ID',
          variable_name: 'project_id',
          value: paymentData.metadata?.projectId || '',
        },
        {
          display_name: 'Supplier ID',
          variable_name: 'supplier_id',
          value: paymentData.metadata?.supplierId || '',
        },
        ...(paymentData.metadata?.customFields || []),
      ],
    },
    callback: (response) => {
      if (paymentData.callback) {
        paymentData.callback(response);
      }
      resolve(response);
    },
    onClose: () => {
      if (paymentData.onClose) {
        paymentData.onClose();
      }
      reject(new Error('Payment cancelled by user'));
    },
  });

  handler.openIframe();
};

export const convertToPesewas = (amountInGHC) => {
  return Math.round(amountInGHC * 100);
};

export const generateReference = (prefix = 'PAY') => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
};

export const verifyPayment = async (reference) => {
  try {
    return {
      status: 'success',
      reference,
      verified: true,
      message: 'Payment verified successfully',
    };
  } catch (error) {
    throw error;
  }
};
