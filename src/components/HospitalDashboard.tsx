import React, { useState, useEffect } from "react";
import { Hospital, Doctor, Appointment, Review, BankDetails } from "../types";
import {
  Stethoscope,
  CalendarCheck,
  LineChart,
  UserCheck,
  Building2,
  Trash2,
  Edit2,
  Plus,
  Search,
  CheckCircle,
  Clock,
  MapPin,
  Star,
  DollarSign,
  Loader2,
  X,
  CreditCard,
  Phone,
  Settings
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";

interface HospitalDashboardProps {
  token: string;
  showToast: (msg: string, type: "success" | "error" | "info") => void;
}

export default function HospitalDashboard({ token, showToast }: HospitalDashboardProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [analytics, setAnalytics] = useState<any>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [profile, setProfile] = useState<Hospital | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<"overview" | "doctors" | "bookings" | "profile" | "banking">("overview");

  // Filter Bookings
  const [bookingSearch, setBookingSearch] = useState("");
  const [bookingFilterStatus, setBookingFilterStatus] = useState<"all" | "Completed" | "Pending" | "Cancelled">("all");

  // Doctor Modals
  const [showDoctorModal, setShowDoctorModal] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [docName, setDocName] = useState("");
  const [docSpecialization, setDocSpecialization] = useState("General Physician");
  const [docQualification, setDocQualification] = useState("");
  const [docExperience, setDocExperience] = useState("");
  const [docFee, setDocFee] = useState("");
  const [docLimit, setDocLimit] = useState("");
  const [docTimings, setDocTimings] = useState("");
  const [docPhoto, setDocPhoto] = useState("");
  const [docDays, setDocDays] = useState<string[]>(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]);

  // Profile Edit fields
  const [profileName, setProfileName] = useState("");
  const [profileContact, setProfileContact] = useState("");
  const [profileAddress, setProfileAddress] = useState("");
  const [profileDesc, setProfileDesc] = useState("");
  const [profileHours, setProfileHours] = useState("");
  const [profileLat, setProfileLat] = useState("");
  const [profileLng, setProfileLng] = useState("");
  const [profileImg, setProfileImg] = useState("");

  // Bank Account fields
  const [bankHolderName, setBankHolderName] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankIfscCode, setBankIfscCode] = useState("");
  const [bankBranch, setBankBranch] = useState("");
  const [bankUpiId, setBankUpiId] = useState("");

  const specializationsList = [
    "General Physician",
    "Cardiology",
    "Pediatrics",
    "Gynecologist",
    "Dermatology",
    "Orthopedics",
    "Neurology",
    "Ophthalmology"
  ];

  const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  useEffect(() => {
    fetchDashboardData();
  }, [activeSubTab]);

  const fetchDashboardData = async () => {
    try {
      // 1. Fetch profile/me
      const profileRes = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (profileRes.ok) {
        const pData = await profileRes.json();
        setProfile(pData);
        setProfileName(pData.name || "");
        setProfileContact(pData.contact || "");
        setProfileAddress(pData.address || "");
        setProfileDesc(pData.description || "");
        setProfileHours(pData.workingHours || "");
        setProfileLat(pData.lat ? String(pData.lat) : "");
        setProfileLng(pData.lng ? String(pData.lng) : "");
        setProfileImg(pData.images ? pData.images[0] : "");

        if (pData.bankDetails) {
          setBankHolderName(pData.bankDetails.accountHolderName || "");
          setBankName(pData.bankDetails.bankName || "");
          setBankAccountNumber(pData.bankDetails.accountNumber || "");
          setBankIfscCode(pData.bankDetails.ifscCode || "");
          setBankBranch(pData.bankDetails.branch || "");
          setBankUpiId(pData.bankDetails.upiId || "");
        }
      }

      // 2. Fetch Analytics
      const analyticsRes = await fetch("/api/hospitals/dashboard/analytics", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (analyticsRes.ok) {
        const aData = await analyticsRes.json();
        setAnalytics(aData);
      }

      // 3. Fetch Appointments
      const bookingsRes = await fetch("/api/hospitals/dashboard/appointments", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (bookingsRes.ok) {
        const bData = await bookingsRes.json();
        setAppointments(bData);
      }

      // 4. Fetch Reviews (from hospital info endpoint)
      if (profile) {
        const hospInfoRes = await fetch(`/api/hospitals/${profile.id}`);
        if (hospInfoRes.ok) {
          const info = await hospInfoRes.json();
          setReviews(info.reviews || []);
        }
      }
    } catch {
      showToast("Error retrieving hospital records", "error");
    } finally {
      setLoading(false);
    }
  };

  // Profile Save
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/hospitals/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: profileName,
          contact: profileContact,
          address: profileAddress,
          description: profileDesc,
          workingHours: profileHours,
          lat: profileLat,
          lng: profileLng,
          images: profileImg ? [profileImg] : undefined
        })
      });
      if (res.ok) {
        showToast("Hospital profile details modified successfully", "success");
        fetchDashboardData();
      } else {
        showToast("Failed to modify hospital profile", "error");
      }
    } catch {
      showToast("Communication error", "error");
    }
  };

  // Save Bank details
  const handleSaveBank = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/hospitals/profile/bank-details", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          accountHolderName: bankHolderName,
          bankName,
          accountNumber: bankAccountNumber,
          ifscCode: bankIfscCode,
          branch: bankBranch,
          upiId: bankUpiId
        })
      });
      if (res.ok) {
        showToast("Hospital settlement bank details registered", "success");
        fetchDashboardData();
      } else {
        showToast("Failed to save bank information", "error");
      }
    } catch {
      showToast("Communication error", "error");
    }
  };

  // Add or Edit Doctor
  const openDocModal = (doc: Doctor | null = null) => {
    if (doc) {
      setEditingDoctor(doc);
      setDocName(doc.name);
      setDocSpecialization(doc.specialization);
      setDocQualification(doc.qualification);
      setDocExperience(doc.experience);
      setDocFee(String(doc.consultationFee));
      setDocLimit(String(doc.dailyOpLimit));
      setDocTimings(doc.availableTimings);
      setDocPhoto(doc.photo);
      setDocDays(doc.availableDays);
    } else {
      setEditingDoctor(null);
      setDocName("");
      setDocSpecialization("General Physician");
      setDocQualification("");
      setDocExperience("");
      setDocFee("400");
      setDocLimit("20");
      setDocTimings("09:00 AM - 01:00 PM");
      setDocPhoto("");
      setDocDays(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]);
    }
    setShowDoctorModal(true);
  };

  const handleSaveDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: docName,
      photo: docPhoto || undefined,
      qualification: docQualification,
      experience: docExperience,
      specialization: docSpecialization,
      consultationFee: Number(docFee),
      availableDays: docDays,
      availableTimings: docTimings,
      dailyOpLimit: Number(docLimit)
    };

    let url = "/api/hospitals/doctors";
    let method = "POST";

    if (editingDoctor) {
      url = `/api/hospitals/doctors/${editingDoctor.id}`;
      method = "PUT";
    }

    try {
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showToast(editingDoctor ? "Doctor details updated" : "Doctor registered successfully", "success");
        setShowDoctorModal(false);
        fetchDashboardData();
      } else {
        showToast("Failed to save doctor registry", "error");
      }
    } catch {
      showToast("Communication error", "error");
    }
  };

  const handleDeleteDoctor = async (docId: string) => {
    if (!window.confirm("Are you sure you want to remove this doctor from the registry?")) return;
    try {
      const res = await fetch(`/api/hospitals/doctors/${docId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        showToast("Doctor registry deleted", "success");
        fetchDashboardData();
      } else {
        showToast("Failed to delete doctor profile", "error");
      }
    } catch {
      showToast("Communication error", "error");
    }
  };

  const handleToggleDay = (day: string) => {
    if (docDays.includes(day)) {
      setDocDays(docDays.filter((d) => d !== day));
    } else {
      setDocDays([...docDays, day]);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 min-h-[50vh]">
        <Loader2 className="h-10 w-10 text-blue-600 animate-spin mb-4" />
        <p className="text-sm text-slate-500 font-medium">Loading hospital parameters...</p>
      </div>
    );
  }

  // Filter Bookings
  let filteredBookings = appointments;
  if (bookingSearch) {
    const q = bookingSearch.toLowerCase();
    filteredBookings = filteredBookings.filter(
      (b) =>
        b.patientName.toLowerCase().includes(q) ||
        b.doctorName.toLowerCase().includes(q) ||
        b.opId.toLowerCase().includes(q)
    );
  }
  if (bookingFilterStatus !== "all") {
    filteredBookings = filteredBookings.filter((b) => b.paymentStatus === bookingFilterStatus);
  }

  // Generate Recharts Chart Data
  const doctorWorkloadData = analytics?.doctorsList?.map((d: Doctor) => ({
    name: d.name.replace("Dr. ", ""),
    booked: d.bookedCount,
    limit: d.dailyOpLimit
  })) || [];

  const COLORS = ["#3b82f6", "#10b981", "#6366f1", "#f59e0b", "#ec4899"];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 md:py-10 select-none animate-in fade-in duration-300">
      {/* Sub tabs navigation */}
      <div className="flex flex-wrap gap-2 bg-slate-100 p-1.5 rounded-2xl mb-8 max-w-3xl">
        {[
          { key: "overview", label: "Analytics Overview", icon: LineChart },
          { key: "doctors", label: "Doctor Management", icon: Stethoscope },
          { key: "bookings", label: "Appointments & OP Slots", icon: CalendarCheck },
          { key: "profile", label: "Hospital Profile", icon: Building2 },
          { key: "banking", label: "Bank details Setup", icon: Settings }
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

      {/* OVERVIEW TAB */}
      {activeSubTab === "overview" && (
        <div className="space-y-8">
          {/* Dashboard Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 md:gap-5">
            {[
              { label: "Active Doctors", val: analytics?.totalDoctors || 0, icon: Stethoscope, color: "text-blue-600 bg-blue-50" },
              { label: "Today's Outpatients", val: analytics?.todayPatients || 0, icon: UserCheck, color: "text-emerald-600 bg-emerald-50" },
              { label: "Today's Net Revenue", val: `₹${analytics?.todayRevenue || 0}`, icon: DollarSign, color: "text-indigo-600 bg-indigo-50" },
              { label: "Aggregate Booked OP", val: analytics?.totalBookedOp || 0, icon: CalendarCheck, color: "text-purple-600 bg-purple-50" },
              { label: "Remaining OP Capacity", val: analytics?.remainingOp || 0, icon: Clock, color: "text-amber-600 bg-amber-50" }
            ].map((card, i) => (
              <div key={i} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none">
                    {card.label}
                  </span>
                  <div className={`${card.color} p-2 rounded-xl`}>
                    <card.icon className="h-4 w-4" />
                  </div>
                </div>
                <h3 className="text-lg md:text-xl font-extrabold text-slate-800">{card.val}</h3>
              </div>
            ))}
          </div>

          {/* Recharts Analytics graphs */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Daily limit workload charts */}
            <div className="lg:col-span-2 bg-white border border-slate-100 rounded-2xl p-5 shadow-xs">
              <h3 className="text-xs font-bold text-slate-800 mb-4 uppercase tracking-wider">OPD Outpatient Slots Utilisation Capacity (Today)</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={doctorWorkloadData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} />
                    <Tooltip />
                    <Bar dataKey="booked" fill="#3b82f6" name="Slots Booked" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="limit" fill="#e2e8f0" name="Total Daily Limit" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Google Rating card & review logs */}
            <div className="lg:col-span-1 bg-white border border-slate-100 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-800 mb-4 uppercase tracking-wider">Patient Trust Reviews</h3>
                <div className="flex items-center gap-2 mb-4 bg-slate-50 border border-slate-100 p-3 rounded-2xl">
                  <Star className="h-6 w-6 text-amber-500 fill-amber-500" />
                  <div>
                    <p className="text-xl font-black text-slate-800 leading-none">{profile?.rating || "4.5"}</p>
                    <p className="text-[10px] text-slate-400 mt-1">Based on Google Reviews rating metrics</p>
                  </div>
                </div>

                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {reviews.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-6">No patient testimonials listed yet.</p>
                  ) : (
                    reviews.map((rev) => (
                      <div key={rev.id} className="border-b border-slate-50 pb-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-700">{rev.patientName}</span>
                          <span className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded flex items-center gap-0.5 font-bold">
                            {rev.rating} <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" />
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 italic mt-1 font-medium">"{rev.comment}"</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="text-center pt-3 border-t border-slate-50">
                <span className="text-[10px] text-blue-500 font-bold uppercase tracking-wider">Google Rating: Verified Sync</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DOCTORS DIRECTORY MANAGEMENT */}
      {activeSubTab === "doctors" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex items-center justify-between bg-white border border-slate-100 p-4 rounded-2xl shadow-xs">
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Outpatient Consulting Doctors</h3>
              <p className="text-xs text-slate-400 font-medium mt-1">Manage consultation pricing and daily OP maximum booking capacities.</p>
            </div>
            <button
              onClick={() => openDocModal()}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2 px-4 rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-blue-500/10 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Add Consulting Doctor</span>
            </button>
          </div>

          {/* Doctor Cards grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {!analytics?.doctorsList || analytics.doctorsList.length === 0 ? (
              <div className="col-span-full bg-white border border-slate-100 p-12 text-center rounded-2xl">
                <p className="text-slate-400 text-sm font-medium">No doctors currently cataloged in this hospital registry.</p>
              </div>
            ) : (
              analytics.doctorsList.map((doc: Doctor) => {
                const isFullyBooked = doc.bookedCount >= doc.dailyOpLimit;
                return (
                  <div key={doc.id} className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xs relative overflow-hidden flex flex-col justify-between">
                    <div>
                      {/* Booking status badge */}
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full capitalize">
                          {doc.specialization}
                        </span>
                        {isFullyBooked ? (
                          <span className="text-[10px] bg-rose-100 text-rose-800 font-black px-2 py-0.5 rounded-full uppercase animate-pulse">
                            Fully Booked
                          </span>
                        ) : (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                            {doc.dailyOpLimit - doc.bookedCount} OP Slots Left
                          </span>
                        )}
                      </div>

                      <div className="flex items-start gap-3.5 pb-4 border-b border-slate-50">
                        <img
                          src={doc.photo}
                          alt={doc.name}
                          className="h-16 w-16 rounded-2xl object-cover border border-slate-100"
                        />
                        <div>
                          <h4 className="font-bold text-slate-800 text-base">{doc.name}</h4>
                          <p className="text-xs text-blue-600 font-semibold mt-1 leading-tight">{doc.qualification}</p>
                          <p className="text-[11px] text-slate-400 mt-1">Experience: {doc.experience}</p>
                        </div>
                      </div>

                      {/* Consultation parameters */}
                      <div className="py-4 space-y-2.5 text-xs text-slate-500">
                        <div className="flex justify-between">
                          <span className="font-medium">Consultation OPD Pricing:</span>
                          <span className="font-bold text-slate-700">₹{doc.consultationFee}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium">Available Days:</span>
                          <span className="font-bold text-slate-700 text-right max-w-[150px] truncate">
                            {doc.availableDays.join(", ")}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium">OP Consultation Timings:</span>
                          <span className="font-bold text-slate-700 flex items-center gap-1">
                            <Clock className="h-3 w-3 text-slate-400" /> {doc.availableTimings}
                          </span>
                        </div>
                        <div className="flex justify-between items-center bg-slate-50 p-2 rounded-xl border border-slate-100 mt-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Booked OP Slots (Today)</span>
                          <span className="text-xs font-black text-slate-800">
                            {doc.bookedCount} / {doc.dailyOpLimit} Max
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-50 flex justify-end gap-2">
                      <button
                        onClick={() => openDocModal(doc)}
                        className="bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-600 p-2 rounded-xl transition-colors cursor-pointer border border-slate-100"
                        title="Edit doctor profile"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteDoctor(doc.id)}
                        className="bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-600 p-2 rounded-xl transition-colors cursor-pointer border border-slate-100"
                        title="Delete doctor"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* APPOINTMENT BOOKINGS AUDIT */}
      {activeSubTab === "bookings" && (
        <div className="bg-white border border-slate-100 rounded-3xl shadow-xs overflow-hidden animate-in fade-in duration-300">
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center">
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Patient Bookings & Sessions</h3>
              <p className="text-xs text-slate-400 font-medium mt-1">Search or filter outpatient appointment allocations.</p>
            </div>

            <div className="flex flex-wrap gap-2.5">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={bookingSearch}
                  onChange={(e) => setBookingSearch(e.target.value)}
                  placeholder="Patient, doctor or OP ID..."
                  className="bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-1.5 text-xs focus:bg-white focus:outline-none focus:border-blue-500 w-48 transition-all"
                />
              </div>

              <select
                value={bookingFilterStatus}
                onChange={(e: any) => setBookingFilterStatus(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:bg-white focus:outline-none"
              >
                <option value="all">All Payment Statuses</option>
                <option value="Completed">Completed Payments</option>
                <option value="Pending">Pending Payments</option>
                <option value="Cancelled">Cancelled/Refunded</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">Patient Profile</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">Consulting Doctor</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">Schedule Day & Time</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase font-mono">OP ID / Transaction ID</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase text-right">Settlement Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredBookings.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400 text-xs font-medium">
                      No matching outpatient bookings found.
                    </td>
                  </tr>
                ) : (
                  filteredBookings.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/30 transition-colors">
                      <td className="p-4">
                        <p className="font-semibold text-slate-800">{b.patientName}</p>
                        <p className="text-xs text-slate-400 font-mono mt-0.5">{b.patientMobile} | Age: {b.patientAge}</p>
                      </td>
                      <td className="p-4 font-semibold text-slate-700">
                        {b.doctorName}
                      </td>
                      <td className="p-4">
                        <p className="font-medium text-slate-800 text-xs">{b.appointmentDate}</p>
                        <p className="text-[10px] text-slate-400 font-medium mt-1 flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {b.appointmentTime}
                        </p>
                      </td>
                      <td className="p-4 font-mono text-xs">
                        <span className="text-blue-600 font-semibold block">{b.opId}</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">{b.paymentId}</span>
                      </td>
                      <td className="p-4 text-right">
                        <p className="text-xs font-bold text-slate-800">₹{b.hospitalShare}</p>
                        <span
                          className={`inline-block text-[9px] font-bold mt-1 px-2 py-0.5 rounded-full ${
                            b.paymentStatus === "Completed"
                              ? "bg-emerald-100 text-emerald-800"
                              : b.paymentStatus === "Pending"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {b.paymentStatus}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* HOSPITAL PROFILE EDIT */}
      {activeSubTab === "profile" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
          <div className="lg:col-span-1 bg-white border border-slate-100 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Hospital Profile Preview</h4>
              <img
                src={profileImg || "https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?w=600&auto=format&fit=crop&q=60"}
                alt="Hospital Preview"
                className="w-full h-44 rounded-2xl object-cover border border-slate-100"
              />
              <div>
                <h3 className="font-bold text-slate-800 text-lg leading-tight">{profileName || "Hospital"}</h3>
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {profileAddress}</p>
              </div>
              <div className="text-xs text-slate-500 leading-relaxed border-t border-slate-50 pt-3">
                {profileDesc || "No profile description configured yet."}
              </div>
            </div>
            <div className="border-t border-slate-50 pt-4 mt-6 text-xs text-slate-400 font-mono">
              GPS coordinates: Lat: {profileLat}, Lng: {profileLng}
            </div>
          </div>

          <div className="lg:col-span-2 bg-white border border-slate-100 rounded-3xl p-6 shadow-xs">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-6">Modify Hospital Information</h3>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Hospital Name</label>
                  <input
                    type="text"
                    required
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:bg-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Contact Number</label>
                  <input
                    type="text"
                    required
                    value={profileContact}
                    onChange={(e) => setProfileContact(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:bg-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Postal Address</label>
                <input
                  type="text"
                  required
                  value={profileAddress}
                  onChange={(e) => setProfileAddress(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:bg-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Hospital Short Bio/Description</label>
                <textarea
                  rows={3}
                  value={profileDesc}
                  onChange={(e) => setProfileDesc(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:bg-white focus:outline-none focus:border-blue-500"
                  placeholder="Tell patients about your medical expertise..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Working Hours Schedule</label>
                  <input
                    type="text"
                    required
                    value={profileHours}
                    onChange={(e) => setProfileHours(e.target.value)}
                    placeholder="e.g. 08:00 AM - 08:00 PM (Mon-Sat)"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:bg-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Google Location Latitude</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={profileLat}
                    onChange={(e) => setProfileLat(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:bg-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Google Location Longitude</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={profileLng}
                    onChange={(e) => setProfileLng(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:bg-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Hospital Image URL</label>
                <input
                  type="url"
                  value={profileImg}
                  onChange={(e) => setProfileImg(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:bg-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-4 text-right">
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2.5 px-6 rounded-xl transition-all shadow-md shadow-blue-500/10 cursor-pointer"
                >
                  Save Profile Modifications
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BANK DETAILS TAB */}
      {activeSubTab === "banking" && (
        <div className="bg-white border border-slate-100 rounded-3xl p-6 max-w-3xl shadow-xs">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2">Hospital Payout Bank Settings</h3>
          <p className="text-xs text-slate-400 font-medium mb-6">
            Register your institutional bank details securely. Patients' OP consultation fees will be directed directly to this account via Razorpay split payment processing.
          </p>

          <form onSubmit={handleSaveBank} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Account Holder Name</label>
                <input
                  type="text"
                  required
                  value={bankHolderName}
                  onChange={(e) => setBankHolderName(e.target.value)}
                  placeholder="e.g. City Care General Accounts"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:bg-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Bank Name</label>
                <input
                  type="text"
                  required
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="e.g. HDFC Bank"
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
                  value={bankAccountNumber}
                  onChange={(e) => setBankAccountNumber(e.target.value)}
                  placeholder="e.g. 50100234567890"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:bg-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">IFSC Code</label>
                <input
                  type="text"
                  required
                  value={bankIfscCode}
                  onChange={(e) => setBankIfscCode(e.target.value)}
                  placeholder="e.g. HDFC0000123"
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
                  value={bankBranch}
                  onChange={(e) => setBankBranch(e.target.value)}
                  placeholder="e.g. MG Road, Bangalore"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:bg-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">UPI ID (Optional)</label>
                <input
                  type="text"
                  value={bankUpiId}
                  onChange={(e) => setBankUpiId(e.target.value)}
                  placeholder="e.g. citycare@upi"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:bg-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="pt-4 text-right">
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2.5 px-6 rounded-xl transition-all shadow-md shadow-blue-500/10 cursor-pointer"
              >
                Save Bank Payout Parameters
              </button>
            </div>
          </form>
        </div>
      )}

      {/* DOCTOR ADD / EDIT MODAL */}
      {showDoctorModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-100 rounded-3xl max-w-xl w-full p-6 shadow-2xl relative animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowDoctorModal(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1 bg-slate-50 rounded-full transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-6">
              {editingDoctor ? "Edit Doctor Information" : "Register Outpatient Consulting Doctor"}
            </h3>

            <form onSubmit={handleSaveDoctor} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Doctor Full Name</label>
                  <input
                    type="text"
                    required
                    value={docName}
                    onChange={(e) => setDocName(e.target.value)}
                    placeholder="e.g. Dr. Priya Sharma"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:bg-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Specialization Area</label>
                  <select
                    value={docSpecialization}
                    onChange={(e) => setDocSpecialization(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:bg-white focus:outline-none focus:border-blue-500"
                  >
                    {specializationsList.map((spec) => (
                      <option key={spec} value={spec}>
                        {spec}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Academic Qualification</label>
                  <input
                    type="text"
                    required
                    value={docQualification}
                    onChange={(e) => setDocQualification(e.target.value)}
                    placeholder="e.g. MBBS, MD (General Medicine)"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:bg-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Professional Experience (Years)</label>
                  <input
                    type="text"
                    required
                    value={docExperience}
                    onChange={(e) => setDocExperience(e.target.value)}
                    placeholder="e.g. 12 Years"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:bg-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Consultation OPD Fee (₹)</label>
                  <input
                    type="number"
                    required
                    min="50"
                    max="5000"
                    value={docFee}
                    onChange={(e) => setDocFee(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:bg-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Maximum Daily OP Slots Limit</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="100"
                    value={docLimit}
                    onChange={(e) => setDocLimit(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:bg-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Doctor Consultation Timings</label>
                <input
                  type="text"
                  required
                  value={docTimings}
                  onChange={(e) => setDocTimings(e.target.value)}
                  placeholder="e.g. 09:00 AM - 01:00 PM"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:bg-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Profile Photo Image URL (Optional)</label>
                <input
                  type="url"
                  value={docPhoto}
                  onChange={(e) => setDocPhoto(e.target.value)}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:bg-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Consultation Days Checklist */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-2">OP Consultation Days</label>
                <div className="flex flex-wrap gap-2">
                  {daysOfWeek.map((day) => {
                    const isSelected = docDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => handleToggleDay(day)}
                        className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {day.slice(0, 3)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowDoctorModal(false)}
                  className="bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold text-xs py-2 px-4 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2 px-6 rounded-xl transition-all shadow-md shadow-blue-500/10 cursor-pointer"
                >
                  {editingDoctor ? "Save Changes" : "Register Doctor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
