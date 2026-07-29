import React from 'react';
import { Printer } from 'lucide-react';

export default function AdminReport({ computations, transactions }) {
  const { totalKasa } = computations;

  // Yazdırma Fonksiyonu (Bu dosyaya özel)
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
    <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200" id="auditor-report-print">
      <div className="flex justify-between items-center mb-8 border-b-2 border-slate-800 pb-4">
        <div>
          <h2 className="text-2xl font-bold uppercase tracking-wide text-slate-800">Yönetim Kurulu Faaliyet & Denetim Raporu</h2>
          <p className="text-slate-600 mt-1">Yükseller Apartmanı • Rapor Tarihi: {new Date().toLocaleDateString('tr-TR')}</p>
        </div>
        <button onClick={() => handlePrint('auditor-report-print')} className="no-print bg-slate-800 text-white px-5 py-2.5 rounded-lg flex items-center hover:bg-slate-900 font-bold transition-colors shadow-sm"><Printer size={18} className="mr-2"/> Raporu Yazdır</button>
      </div>

      <div className="space-y-6 text-slate-700 leading-relaxed text-justify">
        <p className="indent-8">Sayın Kat Malikleri;</p>
        <p className="indent-8">Yükseller Apartmanı Yönetim Kurulunun, geride bıraktığımız döneme ait gelir-gider hesapları, banka ve kasa hareketleri ile karar defteri, tarafımızca detaylı bir şekilde incelenmiştir.</p>
        <p className="indent-8">Yapılan denetimler sonucunda;</p>
        <ul className="list-disc pl-10 space-y-2">
          <li>Karar defterinin usulüne uygun tutulduğu, alınan kararların deftere işlenerek imza altına alındığı,</li>
          <li>Toplanan aidat ve demirbaş gelirlerinin makbuz veya banka dekontları karşılığında tahsil edildiği ve kayıtlara eksiksiz geçirildiği,</li>
          <li>Yapılan tüm harcamaların (elektrik, su, asansör, temizlik, bakım-onarım vb.) fatura veya geçerli yasal belgelere dayandığı, bu harcamaların site menfaatine ve piyasa koşullarına uygun olduğu,</li>
          <li>Kasa ve banka mevcudunun, muhasebe kayıtları ile tam bir mutabakat içinde olduğu ve an itibarıyla <strong>{totalKasa.toLocaleString('tr-TR')} TL</strong> net kasa/banka bakiyesi bulunduğu tespit edilmiştir.</li>
        </ul>
        <p className="indent-8">Ayrıca Yönetim Kurulunun, aidatlarını süresinde ödemeyen maliklere karşı Kat Mülkiyeti Kanunu'nun (KMK) 20. maddesi uyarınca aylık %5 gecikme tazminatı işletme ve takip yükümlülüğünü yerine getirdiği görülmüştür.</p>
        <p className="indent-8 font-medium">Netice itibarıyla; yapılan ara denetimlerde, yönetimin görevini layıkıyla, şeffaf ve başarılı bir şekilde yerine getirdiği, Yönetim Kurulunun hesap ve işlemlerinin usulüne tamamen uygun olduğu görülmüştür.</p>
        
        <div className="mt-16 pt-8 flex justify-between px-8 text-center">
          <div><p className="font-bold mb-8">Denetçi</p><p className="border-t border-slate-400 pt-2 w-48 mx-auto">(İmza)</p></div>
          <div><p className="font-bold mb-8">Denetçi</p><p className="border-t border-slate-400 pt-2 w-48 mx-auto">(İmza)</p></div>
          <div><p className="font-bold mb-8">Denetçi</p><p className="border-t border-slate-400 pt-2 w-48 mx-auto">(İmza)</p></div>
        </div>
      </div>
    </div>
  );
}
```eof
