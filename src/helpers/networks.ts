// data from https://github.com/cosmos/chain-registry/tree/master/testnets
import { GasPrice } from "@cosmjs/stargate";
const mainnetChainID = 'jackal-1' 
const testnetChainID = 'lupulella-2' 

export interface Network {
  chainId: string;
  rpcEndpoint: string;
  prefix: string;
  gasPrice: GasPrice;
  feeToken: string;
  faucetUrl: string;
}

export const wasmdConfig: Network = {
  chainId: "localwasm-1",
  rpcEndpoint: "http://localhost:54034",
  prefix: "wasm",
  gasPrice: GasPrice.fromString("0.25uwsm"),
  feeToken: "uwsm",
  // Haven't set up a faucet URL for wasmd yet, we're just funding the account in the e2e environment
  faucetUrl: "https://faucet.malaga-420.cosmwasm.com/",
};

export const jklTestnetConfig: Network = {
  chainId: "lupulella-2",
  rpcEndpoint: "https://testnet-rpc.jackalprotocol.com:443", // This is our personal RPC 
  prefix: "jkl",
  gasPrice: GasPrice.fromString("1000000ujkl"),
  feeToken: "ukjl",
  // TODO: set up faucet
  faucetUrl: "",
};

export const jklMainnetConfig: Network = {
  chainId: "jackal-1",
  rpcEndpoint: "https://rpc.jackalprotocol.com:443", // This is our personal RPC 
  prefix: "jkl",
  gasPrice: GasPrice.fromString("1000000ujkl"),
  feeToken: "ukjl",
  // TODO: set up faucet
  faucetUrl: "",
};

export const mainnet = {
  chainConfig: {
      chainId: mainnetChainID,
      chainName: 'Jackal Test Net',
      rpc: 'https://testnet-rpc.jackalprotocol.com:443',
      rest: 'https://testnet-rpc.jackalprotocol.com:443',
      bip44: {
          coinType: 118
      },
      stakeCurrency: {
          coinDenom: 'JKL',
          coinMinimalDenom: 'ujkl',
          coinDecimals: 6
      },
      bech32Config: {
          bech32PrefixAccAddr: 'jkl',
          bech32PrefixAccPub: 'jklpub',
          bech32PrefixValAddr: 'jklvaloper',
          bech32PrefixValPub: 'jklvaloperpub',
          bech32PrefixConsAddr: 'jklvalcons',
          bech32PrefixConsPub: 'jklvalconspub'
      },
      currencies: [
          {
              coinDenom: 'JKL',
              coinMinimalDenom: 'ujkl',
              coinDecimals: 6
          }
      ],
      feeCurrencies: [
          {
              coinDenom: 'JKL',
              coinMinimalDenom: 'ujkl',
              coinDecimals: 6,
              gasPriceStep: {
                  low: 0.002,
                  average: 0.002,
                  high: 0.02
              }
          }
      ],
      features: []
  },
  chainId: testnetChainID,
  endpoint: 'https://testnet-rpc.jackalprotocol.com:443',
  options: {},
  networks: ['jackal'] // WARNING: do we need to call this 'lupulella'? 
}

export const testnet = {
  chainConfig: {
      chainId: testnetChainID,
      chainName: 'Jackal Test Net',
      rpc: 'https://testnet-rpc.jackalprotocol.com:443',
      rest: 'https://testnet-rpc.jackalprotocol.com:443',
      bip44: {
          coinType: 118
      },
      stakeCurrency: {
          coinDenom: 'JKL',
          coinMinimalDenom: 'ujkl',
          coinDecimals: 6
      },
      bech32Config: {
          bech32PrefixAccAddr: 'jkl',
          bech32PrefixAccPub: 'jklpub',
          bech32PrefixValAddr: 'jklvaloper',
          bech32PrefixValPub: 'jklvaloperpub',
          bech32PrefixConsAddr: 'jklvalcons',
          bech32PrefixConsPub: 'jklvalconspub'
      },
      currencies: [
          {
              coinDenom: 'JKL',
              coinMinimalDenom: 'ujkl',
              coinDecimals: 6
          }
      ],
      feeCurrencies: [
          {
              coinDenom: 'JKL',
              coinMinimalDenom: 'ujkl',
              coinDecimals: 6,
              gasPriceStep: {
                  low: 0.002,
                  average: 0.002,
                  high: 0.02
              }
          }
      ],
      features: []
  },
  chainId: testnetChainID,
  endpoint: 'https://testnet-rpc.jackalprotocol.com:443',
  options: {},
  networks: ['jackaltest']
}