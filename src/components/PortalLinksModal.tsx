import React, { useState } from 'react';
import { 
  X, 
  Copy, 
  Check, 
  ExternalLink, 
  ScanLine, 
  QrCode, 
  Bus, 
  LayoutDashboard, 
  CreditCard,
  Share2,
  ShieldCheck,
  Link as LinkIcon
} from 'lucide-react';

interface PortalLinksModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPortal: (portal: 'dashboard' | 'checkin' | 'validator' | 'trips' | 'booking') => void;
}

export const PortalLinksModal: React.FC<PortalLinksModalProps> = ({
  isOpen,
  onClose,
  onSelectPortal,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const baseUrl = typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : 'https://tripcelona.com';

  const portals = [
    {
      id: 'booking1',
      title: '1. Passenger Booking · Stripe Account 1',
      audience: 'Public Passengers & Clients',
      description: 'Direct booking route (/book/1). All seat reservations made through this link are charged to Stripe Account 1.',
      query: '/book/1',
      tabKey: 'booking' as const,
      icon: CreditCard,
      badgeColor: 'bg-blue-50 text-[#0052F2] border-blue-200',
      themeColor: '#0052F2',
    },
    {
      id: 'booking2',
      title: '2. Passenger Booking · Stripe Account 2',
      audience: 'Public Passengers & Clients',
      description: 'Direct booking route (/book/2). All seat reservations made through this link are charged to Stripe Account 2.',
      query: '/book/2',
      tabKey: 'booking' as const,
      icon: CreditCard,
      badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
      themeColor: '#7C3AED',
    },
    {
      id: 'driver',
      title: '2. Driver Boarding & Scanner Console',
      audience: 'Coach Drivers',
      description: 'Streamlined optical QR camera scanner for the bus driver. Scans boarding passes at the coach door, checks seat numbers, sounds audio chimes, and marks passengers as boarded.',
      query: '?portal=driver',
      tabKey: 'validator' as const,
      icon: ScanLine,
      badgeColor: 'bg-slate-100 text-slate-900 border-slate-300',
      themeColor: '#000000',
    },
    {
      id: 'agent',
      title: '3. Lady Host / Ticketing Agent Portal',
      audience: 'Ticketing Desk & Host Staff',
      description: 'Front-desk check-in interface. Generates boarding passes, collects passenger name, email, and WhatsApp, selects seats, and prints or sends passes instantly.',
      query: '?portal=agent',
      tabKey: 'checkin' as const,
      icon: QrCode,
      badgeColor: 'bg-blue-50 text-[#0052F2] border-blue-200',
      themeColor: '#0052F2',
    },
    {
      id: 'creator',
      title: '4. Travel Coordinator (Creator) Portal',
      audience: 'Operations & Fleet Managers',
      description: 'Management interface to create new scheduled travels, set departure origins and routes, customize places capacity (e.g. 55 places), and set ticket pricing.',
      query: '?portal=creator',
      tabKey: 'trips' as const,
      icon: Bus,
      badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
      themeColor: '#D97706',
    },
    {
      id: 'admin',
      title: '5. Executive Admin Dashboard',
      audience: 'Company Leadership & System Admins',
      description: 'Master control center. Tracks dual Stripe accounts revenue split (50/50 seat division), fleet occupancy rates, team role permissions, and full pass history.',
      query: '?portal=admin',
      tabKey: 'dashboard' as const,
      icon: LayoutDashboard,
      badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
      themeColor: '#7C3AED',
    },
  ];

  const handleCopy = (key: string, url: string) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2500);
    }).catch(console.error);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-[3%] sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in font-gellix">
      <div className="relative w-full max-w-[95%] sm:max-w-3xl bg-white border border-[#D5D9E0] rounded-2xl shadow-xl overflow-hidden max-h-[92vh] flex flex-col font-gellix">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#D5D9E0] bg-white sticky top-0 z-10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#0052F2]/10 border border-[#0052F2]/20 flex items-center justify-center text-[#0052F2]">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-[#000000]">
                Dedicated Role Portals &amp; Direct Links
              </h3>
              <p className="text-xs text-[#697077]">
                Share specific links directly with drivers, ticketing hosts, travel planners, or passengers
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-[#697077] hover:text-[#000000] rounded-lg hover:bg-[#F2F4F8] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          <div className="bg-[#F8F9FA] p-3.5 rounded-xl border border-[#D5D9E0] text-xs text-[#50565B] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#0052F2] shrink-0" />
            <span>
              Each link below opens the application in a focused, isolated workspace tailored specifically for that role.
            </span>
          </div>

          <div className="space-y-3">
            {portals.map((portal) => {
              const fullUrl = portal.query.startsWith('/')
                ? `${typeof window !== 'undefined' ? window.location.origin : 'https://tripcelona.com'}${portal.query}`
                : `${baseUrl}${portal.query}`;
              const isCopied = copiedKey === portal.id;
              const Icon = portal.icon;

              return (
                <div
                  key={portal.id}
                  className="p-4 rounded-xl border border-[#D5D9E0] bg-white hover:border-[#0052F2] transition-colors shadow-2xs space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[#F2F4F8] border border-[#D5D9E0] flex items-center justify-center text-[#000000] shrink-0">
                        <Icon className="w-4 h-4 text-[#0052F2]" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-[#000000]">
                          {portal.title}
                        </h4>
                        <div className="flex items-center gap-1.5 text-[11px] text-[#697077]">
                          <span>Audience:</span>
                          <strong className="text-[#373D42]">{portal.audience}</strong>
                        </div>
                      </div>
                    </div>

                    <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border self-start sm:self-auto ${portal.badgeColor}`}>
                      {portal.query}
                    </span>
                  </div>

                  <p className="text-xs text-[#50565B] leading-relaxed">
                    {portal.description}
                  </p>

                  {/* URL and Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-[#F2F4F8]">
                    <div className="flex items-center gap-1.5 min-w-0 bg-[#F2F4F8] px-2.5 py-1.5 rounded-lg border border-[#D5D9E0] flex-1">
                      <LinkIcon className="w-3.5 h-3.5 text-[#697077] shrink-0" />
                      <span className="font-mono text-[11px] text-[#000000] truncate">
                        {fullUrl}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleCopy(portal.id, fullUrl)}
                        className="btn-secondary px-3 py-1.5 text-xs flex items-center gap-1.5"
                        title="Copy direct shareable link"
                      >
                        {isCopied ? (
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
                        onClick={() => {
                          if (portal.query.startsWith('/')) {
                            window.location.href = portal.query;
                          } else {
                            onSelectPortal(portal.tabKey);
                            onClose();
                          }
                        }}
                        className="btn-primary px-3 py-1.5 text-xs flex items-center gap-1.5"
                      >
                        <span>Open Portal</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#D5D9E0] bg-[#F8F9FA] flex items-center justify-between text-xs text-[#697077] shrink-0">
          <span>All portal links are synchronized with live Cloud Firestore.</span>
          <button
            onClick={onClose}
            className="btn-secondary px-4 py-1.5 text-xs font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
