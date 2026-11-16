import React, { useState, useEffect } from 'react';
import { Monitor, Key, AlertTriangle, ShieldCheck, WifiOff, RefreshCw, LogOut } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, onSnapshot, collection, query } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCe8sw5gcCeDaMh6trdTF8Uei78ak2NYls",
  authDomain: "quiztok-school.firebaseapp.com",
  projectId: "quiztok-school",
  storageBucket: "quiztok-school.firebasestorage.app",
  messagingSenderId: "568743189022",
  appId: "1:568743189022:web:385389212000dc28926c0f"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const TEACHER_PASSWORD = "0486"; 

export default function ClassMonitorApp() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => sessionStorage.getItem('classMonitorAuth') === 'true');
  const [inputPassword, setInputPassword] = useState('');
  const [students, setStudents] = useState([]);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (inputPassword === TEACHER_PASSWORD) {
      await signInAnonymously(auth);
      sessionStorage.setItem('classMonitorAuth', 'true');
      setIsAuthenticated(true);
    } else {
      alert("비밀번호가 틀렸습니다.");
      setInputPassword('');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('classMonitorAuth');
    setIsAuthenticated(false);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setCurrentTime(Date.now());
    setTimeout(() => setIsRefreshing(false), 500);
  };

  useEffect(() => {
    if (isAuthenticated) {
      const interval = setInterval(() => setCurrentTime(Date.now()), 1000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const q = query(collection(db, 'class_monitor'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      data.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      setStudents(data);
    });
    return () => unsubscribe();
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 p-8 rounded-3xl shadow-2xl max-w-sm w-full space-y-6 text-center border border-slate-700">
          <Monitor className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
          <h1 className="text-2xl font-black text-white">로건 자습 모니터링</h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="password" placeholder="비밀번호" value={inputPassword} onChange={(e) => setInputPassword(e.target.value)} className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-xl focus:border-emerald-500 outline-none text-center text-xl tracking-[0.5em] font-bold text-white" autoFocus />
            <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-bold transition-colors">접속하기</button>
          </form>
        </div>
      </div>
    );
  }

  // ★ 변경: 오프라인 감지 시간을 15초(15000)에서 30초(30000)로 변경
  const onlineCount = students.filter(s => (currentTime - parseInt(s.lastPing)) <= 30000).length;

  return (
    <div className="min-h-screen bg-slate-100 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-emerald-100 p-3 rounded-2xl"><Monitor className="w-8 h-8 text-emerald-600" /></div>
            <div>
              <h1 className="text-2xl font-black text-slate-800">실시간 크롬북 현황판</h1>
              {/* ★ 텍스트 30초로 변경 */}
              <p className="text-slate-500 font-bold text-sm mt-1">30초 이상 신호가 없으면 오프라인(프로그램 중지 의심) 처리됩니다.</p>
            </div>
          </div>
          <div className="flex gap-4 items-center">
            <button onClick={handleRefresh} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors text-slate-600 flex items-center gap-2 font-bold px-4" title="수동 새로고침">
              <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
              상태 갱신
            </button>
            <div className="bg-slate-100 px-6 py-3 rounded-xl flex items-center gap-2">
              <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span></span>
              <span className="font-black text-slate-700">접속자: {onlineCount}명</span>
            </div>
            <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-500 transition-colors" title="로그아웃">
              <LogOut className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {students.length === 0 ? (
             <div className="col-span-full py-20 text-center text-slate-400 font-bold text-xl">아직 확장 프로그램을 실행한 학생이 없습니다.</div>
          ) : (
            students.map((student) => {
              // ★ 변경: 카드 오프라인 처리도 30초(30000)로 변경
              const isOffline = (currentTime - parseInt(student.lastPing)) > 30000; 
              const url = student.currentUrl || "";
              const title = student.title || "";
              const lowerUrl = url.toLowerCase();
              const lowerTitle = title.toLowerCase();
              const isDanger = !isOffline && (lowerUrl.includes("youtube.com") || lowerUrl.includes("webtoon") || lowerUrl.includes("game") || lowerUrl.includes("namu.wiki") || lowerTitle.includes("유튜브") || lowerTitle.includes("웹툰"));

              return (
                <div key={student.id} className={`relative p-5 rounded-2xl border-2 shadow-sm transition-all duration-300 ${isOffline ? 'bg-slate-200 border-slate-300' : isDanger ? 'bg-red-50 border-red-500 shadow-red-100' : 'bg-white border-emerald-300'}`}>
                  {isOffline && (
                    <div className="absolute inset-0 bg-slate-100/50 backdrop-blur-[1px] z-10 flex flex-col items-center justify-center rounded-2xl">
                      <WifiOff className="w-8 h-8 text-slate-500 mb-2" />
                      <span className="bg-slate-800 text-white px-3 py-1.5 rounded-lg font-bold text-sm shadow-lg">연결 끊김 / 딴짓 의심</span>
                    </div>
                  )}
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-black text-slate-800">{student.name}</h3>
                    {!isOffline && (
                      <div className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-black text-white ${isDanger ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`}>
                        {isDanger ? <><AlertTriangle className="w-3 h-3"/> 딴짓 감지</> : <><ShieldCheck className="w-3 h-3"/> 학업 중</>}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div>
                      <div className="text-xs font-bold text-slate-400 mb-0.5">현재 화면 (탭)</div>
                      <div className={`text-sm font-bold truncate ${isDanger ? 'text-red-700' : 'text-slate-700'}`}>{title.substring(0, 40) || '제목 없음'}</div>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-400 mb-0.5">웹 주소 (URL)</div>
                      <div className="text-xs font-mono truncate text-slate-500">{url}</div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  );
}
