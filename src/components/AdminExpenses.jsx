import React, { useState } from 'react';
import { TrendingDown, Upload, Search, Printer, AlertCircle, CheckCircle, X } from 'lucide-react';

// Sabit değişkeni fonksiyonun dışına taşıyoruz
const EXPENSE_CATEGORIES = ['Elektrik', 'Su', 'Asansör', 'Temizlik', 'Maaş/SGK', 'Kıdem Tazminatı Fonu', 'Bakım/Onarım', 'Diğer'];

export default function AdminExpenses({ transactions, onAddTransaction, onAddBulkTransactions }) {
  const [amount, setAmount] = useState('');
  const [desc, setDesc] = useState('');
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [sysMessage, setSysMessage] = useState(null);

  const showMessage = (text, type = 'success') => { 
    setSysMessage({ text, type }); 
    setTimeout(() => setSysMessage(null), 4000); 
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (amount && desc && expenseDate) {
      onAddTransaction({ 
        type: 'expense', 
        amount: Number(amount), 
        unitId: null, 
        category: category, 
        description: desc, 
        date: expenseDate 
      });
      setAmount('');
      setDesc('');
      setExpenseDate(new Date().toISOString().split('T')[0]);
      showMessage("Gider başarıyla kaydedildi.");
    }
  };

  return (
    <div className="space-y-6">
      {sysMessage && (
        <div className={`p-4 rounded-lg flex items-center shadow-md ${sysMessage.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
          <CheckCircle className="mr-2" size={20} />
          <span className="font-medium">{sysMessage.text}</span>
        </div>
      )}

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <h3 className="font-bold text-lg mb-4">Yeni Gider Ekle</h3>
        <form onSubmit={handleSubmit} className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[150px]">
            <label className="block text-sm font-medium text-slate-700 mb-1">Tarih</label>
            <input type="date" required className="w-full border border-slate-300 rounded-lg px-4 py-2" value={expenseDate} onChange={e => setExpenseDate(e.target.value)} />
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="block text-sm font-medium text-slate-700 mb-1">Kategori</label>
            <select className="w-full border border-slate-300 rounded-lg px-4 py-2" value={category} onChange={e => setCategory(e.target.value)}>
              {EXPENSE_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
          <div className="flex-2 min-w-[200px]">
            <label className="block text-sm font-medium text-slate-700 mb-1">Açıklama</label>
            <input type="text" required placeholder="Örn: Asansör bakım ücreti" className="w-full border border-slate-300 rounded-lg px-4 py-2" value={desc} onChange={e => setDesc(e.target.value)} />
          </div>
          <div className="flex-1 min-w-[120px]">
            <label className="block text-sm font-medium text-slate-700 mb-1">Tutar (TL)</label>
            <input type="number" required placeholder="0" className="w-full border border-slate-300 rounded-lg px-4 py-2" value={amount} onChange={e => setAmount(e.target.value)} />
          </div>
          <button type="submit" className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 font-medium">Kaydet</button>
        </form>
      </div>
    </div>
  );
}