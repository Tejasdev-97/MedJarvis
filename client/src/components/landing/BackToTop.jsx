import { useEffect, useState } from "react";
import { ChevronUp } from "lucide-react";

export default function BackToTop() {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setVisible(window.scrollY > 400);
        };

        window.addEventListener("scroll", handleScroll);

        return () => {
            window.removeEventListener("scroll", handleScroll);
        };
    }, []);

    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    };

    if (!visible) return null;

    return (
        <button
            onClick={scrollToTop}
            className="
                fixed
                bottom-28
                right-6
                z-50
                flex
                h-12
                w-12
                items-center
                justify-center
                rounded-full
                bg-[#2D6A4F]
                text-white
                shadow-xl
                transition-all
                duration-300
                hover:scale-110
                hover:bg-[#245741]
                active:scale-95
            "
            aria-label="Back to top"
        >
            <ChevronUp size={22} />
        </button>
    );
}