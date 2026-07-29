import React, { useState, useEffect } from 'react';
import { BookOpen, Printer, Calculator } from 'lucide-react';

export default function AdminAssembly({ units, computations, transactions, settings }) {
  const [docType, setDocType] = useState('butce'); 
  const [meetingType, setMeetingType] = useState('olagan'); 
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingTime, setMeetingTime] = useState('14:00');
  const [meetingPlace, setMeetingPlace] = useState('Site Toplantı Salonu');
  const [extraAgenda, setExtraAgenda] = useState('Acil onarım konularının görüşülmesi');
  const [inflationRate, setInflationRate] = useState(settings.defaultInflationRate || 35); 
  const [budgetItems, setBudgetItems] = useState([]);

  const { totalKasa, totalGider } = computations;
  const totalTahsilat = transactions.filter(t => t.type === 'payment').reduce((acc, t) => acc + t.amount, 0);

  const personelMonthly = (settings.grossMinimumWage * 1.5) * (1 + (settings.sgkEmployerRate + settings.unemploymentRate) / 100);
  const otherMonthly = totalGider > 0 ? totalGider / 12 : 15000;

  useEffect(() => {
    handleGenerateBudget();
  }, [inflationRate, settings]);

  const handleGenerateBudget = () => {
    const multiplier = 1 + (inflationRate / 100);
    const items = [
      { id: 1, category: 'Personel (Kapıcı/Temizlik)', monthly: Math.round(personelMonthly), annual: Math.round(personelMonthly * 12), note: 'Asgari ücret ve SGK işveren payı dahildir.' },
      { id: 2, category: 'Elektrik (Ortak Alan)', monthly: Math.round(otherMonthly * 0.3 * multiplier), annual: Math.round(otherMonthly * 0.3 * multiplier * 12), note: 'Asansör ve koridor aydınlatmaları.' },
      { id: 3, category: 'Su (Ortak Alan / Bahçe)', monthly: Math.round(otherMonthly * 0.1 * multiplier), annual: Math.round(otherMonthly * 0.1 * multiplier * 12), note: 'Peyzaj sulama ve ortak musluklar.' },
      { id: 4, category: 'Asansör Bakım ve Servis', monthly: Math.round(otherMonthly * 0.2 * multiplier), annual: Math.round(otherMonthly * 0.2 * multiplier * 12), note: 'Aylık periyodik bakım ve sertifikasyon.' },
      { id: 5, category: 'Temizlik Malzemeleri', monthly: Math.round(otherMonthly * 0.1 * multiplier), annual: Math.round(otherMonthly * 0.1 * multiplier * 12), note: 'Deterjan, çöp torbası vb.' },
      { id: 6, category: 'Bakım, Onarım ve Acil Giderler', monthly: Math.round(otherMonthly * 0.2 * multiplier), annual: Math.round(otherMonthly * 0.2 * multiplier * 12), note: 'Tesisat arızaları, boya badana vb.' },
      { id: 7, category: 'Müşavirlik / Kırtasiye / Posta', monthly: Math.round(otherMonthly * 0.1 * multiplier), annual: Math.round(otherMonthly * 0.1 * multiplier * 12), note: 'Noter, defter tasdiki ve posta masrafları.' }
    ];
    setBudgetItems(items);
  };

  const handleBudgetChange = (id, field, value) => {
    setBudgetItems(items => items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value === '' ? '' : Number(value) };
        if (field === 'monthly') updated.annual = Number(value) * 12;
        if (field === 'annual') updated.monthly = Math.round(Number(value) / 12);
        return updated;
      }
      return item;
    }));
  };

  const totalAnnualBudget = budgetItems.reduce((sum, item) => sum + Number(item.amount || item.annual || 0), 0);
  const totalArsaPayi = units.reduce((sum, u) => sum + (u.arsaPayi || 100), 0);
  const monthlyPerArsa = totalArsaPayi > 0 ? (totalAnnualBudget / 12) / totalArsaPayi : 0;

  const handlePrint = (elementId) => {
    const el = document.getElementById(elementId);
    if (!el) return;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Yazdır - Yükseller Apartmanı</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
              @page { size: A4 portrait; margin: 12mm; }
              @media print {
                body { -webkit-print-color-adjust: exact; print-color-adjust: exact; font-size: 11pt; }
                .no-print { display: none !important; }
                .print-only { display: block !important; }
                table { page-break-inside: auto; font-size: 10pt; width: 100%; min-width: auto !important; }
                tr { page-break-inside: avoid; page-break-after: auto; }
                thead { display: table-header-group; }
                th, td { padding: 6px 8px !important; }
              }
            </style>
          </head>
          <body>${el.innerHTML}<script>setTimeout(() => {window.print(); window.close();}, 1000);</script></body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 no-print">
        <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center"><BookOpen className="mr-2 text-blue-600" /> Genel Kurul & Bütçe Evrakları</h2>
        <div className="flex flex-wrap gap-4 items-center mb-6 bg-slate-50 p-4 rounded-lg border border-slate-200">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Evrak Türü</label>
            <select className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white outline-none font-medium" value={docType} onChange={e => setDocType(e.target.value)}>
              <option value="butce">İşletme Projesi (Bütçe Taslağı)</option>
              <option value="cagri">Genel Kurul Çağrı / Davet Mektubu</option>
              <option value="tutanak">Genel Kurul Toplantı Tutanağı</option>
            </select>
          </div>
          {docType !== 'butce' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Toplantı Türü</label>
                <select className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white outline-none font-medium" value={meetingType} onChange={e => setMeetingType(e.target.value)}>
                  <option value="olagan">Olağan Genel Kurul</option>
                  <option value="olaganustu">Olağanüstü Genel Kurul</option>
                </select>
              </div>
              <div><label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Tarih</label><input type="date" className="border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none" value={meetingDate} onChange={e => setMeetingDate(e.target.value)} /></div>
              <div><label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Saat</label><input type="text" className="border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none w-24" value={meetingTime} onChange={e => setMeetingTime(e.target.value)} /></div>
              <div><label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Yer</label><input type="text" className="border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none" value={meetingPlace} onChange={e => setMeetingPlace(e.target.value)} /></div>
            </>
          )}
          {docType === 'butce' && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Simülasyon Enflasyon Oranı (%)</label>
              <div className="flex items-center gap-2">
                <input type="number" className="border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none w-24 font-bold text-blue-600" value={inflationRate} onChange={e => setInflationRate(Number(e.target.value))} />
                <button onClick={handleGenerateBudget} className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">Yeniden Hesapla</button>
              </div>
            </div>
          )}
        </div>
        <div className="flex justify-end"><button onClick={() => handlePrint('printable-assembly-doc')} className="bg-slate-800 text-white px-6 py-2.5 rounded-lg flex items-center hover:bg-slate-900 font-bold shadow-sm"><Printer size={18} className="mr-2"/> Belgeyi Yazdır</button></div>
      </div>

      <div className="bg-white p-10 rounded-xl shadow-sm border border-slate-200" id="printable-assembly-doc">
        {docType === 'butce' && (
          <div className="space-y-6">
            <div className="text-center border-b-2 border-slate-800 pb-4">
              <h2 className="text-2xl font-bold uppercase tracking-wide">Yükseller Apartmanı İşletme Projesi (Yıllık Bütçe Taslağı)</h2>
              <p className="text-slate-600 mt-1">Kat Mülkiyeti Kanunu (KMK) Madde 37 Gereğince Hazırlanmıştır</p>
            </div>
            
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-sm space-y-1">
              <p><strong>Brüt Asgari Ücret Bazı:</strong> {settings.grossMinimumWage.toLocaleString('tr-TR')} TL</p>
              <p><strong>SGK İşveren Payı:</strong> %{settings.sgkEmployerRate} | <strong>İşsizlik Payı:</strong> %{settings.unemploymentRate}</p>
              <p><strong>Uygulanan Enflasyon / Artış Oranı:</strong> %{inflationRate}</p>
            </div>

            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-slate-100 border-b border-slate-300">
                <tr><th className="p-3 border">Gider Kalemi / Açıklama</th><th className="p-3 border text-right">Aylık Tutar (TL)</th><th className="p-3 border text-right">Yıllık Toplam (TL)</th><th className="p-3 border">Notlar</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {budgetItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="p-3 border font-medium text-slate-800">{item.category}</td>
                    <td className="p-3 border text-right"><input type="number" className="w-28 text-right border rounded px-2 py-1 font-mono bg-white no-print" value={item.monthly} onChange={e => handleBudgetChange(item.id, 'monthly', e.target.value)} /><span className="print-only">{item.monthly.toLocaleString('tr-TR')} TL</span></td>
                    <td className="p-3 border text-right font-bold font-mono">{Number(item.annual || 0).toLocaleString('tr-TR')} TL</td>
                    <td className="p-3 border text-xs text-slate-500">{item.note}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-400">
                  <td className="p-3 border">TOPLAM YILLIK BÜTÇE</td>
                  <td className="p-3 border text-right font-mono">{(totalAnnualBudget / 12).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</td>
                  <td className="p-3 border text-right font-mono text-blue-600">{totalAnnualBudget.toLocaleString('tr-TR')} TL</td>
                  <td className="p-3 border"></td>
                </tr>
              </tfoot>
            </table>

            <div className="mt-8 pt-4 border-t border-slate-300">
              <h3 className="font-bold text-lg mb-2">Arsa Payına Göre Dağılım Özeti</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Yukarıda dökümü yapılan toplam <strong>{totalAnnualBudget.toLocaleString('tr-TR')} TL</strong> tutarındaki yıllık işletme bütçesi, 
                toplam <strong>{totalArsaPayi}</strong> arsa payına oranlanmış olup, 1 arsa payına düşen aylık avans tutarı 
                <strong> {monthlyPerArsa.toFixed(2)} TL/Aylık</strong> olarak hesaplanmıştır. Her bağımsız bölüm sahibinin ödeyeceği 
                aidat, arsa payı ile bu birim fiyatın çarpılması suretiyle kesinleşecektir.
              </p>
            </div>
          </div>
        )}

        {docType !== 'butce' && (
          <div className="space-y-6">
            <div className="text-center border-b-2 border-slate-800 pb-4">
              <h2 className="text-2xl font-bold uppercase tracking-wide">Yükseller Apartmanı {meetingType === 'olagan' ? 'Olağan' : 'Olağanüstü'} Genel Kurul Toplantısı</h2>
              <p className="text-slate-600 mt-1">{docType === 'cagri' ? 'ÇAĞRI VE DAVET MEKTUBU' : 'TOPLANTI TUTANAĞI'}</p>
            </div>
            <div className="text-sm space-y-4 leading-relaxed">
              <p>Yükseller Apartmanı kat malikleri kurulunun {meetingType === 'olagan' ? 'olağan yıllık' : 'olağanüstü'} toplantısı, <strong>{meetingDate || '[Tarih Belirtilmedi]'}</strong> tarihinde saat <strong>{meetingTime}</strong>'da <strong>{meetingPlace}</strong> adresinde yapılacaktır.</p>
              <p>İlk toplantıda çoğunluk sağlanamadığı takdirde, ikinci toplantı aynı yerde ve bir hafta sonra aynı saatte gerçekleştirilecektir.</p>
              <h4 className="font-bold mt-4">GÜNDEM MADDELERİ:</h4>
              <ol className="list-decimal pl-6 space-y-2">
                <li>Açılış, yoklama ve toplantı başkanlığının seçimi,</li>
                <li>Yönetim kurulu faaliyet ve denetim raporlarının okunması ve ibrazı,</li>
                <li>Yeni dönemi kapsayan işletme projesinin (yıllık bütçe) görüşülmesi ve oylanması,</li>
                <li>Personel ücret artışları ve kıdem tazminatı karşılıklarının karara bağlanması,</li>
                <li>Gerekli görülen bakım, onarım ve tadilat işleri için yönetim kuruluna yetki verilmesi,</li>
                <li>{extraAgenda},</li>
                <li>Dilek, temenniler ve kapanış.</li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}