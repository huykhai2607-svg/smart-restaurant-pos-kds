'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useEffect, useState } from 'react';
import { UserRole } from './types';
import { apiClient } from './api-client';

export interface StaffSession {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  branchId: string;
  branchName: string;
  token?: string;
}

export const DEMO_STAFF_ACCOUNTS: Array<{
  username: string;
  email: string;
  password: string;
  name: string;
  role: UserRole;
  branchId: string;
  branchName: string;
  roleTitle: string;
  description: string;
  targetRoute: string;
  color: string;
  accentColor: string;
}> = [
  // Chi nhánh 1 - TP.HCM
  {
    username: 'admin_hcm',
    email: 'admin.hcm@smartpos.vn',
    password: '123456',
    name: 'Nguyễn Văn Minh (Quản Lý TP.HCM)',
    role: 'admin',
    branchId: 'branch-1',
    branchName: 'Chi nhánh 1 - Quận 1 (Flagship)',
    roleTitle: 'Quản Trị & Kho BOM',
    description: 'Quản lý định lượng nguyên liệu BOM, tồn kho và thống kê chi nhánh TP.HCM',
    targetRoute: '/admin',
    color: 'from-emerald-600 to-teal-600',
    accentColor: 'emerald',
  },
  {
    username: 'cashier_hcm',
    email: 'cashier.hcm@smartpos.vn',
    password: '123456',
    name: 'Trần Thị Thu (Thu Ngân TP.HCM)',
    role: 'cashier',
    branchId: 'branch-1',
    branchName: 'Chi nhánh 1 - Quận 1 (Flagship)',
    roleTitle: 'Thu Ngân & Bán Hàng',
    description: 'Quản lý sơ đồ bàn, gộp/tách bàn, in tạm tính và thanh toán tại TP.HCM',
    targetRoute: '/pos',
    color: 'from-blue-600 to-indigo-600',
    accentColor: 'blue',
  },
  {
    username: 'kitchen_hcm',
    email: 'kitchen.hcm@smartpos.vn',
    password: '123456',
    name: 'Đội Ngũ Bếp TP.HCM',
    role: 'cook',
    branchId: 'branch-1',
    branchName: 'Chi nhánh 1 - Quận 1 (Flagship)',
    roleTitle: 'Khu Vực Bếp (KDS)',
    description: 'Tiếp nhận order realtime và điều phối trạm bếp tại TP.HCM',
    targetRoute: '/kds',
    color: 'from-amber-500 to-orange-600',
    accentColor: 'amber',
  },
  // Chi nhánh 2 - Hà Nội
  {
    username: 'admin_hn',
    email: 'admin.hn@smartpos.vn',
    password: '123456',
    name: 'Phạm Thị Hạnh (Quản Lý Hà Nội)',
    role: 'admin',
    branchId: 'branch-2',
    branchName: 'Chi nhánh 2 - Cầu Giấy',
    roleTitle: 'Quản Trị & Kho BOM',
    description: 'Quản lý định lượng nguyên liệu BOM, tồn kho và thống kê chi nhánh Hà Nội',
    targetRoute: '/admin',
    color: 'from-emerald-600 to-teal-600',
    accentColor: 'emerald',
  },
  {
    username: 'cashier_hn',
    email: 'cashier.hn@smartpos.vn',
    password: '123456',
    name: 'Lê Minh Tuấn (Thu Ngân Hà Nội)',
    role: 'cashier',
    branchId: 'branch-2',
    branchName: 'Chi nhánh 2 - Cầu Giấy',
    roleTitle: 'Thu Ngân & Bán Hàng',
    description: 'Quản lý sơ đồ bàn, gộp/tách bàn, in tạm tính và thanh toán tại Hà Nội',
    targetRoute: '/pos',
    color: 'from-blue-600 to-indigo-600',
    accentColor: 'blue',
  },
  {
    username: 'kitchen_hn',
    email: 'kitchen.hn@smartpos.vn',
    password: '123456',
    name: 'Đội Ngũ Bếp Hà Nội',
    role: 'cook',
    branchId: 'branch-2',
    branchName: 'Chi nhánh 2 - Cầu Giấy',
    roleTitle: 'Khu Vực Bếp (KDS)',
    description: 'Tiếp nhận order realtime và điều phối trạm bếp tại Hà Nội',
    targetRoute: '/kds',
    color: 'from-amber-500 to-orange-600',
    accentColor: 'amber',
  },
  // Chi nhánh 3 - Đà Nẵng
  {
    username: 'admin_dn',
    email: 'admin.dn@smartpos.vn',
    password: '123456',
    name: 'Nguyễn Thị Lan (Quản Lý Đà Nẵng)',
    role: 'admin',
    branchId: 'branch-3',
    branchName: 'Chi nhánh 3 - Hải Châu',
    roleTitle: 'Quản Trị & Kho BOM',
    description: 'Quản lý định lượng nguyên liệu BOM, tồn kho và thống kê chi nhánh Đà Nẵng',
    targetRoute: '/admin',
    color: 'from-emerald-600 to-teal-600',
    accentColor: 'emerald',
  },
  {
    username: 'cashier_dn',
    email: 'cashier.dn@smartpos.vn',
    password: '123456',
    name: 'Trần Quốc Huy (Thu Ngân Đà Nẵng)',
    role: 'cashier',
    branchId: 'branch-3',
    branchName: 'Chi nhánh 3 - Hải Châu',
    roleTitle: 'Thu Ngân & Bán Hàng',
    description: 'Quản lý sơ đồ bàn, gộp/tách bàn, in tạm tính và thanh toán tại Đà Nẵng',
    targetRoute: '/pos',
    color: 'from-blue-600 to-indigo-600',
    accentColor: 'blue',
  },
  {
    username: 'kitchen_dn',
    email: 'kitchen.dn@smartpos.vn',
    password: '123456',
    name: 'Đội Ngũ Bếp Đà Nẵng',
    role: 'cook',
    branchId: 'branch-3',
    branchName: 'Chi nhánh 3 - Hải Châu',
    roleTitle: 'Khu Vực Bếp (KDS)',
    description: 'Tiếp nhận order realtime và điều phối trạm bếp tại Đà Nẵng',
    targetRoute: '/kds',
    color: 'from-amber-500 to-orange-600',
    accentColor: 'amber',
  },
];

interface AuthState {
  session: StaffSession | null;
  token: string | null;
  hasHydrated: boolean;
  login: (staffData: StaffSession, token?: string) => void;
  loginWithApi: (usernameOrEmail: string, password: string) => Promise<StaffSession>;
  logout: () => void;
  setHydrated: (value: boolean) => void;
}

const AUTH_STORAGE_KEY = 'pos_kds_staff_session_v3';
const TOKEN_STORAGE_KEY = 'pos_kds_access_token';

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      session: null,
      token: null,
      hasHydrated: false,
      login: (staffData: StaffSession, token?: string) => {
        const authToken = token || staffData.token || null;
        if (typeof window !== 'undefined' && authToken) {
          try {
            localStorage.setItem(TOKEN_STORAGE_KEY, authToken);
          } catch {}
        }
        set({ session: { ...staffData, token: authToken || undefined }, token: authToken, hasHydrated: true });
        if (typeof window !== 'undefined') {
          try {
            window.dispatchEvent(new Event('auth-session-updated'));
          } catch {}
        }
      },
      loginWithApi: async (usernameOrEmail: string, password: string) => {
        const res = await apiClient.post('/auth/login', {
          username: usernameOrEmail,
          password,
        });

        const authData = res.data;
        const accessToken = authData.accessToken;
        const user = authData.user;

        // Map role backend (IN HOA) sang UserRole frontend (thường)
        const role = user.role.toLowerCase() as UserRole;
        const resolvedBranchId = user.branchId || 'branch-1';
        const resolvedBranchName =
          user.branch?.name ||
          DEMO_STAFF_ACCOUNTS.find((a) => a.branchId === resolvedBranchId)?.branchName ||
          'Chi nhánh 1 - Quận 1 (Flagship)';

        const sessionData: StaffSession = {
          id: user.id,
          name: user.fullName || user.username,
          email: user.email || `${user.username}@smartpos.vn`,
          role,
          branchId: resolvedBranchId,
          branchName: resolvedBranchName,
          token: accessToken,
        };

        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(TOKEN_STORAGE_KEY, accessToken);
          } catch {}
        }

        set({ session: sessionData, token: accessToken, hasHydrated: true });

        if (typeof window !== 'undefined') {
          try {
            window.dispatchEvent(new Event('auth-session-updated'));
          } catch {}
        }

        return sessionData;
      },
      logout: () => {
        set({ session: null, token: null, hasHydrated: true });
        if (typeof window !== 'undefined') {
          try {
            localStorage.removeItem(AUTH_STORAGE_KEY);
            localStorage.removeItem(TOKEN_STORAGE_KEY);
            window.dispatchEvent(new Event('auth-session-updated'));
          } catch {}
        }
      },
      setHydrated: (value: boolean) => set({ hasHydrated: value }),
    }),
    {
      name: AUTH_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHydrated(true);
        } else {
          useAuthStore.getState().setHydrated(true);
        }
      },
    }
  )
);

export function useCurrentAuth() {
  const store = useAuthStore();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (!store.hasHydrated) {
      store.setHydrated(true);
    }
  }, [store]);

  return {
    session: store.session,
    token: store.token,
    isAuthenticated: !!store.session,
    isReady: isMounted,
    login: store.login,
    loginWithApi: store.loginWithApi,
    logout: store.logout,
  };
}
