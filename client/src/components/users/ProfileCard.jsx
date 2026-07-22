export default function ProfileCard({

    profile,

}) {

    return (

        <div className="bg-white rounded-2xl shadow p-5">

            <h2 className="font-bold text-xl">

                {profile.displayName}

            </h2>

            <p className="text-gray-500">

                {profile.role}

            </p>

            <div className="mt-5">

                <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full">

                    {profile.profileStatus}

                </span>

            </div>

        </div>

    );

}