import express, { Request, Response, NextFunction } from "express";
import path from "path";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { createServer as createViteServer } from "vite";
import {
  db,
  Hospital,
  Patient,
  Doctor,
  Appointment,
  Review,
  Notification,
  PlatformSettings,
  BankDetails
} from "./server/db.js";

// Initialize DB seeding
db.seed().then(() => console.log("Local database initialized and seeded."));

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || "smart-hospital-applet-secret-key-2026";

// Middlewares
app.use(express.json());

// Auth Middleware
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: "admin" | "hospital" | "patient";
  };
}

const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    res.status(401).json({ error: "Access token required" });
    return;
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      res.status(403).json({ error: "Invalid or expired token" });
      return;
    }
    req.user = decoded as AuthenticatedRequest["user"];
    next();
  });
};

// Haversine Distance Calculator
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of Earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in km
  return parseFloat(distance.toFixed(1)); // round to 1 decimal
}

// -------------------------------------------------------------
// AUTHENTICATION ENDPOINTS
// -------------------------------------------------------------

// REGISTER
app.post("/api/auth/register", async (req: Request, res: Response): Promise<void> => {
  const { name, email, password, role, contact, address, age, gender } = req.body;

  if (!email || !password || !role || !name) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  try {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    if (role === "patient") {
      const patients = db.getCollection<Patient>("patients");
      if (patients.find((p) => p.email.toLowerCase() === email.toLowerCase())) {
        res.status(400).json({ error: "Email already registered" });
        return;
      }

      const newPatient: Patient = {
        id: `pat-${Date.now()}`,
        name,
        email: email.toLowerCase(),
        passwordHash,
        contact: contact || "",
        address: address || "",
        age: Number(age) || 30,
        gender: gender || "Male",
        createdAt: new Date().toISOString()
      };

      db.insert<Patient>("patients", newPatient);

      // Create Notification
      const notif: Notification = {
        id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        userId: newPatient.id,
        userRole: "patient",
        title: "Account Created Successfully",
        message: `Welcome ${name}! Your patient portal is now active.`,
        read: false,
        createdAt: new Date().toISOString()
      };
      db.insert("notifications", notif);

      const token = jwt.sign({ id: newPatient.id, email: newPatient.email, role: "patient" }, JWT_SECRET, { expiresIn: "7d" });
      res.status(201).json({ token, user: { id: newPatient.id, name: newPatient.name, email: newPatient.email, role: "patient" } });
      return;
    } else if (role === "hospital") {
      const hospitals = db.getCollection<Hospital>("hospitals");
      if (hospitals.find((h) => h.email.toLowerCase() === email.toLowerCase())) {
        res.status(400).json({ error: "Email already registered" });
        return;
      }

      const newHospital: Hospital = {
        id: `hosp-${Date.now()}`,
        name,
        email: email.toLowerCase(),
        passwordHash,
        address: address || "",
        contact: contact || "",
        description: "",
        images: ["https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?w=600&auto=format&fit=crop&q=60"],
        workingHours: "09:00 AM - 05:00 PM",
        lat: 12.9716 + (Math.random() - 0.5) * 0.05, // Randomly offset around city center
        lng: 77.5946 + (Math.random() - 0.5) * 0.05,
        approved: false, // Must be approved by Admin
        blocked: false,
        rating: 4.0,
        numReviews: 0,
        bankDetails: {
          accountHolderName: "",
          bankName: "",
          accountNumber: "",
          ifscCode: "",
          branch: ""
        }
      };

      db.insert<Hospital>("hospitals", newHospital);

      // Notify Admin
      const adminNotif: Notification = {
        id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        userId: "admin-1",
        userRole: "admin",
        title: "New Hospital Registered",
        message: `${name} has registered and requires approval.`,
        read: false,
        createdAt: new Date().toISOString()
      };
      db.insert("notifications", adminNotif);

      res.status(201).json({ message: "Registration successful. Pending approval from administrator." });
      return;
    }

    res.status(400).json({ error: "Invalid role specified" });
  } catch (error) {
    res.status(500).json({ error: "Server error during registration" });
  }
});

// LOGIN
app.post("/api/auth/login", async (req: Request, res: Response): Promise<void> => {
  const { email, password, role } = req.body;

  if (!email || !password || !role) {
    res.status(400).json({ error: "Missing login details" });
    return;
  }

  try {
    let user: any = null;
    let isMatch = false;

    if (role === "admin") {
      const admins = db.getCollection<any>("admins");
      user = admins.find((a) => a.email.toLowerCase() === email.toLowerCase());
      if (user) {
        isMatch = await bcrypt.compare(password, user.passwordHash);
      }
    } else if (role === "hospital") {
      const hospitals = db.getCollection<Hospital>("hospitals");
      user = hospitals.find((h) => h.email.toLowerCase() === email.toLowerCase());
      if (user) {
        if (user.blocked) {
          res.status(403).json({ error: "Your account is blocked by the administrator" });
          return;
        }
        isMatch = await bcrypt.compare(password, user.passwordHash);
      }
    } else if (role === "patient") {
      const patients = db.getCollection<Patient>("patients");
      user = patients.find((p) => p.email.toLowerCase() === email.toLowerCase());
      if (user) {
        isMatch = await bcrypt.compare(password, user.passwordHash);
      }
    }

    if (!user || !isMatch) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const token = jwt.sign({ id: user.id, email: user.email, role }, JWT_SECRET, { expiresIn: "7d" });

    res.json({
      token,
      user: {
        id: user.id,
        name: role === "admin" ? "Platform Admin" : user.name,
        email: user.email,
        role,
        approved: role === "hospital" ? user.approved : undefined
      }
    });
  } catch (error) {
    res.status(500).json({ error: "Server error during login" });
  }
});

// FORGOT PASSWORD
app.post("/api/auth/forgot-password", async (req: Request, res: Response): Promise<void> => {
  const { email, role } = req.body;
  if (!email || !role) {
    res.status(400).json({ error: "Email and role are required" });
    return;
  }

  // Simulate sending email and reset password automatically to 'password123' for demonstration convenience
  try {
    let userFound = false;
    const salt = await bcrypt.genSalt(10);
    const defaultHash = await bcrypt.hash("password123", salt);

    if (role === "patient") {
      const patients = db.getCollection<Patient>("patients");
      const idx = patients.findIndex((p) => p.email.toLowerCase() === email.toLowerCase());
      if (idx !== -1) {
        patients[idx].passwordHash = defaultHash;
        db.saveCollection("patients", patients);
        userFound = true;
      }
    } else if (role === "hospital") {
      const hospitals = db.getCollection<Hospital>("hospitals");
      const idx = hospitals.findIndex((h) => h.email.toLowerCase() === email.toLowerCase());
      if (idx !== -1) {
        hospitals[idx].passwordHash = defaultHash;
        db.saveCollection("hospitals", hospitals);
        userFound = true;
      }
    }

    if (!userFound) {
      res.status(404).json({ error: "No user found with this email" });
      return;
    }

    res.json({
      message: "Reset link sent successfully. For demonstration, your password has been reset to 'password123'."
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// CURRENT USER PROFILE
app.get("/api/auth/me", authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const userPayload = req.user;
  if (!userPayload) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  if (userPayload.role === "admin") {
    res.json({ id: "admin-1", name: "Platform Admin", email: userPayload.email, role: "admin" });
  } else if (userPayload.role === "hospital") {
    const hospitals = db.getCollection<Hospital>("hospitals");
    const h = hospitals.find((item) => item.id === userPayload.id);
    if (!h) {
      res.status(404).json({ error: "Hospital not found" });
      return;
    }
    res.json({
      id: h.id,
      name: h.name,
      email: h.email,
      role: "hospital",
      address: h.address,
      contact: h.contact,
      description: h.description,
      images: h.images,
      workingHours: h.workingHours,
      lat: h.lat,
      lng: h.lng,
      approved: h.approved,
      bankDetails: h.bankDetails
    });
  } else if (userPayload.role === "patient") {
    const patients = db.getCollection<Patient>("patients");
    const p = patients.find((item) => item.id === userPayload.id);
    if (!p) {
      res.status(404).json({ error: "Patient not found" });
      return;
    }
    res.json({
      id: p.id,
      name: p.name,
      email: p.email,
      role: "patient",
      contact: p.contact,
      address: p.address,
      age: p.age,
      gender: p.gender
    });
  }
});

// -------------------------------------------------------------
// PATIENT HOSPITAL LISTING & SEARCH & DETAILS
// -------------------------------------------------------------

app.get("/api/hospitals", (req: Request, res: Response): void => {
  const { search, specialization, distance, rating, openNow, availableToday, userLat, userLng } = req.query;

  let hospitals = db.getCollection<Hospital>("hospitals").filter((h) => h.approved && !h.blocked);
  const doctors = db.getCollection<Doctor>("doctors");

  // Parse GPS coordinates
  const latUser = userLat ? parseFloat(userLat as string) : 12.9716;
  const lngUser = userLng ? parseFloat(userLng as string) : 77.5946;

  // Map hospitals to include distances, travel times, and current available doctor counts
  let mappedHospitals = hospitals.map((h) => {
    const d = calculateDistance(latUser, lngUser, h.lat, h.lng);
    const docs = doctors.filter((doc) => doc.hospitalId === h.id);

    // Calculate dynamic stats
    const totalSlots = docs.reduce((sum, doc) => sum + doc.dailyOpLimit, 0);
    const bookedSlots = docs.reduce((sum, doc) => sum + doc.bookedCount, 0);
    const remainingSlots = Math.max(0, totalSlots - bookedSlots);

    return {
      ...h,
      distance: d,
      travelTime: Math.max(5, Math.round((d / 30) * 60)), // Minutes assuming 30 km/h average
      doctorsCount: docs.length,
      remainingSlots,
      specializations: Array.from(new Set(docs.map((doc) => doc.specialization)))
    };
  });

  // Filters
  if (search) {
    const q = (search as string).toLowerCase();
    mappedHospitals = mappedHospitals.filter(
      (h) => h.name.toLowerCase().includes(q) || h.address.toLowerCase().includes(q)
    );
  }

  if (specialization) {
    const spec = (specialization as string).toLowerCase();
    mappedHospitals = mappedHospitals.filter((h) =>
      h.specializations.some((s) => s.toLowerCase().includes(spec))
    );
  }

  if (distance) {
    const maxDist = parseFloat(distance as string);
    mappedHospitals = mappedHospitals.filter((h) => h.distance <= maxDist);
  }

  if (rating) {
    const minRating = parseFloat(rating as string);
    mappedHospitals = mappedHospitals.filter((h) => h.rating >= minRating);
  }

  if (openNow === "true") {
    // Basic filter simulation (workingHours containing "24" or includes active status)
    mappedHospitals = mappedHospitals.filter((h) =>
      h.workingHours.toLowerCase().includes("24") || h.workingHours.toLowerCase().includes("08:00 am")
    );
  }

  if (availableToday === "true") {
    mappedHospitals = mappedHospitals.filter((h) => h.remainingSlots > 0);
  }

  res.json(mappedHospitals);
});

// GET SINGLE HOSPITAL + DOCTORS + REVIEWS
app.get("/api/hospitals/:id", (req: Request, res: Response): void => {
  const { id } = req.params;
  const hospitals = db.getCollection<Hospital>("hospitals");
  const hospital = hospitals.find((h) => h.id === id);

  if (!hospital) {
    res.status(404).json({ error: "Hospital not found" });
    return;
  }

  const doctors = db.getCollection<Doctor>("doctors").filter((d) => d.hospitalId === id);
  const reviews = db.getCollection<Review>("reviews").filter((r) => r.hospitalId === id);

  res.json({
    hospital,
    doctors,
    reviews
  });
});

// UPDATE HOSPITAL PROFILE
app.put("/api/hospitals/profile", authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const user = req.user;
  if (!user || user.role !== "hospital") {
    res.status(403).json({ error: "Access denied. Only hospitals allowed." });
    return;
  }

  const { name, address, contact, description, images, workingHours, lat, lng } = req.body;

  const updated = db.update<Hospital>("hospitals", user.id, {
    name,
    address,
    contact,
    description,
    images: Array.isArray(images) ? images : undefined,
    workingHours,
    lat: lat ? parseFloat(lat) : undefined,
    lng: lng ? parseFloat(lng) : undefined
  });

  if (!updated) {
    res.status(404).json({ error: "Hospital not found" });
    return;
  }

  res.json({ message: "Profile updated successfully", hospital: updated });
});

// -------------------------------------------------------------
// DOCTOR MANAGEMENT (HOSPITAL SIDE)
// -------------------------------------------------------------

app.get("/api/hospitals/:id/doctors", (req: Request, res: Response): void => {
  const doctors = db.getCollection<Doctor>("doctors").filter((d) => d.hospitalId === req.params.id);
  res.json(doctors);
});

app.post("/api/hospitals/doctors", authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const user = req.user;
  if (!user || user.role !== "hospital") {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const { name, photo, qualification, experience, specialization, consultationFee, availableDays, availableTimings, dailyOpLimit } = req.body;

  if (!name || !specialization || !consultationFee || !dailyOpLimit) {
    res.status(400).json({ error: "Missing required doctor details" });
    return;
  }

  const newDoctor: Doctor = {
    id: `doc-${Date.now()}`,
    hospitalId: user.id,
    name,
    photo: photo || "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=300&auto=format&fit=crop&q=60",
    qualification: qualification || "MBBS",
    experience: experience || "5 Years",
    specialization,
    consultationFee: Number(consultationFee),
    availableDays: Array.isArray(availableDays) ? availableDays : ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    availableTimings: availableTimings || "09:00 AM - 01:00 PM",
    dailyOpLimit: Number(dailyOpLimit),
    bookedCount: 0
  };

  db.insert<Doctor>("doctors", newDoctor);
  res.status(201).json({ message: "Doctor added successfully", doctor: newDoctor });
});

app.put("/api/hospitals/doctors/:id", authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const user = req.user;
  if (!user || user.role !== "hospital") {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const doctorId = req.params.id;
  const doctors = db.getCollection<Doctor>("doctors");
  const doctor = doctors.find((d) => d.id === doctorId && d.hospitalId === user.id);

  if (!doctor) {
    res.status(404).json({ error: "Doctor not found or unauthorized" });
    return;
  }

  const { name, photo, qualification, experience, specialization, consultationFee, availableDays, availableTimings, dailyOpLimit } = req.body;

  const updated = db.update<Doctor>("doctors", doctorId, {
    name,
    photo,
    qualification,
    experience,
    specialization,
    consultationFee: consultationFee ? Number(consultationFee) : undefined,
    availableDays: Array.isArray(availableDays) ? availableDays : undefined,
    availableTimings,
    dailyOpLimit: dailyOpLimit ? Number(dailyOpLimit) : undefined
  });

  res.json({ message: "Doctor details updated successfully", doctor: updated });
});

app.delete("/api/hospitals/doctors/:id", authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const user = req.user;
  if (!user || user.role !== "hospital") {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const doctorId = req.params.id;
  const doctors = db.getCollection<Doctor>("doctors");
  const exists = doctors.some((d) => d.id === doctorId && d.hospitalId === user.id);

  if (!exists) {
    res.status(404).json({ error: "Doctor not found or unauthorized" });
    return;
  }

  db.delete("doctors", doctorId);
  res.json({ message: "Doctor deleted successfully" });
});

// -------------------------------------------------------------
// BANK DETAILS MANAGEMENT
// -------------------------------------------------------------

app.get("/api/hospitals/profile/bank-details", authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const user = req.user;
  if (!user || (user.role !== "hospital" && user.role !== "admin")) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const targetId = user.role === "admin" ? (req.query.hospitalId as string) : user.id;
  const hospitals = db.getCollection<Hospital>("hospitals");
  const hospital = hospitals.find((h) => h.id === targetId);

  if (!hospital) {
    res.status(404).json({ error: "Hospital not found" });
    return;
  }

  res.json(hospital.bankDetails || {});
});

app.put("/api/hospitals/profile/bank-details", authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const user = req.user;
  if (!user || user.role !== "hospital") {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const bankDetails: BankDetails = req.body;
  if (!bankDetails.accountHolderName || !bankDetails.bankName || !bankDetails.accountNumber || !bankDetails.ifscCode) {
    res.status(400).json({ error: "Missing required bank detail fields" });
    return;
  }

  db.update<Hospital>("hospitals", user.id, { bankDetails });
  res.json({ message: "Bank details updated successfully", bankDetails });
});

// -------------------------------------------------------------
// APPOINTMENT BOOKING & PAYMENT (PATIENT SIDE)
// -------------------------------------------------------------

// Create initial Booking Order (Pending state)
app.post("/api/patients/appointments", authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const user = req.user;
  if (!user || user.role !== "patient") {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const { patientName, patientAge, patientGender, patientMobile, hospitalId, doctorId, appointmentDate, appointmentTime } = req.body;

  if (!patientName || !patientAge || !patientGender || !patientMobile || !hospitalId || !doctorId || !appointmentDate || !appointmentTime) {
    res.status(400).json({ error: "Missing registration details" });
    return;
  }

  // Validate doctor availability
  const doctors = db.getCollection<Doctor>("doctors");
  const doctor = doctors.find((d) => d.id === doctorId && d.hospitalId === hospitalId);

  if (!doctor) {
    res.status(404).json({ error: "Selected doctor not found" });
    return;
  }

  if (doctor.bookedCount >= doctor.dailyOpLimit) {
    res.status(400).json({ error: "Fully Booked. No outpatient slots remaining for today." });
    return;
  }

  const hospitals = db.getCollection<Hospital>("hospitals");
  const hospital = hospitals.find((h) => h.id === hospitalId);
  if (!hospital) {
    res.status(404).json({ error: "Selected hospital not found" });
    return;
  }

  const settings = db.getCollection<PlatformSettings>("settings")[0] || { platformFee: 3 };

  const finalAmount = doctor.consultationFee;
  const adminShare = settings.platformFee;
  const hospitalShare = Math.max(0, finalAmount - adminShare);

  const opId = `OP-${hospital.name.slice(0, 4).toUpperCase().replace(/\s/g, "")}-${Date.now().toString().slice(-6)}`;

  // Create temporary appointment (Pending Payment)
  const newAppointment: Appointment = {
    id: `app-${Date.now()}`,
    patientId: user.id,
    patientName,
    patientAge: Number(patientAge),
    patientGender,
    patientMobile,
    hospitalId,
    hospitalName: hospital.name,
    doctorId,
    doctorName: doctor.name,
    appointmentDate,
    appointmentTime,
    opId,
    paymentId: `pay_pending_${Date.now()}`,
    paymentStatus: "Pending",
    paymentAmount: finalAmount,
    adminShare,
    hospitalShare,
    qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${opId}`,
    createdAt: new Date().toISOString()
  };

  db.insert<Appointment>("appointments", newAppointment);

  // Return booking summary for simulated Razorpay popup
  res.status(201).json({
    message: "Appointment order prepared",
    appointment: newAppointment,
    razorpayOrderId: `order_mock_${Date.now()}`
  });
});

// Verify Payment Simulation
app.post("/api/patients/payments/verify", authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const user = req.user;
  if (!user || user.role !== "patient") {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const { appointmentId, razorpayPaymentId, success } = req.body;

  if (!appointmentId || !razorpayPaymentId) {
    res.status(400).json({ error: "Payment verification failed. Missing ID." });
    return;
  }

  const appointments = db.getCollection<Appointment>("appointments");
  const appointment = appointments.find((a) => a.id === appointmentId && a.patientId === user.id);

  if (!appointment) {
    res.status(404).json({ error: "Appointment not found" });
    return;
  }

  if (success) {
    // Complete payment
    db.update<Appointment>("appointments", appointmentId, {
      paymentStatus: "Completed",
      paymentId: razorpayPaymentId
    });

    // Increment doctor's booked OP slots
    const doctors = db.getCollection<Doctor>("doctors");
    const doctor = doctors.find((d) => d.id === appointment.doctorId);
    if (doctor) {
      db.update<Doctor>("doctors", doctor.id, {
        bookedCount: doctor.bookedCount + 1
      });
    }

    // Trigger Success Notifications
    const patNotif: Notification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-p`,
      userId: user.id,
      userRole: "patient",
      title: "OP Slot Booked Successfully",
      message: `Your appointment with ${appointment.doctorName} at ${appointment.hospitalName} is confirmed for ${appointment.appointmentDate} at ${appointment.appointmentTime}. OP ID: ${appointment.opId}`,
      read: false,
      createdAt: new Date().toISOString()
    };
    db.insert("notifications", patNotif);

    const hospNotif: Notification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-h`,
      userId: appointment.hospitalId,
      userRole: "hospital",
      title: "New OP Booking Confirmed",
      message: `New slot booked for ${appointment.patientName} with ${appointment.doctorName} on ${appointment.appointmentDate}. OP ID: ${appointment.opId}`,
      read: false,
      createdAt: new Date().toISOString()
    };
    db.insert("notifications", hospNotif);

    res.json({
      message: "Payment verified & Appointment confirmed successfully!",
      appointment: { ...appointment, paymentStatus: "Completed", paymentId: razorpayPaymentId }
    });
  } else {
    // Fail payment
    db.update<Appointment>("appointments", appointmentId, {
      paymentStatus: "Failed"
    });
    res.json({ message: "Payment reported as failed." });
  }
});

// Cancel Appointment
app.put("/api/patients/appointments/:id/cancel", authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const user = req.user;
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const appointmentId = req.params.id;
  const appointments = db.getCollection<Appointment>("appointments");
  const appointment = appointments.find((a) => a.id === appointmentId);

  if (!appointment) {
    res.status(404).json({ error: "Appointment not found" });
    return;
  }

  // Permission Check
  if (user.role === "patient" && appointment.patientId !== user.id) {
    res.status(403).json({ error: "Unauthorized to cancel this appointment" });
    return;
  } else if (user.role === "hospital" && appointment.hospitalId !== user.id) {
    res.status(403).json({ error: "Unauthorized to cancel this appointment" });
    return;
  }

  // Update Status
  db.update<Appointment>("appointments", appointmentId, {
    paymentStatus: "Cancelled"
  });

  // Decrement doctor bookedCount if it was completed
  if (appointment.paymentStatus === "Completed") {
    const doctor = db.getCollection<Doctor>("doctors").find((d) => d.id === appointment.doctorId);
    if (doctor) {
      db.update<Doctor>("doctors", doctor.id, {
        bookedCount: Math.max(0, doctor.bookedCount - 1)
      });
    }
  }

  // Send Notifications
  const patientNotif: Notification = {
    id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-cp`,
    userId: appointment.patientId,
    userRole: "patient",
    title: "Appointment Cancelled",
    message: `Your booking for ${appointment.doctorName} on ${appointment.appointmentDate} has been cancelled. Refund processing.`,
    read: false,
    createdAt: new Date().toISOString()
  };
  db.insert("notifications", patientNotif);

  const hospitalNotif: Notification = {
    id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-ch`,
    userId: appointment.hospitalId,
    userRole: "hospital",
    title: "OP Appointment Cancelled",
    message: `Appointment for ${appointment.patientName} (OP ID: ${appointment.opId}) has been cancelled.`,
    read: false,
    createdAt: new Date().toISOString()
  };
  db.insert("notifications", hospitalNotif);

  res.json({ message: "Appointment cancelled successfully." });
});

// View Patient History
app.get("/api/patients/appointments", authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const user = req.user;
  if (!user || user.role !== "patient") {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const list = db.getCollection<Appointment>("appointments").filter((a) => a.patientId === user.id);
  res.json(list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
});

// Submit rating and feedback for completed appointment
app.post("/api/patients/appointments/:id/feedback", authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const user = req.user;
  if (!user || user.role !== "patient") {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const { rating, comment } = req.body;
  if (!rating) {
    res.status(400).json({ error: "Rating is required" });
    return;
  }

  const appointmentId = req.params.id;
  const appointment = db.getCollection<Appointment>("appointments").find((a) => a.id === appointmentId && a.patientId === user.id);

  if (!appointment) {
    res.status(404).json({ error: "Appointment not found or unauthorized" });
    return;
  }

  if (appointment.paymentStatus !== "Completed") {
    res.status(400).json({ error: "Only completed appointments can be rated" });
    return;
  }

  // Update appointment with rating and comment
  const updatedAppointment = db.update<Appointment>("appointments", appointmentId, {
    rating: Number(rating),
    feedbackComment: comment || ""
  });

  // Automatically insert review to the reviews collection
  const patient = db.getCollection<Patient>("patients").find((p) => p.id === user.id);
  if (patient) {
    const newReview: Review = {
      id: `rev-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      hospitalId: appointment.hospitalId,
      patientName: patient.name,
      rating: Number(rating),
      comment: comment || "No specific comment provided.",
      createdAt: new Date().toISOString()
    };
    db.insert<Review>("reviews", newReview);

    // Recalculate hospital average ratings
    const allHospReviews = db.getCollection<Review>("reviews").filter((r) => r.hospitalId === appointment.hospitalId);
    const total = allHospReviews.reduce((sum, r) => sum + r.rating, 0);
    const avg = parseFloat((total / allHospReviews.length).toFixed(1));

    db.update<Hospital>("hospitals", appointment.hospitalId, {
      rating: avg,
      numReviews: allHospReviews.length
    });
  }

  res.json({ message: "Feedback submitted successfully", appointment: updatedAppointment });
});

// Set / Update Appointment Reminder Toggle and settings
app.put("/api/patients/appointments/:id/reminder", authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const user = req.user;
  if (!user || user.role !== "patient") {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const appointmentId = req.params.id;
  const { reminderEnabled, reminderType, reminderMinutesBefore } = req.body;

  const appointment = db.getCollection<Appointment>("appointments").find((a) => a.id === appointmentId && a.patientId === user.id);

  if (!appointment) {
    res.status(404).json({ error: "Appointment not found or unauthorized" });
    return;
  }

  const updatedAppointment = db.update<Appointment>("appointments", appointmentId, {
    reminderEnabled: !!reminderEnabled,
    reminderType: reminderType || "push",
    reminderMinutesBefore: Number(reminderMinutesBefore) || 30
  });

  if (!updatedAppointment) {
    res.status(500).json({ error: "Failed to update reminder settings" });
    return;
  }

  // Simulator push notification insertion when enabled
  if (reminderEnabled) {
    const minText = Number(reminderMinutesBefore) === 0 ? "at the exact time of" : `${reminderMinutesBefore} minutes before`;
    const typeLabel = reminderType === "both" ? "Push Notification & Email" : reminderType === "email" ? "Email" : "Push Notification";
    const notif: Notification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId: user.id,
      userRole: "patient",
      title: `Reminder Configured - Dr. ${appointment.doctorName}`,
      message: `Active ${typeLabel} reminder successfully scheduled for your upcoming consultation on ${appointment.appointmentDate} at ${appointment.appointmentTime}. Triggering ${minText} the schedule.`,
      read: false,
      createdAt: new Date().toISOString()
    };
    db.insert<Notification>("notifications", notif);
  }

  res.json({ message: "Reminder status updated successfully", appointment: updatedAppointment });
});

// Post a review
app.post("/api/patients/reviews", authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const user = req.user;
  if (!user || user.role !== "patient") {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const { hospitalId, rating, comment } = req.body;

  if (!hospitalId || !rating || !comment) {
    res.status(400).json({ error: "Missing review fields" });
    return;
  }

  const patient = db.getCollection<Patient>("patients").find((p) => p.id === user.id);
  if (!patient) {
    res.status(404).json({ error: "Patient not found" });
    return;
  }

  const newReview: Review = {
    id: `rev-${Date.now()}`,
    hospitalId,
    patientName: patient.name,
    rating: Number(rating),
    comment,
    createdAt: new Date().toISOString()
  };

  db.insert<Review>("reviews", newReview);

  // Recalculate hospital average ratings
  const allHospReviews = db.getCollection<Review>("reviews").filter((r) => r.hospitalId === hospitalId);
  const total = allHospReviews.reduce((sum, r) => sum + r.rating, 0);
  const avg = parseFloat((total / allHospReviews.length).toFixed(1));

  db.update<Hospital>("hospitals", hospitalId, {
    rating: avg,
    numReviews: allHospReviews.length
  });

  res.status(201).json({ message: "Review posted successfully", review: newReview });
});

// -------------------------------------------------------------
// HOSPITAL DASHBOARD ANALYTICS & APPOINTMENT LISTING
// -------------------------------------------------------------

app.get("/api/hospitals/dashboard/analytics", authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const user = req.user;
  if (!user || user.role !== "hospital") {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const doctors = db.getCollection<Doctor>("doctors").filter((d) => d.hospitalId === user.id);
  const appointments = db.getCollection<Appointment>("appointments").filter((a) => a.hospitalId === user.id);

  const totalDoctors = doctors.length;
  const todayStr = new Date().toISOString().split("T")[0];

  const todayAppointments = appointments.filter((a) => a.appointmentDate === todayStr && a.paymentStatus === "Completed");
  const todayRevenue = todayAppointments.reduce((sum, a) => sum + a.hospitalShare, 0);

  const totalBookedOp = doctors.reduce((sum, d) => sum + d.bookedCount, 0);
  const totalLimit = doctors.reduce((sum, d) => sum + d.dailyOpLimit, 0);
  const remainingOp = Math.max(0, totalLimit - totalBookedOp);

  res.json({
    totalDoctors,
    todayPatients: todayAppointments.length,
    todayRevenue,
    totalBookedOp,
    remainingOp,
    doctorsList: doctors
  });
});

app.get("/api/hospitals/dashboard/appointments", authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const user = req.user;
  if (!user || user.role !== "hospital") {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const appointments = db.getCollection<Appointment>("appointments").filter((a) => a.hospitalId === user.id);
  res.json(appointments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
});

// -------------------------------------------------------------
// ADMIN DASHBOARD & CONTROL ENDPOINTS
// -------------------------------------------------------------

app.get("/api/admin/hospitals", authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const user = req.user;
  if (!user || user.role !== "admin") {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const list = db.getCollection<Hospital>("hospitals");
  res.json(list);
});

app.put("/api/admin/hospitals/:id/approve", authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const user = req.user;
  if (!user || user.role !== "admin") {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const { approved } = req.body;
  const targetId = req.params.id;

  const updated = db.update<Hospital>("hospitals", targetId, { approved });

  if (!updated) {
    res.status(404).json({ error: "Hospital not found" });
    return;
  }

  // Create notification for hospital
  const hospNotif: Notification = {
    id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    userId: targetId,
    userRole: "hospital",
    title: approved ? "Hospital Profile Approved!" : "Registration Rejected",
    message: approved
      ? "Congratulations! Your hospital registration has been approved. You can now configure doctors and start accepting OP bookings."
      : "Your hospital registration was rejected. Please contact support for clarifications.",
    read: false,
    createdAt: new Date().toISOString()
  };
  db.insert("notifications", hospNotif);

  res.json({ message: `Hospital approval status updated to ${approved}`, hospital: updated });
});

app.put("/api/admin/hospitals/:id/block", authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const user = req.user;
  if (!user || user.role !== "admin") {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const { blocked } = req.body;
  const targetId = req.params.id;

  const updated = db.update<Hospital>("hospitals", targetId, { blocked });
  if (!updated) {
    res.status(404).json({ error: "Hospital not found" });
    return;
  }

  res.json({ message: `Hospital block status updated to ${blocked}`, hospital: updated });
});

app.put("/api/admin/hospitals/:id", authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const user = req.user;
  if (!user || user.role !== "admin") {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const targetId = req.params.id;
  const { name, contact, address, lat, lng } = req.body;

  const updated = db.update<Hospital>("hospitals", targetId, {
    name,
    contact,
    address,
    lat: Number(lat),
    lng: Number(lng)
  });

  if (!updated) {
    res.status(404).json({ error: "Hospital not found" });
    return;
  }

  res.json({ message: "Hospital information corrected", hospital: updated });
});

app.put("/api/admin/appointments/:id", authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const user = req.user;
  if (!user || user.role !== "admin") {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const targetId = req.params.id;
  const { paymentStatus, appointmentDate, appointmentTime } = req.body;

  const updated = db.update<Appointment>("appointments", targetId, {
    paymentStatus,
    appointmentDate,
    appointmentTime
  });

  if (!updated) {
    res.status(404).json({ error: "Appointment not found" });
    return;
  }

  res.json({ message: "Appointment status and details updated successfully", appointment: updated });
});

app.get("/api/admin/settings", authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const user = req.user;
  if (!user || user.role !== "admin") {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const settings = db.getCollection<PlatformSettings>("settings")[0];
  res.json(settings || {});
});

app.put("/api/admin/settings", authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const user = req.user;
  if (!user || user.role !== "admin") {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const { platformFee, adminBankDetails } = req.body;

  const settingsColl = db.getCollection<PlatformSettings>("settings");
  if (settingsColl.length > 0) {
    settingsColl[0] = {
      id: "platform-settings",
      platformFee: Number(platformFee),
      adminBankDetails
    };
    db.saveCollection("settings", settingsColl);
  } else {
    db.insert("settings", { id: "platform-settings", platformFee: Number(platformFee), adminBankDetails });
  }

  res.json({ message: "Platform settings updated successfully" });
});

app.get("/api/admin/stats", authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const user = req.user;
  if (!user || user.role !== "admin") {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const hospitals = db.getCollection<Hospital>("hospitals");
  const doctors = db.getCollection<Doctor>("doctors");
  const patients = db.getCollection<Patient>("patients");
  const appointments = db.getCollection<Appointment>("appointments");

  const completedBookings = appointments.filter((a) => a.paymentStatus === "Completed");

  const totalRevenue = completedBookings.reduce((sum, a) => sum + a.paymentAmount, 0);
  const platformRevenue = completedBookings.reduce((sum, a) => sum + a.adminShare, 0);
  const pendingPayments = appointments.filter((a) => a.paymentStatus === "Pending").reduce((sum, a) => sum + a.paymentAmount, 0);
  const successfulPaymentsCount = completedBookings.length;

  res.json({
    totalHospitals: hospitals.length,
    totalDoctors: doctors.length,
    totalPatients: patients.length,
    totalBookings: appointments.length,
    totalRevenue,
    platformRevenue,
    pendingPayments,
    successfulPaymentsCount,
    hospitals,
    doctors,
    patients,
    appointments
  });
});

// -------------------------------------------------------------
// NOTIFICATIONS
// -------------------------------------------------------------

app.get("/api/notifications", authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const user = req.user;
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const list = db.getCollection<Notification>("notifications").filter((n) => n.userId === user.id && n.userRole === user.role);
  res.json(list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
});

app.put("/api/notifications/:id/read", authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const user = req.user;
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const updated = db.update<Notification>("notifications", req.params.id, { read: true });
  if (!updated) {
    res.status(404).json({ error: "Notification not found" });
    return;
  }

  res.json({ message: "Notification marked as read" });
});

// -------------------------------------------------------------
// VITE SETUP & ASSETS HANDLERS
// -------------------------------------------------------------

// Vite middleware configuration for serving the frontend React application
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT} under NODE_ENV=${process.env.NODE_ENV || "development"}`);
  });
}

startServer();
