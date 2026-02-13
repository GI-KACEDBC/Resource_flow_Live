// ## Supplier Dashboard View
// ## Displays supplier donations from the backend API
import React, { useState, useEffect } from 'react';
import { Package, Plus, TrendingUp, CheckCircle, ShieldCheck, AlertCircle, Map, DollarSign, Heart, Loader2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { DonationTracker } from '../../components/shared/DonationTracker';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { Button } from '../../components/ui/Button';
import { GhanaSVGHeatMap } from '../../components/map/GhanaSVGHeatMap';
import { donationApi } from '../../services/api';
import PaymentModal from '../../components/payment/PaymentModal';

const SupplierDashboard = () => {
  const { user, isVerified } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentType, setPaymentType] = useState('general'); // 'general' or 'project'
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [paymentSuccessBanner, setPaymentSuccessBanner] = useState(false);

  // ## Fetch donations from API
  useEffect(() => {
    const fetchDonations = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        // Fetch donations for the current user
        const data = await donationApi.getAll({ user_id: user.id });
        const userDonations = Array.isArray(data) ? data : [];
        setDonations(userDonations);
      } catch (err) {
        console.error('Error fetching donations:', err);
        setError('Failed to load donations. Please try again.');
        setDonations([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDonations();
  }, [user?.id]);

  // ## Calculate stats from donations
  const stats = React.useMemo(() => {
    const totalDonations = donations.length;
    const verified = donations.filter(d => d.status === 'verified' || d.status === 'Verified').length;
    const pending = donations.filter(d => d.status === 'pending' || d.status === 'Pending').length;
    const allocated = donations.filter(d => d.status === 'allocated' || d.status === 'Allocated').length;

    return {
      totalDonations,
      verified,
      pending,
      allocated,
    };
  }, [donations]);

  // ## Handle user interactions - unverified users go to verification-wait
  const handleMakeDonation = () => {
    if (!isVerified) {
      navigate('/verification-wait');
      return;
    }
    navigate('/dashboard/donate');
  };

  // ## Refresh donations after creating a new one
  const refreshDonations = async () => {
    if (!user?.id) return;
    try {
      const data = await donationApi.getAll({ user_id: user.id });
      const userDonations = Array.isArray(data) ? data : [];
      setDonations(userDonations);
    } catch (err) {
      console.error('Error refreshing donations:', err);
    }
  };

  // ## Handle Paystack return: refresh donations and show success
  useEffect(() => {
    const payment = searchParams.get('payment');
    if (payment === 'success' && user?.id) {
      setPaymentSuccessBanner(true);
      refreshDonations();
      setSearchParams({}, { replace: true });
      const t = setTimeout(() => setPaymentSuccessBanner(false), 5000);
      return () => clearTimeout(t);
    }
  }, [searchParams, user?.id]);

  // ## Listen for donation creation and refresh
  useEffect(() => {
    // Check if a donation was just created (from CreateDonation page)
    const checkForNewDonation = () => {
      const donationCreated = localStorage.getItem('donation_created');
      if (donationCreated) {
        refreshDonations();
        localStorage.removeItem('donation_created');
      }
    };

    // Check immediately and set up interval to check periodically
    checkForNewDonation();
    const interval = setInterval(checkForNewDonation, 1000);

    // Also listen for storage events (in case of multiple tabs)
    const handleStorageChange = (e) => {
      if (e.key === 'donation_created') {
        refreshDonations();
        localStorage.removeItem('donation_created');
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [user?.id]);

  // ## Handle general support payment
  const handleSupportResourceFlow = () => {
    setPaymentType('general');
    setShowPaymentModal(true);
  };

  // ## Handle payment success
  const handlePaymentSuccess = (paymentData) => {
    console.log('Payment successful:', paymentData);
    // ## In production, this would update the database and show a success notification
    setShowPaymentModal(false);
  };

  return (
    <div className="p-6 space-y-8 bg-white min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Supplier Dashboard</h2>
          <p className="text-slate-500 mt-1">Manage your donations and track their impact</p>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            icon={DollarSign} 
            onClick={handleSupportResourceFlow}
            className="border-emerald-500 text-emerald-600 hover:bg-emerald-50"
          >
            Support ResourceFlow
          </Button>
          <Button 
            variant="outline" 
            icon={Heart} 
            onClick={() => navigate('/dashboard/projects')}
            className="border-blue-500 text-blue-600 hover:bg-blue-50"
          >
            Fund Projects
          </Button>
          {isVerified && (
            <Button icon={Plus} onClick={handleMakeDonation}>
              Make Donation
            </Button>
          )}
        </div>
      </div>

      {/* Payment Success Banner (after Paystack redirect) */}
      {paymentSuccessBanner && (
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-lg flex items-center gap-2">
          <CheckCircle className="text-emerald-600 shrink-0" size={24} />
          <p className="text-emerald-800 font-medium">Payment successful. Your donation will be verified shortly.</p>
        </div>
      )}

      {/* Verification Status Banner - unverified suppliers cannot donate until approved */}
      {!isVerified && (
        <div className="bg-amber-50 border border-amber-200 p-6 rounded-lg">
          <div className="flex items-start gap-3">
            <ShieldCheck className="text-amber-600 shrink-0 mt-0.5" size={24} />
            <div>
              <h3 className="font-bold text-amber-900 mb-2">Verification Pending</h3>
              <p className="text-sm text-amber-800 mb-4">
                Your account is under review. You can view your dashboard and reupload documents.
                Donate will be available once your account is verified (typically 1–3 business days).
              </p>
              <Button
                variant="outline"
                icon={ShieldCheck}
                onClick={() => navigate('/dashboard/documents')}
                className="bg-white border-amber-300 text-amber-700 hover:bg-amber-100"
              >
                Reupload Documents
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-emerald-50/60 backdrop-blur-md p-6 rounded-xl shadow-lg border border-emerald-200/50 hover:shadow-xl transition">
          <p className="text-sm font-medium text-slate-700">Total Donations</p>
          <p className="text-2xl font-bold text-slate-900 mt-2">{stats.totalDonations}</p>
        </div>

        <div className="bg-emerald-50/60 backdrop-blur-md p-6 rounded-xl shadow-lg border border-emerald-200/50 hover:shadow-xl transition">
          <p className="text-sm font-medium text-slate-700">Verified</p>
          <p className="text-2xl font-bold text-emerald-600 mt-2">{stats.verified}</p>
        </div>

        <div className="bg-emerald-50/60 backdrop-blur-md p-6 rounded-xl shadow-lg border border-emerald-200/50 hover:shadow-xl transition">
          <p className="text-sm font-medium text-slate-700">Pending</p>
          <p className="text-2xl font-bold text-amber-600 mt-2">{stats.pending}</p>
        </div>

        <div className="bg-emerald-50/60 backdrop-blur-md p-6 rounded-xl shadow-lg border border-emerald-200/50 hover:shadow-xl transition">
          <p className="text-sm font-medium text-slate-700">Allocated</p>
          <p className="text-2xl font-bold text-purple-600 mt-2">{stats.allocated}</p>
        </div>
      </div>

      {/* Ghana Heat Map */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-800 mb-4">Regional Request Heat Map</h3>
        <div className="h-[600px] min-h-[600px]">
          <GhanaSVGHeatMap updateInterval={30000} />
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="animate-spin text-slate-400" size={32} />
          <span className="ml-3 text-slate-600">Loading donations...</span>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="text-red-600" size={20} />
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Donation Tracker */}
      {!loading && (
        <div>
          <h3 className="text-lg font-bold text-slate-800 mb-4">My Donations</h3>
          <DonationTracker donations={donations} />
        </div>
      )}

      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        paymentType={paymentType}
        onSuccess={handlePaymentSuccess}
      />
    </div>
  );
};

export default SupplierDashboard;
