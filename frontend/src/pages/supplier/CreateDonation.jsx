// ## Create Donation View
// ## Form for suppliers to submit donations
import React, { useState } from 'react';
import { ArrowLeft, Package, DollarSign, Save, AlertCircle } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { donationApi } from '../../services/api';

const CreateDonation = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const targetRequest = location.state?.targetRequest;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  // ## Form state
  const [formData, setFormData] = useState({
    type: 'Goods',
    item: '',
    quantity: '',
    unit: 'bags',
    description: '',
  });

  // ## Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // ## Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  // ## Validate form
  const validate = () => {
    const newErrors = {};
    if (!formData.item.trim()) newErrors.item = 'Item name is required';
    if (!formData.quantity || parseFloat(formData.quantity) <= 0) {
      newErrors.quantity = 'Valid quantity is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ## Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      // ## Create donation via API
      const donationData = {
        type: formData.type,
        item: formData.item,
        quantity: parseFloat(formData.quantity),
        unit: formData.unit,
        description: formData.description || null,
        ...(targetRequest?.id && { aid_request_id: targetRequest.id }),
      };

      console.log('Creating donation:', donationData);
      const response = await donationApi.create(donationData);
      console.log('Donation created successfully:', response);

      // ## Monetary donations: redirect to Paystack payment screen
      if (response?.authorization_url) {
        window.location.href = response.authorization_url;
        return;
      }

      // ## Set flag to trigger dashboard refresh
      localStorage.setItem('donation_created', Date.now().toString());

      // ## Navigate back to dashboard (Goods/Services)
      navigate('/dashboard');
    } catch (error) {
      console.error('Error creating donation:', error);
      let errorMessage = 'Failed to create donation. Please try again.';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.errors) {
        const validationErrors = Object.values(error.response.data.errors).flat();
        errorMessage = validationErrors.join(', ');
      } else if (error.message) {
        errorMessage = error.message;
      }
      setErrors({ submit: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 bg-white min-h-screen">
      {/* ## Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="outline"
          icon={ArrowLeft}
          onClick={() => navigate('/dashboard')}
        >
          Back
        </Button>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Create Donation</h2>
          <p className="text-slate-500 mt-1">
            {targetRequest
              ? `Donating to: ${targetRequest.title} — will appear in Resource Allocation for this request`
              : 'Submit a new donation to help those in need'}
          </p>
        </div>
      </div>

      {/* ## Form */}
      <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
        {/* ## Donation Type */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Package size={20} />
            Donation Type
          </h3>
          <div>
            <label className="text-sm font-semibold text-slate-600 mb-2 block">
              Type of Donation *
            </label>
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="Goods">Goods (Physical Items)</option>
              <option value="Monetary">Monetary (Cash/Funds)</option>
              <option value="Services">Services (Time/Skills)</option>
            </select>
          </div>
        </div>

        {/* ## Donation Details */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <DollarSign size={20} />
            Donation Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Item/Service Name *"
              name="item"
              value={formData.item}
              onChange={handleChange}
              error={errors.item}
              placeholder={
                formData.type === 'Monetary'
                  ? 'e.g., Emergency Relief Fund'
                  : formData.type === 'Services'
                  ? 'e.g., Medical Consultation, Transportation'
                  : 'e.g., Rice, Medicine, School Supplies'
              }
            />
            <div>
              <label className="text-sm font-semibold text-slate-600 mb-2 block">
                Unit *
              </label>
              <select
                name="unit"
                value={formData.unit}
                onChange={handleChange}
                className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {formData.type === 'Monetary' ? (
                  <>
                    <option value="GH₵">GH₵ (Ghana Cedis)</option>
                    <option value="USD">USD (US Dollars)</option>
                  </>
                ) : formData.type === 'Services' ? (
                  <>
                    <option value="hours">Hours</option>
                    <option value="days">Days</option>
                    <option value="sessions">Sessions</option>
                  </>
                ) : (
                  <>
                    <option value="bags">Bags</option>
                    <option value="boxes">Boxes</option>
                    <option value="units">Units</option>
                    <option value="kg">Kilograms</option>
                    <option value="liters">Liters</option>
                    <option value="pieces">Pieces</option>
                  </>
                )}
              </select>
            </div>
            <Input
              label="Quantity/Amount *"
              name="quantity"
              type="number"
              min="1"
              step={formData.type === 'Monetary' ? '0.01' : '1'}
              value={formData.quantity}
              onChange={handleChange}
              error={errors.quantity}
              placeholder={
                formData.type === 'Monetary'
                  ? 'Enter amount'
                  : formData.type === 'Services'
                  ? 'Enter quantity (hours/days/sessions)'
                  : 'Enter quantity'
              }
            />
          </div>
        </div>

        {/* ## Additional Information */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <AlertCircle size={20} />
            Additional Information
          </h3>
          <div>
            <label className="text-sm font-semibold text-slate-600 mb-2 block">
              Description (Optional)
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              className="w-full p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Provide additional details about your donation, such as brand, specifications, expiry dates, or special instructions..."
            />
          </div>
        </div>

        {/* ## Error Message */}
        {errors.submit && (
          <div className="bg-red-50 border border-red-200 p-4 rounded-lg flex items-center gap-2">
            <AlertCircle className="text-red-600" size={20} />
            <p className="text-sm text-red-700">{errors.submit}</p>
          </div>
        )}

        {/* ## Submit Button */}
        <div className="flex justify-end gap-4">
          <Button
            variant="outline"
            onClick={() => navigate('/dashboard')}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            icon={Save}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Donation'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CreateDonation;
