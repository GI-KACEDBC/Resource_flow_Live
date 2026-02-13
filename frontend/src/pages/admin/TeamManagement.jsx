// ## Team Management – Supervisor view for team members
import React from 'react';
import { Users } from 'lucide-react';

const TeamManagement = () => {
  return (
    <div className="p-6 bg-white min-h-screen">
      <h2 className="text-xl font-bold text-slate-800">Team Management</h2>
      <p className="text-slate-600 mt-2">View and assign team members (drivers, field agents).</p>
      <div className="mt-8 p-8 bg-slate-50 rounded-xl border border-slate-200 text-center">
        <Users className="mx-auto text-slate-400" size={48} />
        <p className="text-slate-600 mt-4">Team management features coming soon.</p>
      </div>
    </div>
  );
};

export default TeamManagement;
