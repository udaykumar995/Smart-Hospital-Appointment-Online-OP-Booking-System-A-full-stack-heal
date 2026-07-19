import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";

const DATA_DIR = path.join(process.cwd(), "data");

// Helper to ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

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
  passwordHash: string;
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
}

export interface Patient {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
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
  availableDays: string[]; // e.g., ["Monday", "Tuesday", "Wednesday"]
  availableTimings: string; // e.g., "09:00 AM - 01:00 PM"
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
  opId: string; // Unique OP ID
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
  userId: string; // ID of admin, hospital, or patient
  userRole: "admin" | "hospital" | "patient";
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface PlatformSettings {
  id: string;
  platformFee: number; // e.g. 3
  adminBankDetails?: BankDetails;
}

class JSONDatabase {
  private getFilePath(collection: string): string {
    return path.join(DATA_DIR, `${collection}.json`);
  }

  private readCollection<T>(collection: string): T[] {
    const file = this.getFilePath(collection);
    if (!fs.existsSync(file)) {
      return [];
    }
    try {
      return JSON.parse(fs.readFileSync(file, "utf8")) as T[];
    } catch {
      return [];
    }
  }

  private writeCollection<T>(collection: string, data: T[]): void {
    const file = this.getFilePath(collection);
    fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
  }

  // Collection Methods
  getCollection<T>(collection: string): T[] {
    return this.readCollection<T>(collection);
  }

  saveCollection<T>(collection: string, data: T[]): void {
    this.writeCollection<T>(collection, data);
  }

  insert<T extends { id: string }>(collection: string, item: T): T {
    const items = this.readCollection<T>(collection);
    items.push(item);
    this.writeCollection(collection, items);
    return item;
  }

  update<T extends { id: string }>(collection: string, id: string, updates: Partial<T>): T | null {
    const items = this.readCollection<T>(collection);
    const idx = items.findIndex((item) => item.id === id);
    if (idx === -1) return null;
    items[idx] = { ...items[idx], ...updates };
    this.writeCollection(collection, items);
    return items[idx];
  }

  delete<T extends { id: string }>(collection: string, id: string): boolean {
    const items = this.readCollection<T>(collection);
    const lengthBefore = items.length;
    const filtered = items.filter((item) => item.id !== id);
    if (filtered.length === lengthBefore) return false;
    this.writeCollection(collection, filtered);
    return true;
  }

  // Database Seeding
  async seed(): Promise<void> {
    const settingsFile = this.getFilePath("settings");
    if (!fs.existsSync(settingsFile)) {
      const defaultSettings: PlatformSettings = {
        id: "platform-settings",
        platformFee: 3,
        adminBankDetails: {
          accountHolderName: "Smart Care Platform Admin",
          bankName: "State Bank of India",
          accountNumber: "1002003004005",
          ifscCode: "SBIN0001234",
          branch: "MG Road, Bangalore",
          upiId: "smartcare@upi"
        }
      };
      fs.writeFileSync(settingsFile, JSON.stringify(defaultSettings, null, 2), "utf8");
    }

    // Hash a common test password: 'password123'
    const salt = await bcrypt.genSalt(10);
    const testHash = await bcrypt.hash("password123", salt);

    // Seed Admin
    const adminsFile = this.getFilePath("admins");
    if (!fs.existsSync(adminsFile)) {
      fs.writeFileSync(
        adminsFile,
        JSON.stringify([
          {
            id: "admin-1",
            email: "admin@hospital.com",
            passwordHash: testHash
          }
        ], null, 2),
        "utf8"
      );
    }

    // Seed Hospitals
    const hospitalsFile = this.getFilePath("hospitals");
    if (!fs.existsSync(hospitalsFile)) {
      const seedHospitals: Hospital[] = [
        {
          id: "hosp-1",
          name: "City Care General Hospital",
          email: "citycare@hospital.com",
          passwordHash: testHash,
          address: "123 Healthcare Blvd, Near MG Road, Bangalore",
          contact: "+91 98765 43210",
          description: "A leading multispecialty healthcare institution dedicated to providing accessible, high-quality outpatient services and specialized cardiac care.",
          images: [
            "https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?w=600&auto=format&fit=crop&q=60",
            "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=600&auto=format&fit=crop&q=60"
          ],
          workingHours: "08:00 AM - 08:00 PM (Mon-Sat)",
          lat: 12.9716,
          lng: 77.5946,
          approved: true,
          blocked: false,
          rating: 4.8,
          numReviews: 24,
          bankDetails: {
            accountHolderName: "City Care Trust Accounts",
            bankName: "HDFC Bank",
            accountNumber: "99887766554433",
            ifscCode: "HDFC0000123",
            branch: "MG Road, Bangalore",
            upiId: "citycare@hdfc"
          }
        },
        {
          id: "hosp-2",
          name: "Metro Multispecialty Hospital",
          email: "metro@hospital.com",
          passwordHash: testHash,
          address: "456 Wellness Way, Malleshwaram, Bangalore",
          contact: "+91 80234 56789",
          description: "Metro Multispecialty offers world-class diagnostic, orthopedic, and pediatric care with modern outpatient consulting rooms.",
          images: [
            "https://images.unsplash.com/photo-1586773860418-d3b3da9601ee?w=600&auto=format&fit=crop&q=60"
          ],
          workingHours: "24 Hours (7 Days)",
          lat: 12.9825,
          lng: 77.5812,
          approved: true,
          blocked: false,
          rating: 4.5,
          numReviews: 18,
          bankDetails: {
            accountHolderName: "Metro Hospital Limited",
            bankName: "ICICI Bank",
            accountNumber: "11223344556677",
            ifscCode: "ICIC0005555",
            branch: "Malleshwaram, Bangalore",
            upiId: "metrohosp@icici"
          }
        },
        {
          id: "hosp-3",
          name: "St. Jude Children & Family Clinic",
          email: "stjude@hospital.com",
          passwordHash: testHash,
          address: "789 Hope St, Indiranagar, Bangalore",
          contact: "+91 91234 56780",
          description: "Providing friendly and personal healthcare services for kids and parents. Specialized pediatricians, immunizations, and general health checkups.",
          images: [
            "https://images.unsplash.com/photo-1538108176447-280586497d96?w=600&auto=format&fit=crop&q=60"
          ],
          workingHours: "09:00 AM - 06:00 PM (Mon-Fri)",
          lat: 12.9592,
          lng: 77.6105,
          approved: false, // Pending Approval!
          blocked: false,
          rating: 4.2,
          numReviews: 7,
          bankDetails: {
            accountHolderName: "St Jude Medical Trust",
            bankName: "Axis Bank",
            accountNumber: "44556677889900",
            ifscCode: "UTIB0000789",
            branch: "Indiranagar, Bangalore",
            upiId: "stjudeclinic@axis"
          }
        }
      ];
      fs.writeFileSync(hospitalsFile, JSON.stringify(seedHospitals, null, 2), "utf8");
    }

    // Seed Doctors
    const doctorsFile = this.getFilePath("doctors");
    if (!fs.existsSync(doctorsFile)) {
      const seedDoctors: Doctor[] = [
        {
          id: "doc-1",
          hospitalId: "hosp-1",
          name: "Dr. Sarah Jenkins",
          photo: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=300&auto=format&fit=crop&q=60",
          qualification: "MD, DM (Cardiology) - Harvard Medical School",
          experience: "14 Years",
          specialization: "Cardiology",
          consultationFee: 500,
          availableDays: ["Monday", "Wednesday", "Friday"],
          availableTimings: "09:00 AM - 01:00 PM",
          dailyOpLimit: 20,
          bookedCount: 15
        },
        {
          id: "doc-2",
          hospitalId: "hosp-1",
          name: "Dr. Alan Smith",
          photo: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=300&auto=format&fit=crop&q=60",
          qualification: "MBBS, MD (General Medicine)",
          experience: "10 Years",
          specialization: "General Physician",
          consultationFee: 300,
          availableDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
          availableTimings: "02:00 PM - 06:00 PM",
          dailyOpLimit: 30,
          bookedCount: 12
        },
        {
          id: "doc-3",
          hospitalId: "hosp-2",
          name: "Dr. Robert Chen",
          photo: "https://images.unsplash.com/photo-1594824813573-246434de83fb?w=300&auto=format&fit=crop&q=60",
          qualification: "MD (Pediatrics), DCH",
          experience: "12 Years",
          specialization: "Pediatrician",
          consultationFee: 400,
          availableDays: ["Tuesday", "Thursday", "Saturday"],
          availableTimings: "10:00 AM - 02:00 PM",
          dailyOpLimit: 15,
          bookedCount: 8
        },
        {
          id: "doc-4",
          hospitalId: "hosp-2",
          name: "Dr. Priya Nair",
          photo: "https://images.unsplash.com/photo-1527613426441-4da17471b66d?w=300&auto=format&fit=crop&q=60",
          qualification: "MD (Obstetrics & Gynecology)",
          experience: "15 Years",
          specialization: "Gynecologist",
          consultationFee: 600,
          availableDays: ["Monday", "Wednesday", "Thursday"],
          availableTimings: "03:00 PM - 07:00 PM",
          dailyOpLimit: 25,
          bookedCount: 25 // Fully booked simulation!
        },
        {
          id: "doc-5",
          hospitalId: "hosp-3", // Pending hospital but has doctors
          name: "Dr. Emily Taylor",
          photo: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=300&auto=format&fit=crop&q=60",
          qualification: "MBBS, DNB (Dermatology)",
          experience: "8 Years",
          specialization: "Dermatologist",
          consultationFee: 450,
          availableDays: ["Wednesday", "Friday"],
          availableTimings: "11:00 AM - 03:00 PM",
          dailyOpLimit: 15,
          bookedCount: 2
        }
      ];
      fs.writeFileSync(doctorsFile, JSON.stringify(seedDoctors, null, 2), "utf8");
    }

    // Seed Reviews
    const reviewsFile = this.getFilePath("reviews");
    if (!fs.existsSync(reviewsFile)) {
      const seedReviews: Review[] = [
        {
          id: "rev-1",
          hospitalId: "hosp-1",
          patientName: "Sumit Kumar",
          rating: 5,
          comment: "Excellent service and doctor was highly professional. Clean and tidy outpatient department.",
          createdAt: new Date().toISOString()
        },
        {
          id: "rev-2",
          hospitalId: "hosp-1",
          patientName: "Deepa Nair",
          rating: 4,
          comment: "The consultation went well, but had to wait for about 15 minutes past our booking time. Overall good.",
          createdAt: new Date().toISOString()
        },
        {
          id: "rev-3",
          hospitalId: "hosp-2",
          patientName: "John Doe",
          rating: 5,
          comment: "Highly efficient booking and minimal waiting. Dr. Robert was friendly and diagnosis was excellent.",
          createdAt: new Date().toISOString()
        }
      ];
      fs.writeFileSync(reviewsFile, JSON.stringify(seedReviews, null, 2), "utf8");
    }

    // Seed Patient
    const patientsFile = this.getFilePath("patients");
    if (!fs.existsSync(patientsFile)) {
      fs.writeFileSync(
        patientsFile,
        JSON.stringify([
          {
            id: "pat-1",
            name: "John Patient",
            email: "patient@gmail.com",
            passwordHash: testHash,
            contact: "+91 99001 12233",
            address: "Koramangala 4th Block, Bangalore",
            age: 32,
            gender: "Male",
            createdAt: new Date().toISOString()
          }
        ], null, 2),
        "utf8"
      );
    }

    // Seed Notifications
    const notificationsFile = this.getFilePath("notifications");
    if (!fs.existsSync(notificationsFile)) {
      const seedNotifications: Notification[] = [
        {
          id: "notif-1",
          userId: "admin-1",
          userRole: "admin",
          title: "New Hospital Registered",
          message: "St. Jude Children & Family Clinic has registered and is pending approval.",
          read: false,
          createdAt: new Date().toISOString()
        },
        {
          id: "notif-2",
          userId: "hosp-1",
          userRole: "hospital",
          title: "Welcome City Care",
          message: "Welcome to Smart OP platform! Please ensure your doctor listings are updated.",
          read: false,
          createdAt: new Date().toISOString()
        }
      ];
      fs.writeFileSync(notificationsFile, JSON.stringify(seedNotifications, null, 2), "utf8");
    }

    // Seed Appointments
    const appointmentsFile = this.getFilePath("appointments");
    if (!fs.existsSync(appointmentsFile)) {
      const seedAppointments: Appointment[] = [
        {
          id: "app-1",
          patientId: "pat-1",
          patientName: "John Patient",
          patientAge: 32,
          patientGender: "Male",
          patientMobile: "+91 99001 12233",
          hospitalId: "hosp-1",
          hospitalName: "City Care General Hospital",
          doctorId: "doc-1",
          doctorName: "Dr. Sarah Jenkins",
          appointmentDate: new Date().toISOString().split("T")[0],
          appointmentTime: "10:30 AM",
          opId: "OP-CITY-CARE-1001",
          paymentId: "pay_mock_12345",
          paymentStatus: "Completed",
          paymentAmount: 500,
          adminShare: 3,
          hospitalShare: 497,
          qrCodeUrl: "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=OP-CITY-CARE-1001",
          createdAt: new Date().toISOString()
        }
      ];
      fs.writeFileSync(appointmentsFile, JSON.stringify(seedAppointments, null, 2), "utf8");
    }
  }
}

export const db = new JSONDatabase();
