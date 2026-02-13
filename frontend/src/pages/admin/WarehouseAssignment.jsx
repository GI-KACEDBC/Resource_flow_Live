// ## Warehouse Assignment Component
// ## Allows admins to assign verified donations to warehouses
import React, { useState, useEffect } from 'react';
import { Warehouse, Package, MapPin, CheckCircle, Search, Filter } from 'lucide-react';
import { donationApi, warehouseApi } from '../../services/api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { StatusBadge } from '../../components/shared/StatusBadge';

const WarehouseAssignment = () => {
  const [donations, setDonations] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('Verified');
  const [selectedDonation, setSelectedDonation] = useState(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);
  const [colocationFacility, setColocationFacility] = useState('');
  const [colocationSubLocation, setColocationSubLocation] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [donationsData, warehousesData] = await Promise.all([
        donationApi.getAll({ status: 'Verified' }),
        warehouseApi.getAll(),
      ]);
      // Ensure both are always arrays
      const donations = Array.isArray(donationsData) ? donationsData : [];
      const warehouses = Array.isArray(warehousesData) ? warehousesData : [];
      setDonations(donations.filter(d => d && !d.warehouse_id));
      setWarehouses(warehouses);
    } catch (error) {
      console.error('Error loading data:', error);
      setDonations([]); // Set to empty array on error
      setWarehouses([]);
    } finally {
      setLoading(false);
    }
  };

  // Ensure donations is an array before filtering
  const filteredDonations = Array.isArray(donations) ? donations.filter((donation) => {
    const matchesSearch =
      (donation.item || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (donation.type || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || donation.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) : [];

  const handleAssign = async () => {
    if (!selectedDonation || !selectedWarehouse) {
      alert('Please select both a donation and a warehouse');
      return;
    }

    try {
      await donationApi.assignWarehouse(selectedDonation.id, {
        warehouse_id: selectedWarehouse.id,
        colocation_facility: colocationFacility || selectedWarehouse.name,
        colocation_sub_location: colocationSubLocation,
      });

      alert('Warehouse assigned successfully!');
      setSelectedDonation(null);
      setSelectedWarehouse(null);
      setColocationFacility('');
      setColocationSubLocation('');
      loadData();
    } catch (error) {
      console.error('Error assigning warehouse:', error);
      alert('Failed to assign warehouse. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-white min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Package className="w-12 h-12 mx-auto text-slate-400 animate-spin mb-4" />
          <p className="text-slate-600">Loading data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Warehouse Assignment</h2>
        <p className="text-slate-600 mt-1">Assign verified donations to warehouse facilities</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Unassigned Donations */}
        <div className="lg:col-span-2 space-y-4">
          {/* Search and Filter */}
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search donations..."
                  className="pl-10"
                />
              </div>
              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Verified">Verified</option>
                  <option value="all">All Status</option>
                </select>
              </div>
            </div>
          </div>

          {/* Donations List */}
          <div className="space-y-3">
            {filteredDonations.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-xl">
                <Package className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                <p className="text-slate-500">No unassigned donations found</p>
              </div>
            ) : (
              filteredDonations.map((donation) => (
                <div
                  key={donation.id}
                  className={`bg-white border-2 rounded-xl p-4 cursor-pointer transition-all ${
                    selectedDonation?.id === donation.id
                      ? 'border-emerald-500 shadow-lg'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                  onClick={() => setSelectedDonation(donation)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-bold text-slate-800">{donation.item}</h3>
                      <p className="text-sm text-slate-600 mt-1">{donation.description}</p>
                      <div className="flex items-center gap-4 text-sm mt-2">
                        <span className="text-slate-600">
                          {donation.quantity} {donation.unit}
                        </span>
                        <StatusBadge status={donation.status} />
                        <span className="text-slate-500">{donation.type}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column - Warehouse Selection */}
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <h3 className="font-bold text-slate-800 mb-3">Select Warehouse</h3>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {Array.isArray(warehouses) && warehouses.length > 0 ? warehouses.map((warehouse) => (
                <div
                  key={warehouse.id}
                  className={`p-3 border rounded-lg cursor-pointer transition ${
                    selectedWarehouse?.id === warehouse.id
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                  onClick={() => setSelectedWarehouse(warehouse)}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Warehouse size={16} className="text-emerald-600" />
                    <span className="font-semibold text-slate-800">{warehouse.name}</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    <MapPin size={12} className="inline mr-1" />
                    {warehouse.city}, {warehouse.region}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Capacity: {warehouse.capacity} {warehouse.capacity_unit}
                  </p>
                </div>
              )) : (
                <div className="text-center py-8 text-slate-500 text-sm">
                  No warehouses available
                </div>
              )}
            </div>
          </div>

          {/* Assignment Form */}
          {selectedDonation && selectedWarehouse && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <h4 className="font-semibold text-emerald-800 mb-3">Assignment Details</h4>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">
                    Colocation Facility
                  </label>
                  <Input
                    type="text"
                    value={colocationFacility}
                    onChange={(e) => setColocationFacility(e.target.value)}
                    placeholder={selectedWarehouse.name}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">
                    Sub-Location (e.g., Aisle 4, Shelf B)
                  </label>
                  <Input
                    type="text"
                    value={colocationSubLocation}
                    onChange={(e) => setColocationSubLocation(e.target.value)}
                    placeholder="Aisle 4, Shelf B"
                  />
                </div>
                <Button
                  onClick={handleAssign}
                  className="w-full"
                  icon={CheckCircle}
                >
                  Assign to Warehouse
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WarehouseAssignment;
