export default function SectionTitle({

    title,
    subtitle

}) {

    return (

        <div className="mb-6">

            <h2 className="text-3xl font-serif text-[#2D6A4F]">

                {title}

            </h2>

            <p className="text-gray-500 mt-2">

                {subtitle}

            </p>

        </div>

    );

}