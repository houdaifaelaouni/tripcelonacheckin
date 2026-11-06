import React, { useState, useEffect } from 'react';
import { 
  getTrips, 
  getTickets, 
  saveTripsCache, 
  saveTicketsCache, 
  validateTicketPayloadOrId, 
  subscribeToDataChanges, 
  deleteTrip,
  saveStripeSettingsCache 
} from './utils/storage';
import { 
  auth, 
  testFirestoreConnection, 
  subscribeToTrips, 
  subscribeToTickets, 
  subscribeToUserProfile, 
  subscribeToAllUsers,
  subscribeToStripeSettings 
} from './lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { TravelTrip, Ticket, ValidationScanResult, UserRole, UserProfile, ROLE_DEFINITIONS } from './types';
import { Navbar } from './components/Navbar';
import { AdminDashboard } from './components/AdminDashboard';
import { CheckInForm } from './components/CheckInForm';
import { TicketPass } from './components/TicketPass';
import { ValidationPortal } from './components/ValidationPortal';
import { TripsList } from './components/TripsList';
import { TravelModal } from './components/TravelModal';
import { VercelGuide } from './components/VercelGuide';
import { AuthModal } from './components/AuthModal';
import { StageshowVisuals } from './components/StageshowVisuals';
import { ClientLandingPage } from './components/ClientLandingPage';
import { StripeSuccessPage } from './components/StripeSuccessPage';
import { PortalLinksModal } from './components/PortalLinksModal';
import { sounds } from './utils/audio';
import { X, CloudCheck, ShieldCheck, Bus, Plus, Link as LinkIcon, Copy, Check, Share2, ExternalLink } from 'lucide-react';

export default function App() {
  const [trips, setTrips] = useState<TravelTrip[]>(() => getTrips());
  const [activeTrip, setActiveTrip] = useState<TravelTrip | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>(() => getTickets());
  const [teamUsers, setTeamUsers] = useState<UserProfile[]>([]);

  // Roles and Auth
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [currentRole, setCurrentRole] = useState<UserRole>('admin');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'checkin' | 'validator' | 'trips' | 'showcase' | 'booking'>('dashboard');
  const [bookingAccount, setBookingAccount] = useState<1 | 2>(1);
  const [isSuccessView, setIsSuccessView] = useState(false);

  // Generated or inspected ticket
  const [currentTicket, setCurrentTicket] = useState<Ticket | null>(null);
  const [viewingTicketModal, setViewingTicketModal] = useState<Ticket | null>(null);

  // Scan result
  const [lastScanResult, setLastScanResult] = useState<ValidationScanResult | null>(null);

  // Modals
  const [isVercelGuideOpen, setIsVercelGuideOpen] = useState(false);
  const [isNewTripModalOpen, setIsNewTripModalOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState<TravelTrip | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isPortalLinksOpen, setIsPortalLinksOpen] = useState(false);
  const [isCloudConnected, setIsCloudConnected] = useState(false);
  const [copiedCurrentLink, setCopiedCurrentLink] = useState(false);

  const resolveCurrentRoute = () => {
    if (typeof window === 'undefined') return;
    const pathname = window.location.pathname;
    const urlParams = new URLSearchParams(window.location.search);
    const hash = window.location.hash;
    const portal = urlParams.get('portal') || urlParams.get('mode');

    // Check for success pages: /book/1/success or /book/2/success
    if (pathname.includes('/book/1/success')) {
      setBookingAccount(1);
      setIsSuccessView(true);
      setActiveTab('booking');
      return;
    }
    if (pathname.includes('/book/2/success')) {
      setBookingAccount(2);
      setIsSuccessView(true);
      setActiveTab('booking');
      return;
    }

    // Check for direct booking paths: /book/1 or /book/2
    if (pathname.startsWith('/book/1')) {
      setBookingAccount(1);
      setIsSuccessView(false);
      setActiveTab('booking');
      return;
    }
    if (pathname.startsWith('/book/2')) {
      setBookingAccount(2);
      setIsSuccessView(false);
      setActiveTab('booking');
      return;
    }
    if (pathname.startsWith('/book')) {
      setBookingAccount(urlParams.get('account') === '2' ? 2 : 1);
      setIsSuccessView(false);
      setActiveTab('booking');
      return;
    }

    setIsSuccessView(false);

    if (portal === 'driver' || portal === 'validator' || hash.includes('validator') || hash.includes('driver')) {
      setCurrentRole('driver');
      setActiveTab('validator');
    } else if (portal === 'agent' || portal === 'ticketing_agent' || hash.includes('agent')) {
      setCurrentRole('ticketing_agent');
      setActiveTab('checkin');
    } else if (portal === 'creator' || portal === 'travel_creator' || hash.includes('creator')) {
      setCurrentRole('travel_creator');
      setActiveTab('trips');
    } else if (portal === 'booking' || portal === 'book' || portal === 'client' || hash.includes('book') || hash.includes('client')) {
      setBookingAccount(urlParams.get('account') === '2' ? 2 : 1);
      setActiveTab('booking');
    } else if (portal === 'visuals' || portal === 'showcase' || hash.includes('showcase')) {
      setActiveTab('showcase');
    } else if (portal === 'admin' || portal === 'dashboard') {
      setCurrentRole('admin');
      setActiveTab('dashboard');
    }
  };

  // Helper to synchronize portal query in URL without full page reload
  const syncUrlToPortal = (tab: 'dashboard' | 'checkin' | 'validator' | 'trips' | 'showcase' | 'booking') => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (tab === 'booking') {
      url.pathname = `/book/${bookingAccount}`;
      url.searchParams.delete('portal');
      url.searchParams.delete('mode');
      window.history.replaceState({ portal: 'booking' }, '', url.toString());
      return;
    }

    let portalKey = 'admin';
    if (tab === 'validator') portalKey = 'driver';
    else if (tab === 'checkin') portalKey = 'agent';
    else if (tab === 'trips') portalKey = 'creator';
    else if (tab === 'showcase') portalKey = 'visuals';
    url.pathname = '/';
    url.searchParams.set('portal', portalKey);
    url.searchParams.delete('mode');
    window.history.replaceState({ portal: portalKey }, '', url.toString());
  };

  const handleTabChange = (tab: 'dashboard' | 'checkin' | 'validator' | 'trips' | 'showcase' | 'booking') => {
    setActiveTab(tab);
    if (tab !== 'checkin') {
      setCurrentTicket(null);
    }
    if (tab !== 'booking') {
      setIsSuccessView(false);
    }
    syncUrlToPortal(tab);
  };

  // Initial cloud sync & connection test
  useEffect(() => {
    testFirestoreConnection().then(connected => {
      setIsCloudConnected(connected);
    });

    resolveCurrentRoute();

    const handlePopState = () => {
      resolveCurrentRoute();
    };
    window.addEventListener('popstate', handlePopState);

    const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
    const validateParam = urlParams.get('validate');
    if (validateParam) {
      setCurrentRole('driver');
      setActiveTab('validator');
      const result = validateTicketPayloadOrId(validateParam);
      setLastScanResult(result);
      if (result.success) {
        sounds.playSuccess();
      } else if (result.statusType === 'already_checked_in') {
        sounds.playWarning();
      } else {
        sounds.playError();
      }
    }

    // Subscribe to Firestore Cloud Trips
    const unsubscribeTrips = subscribeToTrips((cloudTrips) => {
      setTrips(cloudTrips);
      saveTripsCache(cloudTrips);
      setIsCloudConnected(true);

      setActiveTrip(prev => {
        if (!prev && cloudTrips.length > 0) return cloudTrips[0];
        if (prev) {
          const match = cloudTrips.find(t => t.id === prev.id);
          return match || cloudTrips[0] || null;
        }
        return null;
      });
    });

    // Subscribe to Firestore Cloud Tickets
    const unsubscribeTickets = subscribeToTickets((cloudTickets) => {
      setTickets(cloudTickets);
      saveTicketsCache(cloudTickets);
    });

    // Subscribe to Team Members (if admin or staff)
    const unsubscribeUsers = subscribeToAllUsers((users) => {
      setTeamUsers(users);
    });

    // Subscribe to System Stripe Settings (dual accounts real-time sync)
    const unsubscribeStripe = subscribeToStripeSettings((cloudSettings) => {
      if (cloudSettings) {
        saveStripeSettingsCache(cloudSettings);
      }
    });

    // Subscribe to Firebase Auth state
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      if (user) {
        subscribeToUserProfile(user.uid, (profile) => {
          if (profile) {
            setUserProfile(profile);
            setCurrentRole(profile.role);
          }
        });
      } else {
        setUserProfile(null);
      }
    });

    // Local multi-tab fallback listener
    const unsubscribeLocal = subscribeToDataChanges(() => {
      setTrips(getTrips());
      setTickets(getTickets());
    });

    return () => {
      window.removeEventListener('popstate', handlePopState);
      unsubscribeTrips();
      unsubscribeTickets();
      unsubscribeUsers();
      unsubscribeStripe();
      unsubscribeAuth();
      unsubscribeLocal();
    };
  }, []);

  // Sync active trip when trips change
  useEffect(() => {
    if (!activeTrip && trips.length > 0) {
      setActiveTrip(trips[0]);
    }
  }, [trips, activeTrip]);

  // Handle new scan in validator
  const handleScanCode = (code: string) => {
    const result = validateTicketPayloadOrId(code);
    setLastScanResult(result);

    if (result.success) {
      sounds.playSuccess();
    } else if (result.statusType === 'already_checked_in') {
      sounds.playWarning();
    } else {
      sounds.playError();
    }
  };

  const handleRoleSelect = (role: UserRole) => {
    setCurrentRole(role);
    if (role === 'driver') {
      handleTabChange('validator');
    } else if (role === 'ticketing_agent') {
      handleTabChange('checkin');
    } else if (role === 'travel_creator') {
      handleTabChange('trips');
    } else {
      handleTabChange('dashboard');
    }
  };

  const handleEditTrip = (trip: TravelTrip) => {
    setEditingTrip(trip);
    setIsNewTripModalOpen(true);
  };

  const handleDeleteTrip = async (tripId: string) => {
    await deleteTrip(tripId);
  };

  const activeTripBookedCount = activeTrip
    ? tickets.filter(t => t.tripId === activeTrip.id && t.status !== 'cancelled').length
    : 0;

  // Active portal metadata for top banner
  const currentPortalMeta = {
    dashboard: { name: 'Executive Admin Dashboard', linkParam: '?portal=admin', roleTag: 'Admin Only' },
    checkin: { name: 'Lady Host / Ticketing Agent Check-in', linkParam: '?portal=agent', roleTag: 'Ticketing Host' },
    validator: { name: 'Driver Boarding & QR Scanner Console', linkParam: '?portal=driver', roleTag: 'Driver Console' },
    trips: { name: 'Travel & Fleet Places Manager', linkParam: '?portal=creator', roleTag: 'Coordinator' },
    booking: { 
      name: isSuccessView ? `Booking Confirmation · Stripe Account ${bookingAccount}` : `Passenger Booking · Stripe Account ${bookingAccount}`, 
      linkParam: `/book/${bookingAccount}`, 
      roleTag: `Stripe Gateway ${bookingAccount}` 
    },
    showcase: { name: 'Stageshow Product Visuals & Mockups', linkParam: '?portal=visuals', roleTag: 'Showcase' },
  }[activeTab];

  const handleCopyCurrentPortalUrl = () => {
    if (typeof window === 'undefined') return;
    const url = currentPortalMeta.linkParam.startsWith('/')
      ? `${window.location.origin}${currentPortalMeta.linkParam}`
      : `${window.location.origin}${window.location.pathname}${currentPortalMeta.linkParam}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedCurrentLink(true);
      setTimeout(() => setCopiedCurrentLink(false), 2000);
    });
  };

  return (
    <div className="min-h-screen bg-[#F2F4F8] text-[#000000] flex flex-col font-gellix selection:bg-[#0052F2] selection:text-white pb-16 md:pb-0">
      {/* Top Navbar with Role Information */}
      <Navbar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onOpenVercelGuide={() => setIsVercelGuideOpen(true)}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onOpenPortalLinks={() => setIsPortalLinksOpen(true)}
        activeTrip={activeTrip}
        bookedCount={activeTripBookedCount}
        currentUser={userProfile}
        currentRole={currentRole}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-[3%] sm:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        {/* Dedicated Portal Banner with 1-Click Copy and Switcher */}
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 rounded-xl bg-white border border-[#D5D9E0] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-gellix">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#0052F2]/10 border border-[#0052F2]/20 flex items-center justify-center text-[#0052F2] shrink-0">
              <Share2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-xs sm:text-sm text-[#000000] truncate">
                  {currentPortalMeta.name}
                </h2>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-[#F2F4F8] text-[#0052F2] border border-[#D5D9E0] shrink-0">
                  {currentPortalMeta.roleTag}
                </span>
              </div>
              <div className="text-[11px] text-[#697077] truncate flex items-center gap-1.5 mt-0.5">
                <span>Specific Direct Link:</span>
                <code className="font-mono text-[#0052F2] bg-[#EBF3FF] px-1.5 py-0.2 rounded font-semibold">
                  {currentPortalMeta.linkParam}
                </code>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <button
              onClick={handleCopyCurrentPortalUrl}
              className="btn-secondary px-3 py-1.5 text-xs flex items-center gap-1.5 min-h-[34px]"
              title="Copy specific link for this portal"
            >
              {copiedCurrentLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#0052F2]" />
                  <span className="text-[#0052F2] font-semibold">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-[#50565B]" />
                  <span>Copy Link</span>
                </>
              )}
            </button>

            <button
              onClick={() => setIsPortalLinksOpen(true)}
              className="btn-primary px-3 py-1.5 text-xs flex items-center gap-1.5 min-h-[34px]"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>All 5 Portals</span>
            </button>
          </div>
        </div>

        {/* ADMIN DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
          <AdminDashboard
            trips={trips}
            tickets={tickets}
            teamUsers={teamUsers}
            activeTrip={activeTrip}
            onSelectTrip={(t) => setActiveTrip(t)}
            onOpenCreateTrip={() => {
              setEditingTrip(null);
              setIsNewTripModalOpen(true);
            }}
            onEditTrip={handleEditTrip}
            onDeleteTrip={handleDeleteTrip}
            onGoToCheckIn={() => setActiveTab('checkin')}
            onGoToValidator={() => setActiveTab('validator')}
            onGoToShowcase={() => setActiveTab('showcase')}
            onViewTicket={(ticket) => setViewingTicketModal(ticket)}
            onSwitchRole={handleRoleSelect}
          />
        )}

        {/* STAGESHOW PRODUCT VISUALS & LIVE MOCKUP TAB */}
        {activeTab === 'showcase' && (
          <div className="w-full">
            <StageshowVisuals
              onGoToCheckIn={() => setActiveTab('checkin')}
              onGoToValidator={() => setActiveTab('validator')}
              onGoToDashboard={() => setActiveTab('dashboard')}
              onOpenCreateTrip={() => {
                setEditingTrip(null);
                setIsNewTripModalOpen(true);
              }}
              activeTrip={activeTrip}
            />
          </div>
        )}

        {/* CHECK-IN TAB (Ticketing Host Pass Generator) */}
        {activeTab === 'checkin' && (
          <div className="w-full">
            {currentTicket ? (
              <TicketPass
                ticket={currentTicket}
                trip={trips.find(t => t.id === currentTicket.tripId) || activeTrip!}
                onNewCheckIn={() => setCurrentTicket(null)}
                onGoToValidator={() => {
                  setActiveTab('validator');
                  setCurrentTicket(null);
                }}
              />
            ) : (
              <CheckInForm
                trips={trips}
                activeTrip={activeTrip}
                onSelectTrip={(trip) => setActiveTrip(trip)}
                onOpenNewTripModal={() => {
                  setEditingTrip(null);
                  setIsNewTripModalOpen(true);
                }}
                onTicketGenerated={(ticket) => setCurrentTicket(ticket)}
                bookedCount={activeTripBookedCount}
              />
            )}
          </div>
        )}

        {/* DRIVER VALIDATOR TAB */}
        {activeTab === 'validator' && (
          <div className="w-full">
            {activeTrip ? (
              <ValidationPortal
                activeTrip={activeTrip}
                trips={trips}
                onSelectTrip={(trip) => setActiveTrip(trip)}
                tickets={tickets}
                onScanResult={(res) => {
                  if (typeof res === 'string') {
                    handleScanCode(res);
                  } else {
                    setLastScanResult(res);
                  }
                }}
                lastResult={lastScanResult}
                onClearResult={() => setLastScanResult(null)}
                onViewTicket={(ticket) => setViewingTicketModal(ticket)}
              />
            ) : (
              <div className="bg-white border border-[#D5D9E0] rounded-2xl p-8 text-center space-y-3">
                <Bus className="w-8 h-8 text-[#0052F2] mx-auto" />
                <h3 className="font-semibold text-[#000000]">No Active Travels Scheduled</h3>
                <p className="text-xs text-[#697077]">
                  Create a travel to begin driver boarding validation.
                </p>
                <button
                  onClick={() => {
                    setEditingTrip(null);
                    setIsNewTripModalOpen(true);
                  }}
                  className="btn-primary px-4 py-2 text-xs font-semibold inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Create Travel
                </button>
              </div>
            )}
          </div>
        )}

        {/* TRAVELS & PLACES MANAGEMENT TAB */}
        {activeTab === 'trips' && (
          <div className="w-full">
            <TripsList
              trips={trips}
              activeTrip={activeTrip}
              onSelectTrip={(trip) => {
                setActiveTrip(trip);
                setActiveTab('checkin');
              }}
              onOpenNewTripModal={() => {
                setEditingTrip(null);
                setIsNewTripModalOpen(true);
              }}
              onEditTrip={handleEditTrip}
              onDeleteTrip={handleDeleteTrip}
              tickets={tickets}
              onGoToCheckIn={() => setActiveTab('checkin')}
              onGoToValidator={() => setActiveTab('validator')}
            />
          </div>
        )}

        {/* CLIENT PASSENGER BOOKING LANDING PAGE TAB */}
        {activeTab === 'booking' && (
          <div className="w-full">
            {isSuccessView ? (
              <StripeSuccessPage
                account={bookingAccount}
                onGoBackToBooking={() => {
                  setIsSuccessView(false);
                  window.history.pushState({}, '', `/book/${bookingAccount}`);
                }}
              />
            ) : (
              <ClientLandingPage
                trips={trips}
                tickets={tickets}
                account={bookingAccount}
                onSwitchAccount={(acc) => {
                  setBookingAccount(acc);
                  setIsSuccessView(false);
                  window.history.pushState({}, '', `/book/${acc}`);
                }}
                onOpenTripPass={(ticket) => setViewingTicketModal(ticket)}
                onGoToStaffLogin={() => setIsAuthModalOpen(true)}
              />
            )}
          </div>
        )}
      </main>

      {/* Quick view digital pass modal */}
      {viewingTicketModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-[3%] sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in font-gellix">
          <div className="relative w-full max-w-[94%] sm:max-w-2xl bg-white border border-[#D5D9E0] rounded-2xl p-4 sm:p-6 shadow-xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm sm:text-base text-[#000000]">Passenger Digital Pass</h3>
              <button
                onClick={() => setViewingTicketModal(null)}
                className="p-1.5 text-[#697077] hover:text-[#000000] rounded-lg hover:bg-[#F2F4F8] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <TicketPass
              ticket={viewingTicketModal}
              trip={trips.find(t => t.id === viewingTicketModal.tripId) || activeTrip!}
              onNewCheckIn={() => setViewingTicketModal(null)}
              onGoToValidator={() => {
                setViewingTicketModal(null);
                setActiveTab('validator');
              }}
            />
          </div>
        </div>
      )}

      {/* Create / Edit Travel Modal (Customizable Places) */}
      <TravelModal
        isOpen={isNewTripModalOpen}
        onClose={() => {
          setIsNewTripModalOpen(false);
          setEditingTrip(null);
        }}
        editingTrip={editingTrip}
        onTripCreated={(trip) => {
          setActiveTrip(trip);
          setEditingTrip(null);
        }}
      />

      {/* Role Sign-up & Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={userProfile}
        onSelectRole={handleRoleSelect}
      />

      {/* Vercel Hosting Guide Modal */}
      <VercelGuide
        isOpen={isVercelGuideOpen}
        onClose={() => setIsVercelGuideOpen(false)}
      />

      {/* Dedicated Portal Links & Specific Links Modal */}
      <PortalLinksModal
        isOpen={isPortalLinksOpen}
        onClose={() => setIsPortalLinksOpen(false)}
        onSelectPortal={handleTabChange}
      />

      {/* Footer */}
      <footer className="border-t border-[#D5D9E0] bg-white py-4 sm:py-6 text-xs text-[#697077] text-center hidden md:block font-gellix">
        <div className="w-full max-w-7xl mx-auto px-[4%] sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-3">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-center">
            <span className="font-semibold text-[#000000]">Tripcelona</span>
            <span>•</span>
            <span className="text-[#0052F2]">tripcelona.com</span>
            <span>•</span>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0052F2]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0052F2]"></span>
              Cloud Database Active
            </span>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => setActiveTab('booking')}
              className="text-[#0052F2] hover:underline font-semibold"
            >
              Client Booking Portal
            </button>
            <span>•</span>
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="text-[#0052F2] hover:underline font-medium"
            >
              Role: {ROLE_DEFINITIONS[currentRole]?.title}
            </button>
            <span>•</span>
            <button
              onClick={() => setIsVercelGuideOpen(true)}
              className="text-[#0052F2] hover:underline font-medium"
            >
              Vercel Guide
            </button>
            <span>•</span>
            <a
              href="?mode=driver"
              onClick={(e) => {
                e.preventDefault();
                handleRoleSelect('driver');
              }}
              className="text-[#0052F2] hover:underline font-medium"
            >
              Driver Scanner Link
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
