import { ArrowUpRight } from "lucide-react";

export default function StatCard({

    title,
    value,
    subtitle,
    icon: Icon,
    color = "#2D6A4F",

}) {

    return (

        <div
            className="
                bg-white
                rounded-3xl
                border
                border-[#E8E0D5]
                shadow-sm
                p-6
            "
        >

            <div className="flex justify-between items-start">

                <div>

                    <p className="text-gray-500 text-sm">

                        {title}

                    </p>

                    <h2
                        className="text-3xl font-bold mt-2"
                        style={{ color }}
                    >
                        {value}
                    </h2>

                    <p className="text-sm text-gray-500 mt-3">

                        {subtitle}

                    </p>

                </div>

                <div
                    className="rounded-2xl p-3"
                    style={{
                        background: `${color}15`
                    }}
                >

                    <Icon
                        size={28}
                        style={{
                            color
                        }}
                    />

                </div>

            </div>

            <div className="mt-6 flex items-center gap-2 text-[#2D6A4F]">

                <ArrowUpRight size={18} />

                <span className="text-sm font-medium">

                    View Details

                </span>

            </div>

        </div>

    );

}