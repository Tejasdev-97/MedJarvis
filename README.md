# 🩺 MedJarvis

> **AI-Powered Smart Healthcare Ecosystem**
>
> MedJarvis is a full-stack AI-powered healthcare platform designed to digitally manage patients, doctors, hospitals, health workers, emergency responders, and AI-assisted healthcare services through a secure and scalable ecosystem.

---

# 📌 Project Overview

MedJarvis aims to become a complete healthcare ecosystem that enables hospitals, doctors, health workers, ambulance staff, and patients to securely manage medical records, prescriptions, health history, emergency access, AI-powered medical assistance, and future IoT integrations.

Unlike traditional hospital management systems, MedJarvis is designed as an intelligent healthcare platform capable of integrating Artificial Intelligence, QR-based digital health cards, wearable sensors, multilingual support, offline-first capabilities, and emergency medical access.

The long-term goal is to provide a modern healthcare solution suitable for hospitals, clinics, rural healthcare workers, and emergency responders.

---

# 🎯 Project Objectives

The major objectives of MedJarvis are:

- Digitize patient health records.
- Provide secure role-based healthcare management.
- Generate QR-based Health Cards.
- Enable quick patient lookup using QR scanning.
- Reduce paperwork.
- Improve emergency response.
- Integrate AI-assisted healthcare features.
- Support future wearable device integration.
- Provide multilingual accessibility.
- Build an extensible healthcare platform.

---

# 🚀 Current Project Status

Current implementation focuses on building the core healthcare management platform before implementing advanced AI and IoT capabilities.

Current major modules include:

- Authentication System
- Role-Based Access Control
- Patient Registration
- Patient Management
- QR Health Card Generation
- QR Scanner
- Dashboard Modules
- Health Worker Workflow
- Doctor Workflow (Partial)
- Hospital Manager Dashboard (Partial)
- Super Admin Dashboard (Partial)

Future phases will introduce:

- AI Health Summary
- AI Symptom Checker
- Drug Interaction Detection
- Voice Assistant
- IoT Sensor Monitoring
- Emergency SOS
- Offline Synchronization
- Predictive Healthcare Analytics

---

# 🏗 Project Architecture

```
                    MedJarvis

                React + Vite Frontend
                        │
                        │
                    REST APIs
                        │
                        │
               Express.js Backend
                        │
            JWT Authentication Layer
                        │
                    MongoDB Atlas
                        │
         AI + QR + Future IoT Modules
```

---

# 📂 Project Folder Structure

```
MedJarvis/
│
├── client/                     # React Frontend
│
├── server/                     # Express Backend
│
├── docs/                       # Documentation
│
├── hardware/                   # IoT & Hardware Files (Future)
│
├── README.md
│
├── .gitignore
│
└── package files
```

---

# 💻 Technology Stack

## Frontend

- React
- Vite
- React Router
- Axios
- Tailwind CSS
- Lucide React
- ZXing QR Scanner

---

## Backend

- Node.js
- Express.js
- MongoDB Atlas
- Mongoose
- JWT Authentication
- bcrypt

---

## AI

- Google Gemini API

(Currently integrated as the preferred AI provider.)

---

## QR Technologies

- QR Code Generator
- ZXing Browser QR Scanner
- Camera Scanner
- Image Upload Scanner

---

## Development Tools

- VS Code
- Git
- GitHub
- Postman
- MongoDB Atlas
- Cloudflare Tunnel (Development only for mobile camera testing)

---

# 👥 User Roles

The current architecture supports six primary user roles.

## 1. Patient

Patient users can:

- View profile
- View health information
- Download Health Card
- View prescriptions
- View medical history

---

## 2. Health Worker

Health workers can:

- Register patients
- Update patient information
- Manage patient records
- Generate Health Cards
- Scan patient QR
- View patient details

---

## 3. Doctor

Doctors can:

- Login securely
- Scan patient QR
- View patient profile
- View medical history
- Add diagnosis (Upcoming)
- Add prescriptions (Upcoming)

---

## 4. Ambulance Staff

Designed for emergency situations.

Future permissions include:

- Emergency QR access
- View allergies
- View blood group
- View medications
- View emergency contacts

---

## 5. Hospital Manager

Hospital managers can:

- Monitor hospital dashboard
- Manage doctors
- Manage health workers

(Current implementation is partial.)

---

## 6. Super Admin

Highest privilege role.

Responsibilities include:

- Manage entire system
- User management
- Analytics
- Reports
- Global settings

(Current implementation is partial.)

---

# 🔐 Authentication Architecture (Frozen)

MedJarvis follows a Phone Number + PIN based authentication system.

Authentication flow:

```
User enters Phone Number
            │
            ▼
       Verify PIN
            │
            ▼
Fetch Linked Profiles
            │
            ▼
Select Required Profile
            │
            ▼
Generate JWT
            │
            ▼
Dashboard
```

This architecture was finalized to support multiple linked profiles under a single login while keeping QR Health Cards dedicated to identification and emergency access rather than authentication.

---

# 🔒 Security Features

Current security implementation includes:

- JWT Authentication
- Password/PIN Hashing using bcrypt
- Protected API Routes
- Role-Based Access Control
- Environment Variable Configuration
- Secure Backend API Architecture

Future versions will additionally include:

- AES Encryption
- Audit Logs
- QR Encryption
- Emergency Unlock Policies
- Time-limited QR Access
- Device Logging
- Access History

---

# 🌐 External Services Used

Current project depends on:

- MongoDB Atlas
- Google Gemini API

Optional (Development)

- Cloudflare Tunnel (for HTTPS camera testing on mobile devices)

---

# 📦 Environment Variables

Refer to:

```
client/.env.example

server/.env.example
```

before running the project.

Never commit your actual `.env` files to GitHub.

---

# 📖 Documentation

Additional project documentation is available in:

```
docs/
```

including the implementation progress tracker.

---

# 🗄 Database Architecture

MedJarvis follows a modular MongoDB design where each major feature is maintained in a separate collection. This keeps the system scalable, secure, and easy to maintain.

## Current Collections

| Collection | Purpose |
|------------|---------|
| Users | Stores login credentials and role information |
| Patients | Stores complete patient profile |
| MedicalHistory | Patient medical history |
| Prescriptions | Doctor prescriptions |
| Vitals | Patient vitals |
| QRScans | QR scan logs |
| AuditLogs | System activity logs |
| Hospitals | Hospital information |
| Doctors | Doctor profiles |
| HealthWorkers | Health worker profiles |
| Settings | Global system settings |

Additional collections will be introduced as AI, analytics, IoT, and emergency modules are implemented.

---

# 🏛 Backend Architecture

The backend follows a modular Express.js architecture.

```
server/
│
├── config/
│
├── controllers/
│
├── middleware/
│
├── models/
│
├── routes/
│
├── services/
│
├── utils/
│
├── app.js
│
└── server.js
```

## Responsibilities

### Config

Contains configuration files for:

- Database connection
- Environment variables
- External services

---

### Controllers

Handle:

- Request processing
- Business logic
- Validation
- API responses

---

### Models

MongoDB models using Mongoose.

Examples:

- User
- Patient
- Prescription
- Medical History

---

### Routes

Defines REST API endpoints.

Examples:

```
/api/auth
/api/patients
/api/doctors
/api/healthworkers
/api/admin
```

---

### Middleware

Responsible for:

- JWT verification
- Authentication
- Authorization
- Error handling
- Request validation

---

### Services

Contains reusable business logic.

Examples:

- QR generation
- AI integration
- Utility services

---

### Utils

Utility/helper functions used across the project.

Examples:

- MedJarvis ID generation
- QR helpers
- Date formatting
- Common utilities

---

# 🎨 Frontend Architecture

The frontend is built using React and follows a component-based architecture.

```
client/
│
├── src/
│
├── assets/
│
├── components/
│
├── layouts/
│
├── pages/
│
├── routes/
│
├── services/
│
├── utils/
│
└── App.jsx
```

---

## Components

Reusable UI components.

Examples:

- Navbar
- Sidebar
- Dashboard Cards
- Patient Cards
- QR Scanner
- Health Card
- Forms
- Buttons
- Modals

---

## Pages

Contains complete screens.

Examples:

- Landing Page
- Login
- Dashboard
- Register Patient
- Patient List
- Patient Profile
- Health Card
- QR Scanner

---

## Services

Responsible for:

- API calls
- Authentication
- Data fetching

---

## Routes

Application routing.

Protected routes are secured using JWT authentication.

---

# 🔄 Authentication Workflow

The current login workflow is:

```
Phone Number
      │
      ▼
Verify PIN
      │
      ▼
Fetch Linked Profiles
      │
      ▼
Select Profile
      │
      ▼
Issue JWT Token
      │
      ▼
Dashboard Access
```

This architecture allows multiple profiles to be associated with one login account while maintaining role-based permissions.

---

# 🩺 Patient Registration Workflow

The current patient registration process is:

```
Health Worker Login
        │
        ▼
Register Patient
        │
        ▼
Generate MedJarvis ID
        │
        ▼
Save Patient Record
        │
        ▼
Generate QR Code
        │
        ▼
Generate Health Card
        │
        ▼
Patient Added Successfully
```

This workflow ensures every patient receives a unique MedJarvis ID and QR Health Card.

---

# 🆔 MedJarvis ID

Each patient is assigned a unique public identifier.

Example format:

```
MJ-KA-DWD-2026-000001
```

The MedJarvis ID is used for:

- Patient lookup
- QR generation
- Health Card generation
- Internal references

---

# 📇 QR Health Card Workflow

The QR Health Card serves as a secure patient identification card.

Current workflow:

```
Register Patient
       │
       ▼
Generate MedJarvis ID
       │
       ▼
Generate QR
       │
       ▼
Embed MedJarvis ID
       │
       ▼
Generate Printable Health Card
```

The QR currently stores the patient's MedJarvis ID, which is resolved securely by the backend.

Future versions will store encrypted references instead of plain identifiers.

---

# 📷 QR Scanner Workflow

MedJarvis supports QR scanning through:

- Device Camera
- Uploaded QR Image

Current scan flow:

```
Open Scanner
      │
      ▼
Scan QR
      │
      ▼
Read MedJarvis ID
      │
      ▼
Backend Lookup
      │
      ▼
Fetch Patient Record
      │
      ▼
Open Patient Profile
```

Camera scanning requires a secure HTTPS context on mobile browsers. During local development, Cloudflare Tunnel can be used to expose the application over HTTPS for testing.

---

# 📡 REST API Overview

Current API modules include:

## Authentication

```
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/profile-selection
```

---

## Patients

```
GET    /api/patients

GET    /api/patients/:id

POST   /api/patients

PUT    /api/patients/:id

DELETE /api/patients/:id

GET    /api/patients/scan/:medJarvisId
```

---

## QR

```
Generate QR

Download QR

Scan QR

Lookup Patient
```

---

## Dashboard

Different dashboards are provided depending on the authenticated role.

---

# 📁 Project Modules

Current modules implemented include:

- Landing Page
- Authentication
- Role-Based Dashboard
- Patient Registration
- Patient Management
- Patient Profile
- Health Card
- QR Code Generation
- QR Scanner (Camera)
- QR Scanner (Image Upload)
- Protected Routes
- JWT Authentication
- MongoDB Integration

Modules marked as partial or under development:

- Doctor Dashboard
- Hospital Manager Dashboard
- Super Admin Dashboard
- Prescription Management
- Medical History Management

---

# 🛠 Development Workflow

Typical development cycle:

1. Pull latest changes.
2. Create a feature branch.
3. Implement the feature.
4. Test locally.
5. Commit with descriptive messages.
6. Push branch.
7. Create a Pull Request.
8. Review and merge.

---

# ⚙️ Installation Guide

## Prerequisites

Before running MedJarvis, ensure the following software is installed on your system:

- Node.js (v18 or later recommended)
- npm
- Git
- MongoDB Atlas Account
- Google Gemini API Key
- VS Code (Recommended)

Verify your installation:

```bash
node -v
npm -v
git --version
```

---

# 📥 Clone the Repository

```bash
git clone https://github.com/<your-username>/MedJarvis.git

cd MedJarvis
```

---

# 📦 Install Dependencies

## Frontend

```bash
cd client
npm install
```

---

## Backend

```bash
cd ../server
npm install
```

---

# 🔧 Configure Environment Variables

Do **NOT** commit your `.env` files.

Create them by copying the example files.

## Client

```
client/.env
```

Example:

```env
VITE_API_URL=http://localhost:5000/api
```

---

## Server

```
server/.env
```

Example:

```env
PORT=5000

MONGODB_URI=your_mongodb_connection_string

JWT_SECRET=your_secure_secret

GEMINI_API_KEY=your_gemini_api_key

GEMINI_MODEL=gemini-2.5-flash-lite
```

---

# 🍃 MongoDB Atlas Setup

1. Create a MongoDB Atlas account.
2. Create a new project.
3. Create a cluster.
4. Create a database user.
5. Allow your IP address (or use `0.0.0.0/0` for development only).
6. Copy the connection string.
7. Replace the placeholder in:

```
server/.env
```

Example:

```
MONGODB_URI=your_connection_string
```

---

# 🤖 Google Gemini API Setup

1. Visit Google AI Studio.
2. Create an API Key.
3. Add it to:

```
server/.env
```

```
GEMINI_API_KEY=your_api_key
```

The backend currently uses:

```
gemini-2.5-flash-lite
```

This model can be changed later through the environment configuration.

---

# ▶️ Running the Backend

Navigate to the server directory:

```bash
cd server
```

Start the server:

```bash
npm run dev
```

The backend runs on:

```
http://localhost:5000
```

---

# ▶️ Running the Frontend

Navigate to:

```bash
cd client
```

Start Vite:

```bash
npm run dev
```

The frontend usually runs on:

```
http://localhost:5173
```

---

# 📱 Mobile Camera Testing

Modern mobile browsers only allow camera access over **HTTPS**.

During local development you can expose the frontend using Cloudflare Tunnel.

Example:

```bash
cloudflared tunnel --url http://localhost:5173
```

Open the generated HTTPS URL on the mobile device.

This is intended only for local development and testing.

---

# 🧪 Testing Checklist

Before committing code, verify:

- Login works.
- JWT authentication works.
- Protected routes work.
- Patient registration works.
- Patient update works.
- Patient deletion works.
- QR generation works.
- Camera scanner works.
- Image upload scanner works.
- Patient lookup works.
- Backend API responds correctly.
- MongoDB connection succeeds.

---

# 🐞 Troubleshooting

## Camera Not Working

Possible causes:

- HTTP instead of HTTPS.
- Camera permission denied.
- Another application is using the camera.

---

## MongoDB Connection Error

Check:

- Connection string
- Username
- Password
- Network Access
- Atlas cluster status

---

## JWT Errors

Verify:

- JWT_SECRET exists
- Token has not expired
- Authorization header is correctly sent

---

## Gemini Errors

Verify:

- API key is valid
- Billing/quota status
- Model name is correct

---

## Port Already in Use

Change the port inside:

```
server/.env
```

or stop the existing process using the port.

---

# 🤝 Contribution Guidelines

We welcome contributions to MedJarvis.

Recommended workflow:

1. Fork the repository.
2. Clone your fork.
3. Create a new feature branch.
4. Make your changes.
5. Test thoroughly.
6. Commit with meaningful messages.
7. Push your branch.
8. Open a Pull Request.

---

# 📝 Commit Message Convention

Recommended format:

```
feat: add patient QR scanner

fix: resolve authentication issue

docs: update README

refactor: improve patient service

style: update dashboard UI

test: add authentication tests
```

---

# 🌱 Future Roadmap

The long-term vision for MedJarvis includes:

## Artificial Intelligence

- AI Health Summary
- AI Symptom Checker
- AI Prescription Assistance
- Drug Interaction Detection
- Medical Report Summarization

---

## Emergency Healthcare

- SOS Module
- Ambulance Dashboard
- Emergency QR Access
- Live Emergency Alerts

---

## IoT Integration

- Wearable Sensors
- Heart Rate Monitoring
- Oxygen Saturation
- Body Temperature
- Fall Detection
- Emergency Trigger

---

## Analytics

- Hospital Analytics
- Disease Trends
- Patient Statistics
- Health Worker Reports
- Doctor Performance

---

## Communication

- Notifications
- SMS Alerts
- WhatsApp Integration
- Email Notifications
- Appointment Reminders

---

## Accessibility

- Voice Commands
- Speech Recognition
- Multilingual Support
- Offline Mode

---

# 📌 Project Status

This repository represents the active development version of MedJarvis.

The implementation status of every module is maintained separately in:

```
docs/DEVELOPMENT_STATUS.md
```

Refer to that document for the latest implementation progress, completed modules, pending work, and development roadmap.

---

# 📄 License

This project is currently developed for educational, research, hackathon, and portfolio purposes.

A production-ready license can be added in the future based on the project's release strategy.

---

# 🙏 Acknowledgements

This project builds upon modern open-source technologies including:

- React
- Vite
- Node.js
- Express.js
- MongoDB Atlas
- Google Gemini
- JWT
- ZXing
- Tailwind CSS

Special thanks to the open-source community for the tools and libraries that make this project possible.

---

# ⭐ Support

If you find this project useful:

- Star the repository.
- Report issues.
- Suggest improvements.
- Contribute through pull requests.

Every contribution helps improve MedJarvis and brings the project closer to its vision of an intelligent, accessible, and secure healthcare ecosystem.

---

**Thank you for your interest in MedJarvis. Happy Coding! 🚀**