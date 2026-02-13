import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Users, LogIn, Heart, TrendingUp } from 'lucide-react';
import { Button } from '../components/ui/Button';

const impactStories = [
  {
    id: 1,
    category: 'Agricultural Funding',
    title: 'Rice Farming Initiative',
    location: 'Northern Region, Tamale',
    impact: '500+ farmers received funding for improved rice cultivation',
    beneficiary: 'Tamale Farmers Cooperative',
  },
  {
    id: 2,
    category: 'Education',
    title: 'School Supplies Drive',
    location: 'Greater Accra, Accra',
    impact: '2,000 students received books, uniforms, and learning materials',
    beneficiary: 'Accra Central Primary School',
  },
  {
    id: 3,
    category: 'Healthcare',
    title: 'Medical Equipment Donation',
    location: 'Ashanti Region, Kumasi',
    impact: 'Community clinic equipped with essential medical devices',
    beneficiary: 'Kumasi Community Health Center',
  },
  {
    id: 4,
    category: 'Irrigation',
    title: 'Water Access Project',
    location: 'Upper East Region, Bolgatanga',
    impact: 'Irrigation system installed, benefiting 300+ farming families',
    beneficiary: 'Bolgatanga Agricultural Community',
  },
  {
    id: 5,
    category: 'Agricultural Funding',
    title: 'Maize Production Support',
    location: 'Brong Ahafo Region, Sunyani',
    impact: '1,200 farmers supported with seeds, fertilizers, and training',
    beneficiary: 'Sunyani Maize Growers Association',
  },
  {
    id: 6,
    category: 'Education',
    title: 'Digital Learning Center',
    location: 'Western Region, Takoradi',
    impact: 'Computer lab established, serving 800+ students',
    beneficiary: 'Takoradi Secondary School',
  },
  {
    id: 7,
    category: 'Healthcare',
    title: 'Maternal Health Program',
    location: 'Volta Region, Ho',
    impact: 'Prenatal care improved for 400+ expectant mothers',
    beneficiary: 'Ho Regional Hospital',
  },
  {
    id: 8,
    category: 'Irrigation',
    title: 'Drip Irrigation System',
    location: 'Eastern Region, Koforidua',
    impact: 'Water-efficient farming system installed for 150 farmers',
    beneficiary: 'Koforidua Vegetable Growers',
  },
  {
    id: 9,
    category: 'Agricultural Funding',
    title: 'Poultry Farming Support',
    location: 'Central Region, Cape Coast',
    impact: '50 small-scale poultry farmers received startup funding',
    beneficiary: 'Cape Coast Poultry Association',
  },
  {
    id: 10,
    category: 'Education',
    title: 'Scholarship Program',
    location: 'Northern Region, Wa',
    impact: '100 underprivileged students received full scholarships',
    beneficiary: 'Wa Secondary School',
  },
];

const Home = () => {
  const navigate = useNavigate();
  const [displayedStories, setDisplayedStories] = useState([]);

  useEffect(() => {
    // Randomly select 4 stories to display
    const shuffled = [...impactStories].sort(() => 0.5 - Math.random());
    setDisplayedStories(shuffled.slice(0, 4));
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-emerald-900 via-emerald-800 to-slate-900">
      {/* Video Background Container - fallback gradient if video missing */}
      <div className="absolute inset-0 z-0">
        {/* Video Background (optional - may not exist) */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          style={{ display: 'none' }}
          onLoadedData={(e) => { e.target.style.display = 'block'; }}
          onError={() => {}}
        >
          <source src="/videos/adomi.mp4" type="video/mp4" />
        </video>
        
        {/* Green Glass Overlay - always visible */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/70 via-emerald-800/60 to-slate-900/80"></div>
        
        {/* Additional green tint for glass effect */}
        <div className="absolute inset-0 bg-emerald-500/10"></div>
      </div>

      {/* Content Overlay */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4 py-8">
        {/* Main Content */}
        <div className="text-center mb-6 max-w-4xl">
          <div className="mb-4">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 drop-shadow-2xl">
              ResourceFlow
            </h1>
            <p className="text-lg md:text-xl text-slate-200 font-light">
              Connecting Generosity with Need
            </p>
            <p className="text-sm md:text-base text-slate-300 mt-2 max-w-2xl mx-auto">
              A logistics and donation management platform empowering communities across Ghana
            </p>
          </div>
        </div>

        {/* Feature Cards - Green Glass Effect (2 Column Grid) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl w-full mt-6">
          <div className="bg-emerald-500/20 backdrop-blur-md rounded-xl p-4 border border-emerald-300/30 text-white shadow-xl">
            <Package className="mb-2 text-emerald-200" size={24} />
            <h3 className="text-base font-bold mb-1">For Suppliers</h3>
            <p className="text-slate-100 text-xs">
              Donate resources and track their impact across communities
            </p>
          </div>
          <div className="bg-emerald-500/20 backdrop-blur-md rounded-xl p-4 border border-emerald-300/30 text-white shadow-xl">
            <Users className="mb-2 text-emerald-200" size={24} />
            <h3 className="text-base font-bold mb-1">For Recipients</h3>
            <p className="text-slate-100 text-xs">
              Request resources and track deliveries in real-time
            </p>
          </div>
        </div>

        {/* Login Button - Below the Grid */}
        <div className="flex justify-center mt-6">
          <Button
            onClick={() => navigate('/login')}
            className="bg-emerald-500/20 backdrop-blur-md border-2 border-emerald-300/40 text-white hover:bg-emerald-500/30 text-lg px-8 py-4 rounded-xl font-bold shadow-xl transform hover:scale-105 transition-all duration-200"
            icon={LogIn}
          >
            Login
          </Button>
        </div>

        {/* Impact Stories Section - Compact */}
        <div className="max-w-6xl w-full mt-8">
          <div className="text-center mb-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Heart className="text-emerald-300" size={20} />
              <h2 className="text-xl md:text-2xl font-bold text-white drop-shadow-lg">
                Impact Stories
              </h2>
              <TrendingUp className="text-emerald-300" size={20} />
            </div>
            <p className="text-slate-200 text-sm">
              Real stories of transformation across Ghana
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {displayedStories.map((story) => (
              <div
                key={story.id}
                className="bg-emerald-500/20 backdrop-blur-md rounded-xl p-3 border border-emerald-300/30 text-white shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <div className="mb-1">
                  <span className="text-[10px] font-semibold text-emerald-200 uppercase tracking-wider">
                    {story.category}
                  </span>
                </div>
                <h3 className="text-xs font-bold mb-1 leading-tight">{story.title}</h3>
                <p className="text-[10px] text-emerald-200 mb-1">
                  {story.location}
                </p>
                <p className="text-[11px] text-slate-100 mb-1 leading-tight">{story.impact}</p>
                <p className="text-[10px] text-slate-300 italic">
                  — {story.beneficiary}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
