// ## Payment Modal Component
// ## Reusable payment modal for Paystack integration
import React, { useState } from 'react';
import { X, CreditCard, Loader, CheckCircle, AlertCircle, DollarSign } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { initializePaystack, convertToPesewas, generateReference } from '../../services/paystackService';
import { useAuth } from '../../hooks/useAuth';

const PaymentModal = ({ 
  isOpen, 
  onClose, 
  paymentType = 'general', // 'general' or 'project'
  projectData = null, // Project details if funding a specific project
  onSuccess 
}) => {
  const { user } = useAuth();
  const [amount, setAmount] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // ## Reset form when modal opens/closes
  React.useEffect(() => {
    if (isOpen) {
      setAmount('');
      setEmail(user?.email || '');
      setError('');
      setSuccess(false);
      setIsProcessing(false);
    }
  }, [isOpen, user]);

  // ## Handle payment submission
  const handlePayment = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    // ## Validation
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setIsProcessing(true);

    try {
      const amountInGHC = parseFloat(amount);
      const amountInPesewas = convertToPesewas(amountInGHC);
      const reference = generateReference(paymentType === 'project' ? 'PROJ' : 'SUPP');

      // ## Initialize Paystack payment
      await initializePaystack({
        amount: amountInPesewas,
        email,
        reference,
        metadata: {
          paymentType,
          projectId: projectData?.id || '',
          supplierId: user?.id || '',
          projectName: projectData?.name || '',
          amount: amountInGHC,
        },
        callback: async (response) => {
          // ## Payment successful - verify with backend
          setIsProcessing(true);
          
          try {
            // Fix #15: Call backend to verify payment and create financial record
            const { apiClient } = await import('../../services/api');
            await apiClient.post('/payments/verify', {
              reference: response.reference,
              amount: amountInGHC,
              type: paymentType === 'project' ? 'Project Funding' : paymentType === 'general' ? 'General Support' : 'Donation',
              description: paymentType === 'project' 
                ? `Funding for project: ${projectData?.name || 'Unknown'}`
                : 'General support for ResourceFlow',
            });
            
            setSuccess(true);
            setIsProcessing(false);
            
            // ## Call success callback
            if (onSuccess) {
              onSuccess({
                reference: response.reference,
                amount: amountInGHC,
                projectId: projectData?.id,
                projectName: projectData?.name,
              });
            }

            // ## Auto-close after 2 seconds
            setTimeout(() => {
              onClose();
            }, 2000);
          } catch (error) {
            console.error('Payment verification error:', error);
            setError(error.response?.data?.message || 'Payment succeeded but verification failed. Please contact support.');
            setIsProcessing(false);
          }
        },
        onClose: () => {
          // ## User closed payment modal
          setIsProcessing(false);
        },
      });
    } catch (error) {
      console.error('Payment error:', error);
      setError(error.message || 'Payment failed. Please try again.');
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <CreditCard className="text-emerald-600" size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">
                {paymentType === 'project' ? 'Fund Project' : 'Support ResourceFlow'}
              </h3>
              <p className="text-sm text-slate-500">
                {paymentType === 'project' 
                  ? `Contribute to ${projectData?.name || 'this project'}`
                  : 'Make a financial contribution'
                }
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition"
            disabled={isProcessing}
          >
            <X size={24} />
          </button>
        </div>

        {/* Project Info (if funding a specific project) */}
        {paymentType === 'project' && projectData && (
          <div className="bg-slate-50 rounded-lg p-4 mb-6 border border-slate-200">
            <h4 className="font-semibold text-slate-800 mb-2">{projectData.name}</h4>
            <p className="text-sm text-slate-600 mb-2">{projectData.description}</p>
            {projectData.targetAmount && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-500">Target:</span>
                <span className="font-semibold text-emerald-600">
                  GH₵ {projectData.targetAmount.toLocaleString()}
                </span>
                {projectData.currentAmount && (
                  <>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-500">Raised:</span>
                    <span className="font-semibold text-blue-600">
                      GH₵ {projectData.currentAmount.toLocaleString()}
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-lg mb-6 flex items-center gap-3">
            <CheckCircle className="text-emerald-600" size={20} />
            <div>
              <p className="font-semibold text-emerald-800">Payment Successful!</p>
              <p className="text-sm text-emerald-700">Thank you for your contribution.</p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 p-4 rounded-lg mb-6 flex items-center gap-3">
            <AlertCircle className="text-red-600" size={20} />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Payment Form */}
        {!success && (
          <form onSubmit={handlePayment} className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-slate-700 mb-2 block">
                Amount (GH₵) *
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                <Input
                  type="number"
                  min="1"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="pl-10"
                  required
                  disabled={isProcessing}
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Minimum amount: GH₵ 1.00
              </p>
            </div>

            <Input
              label="Email Address *"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              disabled={isProcessing}
            />

            {/* Payment Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-800">
                <strong>Secure Payment:</strong> You will be redirected to Paystack's secure payment page to complete your transaction.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isProcessing}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isProcessing || !amount || !email}
                className="flex-1"
                icon={isProcessing ? Loader : CreditCard}
              >
                {isProcessing ? 'Processing...' : 'Proceed to Payment'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default PaymentModal;
