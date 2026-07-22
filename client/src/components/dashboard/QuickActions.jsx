import { useNavigate } from "react-router-dom";

export default function QuickActions({ actions }) {

    const navigate = useNavigate();

    return (

        <div className="bg-white rounded-2xl p-6 shadow mt-8">

            <h2 className="text-xl font-bold mb-5">

                Quick Actions

            </h2>

            <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">

                {actions.map((item) => {

                    const Icon = item.icon;

                    return (

                        <button
                            key={item.title}
                            onClick={() => navigate(item.path)}
                            className="border rounded-xl p-5 hover:bg-[#2D6A4F] hover:text-white transition"
                        >

                            <Icon className="mx-auto mb-3" />

                            <p>{item.title}</p>

                        </button>

                    );

                })}

            </div>

        </div>

    );

}