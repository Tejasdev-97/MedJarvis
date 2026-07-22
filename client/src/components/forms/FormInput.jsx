export default function FormInput({

    label,
    ...props

}) {

    return (

        <div>

            <label className="block mb-2 font-medium">

                {label}

            </label>

            <input
                {...props}
                className="border rounded-xl w-full p-3"
            />

        </div>

    );

}