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
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-9999 p-4">
      <div className="bg-(--bg-main) border-4 border-(--border-color) rounded-lg shadow-2xl max-w-lg w-full p-8 relative">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="mx-auto w-20 h-20 bg-(--brand-primary) border-3 border-(--border-color) rounded-full flex items-center justify-center mb-6">
            <FontAwesomeIcon icon={faSeedling} className="text-(--bg-main) text-3xl" />
          </div>
          <h1 className="font-['Archivo_Black'] text-3xl uppercase text-(--text-primary) tracking-tight mb-3">
            GOODSEED DEMO
          </h1>
          <p className="font-['Poppins'] text-(--text-primary-muted) text-base">
            This is a private demo for authorized clients only.
          </p>
          <p className="font-['Poppins'] text-(--text-primary-muted) text-sm mt-2">
            Please enter the access password to continue.
          </p>
        </div>

        {/* Password Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label 
              htmlFor="password" 
              className="block font-['Poppins'] font-semibold text-(--text-primary) mb-3 text-base"
            >
              Demo Access Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-4 border-3 border-(--border-color) rounded-lg 
                         bg-(--bg-section) text-(--text-primary) font-['Poppins']
                         focus:ring-4 focus:ring-(--brand-primary) focus:ring-opacity-30 
                         focus:border-(--brand-primary) pr-14 transition-all duration-200
                         placeholder:text-(--text-primary-muted)"
                placeholder="Enter demo password"
                required
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={togglePasswordVisibility}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 
                         text-(--text-primary-muted) hover:text-(--brand-primary) 
                         transition-colors duration-200 w-6 h-6 flex items-center justify-center"
                disabled={isLoading}
              >
                <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
              </button>
            </div>
            {error && (
              <div className="mt-3 p-3 bg-(--danger-color) bg-opacity-10 border-2 border-(--danger-color) rounded-lg">
                <p className="text-(--danger-color) font-['Poppins'] font-medium text-sm">
                  <FontAwesomeIcon icon={faLock} className="mr-2" />
                  {error}
                </p>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading || !password.trim()}
            className={`w-full py-4 px-6 rounded-lg font-['Poppins'] font-bold text-lg 
                       border-3 transition-all duration-200 transform
                       ${isLoading || !password.trim()
                         ? 'bg-(--bg-section) text-(--text-primary-muted) border-(--border-color) cursor-not-allowed opacity-60'
                         : 'bg-(--brand-primary) text-(--bg-main) border-(--border-color) hover:bg-(--brand-primary) hover:scale-105 hover:shadow-lg active:scale-95'
                       }`}
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-3">
                <div className="animate-spin rounded-full h-5 w-5 border-3 border-(--bg-main) border-t-transparent"></div>
                <span>Verifying Access...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <FontAwesomeIcon icon={faSeedling} />
                <span>ACCESS DEMO</span>
              </div>
            )}
          </button>
        </form>

        {/* Footer Info */}
        <div className="mt-8 text-center border-t-2 border-(--border-color) pt-6">
          <p className="font-['Poppins'] text-(--text-primary-muted) text-sm leading-relaxed">
            🌱 This demo showcases our cannabis seed marketplace platform
          </p>
          <p className="font-['Poppins'] text-(--text-primary-muted) text-xs mt-2 opacity-75">
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