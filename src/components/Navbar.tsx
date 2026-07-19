import React, { useState, useEffect } from "react";
import { LoggedInUser, Notification } from "../types";
import { Bell, LogOut, HeartPulse, Check, User, ShieldCheck, Activity } from "lucide-react";

interface NavbarProps {
  user: LoggedInUser | null;
  onLogout: () => void;
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
}

export default function Navbar({ user, onLogout, notifications, onMarkAsRead }: NavbarProps) {
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-slate-100 shadow-xs px-4 py-3 md:px-8">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo / Title */}
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 text-white p-2 rounded-xl flex items-center justify-center">
            <HeartPulse className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-bold text-slate-800 tracking-tight flex items-center gap-1.5">
              SmartOP <span className="text-xs bg-emerald-100 text-emerald-800 font-medium px-2 py-0.5 rounded-full">SYSTEM</span>
            </h1>
            <p className="text-[10px] text-slate-400 font-mono hidden md:block">ONLINE OP & APPOINTMENT ROUTER</p>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-4">
          {user && (
            <>
              {/* User Identity Chip */}
              <div className="hidden sm:flex items-center gap-2.5 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-full">
                {user.role === "admin" ? (
                  <ShieldCheck className="h-4 w-4 text-purple-600" />
                ) : user.role === "hospital" ? (
                  <Activity className="h-4 w-4 text-blue-600" />
                ) : (
                  <User className="h-4 w-4 text-emerald-600" />
                )}
                <div>
                  <p className="text-xs font-semibold text-slate-700 leading-none">{user.name}</p>
                  <p className="text-[9px] text-slate-400 capitalize leading-none mt-0.5">{user.role}</p>
                </div>
              </div>

              {/* Notification Bell */}
              <div className="relative">
                <button
                  id="notif-bell-btn"
                  onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                  className="relative p-2.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all duration-200"
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 bg-rose-500 text-white font-semibold text-[9px] h-5 w-5 rounded-full border-2 border-white flex items-center justify-center animate-pulse">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Notification Dropdown Popover */}
                {showNotifDropdown && (
                  <div className="absolute right-0 mt-2.5 w-80 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 overflow-hidden transform origin-top-right animate-in fade-in duration-200">
                    <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-800">In-App Notifications</span>
                      {unreadCount > 0 && (
                        <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-semibold">
                          {unreadCount} Unread
                        </span>
                      )}
                    </div>

                    <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center">
                          <p className="text-xs text-slate-400">No notifications found.</p>
                        </div>
                      ) : (
                        notifications.map((notif) => (
                          <div
                            key={notif.id}
                            className={`p-3.5 hover:bg-slate-50/50 transition-colors ${
                              !notif.read ? "bg-blue-50/30 font-medium" : ""
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-xs text-slate-800">{notif.message}</p>
                              {!notif.read && (
                                <button
                                  onClick={() => onMarkAsRead(notif.id)}
                                  className="text-blue-600 hover:text-blue-800 p-0.5 hover:bg-blue-100 rounded-full transition-colors flex-shrink-0"
                                  title="Mark as read"
                                >
                                  <Check className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                            <span className="text-[9px] text-slate-400 mt-1 block">
                              {new Date(notif.createdAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit"
                              })}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Logout Button */}
              <button
                id="logout-btn"
                onClick={onLogout}
                className="flex items-center gap-2 bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
