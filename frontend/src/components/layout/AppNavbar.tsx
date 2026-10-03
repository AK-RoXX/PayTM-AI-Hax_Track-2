"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Search, Bell, ChevronDown, LogOut, Menu, X, Plus } from "lucide-react";
import { PaytmLogo } from "../common/PaytmLogo";

interface AppNavbarProps {
  userName?: string;
  userEmail?: string;
  onSearch?: (query: string) => void;
}

export function AppNavbar({
  userName = "Rahul Sharma",
  userEmail,
}: AppNavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 30,
        background: "rgba(255, 255, 255, 0.95)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBottom: "1px solid #e2e8f0",
        padding: "0 20px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: 64,
          gap: 16,
        }}
      >
        {/* Left: Mobile Logo & Hamburger */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            type="button"
            className="md:hidden"
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              background: "transparent",
              border: 0,
              padding: 6,
              cursor: "pointer",
              color: "#334155",
            }}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="md:hidden">
            <PaytmLogo size="sm" showSubtitle={false} href="/dashboard" />
          </div>

          {/* Desktop Search Bar directly from Application UI.png */}
          <div
            className="hidden md:flex items-center"
            style={{
              position: "relative",
              width: 380,
            }}
          >
            <Search
              size={16}
              style={{
                position: "absolute",
                left: 12,
                color: "#94a3b8",
                pointerEvents: "none",
              }}
            />
            <input
              type="text"
              placeholder="Search or type a command..."
              style={{
                width: "100%",
                padding: "8px 12px 8px 36px",
                fontSize: 13.5,
                borderRadius: 20,
                border: "1px solid #e2e8f0",
                background: "#f8fafc",
                outline: "none",
                transition: "all 0.2s ease",
              }}
              onFocus={(e) => {
                e.target.style.background = "#ffffff";
                e.target.style.borderColor = "#0066f5";
              }}
              onBlur={(e) => {
                e.target.style.background = "#f8fafc";
                e.target.style.borderColor = "#e2e8f0";
              }}
            />
          </div>
        </div>

        {/* Right Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* New Claim Button */}
          <Link
            href="/intake"
            className="btn btn-primary btn-sm hidden sm:inline-flex"
            style={{ gap: 6, borderRadius: 20 }}
          >
            <Plus size={15} />
            <span>New Claim</span>
          </Link>

          {/* Notifications Bell with dot */}
          <button
            type="button"
            style={{
              position: "relative",
              width: 38,
              height: 38,
              borderRadius: "50%",
              display: "grid",
              placeItems: "center",
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              color: "#475569",
              cursor: "pointer",
            }}
            aria-label="Notifications"
          >
            <Bell size={18} />
            <span
              style={{
                position: "absolute",
                top: 8,
                right: 8,
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "#ef4444",
                border: "1.5px solid #fff",
              }}
            />
          </button>

          {/* User Profile Pill */}
          <div style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => setProfileOpen(!profileOpen)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: 24,
                padding: "4px 10px 4px 4px",
                cursor: "pointer",
              }}
            >
              {/* Avatar circle */}
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #00baf2 0%, #002970 100%)",
                  color: "#ffffff",
                  fontSize: 12,
                  fontWeight: 700,
                  display: "grid",
                  placeItems: "center",
                }}
              >
                {userName.charAt(0).toUpperCase()}
              </div>
              <span
                style={{
                  fontSize: 13.5,
                  fontWeight: 600,
                  color: "#1e293b",
                }}
              >
                {userName}
              </span>
              <ChevronDown size={14} style={{ color: "#64748b" }} />
            </button>

            {/* Profile Dropdown */}
            {profileOpen && (
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: "100%",
                  marginTop: 8,
                  width: 200,
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: 12,
                  boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
                  padding: "8px 0",
                  zIndex: 50,
                }}
              >
                {userEmail && (
                  <div
                    style={{
                      padding: "8px 14px",
                      fontSize: 12,
                      color: "#64748b",
                      borderBottom: "1px solid #f1f5f9",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {userEmail}
                  </div>
                )}
                <Link
                  href="/dashboard"
                  style={{
                    display: "block",
                    padding: "8px 14px",
                    fontSize: 13,
                    color: "#334155",
                  }}
                  onClick={() => setProfileOpen(false)}
                >
                  My Dashboard
                </Link>
                <Link
                  href="/upload"
                  style={{
                    display: "block",
                    padding: "8px 14px",
                    fontSize: 13,
                    color: "#334155",
                  }}
                  onClick={() => setProfileOpen(false)}
                >
                  Upload Documents
                </Link>
                <div style={{ height: 1, background: "#f1f5f9", margin: "4px 0" }} />
                <form action="/auth/signout" method="post">
                  <button
                    type="submit"
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 14px",
                      fontSize: 13,
                      color: "#ef4444",
                      background: "none",
                      border: 0,
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <LogOut size={14} />
                    Sign out
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {menuOpen && (
        <div
          className="md:hidden"
          style={{
            padding: "16px 0",
            borderTop: "1px solid #e2e8f0",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <Link
            href="/dashboard"
            onClick={() => setMenuOpen(false)}
            style={{ padding: "8px 12px", borderRadius: 8, color: "#1e293b", fontWeight: 600 }}
          >
            Dashboard
          </Link>
          <Link
            href="/intake"
            onClick={() => setMenuOpen(false)}
            style={{ padding: "8px 12px", borderRadius: 8, color: "#1e293b" }}
          >
            Create Claim
          </Link>
          <Link
            href="/upload"
            onClick={() => setMenuOpen(false)}
            style={{ padding: "8px 12px", borderRadius: 8, color: "#1e293b" }}
          >
            Upload Documents
          </Link>
          <Link
            href="/track"
            onClick={() => setMenuOpen(false)}
            style={{ padding: "8px 12px", borderRadius: 8, color: "#1e293b" }}
          >
            Track Claims
          </Link>
        </div>
      )}
    </header>
  );
}
