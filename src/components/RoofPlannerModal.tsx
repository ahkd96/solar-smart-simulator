import React, { useState, useEffect } from 'react';
import { productsData } from '../data';
import { PVModel } from '../types';

interface RoofPlannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (calculatedCount: number, selectedPanelModel: PVModel) => void;
}

export default function RoofPlannerModal({ isOpen, onClose, onApply }: RoofPlannerModalProps) {
  const [width, setWidth] = useState<number>(10);
  const [length, setLength] = useState<number>(8);
  const [selectedPvId, setSelectedPvId] = useState<string>(productsData.pv[0].id);

  if (!isOpen) return null;

  const panel = productsData.pv.find((p) => p.id === selectedPvId) || productsData.pv[0];

  // Standard panel dimensions including spacing gaps (approx 2.2m x 1.1m)
  const pLength = 2.2;
  const pWidth = 1.1;

  // Walkways/boundaries: 0.5m around top, bottom, left, right edge
  const effectiveWidth = Math.max(0, width - 1.0);
  const effectiveLength = Math.max(0, length - 1.0);

  // Columns: panels along the width
  const cols = Math.floor(effectiveWidth / pWidth);

  // Rows: panels along the length with walkways every 2 rows of width 0.5m
  let rows = 0;
  let currentLength = 0;
  while (currentLength + pLength <= effectiveLength) {
    rows++;
    currentLength += pLength;
    if (rows % 2 === 0) {
      currentLength += 0.5; // Walkway
    }
  }

  const totalPanels = Math.max(0, cols * rows);
  const maximumCapacityKw = ((totalPanels * panel.power) / 1000).toFixed(1);

  // Generate layouts visual tiles
  const renderedTiles: React.ReactNode[] = [];
  let indexCounter = 1;

  for (let r = 1; r <= rows; r++) {
    for (let c = 1; c <= cols; c++) {
      renderedTiles.push(
        <div key={`pv-${r}-${c}-${indexCounter}`} className="roof-grid-tile pv flex flex-col justify-center items-center">
          <i className="fa-solid fa-solar-panel"></i>
          <span className="text-[9px] font-semibold mt-1 font-sans">#{indexCounter++}</span>
        </div>
      );
    }
    // Append walkway row element
    if (r % 2 === 0 && r < rows) {
      for (let c = 1; c <= cols; c++) {
        renderedTiles.push(
          <div key={`walk-${r}-${c}`} className="roof-grid-tile pathway flex flex-col justify-center items-center">
            <i className="fa-solid fa-person-walking"></i>
            <span className="text-[8px]">ممر</span>
          </div>
        );
      }
    }
  }

  const handleApply = () => {
    if (totalPanels > 0) {
      onApply(totalPanels, panel);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-[#050811]/90 z-[100] flex justify-center items-center p-4">
      <div className="glass w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 md:p-8 translate-all-custom border border-white/10">
        <div className="flex justify-between items-center border-b border-white/10 pb-4 mb-6">
          <h2 className="text-lg font-bold text-[#00f0ff] flex items-center gap-3">
            <i className="fa-solid fa-house-chimney-window"></i>
            أداة تخطيط السطح وتوزيع الألواح (2D Layout)
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-[#ff3d00] text-xl cursor-pointer">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          {/* Controls - Left (2 cols) */}
          <div className="md:col-span-2 flex flex-col gap-4">
            <h3 className="text-sm font-semibold text-slate-250 border-b border-white/5 pb-2">أبعاد السطح المتاحة</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400">العرض (متر):</label>
                <input 
                  type="number" 
                  value={width} 
                  onChange={(e) => setWidth(Math.max(1, Number(e.target.value)))}
                  className="glass-input bg-[#0a0e1a]/80 border border-white/10 rounded px-3 py-1.5 text-xs text-white" 
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400">الطول (متر):</label>
                <input 
                  type="number" 
                  value={length} 
                  onChange={(e) => setLength(Math.max(1, Number(e.target.value)))}
                  className="glass-input bg-[#0a0e1a]/80 border border-white/10 rounded px-3 py-1.5 text-xs text-white" 
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400">نوع اللوح الشمسي:</label>
              <select 
                value={selectedPvId} 
                onChange={(e) => setSelectedPvId(e.target.value)}
                className="glass-input bg-[#0a0e1a]/80 border border-white/10 rounded px-3 py-1.5 text-xs text-white"
              >
                {productsData.pv.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.brand} - {p.model} ({p.power} واط)
                  </option>
                ))}
              </select>
            </div>

            {/* Results */}
            <div className="bg-white/3 border border-white/10 rounded-lg p-4 space-y-3">
              <h4 className="text-xs font-bold text-[#ffd600]">التحليل الفني للسطح:</h4>
              <ul className="text-xs space-y-2 text-slate-300">
                <li className="flex justify-between border-b border-white/5 pb-1">
                  <span>المساحة الكلية للسطح:</span>
                  <span className="font-semibold text-white">{(width * length).toFixed(0)} م²</span>
                </li>
                <li className="flex justify-between border-b border-white/5 pb-1">
                  <span>أقصى عدد ألواح مناسب للسطح:</span>
                  <span className="font-semibold text-[#ffd600]">{totalPanels} لوح شمسيا</span>
                </li>
                <li className="flex justify-between border-b border-white/5 pb-1">
                  <span>القدرة الكلية الممكن توليدها:</span>
                  <span className="font-semibold text-[#ffd600]">{maximumCapacityKw} كيلوواط</span>
                </li>
                <li className="flex justify-between border-b border-white/5 pb-1">
                  <span>زاوية التوجيه المناسب في العراق:</span>
                  <span className="font-semibold text-[#00e676]">30 درجة (بإتجاه الجنوب)</span>
                </li>
              </ul>
            </div>

            <button 
              onClick={handleApply} 
              disabled={totalPanels <= 0}
              className={`btn w-full justify-center flex items-center gap-2 py-2 px-4 rounded text-xs font-semibold select-none cursor-pointer transition-all ${
                totalPanels > 0 
                ? 'bg-[#00f0ff] hover:bg-[#00d0df] text-[#050811] hover:scale-102' 
                : 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
              }`}
            >
              <i className="fa-solid fa-circle-check"></i>
              تطبيق ونقل الألواح للوحة المحاكاة الرسمية
            </button>
          </div>

          {/* Graphical layout - Right (3 cols) */}
          <div className="md:col-span-3 flex flex-col gap-3 bg-[#0a0e1a]/40 border border-white/5 rounded-lg p-4">
            <span className="text-xs text-slate-400">توزيع الخلايا الجذري الافتراضي 2D (متضمن ممرات الصيانة):</span>
            
            <div className="bg-[#0f172a] border-2 border-dashed border-white/10 rounded-lg h-[300px] overflow-y-auto p-4 flex flex-wrap gap-2 content-start justify-center">
              {renderedTiles.length > 0 ? (
                renderedTiles
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center text-xs text-slate-500 gap-2 w-full">
                  <i className="fa-solid fa-circle-exclamation text-2xl text-[#ff3d00] empty-icon"></i>
                  <span>أبعاد السطح صغيرة جداً لتوفير ممرات صيانة وألواح.</span>
                </div>
              )}
            </div>

            <div className="flex gap-4 text-[10px] text-slate-400 mt-2">
              <span className="flex items-center gap-1.5">
                <span className="indicator pv"></span>
                لوح شمسي مقترح
              </span>
              <span className="flex items-center gap-1.5">
                <span className="indicator pathway"></span>
                ممر صيانة وتنظيف (0.5 متر)
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
