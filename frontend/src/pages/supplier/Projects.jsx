// ## Projects Page (Fund Projects)
// ## Displays available aid requests that suppliers can fund - fetches from API
import React, { useState, useEffect } from 'react';
import { MapPin, Users, Target, TrendingUp, Search, Filter, Heart, DollarSign, Loader2, Calendar } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import PaymentModal from '../../components/payment/PaymentModal';
import PartialFundingModal from '../../components/funding/PartialFundingModal';
import { formatGHC } from '../../utils/currency';
import { requestApi } from '../../services/api';

// ## Fallback mock projects (only used if API fails)
const mockProjects = [
  {
    id: 'proj-001',
    name: 'Emergency Relief for Northern Ghana',
    description: 'Providing essential food and medical supplies to communities affected by recent flooding in the Northern Region.',
    region: 'Northern',
    targetAmount: 50000,
    currentAmount: 32500,
    donors: 45,
    status: 'Active',
    category: 'Emergency Relief',
    image: '/images/projects/northern-relief.jpg',
    deadline: '2024-03-15',
    createdAt: '2024-01-10',
  },
  {
    id: 'proj-002',
    name: 'School Supplies for Rural Communities',
    description: 'Distributing educational materials, books, and learning resources to underserved schools across Ghana.',
    region: 'Multiple',
    targetAmount: 75000,
    currentAmount: 42000,
    donors: 78,
    status: 'Active',
    category: 'Education',
    image: '/images/projects/education.jpg',
    deadline: '2024-04-30',
    createdAt: '2024-01-15',
  },
  {
    id: 'proj-003',
    name: 'Medical Equipment for Health Centers',
    description: 'Equipping community health centers with essential medical equipment and supplies.',
    region: 'Ashanti',
    targetAmount: 100000,
    currentAmount: 68000,
    donors: 92,
    status: 'Active',
    category: 'Healthcare',
    image: '/images/projects/healthcare.jpg',
    deadline: '2024-05-20',
    createdAt: '2024-01-20',
  },
  {
    id: 'proj-004',
    name: 'Clean Water Initiative',
    description: 'Installing water wells and purification systems in communities without access to clean water.',
    region: 'Upper East',
    targetAmount: 120000,
    currentAmount: 95000,
    donors: 156,
    status: 'Active',
    category: 'Infrastructure',
    image: '/images/projects/water.jpg',
    deadline: '2024-06-30',
    createdAt: '2024-02-01',
  },
  {
    id: 'proj-005',
    name: 'Agricultural Support Program',
    description: 'Providing seeds, fertilizers, and farming tools to support local farmers and improve food security.',
    region: 'Bono',
    targetAmount: 80000,
    currentAmount: 52000,
    donors: 64,
    status: 'Active',
    category: 'Agriculture',
    image: '/images/projects/agriculture.jpg',
    deadline: '2024-04-15',
    createdAt: '2024-02-05',
  },
];

const Projects = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [selectedProject, setSelectedProject] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showFundingModal, setShowFundingModal] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await requestApi.getAvailable();
        setProjects(Array.isArray(data) ? data : mockProjects);
      } catch (err) {
        console.error('Failed to load projects:', err);
        setProjects(mockProjects);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // ## Normalize project for display (API returns requests with title, description, etc.)
  const displayProjects = projects.map((p) => ({
    id: p.id,
    name: p.title || p.name,
    description: p.description || '',
    region: p.region || 'N/A',
    category: p.aid_type || p.category || 'Aid',
    totalFunded: p.total_funded_percentage ?? 0,
    remaining: p.remaining_percentage ?? 100,
    fundingStatus: p.funding_status,
    user: p.user,
    ...p,
  }));

  // ## Filter projects
  const filteredProjects = displayProjects.filter((project) => {
    const name = project.name || project.title || '';
    const desc = project.description || '';
    const region = project.region || '';
    const matchesSearch =
      name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
      region.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'All' || (project.category || project.aid_type) === filterCategory;
    return matchesSearch && matchesCategory;
  });

  // ## Get unique categories
  const categories = ['All', ...new Set(displayProjects.map((p) => p.category || p.aid_type || 'Aid'))];

  // ## Calculate progress (for API data: totalFunded is 0-100)
  const getProgress = (p) => (p.totalFunded ?? p.total_funded_percentage ?? 0);

  // ## Handle fund project - use PartialFundingModal for API requests
  const handleFundProject = (project) => {
    setSelectedProject(project);
    if (project.id && typeof project.id === 'number') {
      setShowFundingModal(true);
    } else {
      setShowPaymentModal(true);
    }
  };

  const handleFundingSuccess = () => {
    setShowFundingModal(false);
    setSelectedProject(null);
    requestApi.getAvailable().then((data) => setProjects(Array.isArray(data) ? data : []));
  };

  const handlePaymentSuccess = (paymentData) => {
    console.log('Payment successful:', paymentData);
    setShowPaymentModal(false);
    setSelectedProject(null);
  };

  if (loading) {
    return (
      <div className="p-6 bg-white min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 mx-auto text-emerald-500 animate-spin mb-4" />
          <p className="text-slate-600">Loading projects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Fund Projects</h2>
        <p className="text-slate-600 mt-1">
          Support impactful aid requests and make a difference in communities across Ghana
        </p>
      </div>

      {/* Search and Filter */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects..."
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="text-slate-400" size={18} />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="flex-1 p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <div className="text-center py-12">
          <Heart className="w-16 h-16 mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500">No projects found matching your search</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => {
            const progress = getProgress(project);
            const remaining = project.remaining ?? (100 - progress);
            const isApiRequest = project.id && typeof project.id === 'number';

            return (
              <div
                key={project.id}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow"
              >
                <div className="h-32 bg-gradient-to-br from-emerald-100 to-blue-100 flex items-center justify-center">
                  <Heart className="w-12 h-12 text-emerald-400" />
                </div>
                <div className="p-6">
                  <div className="mb-3">
                    <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full">
                      {project.category || project.aid_type || 'Aid'}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mb-2">{project.name || project.title}</h3>
                  <p className="text-sm text-slate-600 mb-4 line-clamp-2">{project.description}</p>
                  <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
                    <MapPin size={14} />
                    <span>{project.region}</span>
                  </div>
                  {project.user && (
                    <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
                      <Users size={14} />
                      <span>Recipient: {project.user.name}</span>
                    </div>
                  )}
                  {project.created_at && (
                    <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
                      <Calendar size={14} />
                      <span>Request date: {new Date(project.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    </div>
                  )}
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-slate-600">Funding Progress</span>
                      <span className="font-semibold text-slate-800">{progress}% / {remaining}% remaining</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div
                        className="bg-emerald-600 h-2 rounded-full transition-all"
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>
                  </div>
                  <Button
                    onClick={() => handleFundProject(project)}
                    className="w-full"
                    icon={DollarSign}
                    disabled={!isApiRequest || remaining <= 0}
                  >
                    {remaining <= 0 ? 'Fully Funded' : `Fund This Project (${remaining}% available)`}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Partial Funding Modal (for API requests) */}
      {showFundingModal && selectedProject && (
        <PartialFundingModal
          isOpen={showFundingModal}
          onClose={() => {
            setShowFundingModal(false);
            setSelectedProject(null);
          }}
          request={selectedProject}
          onSuccess={handleFundingSuccess}
        />
      )}

      {/* Payment Modal (fallback for mock data) */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false);
          setSelectedProject(null);
        }}
        paymentType="project"
        projectData={selectedProject}
        onSuccess={handlePaymentSuccess}
      />
    </div>
  );
};

export default Projects;
