export interface BankDetails {
  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  branch: string;
  upiId?: string;
}

export interface Hospital {
  id: string;
  name: string;
  email: string;
  address: string;
  contact: string;
  description: string;
  images: string[];
  workingHours: string;
  lat: number;
  lng: number;
  approved: boolean;
  blocked: boolean;
  rating: number;
  numReviews: number;
  bankDetails?: BankDetails;
  // Dynamic fields computed by API
  distance?: number;
  travelTime?: number;
  doctorsCount?: number;
  remainingSlots?: number;
  specializations?: string[];
}

export interface Patient {
  id: string;
  name: string;
  email: string;
  contact: string;
  address: string;
  age: number;
  gender: string;
  createdAt: string;
}

export interface Doctor {
  id: string;
  hospitalId: string;
  name: string;
  photo: string;
  qualification: string;
  experience: string;
  specialization: string;
  consultationFee: number;
  availableDays: string[];
  availableTimings: string;
  dailyOpLimit: number;
  bookedCount: number;
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  patientAge: number;
  patientGender: string;
  patientMobile: string;
  hospitalId: string;
  hospitalName: string;
  doctorId: string;
  doctorName: string;
  appointmentDate: string;
  appointmentTime: string;
  opId: string;
  paymentId: string;
  paymentStatus: "Pending" | "Completed" | "Failed" | "Cancelled";
  paymentAmount: number;
  adminShare: number;
  hospitalShare: number;
  qrCodeUrl: string;
  createdAt: string;
  rating?: number;
  feedbackComment?: string;
  reminderEnabled?: boolean;
  reminderType?: "push" | "email" | "both";
  reminderMinutesBefore?: number;
}

export interface Review {
  id: string;
  hospitalId: string;
  patientName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  userRole: "admin" | "hospital" | "patient";
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface PlatformSettings {
  id: string;
  platformFee: number;
  adminBankDetails?: BankDetails;
}

export type UserRole = "admin" | "hospital" | "patient";

export interface LoggedInUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  approved?: boolean;
}
