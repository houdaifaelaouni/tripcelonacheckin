import React, { useState, useEffect } from 'react';
import { 
  Bus, 
  QrCode, 
  ScanLine, 
  ShieldCheck, 
  CheckCircle2, 
  ArrowRight, 
  Smartphone, 
  Laptop, 
  Sparkles, 
  Users, 
  Armchair, 
  Layers, 
  Check, 
  Play, 
  Pause, 
  RotateCcw,
  CloudCheck,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { TravelTrip } from '../types';

interface StageshowVisualsProps {
  onGoToCheckIn?: () => void;
  onGoToValidator?: () => void;
  onGoToDashboard?: () => void;
  onOpenCreateTrip?: () => void;
  activeTrip?: TravelTrip | null;
}

export const StageshowVisuals: React.FC<StageshowVisualsProps> = ({
  onGoToCheckIn,
  onGoToValidator,
  onGoToDashboard,
  onOpenCreateTrip,
  activeTrip
}) => {
  // Demonstration Step: 0 = Pick Seat, 1 = Generate Pass, 2 = Driver Scanner
  const [activeStep, setActiveStep] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [selectedDemoSeat, setSelectedDemoSeat] = useState<number>(14);

  // Auto-cycle through the 3 actions in the looping demo
  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setActiveStep(prev => (prev + 1) % 3);
    }, 3800);
    return () => clearInterval(timer);
  }, [isPlaying]);

  return (
    <div className="w-full space-y-8 font-gellix animate-fade-in text-[#000000]">
      {/* 1. STAGESHOW HERO PRODUCT VISUAL (Laptop & Phone Mockup with Simulated Flow) */}
      <div className="relative bg-[#0D1117] text-white rounded-3xl p-6 sm:p-8 lg:p-10 border border-[#242A2E] shadow-2xl overflow-hidden">
        {/* Subtle grid background */}
        <div className="absolute inset-0 bg-[radial-gradient(#1E2630_1px,transparent_1px)] [background-size:20px_20px] opacity-40 pointer-events-none" />
        
        {/* Ambient Top Glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-48 bg-[#0052F2]/20 blur-3xl pointer-events-none" />

        <div className="relative z-10">
          {/* Header & Meta */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#242A2E] pb-6 mb-8">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#6980FF] mb-1.5">
                <span>The Stageshow Suite</span>
                <span>/</span>
                <span>Anti-AI Slop Architecture</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white text-balance">
                Real-time Catalan Transit Operations in One Cohesive Flow
              </h2>
              <p className="text-sm text-[#9FA5AD] mt-1.5 max-w-2xl leading-relaxed">
                Watch how Tripcelona coordinates travel seat allocation, luxury printable passes, and instant optical conductor validation.
              </p>
            </div>

            {/* Play / Pause / Step Switcher Controls */}
            <div className="flex items-center gap-2 shrink-0 self-start md:self-auto">
              <div className="flex items-center bg-[#161B22] border border-[#30363D] rounded-xl p-1">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-white hover:bg-[#21262D] transition-colors flex items-center gap-1.5"
                  title={isPlaying ? 'Pause looping demo' : 'Resume looping demo'}
                >
                  {isPlaying ? (
                    <>
                      <Pause className="w-3.5 h-3.5 text-[#6980FF]" />
                      <span>Pause</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 text-[#0052F2]" />
                      <span>Play Loop</span>
                    </>
                  )}
                </button>
                <div className="w-px h-4 bg-[#30363D] mx-1" />
                <button
                  onClick={() => setActiveStep(0)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    activeStep === 0 ? 'bg-[#0052F2] text-white' : 'text-[#868D95] hover:text-white'
                  }`}
                >
                  1. Seats
                </button>
                <button
                  onClick={() => setActiveStep(1)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    activeStep === 1 ? 'bg-[#0052F2] text-white' : 'text-[#868D95] hover:text-white'
                  }`}
                >
                  2. Pass
                </button>
                <button
                  onClick={() => setActiveStep(2)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    activeStep === 2 ? 'bg-[#0052F2] text-white' : 'text-[#868D95] hover:text-white'
                  }`}
                >
                  3. Scan
                </button>
              </div>
            </div>
          </div>

          {/* MAIN MOCKUP STAGE: Dual Screen Viewport (Desktop Terminal + Conductor Smartphone) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Primary Desktop / Laptop Viewport (7 Cols) */}
            <div className="lg:col-span-7 bg-[#161B22] border border-[#30363D] rounded-2xl p-4 sm:p-5 shadow-2xl relative overflow-hidden">
              {/* Window Bar */}
              <div className="flex items-center justify-between pb-3.5 border-b border-[#30363D] mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#F23845]" />
                  <div className="w-3 h-3 rounded-full bg-[#FFB020]" />
                  <div className="w-3 h-3 rounded-full bg-[#00D668]" />
                  <span className="ml-2 font-mono text-[11px] text-[#868D95]">
                    tripcelona.com/host/checkin
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#00D668]">
                  <span className="w-2 h-2 rounded-full bg-[#00D668] animate-pulse" />
                  <span>Cloud Live</span>
                </div>
              </div>

              {/* Step 1 Visual: Dynamic Coach Seat Picker */}
              {activeStep === 0 && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[11px] font-mono text-[#6980FF] uppercase tracking-wider">
                        Action 01 · Ticketing Host
                      </div>
                      <h4 className="text-base font-semibold text-white">Select Coach Seat</h4>
                    </div>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#21262D] text-[#868D95] border border-[#30363D]">
                      55 Places Capacity
                    </span>
                  </div>

                  {/* Simulated Seat Grid */}
                  <div className="bg-[#0D1117] border border-[#30363D] rounded-xl p-4">
                    <div className="flex items-center justify-between text-xs text-[#868D95] pb-2 border-b border-[#21262D] mb-3">
                      <span>Front Windshield (Driver)</span>
                      <span className="text-[#0052F2] font-semibold">VIAJE-01</span>
                    </div>

                    <div className="grid grid-cols-4 gap-2 text-center text-xs font-mono">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16].map((seat) => {
                        const isSelected = seat === selectedDemoSeat;
                        const isOccupied = [1, 2, 5, 6, 9].includes(seat);

                        return (
                          <button
                            key={seat}
                            onClick={() => setSelectedDemoSeat(seat)}
                            disabled={isOccupied}
                            className={`py-2 rounded-lg font-bold transition-all relative ${
                              isSelected
                                ? 'bg-[#0052F2] text-white ring-2 ring-[#4083FF] scale-105 shadow-lg'
                                : isOccupied
                                ? 'bg-[#21262D] text-[#50565B] cursor-not-allowed'
                                : 'bg-[#161B22] text-[#D5D9E0] hover:bg-[#30363D] border border-[#30363D]'
                            }`}
                          >
                            #{seat}
                            {isSelected && (
                              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#00D668] ring-2 ring-[#0D1117]" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-[#868D95] mt-3 pt-2 border-t border-[#21262D]">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded bg-[#0052F2]" />
                        <span>Selected (Seat #{selectedDemoSeat})</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded bg-[#21262D]" />
                        <span>Occupied</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded bg-[#161B22] border border-[#30363D]" />
                        <span>Available</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="text-xs text-[#9FA5AD]">
                      Passenger: <span className="text-white font-medium">Marc Soler</span> · Destination:{' '}
                      <span className="text-white font-medium">Costa Brava Express</span>
                    </div>
                    <button
                      onClick={() => setActiveStep(1)}
                      className="px-3.5 py-1.5 rounded-lg bg-[#0052F2] hover:bg-[#0040C1] text-xs font-semibold text-white flex items-center gap-1.5 transition-colors"
                    >
                      Issue Pass <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2 Visual: Instant High-Speed Boarding Pass */}
              {activeStep === 1 && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[11px] font-mono text-[#6980FF] uppercase tracking-wider">
                        Action 02 · Pass Render
                      </div>
                      <h4 className="text-base font-semibold text-white">Instant Boarding Pass</h4>
                    </div>
                    <span className="text-xs font-mono text-[#00D668] bg-[#00D668]/10 px-2 py-0.5 rounded border border-[#00D668]/20">
                      Print-Ready 300DPI
                    </span>
                  </div>

                  {/* Simulated Pass Component */}
                  <div className="bg-white text-black rounded-xl p-4 shadow-xl border border-[#D5D9E0]">
                    <div className="flex items-center justify-between border-b border-[#D5D9E0] pb-3 mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded bg-[#000000] text-white flex items-center justify-center font-bold text-xs">
                          TC
                        </div>
                        <div>
                          <div className="font-bold text-sm tracking-tight">Tripcelona Boarding Pass</div>
                          <div className="text-[10px] text-[#697077] font-mono">tripcelona.com · VIAJE-01</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-[#697077] font-mono uppercase">Assigned Seat</div>
                        <div className="text-lg font-bold font-mono text-[#0052F2]">#{selectedDemoSeat}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-xs mb-3">
                      <div>
                        <div className="text-[10px] text-[#697077] uppercase font-semibold">Passenger</div>
                        <div className="font-bold text-[#000000]">Marc Soler</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-[#697077] uppercase font-semibold">Route</div>
                        <div className="font-bold text-[#000000]">Barcelona ➔ Costa Brava</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-[#697077] uppercase font-semibold">Pass Code</div>
                        <div className="font-mono font-semibold text-[#0052F2]">VIAJE01-014</div>
                      </div>
                    </div>

                    {/* Barcode & QR mock */}
                    <div className="flex items-center justify-between pt-2 border-t border-dashed border-[#D5D9E0]">
                      <div className="space-y-1">
                        <div className="text-[9px] font-mono text-[#697077]">OFFLINE VERIFIABLE TOKEN</div>
                        <div className="h-6 flex items-center gap-0.5">
                          {[3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5, 8, 9, 7, 9, 3, 2, 3, 8, 4, 6].map((w, i) => (
                            <span 
                              key={i} 
                              className="bg-black inline-block h-full" 
                              style={{ width: `${(w % 3) + 1.5}px` }} 
                            />
                          ))}
                        </div>
                      </div>
                      <div className="w-10 h-10 rounded border border-black bg-black p-0.5 flex items-center justify-center">
                        <QrCode className="w-full h-full text-white" />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-[#9FA5AD]">
                      Ready for printing or mobile Apple/Google Wallet
                    </span>
                    <button
                      onClick={() => setActiveStep(2)}
                      className="px-3.5 py-1.5 rounded-lg bg-[#0052F2] hover:bg-[#0040C1] text-xs font-semibold text-white flex items-center gap-1.5 transition-colors"
                    >
                      Driver Scan <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3 Visual: Real-time Conductor Scan Result */}
              {activeStep === 2 && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[11px] font-mono text-[#00D668] uppercase tracking-wider">
                        Action 03 · Verification Complete
                      </div>
                      <h4 className="text-base font-semibold text-white">Boarding Confirmed</h4>
                    </div>
                    <span className="text-xs font-mono text-[#00D668] bg-[#00D668]/15 px-2.5 py-1 rounded-md border border-[#00D668]/30 flex items-center gap-1 font-semibold">
                      <Check className="w-3.5 h-3.5" /> PASS VALIDATED
                    </span>
                  </div>

                  <div className="bg-[#0D1117] border border-[#00D668]/40 rounded-xl p-4 relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-[#00D668]" />

                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-[#00D668]/10 border border-[#00D668]/30 flex items-center justify-center text-[#00D668]">
                        <CheckCircle2 className="w-7 h-7" />
                      </div>
                      <div>
                        <div className="text-lg font-bold text-white">Marc Soler</div>
                        <div className="text-xs text-[#9FA5AD] font-mono">
                          Seat #{selectedDemoSeat} · Destination: Costa Brava Express
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-[#21262D] text-xs font-mono">
                      <div>
                        <span className="text-[#868D95]">Status:</span>{' '}
                        <span className="text-[#00D668] font-semibold">Checked-In Just Now</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[#868D95]">Manifest:</span>{' '}
                        <span className="text-white font-semibold">1 / 55 Places</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-[#868D95]">
                      Prevents duplicate boarding passes automatically
                    </span>
                    <button
                      onClick={() => setActiveStep(0)}
                      className="px-3.5 py-1.5 rounded-lg bg-[#21262D] hover:bg-[#30363D] text-xs font-semibold text-white flex items-center gap-1.5 transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Restart Demo
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Secondary Conductor Smartphone Mockup (5 Cols) */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="w-full max-w-[280px] bg-[#000000] border-4 border-[#30363D] rounded-[36px] p-3 shadow-2xl relative">
                {/* Phone Speaker Notch */}
                <div className="w-24 h-4 bg-[#161B22] rounded-full mx-auto mb-3 flex items-center justify-center">
                  <div className="w-8 h-1 bg-[#30363D] rounded-full" />
                </div>

                {/* Phone Screen */}
                <div className="bg-[#0D1117] rounded-[24px] p-3 border border-[#21262D] space-y-3">
                  {/* Status Bar */}
                  <div className="flex items-center justify-between text-[10px] text-[#868D95] font-mono px-1">
                    <span>09:41</span>
                    <span className="text-[#00D668]">5G · 100%</span>
                  </div>

                  {/* App Header */}
                  <div className="flex items-center justify-between border-b border-[#21262D] pb-2">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded bg-[#0052F2] flex items-center justify-center text-white text-[10px] font-bold">
                        TC
                      </div>
                      <span className="font-bold text-xs text-white">Driver Portal</span>
                    </div>
                    <span className="text-[9px] font-mono text-[#6980FF]">VIAJE-01</span>
                  </div>

                  {/* Viewfinder Camera Simulation */}
                  <div className="relative aspect-4/3 bg-[#000000] rounded-xl border border-[#30363D] overflow-hidden flex flex-col items-center justify-center p-2">
                    {/* Viewfinder Corner Reticles */}
                    <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-[#0052F2]" />
                    <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-[#0052F2]" />
                    <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-[#0052F2]" />
                    <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-[#0052F2]" />

                    {/* Animated Laser Scanning Line */}
                    <div className="absolute inset-x-2 h-0.5 bg-[#0052F2] shadow-[0_0_8px_#0052F2] animate-bounce" />

                    <QrCode className="w-14 h-14 text-white/40" />
                    <span className="text-[9px] text-[#868D95] font-mono mt-1">Optical Scanner Active</span>
                  </div>

                  {/* Instant Verification Toast */}
                  <div className={`p-2.5 rounded-xl border transition-all ${
                    activeStep === 2 
                      ? 'bg-[#00D668]/15 border-[#00D668] text-white' 
                      : 'bg-[#161B22] border-[#30363D] text-[#868D95]'
                  }`}>
                    <div className="flex items-center justify-between text-[11px] font-semibold">
                      <span>{activeStep === 2 ? 'Seat #14 Confirmed' : 'Ready for Next Pass'}</span>
                      {activeStep === 2 && <Check className="w-3.5 h-3.5 text-[#00D668]" />}
                    </div>
                    <div className="text-[9px] text-[#868D95] font-mono mt-0.5">
                      {activeStep === 2 ? 'Marc Soler · Boarded' : 'Aim camera at QR code'}
                    </div>
                  </div>

                  {/* Phone Footer */}
                  <div className="text-center text-[9px] text-[#50565B] font-mono">
                    tripcelona.com/driver
                  </div>
                </div>

                {/* Home Indicator Bar */}
                <div className="w-20 h-1 bg-[#30363D] rounded-full mx-auto mt-2" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. THE STAGESHOW BENTO GRID (4 Distinct Feature Tiles) */}
      <div className="w-full space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-[#D5D9E0] pb-3">
          <div>
            <div className="eyebrow-s text-[#0052F2] mb-0.5">Stageshow Bento Architecture</div>
            <h3 className="title-s text-[#000000]">Engineered for Uncompromising Reliability</h3>
          </div>
          <div className="text-xs text-[#697077] font-mono">
            4 Core Pillars · Zero Generic Stock Graphics
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Tile 1: Dynamic Places & Seat Management */}
          <div className="bg-white border border-[#D5D9E0] rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-[#0052F2] transition-colors group">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="w-10 h-10 rounded-xl bg-[#F2F4F8] text-[#0052F2] flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
                  <Armchair className="w-5 h-5 text-[#0052F2]" />
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#F2F4F8] text-[#50565B] font-semibold">
                  Pillar 01
                </span>
              </div>
              <h4 className="font-semibold text-base text-[#000000]">Custom Places Engine</h4>
              <p className="text-xs text-[#697077] leading-relaxed">
                Configure customizable coach places (30, 45, 50, 55, 60, or custom capacity) per departure with live interactive seating blueprints.
              </p>
            </div>

            <div className="pt-4 border-t border-[#F2F4F8] mt-4 flex items-center justify-between text-xs">
              <span className="font-mono text-[#0052F2] font-semibold">55 Max Default</span>
              {onOpenCreateTrip && (
                <button
                  onClick={onOpenCreateTrip}
                  className="text-[#0052F2] hover:underline font-semibold flex items-center gap-1"
                >
                  Configure <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Tile 2: Airline-Grade Digital Pass */}
          <div className="bg-white border border-[#D5D9E0] rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-[#0052F2] transition-colors group">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="w-10 h-10 rounded-xl bg-[#F2F4F8] text-[#0052F2] flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
                  <QrCode className="w-5 h-5 text-[#0052F2]" />
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#F2F4F8] text-[#50565B] font-semibold">
                  Pillar 02
                </span>
              </div>
              <h4 className="font-semibold text-base text-[#000000]">300 DPI Boarding Passes</h4>
              <p className="text-xs text-[#697077] leading-relaxed">
                Crystal-clear high contrast printable passes with perforated tear notch markers, passenger name tags, and offline scannable QR tokens.
              </p>
            </div>

            <div className="pt-4 border-t border-[#F2F4F8] mt-4 flex items-center justify-between text-xs">
              <span className="font-mono text-[#0052F2] font-semibold">Print &amp; Share</span>
              {onGoToCheckIn && (
                <button
                  onClick={onGoToCheckIn}
                  className="text-[#0052F2] hover:underline font-semibold flex items-center gap-1"
                >
                  Generate <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Tile 3: Driver Optical Validation HUD */}
          <div className="bg-white border border-[#D5D9E0] rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-[#0052F2] transition-colors group">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="w-10 h-10 rounded-xl bg-[#F2F4F8] text-[#0052F2] flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
                  <ScanLine className="w-5 h-5 text-[#0052F2]" />
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#F2F4F8] text-[#50565B] font-semibold">
                  Pillar 03
                </span>
              </div>
              <h4 className="font-semibold text-base text-[#000000]">Optical Conductor HUD</h4>
              <p className="text-xs text-[#697077] leading-relaxed">
                Sub-second camera scanning with acoustic sound synthesized feedback, visual emerald confirmation, and anti-duplicate boarding guard.
              </p>
            </div>

            <div className="pt-4 border-t border-[#F2F4F8] mt-4 flex items-center justify-between text-xs">
              <span className="font-mono text-[#0052F2] font-semibold">Sub-200ms Scan</span>
              {onGoToValidator && (
                <button
                  onClick={onGoToValidator}
                  className="text-[#0052F2] hover:underline font-semibold flex items-center gap-1"
                >
                  Scanner <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Tile 4: Firestore Cloud & Multi-Role RBAC */}
          <div className="bg-white border border-[#D5D9E0] rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-[#0052F2] transition-colors group">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="w-10 h-10 rounded-xl bg-[#F2F4F8] text-[#0052F2] flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
                  <ShieldCheck className="w-5 h-5 text-[#0052F2]" />
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#F2F4F8] text-[#50565B] font-semibold">
                  Pillar 04
                </span>
              </div>
              <h4 className="font-semibold text-base text-[#000000]">4-Role Access Matrix</h4>
              <p className="text-xs text-[#697077] leading-relaxed">
                Dedicated independent portals for the Executive Admin, Driver Scanner, Ticketing Agent Host, and Travel Coordinator with Firestore live sync.
              </p>
            </div>

            <div className="pt-4 border-t border-[#F2F4F8] mt-4 flex items-center justify-between text-xs">
              <span className="font-mono text-[#0052F2] font-semibold">Real-time Cloud</span>
              {onGoToDashboard && (
                <button
                  onClick={onGoToDashboard}
                  className="text-[#0052F2] hover:underline font-semibold flex items-center gap-1"
                >
                  Dashboard <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
