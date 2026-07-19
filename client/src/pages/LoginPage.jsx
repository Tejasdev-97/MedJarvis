import { useState } from "react";
import { useNavigate } from "react-router-dom";

import Card from "../components/common/Card";
import Logo from "../components/common/Logo";

import LoginForm from "../components/auth/LoginForm";

import {

    loginUser,
    saveToken

} from "../services/authService";

export default function LoginPage() {

    const navigate = useNavigate();

    const [loading,setLoading]=useState(false);

    const [error,setError]=useState("");

    const handleLogin = async (data)=>{

        console.log("HANDLE LOGIN", data);

        setLoading(true);

        setError("");

        try{

            const res = await loginUser(

                data.phone,

                data.pin

            );

            if(res.success){

                if(res.multipleProfiles){

                    localStorage.setItem(

                        "profiles",

                        JSON.stringify(res.profiles)

                    );

                    navigate("/profiles");

                    return;

                }

                saveToken(res.token);

                localStorage.setItem(

                    "profile",

                    JSON.stringify(res.profile)

                );

                navigate("/dashboard");

            }

        }

        catch (err) {

    console.log("LOGIN ERROR:", err);
    console.log("STATUS:", err.response?.status);
    console.log("DATA:", err.response?.data);

    setError(
        err.response?.data?.message ||
        "Login Failed"
    );

}

        finally{

            setLoading(false);

        }

    };

    return(

        <div className="min-h-screen flex items-center justify-center bg-[#FAF7F2] px-4">

            <Card className="max-w-md w-full">

                <div className="space-y-8">

                    <Logo center />

                    <div>

                        <h2 className="text-3xl font-serif text-center">

                            Welcome Back

                        </h2>

                        <p className="text-center text-gray-500 mt-2">

                            Login using your registered phone number and PIN

                        </p>

                    </div>

                    <LoginForm

                        onSubmit={handleLogin}

                        loading={loading}

                        error={error}

                    />

                </div>

            </Card>

        </div>

    );

}