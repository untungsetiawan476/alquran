"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Home, BookOpen, Gamepad2, HeartHandshake, Wrench, Search, Play, Pause,
  Volume2, Bookmark, CheckCircle2, ChevronLeft, Moon, Sun, RotateCcw,
  Settings2, Trophy, Compass, Heart, ChevronDown, Sparkles, MessageSquareHeart, X, Loader2
} from 'lucide-react';

// --- STYLES & FONTS INJECTION ---
const fontStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Amiri+Quran&family=Inter:wght@300;400;500;600;700&display=swap');
  
  .font-arabic { font-family: 'Amiri Quran', serif; line-height: 2.5; }
  .font-sans { font-family: 'Inter', sans-serif; }
  
  /* Smooth scrolling */
  html { scroll-behavior: smooth; }
  
  /* Hide scrollbar for clean UI */
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #10b981; border-radius: 4px; }
  .dark ::-webkit-scrollbar-thumb { background: #059669; }

  /* Hafalan Blur Effect */
  .blur-text { filter: blur(5px); transition: filter 0.3s ease; cursor: pointer; }
  .blur-text:hover { filter: blur(0px); }
  .blur-text.revealed { filter: blur(0px); }
`;

// --- TYPES ---
interface Surah {
  nomor: number;
  nama: string;
  namaLatin: string;
  jumlahAyat: number;
  tempatTurun: string;
  arti: string;
}

interface Ayat {
  nomorAyat: number;
  teksArab: string;
  teksLatin: string;
  teksIndonesia: string;
  audio: { "05": string };
}

interface SurahDetail extends Surah {
  ayat: Ayat[];
}

interface Doa {
  id: string;
  doa: string;
  ayat: string;
  latin: string;
  artinya: string;
}

interface LeaderboardEntry {
  name: string;
  score: number;
  date: string;
}

interface Question {
  questionAyat: Ayat;
  correctAyat: Ayat;
  options: Ayat[];
}

interface CustomDeviceOrientationEvent extends DeviceOrientationEvent {
  webkitCompassHeading?: number;
  requestPermission?: () => Promise<string>;
}

const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";

const callGeminiAPI = async (prompt: string): Promise<string> => {
  if (!GEMINI_API_KEY) {
    console.error("Gemini API key tidak ditemukan. Pastikan NEXT_PUBLIC_GEMINI_API_KEY sudah diset.");
    return "⚠️ API key tidak tersedia. Silakan hubungi pengembang.";
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
  const maxRetries = 3;

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Gemini API error:", errorData);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "Maaf, AI tidak dapat memberikan respons saat ini.";
    } catch (error) {
      if (i === maxRetries - 1) {
        console.error("Gemini API Error after retries:", error);
        return "Gagal terhubung ke AI. Silakan periksa koneksi internet Anda dan coba lagi.";
      }
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }
  return "Terjadi kesalahan yang tidak terduga.";
};

// --- CUSTOM HOOKS ---
function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    // Guard against server-side rendering
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.warn(error);
    }
  };
  return [storedValue, setValue] as const;
}

// --- MAIN APP COMPONENT ---
export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'quran' | 'quiz' | 'doa' | 'tools'>('home');
  const [isDarkMode, setIsDarkMode] = useLocalStorage('quran_theme_dark', false);

  // PWA Setup Effect
  useEffect(() => {
    const setupPWA = () => {
      const manifest = {
        name: "Qur'an Digital Learning App",
        short_name: "Qur'an App",
        start_url: "/",
        display: "standalone",
        background_color: isDarkMode ? "#0f172a" : "#ffffff",
        theme_color: "#10b981",
        icons: [
          { src: "https://cdn-icons-png.flaticon.com/512/3502/3502477.png", sizes: "192x192", type: "image/png" },
          { src: "https://cdn-icons-png.flaticon.com/512/3502/3502477.png", sizes: "512x512", type: "image/png" }
        ]
      };
      
      const manifestUrl = 'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(manifest));
      let link = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'manifest';
        document.head.appendChild(link);
      }
      link.href = manifestUrl;
    };
    setupPWA();
  }, [isDarkMode]);

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  return (
    <div className={`min-h-screen pb-20 font-sans transition-colors duration-300 ${isDarkMode ? 'dark bg-slate-900 text-slate-50' : 'bg-slate-50 text-slate-900'}`}>
      <style>{fontStyles}</style>
      
      {/* Header */}
      <header className="sticky top-0 z-40 px-4 py-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-emerald-100 dark:border-emerald-900/30 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-amber-500 bg-clip-text text-transparent">
            Qur&apos;an App
          </h1>
        </div>
        <button 
          onClick={() => setIsDarkMode(!isDarkMode)} 
          className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-amber-400 hover:bg-emerald-100 dark:hover:bg-slate-700 transition"
        >
          {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </header>

      {/* Main Content Area */}
      <main className="max-w-3xl mx-auto p-4 animate-in fade-in duration-500 slide-in-from-bottom-4">
        {activeTab === 'home' && <BerandaView setActiveTab={setActiveTab} />}
        {activeTab === 'quran' && <QuranView />}
        {activeTab === 'quiz' && <QuizView />}
        {activeTab === 'doa' && <DoaView />}
        {activeTab === 'tools' && <ToolsView />}
        
        {/* Footer info at the bottom of content */}
        <div className="mt-12 mb-6 text-center text-xs text-slate-400 dark:text-slate-500">
          <p>© 2026 Untung Setiawan – All Rights Reserved</p>
          <a href="https://saweria.co/Untungsetiawan" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 mt-2 text-amber-500 hover:text-amber-600 font-medium">
            <Heart className="w-3 h-3" /> Donasi via Saweria
          </a>
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)]">
        <div className="max-w-3xl mx-auto px-2 flex justify-between items-center h-16">
          <NavItem icon={<Home />} label="Beranda" active={activeTab === 'home'} onClick={() => setActiveTab('home')} />
          <NavItem icon={<BookOpen />} label="Al-Qur&apos;an" active={activeTab === 'quran'} onClick={() => setActiveTab('quran')} />
          <NavItem icon={<Gamepad2 />} label="Kuis" active={activeTab === 'quiz'} onClick={() => setActiveTab('quiz')} />
          <NavItem icon={<HeartHandshake />} label="Doa" active={activeTab === 'doa'} onClick={() => setActiveTab('doa')} />
          <NavItem icon={<Wrench />} label="Tools" active={activeTab === 'tools'} onClick={() => setActiveTab('tools')} />
        </div>
      </nav>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick} 
      className={`flex-1 flex flex-col items-center justify-center gap-1 h-full transition-all duration-300 ${active ? 'text-emerald-600 dark:text-emerald-400 scale-105' : 'text-slate-500 dark:text-slate-400 hover:text-emerald-500'}`}
    >
      <div className={`p-1 rounded-full ${active ? 'bg-emerald-100 dark:bg-emerald-900/30' : ''}`}>
        {React.isValidElement<{ className?: string }>(icon) 
          ? React.cloneElement(icon, { className: 'w-5 h-5' })
          : icon}
      </div>
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}

// ==========================================
// A. BERANDA
// ==========================================
function BerandaView({ setActiveTab }: { setActiveTab: (tab: 'home' | 'quran' | 'quiz' | 'doa' | 'tools') => void }) {
  const [lastRead] = useLocalStorage<{surahName: string, nomorSurah: number, ayat: number} | null>('quran_last_read', null);
  const [scores] = useLocalStorage<LeaderboardEntry[]>('quran_quiz_leaderboard', []);
  const topScore = scores.length > 0 ? Math.max(...scores.map(s => s.score)) : 0;

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
        <h2 className="text-2xl font-bold mb-1">Assalamu&apos;alaikum,</h2>
        <p className="text-emerald-50 mb-6">Selamat datang di Qur&apos;an Digital Learning App</p>
        
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 flex justify-between items-center">
          <div>
            <p className="text-xs text-emerald-100 mb-1 flex items-center gap-1"><Bookmark className="w-3 h-3"/> Terakhir Dibaca</p>
            {lastRead ? (
              <p className="font-semibold">{lastRead.surahName} - Ayat {lastRead.ayat}</p>
            ) : (
              <p className="font-semibold text-sm">Belum ada aktivitas membaca</p>
            )}
          </div>
          <button 
            onClick={() => setActiveTab('quran')}
            className="px-4 py-2 bg-white text-emerald-700 text-sm font-semibold rounded-lg shadow-sm hover:bg-emerald-50 transition"
          >
            Lanjut
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button onClick={() => setActiveTab('quran')} className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col items-center justify-center gap-2 hover:border-emerald-500 transition group">
          <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition">
            <BookOpen className="w-6 h-6" />
          </div>
          <span className="font-semibold text-sm">Baca Al-Qur&apos;an</span>
        </button>
        <button onClick={() => setActiveTab('quiz')} className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col items-center justify-center gap-2 hover:border-amber-500 transition group">
          <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-600 dark:text-amber-400 group-hover:scale-110 transition">
            <Gamepad2 className="w-6 h-6" />
          </div>
          <span className="font-semibold text-sm">Kuis Hafalan</span>
          {topScore > 0 && <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">Top Score: {topScore}</span>}
        </button>
        <button onClick={() => setActiveTab('doa')} className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col items-center justify-center gap-2 hover:border-teal-500 transition group">
          <div className="w-12 h-12 rounded-full bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center text-teal-600 dark:text-teal-400 group-hover:scale-110 transition">
            <HeartHandshake className="w-6 h-6" />
          </div>
          <span className="font-semibold text-sm">Doa Harian</span>
        </button>
        <button onClick={() => setActiveTab('tools')} className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col items-center justify-center gap-2 hover:border-blue-500 transition group">
          <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 transition">
            <Compass className="w-6 h-6" />
          </div>
          <span className="font-semibold text-sm">Arah Kiblat</span>
        </button>
      </div>
    </div>
  );
}

// ==========================================
// B. AL-QUR'AN
// ==========================================
function QuranView() {
  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSurah, setSelectedSurah] = useState<SurahDetail | null>(null);

  useEffect(() => {
    fetch('https://equran.id/api/v2/surat')
      .then(res => res.json())
      .then(data => { setSurahs(data.data); setLoading(false); })
      .catch(err => { console.error(err); setLoading(false); });
  }, []);

  const loadSurah = async (nomor: number) => {
    setLoading(true);
    try {
      const res = await fetch(`https://equran.id/api/v2/surat/${nomor}`);
      const data = await res.json();
      setSelectedSurah(data.data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  if (loading) return <LoadingSpinner text="Memuat Al-Qur&apos;an..." />;

  if (selectedSurah) {
    return <SurahReader surah={selectedSurah} onBack={() => setSelectedSurah(null)} />;
  }

  const filteredSurahs = surahs.filter(s => 
    s.namaLatin.toLowerCase().includes(search.toLowerCase()) || 
    s.arti.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input 
          type="text" 
          placeholder="Cari Surah (Misal: Al-Mulk)..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
        />
      </div>

      <div className="space-y-3">
        {filteredSurahs.map(surah => (
          <div 
            key={surah.nomor}
            onClick={() => loadSurah(surah.nomor)}
            className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 cursor-pointer flex items-center justify-between transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-700 flex items-center justify-center font-bold text-emerald-600 dark:text-emerald-400 border border-slate-200 dark:border-slate-600">
                {surah.nomor}
              </div>
              <div>
                <h3 className="font-bold text-lg">{surah.namaLatin}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">{surah.arti} • {surah.jumlahAyat} Ayat</p>
              </div>
            </div>
            <div className="text-right">
              <h4 className="font-arabic text-2xl text-emerald-700 dark:text-emerald-400">{surah.nama}</h4>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SurahReader({ surah, onBack }: { surah: SurahDetail, onBack: () => void }) {
  const [showLatin, setShowLatin] = useLocalStorage('quran_show_latin', true);
  const [showTranslation, setShowTranslation] = useLocalStorage('quran_show_trans', true);
  const [hafalanMode, setHafalanMode] = useLocalStorage('quran_hafalan_mode', false);
  const [autoPlay, setAutoPlay] = useState(false);
  const [playingAyat, setPlayingAyat] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [lastRead, setLastRead] = useLocalStorage<{surahName: string, nomorSurah: number, ayat: number} | null>('quran_last_read', null);
  const [revealedAyats, setRevealedAyats] = useState<Record<number, boolean>>({});
  
  // Gemini AI State
  const [tafsirData, setTafsirData] = useState<Record<number, string>>({});
  const [loadingTafsir, setLoadingTafsir] = useState<number | null>(null);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlayingAyat(null);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
    return () => stopAudio();
  }, [stopAudio]);

  const playAudio = (ayatNum: number) => {
    const ayat = surah.ayat.find(a => a.nomorAyat === ayatNum);
    if (!ayat) return;
    
    stopAudio();
    audioRef.current = new Audio(ayat.audio["05"]);
    audioRef.current.play();
    setPlayingAyat(ayatNum);

    audioRef.current.onended = () => {
      setPlayingAyat(null);
      if (autoPlay && ayatNum < surah.jumlahAyat) {
        setTimeout(() => playAudio(ayatNum + 1), 1000);
      }
    };
  };

  const toggleAudio = (ayatNum: number) => {
    if (playingAyat === ayatNum) {
      stopAudio();
    } else {
      playAudio(ayatNum);
    }
  };

  const saveLastRead = (ayat: Ayat) => {
    setLastRead({
      surahName: surah.namaLatin,
      nomorSurah: surah.nomor,
      ayat: ayat.nomorAyat
    });
  };

  const toggleReveal = (ayatNum: number) => {
    if (!hafalanMode) return;
    setRevealedAyats(prev => ({ ...prev, [ayatNum]: !prev[ayatNum] }));
  };

  const getAITafsir = async (ayat: Ayat) => {
    if (tafsirData[ayat.nomorAyat]) {
      const newData = { ...tafsirData };
      delete newData[ayat.nomorAyat];
      setTafsirData(newData);
      return;
    }

    setLoadingTafsir(ayat.nomorAyat);
    const prompt = `Berikan tafsir singkat, makna, dan hikmah yang bisa diambil dari Surah ${surah.namaLatin} ayat ${ayat.nomorAyat}. Ayat ini berbunyi: "${ayat.teksIndonesia}". Gunakan bahasa Indonesia yang menenangkan, mudah dipahami, dan Islami. Batasi penjelasan hingga maksimal 3 paragraf pendek.`;
    
    const response = await callGeminiAPI(prompt);
    setTafsirData(prev => ({ ...prev, [ayat.nomorAyat]: response }));
    setLoadingTafsir(null);
  };

  return (
    <div className="space-y-4 relative">
      <div className="sticky top-16 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-3 -mx-4 px-4 border-b border-slate-200 dark:border-slate-700 flex flex-wrap gap-2 items-center justify-between shadow-sm">
        <button onClick={onBack} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="flex-1 text-center">
          <h2 className="font-bold text-lg">{surah.namaLatin}</h2>
        </div>
        <button onClick={() => document.getElementById('quran-settings')?.classList.toggle('hidden')} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300">
          <Settings2 className="w-6 h-6" />
        </button>
      </div>

      <div id="quran-settings" className="hidden bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg mb-4 space-y-4">
        <h3 className="font-semibold text-sm uppercase tracking-wider text-slate-500 mb-2">Pengaturan Tampilan</h3>
        <label className="flex items-center justify-between">
          <span className="text-sm font-medium">Arab + Latin</span>
          <input type="checkbox" checked={showLatin} onChange={e => setShowLatin(e.target.checked)} className="toggle-checkbox" />
        </label>
        <label className="flex items-center justify-between">
          <span className="text-sm font-medium">Terjemahan</span>
          <input type="checkbox" checked={showTranslation} onChange={e => setShowTranslation(e.target.checked)} className="toggle-checkbox" />
        </label>
        <div className="border-t border-slate-200 dark:border-slate-700 my-2 pt-2"></div>
        <h3 className="font-semibold text-sm uppercase tracking-wider text-amber-600 dark:text-amber-500 mb-2">Mode Hafalan</h3>
        <label className="flex items-center justify-between">
          <span className="text-sm font-medium flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500"/> Aktifkan Blur Ayat</span>
          <input type="checkbox" checked={hafalanMode} onChange={e => setHafalanMode(e.target.checked)} className="toggle-checkbox" />
        </label>
        <label className="flex items-center justify-between">
          <span className="text-sm font-medium flex items-center gap-2"><Volume2 className="w-4 h-4 text-emerald-500"/> Auto Play Audio</span>
          <input type="checkbox" checked={autoPlay} onChange={e => setAutoPlay(e.target.checked)} className="toggle-checkbox" />
        </label>
      </div>

      <div className="space-y-6">
        {surah.nomor !== 1 && surah.nomor !== 9 && (
          <div className="text-center font-arabic text-3xl py-6 text-emerald-800 dark:text-emerald-400 border-b border-slate-200 dark:border-slate-800">
            بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
          </div>
        )}
        
        {surah.ayat.map((ayat) => {
          const isBookmarked = lastRead?.nomorSurah === surah.nomor && lastRead?.ayat === ayat.nomorAyat;
          const isPlaying = playingAyat === ayat.nomorAyat;
          const isBlurred = hafalanMode && !revealedAyats[ayat.nomorAyat];

          return (
            <div key={ayat.nomorAyat} id={`ayat-${ayat.nomorAyat}`} className={`p-4 rounded-xl border transition-colors ${isPlaying ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700'}`}>
              <div className="flex justify-between items-center mb-4">
                <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  {ayat.nomorAyat}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => getAITafsir(ayat)} className={`p-2 rounded-full ${tafsirData[ayat.nomorAyat] ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'} hover:scale-105 transition flex items-center justify-center`} title="Tafsir AI">
                    {loadingTafsir === ayat.nomorAyat ? <Loader2 className="w-4 h-4 animate-spin text-indigo-500" /> : <Sparkles className="w-4 h-4" />}
                  </button>
                  <button onClick={() => toggleAudio(ayat.nomorAyat)} className={`p-2 rounded-full ${isPlaying ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'} hover:scale-105 transition`}>
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                  </button>
                  <button onClick={() => saveLastRead(ayat)} className={`p-2 rounded-full ${isBookmarked ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'} hover:scale-105 transition`}>
                    <Bookmark className="w-4 h-4" fill={isBookmarked ? 'currentColor' : 'none'} />
                  </button>
                </div>
              </div>

              <div className="text-right mb-6">
                <p 
                  onClick={() => toggleReveal(ayat.nomorAyat)}
                  className={`font-arabic text-3xl md:text-4xl text-slate-800 dark:text-slate-100 leading-loose ${isBlurred ? 'blur-text select-none text-transparent text-shadow-blur' : ''}`}
                  style={isBlurred ? { textShadow: '0 0 15px rgba(16, 185, 129, 0.5)' } : {}}
                >
                  {ayat.teksArab}
                </p>
                {hafalanMode && isBlurred && <p className="text-xs text-emerald-500 mt-2 text-center w-full">Ketuk untuk melihat ayat</p>}
              </div>

              {(showLatin || showTranslation) && (
                <div className={`space-y-2 border-t border-slate-100 dark:border-slate-700 pt-4 ${hafalanMode ? 'hidden' : 'block'}`}>
                  {showLatin && <p className="text-emerald-700 dark:text-emerald-400 italic text-sm font-medium">{ayat.teksLatin}</p>}
                  {showTranslation && <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">{ayat.teksIndonesia}</p>}
                </div>
              )}

              {/* Gemini AI Tafsir Section */}
              {tafsirData[ayat.nomorAyat] && (
                <div className="mt-4 p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50 rounded-xl relative animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center gap-2 mb-2 text-indigo-700 dark:text-indigo-300 font-semibold text-sm">
                    <Sparkles className="w-4 h-4" /> Tafsir & Hikmah AI
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                    {tafsirData[ayat.nomorAyat].replace(/\*\*/g, '')}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ==========================================
// C. KUIS & LEADERBOARD
// ==========================================
function QuizView() {
  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [loading, setLoading] = useState(true);
  const [quizState, setQuizState] = useState<'setup' | 'playing' | 'result' | 'leaderboard'>('setup');
  
  // Setup State
  const [selSurah, setSelSurah] = useState<string>('67');
  const [searchSurah, setSearchSurah] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [ayatStart, setAyatStart] = useState<number>(1);
  const [ayatEnd, setAyatEnd] = useState<number>(30);
  const [qCount, setQCount] = useState<number>(5);
  const [useAudio, setUseAudio] = useState<boolean>(true);

  // Play State
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [score, setScore] = useState(0);
  const [audioRef, setAudioRef] = useState<HTMLAudioElement | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  
  // Leaderboard state
  const [leaderboard, setLeaderboard] = useLocalStorage<LeaderboardEntry[]>('quran_quiz_leaderboard', []);
  const [playerName, setPlayerName] = useState('');

  useEffect(() => {
    fetch('https://equran.id/api/v2/surat')
      .then(res => res.json())
      .then(data => { setSurahs(data.data); setLoading(false); });
  }, []);

  const selectedSurahObj = useMemo(() => surahs.find(s => s.nomor.toString() === selSurah), [surahs, selSurah]);
  
  useEffect(() => {
    if (selectedSurahObj) {
      setAyatStart(1);
      setAyatEnd(selectedSurahObj.jumlahAyat);
    }
  }, [selectedSurahObj]);

  const triggerPlayAudio = useCallback((q: Question) => {
    if (!useAudio) return;
    if (audioRef) audioRef.pause();
    const audio = new Audio(q.questionAyat.audio["05"]);
    setAudioRef(audio);
    setIsPlayingAudio(true);
    audio.play();
    audio.onended = () => setIsPlayingAudio(false);
  }, [useAudio, audioRef]);

  const startQuiz = async () => {
    setLoading(true);
    try {
      const res = await fetch(`https://equran.id/api/v2/surat/${selSurah}`);
      const data = await res.json();
      const ayatList: Ayat[] = data.data.ayat;
      
      const validAyats = ayatList.filter(a => a.nomorAyat >= ayatStart && a.nomorAyat <= ayatEnd);
      
      if (validAyats.length < 2) {
        alert("Rentang ayat terlalu sempit untuk membuat soal sambung ayat.");
        setLoading(false);
        return;
      }

      const generatedQ: Question[] = [];
      const actualQCount = Math.min(qCount, validAyats.length - 1); 

      const shuffledIndices = [...validAyats.slice(0, -1).keys()].sort(() => 0.5 - Math.random()).slice(0, actualQCount);

      for (const idx of shuffledIndices) {
        const questionAyat = validAyats[idx];
        const correctAyat = validAyats[idx + 1];
        
        const wrongOptions = ayatList
          .filter(a => a.nomorAyat !== correctAyat.nomorAyat)
          .sort(() => 0.5 - Math.random())
          .slice(0, 3);
        
        const options = [correctAyat, ...wrongOptions].sort(() => 0.5 - Math.random());
        
        generatedQ.push({
          questionAyat,
          correctAyat,
          options
        });
      }

      setQuestions(generatedQ);
      setScore(0);
      setCurrentQ(0);
      setQuizState('playing');
      
      if (useAudio) {
        setTimeout(() => triggerPlayAudio(generatedQ[0]), 500);
      }
    } catch (err) {
      console.error(err);
      alert("Gagal memuat soal.");
    }
    setLoading(false);
  };

  const playQuestionAudio = () => triggerPlayAudio(questions[currentQ]);

  useEffect(() => {
    return () => { if (audioRef) audioRef.pause(); };
  }, [audioRef]);

  const handleAnswer = (option: Ayat) => {
    if (selectedAnswer !== null) return; 
    
    const correct = questions[currentQ].correctAyat;
    setSelectedAnswer(option.nomorAyat);
    
    if (audioRef) audioRef.pause();
    
    if (option.nomorAyat === correct.nomorAyat) {
      setScore(s => s + 100);
    }

    setTimeout(() => {
      if (currentQ < questions.length - 1) {
        setCurrentQ(c => c + 1);
        setSelectedAnswer(null);
        if (useAudio) triggerPlayAudio(questions[currentQ + 1]);
      } else {
        setQuizState('result');
      }
    }, 1500);
  };

  const saveScore = () => {
    if (!playerName.trim()) return;
    const newBoard = [...leaderboard, { name: playerName, score, date: new Date().toLocaleDateString() }]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10); 
    setLeaderboard(newBoard);
    setQuizState('leaderboard');
  };

  if (loading) return <LoadingSpinner text="Memuat Data Kuis..." />;

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Gamepad2 className="w-6 h-6 text-amber-500" /> Kuis Sambung Ayat
        </h2>
        {quizState !== 'leaderboard' && (
          <button onClick={() => setQuizState('leaderboard')} className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <Trophy className="w-4 h-4"/> Leaderboard
          </button>
        )}
      </div>

      {quizState === 'setup' && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-4">
          
          <div className="relative">
            <label className="block text-sm font-medium mb-1">Cari & Pilih Surah</label>
            <div 
              onClick={() => setShowDropdown(!showDropdown)}
              className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-transparent flex justify-between items-center cursor-pointer hover:border-emerald-500 transition"
            >
              <span className="truncate">{selectedSurahObj ? `${selectedSurahObj.nomor}. ${selectedSurahObj.namaLatin}` : 'Pilih Surah'}</span>
              <ChevronDown className={`w-5 h-5 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
            </div>
            
            {showDropdown && (
              <div className="absolute z-10 w-full mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-64 overflow-y-auto">
                <div className="sticky top-0 bg-slate-50 dark:bg-slate-900 p-2 border-b border-slate-100 dark:border-slate-700">
                  <input
                    type="text"
                    placeholder="Ketik nama surah..."
                    value={searchSurah}
                    onChange={(e) => setSearchSurah(e.target.value)}
                    className="w-full p-2 pl-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 focus:outline-none focus:border-emerald-500 text-sm"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                {surahs.filter(s => s.namaLatin.toLowerCase().includes(searchSurah.toLowerCase())).length === 0 && (
                  <p className="p-4 text-center text-sm text-slate-500">Surah tidak ditemukan</p>
                )}
                {surahs.filter(s => s.namaLatin.toLowerCase().includes(searchSurah.toLowerCase())).map(s => (
                  <div
                    key={s.nomor}
                    onClick={() => { setSelSurah(s.nomor.toString()); setShowDropdown(false); setSearchSurah(''); }}
                    className="p-3 hover:bg-emerald-50 dark:hover:bg-slate-700 cursor-pointer border-b border-slate-50 dark:border-slate-700/50 last:border-0 text-sm font-medium flex justify-between"
                  >
                    <span>{s.nomor}. {s.namaLatin}</span>
                    <span className="text-slate-400 text-xs">{s.jumlahAyat} Ayat</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Mulai Ayat</label>
              <input type="number" min="1" value={ayatStart} onChange={e => setAyatStart(Number(e.target.value))} className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Sampai Ayat</label>
              <input type="number" min="2" max={selectedSurahObj?.jumlahAyat || 30} value={ayatEnd} onChange={e => setAyatEnd(Number(e.target.value))} className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-transparent" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Jumlah Soal</label>
            <input type="number" min="1" max="20" value={qCount} onChange={e => setQCount(Number(e.target.value))} className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-transparent" />
          </div>

          <label className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer">
            <input 
              type="checkbox" 
              checked={useAudio} 
              onChange={e => setUseAudio(e.target.checked)} 
              className="w-5 h-5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 dark:bg-slate-800"
            />
            <span className="text-sm font-semibold">Putar Audio Soal secara Otomatis</span>
          </label>
          
          <div className="pt-4">
            <button onClick={startQuiz} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2">
              <Play className="w-5 h-5 fill-current" /> Mulai Kuis Sambung Ayat
            </button>
            <p className="text-xs text-center text-slate-500 mt-3">Tebak sambungan ayat dari potongan ayat yang muncul/dibacakan.</p>
          </div>
        </div>
      )}

      {quizState === 'playing' && questions.length > 0 && (
        <div className="space-y-6">
          <div className="flex justify-between items-center text-sm font-bold text-slate-500">
            <span>Soal {currentQ + 1} / {questions.length}</span>
            <span className="text-amber-500">Skor: {score}</span>
          </div>
          
          <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-6 md:p-8 text-center flex flex-col items-center shadow-sm">
            {useAudio && (
              <button 
                onClick={playQuestionAudio}
                className={`w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center mb-4 transition-transform ${isPlayingAudio ? 'bg-amber-500 scale-110 shadow-lg shadow-amber-500/30' : 'bg-emerald-600 hover:bg-emerald-700 shadow-md'}`}
              >
                {isPlayingAudio ? <Volume2 className="w-8 h-8 md:w-10 md:h-10 text-white animate-pulse" /> : <Play className="w-8 h-8 md:w-10 md:h-10 text-white ml-2" />}
              </button>
            )}
            <p className="font-semibold text-emerald-800 dark:text-emerald-400 mb-2">Apa sambungan ayat selanjutnya?</p>
            <p className="font-arabic text-2xl md:text-3xl mt-2 text-slate-800 dark:text-slate-100 leading-loose">
              {questions[currentQ].questionAyat.teksArab}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {questions[currentQ].options.map((opt: Ayat, idx: number) => {
              const isCorrect = opt.nomorAyat === questions[currentQ].correctAyat.nomorAyat;
              const isSelected = selectedAnswer === opt.nomorAyat;
              
              let btnClass = "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-emerald-500 text-slate-800 dark:text-slate-200";
              if (selectedAnswer !== null) {
                if (isCorrect) btnClass = "bg-emerald-500 border-emerald-600 text-white shadow-md";
                else if (isSelected) btnClass = "bg-red-500 border-red-600 text-white";
                else btnClass = "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 opacity-50";
              }

              return (
                <button 
                  key={idx}
                  disabled={selectedAnswer !== null}
                  onClick={() => handleAnswer(opt)}
                  className={`p-4 rounded-xl border text-right font-arabic text-xl md:text-2xl transition-all leading-loose ${btnClass}`}
                >
                  {opt.teksArab}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {quizState === 'result' && (
        <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 text-center space-y-6">
          <Trophy className="w-20 h-20 mx-auto text-amber-500 mb-2" />
          <h3 className="text-2xl font-bold">Kuis Selesai!</h3>
          <div className="text-5xl font-black text-emerald-600 dark:text-emerald-400 my-4">
            {score} <span className="text-lg text-slate-500 font-normal">pts</span>
          </div>
          
          <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-700">
            <input 
              type="text" 
              placeholder="Masukkan Nama Anda" 
              value={playerName}
              onChange={e => setPlayerName(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-transparent text-center font-semibold"
            />
            <button onClick={saveScore} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow-md transition-all">
              Simpan ke Leaderboard
            </button>
            <button onClick={() => setQuizState('setup')} className="w-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold py-3 rounded-xl transition-all">
              Main Lagi
            </button>
          </div>
        </div>
      )}

      {quizState === 'leaderboard' && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-4">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold flex items-center gap-2"><Trophy className="w-5 h-5 text-amber-500"/> Top 10 Skor</h3>
            <button onClick={() => setQuizState('setup')} className="text-emerald-600 font-semibold text-sm">Kembali</button>
          </div>
          
          {leaderboard.length === 0 ? (
            <p className="text-center text-slate-500 py-8">Belum ada data. Jadilah yang pertama!</p>
          ) : (
            <div className="space-y-3">
              {leaderboard.map((entry, i) => (
                <div key={i} className="flex justify-between items-center p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <span className={`font-bold w-6 text-center ${i===0?'text-amber-500':i===1?'text-slate-400':i===2?'text-amber-700':'text-slate-500'}`}>#{i+1}</span>
                    <div>
                      <p className="font-bold">{entry.name}</p>
                      <p className="text-[10px] text-slate-500">{entry.date}</p>
                    </div>
                  </div>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{entry.score} pts</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ==========================================
// D. DOA & WIRID
// ==========================================
const doaHarianData: Doa[] = [
  { id: "1", doa: "Doa Masuk Rumah", ayat: "اَللّٰهُمَّ إِنِّي أَسْأَلُكَ خَيْرَ الْمَوْلَجِ وَخَيْرَ الْمَخْرَجِ بِاسْمِ اللهِ وَلَجْنَا، وبِاسْمِ اللهِ خَرَجْنَا، وَعَلَى اللهِ رَبِّنَا تَوَكَّلْنَا", latin: "Allâhumma innî as’aluka khairal maulaji wa khairal makhraji, bismillâhi walajnâ wa bismillâhi kharajnâ wa ‘ala-Llâhi rabbinâ tawakkalnâ", artinya: "Ya Allah, aku memohon kepada-Mu sebaik-baik tempat masuk dan sebaik-baik tempat keluar. Atas nama-Mu kami masuk dan atas nama-Mu kami keluar. Dan kepada Allah Tuhan kami, kami bertawakal." },
  { id: "2", doa: "Doa Keluar Rumah", ayat: "بِسْمِ اللهِ تَوَكَّلْتُ عَلَى اللهِ وَلَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللهِ", latin: "Bismillâhi tawakkaltu ‘alallâhi wa lâ ḫaula wa lâ quwwata illâ billâh(i)", artinya: "Dengan nama Allah, aku bertawakal kepada Allah. Tidak ada daya dan kekuatan kecuali dengan (pertolongan) Allah." },
  { id: "3", doa: "Doa Sebelum Tidur", ayat: "اَللّٰهُمَّ بِسْمِكَ أَحْيَا وَبِسْمِكَ أَمُوْتُ", latin: "Allâhumma bismika aḫyâ wa bismika amût(u)", artinya: "Ya Allah, dengan Nama-Mu, aku hidup dan dengan nama-Mu pula aku mati." },
  { id: "4", doa: "Doa Bangun Tidur", ayat: "اَلْحَمْدُ ِللّٰهِ الَّذِيْ أَحْيَانَا بَعْدَمَا أَمَاتَنَا وَإِلَيْهِ النُّشُوْرُ", latin: "Alḫamdulillâhil ladzî aḫyânâ ba‘da mâ amâtanâ wa ilaihin nusyûr(u)", artinya: "Segala puji bagi Allah yang menghidupkanku kembali setelah mematikanku dan hanya kepada-Nya akan bangkit." },
  { id: "5", doa: "Doa Masuk Kamar Mandi", ayat: "بِسْمِ اللهِ اَللّٰهُمَّ إِنِّيْ أَعُوْذُ بِكَ مِنَ الْخُبُثِ وَالْخَبَائِثِ", latin: "Bismillâhi allâhumma innî a‘ûdzu bika minal khubutsi wal khabâits(i)", artinya: "Dengan nama Allah, ya Allah, aku berlindung kepada-Mu dari godaan setan laki-laki dan setan perempuan (sesuatu yang keji dan menjijikkan)." },
  { id: "6", doa: "Doa Keluar Kamar Mandi", ayat: "غُفْرَانَكَ الْحَمْدُ لِلّٰهِ الَّذِيْ أَذْهَبَ عَنِّيْ الْأَذَى وَعَافَانِيْ", latin: "Ghufrânaka alḫamdulillâhil-ladzî adzhaba ‘annil adzâ wa ‘âfânî", artinya: "Dengan mengharap ampunan-Mu, segala puji bagi Allah yang telah menghilangkan penyakit dari tubuhku dan menyehatkan aku." },
  { id: "7", doa: "Doa Sebelum Makan", ayat: "اَللّٰهُمَّ بَارِكْ لَنَا فِيْمَا رَزَقْتَنَا وَقِنَا عَذَابَ النَّارِ", latin: "Allâhumma bârik lanâ fîmâ razaqtanâ waqinâ ‘adzâban nâr(i)", artinya: "Ya Allah, berkahilah apa yang telah Engkau anugerahkan kepada kami dan jagalah kami dari siksa neraka." },
  { id: "8", doa: "Doa Sesudah Makan", ayat: "اَلْحَمْدُ لِلّٰهِ الَّذِيْ أَطْعَمَنَا وَسَقَــــانَا وَجَعَلَنَا مِنَ الْمُسْلِمِيْنَ", latin: "Alḫamdulillâhilladzî ath‘amanâ wa saqânâ wa ja‘alanâ minal muslimîn(a)", artinya: "Segala puji bagi Allah yang telah memberi kami makan dan minum, serta menjadikan kami sebagai orang-orang yang berserah diri." },
  { id: "9", doa: "Doa Masuk Masjid", ayat: "اَللّٰهُمَّ اغْفِرْ لِيْ ذُنُوْبِيْ وَافْتَحْ لِيْ أَبْوَابَ رَحْمَتِكَ", latin: "Allâhummaghfir lî dzunûbî waftaḫ lî abwâba raḫmatik(a)", artinya: "Ya Allah, ampuni segala dosaku dan bukalah bagiku segala pintu rahmat-Mu." },
  { id: "10", doa: "Doa Keluar Masjid", ayat: "اَللّٰهُمَّ اغْفِرْ لِيْ ذُنُوْبِيْ وَافْتَحْ لِيْ أَبْوَابَ فَضْلِكَ", latin: "Allâhummaghfirlî dzunûbî waftaḫ lî abwâba fadl-lik(a)", artinya: "Ya Allah, ampuni segala dosaku. Bukakanlah bagiku segala pintu anugerahmu-Mu." },
  { id: "11", doa: "Doa Sesudah Adzan", ayat: "اَللّٰهُمَّ رَبَّ هٰذِهِ الدَّعْوَةِ التَّامَّةِ وَالصَّلَاةِ الْقَائِمَةِ اٰتِ سَيِّدَنَـا مُحَمَّـدًا ࣙالْوَسِيْلَةَ وَالْفَضِيْلَةَ ‎وَالدَّرَجَةَ الرَّفِيْعَةَ وَابْعَثْهُ مَقَامًا مَحْمُوْدًا ࣙالَّذِيْ وَعَدْتَهُ إِنَّكَ لَا تُخْلِفُ الْمِيْعَادَ", latin: "Allâhumma Rabba hâdzihid-da‘watit-tâmmati, wash-shalâtil-qâimati, âti sayyidanâ Muḫammada nil-wasîlata wal fadlîlata wad darajatar rafî‘ah, wab‘ats-hu maqâman maḫmûdani-lladzî wa‘adtah, innaka lâ tukhliful-mî‘âd(a)", artinya: "Ya Allah Tuhan yang memiliki seruan yang sempurna dan shalat yang tetap didirikan, karuniailah Nabi Muhammad wasilah (tempat yang luhur), keutamaan, dan derajat yang tinggi. Tempatkanlah beliau pada kependudukan yang terpuji yang telah Kaujanjikan. Sungguh Engkau tiada menyalahi janji, wahai dzat yang paling Penyayang." },
  { id: "12", doa: "Doa Bercermin", ayat: "اَللّٰهُمَّ كَمَا حَسَّنْتَ خَلْقِيْ فَحَسِّنْ خُلُقِيْ", latin: "Allâhumma kamâ ḫassanta khalqî faḫassin khuluqî", artinya: "Hai Tuhanku, sebagaimana telah Kaubaguskan kejadianku, maka baguskanlah perangaiku." },
  { id: "13", doa: "Doa Mengenakan Pakaian Baru", ayat: "اَللّٰهُمَّ لَكَ الْحَمْدُ أَنْتَ كَسَوْتَنِيْهِ أَسْأَلُكَ خَيْرَهُ وَخَيْرَ مَا صُنِعَ لَهُ وأَعُوْذُ بِكَ مِنْ شَرِّهِ وَشَرِّ مَا صُنِعَ لَهُ", latin: "Allâhumma lakal ḫamdu anta kasautanîhi, as-aluka khairahu wa khaira mâ shuni‘a lahû wa a‘ûdzu bika min syarrihi wa syarri mâ shuni‘a lahû", artinya: "Ya Allah bagi-Mu segala puji. Engkau telah memakaikannya untukku, aku memohon kepada-Mu kebaikannya dan kebaikan apa yang ia dijadikan untuknya, dan aku berlindung dari keburukannya dan keburukan apa yang ia dijadikan untuknya." },
  { id: "14", doa: "Doa Memakai Pakaian", ayat: "اَللّٰهُمَّ إِنِّي أَسْأَلُكَ مِنْ خَيْرِهِ وَخَيْرِ مَا هُوَ لَهُ، وَأَعُوْذُ بِكَ مِنْ شَرِّهِ وَشَرِّ مَا هُوَ لَهُ", latin: "Allâhumma innî as’aluka min khairihi wa khairi mâ huwa lahu, wa a‘ûdzubika min syarrihi wa syarri mâ huwa lahu", artinya: "Ya Allah, sungguh aku memohon kepada-Mu kebaikan pakaian ini dan kebaikan sesuatu yang di dalamnya, dan aku berlindung kepada-Mu dari keburukan pakaian ini dan keburukan sesuatu yang ada di dalamnya." },
  { id: "15", doa: "Doa Melepas Pakaian", ayat: "بِسْمِ اللهِ الَّذِيْ لَا إِلٰهَ إِلَّا هُوَ", latin: "Bismillâhil ladzî lâilâha illâ huwa", artinya: "Dengan nama Allah yang tiada tuhan selain Dia." },
  { id: "16", doa: "Doa saat Turun Hujan", ayat: "اَللّٰهُمَّ صَيِّبًا نَافِعًا", latin: "Allâhummâ shayyiban nâfi'an", artinya: "Ya Allah, turunkanlah pada kami hujan yang bermanfaat." },
  { id: "17", doa: "Doa setelah Hujan Reda", ayat: "مُطِرْنَا بِفَضْلِ اللهِ وَرَحْمَتِهِ", latin: "Muthirnâ bi fadhlillâhi wa raḫmatih.", artinya: "Semoga kita dihujani dengan anugerah dan rahmat Allah." },
  { id: "18", doa: "Doa untuk Kedua Orang Tua", ayat: "رَبِّ اغْفِرْ لِيْ وَلِوَالِدَيَّ وَارْحَمْهُمَا كَمَا رَبَّيَانِيْ صَغِيْرًا", latin: "Rabbighfir lî  wa li wâlidayya warḫamhumâ kamâ rabbayânî shaghîrâ.", artinya: "Tuhanku, ampunilah diriku dan kedua orang tuaku, sayangilah mereka sebagaimana mereka menyayangiku di waktu aku kecil." },
  { id: "19", doa: "Doa Masuk Pasar atau Mal", ayat: "بِاسْمِ اللّٰهِ، اَللّٰهُمَّ إنِّيْ أَسْأَلُكَ خَيْرَ هٰذِهِ السُّوْقِ وَخَيْرَ مَا فِيْهَا وَأَعُوْذُ بِكَ مِنْ شَرِّهَا وَشَرِّ مَا فِيْهَا، اَللّٰهُمَّ إِنِّيْ أَعُوْذُ بِكَ أنْ أُصِيْبَ فِيْهَا يَمِيْنًا فَاجِرَةً أَوْ صَفْقَةً خَاسِرَةً", latin: "Bismillâh allâhumma innî as-aluka khaira hâdzihi-s-sûqi wa khaira mâ fîhâ wa a‘ûdzubika min syarrihâ wa syarri mâ fîhâ. Allâhumma innî a‘ûdzubika an ushîba fîhâ yamînan fâjiratan au shafqatan khâsiratan", artinya: "Dengan nama Allah, ya Allah, aku memohon kebaikan dari pasar ini dan kebaikan dari apa yang ada di dalamnya. Aku berlindung dari keburukan pasar ini dan keburukan apa yang ada di dalamnya. Ya Allah, aku berlindung dari sumpah palsu dan transaksi yang merugikan." }
];

function DoaView() {
  const [search, setSearch] = useState('');
  const [bookmarks, setBookmarks] = useLocalStorage<string[]>('quran_doa_bookmarks', []);
  
  // Gemini AI State
  const [curhatInput, setCurhatInput] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isCurhatLoading, setIsCurhatLoading] = useState(false);
  const [showCurhat, setShowCurhat] = useState(false);
  
  const toggleBookmark = (id: string) => {
    if (bookmarks.includes(id)) {
      setBookmarks(bookmarks.filter(bId => bId !== id));
    } else {
      setBookmarks([...bookmarks, id]);
    }
  };

  const filteredDoas = doaHarianData.filter(d => d.doa.toLowerCase().includes(search.toLowerCase()));
  
  const sortedDoas = [...filteredDoas].sort((a, b) => {
    const aBook = bookmarks.includes(a.id) ? -1 : 1;
    const bBook = bookmarks.includes(b.id) ? -1 : 1;
    return aBook - bBook;
  });

  const handleCurhatAI = async () => {
    if (!curhatInput.trim()) return;
    setIsCurhatLoading(true);
    setAiResponse('');
    
    const prompt = `Saya adalah seorang muslim yang menggunakan aplikasi Qur'an. Saat ini saya merasa: "${curhatInput}". Berikan nasihat Islami yang sangat singkat (1 paragraf) untuk menenangkan saya, dan rekomendasikan satu doa dari Al-Qur'an atau Sunnah yang cocok untuk situasi saya beserta artinya. Jadikan bahasanya hangat, empatik, dan menyejukkan hati.`;
    
    const response = await callGeminiAPI(prompt);
    setAiResponse(response);
    setIsCurhatLoading(false);
  };

  return (
    <div className="space-y-4">
      
      {/* AI Curhat Banner */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-5 text-white shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
        <div className="flex justify-between items-center relative z-10">
          <div>
            <h3 className="font-bold text-lg flex items-center gap-2"><Sparkles className="w-5 h-5"/> Bingung cari doa?</h3>
            <p className="text-indigo-100 text-sm mt-1">Curhat ke AI, temukan doa yang pas untuk perasaanmu saat ini.</p>
          </div>
          <button 
            onClick={() => setShowCurhat(!showCurhat)}
            className="bg-white/20 hover:bg-white/30 p-2 rounded-xl transition backdrop-blur-sm"
          >
            {showCurhat ? <X className="w-5 h-5"/> : <MessageSquareHeart className="w-5 h-5"/>}
          </button>
        </div>
        
        {showCurhat && (
          <div className="mt-4 space-y-3 animate-in fade-in slide-in-from-top-2 relative z-10">
            <textarea 
              value={curhatInput}
              onChange={(e) => setCurhatInput(e.target.value)}
              placeholder="Contoh: Saya sedang merasa cemas karena besok mau ujian..."
              className="w-full bg-black/20 text-white placeholder:text-indigo-200 border border-white/20 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-white/50 resize-none h-20"
            />
            <button 
              onClick={handleCurhatAI}
              disabled={isCurhatLoading || !curhatInput.trim()}
              className="w-full bg-white text-indigo-600 font-bold py-2.5 rounded-xl shadow-sm hover:bg-indigo-50 disabled:opacity-70 flex justify-center items-center gap-2 transition"
            >
              {isCurhatLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Dapatkan Nasihat & Doa ✨
            </button>
            
            {aiResponse && (
              <div className="mt-4 bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-xl text-sm leading-relaxed">
                {aiResponse.split('\n').map((line, i) => (
                  <p key={i} className="mb-2 last:mb-0">{line.replace(/\*\*/g, '')}</p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input 
          type="text" 
          placeholder="Cari Doa..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
        />
      </div>

      <div className="space-y-4">
        {sortedDoas.map(doa => (
          <div key={doa.id} className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 relative overflow-hidden">
            {bookmarks.includes(doa.id) && <div className="absolute top-0 right-0 w-10 h-10 bg-amber-500/10 rounded-bl-full flex items-start justify-end p-2"><Bookmark className="w-3 h-3 text-amber-500 fill-current" /></div>}
            
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-bold text-lg text-emerald-700 dark:text-emerald-400 pr-8">{doa.doa}</h3>
              <button onClick={() => toggleBookmark(doa.id)} className="text-slate-400 hover:text-amber-500 transition">
                <Bookmark className="w-5 h-5" fill={bookmarks.includes(doa.id) ? 'currentColor' : 'none'} />
              </button>
            </div>
            
            <div className="space-y-4">
              <p className="font-arabic text-2xl text-right text-slate-800 dark:text-slate-100 leading-loose">{doa.ayat}</p>
              <div className="pt-3 border-t border-slate-100 dark:border-slate-700 space-y-2">
                <p className="italic text-emerald-600 dark:text-emerald-500 text-sm font-medium">{doa.latin}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">&quot;{doa.artinya}&quot;</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==========================================
// E. TOOLS (Tasbih & Kiblat)
// ==========================================
function ToolsView() {
  const [activeTool, setActiveTool] = useState<'tasbih' | 'kiblat'>('tasbih');
  
  return (
    <div className="space-y-6">
      <div className="flex p-1 bg-slate-200 dark:bg-slate-800 rounded-xl">
        <button 
          onClick={() => setActiveTool('tasbih')} 
          className={`flex-1 py-2 text-sm font-bold rounded-lg transition ${activeTool === 'tasbih' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500'}`}
        >
          Tasbih Digital
        </button>
        <button 
          onClick={() => setActiveTool('kiblat')} 
          className={`flex-1 py-2 text-sm font-bold rounded-lg transition ${activeTool === 'kiblat' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500'}`}
        >
          Kompas Kiblat
        </button>
      </div>

      {activeTool === 'tasbih' ? <TasbihTool /> : <KiblatTool />}
    </div>
  );
}

function TasbihTool() {
  const [count, setCount] = useLocalStorage('quran_tasbih_count', 0);
  
  const handleTap = () => {
    setCount(c => c + 1);
    if (navigator.vibrate) navigator.vibrate(50);
  };

  const handleReset = () => {
    if (confirm('Reset hitungan tasbih?')) setCount(0);
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center min-h-[400px]">
      <div className="text-center mb-8">
        <h3 className="text-lg font-bold text-slate-500 uppercase tracking-widest">Subhanallah</h3>
        <p className="text-xs text-slate-400">Ketuk lingkaran untuk menghitung</p>
      </div>

      <button 
        onClick={handleTap}
        className="w-48 h-48 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 shadow-[0_10px_40px_-10px_rgba(16,185,129,0.5)] flex items-center justify-center active:scale-95 transition-transform relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-white/20 rounded-full blur-2xl transform scale-50 -translate-y-10"></div>
        <span className="text-6xl font-black text-white relative z-10">{count}</span>
      </button>

      <button onClick={handleReset} className="mt-12 p-3 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 hover:text-red-500 transition flex items-center gap-2">
        <RotateCcw className="w-5 h-5" />
      </button>
    </div>
  );
}

function KiblatTool() {
  const [heading, setHeading] = useState<number | null>(null);
  const [qiblaAngle, setQiblaAngle] = useState<number | null>(null);
  const [error, setError] = useState<string>('');
  const [needsPermission, setNeedsPermission] = useState(false);

  useEffect(() => {
    // Check for permission API only on client
    if (typeof window !== 'undefined') {
      const hasPermissionAPI = typeof (DeviceOrientationEvent as unknown as CustomDeviceOrientationEvent).requestPermission === 'function';
      setNeedsPermission(hasPermissionAPI);
    }
  }, []);

  const calculateQibla = useCallback((lat: number, lon: number) => {
    const meccaLat = 21.422487 * (Math.PI / 180);
    const meccaLon = 39.826206 * (Math.PI / 180);
    const userLat = lat * (Math.PI / 180);
    const userLon = lon * (Math.PI / 180);

    const y = Math.sin(meccaLon - userLon);
    const x = Math.cos(userLat) * Math.tan(meccaLat) - Math.sin(userLat) * Math.cos(meccaLon - userLon);

    const qibla = Math.atan2(y, x) * (180 / Math.PI);
    setQiblaAngle((qibla + 360) % 360);
  }, []);

  const initLocation = useCallback(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => calculateQibla(pos.coords.latitude, pos.coords.longitude),
        (_err) => setError("Gagal mengambil lokasi. Aktifkan GPS.")
      );
    } else {
      setError("Geolocation tidak didukung di browser ini.");
    }
  }, [calculateQibla]);

  const handleOrientation = useCallback((event: DeviceOrientationEvent) => {
    const evt = event as CustomDeviceOrientationEvent;
    let alpha = evt.alpha;
    if (evt.webkitCompassHeading !== undefined) {
      alpha = evt.webkitCompassHeading;
      setHeading(alpha);
    } else if (alpha !== null) {
      setHeading(360 - alpha);
    }
  }, []);

  const requestCompassPermission = async () => {
    const evt = DeviceOrientationEvent as unknown as CustomDeviceOrientationEvent;
    if (evt.requestPermission) {
      try {
        const permissionState = await evt.requestPermission();
        if (permissionState === 'granted') {
          window.addEventListener('deviceorientation', handleOrientation, true);
        } else {
          setError('Akses kompas ditolak.');
        }
      } catch (_err) {
        setError('Error meminta akses kompas.');
      }
    } else {
      window.addEventListener('deviceorientationabsolute', handleOrientation as EventListener, true);
    }
    initLocation();
  };

  useEffect(() => {
    if (!needsPermission) {
      window.addEventListener('deviceorientationabsolute', handleOrientation as EventListener, true);
      initLocation();
    }
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation, true);
      window.removeEventListener('deviceorientationabsolute', handleOrientation as EventListener, true);
    };
  }, [needsPermission, handleOrientation, initLocation]);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center min-h-[400px]">
      <div className="text-center mb-8">
        <h3 className="text-lg font-bold">Arah Kiblat</h3>
        {error ? (
          <p className="text-sm text-red-500 mt-2">{error}</p>
        ) : (
          <p className="text-xs text-slate-500 mt-1">Sejajarkan panah hijau ke arah atas HP Anda</p>
        )}
      </div>

      {needsPermission ? (
        <button onClick={requestCompassPermission} className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold shadow-md">
          Izinkan Akses Kompas & Lokasi
        </button>
      ) : (
        <div className="relative w-64 h-64 border-4 border-slate-100 dark:border-slate-700 rounded-full flex items-center justify-center shadow-inner bg-slate-50 dark:bg-slate-900">
          <div className="absolute inset-0 rounded-full flex items-center justify-center text-slate-300 dark:text-slate-600 text-xs font-bold">
            <span className="absolute top-2">U</span>
            <span className="absolute bottom-2">S</span>
            <span className="absolute right-2">T</span>
            <span className="absolute left-2">B</span>
          </div>

          {heading === null || qiblaAngle === null ? (
            <p className="text-sm text-slate-400 px-4 text-center">Menunggu sensor... Putar HP Anda seperti angka 8.</p>
          ) : (
            <div 
              className="w-full h-full rounded-full transition-transform duration-200 ease-out relative"
              style={{ transform: `rotate(${-heading}deg)` }}
            >
              <div 
                className="absolute inset-0 flex items-start justify-center"
                style={{ transform: `rotate(${qiblaAngle}deg)` }}
              >
                <div className="w-1.5 h-1/2 bg-emerald-500 origin-bottom flex flex-col items-center -mt-2">
                  <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center mb-1 shadow-lg shadow-emerald-500/50">
                    <Compass className="w-4 h-4 text-white" />
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div className="w-4 h-4 rounded-full bg-slate-800 dark:bg-white absolute z-10 shadow-md border-2 border-white dark:border-slate-800"></div>
        </div>
      )}

      {qiblaAngle !== null && (
         <div className="mt-8 text-center bg-slate-100 dark:bg-slate-700/50 px-4 py-2 rounded-lg">
            <p className="text-xs text-slate-500 font-medium mb-1">Sudut Kiblat dari Utara</p>
            <p className="text-xl font-bold font-mono text-emerald-700 dark:text-emerald-400">{qiblaAngle.toFixed(1)}°</p>
         </div>
      )}
    </div>
  );
}

// --- UTILS ---
function LoadingSpinner({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 opacity-50">
      <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mb-4"></div>
      <p className="font-semibold">{text}</p>
    </div>
  );
}
