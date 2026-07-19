import { X, Info, Pickaxe, Flame, Database, Zap, Target, Trophy, Clock, Box } from "lucide-react";
import Image from "next/image";

type Props = {
  onClose: () => void;
};

export default function FarmGuideModal({ onClose }: Props) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-[#0f172a] border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-2">
            <Info className="w-5 h-5 text-[#00d4ff]" />
            <h2 className="text-lg font-black text-white uppercase tracking-wider">Commander's Guide</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar">
          
          <div className="mb-8">
            <h3 className="text-[#00ff88] font-bold mb-2 uppercase tracking-widest text-sm flex items-center gap-2">
              <Database size={16} /> The Supply Chain
            </h3>
            <p className="text-slate-300 text-sm mb-4 leading-relaxed">
              Your base runs on an interconnected economy. Building a high-tier structure won't work if you don't supply it with raw materials. 
              <strong className="text-white block mt-2">Refineries CONSUME lower-tier resources to produce higher-tier ones!</strong>
            </p>

            <div className="space-y-3 bg-slate-900/50 p-4 rounded-xl border border-slate-800/50">
              
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-slate-800 flex items-center justify-center shrink-0 border border-slate-700">
                  <Image src="/farm/items/ore.png" alt="Ore" width={24} height={24} />
                </div>
                <div>
                  <h4 className="text-white font-bold text-sm">1. Ore Mine</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">Extracts raw <span className="text-orange-300 font-medium">Ore</span> from the ground. Operates independently and requires no input.</p>
                </div>
              </div>

              <div className="flex items-center gap-2 pl-5 text-slate-600">
                <div className="w-0.5 h-4 bg-slate-700"></div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-slate-800 flex items-center justify-center shrink-0 border border-slate-700">
                  <Image src="/farm/items/iron.png" alt="Iron" width={24} height={24} />
                </div>
                <div>
                  <h4 className="text-white font-bold text-sm">2. Iron Refinery</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    <span className="text-red-400 font-bold">CONSUMES ORE</span> to smelt <span className="text-slate-300 font-medium">Iron</span>. If your Ore stockpile is empty, the Iron Refinery will pause production!
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 pl-5 text-slate-600">
                <div className="w-0.5 h-4 bg-slate-700"></div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-slate-800 flex items-center justify-center shrink-0 border border-slate-700">
                  <Image src="/farm/items/gold.png" alt="Gold" width={24} height={24} />
                </div>
                <div>
                  <h4 className="text-white font-bold text-sm">3. Gold Refinery</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    <span className="text-red-400 font-bold">CONSUMES IRON</span> to synthesize <span className="text-yellow-400 font-medium">Gold</span>. If you don't have enough Iron flowing in, your Gold won't increase!
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 pl-5 text-slate-600">
                <div className="w-0.5 h-4 bg-slate-700"></div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-slate-800 flex items-center justify-center shrink-0 border border-slate-700">
                  <Image src="/farm/items/crystal.png" alt="Crystal" width={24} height={24} />
                </div>
                <div>
                  <h4 className="text-white font-bold text-sm">4. Crystal Forge</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    <span className="text-red-400 font-bold">CONSUMES GOLD</span> to forge ultra-rare <span className="text-[#00ff88] font-medium">Prime Crystal</span>. This is the pinnacle of the supply chain.
                  </p>
                </div>
              </div>

            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-[#00d4ff] font-bold mb-2 uppercase tracking-widest text-sm flex items-center gap-2">
              <Pickaxe size={16} /> Expanding & Upgrading
            </h3>
            <ul className="text-slate-300 text-sm space-y-3">
              <li className="flex gap-2">
                <span className="text-[#00d4ff]">•</span>
                <p>Click on an empty tile <span className="inline-block px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-xs">(+)</span> to build a new structure using CRYSTAL.</p>
              </li>
              <li className="flex gap-2">
                <span className="text-[#00d4ff]">•</span>
                <p>Click on an existing building to <strong className="text-white">Upgrade</strong> it for higher production, or <strong className="text-white">Demolish</strong> it to get 50% of the crystal cost back.</p>
              </li>
              <li className="flex gap-2">
                <span className="text-[#00d4ff]">•</span>
                <p>Click the <strong className="text-white">Expand Base</strong> ring around your base to unlock more plots (requires holding $VENA in your wallet).</p>
              </li>
            </ul>
          </div>

          <div className="mb-8">
            <h3 className="text-yellow-400 font-bold mb-2 uppercase tracking-widest text-sm flex items-center gap-2">
              <Trophy size={16} /> Daily Operations & Boosts
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800/50">
                <h4 className="text-white font-bold text-sm flex items-center gap-2 mb-2"><Target size={14} className="text-yellow-400" /> Quests & Streaks</h4>
                <p className="text-xs text-slate-400 leading-relaxed mb-2">Complete daily quests to earn Crystal rewards. Log in consecutively to build a <strong className="text-white">Login Streak</strong> for a global production multiplier!</p>
                <p className="text-[11px] text-red-400">Warning: Missing a day resets your streak to zero.</p>
              </div>
              <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800/50">
                <h4 className="text-white font-bold text-sm flex items-center gap-2 mb-2"><Zap size={14} className="text-orange-400" /> Commander Rally</h4>
                <p className="text-xs text-slate-400 leading-relaxed mb-2">Click the Commander avatar to activate a <strong className="text-white">+50% production boost</strong> for a limited time. Use it strategically!</p>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-[#c084fc] font-bold mb-2 uppercase tracking-widest text-sm flex items-center gap-2">
              <Box size={16} /> Orbital Chests & VPICK
            </h3>
            <ul className="text-slate-300 text-sm space-y-3">
              <li className="flex gap-2">
                <span className="text-[#c084fc]">•</span>
                <p><strong className="text-white">Orbital Chests:</strong> Open the chest on the map once every 24 hours for <strong className="text-[#00ff88]">FREE</strong>. You can win Crystals, Ores, $VENA tokens, or ultra-rare <strong className="text-red-400">Power Cores</strong> (which give permanent production boosts).</p>
              </li>
              <li className="flex gap-2">
                <span className="text-[#c084fc]">•</span>
                <p><strong className="text-white">VPICK NFTs:</strong> Holding a VPICK NFT in your wallet automatically multiplies all your base production rates. Higher rarity VPICKs give massive multipliers.</p>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-purple-400 font-bold mb-2 uppercase tracking-widest text-sm flex items-center gap-2">
              <Flame size={16} /> Cloud Saves
            </h3>
            <p className="text-slate-300 text-sm leading-relaxed bg-purple-500/10 p-4 rounded-xl border border-purple-500/20">
              Your base layout, resources, and progress are <strong className="text-white">automatically synced to the cloud</strong> via your wallet address. 
              You can safely clear your browser cookies or switch devices without losing your progress!
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/50 text-center">
          <button 
            onClick={onClose}
            className="px-8 py-2.5 bg-[#00d4ff]/20 hover:bg-[#00d4ff]/30 text-[#00d4ff] border border-[#00d4ff]/50 rounded-xl font-bold tracking-wider transition-all"
          >
            I UNDERSTAND
          </button>
        </div>
      </div>
    </div>
  );
}
