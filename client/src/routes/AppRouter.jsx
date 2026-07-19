import {

    BrowserRouter,

    Routes,

    Route,

    Navigate,

} from "react-router-dom";

import DashboardLayout from "../layouts/DashboardLayout";

import LandingPage from "../pages/LandingPage";
import LoginPage from "../pages/LoginPage";
import DashboardPage from "../pages/DashboardPage";
import ProfileSelectionPage from "../pages/ProfileSelectionPage";
import HealthCardPage from "../pages/HealthCardPage";
import PatientsPage from "../pages/PatientsPage";

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
        path="/health-card"
        element={<HealthCardPage />}
    />

    <Route
        path="/patients"
        element={<PatientsPage />}
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