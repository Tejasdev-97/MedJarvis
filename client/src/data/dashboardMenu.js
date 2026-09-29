import {
    LayoutDashboard,
    Users,
    HeartPulse,
    FileText,
    Ambulance,
    ScanLine,
    Settings,
    QrCode,
    Brain,
    UserPlus,
    ClipboardList,
} from "lucide-react";

export const dashboardMenus = {

    Patient: [
        {
            label: "Dashboard",
            icon: LayoutDashboard,
            path: "/dashboard",
        },
        {
            label: "My Health",
            icon: HeartPulse,
            path: "/vitals",
        },
        {
            label: "Health Card",
            icon: QrCode,
            path: "/health-card",
        },
        {
            label: "Medical History",
            icon: ClipboardList,
            path: "/medical-history",
        },
        {
            label: "Prescriptions",
            icon: FileText,
            path: "/prescriptions",
        },
        {
            label: "AI Health Summary",
            icon: Brain,
            path: "/ai",
        },
        {
            label: "Emergency",
            icon: Ambulance,
            path: "/emergency",
        },
        {
            label: "Settings",
            icon: Settings,
            path: "/settings",
        },
    ],

    Doctor: [
        {
            label: "Dashboard",
            icon: LayoutDashboard,
            path: "/dashboard",
        },
        {
            label: "Patients",
            icon: Users,
            path: "/patients",
        },
        {
            label: "Scan Patient",
            icon: ScanLine,
            path: "/scan-patient",
        },
        {
            label: "Prescriptions",
            icon: FileText,
            path: "/prescriptions",
        },
        {
            label: "AI Health Summary",
            icon: Brain,
            path: "/ai",
        },
        {
            label: "Settings",
            icon: Settings,
            path: "/settings",
        },
    ],

    "Health Worker": [
        {
            label: "Dashboard",
            icon: LayoutDashboard,
            path: "/dashboard",
        },
        {
            label: "Register Patient",
            icon: UserPlus,
            path: "/register-patient",
        },
        {
            label: "Patients",
            icon: Users,
            path: "/patients",
        },
        {
            label: "Scan Patient",
            icon: ScanLine,
            path: "/scan-patient",
        },
        {
            label: "My Health Monitoring",
            icon: HeartPulse,
            path: "/vitals",
        },
        {
            label: "AI Health Summary",
            icon: Brain,
            path: "/ai",
        },
        {
            label: "Settings",
            icon: Settings,
            path: "/settings",
        },
    ],

    "Ambulance Staff": [
        {
            label: "Dashboard",
            icon: LayoutDashboard,
            path: "/dashboard",
        },
        {
            label: "Emergency Scan",
            icon: ScanLine,
            path: "/scan-patient",
        },
        {
            label: "Emergency",
            icon: Ambulance,
            path: "/emergency",
        },
        {
            label: "Patients",
            icon: Users,
            path: "/patients",
        },
        {
            label: "Settings",
            icon: Settings,
            path: "/settings",
        },
    ],

    "Hospital Manager": [
        {
            label: "Dashboard",
            icon: LayoutDashboard,
            path: "/dashboard",
        },
        {
            label: "Staff Profiles",
            icon: Users,
            path: "/users",
        },
        {
            label: "Patients",
            icon: HeartPulse,
            path: "/patients",
        },
        {
            label: "Scan Patient",
            icon: ScanLine,
            path: "/scan-patient",
        },
        {
            label: "Prescriptions",
            icon: FileText,
            path: "/prescriptions",
        },
        {
            label: "Settings",
            icon: Settings,
            path: "/settings",
        },
    ],

    "Super Admin": [
        {
            label: "Dashboard",
            icon: LayoutDashboard,
            path: "/dashboard",
        },
        {
            label: "Users",
            icon: Users,
            path: "/users",
        },
        {
            label: "Patients",
            icon: HeartPulse,
            path: "/patients",
        },
        {
            label: "Scan Patient",
            icon: ScanLine,
            path: "/scan-patient",
        },
        {
            label: "AI Health Summary",
            icon: Brain,
            path: "/ai",
        },
        {
            label: "Settings",
            icon: Settings,
            path: "/settings",
        },
    ],
};