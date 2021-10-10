import WalletConnectProvider from '@walletconnect/web3-provider';
import Web3 from 'web3';
import RSS3 from 'rss3-next';
import { RSS3Account, RSS3Asset } from 'rss3-next/types/rss3';
import axios from 'axios';
import { GitcoinResponse, GeneralAsset, NFTResponse } from './types';
import config from '@/config';
import Cookies from 'js-cookie';

let rss3: RSS3 | null;
let web3: Web3 | null;
let assets: Map<string, IAssetProfile> = new Map();
let provider: WalletConnectProvider;

export type IRSS3 = RSS3;

export interface IAssetProfile {
    assets: GeneralAsset[];
    status?: boolean;
}

export interface Theme {
    name: string;
    class: string;
    nftIdPrefix: string;
}

const cookieOptions: Cookies.CookieAttributes = {
    domain: '.' + config.subDomain.rootDomain,
    secure: true,
    sameSite: 'none',
    expires: config.subDomain.cookieExpires,
};

async function walletConnect(skipSign?: boolean) {
    provider = new WalletConnectProvider({
        // We are not using WalletConnect for transactions now,
        // so here's just something crashing our API limits.
        // For infura, 403 requests are also seen as
        // consumed (57.13% of all requests).
        rpc: {
            1: 'https://cloudflare-eth.com',
        },
    });

    //  Enable session (triggers QR Code modal)
    let session;
    try {
        session = await provider.enable();
    } catch (e) {}
    if (!session) {
        return null;
    }

    //  Create Web3 instance
    web3 = new Web3(provider as any);

    if (!web3) {
        return null;
    }

    // Subscribe to session disconnection
    provider.on('disconnect', (code: number, reason: string) => {
        console.log(code, reason);
        rss3 = null;
        web3 = null;
    });

    const address = (await web3.eth.getAccounts())[0];

    rss3 = new RSS3({
        endpoint: config.hubEndpoint,
        address: address,
        agentSign: true,
        sign: async (data: string) => {
            alert('Ready to sign... You may need to prepare your wallet.');
            return await (<Web3>web3).eth.personal.sign(data, address, '');
        },
    });
    if (!skipSign) {
        rss3.files.set(await rss3.files.get(address));
        await rss3.files.sync();
    }

    return rss3;
}

async function visitor(): Promise<RSS3> {
    if (rss3) {
        return rss3;
    } else {
        return new RSS3({
            endpoint: config.hubEndpoint,
        });
    }
}

async function metamaskConnect(skipSign?: boolean) {
    const metamaskEthereum = (window as any).ethereum;
    web3 = new Web3(metamaskEthereum);

    let address: string;
    if (Cookies.get('LAST_CONNECT_METHOD') === 'metamask' && Cookies.get('LAST_CONNECT_ADDRESS')) {
        address = Cookies.get('LAST_CONNECT_ADDRESS') || '';
    } else {
        const accounts = await metamaskEthereum.request({
            method: 'eth_requestAccounts',
        });
        address = web3.utils.toChecksumAddress(accounts[0]);
    }

    rss3 = new RSS3({
        endpoint: config.hubEndpoint,
        address: address,
        agentSign: true,
        sign: async (data: string) => await (<Web3>web3).eth.personal.sign(data, address, ''),
    });
    if (!skipSign) {
        rss3.files.set(await rss3.files.get(address));
        await rss3.files.sync();
    }

    return rss3;
}

function isValidRSS3() {
    return !!rss3;
}

async function disconnect() {
    rss3 = null;
    web3 = null;
    if (provider) {
        await provider.disconnect();
    }
    Cookies.remove('LAST_CONNECT_METHOD');
    Cookies.remove('LAST_CONNECT_ADDRESS');
}

export default {
    walletConnect: async () => {
        await walletConnect();
        if (isValidRSS3()) {
            Cookies.set('LAST_CONNECT_METHOD', 'walletConnect', cookieOptions);
            Cookies.set('LAST_CONNECT_ADDRESS', (<RSS3>rss3).account.address, cookieOptions);
        }
        return rss3;
    },
    metamaskConnect: async () => {
        await metamaskConnect();
        if (isValidRSS3()) {
            Cookies.set('LAST_CONNECT_METHOD', 'metamask', cookieOptions);
            Cookies.set('LAST_CONNECT_ADDRESS', (<RSS3>rss3).account.address, cookieOptions);
        }
        return rss3;
    },
    disconnect: disconnect,
    reconnect: async (): Promise<boolean> => {
        // Migrate
        const lastConnectMigrate = localStorage.getItem('lastConnect');
        const lastAddressMigrate = localStorage.getItem('lastAddress');
        if (lastConnectMigrate) {
            Cookies.set('LAST_CONNECT_METHOD', lastConnectMigrate, cookieOptions);
            localStorage.removeItem('lastConnect');
        }
        if (lastAddressMigrate) {
            Cookies.set('LAST_CONNECT_ADDRESS', lastAddressMigrate, cookieOptions);
            localStorage.removeItem('lastAddress');
        }

        const lastConnect = Cookies.get('LAST_CONNECT_METHOD');
        const address = Cookies.get('LAST_CONNECT_ADDRESS');
        console.log(address);
        if (address) {
            switch (lastConnect) {
                case 'walletConnect':
                    provider = new WalletConnectProvider({
                        rpc: {
                            1: 'https://cloudflare-eth.com',
                        },
                    });
                    //  Create Web3 instance
                    web3 = new Web3(provider as any);
                    break;
                case 'metamask':
                    const metamaskEthereum = (window as any).ethereum;
                    web3 = new Web3(metamaskEthereum);
                    break;
            }
            rss3 = new RSS3({
                endpoint: config.hubEndpoint,
                address: address,
                agentSign: true,
                sign: async (data: string) => {
                    alert('Ready to sign... You may need to prepare your wallet.');
                    return await (<Web3>web3).eth.personal.sign(data, address, '');
                },
            });
        } else if (!isValidRSS3()) {
            switch (lastConnect) {
                case 'walletConnect':
                    await walletConnect(true);
                    break;
                case 'metamask':
                    await metamaskConnect(true);
                    break;
            }
            return isValidRSS3();
        }
        return true;
    },
    visitor: visitor,
    isValidRSS3: isValidRSS3,
    get: async () => {
        return rss3;
    },
    getAssetProfile: async (address: string, type: string, refresh: boolean = false) => {
        if (assets.has(address + type) && !refresh) {
            return <IAssetProfile>assets.get(address + type);
        } else {
            let data: IAssetProfile | null = null;
            try {
                const res = await axios.get(`${config.hubEndpoint}/asset-profile/${address}/${type.toLowerCase()}/`);
                if (res && res.data) {
                    data = res.data;
                    assets.set(address + type, <IAssetProfile>data);
                }
            } catch (error) {
                data = null;
            }
            return data;
        }
    },
    getNFTDetails: async (address: string, platform: string, identity: string, id: string) => {
        let data: NFTResponse | null = null;
        try {
            const res = await axios({
                method: 'get',
                url: `${config.hubEndpoint}/asset-profile/${address}/nft/`,
                params: {
                    platform: platform,
                    id: id,
                    identity: identity,
                },
            });
            if (res && res.data) {
                data = res.data;
            }
        } catch (error) {
            data = null;
        }
        return data;
    },
    getGitcoinDonation: async (address: string, platform: string, identity: string, id: string) => {
        let data: GitcoinResponse | null = null;
        try {
            const res = await axios({
                method: 'get',
                url: `${config.hubEndpoint}/asset-profile/${address}/gitcoin-donation/`,
                params: {
                    platform: platform,
                    id: id,
                    identity: identity,
                },
            });
            if (res && res.data) {
                data = res.data;
            }
        } catch (error) {
            data = null;
        }
        return data;
    },
    addNewMetamaskAccount: async (platform: string): Promise<RSS3Account> => {
        // js don't support multiple return values,
        // so here I'm using signature as a message provider
        if (!rss3) {
            return {
                platform: '',
                identity: '',
                signature: 'Not logged in',
            };
        }
        const metamaskEthereum = (window as any).ethereum;
        const metaMaskWeb3 = new Web3(metamaskEthereum);
        const accounts = await metamaskEthereum.request({
            method: 'eth_requestAccounts',
        });
        const address = metaMaskWeb3.utils.toChecksumAddress(accounts[0]);

        const newTmpAddress: RSS3Account = {
            platform: platform,
            identity: address,
        };

        const signature = await metaMaskWeb3.eth.personal.sign(rss3.accounts.getSigMessage(newTmpAddress), address, '');

        return {
            platform: platform,
            identity: address,
            signature: signature,
        };
    },
    getAvailableThemes(assets: RSS3Asset[]) {
        const availableThemes: Theme[] = [];
        for (const theme of config.theme) {
            for (const asset of assets) {
                if (
                    asset.type === 'NFT' &&
                    !asset.tags?.includes('pass:hidden') &&
                    asset.id.startsWith(theme.nftIdPrefix)
                ) {
                    availableThemes.push(theme);
                    break;
                }
            }
        }
        return availableThemes;
    },
};
