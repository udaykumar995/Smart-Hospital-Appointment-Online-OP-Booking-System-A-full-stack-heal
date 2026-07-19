import React, { useState } from "react";
import { UserRole } from "../types";
import { KeyRound, ShieldCheck, Activity, User, Eye, EyeOff, Loader2, Hospital } from "lucide-react";

interface AuthScreenProps {
  onAuthSuccess: (token: string, user: any) => void;
  showToast: (msg: string, type: "success" | "error" | "info") => void;
}

export default function AuthScreen({ onAuthSuccess, showToast }: AuthScreenProps) {
  const [activeTab, setActiveTab] = useState<UserRole>("patient");
  const [showAdminTab, setShowAdminTab] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return window.location.search.includes("admin=true");
    }
    return false;
  });
  const [isLogin, setIsLogin] = useState<boolean>(true);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [forgotPassword, setForgotPassword] = useState<boolean>(false);

  // Form Fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [contact, setContact] = useState("");
  const [address, setAddress] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("Male");

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (forgotPassword) {
      try {
        const res = await fetch("/api/auth/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, role: activeTab })
        });
        const data = await res.json();
        if (res.ok) {
          showToast(data.message, "success");
          setForgotPassword(false);
          setIsLogin(true);
        } else {
          showToast(data.error || "Failed to trigger reset", "error");
        }
      } catch {
        showToast("Server communication failed", "error");
      } finally {
        setLoading(false);
      }
      return;
    }

    const payload: any = { email, password, role: activeTab };
    let endpoint = "/api/auth/login";

    if (!isLogin) {
      endpoint = "/api/auth/register";
      payload.name = name;
      payload.contact = contact;
      payload.address = address;
      if (activeTab === "patient") {
        payload.age = age;
        payload.gender = gender;
      }
    }

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.ok) {
        if (!isLogin && activeTab === "hospital") {
          showToast(data.message || "Registered successfully. Waiting for admin approval.", "success");
          setIsLogin(true);
        } else {
          showToast(`Welcome back, ${data.user.name}!`, "success");
          onAuthSuccess(data.token, data.user);
        }
      } else {
        showToast(data.error || "Authentication failed", "error");
      }
    } catch (err) {
      showToast("Network connection error. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 md:p-6 select-none relative overflow-hidden">
      {/* Decorative background grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:16px_16px] opacity-10 pointer-events-none" />

      <div className="w-full max-w-lg bg-white border border-slate-100 rounded-3xl shadow-2xl relative z-10 overflow-hidden">
        {/* Header decoration band */}
        <div className="h-2 bg-gradient-to-r from-blue-500 via-sky-400 to-emerald-400" />

        <div className="p-6 md:p-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">
              {forgotPassword ? "Password Recovery" : isLogin ? "Welcome Back" : "Create Account"}
            </h2>
            <p className="text-slate-400 text-xs md:text-sm mt-1.5 font-medium">
              {forgotPassword
                ? "Enter your email to restore credentials"
                : isLogin
                ? "Manage your hospital outpatient booking details"
                : "Fill out the registration form below to start"}
            </p>
          </div>

          {/* User Role Selection Tabs */}
          {!forgotPassword && (
            <div className={`grid ${showAdminTab ? "grid-cols-3" : "grid-cols-2"} gap-2 bg-slate-100 p-1.5 rounded-2xl mb-6`}>
              {[
                { role: "patient", icon: User, label: "Patient" },
                { role: "hospital", icon: Hospital, label: "Hospital" },
                ...(showAdminTab ? [{ role: "admin", icon: ShieldCheck, label: "Admin" }] : [])
              ].map((tab) => {
                const Icon = tab.icon;
                const isSelected = activeTab === tab.role;
                return (
                  <button
                    key={tab.role}
                    type="button"
                    onClick={() => {
                      setActiveTab(tab.role as UserRole);
                      if (tab.role === "admin") {
                        setIsLogin(true); // Admin can't register!
                      }
                    }}
                    className={`flex flex-col md:flex-row items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? "bg-white text-blue-600 shadow-md border-b border-blue-500/20"
                        : "text-slate-500 hover:bg-white/40 hover:text-slate-700"
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${isSelected ? "text-blue-500" : ""}`} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {/* Form Fields: Register fields (only if not login & not forgotPassword) */}
            {!isLogin && !forgotPassword && (
              <div className="grid grid-cols-1 gap-4 animate-in fade-in duration-300">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 capitalize">
                    {activeTab === "hospital" ? "Hospital Name" : "Patient Full Name"}
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={activeTab === "hospital" ? "e.g. City Care General" : "e.g. Rahul Sharma"}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all placeholder:text-slate-400"
                  />
                </div>

                {activeTab === "patient" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5">Age</label>
                      <input
                        type="number"
                        required
                        min="1"
                        max="120"
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        placeholder="e.g. 28"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all placeholder:text-slate-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5">Gender</label>
                      <select
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">Mobile Contact</label>
                    <input
                      type="tel"
                      required
                      value={contact}
                      onChange={(e) => setContact(e.target.value)}
                      placeholder="+91 99000 12345"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all placeholder:text-slate-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">Postal Address</label>
                    <input
                      type="text"
                      required
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="City, State"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all placeholder:text-slate-400"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* General Email and Password Fields */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Registered Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => {
                    const val = e.target.value;
                    setEmail(val);
                    if (val.toLowerCase() === "admin@hospital.com") {
                      setShowAdminTab(true);
                      setActiveTab("admin");
                    }
                  }}
                  placeholder="e.g. user@hospital.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all placeholder:text-slate-400"
                />
              </div>

              {!forgotPassword && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-500">Security Password</label>
                    {isLogin && (
                      <button
                        type="button"
                        onClick={() => setForgotPassword(true)}
                        className="text-xs text-blue-500 hover:text-blue-700 font-bold transition-colors cursor-pointer"
                      >
                        Forgot Password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-10 py-3 text-sm focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all placeholder:text-slate-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Submission Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm py-3 px-4 rounded-xl shadow-lg shadow-blue-500/10 flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 duration-200 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : forgotPassword ? (
                "Recover Account Credentials"
              ) : isLogin ? (
                "Authenticate Account"
              ) : (
                "Register & Request Access"
              )}
            </button>

            {/* Forgot password or Register Toggle */}
            <div className="text-center mt-5">
              {forgotPassword ? (
                <button
                  type="button"
                  onClick={() => setForgotPassword(false)}
                  className="text-xs text-slate-500 hover:text-slate-800 font-bold transition-colors cursor-pointer"
                >
                  Back to Sign In
                </button>
              ) : (
                activeTab !== "admin" && (
                  <p className="text-xs text-slate-500 font-medium">
                    {isLogin ? "First time using SmartOP?" : "Already registered with SmartOP?"}{" "}
                    <button
                      type="button"
                      onClick={() => setIsLogin(!isLogin)}
                      className="text-blue-500 hover:text-blue-700 font-bold transition-colors cursor-pointer"
                    >
                      {isLogin ? "Register Now" : "Sign In here"}
                    </button>
                  </p>
                )
              )}
            </div>
          </form>

          {/* Quick Sandbox Login Helpers */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <h4 className="text-[10px] font-mono tracking-wider font-semibold text-slate-400 uppercase text-center mb-3">
              DEMONSTRATION AUTHENTICATION PROFILE DIRECTIVES
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setEmail("patient@gmail.com");
                  setPassword("password123");
                  setActiveTab("patient");
                  setIsLogin(true);
                }}
                className="text-[10px] font-semibold text-slate-600 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 border border-slate-100 rounded-lg p-2 text-center transition-all"
              >
                Patient Account (Patient)
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmail("citycare@hospital.com");
                  setPassword("password123");
                  setActiveTab("hospital");
                  setIsLogin(true);
                }}
                className="text-[10px] font-semibold text-slate-600 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 border border-slate-100 rounded-lg p-2 text-center transition-all"
              >
                City Care (Hospital)
              </button>
            </div>
          </div>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setShowAdminTab((prev) => !prev);
                if (!showAdminTab) {
                  setActiveTab("admin");
                  setIsLogin(true);
                } else {
                  setActiveTab("patient");
                }
              }}
              className="text-[10px] text-slate-300 hover:text-slate-400 font-medium transition-colors cursor-pointer"
            >
              🔒 Authorized Platform Administration Console Toggle
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
