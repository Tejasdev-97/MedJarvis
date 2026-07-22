export default function RoleBadge({ role }) {

    const colors = {

        "Super Admin":"bg-red-100 text-red-700",

        Doctor:"bg-blue-100 text-blue-700",

        "Health Worker":"bg-green-100 text-green-700",

        "Hospital Manager":"bg-purple-100 text-purple-700",

        "Ambulance Staff":"bg-orange-100 text-orange-700",

        Patient:"bg-cyan-100 text-cyan-700",

    };

    return (

        <span
            className={`px-4 py-2 rounded-full text-sm font-semibold ${colors[role]}`}
        >

            {role}

        </span>

    );

}