import {
    Users,
    ScanLine,
    Brain,
    FileText,
    Activity,
    HeartPulse,
    CalendarDays,
    Ambulance,
    Building2,
    Shield,
    Settings,
    MapPinned,
    QrCode,
    UserPlus,
    Stethoscope,
    ClipboardList,
    Hospital,
} from "lucide-react";

export const dashboardConfig = {

    "Super Admin": {

        stats: [
            { title: "Users", value: "6", color: "#2563EB", icon: Users },
            { title: "Hospitals", value: "1", color: "#2D6A4F", icon: Hospital },
            { title: "Profiles", value: "6", color: "#F59E0B", icon: Shield },
            { title: "System", value: "Healthy", color: "#EF4444", icon: Activity },
        ],

        actions: [
            { title: "Manage Users", icon: Users, path: "/users" },
            { title: "Hospitals", icon: Building2, path: "/hospitals" },
            { title: "Audit Logs", icon: Shield, path: "/audit" },
            { title: "Settings", icon: Settings, path: "/settings" },
        ],

    },

    Doctor: {

        stats: [
            { title: "Patients", value: "24", color: "#2563EB", icon: Users },
            { title: "Consultations", value: "7", color: "#2D6A4F", icon: ClipboardList },
            { title: "Prescriptions", value: "12", color: "#F59E0B", icon: FileText },
            { title: "Critical", value: "2", color: "#EF4444", icon: Activity },
        ],

        actions: [
            { title: "Patients", icon: Users, path: "/patients" },
            { title: "Scan Patient", icon: ScanLine, path: "/scan-patient" },
            { title: "AI Assistant", icon: Brain, path: "/ai" },
            { title: "Prescriptions", icon: FileText, path: "/prescriptions" },
        ],

    },

    "Health Worker": {

        stats: [
            { title: "Patients", value: "53", color: "#2563EB", icon: Users },
            { title: "Village Visits", value: "5", color: "#2D6A4F", icon: MapPinned },
            { title: "Vitals", value: "18", color: "#F59E0B", icon: HeartPulse },
            { title: "Emergency", value: "1", color: "#EF4444", icon: Ambulance },
        ],

        actions: [
            { title: "Register Patient", icon: UserPlus, path: "/patients" },
            { title: "Scan Patient", icon: ScanLine, path: "/scan-patient" },
            { title: "Village Visits", icon: MapPinned, path: "/villages" },
            { title: "Vitals", icon: HeartPulse, path: "/vitals" },
        ],

    },

    "Ambulance Staff": {

        stats: [
            { title: "Emergency", value: "2", color: "#EF4444", icon: Ambulance },
            { title: "Patients", value: "12", color: "#2563EB", icon: Users },
            { title: "Hospital", value: "3", color: "#2D6A4F", icon: Hospital },
            { title: "Critical", value: "1", color: "#F59E0B", icon: Activity },
        ],

        actions: [
            { title: "Scan Patient", icon: ScanLine, path: "/scan-patient" },
            { title: "Emergency", icon: Ambulance, path: "/emergency" },
            { title: "Patients", icon: Users, path: "/patients" },
            { title: "Nearby Hospitals", icon: Hospital, path: "/hospitals" },
        ],

    },

    "Hospital Manager": {

        stats: [
            { title: "Doctors", value: "12", color: "#2563EB", icon: Stethoscope },
            { title: "Health Workers", value: "18", color: "#2D6A4F", icon: Users },
            { title: "Patients", value: "245", color: "#F59E0B", icon: HeartPulse },
            { title: "Departments", value: "8", color: "#EF4444", icon: Building2 },
        ],

        actions: [
            { title: "Departments", icon: Building2, path: "/departments" },
            { title: "Staff", icon: Users, path: "/staff" },
            { title: "Reports", icon: FileText, path: "/reports" },
            { title: "Scan Patient", icon: ScanLine, path: "/scan-patient" },
        ],

    },

    Patient: {

        stats: [
            { title: "Health Card", value: "Active", color: "#2563EB", icon: QrCode },
            { title: "Vitals", value: "Normal", color: "#2D6A4F", icon: HeartPulse },
            { title: "Appointments", value: "2", color: "#F59E0B", icon: CalendarDays },
            { title: "Prescriptions", value: "3", color: "#EF4444", icon: FileText },
        ],

        actions: [
            { title: "Health Card", icon: QrCode, path: "/health-card" },
            { title: "Appointments", icon: CalendarDays, path: "/appointments" },
            { title: "Prescriptions", icon: FileText, path: "/prescriptions" },
            { title: "Emergency", icon: Ambulance, path: "/emergency" },
        ],

    },

};