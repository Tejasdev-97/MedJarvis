# 🩺 MedJarvis

> **AI-Powered Smart Healthcare Ecosystem**

MedJarvis is a full-stack AI-powered healthcare platform designed to connect patients, doctors, health workers, hospitals, ambulance staff, wearable devices, and AI-assisted healthcare services through a unified digital ecosystem.

The platform combines:

- Secure healthcare management
- Role-based access control
- Digital patient records
- Medical history and timelines
- Prescription management
- QR-based Digital Health Cards
- ESP32 wearable monitoring
- Real-time vital monitoring
- Fall and high-motion detection
- Emergency event handling
- AI-powered health summarization
- AI-assisted symptom checking
- Multilingual healthcare accessibility
- Progressive Web Application capabilities
- Future-ready IoT and healthcare intelligence

MedJarvis is developed as a **working academic healthcare prototype**, not as a production-certified medical device.

---

# 📌 Project Overview

Traditional healthcare systems often keep patient information distributed across paper records, hospital systems, prescriptions, emergency contacts, and disconnected monitoring devices.

MedJarvis aims to bring these components together into one unified platform.

The system provides a central patient identity through a unique **MedJarvis ID**, while maintaining separate identities for:

- Authenticated user/account
- Patient
- Physical wearable/Band

The platform supports healthcare workflows ranging from patient registration and medical-record management to wearable monitoring and emergency response.

The final implementation focuses on building a stable, integrated, demonstrable healthcare prototype rather than implementing every advanced feature from the original long-term vision.

---

# 🎯 Project Objectives

The major objectives of MedJarvis are:

- Digitize patient healthcare records.
- Provide secure role-based healthcare access.
- Create a centralized patient medical profile.
- Maintain a chronological medical timeline.
- Manage prescriptions and medical information.
- Generate QR-based digital Health Cards.
- Enable rapid patient identification through QR scanning.
- Integrate ESP32-based wearable monitoring.
- Monitor real-time physiological and movement information.
- Validate sensor readings before using them for downstream processing.
- Detect fall and high-motion events.
- Provide an emergency event workflow.
- Send emergency notifications to registered contacts.
- Provide AI-assisted healthcare information.
- Support multilingual healthcare access.
- Provide responsive and installable PWA functionality.
- Build an extensible architecture for future healthcare intelligence.

---

# 🚀 Current Project Status

MedJarvis currently has a strong working healthcare-management foundation with the main application architecture, authentication, patient workflows, dashboards, medical information modules, QR Health Card system, AI Health Summary, and wearable-monitoring infrastructure implemented to varying levels of completion.

## ✅ Implemented Core Modules

The current implementation includes:

- React + Vite frontend
- Node.js + Express backend
- MongoDB Atlas + Mongoose
- JWT authentication
- Role-based access control
- Phone number + PIN authentication architecture
- Multiple linked profiles under an account
- Role-specific dashboards
- Patient registration
- Patient management
- Patient profile
- Medical history and timeline
- Prescription management
- QR generation
- QR scanning
- QR-based patient lookup
- Digital Health Card
- Health Card PDF generation
- Health Card QR download
- AI Health Summary
- Responsive healthcare UI foundation
- ESP32 wearable integration foundation
- Band/device identity
- Monitoring sessions
- Vital-reading storage
- Spot Monitoring foundation
- Continuous Monitoring foundation
- Live sensor-data pipeline
- Emergency backend foundation
- Emergency frontend foundation
- Fall/high-motion detection foundation

---

# 📊 Implementation Status

MedJarvis has a working and integrated core, while several advanced modules are still being completed.

The remaining work is concentrated mainly in:

1. Completing and validating wearable monitoring.
2. Completing the emergency/fall-response lifecycle.
3. Strengthening sensor validation and false-reading protection.
4. Completing PWA and offline foundations.
5. Completing the Drug Interaction Checker.
6. Completing remaining AI capabilities.
7. Implementing multilingual support.
8. Implementing medicine reminders.
9. Implementing OCR functionality.
10. Implementing doctor visit memory/voice notes.
11. Implementing dynamic health-data visualization.
12. Performing final integration and testing.

A feature should only be considered fully complete when its frontend, backend/database integration where required, authentication and permissions, realistic data flow, error handling, responsive behavior, integration with related modules, actual application testing, and demonstration readiness have been verified.

---

# 🔴 Current Development Focus — Emergency & Fall System

The current active development focus is the **Emergency and Fall Detection system**.

The objective is to connect the wearable monitoring pipeline with a controlled emergency-response workflow.

The intended architecture is:

```text
ESP32 Wearable
      ↓
Sensor Data
      ↓
Fall / High-Motion Detection
      ↓
Sensor Validation
      ↓
Emergency Confirmation
      ↓
Emergency Card
      ↓
User Response Window
      ↓
┌───────────────────────────────┐
│                               │
│ "I'M OK"                      │
│       ↓                       │
│ Emergency Cancelled/Resolved  │
│                               │
│ "EMERGENCY" / "HELP"          │
│       ↓                       │
│ Emergency Declared            │
│                               │
│ No Response                   │
│       ↓                       │
│ Emergency Declared            │
└───────────────────────────────┘
      ↓
Create Emergency Event
      ↓
Identify Patient
      ↓
Retrieve Emergency Contact
      ↓
Send Emergency SMS
      ↓
Emergency Call
      ↓
Emergency Remains ACTIVE
      ↓
"I'M SAFE — STOP EMERGENCY"
      ↓
RESOLVED
🚨 Emergency Event System

An emergency event contains information such as:

Patient
Band
Monitoring session
Event type
Severity
Vital readings
Movement information
Detection time
Location when available
Event status

The architecture is designed to remain extensible for future emergency event types.

The emergency workflow follows:

DETECT
   ↓
VALIDATE
   ↓
CONFIRM
   ↓
NOTIFY
   ↓
CALL
   ↓
STAY ACTIVE
   ↓
RESOLVE

The system should not immediately declare an emergency from one noisy sensor reading.

After a validated event:

An emergency card is displayed.
The user receives a response window.
Text-to-speech can provide the emergency prompt.
The microphone remains disabled while TTS is speaking.
The microphone can activate after the prompt finishes.
The user can provide an explicit response.
"I'm OK" resolves/cancels the emergency.
"Emergency" or "Help" declares the emergency.
No response results in emergency declaration.
The emergency event is stored.
The registered emergency contact is notified.
Emergency handling remains active until resolved.
🛡️ Emergency Duplicate Protection

The emergency system is designed to prevent repeated notifications for the same emergency event.

Emergency Event Created
        ↓
Already Notified?
     /       \
   YES       NO
    ↓         ↓
 Ignore    Send SMS
              ↓
       Mark Notified

A unique Emergency Event ID is used to prevent duplicate notification attempts if the same sensor event is received multiple times.

The emergency event remains in the system history even after it is resolved.

📡 Wearable Monitoring

MedJarvis integrates an ESP32-based wearable monitoring system.

Hardware

Current wearable hardware includes:

ESP32
MAX30102
MPU6050
DS18B20
TP4056 charging module
Sensor Responsibilities
MAX30102

Used for physiological optical measurements including:

Heart rate
SpO₂
PPG-related information
MPU6050

Used for movement information including:

Acceleration
Gyroscope
Acceleration magnitude
Gyroscope magnitude
Tilt
Fall/high-motion detection
DS18B20

Used for:

Temperature measurement
ESP32

Responsible for:

Sensor acquisition
Device communication
Band/device identity
Sending monitoring data to MedJarvis
📊 Spot Monitoring

Spot Monitoring is intended for a quick measurement session performed by an authorized healthcare worker or doctor.

The expected workflow is:

Select Patient
      ↓
Select Available Band
      ↓
Start Monitoring Session
      ↓
Collect Sensor Data
      ↓
Process Readings
      ↓
Validate Readings
      ↓
Display Result
      ↓
Store Result
      ↓
Complete Session
      ↓
Release Band

The Band should become available again after the monitoring session finishes.

The intended reusable lifecycle is:

Available
   ↓
Patient A
   ↓
Monitoring
   ↓
Stop
   ↓
Available
   ↓
Patient B
   ↓
Monitoring
🔄 Continuous Monitoring

Continuous Monitoring repeatedly collects vital measurements while an active monitoring session is running.

The current monitoring design uses approximately:

5-second measurement windows

The system is expected to:

Start a monitoring session.
Associate Band → Patient.
Continuously collect sensor data.
Process readings.
Validate readings.
Store readings.
Stream readings to the frontend.
Detect relevant abnormal events.
Continue until monitoring is stopped/completed.

Multiple physical Bands should be capable of being used in separate monitoring sessions.

❤️ Real-Time Vital Monitoring

MedJarvis is designed to display:

Primary Vitals
SpO₂
Heart Rate
HRV
Temperature
Movement Information
Acceleration
Gyroscope
Acceleration magnitude
Gyroscope magnitude
Tilt
Signal Information
Signal quality
PPG/optical signal information where applicable

The interface should clearly distinguish:

LIVE READING

from:

LAST RECORDED READING

An old reading must never be presented as if it were currently live.

🛡️ Sensor Validation and False-Reading Protection

Sensor validation is a mandatory safety-related feature.

A single incorrect or noisy sensor value should not automatically result in a medical alert or emergency event.

The validation architecture considers:

Range validation
Cross-sensor consistency
Spike/outlier detection
Signal-quality validation
Consecutive confirmation
Availability of sufficient valid samples

Example:

Sensor temporarily reports:

SpO₂ = 35%

        ↓

Check signal quality
        ↓
Check valid range
        ↓
Check supporting measurements
        ↓
Check persistence
        ↓
Confirm sufficient samples
        ↓
Only then process downstream

This protects the application against obvious false readings caused by poor sensor contact, temporary signal loss, or noisy measurements.

📈 Live PPG Waveform

A live PPG waveform is part of the final monitoring scope.

The waveform should:

Receive PPG information from the wearable.
Update dynamically.
Clearly indicate that the waveform is live.
Help demonstrate sensor functionality.
Help verify the underlying physiological signal.
🧠 AI Health Summary

AI Health Summary is one of the core AI features of MedJarvis.

The system uses available patient information such as:

Patient profile
Medical history
Diagnoses
Prescriptions
Medical timeline
Vital readings
Monitoring information
Emergency events
Other available clinical information

The purpose is to transform existing healthcare information into an understandable summary.

The AI should distinguish between:

Recorded information
Observed trends
Potential concerns
Information that may require professional attention

The AI must not invent medical facts.

The feature is intended as a clinical information summarization aid, not an autonomous diagnosis system.

🤖 AI Symptom Checker

The AI Symptom Checker is part of the final implementation scope.

The intended workflow is:

User enters symptoms
        ↓
Provide relevant context
        ↓
AI-assisted analysis
        ↓
Possible explanations
        ↓
Urgency guidance
        ↓
Medical-care recommendation

The feature must clearly communicate that it is an assistive tool and not a definitive diagnosis.

💊 Drug Interaction Checker

The Drug Interaction Checker is one of the highest-priority remaining healthcare features.

The final implementation is expected to include:

Interaction dataset
Medicine search
Deterministic matching
Severity levels
Contraindication handling
Interaction explanations
Doctor confirmation/override where required
Override reason recording
Interaction history
Prescription workflow integration
Testing of common medicine combinations
Testing of safe combinations
Testing of severe interactions
Testing of contraindications

The target is a fully functional and presentation-ready interaction checker rather than a simple visual page.

👥 User Roles

MedJarvis supports six primary roles.

1. 👤 Patient

Patients can:

View personal profile
View health information
View medical history
View prescriptions
View health timeline
Access Health Card
Download Health Card
View AI Health Summary
Manage permitted emergency/QR access
2. 🩺 Doctor

Doctors can:

Login securely
Scan patient QR
Search/access authorized patients
View patient profile
View medical history
View medical timeline
Add diagnoses
Add prescriptions
Review patient vitals
Review monitoring information
Use AI-assisted healthcare features where permitted
3. 👩‍⚕️ Health Worker

Health Workers can:

Register patients
Update patient information
Manage patient records
Generate Health Cards
Scan patient QR
View patient details
Start monitoring sessions
Perform Spot Monitoring
Access Continuous Monitoring where authorized
Record healthcare information
4. 🚑 Ambulance Staff

Ambulance Staff are designed for emergency healthcare access.

The role is intended to provide controlled access to emergency-relevant information such as:

Blood group
Allergies
Medications
Chronic conditions
Emergency contacts
Emergency patient information

Access remains role-controlled and should not expose unrelated patient information.

5. 🏥 Hospital Manager

Hospital Managers can:

Access hospital-level dashboards
Manage doctors
Manage health workers
View patient information according to permissions
View operational statistics
Access reports and administrative functionality
6. 🛡️ Super Admin

The Super Admin has the highest system privilege.

Responsibilities include:

System-wide management
User management
Patient management
Administrative controls
Analytics
Reports
Global settings
System configuration
🔐 Authentication Architecture

MedJarvis uses a Phone Number + PIN authentication architecture.

Phone Number
      ↓
Verify PIN
      ↓
Fetch Linked Profiles
      ↓
Select Profile
      ↓
Generate JWT
      ↓
Dashboard

One account can have multiple linked profiles.

The selected profile determines:

Role
Permissions
Dashboard
Available navigation
Patient access
Backend authorization

QR Health Cards are used for patient identification and controlled healthcare access rather than replacing the authentication system.

🔒 Security Architecture

Current security architecture includes:

JWT authentication
bcrypt-based credential/PIN hashing
Protected backend routes
Role-based authorization
Environment variable configuration
Backend API validation
Profile-based permissions

The broader security design provides a path toward:

Encrypted QR references
AES-based data protection
Audit logging
Time-limited emergency access
Device logging
Access history
Emergency access controls

Security-sensitive functionality should always be implemented without exposing unnecessary patient information.

🆔 Patient and Device Identity

MedJarvis intentionally maintains separate identities.

User / Account ID
        ↓
Authenticated account

Patient / MedJarvis ID
        ↓
Identifies the patient

Band / Device ID
        ↓
Identifies the physical ESP32 wearable

Example:

Account ID → authenticated user
MedJarvis ID → MJ-PAT-001
Band ID → BAND-MJ-001

A physical wearable Band is not permanently assigned to one patient.

The Band is associated with a patient through a monitoring session.

🩺 Patient Registration Workflow

The patient registration process follows:

Health Worker Login
        ↓
Register Patient
        ↓
Generate MedJarvis ID
        ↓
Create Patient Record
        ↓
Generate QR
        ↓
Generate Health Card
        ↓
Store Information
        ↓
Patient Successfully Registered

Each patient receives a unique MedJarvis ID.

Example:

MJ-KA-DWD-2026-000001
📇 QR Health Card

The QR Health Card provides a digital patient identification mechanism.

The workflow is:

Register Patient
      ↓
Generate MedJarvis ID
      ↓
Generate QR
      ↓
Associate QR with Patient
      ↓
Generate Health Card
      ↓
Download / Print Card

The Health Card includes patient-specific information and a QR code.

The system supports:

Health Card display
QR display
QR download
Printable/downloadable Health Card
Backend patient lookup
📷 QR Scanner

MedJarvis supports QR scanning through:

Device camera
Uploaded QR image

The scanning workflow is:

Open Scanner
      ↓
Scan QR
      ↓
Read Patient Identifier
      ↓
Backend Lookup
      ↓
Fetch Patient Record
      ↓
Permission Check
      ↓
Open Authorized Patient Information

Mobile camera access requires a secure HTTPS context.

🗄️ Database Architecture

MedJarvis uses MongoDB Atlas with Mongoose.

The architecture is modular so healthcare information can be stored and managed independently.

Major data areas include:

Users
Profiles
Patients
Patient Cards
Prescriptions
Medical History
Medical Timeline
Vitals
Vital Readings
Monitoring Sessions
Bands/Devices
Emergency Events
QR Scans
Audit Logs
Hospitals
Doctors
Health Workers
Settings

Additional collections can be introduced when new modules require persistent data.

🏗️ System Architecture
                         MEDJARVIS
                              │
             ┌────────────────┴────────────────┐
             │                                 │
       React + Vite                       ESP32 Wearable
       Frontend                            Sensor Layer
             │                                 │
             │                                 │
             └──────────────┬──────────────────┘
                            │
                         REST API
                            │
                     Socket / Live Data
                            │
                     Node.js + Express
                            │
              ┌─────────────┼─────────────┐
              │             │             │
          JWT/RBAC       AI Services    Emergency
              │             │             │
              └─────────────┼─────────────┘
                            │
                      MongoDB Atlas
                            │
                 Healthcare Data Layer
📂 Project Folder Structure
MedJarvis/
│
├── client/
│   ├── src/
│   │   ├── components/
│   │   ├── layouts/
│   │   ├── pages/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── utils/
│   │   └── assets/
│   ├── public/
│   ├── package.json
│   └── vite.config.*
│
├── server/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── utils/
│   ├── app.js
│   ├── server.js
│   └── package.json
│
├── hardware/
│   └── Last_Final_MedjarvisCode/
│
├── docs/
│
├── README.md
├── .gitignore
└── package files
💻 Technology Stack
Frontend
React
Vite
React Router
Axios
Tailwind CSS
Lucide React
ZXing
HTML
CSS
JavaScript
Backend
Node.js
Express.js
MongoDB Atlas
Mongoose
JWT
bcrypt
AI
Google Gemini API

Gemini is the preferred AI provider for MedJarvis.

Hardware
ESP32
MAX30102
MPU6050
DS18B20
TP4056
QR
QR Code generation
ZXing Browser
Camera scanning
Image upload scanning
Development Tools
VS Code
Git
GitHub
MongoDB Atlas
Postman
Cloudflare Tunnel for development HTTPS testing
🎨 Frontend Architecture

The frontend follows a reusable component-based React architecture.

client/src/

components/
    ↓
Reusable UI components

pages/
    ↓
Complete application screens

layouts/
    ↓
Application layouts

routes/
    ↓
Protected and role-based routing

services/
    ↓
API communication

utils/
    ↓
Reusable helpers

assets/
    ↓
Images and visual resources

Reusable components should be preferred over duplicate implementations.

Examples include:

Patient profile
Patient cards
Prescription components
Medical timeline
Vital cards
Monitoring components
QR scanner
Health Card
Forms
Dashboard cards
Emergency card
Modals
🏛 Backend Architecture

The backend follows a modular Express.js architecture.

server/

config/
    ↓
Database and environment configuration

controllers/
    ↓
Request processing and business logic

middleware/
    ↓
Authentication and authorization

models/
    ↓
MongoDB/Mongoose schemas

routes/
    ↓
REST API endpoints

services/
    ↓
Reusable business logic and integrations

utils/
    ↓
Shared helper functions

server.js
    ↓
Application startup
📡 API Architecture

Major API areas include:

Authentication
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/profile-selection
Patients
GET    /api/patients
GET    /api/patients/:id
POST   /api/patients
PUT    /api/patients/:id
DELETE /api/patients/:id
Prescriptions

Prescription endpoints support:

Prescription creation
Prescription retrieval
Latest prescriptions
Patient-specific prescription history
Medical Timeline

Timeline endpoints support:

Medical event creation
Timeline retrieval
Patient history
Health Card

Health Card functionality supports:

Generate Health Card
Retrieve Health Card
Download Health Card PDF
Download QR
Scan/lookup patient
Monitoring

Monitoring APIs support:

Band/session management
Starting monitoring
Stopping monitoring
Vital readings
Spot Monitoring
Continuous Monitoring
Emergency

Emergency APIs support:

Emergency event creation
Emergency processing
Patient identification
Emergency contact retrieval
Emergency notification workflow
Emergency status handling
🔄 Medical Records Workflow

The medical information flow is centered around the patient.

Patient
   │
   ├── Profile
   │
   ├── Medical History
   │
   ├── Medical Timeline
   │
   ├── Prescriptions
   │
   ├── Vitals
   │
   ├── Monitoring Sessions
   │
   ├── Emergency Events
   │
   └── AI Health Summary

This structure allows different healthcare roles to access appropriate information without creating independent copies of the patient's medical record.

🌐 Progressive Web Application

PWA functionality is a high-priority part of the final implementation.

The target includes:

Responsive mobile layout
Responsive tablet layout
Responsive desktop layout
Mobile navigation
PWA manifest
Service worker
Installable application
Offline/caching foundation
Responsive dashboards
Responsive patient profiles
Responsive medical timelines
Responsive prescription tables
Responsive charts
Responsive vital cards
Responsive QR screens
Responsive monitoring screens
Responsive forms

The application should remain usable without layout breakage across:

Mobile
Tablet
Laptop
Desktop
🌍 Multilingual Support

Multilingual support is a major remaining feature.

The intended implementation includes:

Centralized UI strings
Language selector
Approximately 7–8 supported languages
Translated navigation
Translated forms
Translated dashboards
Translated notifications
Responsive handling of longer translated text

The language system should be implemented centrally rather than translating individual pages independently.

💊 Medicine Reminders

Medicine reminders are part of the remaining implementation scope.

Expected functionality:

Create reminder
Set medicine
Set reminder time
Set frequency
Enable/disable reminder
Display upcoming reminders
Notification mechanism
Patient reminder management
📝 Doctor Visit Memory

Doctor Visit Memory is planned as a healthcare communication and memory aid.

Expected functionality:

Doctor visit notes
Optional voice recording
Transcription
Structured notes
Timeline integration
Patient viewing
Follow-up information

This feature is intended as a memory and communication aid rather than a replacement for formal medical documentation.

📷 OCR Features

OCR is a lower-priority feature.

Two primary use cases are planned.

Prescription OCR

Potential extraction:

Medicine name
Dosage/strength
Frequency
Instructions
Medicine Strip OCR

Potential extraction:

Medicine name
Strength
Manufacturer
Batch number
Expiry date

OCR results must be treated as extracted information that requires verification.

🗺️ Dynamic Health Heatmap

A dynamic/simulated health-data heatmap is part of the final scope.

The heatmap should:

Display health-related data geographically.
Update as new data is supplied.
Change dynamically.
Demonstrate aggregation of health information.
Provide a clear visual representation.
Support controlled/simulated demonstration data where appropriate.

If simulated data is used, it should be clearly identified as simulated.

📌 Remaining Development Priorities

Development should follow a focused completion strategy rather than implementing many incomplete features simultaneously.

🔴 Priority 1 — Wearable + Monitoring Completion

Complete and thoroughly test:

ESP32 + Band integration
Wi-Fi communication
Band ID
Backend communication
MAX30102
MPU6050
DS18B20
Spot Monitoring
Continuous Monitoring
Stop Monitoring
Monitoring session creation
Band availability
Band reuse
Patient mapping
Live updates
Stored vital readings

The Band lifecycle must work correctly:

Available
   ↓
Patient
   ↓
Monitoring
   ↓
Stop
   ↓
Available
🔴 Priority 2 — Emergency + Validation

Complete:

Fall/high-motion detection
Sensor validation
Consecutive confirmation
False-reading protection
Emergency event creation
Patient association
Band association
Monitoring session association
Emergency contact retrieval
Emergency SMS
Emergency history
Emergency frontend card
Emergency active state
Emergency resolution
Duplicate notification protection
Emergency test mode

The complete demonstration should be:

ESP32
 ↓
Sensor Data
 ↓
Validation
 ↓
Fall/Event Detection
 ↓
Backend
 ↓
Emergency Event
 ↓
Patient Identification
 ↓
Emergency Contact
 ↓
SMS
🔴 Priority 3 — PWA + Responsive Foundation

Complete:

Mobile responsiveness
Tablet responsiveness
Desktop responsiveness
PWA manifest
Service worker
Installability
Offline/caching foundation
Responsive monitoring
Responsive dashboards
Responsive patient pages
Responsive medical records
Responsive prescriptions
Responsive QR/Health Card
Responsive forms
🔴 Priority 4 — Drug Interaction Checker

Complete the feature to a genuinely usable state:

Dataset
Medicine search
Deterministic matching
Severity levels
Contraindications
Explanations
Doctor confirmation/override
Override reason
Interaction history
Prescription integration
Testing
🟠 Priority 5 — Medical Records + QR Completion

Complete and validate:

Patient profile
Medical timeline
Prescription history
Visit records
Patient search
Doctor access
QR generation
QR scanning
QR patient retrieval
Permission enforcement
🟠 Priority 6 — AI Features

Continue with:

AI Health Summary

Integrate:

Patient data
Medical history
Timeline
Prescriptions
Vitals
Monitoring data
Emergency events
AI Symptom Checker

Implement:

Symptom input
Contextual information
AI analysis
Possible explanations
Urgency guidance
Safety messaging
Medical-care recommendation
🟠 Priority 7 — Multilingual Application

Implement:

Translation architecture
Centralized strings
Language selector
Approximately 7–8 languages
Navigation translations
Forms
Dashboards
Notifications
Long-text responsive testing
🟡 Priority 8 — Medicine Reminders

Implement:

Reminder creation
Time
Frequency
Enable/disable
Notifications
Patient reminder management
🟡 Priority 9 — OCR

Implement:

Prescription OCR
Medicine strip OCR

All extracted values should remain user-verifiable.

🟡 Priority 10 — Doctor Visit Memory

Implement:

Visit notes
Optional voice recording
Transcription
Structured notes
Timeline integration
Follow-up information
🟡 Priority 11 — Dynamic Health Heatmap

Implement:

Health-event dataset
Map visualization
Dynamic updates
Demonstration/simulated data
Filtering where useful
Responsive map
🟢 Priority 12 — Final Integration and Testing

After major features are complete, perform a complete system integration pass.

Test:

Authentication
Role permissions
Patient registration
Patient management
Medical records
Prescriptions
QR
Health Card
Monitoring
Sensor validation
Fall detection
Emergency events
SMS
AI
Drug interactions
Multilingual UI
PWA
Reminders
OCR
Doctor notes
Heatmap
Responsive layouts
Error handling
Realistic data flows
🚫 Advanced Features Not Required for the Final Scope

The original broader MedJarvis vision contains many advanced concepts.

They are not mandatory for the defined final implementation unless explicitly added to the project scope.

Examples include:

Full patient digital twin
Advanced self-trained stress classifier
Personal baseline learning system
Advanced BP estimation using PPG/PTT
Heatstroke detection
Seizure detection
Panic detection
Overexertion classification
Advanced emergency priority routing
Offline first-aid intelligence system
Community health intelligence system
Full voice-prescription system
Advanced prescription-change protocol
Complex emergency-contact hierarchy
Large-scale village health intelligence
Fully autonomous clinical decision-making
Production-grade medical-device certification

These concepts may remain future enhancements, but they should not distract development from completing the defined final scope.

⚙️ Environment Variables

Do not commit real .env files.

Create environment files locally.

Client
client/.env

Example:

VITE_API_URL=http://localhost:5000/api
Server
server/.env

Example:

PORT=5000

MONGODB_URI=your_mongodb_connection_string

JWT_SECRET=your_secure_secret

GEMINI_API_KEY=your_gemini_api_key

GEMINI_MODEL=gemini-2.5-flash-lite

Additional environment variables may be required as new integrations are enabled.

📦 Installation
Prerequisites

Install:

Node.js 18+
npm
Git
MongoDB Atlas account
Google Gemini API key
VS Code recommended

Verify:

node -v
npm -v
git --version
📥 Clone Repository
git clone https://github.com/Tejasdev-97/MedJarvis.git
cd MedJarvis
📦 Install Frontend Dependencies
cd client
npm install
📦 Install Backend Dependencies
cd ../server
npm install
▶️ Run Backend

From the server directory:

npm run dev

The backend runs on:

http://localhost:5000
▶️ Run Frontend

From the client directory:

npm run dev

The frontend normally runs on:

http://localhost:5173
🧪 Build Frontend

Before committing major frontend changes:

cd client
npm run build

A successful production build should complete without compilation errors.

Warnings such as large JavaScript chunks should be reviewed separately from actual build failures.

📱 Mobile Camera Testing

Modern mobile browsers generally require a secure HTTPS context for camera access.

During local development, a tunnel can be used when necessary.

Example:

cloudflared tunnel --url http://localhost:5173

Open the generated HTTPS URL on the mobile device.

This is intended for development and testing.

🧪 Testing Checklist

Before considering a feature complete, verify:

Authentication
 Login works
 PIN validation works
 Profile selection works
 JWT is generated
 Protected routes work
 Role permissions work
Patient Management
 Patient registration works
 MedJarvis ID is generated
 Patient information can be viewed
 Patient information can be updated
 Patient records load correctly
Medical Records
 Medical history works
 Timeline works
 Prescription creation works
 Prescription retrieval works
 Permissions are respected
QR / Health Card
 QR generation works
 QR download works
 Camera scanning works
 Image scanning works
 Patient lookup works
 Health Card loads
 Health Card PDF downloads correctly
Monitoring
 Band connects
 Band ID is recognized
 Patient mapping works
 Monitoring session starts
 Spot Monitoring works
 Continuous Monitoring works
 Stop Monitoring works
 Band becomes available again
 Vital readings are stored
 Live data is displayed
 Old readings are not incorrectly shown as live
Sensor Validation
 Invalid ranges are handled
 Sensor spikes are filtered
 Signal quality is checked
 Consecutive confirmation works
 Garbage readings do not immediately trigger emergencies
Emergency
 Fall/high-motion event is detected
 Event is validated
 Emergency card appears
 Correct patient is displayed
 User response works
 No-response flow works
 Emergency event is stored
 SMS flow works
 Duplicate notification protection works
 Emergency remains active
 Emergency can be resolved
AI
 AI Health Summary works
 Patient data is correctly supplied
 AI does not invent recorded medical information
 Symptom Checker provides appropriate safety messaging
Responsive / PWA
 Mobile layout works
 Tablet layout works
 Desktop layout works
 Navigation works
 PWA installation works
 Offline/caching behavior works where implemented
🐞 Troubleshooting
Camera Not Working

Check:

HTTPS is being used.
Camera permission is granted.
Another application is not using the camera.
The browser supports camera access.
MongoDB Connection Error

Check:

MongoDB connection string
Username
Password
Network access
Atlas cluster status
Environment variables
JWT Error

Check:

JWT_SECRET
Token expiry
Authorization header
Login/profile selection flow
Gemini Error

Check:

Gemini API key
Gemini model name
API quota
API availability
Server environment variables
Monitoring Not Receiving Data

Check:

ESP32 power
Sensor wiring
Band ID
Wi-Fi/network
Backend server
Monitoring session
Patient mapping
WebSocket/live-data connection
Sensor signal quality
Emergency Not Triggering

Check the complete pipeline:

ESP32
 ↓
Sensor Data
 ↓
Validation
 ↓
Fall Detection
 ↓
Emergency Event
 ↓
Patient Mapping
 ↓
Emergency Contact
 ↓
Notification

Do not debug only the frontend emergency card if the upstream sensor/event pipeline is not producing a validated event.

🔄 Development Philosophy

MedJarvis follows a complete-the-feature-before-moving-on approach.

A feature is not considered complete simply because a frontend page exists.

A complete feature should have, where applicable:

Frontend UI
Backend API
Database integration
Authentication and permissions
Realistic data flow
Error handling
Responsive behavior
Integration with related features
Actual application testing
Demonstration readiness

The development principle is:

Finish fewer features completely rather than building many features partially.

🛠️ Recommended Development Workflow

For every major feature:

Understand Requirement
        ↓
Inspect Existing Implementation
        ↓
Identify Required Files
        ↓
Implement Smallest Complete Change
        ↓
Run Application
        ↓
Test Realistic Data
        ↓
Test Error Cases
        ↓
Test Permissions
        ↓
Test Responsive UI
        ↓
Build
        ↓
Commit

Existing working functionality should be preserved when implementing new modules.

📋 Development Roadmap

The implementation roadmap is:

Wearable + Monitoring Foundation
            ↓
PWA + Responsive Foundation
            ↓
Drug Interaction Checker
            ↓
Medical Records + QR Completion
            ↓
Emergency + Validation
            ↓
Live PPG
            ↓
AI Health Features
            ↓
Multilingual Support
            ↓
Medicine Reminders
            ↓
OCR
            ↓
Doctor Visit Memory
            ↓
Dynamic Health Heatmap
            ↓
Final Integration + Testing

The current development focus is the Emergency and Fall Detection system, while monitoring reliability and sensor validation remain closely related priorities.

📚 Documentation

Additional project documentation is maintained under:

docs/

The primary implementation specification defines:

Final feature scope
Authentication architecture
Patient architecture
Monitoring architecture
Emergency pipeline
AI requirements
PWA requirements
Multilingual requirements
OCR requirements
Development priorities
Final integration requirements

The implementation specification should be consulted before introducing major architectural changes.

🌱 Future Expansion

After the defined final implementation is stable, MedJarvis can be extended with:

Advanced patient analytics
Personalized health models
Advanced wearable intelligence
Community health intelligence
Advanced emergency routing
Additional healthcare integrations
Advanced voice interaction
More IoT sensors
Advanced predictive analytics
Larger-scale healthcare deployment

These should only be pursued after the core platform is stable.

⚠️ Project Disclaimer

MedJarvis is an academic/research prototype.

It is not a certified medical device and should not be used as a replacement for qualified medical professionals, emergency services, clinical diagnosis, or professional treatment.

AI-generated information is intended to assist with healthcare information management and should not be treated as definitive medical diagnosis.

Sensor measurements may contain errors and should be interpreted appropriately.

📄 License

MedJarvis is currently developed for:

Educational purposes
Academic research
Hackathons
Demonstration
Portfolio development

A formal production license can be introduced later according to the project's release strategy.

🙏 Acknowledgements

MedJarvis builds upon modern open-source technologies and services including:

React
Vite
Node.js
Express.js
MongoDB Atlas
Mongoose
Google Gemini
JWT
bcrypt
ZXing
Tailwind CSS
ESP32
MAX30102
MPU6050
DS18B20

Special thanks to the open-source community and the developers of the tools and libraries that make MedJarvis possible.

⭐ MedJarvis

MedJarvis brings together:

Patient Records
      +
Role-Based Healthcare
      +
QR Health Cards
      +
AI Assistance
      +
Wearable Monitoring
      +
Emergency Response
      +
Multilingual Access
      +
PWA / Offline Capability

into one extensible healthcare ecosystem.

Detect → Validate → Understand → Respond → Improve

MedJarvis — AI-Powered Smart Healthcare Ecosystem.