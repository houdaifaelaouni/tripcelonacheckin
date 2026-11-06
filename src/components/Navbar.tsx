import React from 'react';
import { 
  Compass, 
  QrCode, 
  ScanLine, 
  Bus, 
  UploadCloud, 
  LayoutDashboard,
  ShieldCheck,
  User,
  Users,
  CreditCard,
  Share2
} from 'lucide-react';
import { TravelTrip, UserRole, UserProfile, ROLE_DEFINITIONS } from '../types';

interface NavbarProps {
  activeTab: 'dashboard' | 'checkin' | 'validator' | 'trips' | 'showcase' | 'booking';
  onTabChange: (tab: 'dashboard' | 'checkin' | 'validator' | 'trips' | 'showcase' | 'booking') => void;
  onOpenVercelGuide: () => void;
  onOpenAuthModal: () => void;
  onOpenPortalLinks: () => void;
  activeTrip: TravelTrip | null;
  bookedCount: number;
  currentUser: UserProfile | null;
  currentRole: UserRole;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  onOpenVercelGuide,
  onOpenAuthModal,
  onOpenPortalLinks,
  activeTrip,
  bookedCount,
  currentUser,
  currentRole,
}) => {
  const capacity = activeTrip?.capacity || 55;
  const remaining = activeTrip ? Math.max(0, capacity - bookedCount) : 0;
  const isFull = remaining === 0 && capacity > 0;
  const roleDef = ROLE_DEFINITIONS[currentRole] || ROLE_DEFINITIONS.admin;

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-[#D5D9E0] text-[#000000] shadow-xs font-gellix">
      {/* Top Navbar Row: Exactly 3 Zones (Brand, Nav, Actions) */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-4">
          {/* ZONE 1: Logo & Brand Wordmark */}
          <div className="flex items-center gap-3 min-w-0">
            <button 
              onClick={() => onTabChange(currentRole === 'driver' ? 'validator' : currentRole === 'ticketing_agent' ? 'checkin' : currentRole === 'travel_creator' ? 'trips' : 'dashboard')} 
              className="flex items-center gap-2.5 text-left group focus:outline-none min-w-0"
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-[#000000] flex items-center justify-center text-white transition-transform group-hover:scale-105 shrink-0">
                <Compass className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-base sm:text-lg tracking-tight text-[#000000] truncate">
                    Tripcelona
                  </span>
                  <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono text-[#0052F2]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0052F2]" />
                    cloud live
                  </span>
                </div>
                <div className="hidden sm:flex items-center gap-1.5 text-xs text-[#697077]">
                  <span className="font-mono">tripcelona.com</span>
                  <span>/</span>
                  <span>{roleDef.title}</span>
                </div>
              </div>
            </button>
          </div>

          {/* ZONE 2: Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-1.5">
            {/* Admin or Creator sees Dashboard */}
            {(currentRole === 'admin' || currentRole === 'travel_creator') && (
              <button
                onClick={() => onTabChange('dashboard')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs lg:text-sm font-medium transition-all ${
                  activeTab === 'dashboard'
                    ? 'bg-[#0052F2] text-white shadow-xs'
                    : 'text-[#50565B] hover:text-[#000000] hover:bg-[#F2F4F8]'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard</span>
              </button>
            )}

            {/* Check-in Tab: visible to Admin, Agent, Creator */}
            {(currentRole === 'admin' || currentRole === 'ticketing_agent' || currentRole === 'travel_creator') && (
              <button
                onClick={() => onTabChange('checkin')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs lg:text-sm font-medium transition-all ${
                  activeTab === 'checkin'
                    ? 'bg-[#0052F2] text-white shadow-xs'
                    : 'text-[#50565B] hover:text-[#000000] hover:bg-[#F2F4F8]'
                }`}
              >
                <QrCode className="w-4 h-4" />
                <span>Pass Host</span>
              </button>
            )}

            {/* Driver Validator: visible to Driver and Admin */}
            {(currentRole === 'admin' || currentRole === 'driver') && (
              <button
                onClick={() => onTabChange('validator')}
                className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs lg:text-sm font-medium transition-all ${
                  activeTab === 'validator'
                    ? 'bg-[#0052F2] text-white shadow-xs'
                    : 'text-[#50565B] hover:text-[#000000] hover:bg-[#F2F4F8]'
                }`}
              >
                <ScanLine className="w-4 h-4" />
                <span>Driver Scanner</span>
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#6980FF] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#0052F2]"></span>
                </span>
              </button>
            )}

            {/* Travels Tab: visible to Admin and Travel Creator */}
            {(currentRole === 'admin' || currentRole === 'travel_creator') && (
              <button
                onClick={() => onTabChange('trips')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs lg:text-sm font-medium transition-all ${
                  activeTab === 'trips'
                    ? 'bg-[#0052F2] text-white shadow-xs'
                    : 'text-[#50565B] hover:text-[#000000] hover:bg-[#F2F4F8]'
                }`}
              >
                <Bus className="w-4 h-4" />
                <span>Travels &amp; Places</span>
              </button>
            )}

            {/* Public Client Booking Tab: accessible to everyone */}
            <button
              onClick={() => onTabChange('booking')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs lg:text-sm font-semibold transition-all ${
                activeTab === 'booking'
                  ? 'bg-[#0052F2] text-white shadow-xs'
                  : 'text-[#0052F2] hover:bg-[#0052F2]/10 bg-[#0052F2]/5 border border-[#0052F2]/20'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>Book Viaje</span>
            </button>

            {/* Stageshow Product Visuals Tab: accessible to everyone */}
            <button
              onClick={() => onTabChange('showcase')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs lg:text-sm font-medium transition-all ${
                activeTab === 'showcase'
                  ? 'bg-[#13171A] text-white shadow-xs'
                  : 'text-[#50565B] hover:text-[#000000] hover:bg-[#F2F4F8]'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-[#0052F2]" />
              <span>Visuals</span>
            </button>
          </nav>

          {/* ZONE 3: Right Action Tools (Role, Capacity, Host) */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Active Trip places counter (Desktop) */}
            {activeTrip && (
              <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#F2F4F8] border border-[#D5D9E0] text-xs">
                <Users className="w-3.5 h-3.5 text-[#697077]" />
                <span className="text-[#373D42] font-semibold font-mono">
                  {activeTrip.viajesNumber}
                </span>
                <span className="text-[#9FA5AD]">·</span>
                <span className={`font-mono font-bold tabular-nums ${isFull ? 'text-[#F23845]' : 'text-[#0052F2]'}`}>
                  {bookedCount}/{capacity}
                </span>
              </div>
            )}

            {/* Portal Links Modal Trigger */}
            <button
              onClick={onOpenPortalLinks}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold hover:bg-emerald-100 transition-colors"
              title="View and copy shareable links for each separate portal"
            >
              <Share2 className="w-3.5 h-3.5 text-emerald-700" />
              <span className="hidden sm:inline">Portal Links</span>
              <span className="sm:hidden">Links</span>
            </button>

            {/* Role Switcher Action */}
            <button
              onClick={onOpenAuthModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F2F4F8] border border-[#D5D9E0] text-xs hover:border-[#0052F2] transition-colors"
              title="Change active role or sign in"
            >
              <div className="w-2 h-2 rounded-full bg-[#0052F2]" />
              <span className="font-semibold text-[#000000] truncate max-w-[90px] sm:max-w-[120px]">
                {roleDef.title}
              </span>
              <span className="text-[10px] text-[#697077] hidden sm:inline">(Switch)</span>
            </button>

            {/* Vercel Guide */}
            <button
              onClick={onOpenVercelGuide}
              className="btn-secondary hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-[#50565B]"
              title="Vercel Hosting Instructions"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Host</span>
            </button>
          </div>
        </div>
      </div>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#D5D9E0] shadow-lg px-2 py-1.5 flex items-center justify-around">
        {(currentRole === 'admin' || currentRole === 'travel_creator') && (
          <button
            onClick={() => onTabChange('dashboard')}
            className={`flex-1 py-1.5 flex flex-col items-center justify-center text-[10px] font-medium transition-colors ${
              activeTab === 'dashboard' ? 'text-[#0052F2] font-semibold' : 'text-[#697077]'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 mb-0.5" />
            <span>Dashboard</span>
          </button>
        )}

        {(currentRole === 'admin' || currentRole === 'ticketing_agent' || currentRole === 'travel_creator') && (
          <button
            onClick={() => onTabChange('checkin')}
            className={`flex-1 py-1.5 flex flex-col items-center justify-center text-[10px] font-medium transition-colors ${
              activeTab === 'checkin' ? 'text-[#0052F2] font-semibold' : 'text-[#697077]'
            }`}
          >
            <QrCode className="w-4 h-4 mb-0.5" />
            <span>Pass Host</span>
          </button>
        )}

        {(currentRole === 'admin' || currentRole === 'driver') && (
          <button
            onClick={() => onTabChange('validator')}
            className={`flex-1 py-1.5 flex flex-col items-center justify-center text-[10px] font-medium transition-colors ${
              activeTab === 'validator' ? 'text-[#0052F2] font-semibold' : 'text-[#697077]'
            }`}
          >
            <ScanLine className="w-4 h-4 mb-0.5" />
            <span>Driver Scan</span>
          </button>
        )}

        {(currentRole === 'admin' || currentRole === 'travel_creator') && (
          <button
            onClick={() => onTabChange('trips')}
            className={`flex-1 py-1.5 flex flex-col items-center justify-center text-[10px] font-medium transition-colors ${
              activeTab === 'trips' ? 'text-[#0052F2] font-semibold' : 'text-[#697077]'
            }`}
          >
            <Bus className="w-4 h-4 mb-0.5" />
            <span>Travels</span>
          </button>
        )}

        <button
          onClick={() => onTabChange('booking')}
          className={`flex-1 py-1.5 flex flex-col items-center justify-center text-[10px] font-medium transition-colors ${
            activeTab === 'booking' ? 'text-[#0052F2] font-semibold' : 'text-[#697077]'
          }`}
        >
          <CreditCard className="w-4 h-4 mb-0.5 text-[#0052F2]" />
          <span>Book</span>
        </button>

        <button
          onClick={() => onTabChange('showcase')}
          className={`flex-1 py-1.5 flex flex-col items-center justify-center text-[10px] font-medium transition-colors ${
            activeTab === 'showcase' ? 'text-[#0052F2] font-semibold' : 'text-[#697077]'
          }`}
        >
          <div className="w-2 h-2 rounded-full bg-[#0052F2] mb-1" />
          <span>Visuals</span>
        </button>

        <button
          onClick={onOpenAuthModal}
          className="flex-1 py-1.5 flex flex-col items-center justify-center text-[10px] font-medium text-[#697077] hover:text-[#0052F2]"
        >
          <ShieldCheck className="w-4 h-4 mb-0.5 text-[#0052F2]" />
          <span>Role</span>
        </button>
      </div>
    </header>
  );
};
