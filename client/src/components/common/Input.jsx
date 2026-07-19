export default function Input({
    label,
    error,
    className = "",
    ...props
}) {

    return (

        <div className="space-y-2">

            {label && (

                <label className="text-sm font-medium text-gray-700">

                    {label}

                </label>

            )}

            <input
                {...props}
                className={`
                    w-full
                    rounded-xl
                    border
                    border-[#E8E0D5]
                    px-4
                    py-3
                    outline-none
                    transition
                    focus:border-[#2D6A4F]
                    focus:ring-2
                    focus:ring-[#D8F3DC]
                    ${className}
                `}
            />

            {error && (

                <p className="text-red-500 text-sm">

                    {error}

                </p>

            )}

        </div>

    );
}