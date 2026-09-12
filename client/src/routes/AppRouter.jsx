import {

    BrowserRouter,

    Routes,

    Route,

    Navigate,

} from "react-router-dom";

import DashboardLayout from "../layouts/DashboardLayout";
import MyHealthPage from "../pages/MyHealthPage";
import LandingPage from "../pages/LandingPage";
import LoginPage from "../pages/LoginPage";
import DashboardPage from "../pages/DashboardPage";
import ProfileSelectionPage from "../pages/ProfileSelectionPage";
import HealthCardPage from "../pages/HealthCardPage";
import PatientsPage from "../pages/PatientsPage";
import ScanPatientPage from "../pages/ScanPatientPage";
import SettingsPage from "../pages/SettingsPage";
import PatientSummaryPage from "../pages/PatientSummaryPage";
import ComingSoonPage from "../pages/ComingSoonPage";
import UsersPage from "../pages/UsersPage";
import RegisterPatientPage from "../pages/RegisterPatientPage";
import AddPrescriptionPage from "../pages/AddPrescriptionPage";

import ProtectedRoute from "./ProtectedRoute";

export default function AppRouter() {

    return (

        <BrowserRouter>

            <Routes>

                <Route

                    path="/"

                    element={<LandingPage />}

                />

                <Route

                    path="/login"

                    element={<LoginPage />}

                />

                <Route
                    path="/profiles"
                    element={<ProfileSelectionPage />}
                />

                <Route
                    element={
                        <ProtectedRoute>
                            <DashboardLayout />
                        </ProtectedRoute>
                    }
                >
                    <Route
                        path="/dashboard"
                        element={<DashboardPage />}
                    />

                    <Route
                        path="/patients"
                        element={<PatientsPage />}
                    />

                    <Route
                        path="/scan-patient"
                        element={<ScanPatientPage />}
                    />

                    <Route
                        path="/add-prescription/:patientId"
                        element={<AddPrescriptionPage />}
                    />

                    <Route
                        path="/patient-summary/:patientId"
                        element={<PatientSummaryPage />}
                    />

                    <Route
                        path="/health-card"
                        element={<HealthCardPage />}
                    />

                    <Route
                        path="/users"
                        element={<UsersPage />}
                    />

                    <Route path="/hospitals" element={<ComingSoonPage />} />

                    <Route path="/audit" element={<ComingSoonPage />} />

                    <Route

                        path="/settings"

                        element={<SettingsPage />}

                    />

                    <Route path="/departments" element={<ComingSoonPage />} />

                    <Route path="/staff" element={<ComingSoonPage />} />

                    <Route path="/reports" element={<ComingSoonPage />} />

                    <Route path="/consultations" element={<ComingSoonPage />} />

                    <Route path="/prescriptions" element={<ComingSoonPage />} />

                    <Route path="/appointments" element={<ComingSoonPage />} />

                    <Route path="/villages" element={<ComingSoonPage />} />

                    <Route path="/vitals" element={<MyHealthPage />} />

                    <Route path="/emergency" element={<ComingSoonPage />} />

                    <Route path="/ai" element={<ComingSoonPage />} />

                    <Route
                        path="/health-card/:patientId"
                        element={<HealthCardPage />}
                    />
                </Route>

                <Route

                    path="*"

                    element={<Navigate to="/" replace />}

                />

            </Routes>

        </BrowserRouter>

    );

}