import { useState } from "react";

import Input from "../common/Input";
import Button from "../common/Button";
import PinInput from "./PinInput";

export default function LoginForm({

    onSubmit,
    loading = false,
    error = ""

}) {

    const [phone, setPhone] = useState("");
    const [pin, setPin] = useState("");

    const handleSubmit = (e) => {

    e.preventDefault();

    console.log("FORM SUBMITTED");

    onSubmit({
        phone,
        pin
    });

};

    return (

        <form
            onSubmit={handleSubmit}
            className="space-y-6"
        >

            <Input

                label="Phone Number"

                placeholder="9876543210"

                value={phone}

                onChange={(e)=>setPhone(e.target.value)}

            />

            <div>

                <label className="text-sm font-medium text-gray-700 mb-2 block">

                    4 Digit PIN

                </label>

                <PinInput

                    value={pin}

                    onChange={setPin}

                />

            </div>

            {

                error &&

                <p className="text-red-500">

                    {error}

                </p>

            }

            <Button

                type="submit"

                full

                loading={loading}

            >

                Login

            </Button>

        </form>

    );

}