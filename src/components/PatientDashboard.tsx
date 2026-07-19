import React, { useState, useEffect, useRef } from "react";
import { APIProvider, Map, AdvancedMarker, Pin } from "@vis.gl/react-google-maps";
import { Hospital, Doctor, Appointment, Review } from "../types";

const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  "";
const hasValidKey = Boolean(API_KEY) && API_KEY !== "YOUR_API_KEY" && API_KEY.trim() !== "";

import {
  MapPin,
  Search,
  Filter,
  Navigation,
  Clock,
  Star,
  Stethoscope,
  ChevronRight,
  Phone,
  Info,
  Calendar,
  AlertTriangle,
  User,
  Heart,
  Loader2,
  X,
  CreditCard,
  Building,
  Navigation2
} from "lucide-react";

interface PatientDashboardProps {
  token: string;
  showToast: (msg: string, type: "success" | "error" | "info") => void;
  onInitiatePayment: (appointment: any) => void;
}

export default function PatientDashboard({ token, showToast, onInitiatePayment }: PatientDashboardProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [selectedHosp, setSelectedHosp] = useState<Hospital | null>(null);
  const [selectedHospDetail, setSelectedHospDetail] = useState<any>(null);
  const opdRegistryRef = useRef<HTMLDivElement>(null);
  const [mapAuthError, setMapAuthError] = useState<boolean>(false);

  // GPS Coordinates State
  const [userLat, setUserLat] = useState<number>(12.9716);
  const [userLng, setUserLng] = useState<number>(12.9746);
  const [gpsLoading, setGpsLoading] = useState<boolean>(false);
  const [gpsPermission, setGpsPermission] = useState<string>("default");

  // Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [maxDistance, setMaxDistance] = useState("10"); // km
  const [minRating, setMinRating] = useState("0");
  const [openNow, setOpenNow] = useState(false);
  const [availableToday, setAvailableToday] = useState(false);

  // Booking Modal States
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingDoctor, setBookingDoctor] = useState<Doctor | null>(null);

  // Booking Form Fields
  const [patientName, setPatientName] = useState("");
  const [patientAge, setPatientAge] = useState("");
  const [patientGender, setPatientGender] = useState("Male");
  const [patientMobile, setPatientMobile] = useState("");
  const [appointmentDate, setAppointmentDate] = useState("");
  const [appointmentTime, setAppointmentTime] = useState("10:00 AM");

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

  useEffect(() => {
    requestGPSLocation();

    // Catch Google Maps invalid key or unauthorized key failure
    if (typeof window !== "undefined") {
      (window as any).gm_authFailure = () => {
        console.warn("Google Maps API Authentication Failed. Setting fallback.");
        setMapAuthError(true);
      };
    }

    return () => {
      if (typeof window !== "undefined") {
        delete (window as any).gm_authFailure;
      }
    };
  }, []);

  useEffect(() => {
    fetchHospitals();
  }, [searchQuery, specialization, maxDistance, minRating, openNow, availableToday, userLat, userLng]);

  const requestGPSLocation = () => {
    setGpsLoading(true);
    if (!navigator.geolocation) {
      showToast("Geolocation is not supported by your browser", "info");
      setGpsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLat(pos.coords.latitude);
        setUserLng(pos.coords.longitude);
        setGpsPermission("granted");
        setGpsLoading(false);
        showToast("GPS coordinates synchronized successfully", "success");
      },
      (err) => {
        console.warn("GPS Access declined, using Central Bangalore coordinates (MG Road).");
        setGpsPermission("denied");
        setGpsLoading(false);
        // Default to seeded coordinates around center
        setUserLat(12.9716);
        setUserLng(77.5946);
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  };

  const fetchHospitals = async () => {
    try {
      const url = new URL("/api/hospitals", window.location.origin);
      url.searchParams.append("userLat", String(userLat));
      url.searchParams.append("userLng", String(userLng));
      if (searchQuery) url.searchParams.append("search", searchQuery);
      if (specialization) url.searchParams.append("specialization", specialization);
      if (maxDistance) url.searchParams.append("distance", maxDistance);
      if (minRating) url.searchParams.append("rating", minRating);
      if (openNow) url.searchParams.append("openNow", "true");
      if (availableToday) url.searchParams.append("availableToday", "true");

      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        setHospitals(data);
        if (data.length > 0 && !selectedHosp) {
          setSelectedHosp(data[0]);
        }
      }
    } catch {
      showToast("Error retrieving nearby healthcare facilities", "error");
    } finally {
      setLoading(false);
    }
  };

  // Fetch doctors and reviews when selecting a hospital
  const handleSelectHospital = async (hosp: Hospital) => {
    setSelectedHosp(hosp);
    try {
      const res = await fetch(`/api/hospitals/${hosp.id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedHospDetail(data);
        // Redirect/scroll to OP booking registry on next tick
        setTimeout(() => {
          opdRegistryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
      }
    } catch {
      showToast("Failed to fetch hospital details", "error");
    }
  };

  // Initiate Booking
  const openBookingForm = (doc: Doctor) => {
    setBookingDoctor(doc);
    // Auto-fill some patient defaults
    setPatientName("");
    setPatientAge("");
    setPatientMobile("");
    // Set default tomorrow date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setAppointmentDate(tomorrow.toISOString().split("T")[0]);
    setShowBookingModal(true);
  };

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHosp || !bookingDoctor) return;

    const payload = {
      patientName,
      patientAge: Number(patientAge),
      patientGender,
      patientMobile,
      hospitalId: selectedHosp.id,
      doctorId: bookingDoctor.id,
      appointmentDate,
      appointmentTime
    };

    try {
      const res = await fetch("/api/patients/appointments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        showToast("Booking Summary prepared. Redirecting to Payment Gateway...", "info");
        setShowBookingModal(false);
        // Pass to raw split payment handler
        onInitiatePayment(data.appointment);
      } else {
        showToast(data.error || "Slots are fully booked.", "error");
      }
    } catch {
      showToast("Booking preparation failed. Check connection.", "error");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 min-h-[50vh]">
        <Loader2 className="h-10 w-10 text-blue-600 animate-spin mb-4" />
        <p className="text-sm text-slate-500 font-medium">Calculating spatial distances & nearby hospitals...</p>
      </div>
    );
  }

  // Google directions URL helper
  const getDirectionsUrl = (h: Hospital) => {
    return `https://www.google.com/maps/dir/?api=1&origin=${userLat},${userLng}&destination=${h.lat},${h.lng}&travelmode=driving`;
  };

  // GPS Map relative coordinates rendering calculations
  // Find extrema boundaries to represent onto the 100% SVG box
  const coordinatesList = hospitals.map((h) => ({ lat: h.lat, lng: h.lng }));
  coordinatesList.push({ lat: userLat, lng: userLng });

  const lats = coordinatesList.map((c) => c.lat);
  const lngs = coordinatesList.map((c) => c.lng);

  const minLat = Math.min(...lats) - 0.01;
  const maxLat = Math.max(...lats) + 0.01;
  const minLng = Math.min(...lngs) - 0.01;
  const maxLng = Math.max(...lngs) + 0.01;

  const getRelativeXY = (lat: number, lng: number) => {
    const scaleX = maxLng - minLng !== 0 ? 100 / (maxLng - minLng) : 50;
    const scaleY = maxLat - minLat !== 0 ? 100 / (maxLat - minLat) : 50;
    const x = (lng - minLng) * scaleX;
    const y = 100 - (lat - minLat) * scaleY; // flip Y for SVG coordinates
    return { x: Math.max(5, Math.min(95, x)), y: Math.max(5, Math.min(95, y)) };
  };

  const userXY = getRelativeXY(userLat, userLng);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 md:py-8 select-none animate-in fade-in duration-300">
      {/* Geolocation Status Sync Board */}
      <div className="bg-blue-50 border border-blue-100 rounded-3xl p-4 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 text-white p-2.5 rounded-2xl">
            <MapPin className="h-5 w-5 animate-bounce" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800">HTML5 Satellite Geolocation Synchronization</h4>
            <p className="text-xs text-slate-500 mt-1">
              Currently centered: Lat <span className="font-mono font-bold text-blue-600">{userLat.toFixed(4)}</span>, Lng{" "}
              <span className="font-mono font-bold text-blue-600">{userLng.toFixed(4)}</span>
            </p>
          </div>
        </div>
        <button
          onClick={requestGPSLocation}
          disabled={gpsLoading}
          className="bg-white hover:bg-blue-50 text-blue-600 border border-blue-200 font-bold text-xs py-2 px-4 rounded-xl flex items-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50"
        >
          {gpsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation2 className="h-4 w-4" />}
          <span>Re-sync Satellite GPS</span>
        </button>
      </div>

      {/* FILTER PANEL */}
      <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xs mb-8">
        <div className="flex items-center gap-2 mb-4 border-b border-slate-50 pb-3">
          <Filter className="h-4 w-4 text-blue-600" />
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Search & Filters Nearby</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Query search */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase">Facility Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Hospital Name or Address..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs focus:bg-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Specialization */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase">Specialization area</label>
            <select
              value={specialization}
              onChange={(e) => setSpecialization(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:bg-white focus:outline-none focus:border-blue-500"
            >
              <option value="">Any Specialization</option>
              {specializationsList.map((spec) => (
                <option key={spec} value={spec}>
                  {spec}
                </option>
              ))}
            </select>
          </div>

          {/* Distance */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase">Max Distance (Radius)</label>
            <select
              value={maxDistance}
              onChange={(e) => setMaxDistance(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:bg-white focus:outline-none focus:border-blue-500"
            >
              <option value="5">Within 5 km</option>
              <option value="10">Within 10 km</option>
              <option value="25">Within 25 km</option>
              <option value="100">Show all Bangalore</option>
            </select>
          </div>

          {/* Open options / available slots checks */}
          <div className="flex flex-row gap-4 items-center justify-start h-full pt-4">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={openNow}
                onChange={(e) => setOpenNow(e.target.checked)}
                className="h-4 w-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
              />
              <span>Open Now</span>
            </label>

            <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={availableToday}
                onChange={(e) => setAvailableToday(e.target.checked)}
                className="h-4 w-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
              />
              <span>Available Today</span>
            </label>
          </div>
        </div>

        {/* Action Row */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[11px] text-slate-400 font-medium">
            * Geolocation is active. Results are dynamically sorted by driving distance.
          </p>
          <div className="flex gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSpecialization("");
                setMaxDistance("10");
                setOpenNow(false);
                setAvailableToday(false);
                showToast("Filters reset successfully", "info");
              }}
              className="flex-1 sm:flex-none bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs py-2.5 px-5 rounded-xl transition-all cursor-pointer"
            >
              Reset Filters
            </button>
            <button
              type="button"
              onClick={fetchHospitals}
              className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2.5 px-6 rounded-xl flex items-center justify-center gap-2 shadow-md shadow-blue-500/10 transition-all cursor-pointer"
            >
              <Search className="h-4 w-4" />
              <span>Search Facilities</span>
            </button>
          </div>
        </div>
      </div>

      {/* INTERACTIVE GEOLOCATION MAP & TRAY LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left pane: Hospitals card list */}
        <div className="lg:col-span-1 space-y-4 max-h-[550px] overflow-y-auto pr-2">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Healthcare Providers Nearby</h3>
          {hospitals.length === 0 ? (
            <div className="bg-white border border-slate-100 rounded-3xl p-8 text-center text-slate-400">
              No medical centers found matching your parameters within the search radius.
            </div>
          ) : (
            hospitals.map((h) => {
              const isSelected = selectedHosp?.id === h.id;
              const isFullyBooked = (h.remainingSlots ?? 0) <= 0;
              return (
                <div
                  key={h.id}
                  onClick={() => handleSelectHospital(h)}
                  className={`bg-white border rounded-3xl p-4 cursor-pointer transition-all ${
                    isSelected ? "border-blue-500 shadow-lg shadow-blue-500/5 ring-2 ring-blue-100" : "border-slate-100 hover:border-slate-200 shadow-xs"
                  }`}
                >
                  <div className="flex gap-3">
                    <img
                      src={h.images[0]}
                      alt={h.name}
                      className="h-16 w-16 rounded-2xl object-cover border border-slate-50"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-slate-800 text-sm leading-tight truncate">{h.name}</h4>
                      <p className="text-[11px] text-slate-400 mt-1 truncate">{h.address}</p>

                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded flex items-center gap-0.5 font-bold">
                          {h.rating} <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" />
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">({h.numReviews} Reviews)</span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-50 mt-3 pt-3 flex items-center justify-between">
                    <div className="text-[11px] text-slate-500 flex items-center gap-1 font-semibold">
                      <Navigation className="h-3.5 w-3.5 text-blue-500" />
                      <span>{h.distance} km away ({h.travelTime} min drive)</span>
                    </div>

                    {isFullyBooked ? (
                      <span className="text-[10px] bg-rose-50 text-rose-700 font-bold px-2 py-0.5 rounded-full uppercase">
                        Fully Booked
                      </span>
                    ) : (
                      <span className="text-[10px] bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                        {h.remainingSlots} OP Slots Available
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right pane: Interactive Google Maps locator */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            {hasValidKey && !mapAuthError ? "Interactive Google Map" : "Live Google Maps Setup"}
          </h3>
          <div className="bg-slate-900 rounded-3xl h-[450px] relative overflow-hidden border border-slate-800 shadow-2xl group">
            {!hasValidKey || mapAuthError ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-950/95 text-slate-200">
                <div className="max-w-md space-y-4 animate-in fade-in duration-300">
                  <div className={`p-3 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2 border ${mapAuthError ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-blue-500/10 text-blue-400 border-blue-500/20"}`}>
                    <MapPin className="h-6 w-6 animate-pulse" />
                  </div>
                  <h3 className="text-base font-black tracking-tight text-white">
                    {mapAuthError ? "Invalid Google Maps API Key" : "Google Maps API Key Required"}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {mapAuthError 
                      ? "The loaded Google Maps Platform API key is invalid or unauthorized. Please verify that the key is typed correctly and has active Map capabilities and billing set up."
                      : "Real Google Maps integration requires a Google Maps Platform API key."}
                  </p>
                  
                  <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 text-left text-xs space-y-2.5">
                    <p className="font-semibold text-blue-400">Follow these steps to configure:</p>
                    <ol className="list-decimal list-inside space-y-1.5 text-slate-300">
                      <li>
                        <a 
                          href="https://console.cloud.google.com/google/maps-apis/start?utm_campaign=gmp-code-assist-ais" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-400 underline hover:text-blue-300 font-medium"
                        >
                          Get an API Key
                        </a> from Google Cloud.
                      </li>
                      <li>
                        Open <strong>Settings</strong> (⚙️ gear icon, top-right corner) → <strong>Secrets</strong>.
                      </li>
                      <li>
                        Add/Update a secret named <code className="bg-slate-800 px-1.5 py-0.5 rounded text-white font-mono">GOOGLE_MAPS_PLATFORM_KEY</code> and paste your API key as the value.
                      </li>
                    </ol>
                  </div>
                  
                  <p className="text-[10px] text-slate-500">
                    The application will rebuild and load the live Google Map automatically.
                  </p>
                </div>
              </div>
            ) : (
              <APIProvider apiKey={API_KEY} version="weekly">
                <Map
                  defaultCenter={{ lat: userLat, lng: userLng }}
                  center={selectedHosp ? { lat: selectedHosp.lat, lng: selectedHosp.lng } : { lat: userLat, lng: userLng }}
                  zoom={selectedHosp ? 14 : 12}
                  mapId="DEMO_MAP_ID"
                  internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                  style={{ width: '100%', height: '100%' }}
                >
                  {/* User Position pin */}
                  <AdvancedMarker position={{ lat: userLat, lng: userLng }}>
                    <div className="relative flex items-center justify-center">
                      <span className="absolute inline-flex h-8 w-8 rounded-full bg-blue-500 opacity-40 animate-ping" />
                      <div className="bg-blue-600 border-2 border-white text-white p-2 rounded-full shadow-lg">
                        <Navigation className="h-4 w-4" />
                      </div>
                    </div>
                  </AdvancedMarker>

                  {/* Hospital pins */}
                  {hospitals.map((h) => {
                    const isSelected = selectedHosp?.id === h.id;
                    return (
                      <AdvancedMarker
                        key={h.id}
                        position={{ lat: h.lat, lng: h.lng }}
                        onClick={() => handleSelectHospital(h)}
                      >
                        <Pin
                          background={isSelected ? "#10b981" : "#3b82f6"}
                          borderColor="#ffffff"
                          glyphColor="#ffffff"
                        />
                      </AdvancedMarker>
                    );
                  })}
                </Map>
              </APIProvider>
            )}

            {/* Selected Hospital Overlay Card Map Popup */}
            {selectedHosp && (
              <div className="absolute bottom-5 left-5 right-5 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 z-30 animate-in slide-in-from-bottom duration-300">
                <div className="flex gap-3">
                  <img
                    src={selectedHosp.images[0]}
                    alt={selectedHosp.name}
                    className="h-14 w-14 rounded-xl object-cover border border-slate-800"
                  />
                  <div>
                    <h4 className="font-extrabold text-white text-sm tracking-tight">{selectedHosp.name}</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">{selectedHosp.address}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[10px] bg-amber-500/20 text-amber-400 font-bold px-1.5 rounded flex items-center gap-0.5">
                        {selectedHosp.rating} <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                      </span>
                      <span className="text-[10px] text-slate-400">{selectedHosp.distance} km away | {selectedHosp.workingHours}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-row sm:flex-col gap-2 w-full sm:w-auto">
                  <a
                    href={getDirectionsUrl(selectedHosp)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 sm:flex-none bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs py-2 px-4 rounded-xl flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Navigation className="h-4 w-4 text-blue-400" />
                    <span>Get Directions</span>
                  </a>
                  <button
                    onClick={() => {
                      opdRegistryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                    className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-blue-500/10"
                  >
                    <Clock className="h-4 w-4" />
                    <span>Book OP Slots</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* DETAILED SELECTED HOSPITAL VIEW (DOCTORS LIST) */}
      {selectedHosp && selectedHospDetail && (
        <div ref={opdRegistryRef} className="bg-white border border-slate-100 rounded-3xl p-6 mt-10 shadow-xs animate-in fade-in duration-300">
          <div className="border-b border-slate-50 pb-5 mb-6">
            <h3 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
              <Building className="h-5.5 w-5.5 text-blue-600" />
              <span>OPD Doctors Registry at {selectedHosp.name}</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">Select an active consulting doctor below to book your outpatient session.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {selectedHospDetail.doctors.length === 0 ? (
              <div className="col-span-full text-center py-8 text-slate-400 text-xs">
                No doctors registered under this medical center at this moment.
              </div>
            ) : (
              selectedHospDetail.doctors.map((doc: Doctor) => {
                const isFullyBooked = doc.bookedCount >= doc.dailyOpLimit;
                return (
                  <div key={doc.id} className="bg-slate-50 border border-slate-100 rounded-3xl p-5 hover:shadow-md transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full">
                          {doc.specialization}
                        </span>
                        {isFullyBooked ? (
                          <span className="text-[10px] bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded-full animate-pulse uppercase">
                            Fully Booked
                          </span>
                        ) : (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full">
                            {doc.dailyOpLimit - doc.bookedCount} OP Slots remaining
                          </span>
                        )}
                      </div>

                      <div className="flex gap-3 pb-4 border-b border-slate-200/50">
                        <img
                          src={doc.photo}
                          alt={doc.name}
                          className="h-14 w-14 rounded-xl object-cover border border-slate-100 flex-shrink-0"
                        />
                        <div>
                          <h4 className="font-extrabold text-slate-800 text-sm">{doc.name}</h4>
                          <p className="text-xs text-blue-600 font-bold mt-0.5">{doc.qualification}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">Experience: {doc.experience}</p>
                        </div>
                      </div>

                      <div className="py-4 space-y-2 text-xs text-slate-500">
                        <div className="flex justify-between">
                          <span>Consultation OPD pricing:</span>
                          <span className="font-bold text-slate-800">₹{doc.consultationFee}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Consultation Timings:</span>
                          <span className="font-bold text-slate-800">{doc.availableTimings}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Days Scheduled:</span>
                          <span className="font-bold text-slate-800 text-right max-w-[150px] truncate">{doc.availableDays.join(", ")}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => openBookingForm(doc)}
                      disabled={isFullyBooked}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                    >
                      <Calendar className="h-4 w-4" />
                      <span>{isFullyBooked ? "Fully Booked" : "Book OP Consultation"}</span>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* BOOKING MODAL */}
      {showBookingModal && bookingDoctor && selectedHosp && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-100 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowBookingModal(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1 bg-slate-50 rounded-full transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-6 border-b border-slate-50 pb-3">
              Consultation Booking Summary
            </h3>

            {/* Summary card */}
            <div className="bg-slate-50 p-4 rounded-2xl mb-6 flex flex-col gap-2">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-slate-400">Medical Center:</span>
                <span className="font-bold text-slate-800">{selectedHosp.name}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="font-medium text-slate-400">Consulting Doctor:</span>
                <span className="font-bold text-slate-800">{bookingDoctor.name}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="font-medium text-slate-400">Specialization:</span>
                <span className="font-bold text-slate-800">{bookingDoctor.specialization}</span>
              </div>
              <div className="flex justify-between text-xs pt-2 border-t border-slate-200/50">
                <span className="font-medium text-slate-400">Consultation OPD Fee:</span>
                <span className="font-bold text-blue-600">₹{bookingDoctor.consultationFee}</span>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateAppointment} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase">Patient Name</label>
                <input
                  type="text"
                  required
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="Patient name"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase">Age</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="110"
                    value={patientAge}
                    onChange={(e) => setPatientAge(e.target.value)}
                    placeholder="e.g. 32"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase">Gender</label>
                  <select
                    value={patientGender}
                    onChange={(e) => setPatientGender(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:bg-white"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase">Mobile Number</label>
                  <input
                    type="tel"
                    required
                    value={patientMobile}
                    onChange={(e) => setPatientMobile(e.target.value)}
                    placeholder="+91 99000 12345"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase">OP Appointment Date</label>
                  <input
                    type="date"
                    required
                    value={appointmentDate}
                    onChange={(e) => setAppointmentDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:bg-white"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowBookingModal(false)}
                  className="bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold text-xs py-2 px-4 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 px-6 rounded-xl transition-all shadow-md cursor-pointer"
                >
                  Proceed to Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
