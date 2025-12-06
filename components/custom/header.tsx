'use client';
import AccountDropdown from "@/components/custom/AccountDropdown";
import SignInModal from "@/components/custom/modals/SignInModal";
import { archivoBlack, poppins } from "@/lib/fonts";
import { faHeart } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Link from "next/link";
import { useState } from "react";

const Header = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false); // Track login state

  const handleLogout = () => {
    setIsLoggedIn(false);
    // Add additional logout logic here (clear tokens, redirect, etc.)
  };

  return (
    <>
      <nav className="goodseed-nav">
        <Link href="/" className={`logo ${archivoBlack.variable}`}>goodseed</Link>
        <div className="goodseed-nav-links" >
          <Link style={{ fontFamily: poppins.style.fontFamily, fontSize: "13px", fontWeight: "700", lineHeight: "20px" }} href="/#features">About</Link>
          <Link style={{ fontFamily: poppins.style.fontFamily }} href="/seeds">Browse</Link>
          <Link
            href="/dashboard/user/favorites"
            className="favorites-link"
            title="View Favorites"
          >
            <FontAwesomeIcon icon={faHeart} />
          </Link>

          {isLoggedIn ? (
            <AccountDropdown onLogout={handleLogout} />
          ) : (
            <button
              onClick={() => setIsModalOpen(true)}
              className="login-btn"
              style={{ fontFamily: "'Poppins'", fontSize: "13px", fontWeight: "700", lineHeight: "20px" }}
            >
              Sign in
            </button>
          )}
        </div>
      </nav>
      <SignInModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onLoginSuccess={() => {
          setIsLoggedIn(true);
          setIsModalOpen(false);
        }}
      />
    </>
  )
}
export default Header;
