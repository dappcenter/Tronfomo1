const contractAddress = 'TEZRaKqCbUuZN5vnKMjWYWo7r4c92woNsC';

const utils = {
    tronWeb: false,
    contract: false,

    async setTronWeb(tronWeb) {
        this.tronWeb = tronWeb;
        this.contract = await tronWeb.contract().at(contractAddress);
    },
};

export default utils;