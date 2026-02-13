import React, { useState, useEffect } from 'react';
import { X, TrendingUp, Users, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { contributionApi } from '../../services/api';

const PartialFundingModal = ({ isOpen, onClose, request, onSuccess }) => {
  const [percentage, setPercentage] = useState(30);
  const [customPercentage, setCustomPercentage] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (isOpen && request) {
      loadStats();
    }
  }, [isOpen, request]);

  const loadStats = async () => {
    try {
      const data = await contributionApi.getRequestStats(request.id);
      setStats(data);
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  };

  const presetPercentages = [30, 40, 50, 60, 70];

  const handlePercentageChange = (value) => {
    if (value === 'custom') {
      setUseCustom(true);
    } else {
      setUseCustom(false);
      setPercentage(parseInt(value));
      setCustomPercentage('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const finalPercentage = useCustom ? parseInt(customPercentage) : percentage;

      if (!finalPercentage || finalPercentage < 1 || finalPercentage > 100) {
        setError('Please enter a valid percentage between 1 and 100');
        setLoading(false);
        return;
      }

      // Check if percentage exceeds remaining
      const remaining = stats?.remaining_percentage ?? 100;
      if (finalPercentage > remaining) {
        setError(`Cannot contribute ${finalPercentage}%. Only ${remaining}% remaining.`);
        setLoading(false);
        return;
      }

      await contributionApi.create({
        request_id: request.id,
        percentage: finalPercentage,
      });

      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err) {
      console.error('Error creating contribution:', err);
      setError(err.response?.data?.message || 'Failed to create contribution. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !request) return null;

  const remainingPercentage = stats?.remaining_percentage ?? (100 - (request.total_funded_percentage || 0));
  const totalFunded = stats?.total_percentage ?? (request.total_funded_percentage || 0);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <TrendingUp className="text-emerald-600" size={24} />
              Partner & Fund Request
            </h3>
            <p className="text-slate-600 mt-1">{request.title}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* Funding Progress */}
        <div className="bg-slate-50 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-slate-700">Funding Progress</span>
            <span className="text-sm font-bold text-emerald-600">
              {totalFunded}% Funded
            </span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-3 mb-2">
            <div
              className="bg-emerald-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${totalFunded}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span>{totalFunded}% Committed</span>
            <span>{remainingPercentage}% Remaining</span>
          </div>
        </div>

        {/* Current Contributors */}
        {stats?.contributions && stats.contributions.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
              <Users size={16} />
              Current Partners ({stats.contribution_count})
            </h4>
            <div className="space-y-2">
              {stats.contributions.map((contribution) => (
                <div
                  key={contribution.id}
                  className="flex items-center justify-between p-2 bg-slate-50 rounded-lg"
                >
                  <span className="text-sm text-slate-700">
                    {contribution.supplier?.name || `Supplier #${contribution.supplier_id}`}
                  </span>
                  <span className="text-sm font-semibold text-emerald-600">
                    {contribution.percentage}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Percentage Selector */}
          <div>
            <label className="text-sm font-semibold text-slate-700 mb-2 block">
              Select Your Contribution Percentage *
            </label>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {presetPercentages.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handlePercentageChange(preset)}
                  disabled={preset > remainingPercentage}
                  className={`p-3 border-2 rounded-lg font-semibold transition ${
                    !useCustom && percentage === preset
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                      : preset > remainingPercentage
                      ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                      : 'border-slate-200 hover:border-emerald-300 hover:bg-emerald-50'
                  }`}
                >
                  {preset}%
                </button>
              ))}
              <button
                type="button"
                onClick={() => handlePercentageChange('custom')}
                className={`p-3 border-2 rounded-lg font-semibold transition ${
                  useCustom
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 hover:border-emerald-300 hover:bg-emerald-50'
                }`}
              >
                Custom
              </button>
            </div>

            {useCustom && (
              <div className="mt-3">
                <input
                  type="number"
                  min="1"
                  max={remainingPercentage}
                  value={customPercentage}
                  onChange={(e) => setCustomPercentage(e.target.value)}
                  placeholder={`Enter percentage (1-${remainingPercentage}%)`}
                  className="w-full p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
                <p className="text-xs text-slate-500 mt-1">
                  Maximum: {remainingPercentage}% (remaining)
                </p>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="text-red-600 shrink-0 mt-0.5" size={18} />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Info Message */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="text-blue-600 shrink-0 mt-0.5" size={18} />
            <div className="text-sm text-blue-700">
              <p className="font-semibold mb-1">How Partial Funding Works:</p>
              <ul className="list-disc list-inside space-y-1 text-blue-600">
                <li>Multiple suppliers can partner to fund a single request</li>
                <li>Once total contributions reach 100%, the request is fully funded</li>
                <li>You can recede from your contribution if needed (subject to admin approval)</li>
              </ul>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={loading || (useCustom && (!customPercentage || parseInt(customPercentage) < 1))}
              icon={CheckCircle}
            >
              {loading ? 'Processing...' : `Contribute ${useCustom ? customPercentage || 0 : percentage}%`}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PartialFundingModal;
