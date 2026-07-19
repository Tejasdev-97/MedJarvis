export default function LoadingSpinner() {

    return (

        <div className="flex justify-center items-center py-10">

            <div
                className="
                    h-10
                    w-10
                    animate-spin
                    rounded-full
                    border-4
                    border-[#D8F3DC]
                    border-t-[#2D6A4F]
                "
            />

        </div>

    );

}