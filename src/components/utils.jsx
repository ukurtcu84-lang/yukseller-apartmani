import React from 'react';

export const getTypeBadge = (type) => {
  switch(type) {
    case 'payment': return <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-xs font-bold whitespace-nowrap">Tahsilat</span>;
    case 'expense': return <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold whitespace-nowrap">Gider</span>;
    case 'due': return <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold whitespace-nowrap">Aidat Borcu</span>;
    case 'fixture': return <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-bold whitespace-nowrap">Demirbaş Borcu</span>;
    case 'extra': return <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs font-bold whitespace-nowrap">Ekstra Borç</span>;
    case 'custom': return <span className="bg-teal-100 text-teal-700 px-2 py-1 rounded text-xs font-bold whitespace-nowrap">Özel Borç</span>;
    case 'penalty': return <span className="bg-rose-100 text-rose-700 px-2 py-1 rounded text-xs font-bold whitespace-nowrap">Faiz / Ceza</span>;
    case 'system_marker': return <span className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded text-xs font-bold whitespace-nowrap">Sistem Kontrolü</span>;
    default: return <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs font-bold whitespace-nowrap">{type}</span>;
  }
};

