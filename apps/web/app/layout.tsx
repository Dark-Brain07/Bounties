import "./globals.css";
import Navbar from "@/components/Navbar";
import { WalletProvider } from "@/lib/wallet";
import { CONTRACT_ADDRESS, EXPLORER_BASE } from "@/lib/contract";

export const metadata = {
  title: "Bounties — Autonomous Verification & Claim Protocol on GenLayer",
  description:
    "An on-chain marketplace for verifiable public claims, settled by GenLayer validator consensus against live, independently-fetched web evidence.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col justify-between selection:bg-cyan-500/30 selection:text-cyan-200">
        <WalletProvider>
          <div>
            <Navbar />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
              {children}
            </main>
          </div>

          {/* Footer */}
          <footer className="border-t border-white/10 glass-panel py-8 mt-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-400">
              <div className="flex items-center gap-3">
                <span className="font-bold text-slate-200 tracking-wide">BOUNTIES PROTOCOL</span>
                <span>•</span>
                <span>Powered by GenLayer Equivalence Principle</span>
              </div>

              <div className="flex items-center gap-6 font-mono">
                <a
                  href={`${EXPLORER_BASE}/address/${CONTRACT_ADDRESS}`}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-cyan-400 transition-colors flex items-center gap-1.5"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  Contract: {CONTRACT_ADDRESS.slice(0, 6)}...{CONTRACT_ADDRESS.slice(-4)}
                </a>
                <a
                  href="https://docs.genlayer.com"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-cyan-400 transition-colors"
                >
                  GenLayer Docs
                </a>
              </div>
            </div>
          </footer>
        </WalletProvider>
      </body>
    </html>
  );
}
