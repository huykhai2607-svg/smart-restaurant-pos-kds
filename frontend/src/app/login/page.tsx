'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Lock,
  Building2,
  ShieldCheck,
  KeyRound,
  UtensilsCrossed,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Flame,
  Salad,
  Coffee,
  UserCheck,
} from 'lucide-react';
import { useCurrentAuth, DEMO_STAFF_ACCOUNTS } from '@/lib/auth-store';
import { useLiveStore } from '@/lib/live-store';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorParam = searchParams.get('error');

  const { session, isReady, login, loginWithApi, logout } = useCurrentAuth();
  const { branches, currentBranchId, setBranch, currentBranch } = useLiveStore();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Định tuyến đường dẫn theo vai trò thực tế
  const getTargetRoute = (role: string) => {
    const r = role.toLowerCase();
    if (r === 'cashier') return '/pos';
    if (r === 'cook' || r === 'kitchen') return '/kds';
    if (r === 'admin' || r === 'manager') return '/admin';
    return '/pos';
  };

  // Điều hướng an toàn với cơ chế fallback nếu soft navigation chậm
  const navigateTo = (route: string) => {
    router.push(route);
    setTimeout(() => {
      if (typeof window !== 'undefined' && window.location.pathname === '/login') {
        window.location.href = route;
      }
    }, 350);
  };

  // Xử lý đăng nhập từ Form
  const handleFormLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const idClean = identifier.trim();
    const passClean = password.trim();

    if (!idClean || !passClean) {
      setErrorMsg('Vui lòng nhập tên đăng nhập/email và mật khẩu.');
      return;
    }

    setIsLoggingIn(true);
    const branchName = currentBranch?.name || 'Chi nhánh 1 - Quận 1 (Flagship)';

    try {
      // 1. Kết nối Backend API thực tế
      const sessionData = await loginWithApi(idClean, passClean, branchName);
      navigateTo(getTargetRoute(sessionData.role));
    } catch (apiErr: any) {
      console.warn('Backend API login error:', apiErr?.message);

      // 2. Fallback nếu Backend chưa bật hoặc offline: Thử tìm trong DEMO_STAFF_ACCOUNTS
      const foundDemo = DEMO_STAFF_ACCOUNTS.find(
        (acc) =>
          acc.email.toLowerCase() === idClean.toLowerCase() ||
          acc.email.split('@')[0].toLowerCase() === idClean.toLowerCase()
      );

      if (foundDemo && passClean === foundDemo.password) {
        login({
          id: `${foundDemo.role}-${foundDemo.email.split('@')[0]}`,
          name: foundDemo.name,
          email: foundDemo.email,
          role: foundDemo.role,
          branchId: currentBranchId || 'branch-1',
          branchName,
        });
        navigateTo(foundDemo.targetRoute);
      } else {
        setErrorMsg(apiErr?.message || 'Tên đăng nhập hoặc mật khẩu không chính xác.');
        setIsLoggingIn(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-b from-amber-500/10 via-orange-500/5 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-gradient-to-tr from-blue-600/5 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-gradient-to-tl from-emerald-600/5 to-transparent blur-3xl pointer-events-none" />

      {/* Top Bar */}
      <div className="max-w-4xl mx-auto w-full flex items-center justify-between z-10 px-6 pt-6">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
            <UtensilsCrossed className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <span className="font-black text-sm text-white tracking-tight">
              Smart <span className="text-amber-400">Restaurant</span>
            </span>
            <p className="text-[10px] text-slate-500 font-medium">Hệ Thống Phân Quyền Vận Hành</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-1.5 shadow-sm">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Cổng Nội Bộ Nhân Viên</span>
        </div>
      </div>

      {/* Main Login Card */}
      <div className="max-w-md mx-auto w-full my-auto py-8 z-10 px-4">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex p-3.5 rounded-3xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mb-3.5 shadow-xl shadow-amber-500/10">
            <Lock className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Cổng Đăng Nhập Nội Bộ
          </h1>
          <p className="text-xs text-slate-400 mt-1.5 max-w-xs mx-auto leading-relaxed">
            Đăng nhập tài khoản phân quyền RBAC: Thu Ngân, Bếp hoặc Quản Trị
          </p>
        </div>

        {/* Thông báo nếu bị từ chối truy cập */}
        {errorParam === 'forbidden' && (
          <div className="mb-4 p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>Tài khoản hiện tại không có quyền vào khu vực đó. Vui lòng đăng nhập bằng tài khoản có vai trò phù hợp.</span>
          </div>
        )}

        {/* Banner nếu đang có phiên đăng nhập */}
        {isReady && session && (
          <div className="mb-4 p-3.5 rounded-2xl bg-slate-900 border border-amber-500/30 text-xs flex items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <UserCheck className="w-4 h-4" />
              </div>
              <div className="truncate">
                <p className="text-[10px] text-slate-400 font-medium">Đang đăng nhập:</p>
                <p className="font-bold text-white truncate">{session.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  const target = session.role === 'cook' ? '/kds' : session.role === 'admin' ? '/admin' : '/pos';
                  router.push(target);
                }}
                className="px-2.5 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold text-[11px] hover:bg-amber-400 transition-colors cursor-pointer"
              >
                Vào Làm Việc
              </button>
              <button
                type="button"
                onClick={() => logout()}
                className="px-2 py-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-rose-400 text-[11px] font-medium transition-colors cursor-pointer"
                title="Đăng xuất phiên hiện tại"
              >
                Thoát
              </button>
            </div>
          </div>
        )}

        {/* Card chính */}
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 shadow-2xl">
          {/* Branch Selector */}
          <div className="mb-5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Chi Nhánh Làm Việc:</span>
            </label>
            <select
              value={currentBranchId}
              onChange={(e) => setBranch(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold text-white focus:outline-none focus:border-amber-500/60 cursor-pointer transition-colors"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id} className="bg-slate-900">
                  {b.name} ({b.city})
                </option>
              ))}
            </select>
          </div>

          {/* Login Form */}
          <form onSubmit={handleFormLogin} className="space-y-3.5">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                Tên Đăng Nhập hoặc Email
              </label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Nhập tên đăng nhập hoặc email"
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500 transition-colors"
                required
                autoComplete="username"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                Mật Khẩu
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••"
                  className="w-full p-2.5 pr-10 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500 transition-colors"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2 disabled:opacity-70 active:scale-[0.98]"
            >
              {isLoggingIn ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-slate-950/40 border-t-slate-950 rounded-full animate-spin" />
                  <span>Đang đăng nhập...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Đăng Nhập Vào Hệ Thống</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Security badges */}
        <div className="mt-5 flex items-center justify-center gap-3 text-[11px] text-slate-600">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>RBAC Bảo Mật</span>
          </div>
          <span>•</span>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
            <span>Phiên Làm Việc Riêng</span>
          </div>
          <span>•</span>
          <div className="flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-purple-600" />
            <span>Đa Chi Nhánh</span>
          </div>
        </div>

        {/* Kitchen stations info */}
        <div className="mt-4 p-3 rounded-2xl bg-slate-900/60 border border-slate-800/60">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Trạm Bếp KDS Tự Động Định Tuyến</p>
          <div className="flex gap-2 flex-wrap">
            {[
              { label: 'Bếp Nóng', icon: <Flame className="w-3 h-3" />, color: 'text-amber-400 bg-amber-500/10 border border-amber-500/20' },
              { label: 'Bếp Lạnh', icon: <Salad className="w-3 h-3" />, color: 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' },
              { label: 'Pha Chế', icon: <Coffee className="w-3 h-3" />, color: 'text-sky-400 bg-sky-500/10 border border-sky-500/20' },
            ].map((s) => (
              <span key={s.label} className={`flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-lg ${s.color}`}>
                {s.icon}
                {s.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-4xl mx-auto w-full text-center text-[10px] text-slate-700 z-10 pb-6">
        Smart Restaurant POS & KDS v2.0 • Hệ Thống Quản Lý Nhà Hàng & Điều Phối Bếp Thông Minh
      </div>
    </div>
  );
}

export default function StaffLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
