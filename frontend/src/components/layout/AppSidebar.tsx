"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  FileCheck,
  FileText,
  PieChart,
  Landmark,
  CreditCard,
  Settings,
  HelpCircle,
} from "lucide-react";
import { PaytmLogo } from "../common/PaytmLogo";

interface AppSidebarProps {
  currentCaseId?: string;
  className?: string;
}

export function AppSidebar({ currentCaseId, className = "" }: AppSidebarProps) {
  const pathname = usePathname();

  const navItems = [
    {
      label: "Home",
      href: "/dashboard",
      icon: Home,
      active: pathname === "/dashboard",
    },
    {
      label: "My Claims",
      href: currentCaseId ? `/case/${currentCaseId}` : "/dashboard",
      icon: FileCheck,
      active: pathname.startsWith("/case") || pathname.startsWith("/track"),
    },
    {
      label: "Documents",
      href: currentCaseId ? `/upload?caseId=${currentCaseId}` : "/upload",
      icon: FileText,
      active: pathname.startsWith("/upload"),
    },
    {
      label: "Money Map",
      href: currentCaseId ? `/case/${currentCaseId}#money-map` : "/dashboard",
      icon: PieChart,
      active: false,
    },
    {
      label: "Loans & Credit",
      href: "/dashboard#financing",
      icon: Landmark,
      active: false,
    },
    {
      label: "Payments",
      href: "/dashboard#payments",
      icon: CreditCard,
      active: false,
    },
    {
      label: "Settings",
      href: "/dashboard#settings",
      icon: Settings,
      active: false,
    },
  ];

  return (
    <aside
      className={`hidden md:flex flex-col border-r border-slate-200 bg-white ${className}`}
      style={{
        width: 240,
        minHeight: "100vh",
        padding: "20px 14px",
        flexShrink: 0,
      }}
    >
      {/* Brand header */}
      <div style={{ padding: "0 10px 24px" }}>
        <PaytmLogo size="md" subtitleText="AI Financial Assistant" href="/dashboard" />
      </div>

      {/* Nav List */}
      <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.active;

          return (
            <Link
              key={item.label}
              href={item.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 14px",
                borderRadius: 12,
                fontSize: 14,
                fontWeight: isActive ? 600 : 500,
                color: isActive ? "#0066f5" : "#475569",
                background: isActive ? "#eff6ff" : "transparent",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.background = "#f8fafc";
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.background = "transparent";
              }}
            >
              <Icon
                size={18}
                style={{
                  color: isActive ? "#0066f5" : "#64748b",
                  flexShrink: 0,
                }}
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Help & Eco */}
      <div style={{ marginTop: "auto", paddingTop: 20, borderTop: "1px solid #f1f5f9" }}>
        <a
          href="https://paytm.com"
          target="_blank"
          rel="noreferrer"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "8px 12px",
            borderRadius: 10,
            fontSize: 13,
            color: "#64748b",
          }}
        >
          <HelpCircle size={16} />
          <span>Paytm Care & Help</span>
        </a>
      </div>
    </aside>
  );
}
