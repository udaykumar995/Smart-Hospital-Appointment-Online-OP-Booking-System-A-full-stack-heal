import React, { useState, useEffect } from "react";
import { Appointment } from "../types";
import {
  CreditCard,
  CheckCircle,
  XCircle,
  Loader2,
  Download,
  QrCode,
  Calendar,
  Clock,
  Building,
  User,
  ShieldCheck,
  Printer,
  ChevronRight
} from "lucide-react";

interface PaymentModalProps {
  token: string;
  appointment: Appointment | null;
  onPaymentComplete: (success: boolean, appointment: Appointment | null) => void;
  onClose: () => void;
  showToast: (msg: string, type: "success" | "error" | "info") => void;
}

export default function PaymentModal({ token, appointment, onPaymentComplete, onClose, showToast }: PaymentModalProps) {
  const [step, setStep] = useState<"checkout" | "processing" | "success" | "failed">("checkout");
  const [completedApp, setCompletedApp] = useState<Appointment | null>(null);
  const [razorpayPaymentId, setRazorpayPaymentId] = useState("");

  if (!appointment) return null;

  const handleSimulatePayment = async (success: boolean) => {
    setStep("processing");

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 1800));

    const mockPayId = success ? `pay_rzp_${Date.now().toString().slice(-8)}` : `pay_failed_${Date.now()}`;
    setRazorpayPaymentId(mockPayId);

    try {
      const res = await fetch("/api/patients/payments/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          appointmentId: appointment.id,
          razorpayPaymentId: mockPayId,
          success
        })
      });

      const data = await res.json();

      if (res.ok && success) {
        setCompletedApp(data.appointment);
        setStep("success");
        showToast("Payment Successful & OPD Slot Confirmed!", "success");
      } else {
        setStep("failed");
        showToast("Razorpay Payment split transaction was declined.", "error");
      }
    } catch {
      setStep("failed");
      showToast("Payment verification timeout.", "error");
    }
  };

  const handlePrintReceipt = () => {
    // Elegant browser print trigger
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none">
      <div className="bg-white border border-slate-100 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-200">
        
        {/* Print Styles Overlay (Hidden on screen, styled purely for print layout) */}
        <div className="hidden print:block p-8 bg-white text-slate-800" id="printable-area">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-black tracking-tight text-slate-900">SMARTOP OUTPATIENT BOOKING RECEIPT</h1>
            <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-mono">Verified Digital Token Receipt</p>
          </div>
          <div className="border-t-2 border-dashed border-slate-300 py-4 my-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="font-semibold text-slate-500">Outpatient (OP) ID:</span>
              <span className="font-bold text-slate-900">{completedApp?.opId || appointment.opId}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-slate-500">Razorpay Payment ID:</span>
              <span className="font-mono text-xs text-slate-900">{razorpayPaymentId}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-slate-500">Hospital Facility:</span>
              <span className="font-bold text-slate-900">{appointment.hospitalName}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-slate-500">Consulting Doctor:</span>
              <span className="font-bold text-slate-900">{appointment.doctorName}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-slate-500">Patient Name:</span>
              <span className="font-bold text-slate-900">{appointment.patientName}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-slate-500">Patient Details:</span>
              <span className="font-bold text-slate-900">Age: {appointment.patientAge} | {appointment.patientGender}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-slate-500">Schedule Date:</span>
              <span className="font-bold text-slate-900">{appointment.appointmentDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-slate-500">Time Slot:</span>
              <span className="font-bold text-slate-900">{appointment.appointmentTime}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-slate-500">Consultation Paid:</span>
              <span className="font-bold text-slate-900">₹{appointment.paymentAmount}</span>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center mt-8">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${completedApp?.opId || appointment.opId}`}
              alt="Receipt QR"
              className="h-32 w-32 object-contain"
            />
            <p className="text-[10px] text-slate-400 mt-3 uppercase tracking-wider font-mono">Present QR Code at hospital reception</p>
          </div>
        </div>

        {/* Screen View */}
        <div className="print:hidden">
          {/* RAZORPAY CHECKOUT OVERLAY */}
          {step === "checkout" && (
            <div className="animate-in fade-in duration-200">
              <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-600 p-2 rounded-xl">
                    <CreditCard className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm tracking-tight">Razorpay Secure Checkout</h3>
                    <p className="text-[10px] text-slate-400">Merchant Split settlements enabled</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="text-slate-400 hover:text-white transition-colors text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Bill Breakdown */}
                <div className="space-y-3.5 border-b border-slate-100 pb-4">
                  <div className="flex justify-between text-xs font-medium text-slate-400">
                    <span>OPD Consultation fee:</span>
                    <span className="font-bold text-slate-700">₹{appointment.paymentAmount - appointment.adminShare}</span>
                  </div>
                  <div className="flex justify-between text-xs font-medium text-slate-400">
                    <span>System Platform flat commission:</span>
                    <span className="font-bold text-slate-700">₹{appointment.adminShare}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-slate-800 pt-3 border-t border-slate-50">
                    <span>Total Amount Payable (INR):</span>
                    <span className="text-blue-600">₹{appointment.paymentAmount}</span>
                  </div>
                </div>

                {/* Secure settlement alert */}
                <div className="bg-emerald-50 border border-emerald-100 p-3.5 rounded-2xl flex items-start gap-2.5">
                  <ShieldCheck className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-emerald-800">Split-Route Settled</h4>
                    <p className="text-[10px] text-emerald-700 mt-0.5 leading-relaxed">
                      ₹{appointment.adminShare} is split to Admin, and the rest ₹{appointment.paymentAmount - appointment.adminShare} is split to the Hospital's payout bank account.
                    </p>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    onClick={() => handleSimulatePayment(true)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-3 rounded-xl shadow-lg shadow-blue-500/10 cursor-pointer transition-all"
                  >
                    Simulate Payment Success (Split Settlement)
                  </button>
                  <button
                    onClick={() => handleSimulatePayment(false)}
                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs py-3 rounded-xl cursor-pointer transition-all"
                  >
                    Simulate Payment Failure / Decline
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* PAYMENT PROCESSING LOADER */}
          {step === "processing" && (
            <div className="p-8 text-center flex flex-col items-center justify-center min-h-[300px] animate-in fade-in duration-200">
              <Loader2 className="h-12 w-12 text-blue-600 animate-spin mb-4" />
              <h3 className="font-extrabold text-slate-800 text-base">Processing Razorpay Split Settlement...</h3>
              <p className="text-xs text-slate-400 mt-1.5 max-w-[280px]">
                Validating card parameters and verifying routing split hashes securely.
              </p>
            </div>
          )}

          {/* SUCCESS APPOINTMENT CARD WITH QR CODE */}
          {step === "success" && (
            <div className="animate-in zoom-in-95 duration-300">
              <div className="bg-emerald-600 text-white p-6 text-center">
                <CheckCircle className="h-12 w-12 text-white mx-auto mb-3" />
                <h3 className="text-lg font-black tracking-tight">OP Slot Confirmed Successfully</h3>
                <p className="text-xs text-emerald-100 mt-1">Unique OP ticket and payment token generated below</p>
              </div>

              <div className="p-6 space-y-5">
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-slate-400">Unique OP Token ID:</span>
                    <span className="font-black text-blue-600 text-sm font-mono uppercase tracking-wider">
                      {completedApp?.opId || appointment.opId}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-slate-400">Razorpay Payment ID:</span>
                    <span className="font-semibold text-slate-700 font-mono text-[10px] truncate max-w-[150px]">
                      {razorpayPaymentId}
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-t border-slate-200/50 pt-2">
                    <span className="font-semibold text-slate-400">Scheduled Doctor:</span>
                    <span className="font-bold text-slate-800">{appointment.doctorName}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-slate-400">Outpatient Center:</span>
                    <span className="font-bold text-slate-800">{appointment.hospitalName}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-slate-400">Date & Time Slot:</span>
                    <span className="font-bold text-slate-800">
                      {appointment.appointmentDate} at {appointment.appointmentTime}
                    </span>
                  </div>
                </div>

                {/* QR Code and Print Button */}
                <div className="flex flex-col items-center justify-center p-3 border border-slate-100 rounded-3xl bg-slate-50/50">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${completedApp?.opId || appointment.opId}`}
                    alt="OP Code QR"
                    className="h-32 w-32 object-contain"
                  />
                  <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase tracking-wider">Present QR Code at Reception</p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    onClick={handlePrintReceipt}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Printer className="h-4 w-4" />
                    <span>Print Receipt</span>
                  </button>
                  <button
                    onClick={() => onPaymentComplete(true, completedApp)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>Done</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* FAILED TRANSCTION STATE */}
          {step === "failed" && (
            <div className="p-8 text-center animate-in zoom-in-95 duration-200">
              <XCircle className="h-12 w-12 text-rose-500 mx-auto mb-3" />
              <h3 className="font-extrabold text-slate-800 text-base">Payment Settlement Declined</h3>
              <p className="text-xs text-slate-400 mt-1.5 max-w-[280px] mx-auto">
                The bank authentication failed. Outpatient slots have not been registered.
              </p>

              <div className="mt-8 space-y-2">
                <button
                  onClick={() => setStep("checkout")}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2.5 rounded-xl cursor-pointer"
                >
                  Retry Payment Split
                </button>
                <button
                  onClick={() => onPaymentComplete(false, null)}
                  className="w-full bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold text-xs py-2.5 rounded-xl cursor-pointer"
                >
                  Return to Dashboard
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
