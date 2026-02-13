// ## User Management – Super Admin CRUD for Admin and Staff accounts
// ## Create and manage Admin, Auditor, Field Agent, Driver, Supervisor, Special (Admin has no user creation access)
import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  UserCheck,
  UserX,
  Loader2,
  ShieldCheck,
  Mail,
  Lock,
} from 'lucide-react';
import { userManagementApi } from '../../services/api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

const ROLE_LABELS = {
  admin: 'Admin',
  auditor: 'Auditor',
  field_agent: 'Field Agent',
  driver: 'Driver',
  supervisor: 'Supervisor',
  special: 'Special',
};

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [permissions, setPermissions] = useState({});
  const [roleDefaults, setRoleDefaults] = useState({});
  const [staffRoles, setStaffRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [activeFilter, setActiveFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (search) params.search = search;
      if (roleFilter !== 'all') params.role = roleFilter;
      if (activeFilter !== 'all') params.is_active = activeFilter === 'active';
      const data = await userManagementApi.index(params);
      setUsers(data.users);
      setPermissions(data.permissions || {});
      setRoleDefaults(data.role_defaults || {});
      setStaffRoles(data.staff_roles || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load staff users');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [roleFilter, activeFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchData();
  };

  const handleCreate = async (formData) => {
    setSubmitting(true);
    setError('');
    try {
      await userManagementApi.store(formData);
      setShowCreateModal(false);
      fetchData();
      alert('Account created successfully. The account is pre-verified.');
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.errors
        ? Object.values(err.response.data.errors || {}).flat().join(', ')
        : err.message;
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (id, formData) => {
    setSubmitting(true);
    setError('');
    try {
      await userManagementApi.update(id, formData);
      setEditingUser(null);
      fetchData();
      alert('Staff account updated successfully.');
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.errors
        ? Object.values(err.response.data.errors || {}).flat().join(', ')
        : err.message;
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async (user) => {
    if (!window.confirm(`Deactivate ${user.name}? They will not be able to log in.`)) return;
    try {
      await userManagementApi.destroy(user.id);
      fetchData();
      alert('Account deactivated.');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to deactivate');
    }
  };

  const handleReactivate = async (user) => {
    try {
      await userManagementApi.reactivate(user.id);
      fetchData();
      alert('Account reactivated.');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reactivate');
    }
  };

  const handleDelete = async (user) => {
    if (!window.confirm(`Permanently delete ${user.name}? This cannot be undone.`)) return;
    try {
      await userManagementApi.destroy(user.id, true);
      setEditingUser(null);
      fetchData();
      alert('Account permanently deleted.');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete');
    }
  };

  const permEntries = Object.entries(permissions);
  const groupedPerms = permEntries.reduce((acc, [key, val]) => {
    const g = val?.group || 'other';
    if (!acc[g]) acc[g] = [];
    acc[g].push({ key, ...val });
    return acc;
  }, {});

  return (
    <div className="p-6 space-y-8 bg-white min-h-screen">
      <div className="flex gap-4 items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Account Management</h2>
          <p className="text-slate-500 mt-1">Create and manage Admin, Auditor, Field Agent, Driver, Supervisor, and Special accounts</p>
        </div>
        <Button icon={Plus} onClick={() => setShowCreateModal(true)}>
          Create Account
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-600">Total Staff</p>
          <p className="text-xl font-bold text-slate-900 mt-2">{users.length}</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-600">Active</p>
          <p className="text-xl font-bold text-emerald-600 mt-2">
            {users.filter((u) => u.is_active).length}
          </p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-600">Inactive</p>
          <p className="text-xl font-bold text-amber-600 mt-2">
            {users.filter((u) => !u.is_active).length}
          </p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-600">Roles</p>
          <p className="text-xl font-bold text-blue-600 mt-2">{staffRoles.length}</p>
        </div>
      </div>

      {/* Filters */}
      <form onSubmit={handleSearch} className="flex gap-4 items-end flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <Input
            label="Search"
            icon={Search}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name or email..."
          />
        </div>
        <div className="w-40">
          <label className="text-sm font-semibold text-slate-600 mb-2 block">Role</label>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">All</option>
            {staffRoles.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r] || r}
              </option>
            ))}
          </select>
        </div>
        <div className="w-40">
          <label className="text-sm font-semibold text-slate-600 mb-2 block">Status</label>
          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
            className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <Button type="submit">Search</Button>
      </form>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 flex items-center justify-center gap-2">
            <Loader2 className="animate-spin" size={24} />
            Loading...
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            No managed accounts found. Create one to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase">User</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase">Permissions</th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-slate-700 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-slate-900">{user.name}</p>
                        <p className="text-sm text-slate-500 flex items-center gap-1">
                          <Mail size={12} />
                          {user.email}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                        {user.display_role || ROLE_LABELS[user.role] || user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {user.is_active ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                          <UserCheck size={12} />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                          <UserX size={12} />
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs text-slate-600">
                        {(user.permissions || []).length} permission(s)
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          icon={Edit2}
                          onClick={() => setEditingUser(user)}
                        >
                          Edit
                        </Button>
                        {user.is_active ? (
                          <Button
                            variant="outline"
                            size="sm"
                            icon={UserX}
                            onClick={() => handleDeactivate(user)}
                            className="border-amber-500 text-amber-600 hover:bg-amber-50"
                          >
                            Deactivate
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            icon={UserCheck}
                            onClick={() => handleReactivate(user)}
                            className="border-emerald-500 text-emerald-600 hover:bg-emerald-50"
                          >
                            Reactivate
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          icon={Trash2}
                          onClick={() => handleDelete(user)}
                          className="border-red-500 text-red-600 hover:bg-red-50"
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <StaffFormModal
          permissions={permissions}
          roleDefaults={roleDefaults}
          staffRoles={staffRoles}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreate}
          submitting={submitting}
        />
      )}

      {/* Edit Modal */}
      {editingUser && (
        <StaffFormModal
          user={editingUser}
          permissions={permissions}
          roleDefaults={roleDefaults}
          staffRoles={staffRoles}
          onClose={() => setEditingUser(null)}
          onSubmit={(data) => handleUpdate(editingUser.id, data)}
          submitting={submitting}
          isEdit
        />
      )}
    </div>
  );
};

/** Form modal for create/edit */
const StaffFormModal = ({
  user,
  permissions,
  roleDefaults,
  staffRoles,
  onClose,
  onSubmit,
  submitting,
  isEdit = false,
}) => {
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [role, setRole] = useState(user?.role || 'auditor');
  const [organization, setOrganization] = useState(user?.organization || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [customRoleName, setCustomRoleName] = useState(user?.custom_role_name || '');
  const [selectedPerms, setSelectedPerms] = useState(user?.permissions ?? (role === 'admin' ? [] : (roleDefaults[role] || [])));

  useEffect(() => {
    if (!isEdit) {
      if (role === 'admin') setSelectedPerms([]);
      else if (role !== 'special') setSelectedPerms(roleDefaults[role] || []);
    }
  }, [role, roleDefaults, isEdit]);

  const togglePerm = (key) => {
    setSelectedPerms((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      name,
      email,
      role,
      organization: organization || undefined,
      phone: phone || undefined,
      custom_role_name: role === 'special' ? customRoleName || undefined : undefined,
      permissions: role === 'admin' ? [] : selectedPerms,
    };
    if (!isEdit) {
      if (!password || password.length < 8) {
        alert('Password must be at least 8 characters');
        return;
      }
      if (password !== passwordConfirmation) {
        alert('Passwords do not match');
        return;
      }
      data.password = password;
      data.password_confirmation = passwordConfirmation;
    } else if (password) {
      data.password = password;
      data.password_confirmation = passwordConfirmation;
    }
    onSubmit(data);
  };

  const permEntries = Object.entries(permissions || {});
  const groupedPerms = permEntries.reduce((acc, [key, val]) => {
    const g = val?.group || 'other';
    if (!acc[g]) acc[g] = [];
    acc[g].push({ key, ...val });
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl p-6 max-w-2xl w-full my-8 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-6">
          <h3 className="text-lg font-bold text-slate-800">
            {isEdit ? 'Edit Account' : 'Create Account'}
          </h3>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isEdit}
            />
          </div>

          {!isEdit && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-2 block">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required={!isEdit}
                  minLength={8}
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-2 block">Confirm Password</label>
                <input
                  type="password"
                  value={passwordConfirmation}
                  onChange={(e) => setPasswordConfirmation(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required={!isEdit}
                />
              </div>
            </div>
          )}

          {isEdit && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-2 block">New Password (leave blank to keep)</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  minLength={8}
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-2 block">Confirm New Password</label>
                <input
                  type="password"
                  value={passwordConfirmation}
                  onChange={(e) => setPasswordConfirmation(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-slate-700 mb-2 block">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              >
                {staffRoles.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r] || r}
                  </option>
                ))}
              </select>
            </div>
            {role === 'special' && (
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-2 block">Custom Role Name</label>
                <input
                  type="text"
                  value={customRoleName}
                  onChange={(e) => setCustomRoleName(e.target.value)}
                  placeholder="e.g. Logistics Coordinator"
                  className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Organization"
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
            />
            <Input
              label="Phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          {role !== 'admin' && (
          <div>
            <label className="text-sm font-semibold text-slate-700 mb-2 block flex items-center gap-2">
              <ShieldCheck size={16} />
              Permissions
            </label>
            <div className="border border-slate-200 rounded-lg p-4 space-y-4 max-h-48 overflow-y-auto">
              {Object.entries(groupedPerms).map(([group, items]) => (
                <div key={group}>
                  <p className="text-xs font-bold text-slate-500 uppercase mb-2">{group}</p>
                  <div className="flex flex-wrap gap-2">
                    {items.map(({ key, label }) => (
                      <label
                        key={key}
                        className="flex items-center gap-2 cursor-pointer text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={selectedPerms.includes(key)}
                          onChange={() => togglePerm(key)}
                          className="rounded border-slate-300 text-emerald-600"
                        />
                        {label || key}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          )}

          <div className="flex gap-3 justify-end pt-4 border-t border-slate-200">
            <Button variant="outline" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} icon={submitting ? Loader2 : undefined}>
              {submitting ? 'Saving...' : isEdit ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserManagement;
