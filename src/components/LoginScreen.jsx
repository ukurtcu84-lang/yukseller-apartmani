import React, { useState } from 'react';
import { Building, Lock } from 'lucide-react';

export default function LoginScreen({ onLogin, units }) {
  const [selectedRole, setSelectedRole] = useState('admin');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (selectedRole === 'admin') {
      if (password === '200584') {
        onLogin('admin');
      } else {
        setError('Hatalı yönetici şifresi!');
      }
    } else {
      const unit = units.find(u => u.id === selectedRole);
      if (unit && unit.password === password) {
        onLogin(selectedRole);
      } else {
        setError('Hatalı şifre!');
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex justify-center mb-6 text-blue-600"><Building size={48} /></div>
        <h1 className="text-2xl font-bold text-center text-slate-800 mb-2">Yükseller Apartmanı</h1>
        <p className="text-slate-500 text-center mb-8">Lütfen giriş yapmak istediğiniz rolü ve şifrenizi girin.</p>
        
        <form onSubmit={handleLoginSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Giriş Türü / Birim</label>
            <select className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white" value={selectedRole} onChange={(e) => { setSelectedRole(e.target.value); setError(''); setPassword(''); }}>
              <option value="admin">👨‍💼 Yönetici Girişi</option>
              <optgroup label="Daireler">{units.filter(u => u.type === 'daire').map(u => <option key={u.id} value={u.id}>🏠 {u.name}</option>)}</optgroup>
              <optgroup label="Dükkanlar">{units.filter(u => u.type === 'dukkan').map(u => <option key={u.id} value={u.id}>🏪 {u.name}</option>)}</optgroup>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Şifre</label>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="password" required className="w-full border border-slate-300 rounded-lg pl-10 pr-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Şifrenizi girin" value={password} onChange={(e) => { setPassword(e.target.value); setError(''); }} />
            </div>
            {error && <p className="text-red-500 text-sm mt-1 font-medium">{error}</p>}
          </div>
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors mt-2 shadow-md">Sisteme Giriş Yap</button>
        </form>
      </div>
      
      <p className="mt-6 text-[9px] text-slate-400 font-medium uppercase tracking-widest opacity-50">
        v2.0 • Ukurtcu Management System
      </p>
    </div>
  );
}
