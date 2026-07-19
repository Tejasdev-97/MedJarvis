import { useState } from "react";
import { useNavigate } from "react-router-dom";

import Navbar from "../components/landing/Navbar";
import HeroSection from "../components/landing/HeroSection";
import FeatureSection from "../components/landing/FeatureSection";
import WorkflowSection from "../components/landing/WorkflowSection";
import RolesSection from "../components/landing/RolesSection";
import CTASection from "../components/landing/CTASection";
import FooterSection from "../components/landing/FooterSection";
import FloatingAI from "../components/landing/FloatingAI";
import BackToTop from "../components/landing/BackToTop";

export default function LandingPage() {
    const navigate = useNavigate();

    const [darkMode, setDarkMode] = useState(false);

    const [language, setLanguage] = useState("English");

    return (
        <div
            id="home"
            className={`
                min-h-screen
                transition-colors
                duration-300
                ${
                    darkMode
                        ? "bg-[#0F172A]"
                        : "bg-gradient-to-b from-[#F8FFFB] via-white to-[#F3FFF8]"
                }
            `}
        >
            <Navbar
                darkMode={darkMode}
                setDarkMode={setDarkMode}
                language={language}
                setLanguage={setLanguage}
            />

            <HeroSection
                darkMode={darkMode}
                navigate={navigate}
            />

            <FeatureSection
                darkMode={darkMode}
            />

            <WorkflowSection
                darkMode={darkMode}
            />

            <RolesSection
                darkMode={darkMode}
            />

            <CTASection
                darkMode={darkMode}
                navigate={navigate}
            />

            <FooterSection
                darkMode={darkMode}
            />

            <FloatingAI />

            <BackToTop />
        </div>
    );
}