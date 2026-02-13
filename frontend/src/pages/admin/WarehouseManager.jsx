// ## Warehouse Manager Component
// ## Allows admins to create and manage physical storage facilities
import React, { useState } from 'react';
import { MapPin, User, Package, Plus, Edit2, Trash2, Save, X, Ruler } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { WarehouseModel } from '../../models/WarehouseModel';

const WarehouseManager = () => {
  // ## Warehouse list state
  const [warehouses, setWarehouses] = useState(WarehouseModel.getAllWarehouses());
  // ## Modal visibility state
  const [isModalOpen, setIsModalOpen] = useState(false);
  // ## Currently editing warehouse (null for new warehouse)
  const [editingWarehouse, setEditingWarehouse] = useState(null);
  // ## Form data state for create/edit
  const [formData, setFormData] = useState({
    name: '',
    region: 'Greater Accra',
    city: '',
    address: '',
    capacity: '',
    capacityUnit: 'm²',
    manager: '',
    contact: '',
    status: 'Active',
  });

  // ## List of Ghana regions for dropdown
  const regions = [
    'Greater Accra', 'Ashanti', 'Central', 'Eastern', 'Western', 
    'Northern', 'Upper East', 'Upper West', 'Volta', 'Bono',
    'Bono East', 'Ahafo', 'Western North', 'Oti', 'Savannah',
    'North East'
  ];

  const statusConfig = {
    Active: { color: 'text-emerald-600 bg-emerald-50', label: 'Active' },
    Full: { color: 'text-amber-600 bg-amber-50', label: 'Full' },
    Maintenance: { color: 'text-blue-600 bg-blue-50', label: 'Maintenance' },
  };

  const handleOpenModal = (warehouse) => {
    if (warehouse) {
      setEditingWarehouse(warehouse);
      setFormData({
        name: warehouse.name,
        region: warehouse.region,
        city: warehouse.city,
        address: warehouse.address || '',
        capacity: warehouse.capacity.toString(),
        capacityUnit: warehouse.capacityUnit,
        manager: warehouse.manager,
        contact: warehouse.contact,
        status: warehouse.status,
      });
    } else {
      setEditingWarehouse(null);
      setFormData({
        name: '',
        region: 'Greater Accra',
        city: '',
        address: '',
        capacity: '',
        capacityUnit: 'm²',
        manager: '',
        contact: '',
        status: 'Active',
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingWarehouse(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // ## In a real app, this would call an API
    if (editingWarehouse) {
      // ## Update existing warehouse
      setWarehouses(warehouses.map(wh => 
        wh.id === editingWarehouse.id 
          ? { ...wh, ...formData, capacity: Number(formData.capacity), updatedAt: new Date().toISOString().split('T')[0] }
          : wh
      ));
    } else {
      // ## Create new warehouse
      const newWarehouse = {
        id: `wh-${String(warehouses.length + 1).padStart(3, '0')}`,
        ...formData,
        capacity: Number(formData.capacity),
        currentOccupancy: 0,
        createdAt: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString().split('T')[0],
        contactPerson: formData.manager,
        contactPhone: formData.contact,
        contactEmail: formData.contact.includes('@') ? formData.contact : '',
      };
      setWarehouses([...warehouses, newWarehouse]);
    }
    
    handleCloseModal();
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this warehouse?')) {
      setWarehouses(warehouses.filter(wh => wh.id !== id));
    }
  };

  const getUtilizationPercent = (warehouse) => {
    if (!warehouse.currentOccupancy || !warehouse.capacity) return 0;
    return Math.round((warehouse.currentOccupancy / warehouse.capacity) * 100);
  };

  return (
    <div className="p-6 bg-white min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Warehouse Management</h2>
          <p className="text-slate-600 mt-1">Create and manage physical storage facilities</p>
        </div>
        <Button icon={Plus} onClick={() => handleOpenModal(null)}>
          Add Warehouse
        </Button>
      </div>

      {/* Warehouses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {warehouses.map((warehouse) => {
          const utilization = getUtilizationPercent(warehouse);
          
          return (
            <div key={warehouse.id} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md transition">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-bold text-slate-900">{warehouse.name}</h3>
                  <p className="text-sm text-slate-500">{warehouse.city}, {warehouse.region}</p>
                </div>
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${statusConfig[warehouse.status].color}`}>
                  {warehouse.status}
                </div>
              </div>

              {/* Details */}
              <div className="space-y-3 mb-4">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <MapPin size={16} className="text-slate-400" />
                  <span className="truncate">{warehouse.address || 'No address provided'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <User size={16} className="text-slate-400" />
                  <span>{warehouse.manager}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Ruler size={16} className="text-slate-400" />
                  <span>Capacity: {warehouse.capacity.toLocaleString()} {warehouse.capacityUnit}</span>
                </div>
              </div>

              {/* Utilization Bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-600">Utilization</span>
                  <span className={`text-xs font-bold ${utilization >= 90 ? 'text-red-600' : utilization >= 70 ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {utilization}%
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      utilization >= 90 ? 'bg-red-500' : utilization >= 70 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${utilization}%` }}
                  ></div>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {warehouse.currentOccupancy || 0} / {warehouse.capacity} {warehouse.capacityUnit} used
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t border-slate-200">
                <button
                  onClick={() => handleOpenModal(warehouse)}
                  className="flex-1 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2"
                >
                  <Edit2 size={14} />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(warehouse.id)}
                  className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">
                {editingWarehouse ? 'Edit Warehouse' : 'Create New Warehouse'}
              </h3>
              <button
                onClick={handleCloseModal}
                className="p-2 hover:bg-slate-100 rounded-lg transition"
              >
                <X size={20} className="text-slate-600" />
              </button>
            </div>

            {/* Modal Content */}
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[70vh]">
              <div className="space-y-4">
                <Input
                  label="Warehouse Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-slate-600 mb-2 block">Region</label>
                    <select
                      value={formData.region}
                      onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                      className="w-full border p-2 rounded border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      required
                    >
                      {regions.map(region => (
                        <option key={region} value={region}>{region}</option>
                      ))}
                    </select>
                  </div>
                  <Input
                    label="City"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    required
                  />
                </div>

                <Input
                  label="Address / GPS Code"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="GA-123-4567, North Legon, Accra"
                />

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Capacity"
                    type="number"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                    required
                  />
                  <div>
                    <label className="text-sm font-semibold text-slate-600 mb-2 block">Unit</label>
                    <select
                      value={formData.capacityUnit}
                      onChange={(e) => setFormData({ ...formData, capacityUnit: e.target.value })}
                      className="w-full border p-2 rounded border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="m²">m²</option>
                      <option value="Units">Units</option>
                      <option value="Pallets">Pallets</option>
                    </select>
                  </div>
                </div>

                <Input
                  label="Manager Name"
                  value={formData.manager}
                  onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
                  required
                />

                <Input
                  label="Contact (Phone/Email)"
                  value={formData.contact}
                  onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                  required
                />

                <div>
                  <label className="text-sm font-semibold text-slate-600 mb-2 block">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full border p-2 rounded border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Active">Active</option>
                    <option value="Full">Full</option>
                    <option value="Maintenance">Maintenance</option>
                  </select>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex gap-3 mt-6 pt-6 border-t border-slate-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseModal}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  icon={Save}
                  className="flex-1"
                >
                  {editingWarehouse ? 'Update Warehouse' : 'Create Warehouse'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WarehouseManager;
