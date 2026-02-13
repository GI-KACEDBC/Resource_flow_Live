import React from 'react';
import { Package, CheckCircle, Clock, Truck, MapPin } from 'lucide-react';
import { StatusBadge } from './StatusBadge';

export const DonationTracker = ({ donations }) => {
  const getStatusIcon = (status) => {
    switch (status) {
      case 'Pending':
        return <Clock className="text-amber-500" size={20} />;
      case 'Verified':
        return <CheckCircle className="text-blue-500" size={20} />;
      case 'Allocated':
        return <Truck className="text-purple-500" size={20} />;
      case 'Delivered':
        return <CheckCircle className="text-emerald-500" size={20} />;
      default:
        return <Package className="text-slate-400" size={20} />;
    }
  };

  return (
    <div className="space-y-4">
      {donations.map((donation) => (
        <div
          key={donation.id}
          className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
              {getStatusIcon(donation.status)}
              <div>
                <h3 className="font-bold text-slate-900">{donation.item}</h3>
                <p className="text-sm text-slate-500">
                  {donation.type} • {donation.quantity} {donation.unit}
                </p>
              </div>
            </div>
            <StatusBadge status={donation.status} />
          </div>
          
          {donation.allocatedTo && (
            <div className="flex items-center gap-2 text-sm text-slate-600 mt-2">
              <MapPin size={14} />
              <span>Allocated to: {donation.allocatedTo}</span>
            </div>
          )}
          
          <div className="text-xs text-slate-400 mt-2">
            Created: {new Date(donation.createdAt).toLocaleDateString()}
          </div>
        </div>
      ))}
    </div>
  );
};
