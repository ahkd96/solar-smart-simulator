import React from 'react';
import { CanvasNode, PVModel, MPPTModel, BatteryModel, InverterModel, GeneratorModel, LoadModel } from '../types';

interface CartModalProps {
  isOpen: boolean;
  onClose: () => void;
  calcs: any;
  cityKey: string;
  seasonKey: string;
  onRemoveItem: (itemId: string) => void;
}

export default function CartModal({ isOpen, onClose, calcs, cityKey, seasonKey, onRemoveItem }: CartModalProps) {
  if (!isOpen) return null;

  const cartItems: Array<{
    id: string;
    name: string;
    model: string;
    qty: number;
    unitPrice: number;
    totalPrice: number;
  }> = [];

  if (calcs.selectedPanel && calcs.panelsCount > 0) {
    cartItems.push({
      id: 'pv',
      name: 'لوح شمسي (PV)',
      model: `${calcs.selectedPanel.brand} - ${calcs.selectedPanel.model}`,
      qty: calcs.panelsCount,
      unitPrice: calcs.selectedPanel.price,
      totalPrice: calcs.selectedPanel.price * calcs.panelsCount
    });
  }

  if (calcs.selectedMppt) {
    cartItems.push({
      id: 'mppt',
      name: 'منظم شحن MPPT',
      model: `${calcs.selectedMppt.brand} - ${calcs.selectedMppt.model}`,
      qty: 1,
      unitPrice: calcs.selectedMppt.price,
      totalPrice: calcs.selectedMppt.price
    });
  }

  if (calcs.selectedBattery && calcs.batteriesCount > 0) {
    cartItems.push({
      id: 'battery',
      name: 'بطارية خزن',
      model: `${calcs.selectedBattery.brand} - ${calcs.selectedBattery.model}`,
      qty: calcs.batteriesCount,
      unitPrice: calcs.selectedBattery.price,
      totalPrice: calcs.selectedBattery.price * calcs.batteriesCount
    });
  }

  if (calcs.selectedInverter) {
    cartItems.push({
      id: 'inverter',
      name: 'انفرتر (عاكس هجين)',
      model: `${calcs.selectedInverter.brand} - ${calcs.selectedInverter.model}`,
      qty: 1,
      unitPrice: calcs.selectedInverter.price,
      totalPrice: calcs.selectedInverter.price
    });
  }

  if (calcs.selectedGen && calcs.generatorOutput > 0) {
    cartItems.push({
      id: 'generator',
      name: 'مولد كهربائي ديزل',
      model: `${calcs.selectedGen.brand} - ${calcs.selectedGen.model}`,
      qty: 1,
      unitPrice: calcs.selectedGen.price,
      totalPrice: calcs.selectedGen.price
    });
  }

  // Active household devices
  calcs.activeLoads.forEach((load: any) => {
    cartItems.push({
      id: `load-${load.id}`,
      name: load.name,
      model: 'أجهزة تيار متردد AC',
      qty: load.qty,
      unitPrice: load.price,
      totalPrice: load.price * load.qty
    });
  });

  const handleWhatsAppCheckout = () => {
    const phone = "9647700000000"; // Premade Iraq direct inquiry
    const pvDesc = calcs.panelsCount > 0 ? `${calcs.panelsCount} لوح شمسي بقدرة ${calcs.selectedPanel.brand} (${calcs.totalPvPower} واط)` : "لا يوجد ألواح";
    const batDesc = calcs.batteriesCount > 0 ? `${calcs.batteriesCount} بطارية ${calcs.selectedBattery.brand} (${(calcs.totalBatteryStorage).toFixed(1)} ك.و.س)` : "لا يوجد بطاريات";
    const invDesc = calcs.selectedInverter ? `عاكس ${calcs.selectedInverter.brand} بقوة (${calcs.selectedInverter.power} واط)` : "لا يوجد انفرتر";

    const msg = `مرحباً مهندس الطاقة الذكية،
أود الاستفسار وتأكيد طلب منظومة الطاقة الشمسية التي صممتها عبر المنصة:
------------------------------------------
📍 المدينة المصممة: ${cityKey.toUpperCase()}
🌍 الفصل المختار: ${seasonKey === 'summer' ? 'الصيف' : 'الشتاء'}
------------------------------------------
☀️ الألواح الشمسية: ${pvDesc}
🔋 البطاريات التخزينية: ${batDesc}
🔌 الانفرتر الهجين: ${invDesc}
------------------------------------------
💰 الكلفة الإجمالية التقديرية (شاملة الكابلات والتركيب): ${calcs.grandTotal.toFixed(0)} $

يرجى التواصل لترتيب فريق الفحص والمعاينة الميدانية للسطح.`;

    const encodedMsg = encodeURIComponent(msg);
    window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${encodedMsg}`, '_blank');
  };

  const handleAddToCart = () => {
    alert('تمت إضافة مواصفات المنظومة بنجاح إلى سلة مشتريات المتجر!');
  };

  return (
    <div className="fixed inset-0 bg-[#050811]/90 z-[100] flex justify-center items-center p-4">
      <div className="glass w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 md:p-8 border border-white/10">
        <div className="flex justify-between items-center border-b border-white/10 pb-4 mb-5">
          <h2 className="text-lg font-bold text-[#00f0ff] flex items-center gap-3">
            <i className="fa-solid fa-receipt"></i>
            جدول حساب التكاليف وفاتورة المواد (BOM)
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-[#ff3d00] text-xl cursor-pointer">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* Scrollable Items list */}
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-right border-collapse text-xs">
            <thead>
              <tr className="border-b-2 border-white/10 text-[#00f0ff]">
                <th className="py-2.5 px-2">المكون الرئيسي</th>
                <th className="py-2.5 px-2">الماركة / الموديل</th>
                <th className="py-2.5 px-2 text-center">الكمية</th>
                <th className="py-2.5 px-2">سعر المفرد</th>
                <th className="py-2.5 px-2 font-bold">الإجمالي</th>
                <th className="py-2.5 px-2 text-center">حذف</th>
              </tr>
            </thead>
            <tbody>
              {cartItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 text-xs">
                    سلة المكونات فارغة حالياً. اضغط أو اسحب الأجهزة إلى بيئة المحاكاة لتسعير المنظومة ومعدل تركيبها.
                  </td>
                </tr>
              ) : (
                cartItems.map((item) => (
                  <tr key={item.id} className="border-b border-white/5 hover:bg-white/2 text-slate-200">
                    <td className="py-3 px-2 font-semibold text-[#00f0ff]">{item.name}</td>
                    <td className="py-3 px-2 text-[11px] text-slate-350">{item.model}</td>
                    <td className="py-3 px-2 text-center font-bold">{item.qty}</td>
                    <td className="py-3 px-2 font-sans">{item.unitPrice} $</td>
                    <td className="py-3 px-2 font-bold text-[#ffd600] font-sans">{item.totalPrice} $</td>
                    <td className="py-3 px-2 text-center">
                      <button 
                        onClick={() => onRemoveItem(item.id)}
                        className="text-slate-500 hover:text-[#ff3d00] transition-colors cursor-pointer"
                        title="حذف المكون"
                      >
                        <i className="fa-solid fa-trash-can"></i>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="bg-white/3 border border-white/10 rounded-lg p-5 flex flex-col gap-3.5 mb-6">
          <div className="flex justify-between text-xs text-slate-400">
            <span>إجمالي تكلفة الأجهزة والمعدات الأساسية:</span>
            <span className="font-semibold text-white font-sans">{calcs.hardwareCost.toFixed(0)} $</span>
          </div>
          <div className="flex justify-between text-xs text-slate-400">
            <span>كابلات نحاسية، هياكل تثبيت حديد، قواطع DC+AC (تقديري 15%):</span>
            <span className="font-semibold text-white font-sans">{calcs.accessoriesCost.toFixed(0)} $</span>
          </div>
          <div className="flex justify-between text-xs text-slate-400">
            <span>أجور التركيب، فحوصات المهندسين، والربط (تقديري 8%):</span>
            <span className="font-semibold text-white font-sans">{calcs.installationCost.toFixed(0)} $</span>
          </div>
          <div className="h-[1px] bg-white/10 my-1"></div>
          <div className="flex justify-between items-center text-sm font-bold text-[#00f0ff]">
            <span>الكلفة التقريبية الكلية لتشغيل المنظومة:</span>
            <span className="text-xl font-extrabold font-sans text-[#00f0ff]">{calcs.grandTotal.toFixed(0)} $</span>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-end">
          <button 
            onClick={handleWhatsAppCheckout}
            className="bg-[#25d366] hover:bg-[#20b355] text-white font-semibold py-2.5 px-5 rounded-lg text-xs flex items-center justify-center gap-2 cursor-pointer transition shadow-[0_4px_15px_rgba(37,211,102,0.25)] hover:scale-102 select-none"
          >
            <i className="fa-brands fa-whatsapp text-sm"></i>
            حجز كشف موقع على السطح وإرسال التصميم بالواتساب
          </button>
          
          <button 
            onClick={handleAddToCart}
            className="border border-[#00e676]/30 bg-[#00e676]/10 hover:bg-[#00e676]/25 text-[#00e676] font-semibold py-2.5 px-5 rounded-lg text-xs flex items-center justify-center gap-2 cursor-pointer transition select-none"
          >
            <i className="fa-solid fa-bag-shopping"></i>
            حفظ واستيراد الفاتورة كملف شراء
          </button>
        </div>
      </div>
    </div>
  );
}
