import {
    LayoutDashboard,
    Users,
    HeartPulse,
    FileText,
    CalendarDays,
    Ambulance,
    Building2,
    Shield,
    Settings,
    QrCode,
    Activity,
    Brain,
    MapPinned,
} from "lucide-react";

export const dashboardMenus = {

    Patient: [
        { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
        { label: "Health Card", icon: QrCode, path: "/health-card" },
        { label: "Vitals", icon: HeartPulse, path: "/vitals" },
        { label: "Prescriptions", icon: FileText, path: "/prescriptions" },
        { label: "Appointments", icon: CalendarDays, path: "/appointments" },
        { label: "Emergency", icon: Ambulance, path: "/emergency" },
    ],

    Doctor: [
        { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
        { label: "Patients", icon: Users, path: "/patients" },
        { label: "Consultations", icon: Activity, path: "/consultations" },
        { label: "Prescriptions", icon: FileText, path: "/prescriptions" },
        { label: "AI Assistant", icon: Brain, path: "/ai" },
    ],

    "Health Worker": [
        { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
        { label: "Village Visits", icon: MapPinned, path: "/villages" },
        { label: "Patients", icon: Users, path: "/patients" },
        { label: "Vitals", icon: HeartPulse, path: "/vitals" },
        { label: "Emergency", icon: Ambulance, path: "/emergency" },
    ],

    Ambulance: [
        { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
        { label: "Emergency Calls", icon: Ambulance, path: "/emergency" },
        { label: "Patients", icon: Users, path: "/patients" },
    ],

    "Hospital Manager": [
        { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
        { label: "Departments", icon: Building2, path: "/departments" },
        { label: "Staff", icon: Users, path: "/staff" },
        { label: "Reports", icon: FileText, path: "/reports" },
    ],

    "Super Admin": [
        { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
        { label: "Users", icon: Users, path: "/users" },
        { label: "Hospitals", icon: Building2, path: "/hospitals" },
        { label: "Audit Logs", icon: Shield, path: "/audit" },
        { label: "Settings", icon: Settings, path: "/settings" },
    ],

};