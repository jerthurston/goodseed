'use client';
import { useEffect, useState } from "react";
import Link from "next/link";
import { archivoBlack, poppins } from "@/lib/fonts";
import { useSession } from "next-auth/react";
import AccountDropdown from "@/components/custom/AccountDropdown";
import SignInModal from "@/components/custom/modals/SignInModal";

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHeart } from "@fortawesome/free-solid-svg-icons";

const Header = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false); // Track login state

  const { data: session, status } = useSession();
  const currentUser = session?.user;

  useEffect(() => {
    if (status === 'authenticated') {
      setIsLoggedIn(true);
    }
  }, [status]);

  const handleLogout = () => {
    setIsLoggedIn(false);
    // Add additional logout logic here (clear tokens, redirect, etc.)
  };


  return (
    <>
      <nav className="goodseed-nav">
        <Link href="/" className={`logo ${archivoBlack.variable}`}>goodseed</Link>
        <div className="goodseed-nav-links" >
          <Link
            style={{ fontFamily: poppins.style.fontFamily, fontSize: "1.1rem", fontWeight: "700", lineHeight: "20px" }}
            href="/">
            About
          </Link>
          <Link
            style={{ fontFamily: poppins.style.fontFamily, fontSize: "1.1rem", fontWeight: "700", lineHeight: "20px" }}
            href="/seeds">
            Browse
          </Link>
          <Link
            href="/dashboard/user/favorites"
            className="favorites-link"
            title="View Favorites"
          >
            <FontAwesomeIcon icon={faHeart} />
          </Link>
          {isLoggedIn ? (
            // --> Render after user login
            <AccountDropdown
              onLogout={handleLogout}
              user={currentUser}
            />
          ) : (
            // --> Default when not logged in
            <button
              onClick={() => setIsModalOpen(true)}
              className="login-btn"
              style={{ fontFamily: "'Poppins'", fontSize: "1.1rem", fontWeight: "700", lineHeight: "20px" }}
            >
              Sign in
            </button>
          )}
        </div>
      </nav>
      {/* Modal open for Login / Register */}
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
