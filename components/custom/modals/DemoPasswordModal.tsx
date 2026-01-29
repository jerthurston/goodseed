'use client';

import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLock, faEye, faEyeSlash, faSeedling } from '@fortawesome/free-solid-svg-icons';

const DEMO_PASSWORD = process.env.NEXT_PUBLIC_DEMO_PASSWORD || 'goodseed2026';
const DEMO_ACCESS_KEY = 'goodseed_demo_access';

export default function DemoPasswordModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check if user has already entered correct password
    const hasAccess = localStorage.getItem(DEMO_ACCESS_KEY);
    if (!hasAccess) {
      setIsOpen(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Simulate a small delay for better UX
    await new Promise(resolve => setTimeout(resolve, 800));

    if (password === DEMO_PASSWORD) {
      // Store access in localStorage
      localStorage.setItem(DEMO_ACCESS_KEY, 'true');
      setIsOpen(false);
      setPassword('');
    } else {
      setError('Incorrect password. Please try again.');
      setPassword('');
    }
    
    setIsLoading(false);
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-sm flex items-center justify-center z-9999 p-4 animate-in fade-in duration-300">
      <div className="bg-(--bg-main) border-4 border-(--border-color) shadow-2xl max-w-md w-full p-8 relative animate-in zoom-in-95 duration-300">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <h1 className='whitespace-nowrap text-4xl uppercase text-(--brand-primary) tracking-tight mb-2 drop-shadow-sm '>GOODSEED APP(V2)</h1>
          <div className="mx-auto my-1 w-24 h-24 bg-(--brand-primary) border-4 border-(--border-color) flex items-center justify-center mb-6 shadow-lg relative overflow-hidden group">
            {/* Animated background pulse */}
            <div className="absolute inset-0 bg-(--brand-primary) animate-pulse opacity-50"></div>
            {/* Rotating seed icon */}
            <FontAwesomeIcon 
              icon={faSeedling} 
              className="text-(--bg-main) text-4xl relative z-10 animate-bounce" 
              style={{ animationDuration: '2s' }}
            />
            {/* Grow animation circle */}
            <div className="absolute inset-0 border-[3px] border-(--bg-main) opacity-30 animate-ping" style={{ animationDuration: '3s' }}></div>
          </div>
          <h2 className="text-2xl uppercase text-(--text-primary) tracking-tight mb-2 drop-shadow-sm">
            CANNABIS MARKETPLACE
          </h2>
          <p className="font-['Poppins'] text-(--text-primary-muted) text-sm leading-relaxed">
            This is a private demo for authorized clients only.
          </p>
          <p className="font-['Poppins'] text-(--text-primary-muted) text-xs mt-2 opacity-80">
            Please enter the access password to continue.
          </p>
        </div>

        {/* Password Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="form-group">
            <label 
              htmlFor="password" 
              className="block font-['Poppins'] font-semibold text-(--text-primary) mb-3 text-sm tracking-wide"
            >
              DEMO ACCESS PASSWORD
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input pr-12"
                placeholder="Enter demo password"
                required
                disabled={isLoading}
                autoComplete="off"
              />
              <button
                type="button"
                onClick={togglePasswordVisibility}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 
                         text-(--text-primary-muted) hover:text-(--brand-primary) 
                         transition-all duration-200 w-5 h-5 flex items-center justify-center
                         hover:scale-110 disabled:opacity-50"
                disabled={isLoading}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} className="text-base" />
              </button>
            </div>
            {error && (
              <div className="mt-3 p-3 bg-(--danger-color) bg-opacity-10 border-3 border-(--danger-color) animate-in slide-in-from-top-2 duration-300">
                <p className="text-(--danger-color) font-['Poppins'] font-medium text-sm flex items-center gap-2">
                  <FontAwesomeIcon icon={faLock} className="text-sm" />
                  <span>{error}</span>
                </p>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading || !password.trim()}
            className="social-login-btn google w-full disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-3">
                <div className="animate-spin rounded-full h-5 w-5 border-3 border-white border-t-transparent"></div>
                <span>Verifying Access...</span>
              </div>
            ) : (
              <>
                <FontAwesomeIcon icon={faSeedling} />
                <span className="ml-2">Access Demo</span>
              </>
            )}
          </button>
        </form>

        {/* Footer Info */}
        <div className="mt-8 text-center border-t-[3px] border-(--border-color) pt-6 border-dashed ">
          <p className="font-['Poppins'] text-(--text-primary-muted) text-sm leading-relaxed flex items-center justify-center gap-2">
            <span>🌱</span>
            <span>Cannabis seed marketplace platform demo</span>
          </p>
          <p className="font-['Poppins'] text-(--text-primary-muted) text-xs mt-2 opacity-70">
            Contact your project manager if you need assistance accessing the demo.
          </p>
        </div>
      </div>
    </div>
  );
}

// Optional: Export a function to clear demo access (for development)
export function clearDemoAccess() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(DEMO_ACCESS_KEY);
    window.location.reload();
  }
}