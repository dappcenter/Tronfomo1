const contractAddress = 'TAhJjkh2HFMnXbjUkpLvVP4A95cc9px71j';

const utils = {
    tronWeb: false,
    contract: false,

    async setTronWeb(tronWeb) {
        this.tronWeb = tronWeb;
        this.contract = await tronWeb.contract().at(contractAddress);
    },
};

export default utils;
