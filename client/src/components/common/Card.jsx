export default function Card({

    children,
    className = "",

}) {

    return (

        <div
            className={`
                bg-white
                rounded-3xl
                shadow-xl
                border
                border-[#E8E0D5]
                p-8
                ${className}
            `}
        >

            {children}

        </div>

    );

}