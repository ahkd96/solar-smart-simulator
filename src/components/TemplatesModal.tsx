import React from 'react';

interface TemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (templateName: 'eco' | 'medium' | 'premium') => void;
}

export default function TemplatesModal({ isOpen, onClose, onSelect }: TemplatesModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[#050811]/90 z-[100] flex justify-center items-center p-4">
      <div className="glass w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6 md:p-8 border border-white/10">
        <div className="flex justify-between items-center border-b border-white/10 pb-4 mb-6">
          <h2 className="text-lg font-bold text-[#00f0ff] flex items-center gap-3">
            <i className="fa-solid fa-wand-magic-sparkles"></i>
            أختر نموذج منظومة شمسية جاهزة لتجربتها فوراً
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-[#ff3d00] text-xl cursor-pointer">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Economy Economy (3kW) */}
          <div 
            onClick={() => { onSelect('eco'); onClose(); }}
            className="bg-white/2 border border-white/10 hover:border-[#00e676] rounded-xl p-5 text-center cursor-pointer transition-all hover:-translate-y-1 hover:shadow-[0_4px_20px_rgba(0,230,118,0.15)] flex flex-col items-center"
          >
            <div className="w-12 h-12 bg-[#00e676]/10 text-[#00e676] rounded-full flex justify-center items-center text-xl mb-4">
              <i className="fa-solid fa-leaf animate-pulse"></i>
            </div>
            <h4 className="text-sm font-bold text-white mb-2">منظومة اقتصادية (3kW)</h4>
            <p className="text-[10px] text-slate-400 leading-relaxed mb-4 min-h-[40px]">
              مصممة للأحمال المنزلية الخفيفة كالتلفاز، الإضاءة، المراوح، ثلاجة موفرة، والنانو.
            </p>
            <ul className="text-[10px] space-y-1.5 text-right w-full bg-black/35 rounded p-3 mb-4 text-slate-300">
              <li className="flex justify-between"><span>خلية شمسية:</span> <span className="font-semibold text-white">6 ألواح 500W</span></li>
              <li className="flex justify-between"><span>خزن بطارية:</span> <span className="font-semibold text-white">1 ليثيوم 5kWh</span></li>
              <li className="flex justify-between"><span>انفرتر هجين:</span> <span className="font-semibold text-white">منفصل 3kW</span></li>
            </ul>
            <span className="text-xs font-bold text-[#ffd600] font-sans">السعر التقريبي: 1,800 $</span>
          </div>

          {/* Medium Eco (5kW) */}
          <div 
            onClick={() => { onSelect('medium'); onClose(); }}
            className="bg-white/2 border border-white/10 hover:border-[#00f0ff] rounded-xl p-5 text-center cursor-pointer transition-all hover:-translate-y-1 hover:shadow-[0_4px_20px_rgba(0,240,255,0.15)] flex flex-col items-center"
          >
            <div className="w-12 h-12 bg-[#00f0ff]/10 text-[#00f0ff] rounded-full flex justify-center items-center text-xl mb-4">
              <i className="fa-solid fa-house-circle-check"></i>
            </div>
            <h4 className="text-sm font-bold text-white mb-2">المنظومة المتوسطة (5kW)</h4>
            <p className="text-[10px] text-slate-400 leading-relaxed mb-4 min-h-[40px]">
              مناسبة لتغطية أحمال متكاملة مع ميزة تشغيل سبلت 1 طن إنفرتر نهاراً مع الشمس.
            </p>
            <ul className="text-[10px] space-y-1.5 text-right w-full bg-black/35 rounded p-3 mb-4 text-slate-300">
              <li className="flex justify-between"><span>خلية شمسية:</span> <span className="font-semibold text-white">10 ألواح 540W</span></li>
              <li className="flex justify-between"><span>خزن بطارية:</span> <span className="font-semibold text-white">2 ليثيوم 10kWh</span></li>
              <li className="flex justify-between"><span>انفرتر هجين:</span> <span className="font-semibold text-white">هجين 5kW</span></li>
            </ul>
            <span className="text-xs font-bold text-[#ffd600] font-sans">السعر التقريبي: 3,400 $</span>
          </div>

          {/* Premium High (10kW) */}
          <div 
            onClick={() => { onSelect('premium'); onClose(); }}
            className="bg-white/2 border border-white/10 hover:border-[#ffd600] rounded-xl p-5 text-center cursor-pointer transition-all hover:-translate-y-1 hover:shadow-[0_4px_20px_rgba(255,214,0,0.15)] flex flex-col items-center"
          >
            <div className="w-12 h-12 bg-[#ffd600]/10 text-[#ffd600] rounded-full flex justify-center items-center text-xl mb-4">
              <i className="fa-solid fa-building-circle-check"></i>
            </div>
            <h4 className="text-sm font-bold text-white mb-2">منظومة احترافية (10kW)</h4>
            <p className="text-[10px] text-slate-400 leading-relaxed mb-4 min-h-[40px]">
              مثالية للبيوت والمستشفيات مع تشغيل سبلت 2 طن نهاراً وتشغيل مكيف ليلي مستقر.
            </p>
            <ul className="text-[10px] space-y-1.5 text-right w-full bg-black/35 rounded p-3 mb-4 text-slate-300">
              <li className="flex justify-between"><span>خلية شمسية:</span> <span className="font-semibold text-white">18 لوح 550W</span></li>
              <li className="flex justify-between"><span>خزن بطارية:</span> <span className="font-semibold text-white">4 ليثيوم 20kWh</span></li>
              <li className="flex justify-between"><span>انفرتر هجين:</span> <span className="font-semibold text-white">هجين 10kW</span></li>
            </ul>
            <span className="text-xs font-bold text-[#ffd600] font-sans">السعر التقريبي: 6,800 $</span>
          </div>
        </div>
      </div>
    </div>
  );
}
