import React, { useState } from 'react';
import { loginBatch } from '../services/api.ts';
import { ArrowRight, AlertCircle } from 'lucide-react';

interface LoginScreenProps {
  onLoginSuccess: (token: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLoginSuccess,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password.');
      return;
    }

    setLoading(true);

    try {
      const result = await loginBatch(username.trim(), password.trim());
      if (result.success && result.token) {
        onLoginSuccess(result.token);
      } else {
        setError(result.error || 'Invalid credentials.');
      }
    } catch (err: any) {
      setError(err.message || 'Unable to authenticate.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] w-full flex flex-col items-center justify-center p-4 bg-transparent selection:bg-[#D6C4A8]">
      <div className="w-full max-w-xs sm:max-w-sm space-y-4">
        {error && (
          <div className="p-3 bg-red-50/90 border border-red-200 rounded-xl shadow-xs flex items-center gap-2 text-xs text-red-800 font-handwritten animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="scrapbook-paper-card rounded-xl p-1.5 transition-all focus-within:ring-2 focus-within:ring-[#8B735E]/40">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="username"
              autoComplete="off"
              required
              className="w-full px-4 py-3 bg-transparent text-[#493D35] placeholder:text-[#8B735E]/60 text-base font-handwritten focus:outline-none"
            />
          </div>

          <div className="scrapbook-paper-card rounded-xl p-1.5 transition-all focus-within:ring-2 focus-within:ring-[#8B735E]/40">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="password"
              autoComplete="off"
              required
              className="w-full px-4 py-3 bg-transparent text-[#493D35] placeholder:text-[#8B735E]/60 text-base font-handwritten focus:outline-none"
            />
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-[#493D35] text-[#F5F0E6] hover:bg-[#382E28] rounded-xl text-xs font-handwritten tracking-wider uppercase shadow-md transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <span>{loading ? 'Opening...' : 'Enter'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
