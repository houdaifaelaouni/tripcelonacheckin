import React, { useState } from 'react';
import { 
  X, 
  UploadCloud, 
  Check, 
  Copy, 
  Terminal, 
  ExternalLink, 
  Globe, 
  FolderGit2, 
  FileText, 
  ShieldCheck
} from 'lucide-react';

interface VercelGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VercelGuide: React.FC<VercelGuideProps> = ({ isOpen, onClose }) => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  if (!isOpen) return null;

  const copySnippet = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSection(key);
      setTimeout(() => setCopiedSection(null), 2500);
    } catch {
      // fallback
    }
  };

  const cliSnippet = `npm install -g vercel\nvercel`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-[3%] sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-[94%] sm:max-w-2xl bg-white border border-[#D5D9E0] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] font-gellix">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#D5D9E0] bg-white sticky top-0 z-10 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-[#0052F2] flex items-center justify-center text-white shrink-0">
              <UploadCloud className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-[#000000] text-sm sm:text-base">Host on Vercel</h3>
                <span className="text-[9px] sm:text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded-full bg-[#F2F4F8] text-[#0052F2] border border-[#D5D9E0]">
                  tripcelona.com
                </span>
              </div>
              <p className="text-xs text-[#697077] mt-0.5">
                Zero-config deployment guide with free HTTPS
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
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5 text-xs text-[#373D42] leading-relaxed flex-1">
          {/* Method 1: Git */}
          <div className="w-full bg-[#F2F4F8] border border-[#D5D9E0] rounded-xl p-3.5 sm:p-4 space-y-2.5 sm:space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold text-xs sm:text-sm text-[#000000]">
                <FolderGit2 className="w-4 h-4 text-[#0052F2]" />
                <span>Method 1: Connect via GitHub (Recommended)</span>
              </div>
              <span className="text-[10px] font-semibold bg-white text-[#0052F2] border border-[#D5D9E0] px-2 py-0.5 rounded-md">
                Standard
              </span>
            </div>

            <ol className="list-decimal list-inside space-y-1.5 text-[#50565B] pl-1">
              <li>
                Push your project code to GitHub or GitLab.
              </li>
              <li>
                Log in to <strong className="text-[#000000]">vercel.com</strong> and click <strong className="text-[#000000]">&quot;Add New... &gt; Project&quot;</strong>.
              </li>
              <li>
                Import your repository. Vercel automatically detects the Vite configuration:
                <div className="mt-2 grid grid-cols-2 gap-2 bg-white p-2.5 sm:p-3 rounded-lg border border-[#D5D9E0] font-mono text-[10px] sm:text-[11px]">
                  <div>
                    <span className="text-[#697077]">Framework:</span> <strong className="text-[#0052F2]">Vite</strong>
                  </div>
                  <div>
                    <span className="text-[#697077]">Root:</span> <strong className="text-[#000000]">./</strong>
                  </div>
                  <div>
                    <span className="text-[#697077]">Build:</span> <strong className="text-[#000000]">npm run build</strong>
                  </div>
                  <div>
                    <span className="text-[#697077]">Output:</span> <strong className="text-[#000000]">dist</strong>
                  </div>
                </div>
              </li>
              <li>
                Click <strong className="text-[#0052F2]">&quot;Deploy&quot;</strong> (~45s).
              </li>
            </ol>
          </div>

          {/* Method 2: CLI */}
          <div className="w-full bg-[#F2F4F8] border border-[#D5D9E0] rounded-xl p-3.5 sm:p-4 space-y-2.5">
            <div className="flex items-center gap-2 font-semibold text-xs sm:text-sm text-[#000000]">
              <Terminal className="w-4 h-4 text-[#0052F2]" />
              <span>Method 2: Deploy via Vercel CLI</span>
            </div>

            <p className="text-[#697077]">
              Run these commands in your project terminal:
            </p>

            <div className="relative bg-white p-3 rounded-lg border border-[#D5D9E0] font-mono text-[11px] text-[#000000] flex items-center justify-between">
              <pre>{cliSnippet}</pre>
              <button
                onClick={() => copySnippet('cli', cliSnippet)}
                className="btn-secondary p-1.5 rounded-md text-xs min-h-[32px]"
                title="Copy command"
              >
                {copiedSection === 'cli' ? <Check className="w-3.5 h-3.5 text-[#0052F2]" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Configuration */}
          <div className="w-full bg-[#F2F4F8] border border-[#D5D9E0] rounded-xl p-3.5 sm:p-4 space-y-1.5">
            <div className="flex items-center gap-2 font-semibold text-xs sm:text-sm text-[#000000]">
              <FileText className="w-4 h-4 text-[#0052F2]" />
              <span>Pre-configured `vercel.json`</span>
            </div>
            <p className="text-[#697077]">
              This project already includes <code className="text-[#0052F2]">vercel.json</code> to ensure client routing and direct links (like <code className="text-[#000000]">/?mode=validator</code>) resolve without 404s.
            </p>
          </div>

          {/* Staff Validator Link */}
          <div className="w-full bg-[#F2F4F8] border border-[#D5D9E0] rounded-xl p-3.5 sm:p-4 space-y-1.5">
            <div className="flex items-center gap-2 font-semibold text-xs sm:text-sm text-[#000000]">
              <ShieldCheck className="w-4 h-4 text-[#0052F2]" />
              <span>Conductor &amp; Staff Validation Link</span>
            </div>
            <p className="text-[#697077]">
              Share this separate URL with the conductor or coach driver:
            </p>
            <div className="bg-white p-2.5 rounded-lg border border-[#D5D9E0] font-mono text-xs text-[#0052F2] break-all">
              https://tripcelona.com/?mode=validator
            </div>
          </div>

          {/* Domain Setup */}
          <div className="w-full bg-[#F2F4F8] border border-[#D5D9E0] rounded-xl p-3.5 sm:p-4 space-y-1.5">
            <div className="flex items-center gap-2 font-semibold text-xs sm:text-sm text-[#000000]">
              <Globe className="w-4 h-4 text-[#0052F2]" />
              <span>Custom Domain Setup (tripcelona.com)</span>
            </div>
            <p className="text-[#697077]">
              In your Vercel Dashboard, go to <strong className="text-[#000000]">Settings &gt; Domains</strong>, and add <code className="text-[#0052F2]">tripcelona.com</code>.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 border-t border-[#D5D9E0] bg-white flex items-center justify-between shrink-0">
          <div className="text-[11px] text-[#697077]">
            Docs: <code className="text-[#000000]">VERCEL_DEPLOYMENT_GUIDE.md</code>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="btn-secondary px-3 py-2 text-xs font-medium min-h-[36px]"
            >
              Close
            </button>
            <a
              href="https://vercel.com/new"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary px-3.5 py-2 text-xs font-medium inline-flex items-center gap-1.5 min-h-[36px]"
            >
              <span>Vercel</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
