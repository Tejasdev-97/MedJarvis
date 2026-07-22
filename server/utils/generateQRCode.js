import QRCode from "qrcode";

const generateQRCode = async (medJarvisId) => {
    try {
        const qr = await QRCode.toDataURL(medJarvisId);

        return qr;
    } catch (error) {
        throw error;
    }
};

export default generateQRCode;