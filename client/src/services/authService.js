import api from "./api";

export const loginUser = async (phone, pin) => {

    const response = await api.post("/auth/login", {
        phone,
        pin,
    });

    return response.data;
};

export const selectProfile = async (profileId) => {

    const { data } = await api.post("/auth/select-profile", {
        profileId,
    });

    return data;
};

export const saveToken = (token) => {
    localStorage.setItem("token", token);
};

export const logout = () => {
    localStorage.removeItem("token");
};

export const getToken = () => {
    return localStorage.getItem("token");
};