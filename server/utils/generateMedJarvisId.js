const generateMedJarvisId = async () => {
    const year = new Date().getFullYear();

    const random = Math.floor(
        100000 + Math.random() * 900000
    );

    return `MJ-KA-UK-${year}-${random}`;
};

export default generateMedJarvisId;