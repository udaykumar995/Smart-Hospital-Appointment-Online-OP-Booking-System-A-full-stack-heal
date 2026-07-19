import React, { useState, useEffect } from "react";
import { Hospital, Patient, Doctor, Appointment, PlatformSettings, BankDetails } from "../types";
import {
  TrendingUp,
  Building2,
  Users,
  CalendarDays,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  Search,
  Check,
  X,
  Settings,
  ShieldAlert,
  Loader2,
  Info,
  Edit
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";

interface AdminDashboardProps {
  token: string;
  showToast: (msg: string, type: "success" | "error" | "info") => void;
}

export default function AdminDashboard({ token, showToast }: AdminDashboardProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [stats, setStats] = useState<any>(null);
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<"overview" | "hospitals" | "appointments" | "settings">("overview");

  // Admin Bank Fields
  const [adminBankName, setAdminBankName] = useState("");
  const [adminHolderName, setAdminHolderName] = useState("");
  const [adminAccountNumber, setAdminAccountNumber] = useState("");
  const [adminIfsc, setAdminIfsc] = useState("");
  const [adminBranch, setAdminBranch] = useState("");
  const [adminUpi, setAdminUpi] = useState("");
  const [platformFee, setPlatformFee] = useState<number>(3);

  // Filters
  const [hospSearch, setHospSearch] = useState("");
  const [hospFilter, setHospFilter] = useState<"all" | "pending" | "approved" | "blocked">("all");

  const [savingSettings, setSavingSettings] = useState(false);

  // Error Correction / Edit States
  const [editingHospital, setEditingHospital] = useState<Hospital | null>(null);
  const [hospEditName, setHospEditName] = useState("");
  const [hospEditContact, setHospEditContact] = useState("");
  const [hospEditAddress, setHospEditAddress] = useState("");
  const [hospEditLat, setHospEditLat] = useState("");
  const [hospEditLng, setHospEditLng] = useState("");
  const [updatingHosp, setUpdatingHosp] = useState(false);

  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [appEditStatus, setAppEditStatus] = useState<"Completed" | "Pending" | "Cancelled" | "Failed">("Pending");
  const [appEditDate, setAppEditDate] = useState("");
  const [appEditTime, setAppEditTime] = useState("");
  const [updatingApp, setUpdatingApp] = useState(false);

  const handleOpenEditHosp = (h: Hospital) => {
    setEditingHospital(h);
    setHospEditName(h.name);
    setHospEditContact(h.contact);
    setHospEditAddress(h.address);
    setHospEditLat(h.lat.toString());
    setHospEditLng(h.lng.toString());
  };

  const handleUpdateHospital = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHospital) return;
    setUpdatingHosp(true);
    try {
      const res = await fetch(`/api/admin/hospitals/${editingHospital.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: hospEditName,
          contact: hospEditContact,
          address: hospEditAddress,
          lat: parseFloat(hospEditLat),
          lng: parseFloat(hospEditLng)
        })
      });
      if (res.ok) {
        showToast("Hospital registry details corrected successfully", "success");
        setEditingHospital(null);
        fetchStats();
      } else {
        showToast("Failed to update hospital registration details", "error");
      }
    } catch {
      showToast("Communication failure during data edit", "error");
    } finally {
      setUpdatingHosp(false);
    }
  };

  const handleOpenEditApp = (app: Appointment) => {
    setEditingAppointment(app);
    setAppEditStatus(app.paymentStatus as any);
    setAppEditDate(app.appointmentDate);
    setAppEditTime(app.appointmentTime);
  };

  const handleUpdateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAppointment) return;
    setUpdatingApp(true);
    try {
      const res = await fetch(`/api/admin/appointments/${editingAppointment.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          paymentStatus: appEditStatus,
          appointmentDate: appEditDate,
          appointmentTime: appEditTime
        })
      });
      if (res.ok) {
        showToast("Appointment status and schedule corrected successfully", "success");
        setEditingAppointment(null);
        fetchStats();
      } else {
        showToast("Failed to resolve appointment details", "error");
      }
    } catch {
      showToast("Communication failure during booking edit", "error");
    } finally {
      setUpdatingApp(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchSettings();
  }, [activeSubTab]);

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/admin/stats", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      } else {
        showToast("Failed to fetch dashboard statistics", "error");
      }
    } catch {
      showToast("Network error fetching stats", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/admin/settings", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        setPlatformFee(data.platformFee || 3);
        if (data.adminBankDetails) {
          setAdminBankName(data.adminBankDetails.bankName || "");
          setAdminHolderName(data.adminBankDetails.accountHolderName || "");
          setAdminAccountNumber(data.adminBankDetails.accountNumber || "");
          setAdminIfsc(data.adminBankDetails.ifscCode || "");
          setAdminBranch(data.adminBankDetails.branch || "");
          setAdminUpi(data.adminBankDetails.upiId || "");
        }
      }
    } catch {
      console.error("Error fetching administrative settings");
    }
  };

  const handleApproveReject = async (hospId: string, approved: boolean) => {
    try {
      const res = await fetch(`/api/admin/hospitals/${hospId}/approve`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ approved })
      });
      if (res.ok) {
        showToast(approved ? "Hospital Approved successfully" : "Hospital Approval rejected", "success");
        fetchStats();
      } else {
        showToast("Operation failed", "error");
      }
    } catch {
      showToast("Communication error", "error");
    }
  };

  const handleBlockUnblock = async (hospId: string, blocked: boolean) => {
    try {
      const res = await fetch(`/api/admin/hospitals/${hospId}/block`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ blocked })
      });
      if (res.ok) {
        showToast(blocked ? "Hospital account blocked" : "Hospital account unblocked", "success");
        fetchStats();
      } else {
        showToast("Operation failed", "error");
      }
    } catch {
      showToast("Communication error", "error");
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          platformFee,
          adminBankDetails: {
            accountHolderName: adminHolderName,
            bankName: adminBankName,
            accountNumber: adminAccountNumber,
            ifscCode: adminIfsc,
            branch: adminBranch,
            upiId: adminUpi
          }
        })
      });
      if (res.ok) {
        showToast("Administrative and bank settings updated", "success");
        fetchSettings();
      } else {
        showToast("Failed to save settings", "error");
      }
    } catch {
      showToast("Communication error", "error");
    } finally {
      setSavingSettings(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 min-h-[50vh]">
        <Loader2 className="h-10 w-10 text-blue-600 animate-spin mb-4" />
        <p className="text-sm text-slate-500 font-medium">Loading administrative workspace...</p>
      </div>
    );
  }

  // Filter hospitals list
  let filteredHospitals = stats?.hospitals || [];
  if (hospSearch) {
    filteredHospitals = filteredHospitals.filter((h: Hospital) =>
      h.name.toLowerCase().includes(hospSearch.toLowerCase()) ||
      h.address.toLowerCase().includes(hospSearch.toLowerCase())
    );
  }
  if (hospFilter !== "all") {
    filteredHospitals = filteredHospitals.filter((h: Hospital) => {
      if (hospFilter === "pending") return !h.approved;
      if (hospFilter === "approved") return h.approved && !h.blocked;
      if (hospFilter === "blocked") return h.blocked;
      return true;
    });
  }

  // Pre-configured graph analytics based on bookings
  const dailyBookingsData = [
    { name: "Mon", bookings: 12, revenue: 4800 },
    { name: "Tue", bookings: 18, revenue: 7200 },
    { name: "Wed", bookings: 24, revenue: 9800 },
    { name: "Thu", bookings: 22, revenue: 8900 },
    { name: "Fri", bookings: 30, revenue: 12400 },
    { name: "Sat", bookings: 26, revenue: 10400 },
    { name: "Sun", bookings: 15, revenue: 6000 }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 md:py-10 select-none animate-in fade-in duration-300">
      {/* Admin Tab Header Buttons */}
      <div className="flex flex-wrap gap-2.5 bg-slate-100 p-1.5 rounded-2xl mb-8 max-w-4xl">
        {[
          { key: "overview", label: "Monetization Analytics", icon: TrendingUp },
          { key: "settings", label: "Commission & Bank Setup", icon: Settings },
          { key: "hospitals", label: "Hospital Registry Corrections", icon: Building2 },
          { key: "appointments", label: "Transaction & Booking Errors", icon: CalendarDays }
        ].map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeSubTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveSubTab(tab.key as any)}
              className={`flex items-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer ${
                isSelected
                  ? "bg-white text-blue-600 shadow-md"
                  : "text-slate-600 hover:bg-white/40 hover:text-slate-800"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* OVERVIEW ANALYTICS TAB */}
      {activeSubTab === "overview" && (
        <div className="space-y-8">
          {/* Statistics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {[
              { label: "Total Approved Hospitals", val: stats?.totalHospitals || 0, icon: Building2, color: "text-blue-600 bg-blue-50" },
              { label: "Registered Doctors", val: stats?.totalDoctors || 0, icon: Users, color: "text-emerald-600 bg-emerald-50" },
              { label: "Registered Patients", val: stats?.totalPatients || 0, icon: Users, color: "text-indigo-600 bg-indigo-50" },
              { label: "OP Bookings Handled", val: stats?.totalBookings || 0, icon: CalendarDays, color: "text-amber-600 bg-amber-50" },
              { label: "Gross Platform Revenue", val: `₹${stats?.totalRevenue || 0}`, icon: CreditCard, color: "text-cyan-600 bg-cyan-50" },
              { label: "Admin Platform Commission", val: `₹${stats?.platformRevenue || 0}`, icon: TrendingUp, color: "text-purple-600 bg-purple-50" },
              { label: "Settlement Pool (Hospitals)", val: `₹${(stats?.totalRevenue || 0) - (stats?.platformRevenue || 0)}`, icon: CheckCircle2, color: "text-teal-600 bg-teal-50" },
              { label: "Successful Payments", val: stats?.successfulPaymentsCount || 0, icon: CreditCard, color: "text-emerald-600 bg-emerald-100/50" }
            ].map((card, i) => (
              <div key={i} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{card.label}</span>
                  <div className={`${card.color} p-2 rounded-xl`}>
                    <card.icon className="h-5 w-5" />
                  </div>
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-slate-800">{card.val}</h3>
              </div>
            ))}
          </div>

          {/* Charts Segment */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs">
              <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider">Weekly Platform Commission Trend (₹)</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyBookingsData}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} />
                    <Tooltip />
                    <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs">
              <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider">Weekly Bookings Handled</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyBookingsData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} />
                    <Tooltip />
                    <Bar dataKey="bookings" fill="#10b981" radius={[4, 4, 0, 0]} barSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MANAGE HOSPITALS TAB */}
      {activeSubTab === "hospitals" && (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Hospital Registry Operations</h3>
            
            <div className="flex flex-wrap gap-2.5">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={hospSearch}
                  onChange={(e) => setHospSearch(e.target.value)}
                  placeholder="Search hospitals..."
                  className="bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-1.5 text-xs focus:bg-white focus:outline-none focus:border-blue-500 w-48 transition-all"
                />
              </div>

              {/* Status Filter */}
              <select
                value={hospFilter}
                onChange={(e: any) => setHospFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:bg-white focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending Approval</option>
                <option value="approved">Approved & Active</option>
                <option value="blocked">Blocked</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">Hospital Info</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">Registered Email & Contact</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">Location coordinates</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">Approval State</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredHospitals.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400 text-xs font-medium">
                      No hospitals found matching criteria.
                    </td>
                  </tr>
                ) : (
                  filteredHospitals.map((h: Hospital) => (
                    <tr key={h.id} className="hover:bg-slate-50/30 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={h.images[0]}
                            alt={h.name}
                            className="h-10 w-10 rounded-xl object-cover border border-slate-100 flex-shrink-0"
                          />
                          <div>
                            <p className="font-semibold text-slate-800 leading-tight">{h.name}</p>
                            <p className="text-[11px] text-slate-400 mt-0.5 max-w-[200px] truncate">{h.address}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="text-slate-700 font-medium">{h.email}</p>
                        <p className="text-xs text-slate-400 font-mono mt-0.5">{h.contact}</p>
                      </td>
                      <td className="p-4 font-mono text-xs text-slate-500">
                        Lat: {h.lat.toFixed(4)} <br /> Lng: {h.lng.toFixed(4)}
                      </td>
                      <td className="p-4">
                        {h.blocked ? (
                          <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            <ShieldAlert className="h-3 w-3" /> Blocked
                          </span>
                        ) : h.approved ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            Approved & Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
                            Pending Approval
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEditHosp(h)}
                            className="bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-100 p-1.5 rounded-xl transition-all cursor-pointer"
                            title="Correct Registry Error"
                          >
                            <Edit className="h-4 w-4" />
                          </button>

                          {!h.approved && (
                            <>
                              <button
                                onClick={() => handleApproveReject(h.id, true)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white p-1.5 rounded-xl transition-all cursor-pointer"
                                title="Approve Registration"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleApproveReject(h.id, false)}
                                className="bg-rose-50 hover:bg-rose-100 text-rose-600 p-1.5 rounded-xl transition-all cursor-pointer"
                                title="Reject Registration"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </>
                          )}
                          {h.approved && (
                            <button
                              onClick={() => handleBlockUnblock(h.id, !h.blocked)}
                              className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                                h.blocked
                                  ? "bg-slate-50 hover:bg-emerald-50 text-emerald-600 border-emerald-100"
                                  : "bg-rose-50 hover:bg-rose-100 text-rose-600 border-rose-100"
                              }`}
                            >
                              {h.blocked ? "Unblock" : "Block"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW BOOKINGS & SETTLEMENTS */}
      {activeSubTab === "appointments" && (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Gross Platform Bookings & Split Settlement Audit Log</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">Patient Details</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">Hospital & Doctor</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">OP ID / Payment ID</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase text-center">Platform Fee split</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase text-right">Settlement status</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {!stats?.appointments || stats.appointments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 text-xs font-medium">
                      No system transactions registered.
                    </td>
                  </tr>
                ) : (
                  stats.appointments.map((app: Appointment) => (
                    <tr key={app.id} className="hover:bg-slate-50/30 transition-colors">
                      <td className="p-4">
                        <p className="font-semibold text-slate-800">{app.patientName}</p>
                        <p className="text-xs text-slate-400 font-mono mt-0.5">{app.patientMobile}</p>
                      </td>
                      <td className="p-4">
                        <p className="font-medium text-slate-700 text-xs">{app.hospitalName}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">With {app.doctorName}</p>
                      </td>
                      <td className="p-4 font-mono text-xs">
                        <span className="text-blue-600 font-semibold block">{app.opId}</span>
                        <span className="text-slate-400 text-[10px] mt-0.5 block">{app.paymentId}</span>
                      </td>
                      <td className="p-4 text-center">
                        <div className="inline-block bg-slate-50 border border-slate-100 rounded-xl px-2.5 py-1.5">
                          <p className="text-xs font-bold text-slate-800 leading-none">₹{app.paymentAmount}</p>
                          <p className="text-[9px] text-slate-400 leading-none mt-1">
                            Admin (₹{app.adminShare}) | Hosp (₹{app.hospitalShare})
                          </p>
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            app.paymentStatus === "Completed"
                              ? "bg-emerald-100 text-emerald-800"
                              : app.paymentStatus === "Pending"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {app.paymentStatus === "Completed" ? "Settled (Completed)" : app.paymentStatus}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => handleOpenEditApp(app)}
                          className="bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-100 px-2.5 py-1 rounded-lg transition-all cursor-pointer inline-flex items-center gap-1 text-[11px] font-bold"
                          title="Correct Booking/Payment Error"
                        >
                          <Edit className="h-3 w-3" />
                          <span>Correct</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ADMINISTRATIVE SETTINGS & BANK ACCOUNTS */}
      {activeSubTab === "settings" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Info Card */}
          <div className="lg:col-span-1 bg-gradient-to-br from-slate-800 to-slate-900 text-white rounded-3xl p-6 shadow-xl flex flex-col justify-between">
            <div>
              <span className="text-xs bg-white/10 text-blue-300 font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider">
                System Guidelines
              </span>
              <h3 className="text-xl font-bold mt-4 leading-snug">Platform Commission & Split Payments</h3>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                As the main Platform Administrator, you set a standard platform flat fee for each booked OPD outpatient slot. 
                <br /><br />
                The mock Razorpay split settlement engine automatically directs this flat fee component directly to your administrative bank details configured here.
              </p>
            </div>
            <div className="mt-8 pt-6 border-t border-white/10 flex items-center gap-3">
              <Info className="h-5 w-5 text-blue-300 flex-shrink-0" />
              <p className="text-[10px] text-slate-400 font-mono">AUTHORIZED PERSONNEL USE ONLY</p>
            </div>
          </div>

          {/* Form Card */}
          <div className="lg:col-span-2 bg-white border border-slate-100 rounded-3xl p-6 shadow-xs">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-6">Commission & Financial Settlement Configuration</h3>

            <form onSubmit={handleSaveSettings} className="space-y-6">
              {/* Flat Fee setting */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2">Flat Administrative Fee per Appointment (₹)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  required
                  value={platformFee}
                  onChange={(e) => setPlatformFee(Number(e.target.value))}
                  className="w-full sm:w-1/3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Bank Account settings */}
              <div className="border-t border-slate-100 pt-6 space-y-4">
                <h4 className="text-xs font-bold text-blue-600 uppercase tracking-wider">Admin Settlement Bank Accounts</h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">Account Holder Name</label>
                    <input
                      type="text"
                      required
                      value={adminHolderName}
                      onChange={(e) => setAdminHolderName(e.target.value)}
                      placeholder="e.g. SmartOP Platform Admin"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:bg-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">Bank Name</label>
                    <input
                      type="text"
                      required
                      value={adminBankName}
                      onChange={(e) => setAdminBankName(e.target.value)}
                      placeholder="e.g. State Bank of India"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:bg-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">Account Number</label>
                    <input
                      type="text"
                      required
                      value={adminAccountNumber}
                      onChange={(e) => setAdminAccountNumber(e.target.value)}
                      placeholder="e.g. 1002003004005"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:bg-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">Bank IFSC Code</label>
                    <input
                      type="text"
                      required
                      value={adminIfsc}
                      onChange={(e) => setAdminIfsc(e.target.value)}
                      placeholder="e.g. SBIN0001234"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:bg-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">Branch</label>
                    <input
                      type="text"
                      required
                      value={adminBranch}
                      onChange={(e) => setAdminBranch(e.target.value)}
                      placeholder="e.g. MG Road, Bangalore"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:bg-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">UPI ID (Optional)</label>
                    <input
                      type="text"
                      value={adminUpi}
                      onChange={(e) => setAdminUpi(e.target.value)}
                      placeholder="e.g. admin@upi"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:bg-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-5 text-right">
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2.5 px-6 rounded-xl transition-all shadow-md shadow-blue-500/10 cursor-pointer disabled:opacity-50"
                >
                  {savingSettings ? "Saving Settings..." : "Save Configuration Parameters"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Hospital Edit Correction Modal */}
      {editingHospital && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs select-none">
          <div className="bg-white border border-slate-100 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="h-2 bg-blue-600" />
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Correct Hospital Registry Error</h3>
                <button
                  type="button"
                  onClick={() => setEditingHospital(null)}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleUpdateHospital} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Hospital Name</label>
                  <input
                    type="text"
                    required
                    value={hospEditName}
                    onChange={(e) => setHospEditName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:bg-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">Mobile Contact</label>
                    <input
                      type="text"
                      required
                      value={hospEditContact}
                      onChange={(e) => setHospEditContact(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:bg-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">Postal Address</label>
                    <input
                      type="text"
                      required
                      value={hospEditAddress}
                      onChange={(e) => setHospEditAddress(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:bg-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">Latitude Coordinate</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={hospEditLat}
                      onChange={(e) => setHospEditLat(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:bg-white focus:outline-none focus:border-blue-500"
                  />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">Longitude Coordinate</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={hospEditLng}
                      onChange={(e) => setHospEditLng(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:bg-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setEditingHospital(null)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs py-2 px-4 rounded-xl transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updatingHosp}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2 px-4 rounded-xl transition-all cursor-pointer disabled:opacity-50"
                  >
                    {updatingHosp ? "Saving Corrections..." : "Apply Corrections"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Appointment Edit Correction Modal */}
      {editingAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs select-none">
          <div className="bg-white border border-slate-100 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="h-2 bg-amber-500" />
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Correct Transaction & Booking Error</h3>
                <button
                  type="button"
                  onClick={() => setEditingAppointment(null)}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleUpdateAppointment} className="space-y-4">
                <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-2xl text-xs space-y-1">
                  <p className="text-slate-500 font-medium">Patient: <span className="text-slate-800 font-semibold">{editingAppointment.patientName}</span></p>
                  <p className="text-slate-500 font-medium">Hospital/Doctor: <span className="text-slate-800 font-semibold">{editingAppointment.hospitalName} - Dr. {editingAppointment.doctorName}</span></p>
                  <p className="text-slate-500 font-medium">OP ID / Fee: <span className="text-slate-800 font-semibold font-mono">{editingAppointment.opId}</span> (₹{editingAppointment.paymentAmount})</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Payment / Settlement Status</label>
                  <select
                    value={appEditStatus}
                    onChange={(e: any) => setAppEditStatus(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:bg-white focus:outline-none"
                  >
                    <option value="Completed">Completed (Settled)</option>
                    <option value="Pending">Pending</option>
                    <option value="Cancelled">Cancelled</option>
                    <option value="Failed">Failed (Error State)</option>
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">Changing to "Completed" forces system QR generation and split hospital billing settlement.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">Appointment Date</label>
                    <input
                      type="date"
                      required
                      value={appEditDate}
                      onChange={(e) => setAppEditDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:bg-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">Appointment Time Slot</label>
                    <input
                      type="text"
                      required
                      value={appEditTime}
                      onChange={(e) => setAppEditTime(e.target.value)}
                      placeholder="e.g. 10:30 AM"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:bg-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setEditingAppointment(null)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs py-2 px-4 rounded-xl transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updatingApp}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs py-2 px-4 rounded-xl transition-all cursor-pointer disabled:opacity-50"
                  >
                    {updatingApp ? "Resolving..." : "Save Status & Schedule"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
