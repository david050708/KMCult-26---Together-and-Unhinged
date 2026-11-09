import React, { useState } from 'react';
import { loginBatch } from '../services/api.ts';
import { ArrowRight, AlertCircle, Eye, EyeOff, Lock, User } from 'lucide-react';

interface LoginScreenProps {
  onLoginSuccess: (token: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLoginSuccess,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
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
      const result = await loginBatch(username.trim(), password.trim(), rememberMe);
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
      {/* Outer Card with Vintage Scale-Fade entrance */}
      <div className="w-full max-w-xs sm:max-w-sm paper-sheet p-6 sm:p-8 space-y-5 border-2 border-[#493D35] shadow-[4px_5px_0px_rgba(73,61,53,0.2)] animate-vintage-scale-fade">
        {/* Subtle Section Kicker Header */}
        <div className="text-center space-y-1 pb-1 animate-vintage-fade-up">
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8B735E]">
            Kilpauk Medical College · Class of 2026
          </span>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#493D35]">
            Batch Authentication
          </h2>
        </div>

        {error && (
          <div
            role="alert"
            aria-live="polite"
            className="p-3 bg-red-50/70 border border-red-700 rounded-xs flex items-center gap-2.5 text-xs text-red-900 font-handwritten animate-vintage-fade-up"
          >
            <AlertCircle className="w-4 h-4 shrink-0 text-red-700" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          {/* Username Field - Stagger 1 */}
          <div className="animate-vintage-fade-up animate-stagger-1 opacity-0 [animation-fill-mode:forwards]">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#493D35] mb-1">
              Batch Username
            </label>
            <div className="relative flex items-center">
              <User className="w-4 h-4 text-[#8B735E] absolute left-3 pointer-events-none" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="username"
                autoComplete="username"
                required
                className="w-full pl-9 pr-3 py-2.5 text-base font-handwritten"
              />
            </div>
          </div>

          {/* Password Field - Stagger 2 */}
          <div className="animate-vintage-fade-up animate-stagger-2 opacity-0 [animation-fill-mode:forwards]">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#493D35] mb-1">
              Batch Password
            </label>
            <div className="relative flex items-center">
              <Lock className="w-4 h-4 text-[#8B735E] absolute left-3 pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="password"
                autoComplete="current-password"
                required
                className="w-full pl-9 pr-10 py-2.5 text-base font-handwritten"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 p-1.5 text-[#8B735E] hover:text-[#493D35] transition-colors cursor-pointer"
                title={showPassword ? 'Hide password' : 'Show password'}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Remember Me Checkbox */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="rememberMe"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded-xs border-1.5 border-[#493D35] accent-[#493D35] cursor-pointer"
            />
            <label htmlFor="rememberMe" className="text-xs font-handwritten text-[#493D35] select-none cursor-pointer">
              Remember me on this device (30 days)
            </label>
          </div>

          {/* Submit Action - Stagger 3 */}
          <div className="pt-2 flex items-center justify-between gap-2 animate-vintage-fade-up animate-stagger-3 opacity-0 [animation-fill-mode:forwards]">
            <span className="text-[11px] text-[#8B735E] italic">
              One key, all memories
            </span>

            <button
              type="submit"
              disabled={loading}
              className="ink-button text-xs font-handwritten tracking-wider uppercase px-4 py-2.5"
            >
              <span>{loading ? 'Opening...' : 'Enter Chronicle'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

