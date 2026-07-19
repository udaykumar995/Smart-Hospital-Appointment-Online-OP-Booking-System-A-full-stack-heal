import React, { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import AuthScreen from "./components/AuthScreen";
import AdminDashboard from "./components/AdminDashboard";
import HospitalDashboard from "./components/HospitalDashboard";
import PatientDashboard from "./components/PatientDashboard";
import PaymentModal from "./components/PaymentModal";
import { LoggedInUser, Notification, Appointment } from "./types";
import { Info, CheckCircle, XCircle, AlertCircle, PlusCircle, Calendar, Clock, Download, QrCode, Search, Star, Bell, BellRing, Mail, Smartphone, Loader2 } from "lucide-react";

interface ToastMsg {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

export default function App() {
  const [user, setUser] = useState<LoggedInUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activePaymentApp, setActivePaymentApp] = useState<Appointment | null>(null);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);

  // Patient Booking History List (for displaying on side/bottom panel)
  const [patientHistory, setPatientHistory] = useState<Appointment[]>([]);
  const [activeMainTab, setActiveMainTab] = useState<"book" | "history">("book");
  const [historySearchQuery, setHistorySearchQuery] = useState("");
  const [historyStatusFilter, setHistoryStatusFilter] = useState("All");

  // State for rating/feedback on appointment history cards
  const [tempRatings, setTempRatings] = useState<Record<string, number>>({});
  const [tempComments, setTempComments] = useState<Record<string, string>>({});
  const [submittingFeedbackId, setSubmittingFeedbackId] = useState<string | null>(null);
  const [updatingReminderId, setUpdatingReminderId] = useState<string | null>(null);

  useEffect(() => {
    // Session restore
    const savedToken = localStorage.getItem("smartop_token");
    const savedUser = localStorage.getItem("smartop_user");
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
  }, []);

  useEffect(() => {
    if (token && user) {
      fetchNotifications();
      if (user.role === "patient") {
        fetchPatientHistory();
      }
    }
  }, [token, user]);

  const showToast = (message: string, type: "success" | "error" | "info") => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const fetchNotifications = async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/notifications", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error("Notifications fetch failure");
    }
  };

  const fetchPatientHistory = async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/patients/appointments", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPatientHistory(data);
      }
    } catch (err) {
      console.error("Appointments history fetch failure");
    }
  };

  const handleMarkNotifRead = async (id: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/notifications/${id}/read`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, read: true } : n))
        );
      }
    } catch {
      showToast("Could not mark as read", "error");
    }
  };

  const handleAuthSuccess = (savedToken: string, savedUser: any) => {
    setToken(savedToken);
    setUser(savedUser);
    localStorage.setItem("smartop_token", savedToken);
    localStorage.setItem("smartop_user", JSON.stringify(savedUser));
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    setNotifications([]);
    setPatientHistory([]);
    localStorage.removeItem("smartop_token");
    localStorage.removeItem("smartop_user");
    showToast("Logged out successfully.", "info");
  };

  const handleInitiatePayment = (appointment: Appointment) => {
    setActivePaymentApp(appointment);
  };

  const handlePaymentComplete = (success: boolean, appointment: Appointment | null) => {
    setActivePaymentApp(null);
    if (success) {
      fetchNotifications();
      fetchPatientHistory();
      setActiveMainTab("history"); // Auto switch to appointments list!
    }
  };

  const handleCancelAppointment = async (appId: string) => {
    if (!token) return;
    if (!window.confirm("Are you sure you want to cancel this appointment slot?")) return;

    try {
      const res = await fetch(`/api/patients/appointments/${appId}/cancel`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        showToast("Appointment Cancelled successfully. Refund processing.", "success");
        fetchPatientHistory();
        fetchNotifications();
      } else {
        showToast("Cancellation failed", "error");
      }
    } catch {
      showToast("Cancellation network timeout", "error");
    }
  };

  const handleFeedbackSubmit = async (appointmentId: string, rating: number, comment: string) => {
    if (!token) return;
    setSubmittingFeedbackId(appointmentId);
    try {
      const res = await fetch(`/api/patients/appointments/${appointmentId}/feedback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ rating, comment })
      });
      if (res.ok) {
        showToast("Feedback submitted successfully. Thank you!", "success");
        setTempRatings((prev) => {
          const next = { ...prev };
          delete next[appointmentId];
          return next;
        });
        setTempComments((prev) => {
          const next = { ...prev };
          delete next[appointmentId];
          return next;
        });
        fetchPatientHistory();
      } else {
        const errData = await res.json();
        showToast(errData.error || "Failed to submit feedback", "error");
      }
    } catch {
      showToast("Error submitting feedback", "error");
    } finally {
      setSubmittingFeedbackId(null);
    }
  };

  const handleToggleReminder = async (app: Appointment, enabled: boolean) => {
    if (!token) return;
    setUpdatingReminderId(app.id);
    try {
      const res = await fetch(`/api/patients/appointments/${app.id}/reminder`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          reminderEnabled: enabled,
          reminderType: app.reminderType || "push",
          reminderMinutesBefore: app.reminderMinutesBefore ?? 30
        })
      });
      if (res.ok) {
        showToast(
          enabled
            ? `Reminder activated for Dr. ${app.doctorName}`
            : `Reminder deactivated for Dr. ${app.doctorName}`,
          "success"
        );
        fetchPatientHistory();
        fetchNotifications();
      } else {
        showToast("Failed to update reminder settings", "error");
      }
    } catch {
      showToast("Network failure updating reminder", "error");
    } finally {
      setUpdatingReminderId(null);
    }
  };

  const handleUpdateReminderSettings = async (app: Appointment, type: "push" | "email" | "both", minutes: number) => {
    if (!token) return;
    setUpdatingReminderId(app.id);
    try {
      const res = await fetch(`/api/patients/appointments/${app.id}/reminder`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          reminderEnabled: true,
          reminderType: type,
          reminderMinutesBefore: minutes
        })
      });
      if (res.ok) {
        showToast(`Updated reminder settings: ${type === "both" ? "push & email" : type} at ${minutes === 0 ? "exact time" : minutes + "m prior"}`, "success");
        fetchPatientHistory();
        fetchNotifications();
      } else {
        showToast("Failed to save reminder preferences", "error");
      }
    } catch {
      showToast("Network failure updating reminder", "error");
    } finally {
      setUpdatingReminderId(null);
    }
  };

  const downloadICSFile = (app: Appointment) => {
    const parseDateTime = (dateStr: string, timeStr: string) => {
      let hours = 10;
      let minutes = 0;
      
      try {
        const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (match) {
          hours = parseInt(match[1], 10);
          minutes = parseInt(match[2], 10);
          const ampm = match[3].toUpperCase();
          if (ampm === "PM" && hours < 12) {
            hours += 12;
          } else if (ampm === "AM" && hours === 12) {
            hours = 0;
          }
        } else {
          const match2 = timeStr.match(/(\d+):(\d+)/);
          if (match2) {
            hours = parseInt(match2[1], 10);
            minutes = parseInt(match2[2], 10);
          }
        }
      } catch (e) {
        console.error("Error parsing time string", e);
      }
      
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        
        const startDate = new Date(year, month, day, hours, minutes, 0);
        const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
        return { start: startDate, end: endDate };
      }
      
      const fallbackStart = new Date();
      const fallbackEnd = new Date(fallbackStart.getTime() + 60 * 60 * 1000);
      return { start: fallbackStart, end: fallbackEnd };
    };

    const formatICSDate = (date: Date) => {
      const pad = (n: number) => n.toString().padStart(2, "0");
      const yyyy = date.getFullYear();
      const mm = pad(date.getMonth() + 1);
      const dd = pad(date.getDate());
      const hh = pad(date.getHours());
      const min = pad(date.getMinutes());
      const ss = pad(date.getSeconds());
      return `${yyyy}${mm}${dd}T${hh}${min}${ss}`;
    };

    const { start, end } = parseDateTime(app.appointmentDate, app.appointmentTime);
    const startStr = formatICSDate(start);
    const endStr = formatICSDate(end);

    const escapeText = (str: string) => {
      return str.replace(/[,;\\]/g, (match) => `\\${match}`).replace(/\n/g, "\\n");
    };

    const hospitalEscaped = escapeText(app.hospitalName || "Hospital");
    const doctorEscaped = escapeText(app.doctorName || "Doctor");
    const opIdEscaped = escapeText(app.opId || app.id);

    const icsLines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//SmartOP//Hospital Booking System//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      `SUMMARY:OP Consultation - Dr. ${doctorEscaped} (${hospitalEscaped})`,
      `UID:${app.id}@smartop.com`,
      "SEQUENCE:0",
      "STATUS:CONFIRMED",
      `DTSTART:${startStr}`,
      `DTEND:${endStr}`,
      `DESCRIPTION:OP Outpatient Consultation appointment\\nHospital: ${hospitalEscaped}\\nDoctor: Dr. ${doctorEscaped}\\nOP ID: ${opIdEscaped}\\nConsultation Fee: ₹${app.paymentAmount}`,
      `LOCATION:${hospitalEscaped}`,
      "END:VEVENT",
      "END:VCALENDAR"
    ];

    const icsContent = icsLines.join("\r\n");
    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `appointment-${app.opId || app.id}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast("iCalendar (.ics) file downloaded!", "success");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans relative">
      {/* Toast Overlay */}
      <div className="fixed top-5 right-5 z-50 space-y-2.5 max-w-sm pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`p-4 rounded-2xl shadow-xl flex items-start gap-3 pointer-events-auto border animate-in slide-in-from-right duration-200 ${
              t.type === "success"
                ? "bg-emerald-50 text-emerald-800 border-emerald-100"
                : t.type === "error"
                ? "bg-rose-50 text-rose-800 border-rose-100"
                : "bg-blue-50 text-blue-800 border-blue-100"
            }`}
          >
            {t.type === "success" && <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />}
            {t.type === "error" && <XCircle className="h-5 w-5 text-rose-600 flex-shrink-0 mt-0.5" />}
            {t.type === "info" && <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />}
            <p className="text-xs font-semibold leading-relaxed">{t.message}</p>
          </div>
        ))}
      </div>

      {!token || !user ? (
        <AuthScreen onAuthSuccess={handleAuthSuccess} showToast={showToast} />
      ) : (
        <>
          <Navbar
            user={user}
            onLogout={handleLogout}
            notifications={notifications}
            onMarkAsRead={handleMarkNotifRead}
          />

          <main className="flex-1">
            {/* ROLE ROUTER */}
            {user.role === "admin" && (
              <AdminDashboard token={token} showToast={showToast} />
            )}

            {user.role === "hospital" && (
              <HospitalDashboard token={token} showToast={showToast} />
            )}

            {user.role === "patient" && (
              <div className="space-y-6">
                {/* Patient Navigation Tabs */}
                <div className="bg-white border-b border-slate-100 px-4 md:px-8 py-3 shadow-xs">
                  <div className="max-w-7xl mx-auto flex gap-4">
                    <button
                      onClick={() => setActiveMainTab("book")}
                      className={`text-xs md:text-sm font-bold pb-2 border-b-2 transition-all cursor-pointer ${
                        activeMainTab === "book"
                          ? "border-blue-600 text-blue-600"
                          : "border-transparent text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      Search & Book OP Slots
                    </button>
                    <button
                      onClick={() => {
                        setActiveMainTab("history");
                        fetchPatientHistory();
                      }}
                      className={`text-xs md:text-sm font-bold pb-2 border-b-2 transition-all cursor-pointer ${
                        activeMainTab === "history"
                          ? "border-blue-600 text-blue-600"
                          : "border-transparent text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      Appointment History ({patientHistory.length})
                    </button>
                  </div>
                </div>

                {activeMainTab === "book" ? (
                  <PatientDashboard
                    token={token}
                    showToast={showToast}
                    onInitiatePayment={handleInitiatePayment}
                  />
                ) : (
                  <div className="max-w-7xl mx-auto px-4 py-6 md:py-8 animate-in fade-in duration-300">
                    <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xs">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                          My Booked OP Consultations
                        </h3>
                        {patientHistory.length > 0 && (
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                            <div className="relative w-full sm:w-72">
                              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                              <input
                                type="text"
                                value={historySearchQuery}
                                onChange={(e) => setHistorySearchQuery(e.target.value)}
                                placeholder="Search by doctor or hospital name..."
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs focus:bg-white focus:outline-none focus:border-blue-500 transition-colors"
                              />
                            </div>
                            <select
                              value={historyStatusFilter}
                              onChange={(e) => setHistoryStatusFilter(e.target.value)}
                              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
                            >
                              <option value="All">All Statuses</option>
                              <option value="Completed">Completed</option>
                              <option value="Pending">Pending</option>
                              <option value="Cancelled">Cancelled</option>
                              <option value="Failed">Failed</option>
                            </select>
                          </div>
                        )}
                      </div>

                      {(() => {
                        const filteredHistory = patientHistory.filter((app) => {
                          const query = historySearchQuery.trim().toLowerCase();
                          const matchesQuery = !query ||
                            (app.doctorName || "").toLowerCase().includes(query) ||
                            (app.hospitalName || "").toLowerCase().includes(query) ||
                            (app.opId || "").toLowerCase().includes(query);

                          const matchesStatus = historyStatusFilter === "All" || app.paymentStatus === historyStatusFilter;

                          return matchesQuery && matchesStatus;
                        });

                        return (
                          <>
                            {filteredHistory.length === 0 ? (
                              <div className="text-center py-12">
                                <p className="text-slate-400 text-xs font-medium">
                                  {patientHistory.length === 0
                                    ? "You have no outpatient appointments booked yet."
                                    : "No matching outpatient appointments found."}
                                </p>
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {filteredHistory.map((app) => (
                                  <div
                                    key={app.id}
                                    className="bg-slate-50 border border-slate-100 p-5 rounded-3xl relative overflow-hidden flex flex-col justify-between"
                                  >
                                    <div className="space-y-4">
                                      <div className="flex items-center justify-between">
                                        <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                          {app.opId}
                                        </span>
                                        <span
                                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                                            app.paymentStatus === "Completed"
                                              ? "bg-emerald-100 text-emerald-800"
                                              : app.paymentStatus === "Pending"
                                              ? "bg-amber-100 text-amber-800"
                                              : "bg-rose-100 text-rose-800"
                                          }`}
                                        >
                                          {app.paymentStatus}
                                        </span>
                                      </div>

                                      <div className="space-y-1.5 text-xs text-slate-600">
                                        <div className="flex justify-between">
                                          <span className="font-semibold text-slate-400">Hospital:</span>
                                          <span className="font-bold text-slate-800">{app.hospitalName}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="font-semibold text-slate-400">Doctor:</span>
                                          <span className="font-bold text-slate-800">{app.doctorName}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="font-semibold text-slate-400">Scheduled Date:</span>
                                          <span className="font-bold text-slate-800">{app.appointmentDate}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="font-semibold text-slate-400">Time Slot:</span>
                                          <span className="font-bold text-slate-800">{app.appointmentTime}</span>
                                        </div>
                                        <div className="flex justify-between border-t border-slate-200/50 pt-2 mt-2">
                                          <span className="font-semibold text-slate-400">Paid amount:</span>
                                          <span className="font-bold text-blue-600">₹{app.paymentAmount}</span>
                                        </div>
                                      </div>

                                      {/* CONSULTATION REMINDERS CONFIGURATION SECTION */}
                                      {app.paymentStatus !== "Cancelled" && app.paymentStatus !== "Failed" && (
                                        <div className="mt-4 p-3.5 bg-slate-50 rounded-2xl border border-slate-200/50 animate-in fade-in duration-300">
                                          <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2.5">
                                              <div className={`p-1.5 rounded-xl transition-colors duration-200 ${app.reminderEnabled ? "bg-blue-100 text-blue-600" : "bg-slate-200 text-slate-500"}`}>
                                                {app.reminderEnabled ? <BellRing className="h-3.5 w-3.5" /> : <Bell className="h-3.5 w-3.5" />}
                                              </div>
                                              <div>
                                                <p className="text-xs font-bold text-slate-800">Consultation Reminder</p>
                                                <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                                                  {app.reminderEnabled 
                                                    ? `${app.reminderType === "both" ? "Push & Email" : app.reminderType === "email" ? "Email" : "Push"} • ${app.reminderMinutesBefore === 0 ? "At exact time" : `${app.reminderMinutesBefore}m before`}`
                                                    : "Inactive • Disabled"}
                                                </p>
                                              </div>
                                            </div>

                                            <div className="flex items-center">
                                              {updatingReminderId === app.id ? (
                                                <Loader2 className="h-4 w-4 text-blue-600 animate-spin mr-2" />
                                              ) : (
                                                <button
                                                  type="button"
                                                  onClick={() => handleToggleReminder(app, !app.reminderEnabled)}
                                                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                                    app.reminderEnabled ? "bg-blue-600" : "bg-slate-300"
                                                  }`}
                                                >
                                                  <span
                                                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                                                      app.reminderEnabled ? "translate-x-4" : "translate-x-0"
                                                    }`}
                                                  />
                                                </button>
                                              )}
                                            </div>
                                          </div>

                                          {app.reminderEnabled && (
                                            <div className="mt-3 pt-3 border-t border-slate-200/60 space-y-3.5 animate-in slide-in-from-top-1 duration-200">
                                              {/* Channel Selector */}
                                              <div>
                                                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Reminder Channel</span>
                                                <div className="grid grid-cols-3 gap-1.5 bg-slate-200/40 p-1 rounded-xl">
                                                  {[
                                                    { key: "push", icon: Smartphone, label: "Push" },
                                                    { key: "email", icon: Mail, label: "Email" },
                                                    { key: "both", icon: BellRing, label: "Both" }
                                                  ].map((item) => {
                                                    const Icon = item.icon;
                                                    const isSelected = (app.reminderType || "push") === item.key;
                                                    return (
                                                      <button
                                                        key={item.key}
                                                        type="button"
                                                        onClick={() => handleUpdateReminderSettings(app, item.key as any, app.reminderMinutesBefore ?? 30)}
                                                        className={`flex items-center justify-center gap-1 py-1 px-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                                                          isSelected
                                                            ? "bg-white text-blue-600 shadow-xs border-slate-100"
                                                            : "text-slate-500 hover:text-slate-800"
                                                        }`}
                                                      >
                                                        <Icon className="h-3 w-3" />
                                                        <span>{item.label}</span>
                                                      </button>
                                                    );
                                                  })}
                                                </div>
                                              </div>

                                              {/* Lead Time / Timing Selector */}
                                              <div>
                                                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Notification Lead Time</span>
                                                <div className="grid grid-cols-4 gap-1.5">
                                                  {[
                                                    { value: 0, label: "Exact" },
                                                    { value: 15, label: "15m" },
                                                    { value: 30, label: "30m" },
                                                    { value: 60, label: "1h" }
                                                  ].map((timing) => {
                                                    const isSelected = (app.reminderMinutesBefore ?? 30) === timing.value;
                                                    return (
                                                      <button
                                                        key={timing.value}
                                                        type="button"
                                                        onClick={() => handleUpdateReminderSettings(app, app.reminderType || "push", timing.value)}
                                                        className={`py-1 px-1 text-center rounded-xl text-[10px] font-bold transition-all border cursor-pointer ${
                                                          isSelected
                                                            ? "bg-blue-50 text-blue-600 border-blue-200"
                                                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                                                        }`}
                                                      >
                                                        {timing.label}
                                                      </button>
                                                    );
                                                  })}
                                                </div>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      )}

                                      {/* STAR RATING & FEEDBACK COMPONENT FOR COMPLETED BOOKINGS */}
                                      {app.paymentStatus === "Completed" && app.rating && (
                                        <div className="mt-3.5 p-3 bg-emerald-50/50 rounded-2xl border border-emerald-100/50 animate-in fade-in duration-300">
                                          <div className="flex items-center gap-1.5 mb-1">
                                            <span className="text-[9px] font-bold text-emerald-800 uppercase tracking-wider bg-emerald-100 px-2 py-0.5 rounded-md">
                                              Your Rating
                                            </span>
                                            <div className="flex gap-0.5 ml-auto">
                                              {[1, 2, 3, 4, 5].map((star) => (
                                                <Star
                                                  key={star}
                                                  className={`h-3 w-3 ${
                                                    star <= (app.rating || 0) ? "text-amber-400 fill-amber-400" : "text-slate-200"
                                                  }`}
                                                />
                                              ))}
                                            </div>
                                          </div>
                                          {app.feedbackComment && (
                                            <p className="text-[11px] text-slate-600 font-medium italic mt-1.5">
                                              "{app.feedbackComment}"
                                            </p>
                                          )}
                                        </div>
                                      )}

                                      {app.paymentStatus === "Completed" && !app.rating && (
                                        <div className="mt-4 pt-3.5 border-t border-slate-100 animate-in fade-in duration-300">
                                          <p className="text-[11px] font-semibold text-slate-500 mb-1.5">
                                            How was your consultation experience?
                                          </p>
                                          <div className="flex items-center gap-1.5 mb-2">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                              <button
                                                key={star}
                                                type="button"
                                                onClick={() => setTempRatings({ ...tempRatings, [app.id]: star })}
                                                className="focus:outline-none transition-transform active:scale-90 hover:scale-110"
                                              >
                                                <Star
                                                  className={`h-5 w-5 ${
                                                    star <= (tempRatings[app.id] || 0)
                                                      ? "text-amber-400 fill-amber-400"
                                                      : "text-slate-300 hover:text-amber-400"
                                                  }`}
                                                />
                                              </button>
                                            ))}
                                            {tempRatings[app.id] > 0 && (
                                              <span className="text-[10px] font-bold text-slate-600 ml-1.5 bg-slate-100 px-2 py-0.5 rounded-md">
                                                {tempRatings[app.id]} Star{tempRatings[app.id] > 1 ? "s" : ""}
                                              </span>
                                            )}
                                          </div>
                                          {tempRatings[app.id] > 0 && (
                                            <div className="space-y-2 mt-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
                                              <textarea
                                                placeholder="Write your feedback comment (optional)..."
                                                value={tempComments[app.id] || ""}
                                                onChange={(e) => setTempComments({ ...tempComments, [app.id]: e.target.value })}
                                                className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors resize-none"
                                                rows={2}
                                              />
                                              <button
                                                type="button"
                                                onClick={() => handleFeedbackSubmit(app.id, tempRatings[app.id], tempComments[app.id])}
                                                disabled={submittingFeedbackId === app.id}
                                                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold text-xs py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                                              >
                                                {submittingFeedbackId === app.id ? "Submitting..." : "Submit Feedback"}
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>

                                    <div className="flex flex-wrap gap-2.5 mt-5 pt-4 border-t border-slate-200/50">
                                      {app.paymentStatus === "Completed" && (
                                        <a
                                          href={app.qrCodeUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="flex-1 min-w-[120px] bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all"
                                        >
                                          <QrCode className="h-4 w-4" />
                                          <span>Verify QR Code</span>
                                        </a>
                                      )}

                                      {app.paymentStatus !== "Cancelled" && app.paymentStatus !== "Failed" && (
                                        <button
                                          onClick={() => downloadICSFile(app)}
                                          className="flex-1 min-w-[120px] bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-100 font-bold text-xs py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                                        >
                                          <Calendar className="h-4 w-4" />
                                          <span>Add to Calendar</span>
                                        </button>
                                      )}

                                      {app.paymentStatus === "Completed" && (
                                        <button
                                          onClick={() => handleCancelAppointment(app.id)}
                                          className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 font-bold text-xs py-2 px-4 rounded-xl transition-all cursor-pointer"
                                        >
                                          Cancel
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>
            )}
          </main>

          {/* ACTIVE RAZORPAY PAYMENT SIMULATION MODAL */}
          {activePaymentApp && (
            <PaymentModal
              token={token}
              appointment={activePaymentApp}
              onPaymentComplete={handlePaymentComplete}
              onClose={() => setActivePaymentApp(null)}
              showToast={showToast}
            />
          )}
        </>
      )}
    </div>
  );
}
