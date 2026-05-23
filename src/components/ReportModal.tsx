import React from 'react';
import { citiesData } from '../data';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  calcs: any;
  cityKey: string;
  seasonKey: string;
  businessName?: string;
}

export default function ReportModal({ isOpen, onClose, calcs, cityKey, seasonKey, businessName }: ReportModalProps) {
  if (!isOpen) return null;

  const cityInfo = citiesData[cityKey] || citiesData.baghdad;
  const todayDate = new Date().toLocaleDateString('ar-IQ');
  const displayBusinessName = businessName?.trim() || 'Solar Smart Simulator';

  const printReport = () => {
    const cleanupPrintState = () => {
      document.body.classList.remove('printing-report');
      window.removeEventListener('afterprint', cleanupPrintState);
    };

    document.body.classList.add('printing-report');
    window.addEventListener('afterprint', cleanupPrintState);
    window.requestAnimationFrame(() => {
      window.print();
      window.setTimeout(cleanupPrintState, 1000);
    });
  };

  const getVerdictMarkup = () => {
    if (calcs.inverterRatio > 100) {
      return (
        <div className="bg-[#ff3d00]/10 border border-[#ff3d00]/30 rounded p-4 text-[#ff3d00] text-xs">
          <strong>❌ قرار هندسي غير متطابق:</strong> التصميم مصاب بتراكم أحمال زائدة حرجة على عاكس الطاقة (انفرتر) بنسبة ({calcs.inverterRatio.toFixed(0)}%). يرجى استخدام انفرتر بقدرة تشغيلية أعلى (8kW أو 12kW مثلاً) أو إزالة أحد أجهزة السبلت لتفادي إغلاق الطوارئ الصامت للانفرتر.
        </div>
      );
    } else if (calcs.pvVoltageDropPercent > 3.0) {
      return (
        <div className="bg-[#ff9100]/10 border border-[#ff9100]/30 rounded p-4 text-[#ff9100] text-xs">
          <strong>⚠️ قرار هندسي مقبول بتحفظ:</strong> المنظومة تشغيلياً مستقرة ولكن معدل هبوط الجهد الكهربي في كابلات الألواح يصل إلى ({calcs.pvVoltageDropPercent.toFixed(1)}%) وهو أعلى من توصية الكود الوطني البالغة 3%. يُنصح بشدة بزيادة مقطع أسلاك الألواح لتجنب حرارة الكيبلات وهدر الإنتاجية الشمسية.
        </div>
      );
    } else {
      return (
        <div className="bg-[#00e676]/10 border border-[#00e676]/20 rounded p-4 text-[#00e676] text-xs">
          <strong>🏆 شهادة مطابقة هندسية:</strong> المنظومة متوازنة بالكامل وحسابات الألواح والبطاريات متطابقة كهربائياً ومتوافقة هندسياً لتلبية احتياجات الحمل في مدينة <strong>{cityInfo.name}</strong>. الكوابل المقترحة وأنظمة الحماية تتطابق مع كود الكهرباء (NEC).
        </div>
      );
    }
  };

  return (
    <div className="fixed inset-0 bg-[#050811]/95 z-[100] flex justify-center items-center p-4 report-modal-overlay">
      <div className="glass w-full max-w-4xl max-h-[92vh] overflow-y-auto p-6 md:p-8 border border-white/10" id="pdf-report-layout">
        
        {/* Modal Header Actions - Hidden during prints */}
        <div className="flex justify-between items-center border-b border-white/10 pb-4 mb-6 no-print">
          <h2 className="text-lg font-bold text-[#00f0ff] flex items-center gap-3">
            <i className="fa-solid fa-file-invoice"></i>
            معاينة التقرير الفني المعتمد للمشروع
          </h2>
          <div className="flex items-center gap-4">
            <button 
              onClick={printReport}
              className="bg-[#00f0ff] hover:bg-[#00d0df] text-[#050811] text-xs font-semibold py-1.5 px-4 rounded flex items-center gap-2 cursor-pointer transition select-none"
            >
              <i className="fa-solid fa-print"></i>
              طباعة التقرير أو حفظه كـ PDF
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-[#ff3d00] text-xl cursor-pointer">
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>

        {/* Printable Section Area */}
        <div className="text-white bg-[#0b0f19] p-4 md:p-6 rounded-lg border border-white/5" id="pdf-printable-area">
          
          {/* Header Layout */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded bg-yellow-500/10 border border-yellow-500/30 flex justify-center items-center text-2xl text-[#ffd600]">
                <i className="fa-solid fa-solar-panel"></i>
              </div>
              <div>
                <h2 className="text-base font-extrabold text-[#ffd600]">{displayBusinessName}</h2>
                <span className="text-[10px] text-slate-400 block mt-0.5">منصة المحاكاة الفنية الذكية لهندسة وتوصيل الطاقة المتجددة</span>
              </div>
            </div>
            
            <div className="text-xs text-slate-400 space-y-1 text-right">
              <div><strong>تاريخ التقرير:</strong> <span className="text-white font-sans">{todayDate}</span></div>
              <div><strong>نظام التصميم:</strong> <span className="text-white">{calcs.selectedGen ? 'هجين (شمسي + مولد ليد)' : 'مستقل طاقة نظيفة'}</span></div>
              <div><strong>المدينة والموقع المعتمد:</strong> <span className="text-[#00f0ff]">{cityInfo.name} ({seasonKey === 'summer' ? 'صيفاً' : 'شتاءً'})</span></div>
            </div>
          </div>

          <div className="h-[2px] bg-gradient-to-r from-[#00f0ff] via-[#00e676] to-[#ffd600] mb-6"></div>

          {/* First Section: Main Summary Stats */}
          <h3 className="text-xs font-bold text-[#00f0ff] border-r-3 border-[#00f0ff] pr-2.5 pb-0.5 mb-4">أولاً: الخلاصة الهندسية والإنتاجية للمنظومة</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white/3 border border-white/5 rounded p-4 text-center">
              <span className="text-[10px] text-slate-400 block mb-1">القدرة الإجمالية للألواح</span>
              <h4 className="text-sm font-extrabold text-[#ffd600] font-sans">{calcs.totalPvPower.toFixed(0)} واط</h4>
              <p className="text-[9px] text-slate-500 mt-1">توليد تقريبي: <span className="font-bold font-sans text-white">{calcs.dailyPvYield.toFixed(1)}</span> كيلوواط/ساعة يومياً</p>
            </div>
            
            <div className="bg-white/3 border border-white/5 rounded p-4 text-center">
              <span className="text-[10px] text-slate-400 block mb-1">السعة الخزنية للبطاريات</span>
              <h4 className="text-sm font-extrabold text-[#00e676] font-sans">{calcs.totalBatteryStorage.toFixed(1)} ك.و.س</h4>
              <p className="text-[9px] text-slate-500 mt-1">الخزن الفعلي (DoD): <span className="font-bold font-sans text-white">{calcs.actualUsableStorage.toFixed(1)}</span> ك.و.س</p>
            </div>
            
            <div className="bg-white/3 border border-white/5 rounded p-4 text-center">
              <span className="text-[10px] text-slate-400 block mb-1">الاستهلاك اللحظي الإجمالي</span>
              <h4 className="text-sm font-extrabold text-[#0bf] font-sans">{calcs.instantPeakLoad.toFixed(0)} واط</h4>
              <p className="text-[9px] text-slate-500 mt-1">الحمل اليومي الكلي: <span className="font-bold font-sans text-white">{calcs.totalLoadDemand.toFixed(1)}</span> ك.و.س</p>
            </div>
          </div>

          {/* Second Section: Hardware List */}
          <h3 className="text-xs font-bold text-[#00f0ff] border-r-3 border-[#00f0ff] pr-2.5 pb-0.5 mb-4">ثانياً: قائمة الأجهزة والمكونات المعتمدة</h3>
          <div className="overflow-x-auto mb-6">
            <table className="w-full text-right border-collapse text-[11px] text-slate-200">
              <thead>
                <tr className="bg-white/3 text-slate-400 text-[10px] border-b border-white/10">
                  <th className="py-2.5 px-3">المكون الرئيسي</th>
                  <th className="py-2.5 px-3">الموديل الفني والماركة</th>
                  <th className="py-2.5 px-3 text-center">الكمية</th>
                  <th className="py-2.5 px-3">المواصفات والجهود المرجعية</th>
                </tr>
              </thead>
              <tbody>
                {calcs.panelsCount > 0 && calcs.selectedPanel && (
                  <tr className="border-b border-white/5">
                    <td className="py-2 px-3 font-semibold text-white">ألواح شمسية (PV)</td>
                    <td className="py-2 px-3 text-slate-350">{calcs.selectedPanel.brand} - {calcs.selectedPanel.model}</td>
                    <td className="py-2 px-3 text-center">{calcs.panelsCount} ألواح</td>
                    <td className="py-2 px-3 font-sans text-slate-400">Voc: {calcs.stringVoc.toFixed(1)}V | Isc: {calcs.stringIsc.toFixed(1)}A</td>
                  </tr>
                )}
                {calcs.selectedMppt && (
                  <tr className="border-b border-white/5">
                    <td className="py-2 px-3 font-semibold text-white">منظم شحن MPPT</td>
                    <td className="py-2 px-3 text-slate-350">{calcs.selectedMppt.brand} - {calcs.selectedMppt.model}</td>
                    <td className="py-2 px-3 text-center">1 جهاز</td>
                    <td className="py-2 px-3 font-sans text-slate-400">Max Current: {calcs.selectedMppt.maxCurrent}A | Max V: {calcs.selectedMppt.maxPvVoc}V</td>
                  </tr>
                )}
                {calcs.selectedBattery && calcs.batteriesCount > 0 && (
                  <tr className="border-b border-white/5">
                    <td className="py-2 px-3 font-semibold text-white">بنك تخزين البطاريات</td>
                    <td className="py-2 px-3 text-slate-350">{calcs.selectedBattery.brand} - {calcs.selectedBattery.model}</td>
                    <td className="py-2 px-3 text-center">{calcs.batteriesCount} وحدات</td>
                    <td className="py-2 px-3 font-sans text-slate-400">Chemistry: {calcs.selectedBattery.chemistry} | Voltage: {calcs.selectedBattery.voltage}V</td>
                  </tr>
                )}
                {calcs.selectedInverter && (
                  <tr className="border-b border-white/5">
                    <td className="py-2 px-3 font-semibold text-white">عاكس الانفرتر (Inverter)</td>
                    <td className="py-2 px-3 text-slate-350">{calcs.selectedInverter.brand} - {calcs.selectedInverter.model}</td>
                    <td className="py-2 px-3 text-center">1 جهاز</td>
                    <td className="py-2 px-3 text-slate-400">Type: {calcs.selectedInverter.type} | Power: {calcs.selectedInverter.power}W</td>
                  </tr>
                )}
                {calcs.selectedGen && calcs.generatorOutput > 0 && (
                  <tr className="border-b border-white/5">
                    <td className="py-2 px-3 font-semibold text-white">مولد ديزل احتياطي</td>
                    <td className="py-2 px-3 text-slate-350">{calcs.selectedGen.brand} - {calcs.selectedGen.model}</td>
                    <td className="py-2 px-3 text-center">1 وحدة</td>
                    <td className="py-2 px-3 text-slate-400">Fuel: {calcs.selectedGen.fuelType} | Output: {calcs.selectedGen.power}W</td>
                  </tr>
                )}
                {calcs.activeLoads.length > 0 ? (
                  calcs.activeLoads.map((load: any) => (
                    <tr key={load.id} className="border-b border-white/5 text-slate-350">
                      <td className="py-2 px-3 font-semibold">حمل: {load.name}</td>
                      <td className="py-2 px-3">تيار متناوب AC منزلي</td>
                      <td className="py-2 px-3 text-center font-bold text-white">{load.qty}</td>
                      <td className="py-2 px-3 text-slate-400">الاستهلاك اللحظي: {load.power * load.qty} واط | تشغيل ليلي: {load.nightHours} ساعات</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-3 text-center text-slate-500">لا توجد أحمال مضافة في لوحة الفحص</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Third Section: Sizing Calculations */}
          <h3 className="text-xs font-bold text-[#00f0ff] border-r-3 border-[#00f0ff] pr-2.5 pb-0.5 mb-4">ثالثاً: حسابات الكيبلات ومقاييس الحماية الكهربائية</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="bg-white/3 border border-white/5 rounded p-4 text-xs space-y-2">
              <h4 className="text-xs font-bold text-[#00f0ff] border-b border-white/5 pb-1 mb-2">أقطار وتعرير أسلاك الربط (Cables Section):</h4>
              <div className="flex justify-between">
                <span className="text-slate-400">توصيل الألواح بالانفرتر (DC 20m):</span>
                <span className="font-semibold text-white font-sans">{calcs.pvCableSize} مم²</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">توصيل البطاريات بالانفرتر (DC 2m):</span>
                <span className="font-semibold text-white font-sans">{calcs.batCableSize} مم²</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">هبوط الفولت الكلي للألواح (DC Drop):</span>
                <span className={`font-semibold font-sans ${calcs.pvVoltageDropPercent > 3 ? 'text-[#ff3d00]' : 'text-[#00e676]'}`}>{calcs.pvVoltageDropPercent.toFixed(1)} %</span>
              </div>
            </div>

            <div className="bg-white/3 border border-white/5 rounded p-4 text-xs space-y-2">
              <h4 className="text-xs font-bold text-[#00f0ff] border-b border-white/5 pb-1 mb-2">أنظمة القواطع (Protections & Switces):</h4>
              <div className="flex justify-between">
                <span className="text-slate-400">قاطع مصفوفة الخلايا الشمسية (DC Breaker):</span>
                <span className="font-semibold text-white font-sans">{calcs.pvDcBreaker} أمبير</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">قاطع مجمع البطاريات (DC Fuse):</span>
                <span className="font-semibold text-white font-sans">{calcs.batDcFuse} أمبير</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">قاطع عاكس الطاقة العام (AC Breaker):</span>
                <span className="font-semibold text-white font-sans">{calcs.invAcBreaker} أمبير</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 text-xs">
            <div className="bg-white/3 border border-white/5 rounded p-4 space-y-2">
              <h4 className="text-xs font-bold text-[#00f0ff] border-b border-white/5 pb-1 mb-2">تقديرات الفترات الزمنية للتشغيل:</h4>
              <div className="flex justify-between">
                <span className="text-slate-400">مدة تغذية البطاريات ليلاً (ساعة):</span>
                <span className="font-bold text-[#00e676] font-sans">{calcs.nightOperatingHours.toFixed(1)} ساعة</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">الزمن المقدر لشحن البطاريات نهاراً:</span>
                <span className="font-bold text-white font-sans">{calcs.batteryChargeTime.toFixed(1)} ساعة</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">معدل التحميل اللحظي الكلي للانفرتر:</span>
                <span className="font-bold font-sans">{calcs.inverterRatio.toFixed(0)} %</span>
              </div>
            </div>

            <div className="bg-white/3 border border-white/5 rounded p-4 space-y-2">
              <h4 className="text-xs font-bold text-[#00f0ff] border-b border-white/5 pb-1 mb-2">حساب انبعاثات وتكامل المولد:</h4>
              <div className="flex justify-between">
                <span className="text-slate-400">ساعات عمل المولد المقترحة لتغطية العجز:</span>
                <span className="font-bold text-white font-sans">{calcs.generatorRuntimeHours.toFixed(1)} ساعة</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">استهلاك وقود المولد التقريبي (لتر):</span>
                <span className="font-bold text-white font-sans">{calcs.generatorFuelConsumption.toFixed(1)} لتر</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">معدل خفض انبعاثات ثاني أكسيد الكربون:</span>
                <span className="font-bold text-[#00e676] font-sans">{(calcs.co2Offset / 1000).toFixed(2)} طن / سنة</span>
              </div>
            </div>
          </div>

          {/* Verdict Message Box */}
          <h3 className="text-xs font-bold text-[#00f0ff] border-r-3 border-[#00f0ff] pr-2.5 pb-0.5 mb-3">رابعاً: التوصية الفنية والقرار النهائي للمهندس</h3>
          <div className="mb-6">
            {getVerdictMarkup()}
          </div>

          <div className="border-t border-white/10 pt-4 flex justify-between items-center bg-[#0a0e1a]/50 p-3 rounded">
            <span className="text-xs text-slate-400">الكلفة التقديرية الإجمالية للمشروع الكلي شاملاً التركيب والشحن:</span>
            <strong className="text-lg text-[#00f0ff] font-sans">{calcs.grandTotal.toFixed(0)} $</strong>
          </div>

          <div className="text-center text-[10px] text-slate-500 mt-6 pt-3 border-t border-white/5">
            <p>تم استخراج هذا المخطط الفني عبر منصة محاكاة الطاقة الشمسية الذكية في العراق.</p>
            <p className="mt-1">صالح لأغراض الكشف الفني الأولي والمعاينة الهندسية المعتمدة.</p>
          </div>

        </div>
      </div>
    </div>
  );
}
