'use client';
import { useEffect, useState } from 'react';

export default function ClientDate() {
  const [date, setDate] = useState('');
  useEffect(() => {
    setDate(new Date().toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric'
    }).toUpperCase());
  }, []);
  return (
    <div className="font-mono text-white/30 text-[10px] tracking-[0.3em] uppercase">
      {date}
    </div>
  );
}