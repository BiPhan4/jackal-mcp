import {
  SigningCosmWasmClient,
} from "@cosmjs/cosmwasm-stargate";
import { Network } from "./networks.js";
import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";
import { Decimal, GasPrice } from "cosmwasm";

/**
 * 
 * @param mnemonic 
 * @param network 
 * @returns
 */
export async function connect(mnemonic: string, network: Network) {
  const { prefix, feeToken, rpcEndpoint } = network;

  // Setup signer
  const offlineSigner = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
    prefix,
  });
  const { address } = (await offlineSigner.getAccounts())[0];
  console.log(`Connected to ${address}`);

  // Init SigningCosmWasmClient client
  const client = await SigningCosmWasmClient.connectWithSigner(
    rpcEndpoint,
    offlineSigner,
    {
    }
  );
  const balance = await client.getBalance(address, feeToken);
  console.log(`Balance: ${balance.amount} ${balance.denom}`);

  const chainId = await client.getChainId();

  if (chainId !== network.chainId) {
    throw Error("Given ChainId doesn't match the clients ChainID!");
  }

  return { client, address };
}
