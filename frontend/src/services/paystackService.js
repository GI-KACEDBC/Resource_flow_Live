// ## Paystack Payment Service
// ## Handles Paystack payment integration for suppliers

// ## Paystack Public Key (should be in environment variables in production)
const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || 'pk_test_YOUR_PUBLIC_KEY_HERE';

/**
 * Initialize Paystack payment
 * @param {Object} paymentData - Payment configuration
 * @param {number} paymentData.amount - Amount in pesewas (multiply GH₵ by 100)
 * @param {string} paymentData.email - Customer email
 * @param {string} paymentData.reference - Unique transaction reference
 * @param {string} paymentData.metadata - Additional metadata
 * @param {Function} paymentData.callback - Success callback
 * @param {Function} paymentData.onClose - Close callback
 */
export const initializePaystack = (paymentData) => {
  return new Promise((resolve, reject) => {
    // ## Load Paystack inline script if not already loaded
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

/**
 * Execute Paystack payment
 */
const executePayment = (paymentData, resolve, reject) => {
  const handler = window.PaystackPop.setup({
    key: PAYSTACK_PUBLIC_KEY,
    email: paymentData.email,
    amount: paymentData.amount, // Amount in pesewas
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
      // ## Payment successful
      if (paymentData.callback) {
        paymentData.callback(response);
      }
      resolve(response);
    },
    onClose: () => {
      // ## User closed payment modal
      if (paymentData.onClose) {
        paymentData.onClose();
      }
      reject(new Error('Payment cancelled by user'));
    },
  });

  handler.openIframe();
};

/**
 * Convert Ghana Cedis to pesewas (Paystack currency unit)
 * @param {number} amountInGHC - Amount in Ghana Cedis
 * @returns {number} Amount in pesewas
 */
export const convertToPesewas = (amountInGHC) => {
  return Math.round(amountInGHC * 100);
};

/**
 * Generate unique transaction reference
 * @param {string} prefix - Reference prefix (e.g., 'PROJ', 'SUPP')
 * @returns {string} Unique reference
 */
export const generateReference = (prefix = 'PAY') => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
};

/**
 * Verify payment with backend (to be implemented)
 * @param {string} reference - Transaction reference
 * @returns {Promise<Object>} Verification result
 */
export const verifyPayment = async (reference) => {
  try {
    // ## In production, this would call your backend API
    // ## const response = await axios.post('/api/payments/verify', { reference });
    // ## return response.data;
    
    // ## Mock verification for now
    return {
      status: 'success',
      reference,
      verified: true,
      message: 'Payment verified successfully',
    };
  } catch (error) {
    console.error('Payment verification error:', error);
    throw error;
  }
};
