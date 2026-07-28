import React, { useState } from 'react';
function AdminSettings({ settings, onUpdateSettings }) {
  const [formData, setFormData] = useState(settings);
  const [sysMessage, setSysMessage] = useState(null);

  const handleChange = (e) => {
    const val = e.target.value;
    setFormData({ ...formData, [e.target.name]: val === '' ? '' : Number(val) });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const success = await onUpdateSettings(formData);
    if (success) {
      setSysMessage({ text: 'Sistem parametreleri başarıyla güncellendi.', type: 'success' });
    } else {
      setSysMessage({ text: 'Hata! Parametreler kaydedilemedi. Firebase kurallarını kontrol edin.', type: 'error' });
    }
    setTimeout(() => setSysMessage(null), 4000);
  };

  return (
    <div className="space-y-6">
      {sysMessage && (
        <div className={`p-4 rounded-lg flex items-center shadow-md mb-4 ${sysMessage.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
          {sysMessage.type === 'error' ? <AlertCircle className="mr-2" size={20} /> : <CheckCircle className="mr-2" size={20} />}<span className="font-medium">{sysMessage.text}</span>
        </div>
      )}

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <h2 className="text-xl font-bold text-slate-800 mb-2 flex items-center"><Settings className="mr-2 text-slate-500" /> Bütçe ve Maaş Parametreleri</h2>
        <p className="text-slate-500 text-sm mb-6 border-b border-slate-100 pb-4">Burada belirlediğiniz güncel oranlar, Genel Kurul sekmesindeki "Akıllı Bütçe Planlayıcı" tarafından baz alınacak ve tüm hesaplamalarda (personel maaşı, SGK maliyeti vs.) otomatik olarak kullanılacaktır.</p>
        
        <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
          <div className="bg-blue-50 p-5 rounded-lg border border-blue-100 space-y-4">
            <h3 className="font-bold text-blue-800 flex items-center mb-2"><User className="mr-2" size={18}/> Personel ve Maaş Ayarları</h3>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tahmini Brüt Asgari Ücret (Aylık TL)</label>
              <input type="number" name="grossMinimumWage" value={formData.grossMinimumWage} onChange={handleChange} required className="w-full border border-slate-300 rounded-lg px-4 py-2 bg-white focus:ring-2 focus:ring-blue-500 outline-none" />
              <p className="text-xs text-slate-500 mt-1">Bu tutar üzerinden işveren SGK payı ve kıdem tazminatı hesaplanır.</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">SGK İşveren Payı (%)</label>
                <div className="relative">
                  <input type="number" step="0.01" name="sgkEmployerRate" value={formData.sgkEmployerRate} onChange={handleChange} required className="w-full border border-slate-300 rounded-lg pl-4 pr-8 py-2 bg-white focus:ring-2 focus:ring-blue-500 outline-none" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">SGK primi işveren payı %21.75'tir. Düzenli ödeme indirimi ile 5 puan inerek <strong>%16.75</strong> olarak uygulanabilir.</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">İşsizlik Sigortası Payı (%)</label>
                <div className="relative">
                  <input type="number" step="0.1" name="unemploymentRate" value={formData.unemploymentRate} onChange={handleChange} required className="w-full border border-slate-300 rounded-lg pl-4 pr-8 py-2 bg-white focus:ring-2 focus:ring-blue-500 outline-none" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">Örn: 2.0</p>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 p-5 rounded-lg border border-amber-100">
            <h3 className="font-bold text-amber-800 flex items-center mb-4"><TrendingUp className="mr-2" size={18}/> Piyasa Enflasyon Ayarı</h3>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Varsayılan Bütçe Artış Oranı (%)</label>
              <div className="relative">
                <input type="number" step="0.1" name="defaultInflationRate" value={formData.defaultInflationRate} onChange={handleChange} required className="w-full border border-slate-300 rounded-lg pl-4 pr-8 py-2 bg-white focus:ring-2 focus:ring-amber-500 outline-none" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">Geçmiş faturalara (Elektrik, Su vs.) gelecek yıl için yansıtılacak tahmini zam oranı.</p>
            </div>
          </div>

          <button type="submit" className="bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 px-8 rounded-lg transition-colors shadow-sm">
            Ayarları Kaydet ve Uygula
          </button>
        </form>
      </div>

      <div className="mt-8 pb-4 text-center border-t border-slate-200 pt-4 no-print">
        <p className="text-xs text-slate-400 font-medium tracking-widest uppercase">
          © 2026 Yükseller Apartmanı • <span className="text-slate-500">Geliştiren: UKURTCU</span>
        </p>
      </div>
    </div>
  );
}
export default AdminSettings;
