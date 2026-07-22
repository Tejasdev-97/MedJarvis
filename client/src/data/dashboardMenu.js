import {
    LayoutDashboard,
    Users,
    HeartPulse,
    FileText,
    CalendarDays,
    Ambulance,
    Building2,
    ScanLine,
    Shield,
    Settings,
    QrCode,
    Brain,
    UserPlus,
    ClipboardList,
} from "lucide-react";

export const dashboardMenus = {

    Patient: [
        { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
        { label: "My Health", icon: HeartPulse, path: "/vitals" },
        { label: "Health Card", icon: QrCode, path: "/health-card" },
        { label: "Medical History", icon: ClipboardList, path: "/patients" },
        { label: "Prescriptions", icon: FileText, path: "/prescriptions" },
        { label: "AI Health Summary", icon: Brain, path: "/ai" },
        { label: "Emergency", icon: Ambulance, path: "/emergency" },
        { label: "Settings", icon: Settings, path: "/settings" },
    ],

    Doctor: [
        { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
        { label: "Patients", icon: Users, path: "/patients" },
        { label: "Scan Patient", icon: ScanLine, path: "/scan-patient" },
        { label: "Prescriptions", icon: FileText, path: "/prescriptions" },
        { label: "AI Health Summary", icon: Brain, path: "/ai" },
        { label: "Settings", icon: Settings, path: "/settings" },
    ],

    "Health Worker": [
        { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
        { label: "Register Patient", icon: UserPlus, path: "/patients" },
        { label: "Patients", icon: Users, path: "/patients" },
        { label: "Health Cards", icon: QrCode, path: "/health-card" },
        { label: "Scan Patient", icon: ScanLine, path: "/scan-patient" },
        { label: "Settings", icon: Settings, path: "/settings" },
    ],

    "Ambulance Staff": [
        { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
        { label: "Emergency Scan", icon: ScanLine, path: "/scan-patient" },
        { label: "Emergency Patients", icon: Ambulance, path: "/emergency" },
        { label: "Settings", icon: Settings, path: "/settings" },
    ],

    "Hospital Manager": [
        { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
        { label: "Staff", icon: Users, path: "/staff" },
        { label: "Patients", icon: HeartPulse, path: "/patients" },
        { label: "Register Patient", icon: UserPlus, path: "/patients" },
        { label: "Scan Patient", icon: ScanLine, path: "/scan-patient" },
        { label: "Reports", icon: FileText, path: "/reports" },
        { label: "Settings", icon: Settings, path: "/settings" },
    ],

    "Super Admin": [
        { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
        { label: "Users", icon: Users, path: "/users" },
        { label: "Hospitals", icon: Building2, path: "/hospitals" },
        { label: "Patients", icon: HeartPulse, path: "/patients" },
        { label: "Scan Patient", icon: ScanLine, path: "/scan-patient" },
        { label: "Reports", icon: FileText, path: "/reports" },
        { label: "Audit Logs", icon: Shield, path: "/audit" },
        { label: "Settings", icon: Settings, path: "/settings" },
    ],

};