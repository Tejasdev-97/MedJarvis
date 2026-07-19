import { User, ChevronRight } from "lucide-react";

export default function ProfileCard({

    profile,
    onSelect

}) {

    return (

        <button
            onClick={() => onSelect(profile)}
            className="
                w-full
                bg-white
                border
                border-[#E8E0D5]
                rounded-2xl
                p-5
                flex
                items-center
                justify-between
                hover:border-[#2D6A4F]
                hover:shadow-md
                transition
            "
        >

            <div className="flex items-center gap-4">

                <div
                    className="
                        w-12
                        h-12
                        rounded-full
                        bg-[#D8F3DC]
                        flex
                        items-center
                        justify-center
                    "
                >
                    <User className="text-[#2D6A4F]" />
                </div>

                <div className="text-left">

                    <h3 className="font-semibold">

                        {profile.displayName || "User"}

                    </h3>

                    <p className="text-sm text-gray-500">
                        {profile.role}
                    </p>

                </div>

            </div>

            <ChevronRight className="text-[#2D6A4F]" />

        </button>

    );

}