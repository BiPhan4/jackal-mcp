import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { connect } from "./helpers/connect.js";
import { mainnet, Network, testnet } from "./helpers/networks.js";
import { getMnemonic } from "./helpers/utils.js";
import { jklTestnetConfig, wasmdConfig } from "./helpers/networks.js";
import path from "path";
import dotenv from "dotenv";
import { saveText, getText, getAllTexts, deleteText } from "./helpers/database.js";
import FormData from "form-data"; 
import fetch from "node-fetch";   
import fs from "fs";    
import { Request, Response } from 'express';
import WebSocket from 'ws';
(globalThis as any).WebSocket = WebSocket; 
import * as jackaljs from '@jackallabs/jackal.js'
import { ClientHandler } from '@jackallabs/jackal.js'
import type { IClientSetup, IStorageHandler } from '@jackallabs/jackal.js'

const chainId = 'lupulella-2'

function startExpressServer(storage: IStorageHandler) {

  const express = require('express')
  const app = express()
  const port = 3088

  app.get('/:address/:ulid', async (req: Request, res: Response) => {
    const address = req.params.address
    const ulid = req.params.ulid
    const key = req.query.key

    const downloadOptions = {
      ulid: ulid,
      linkKey: key,
      trackers: {
        chunks: [],
        progress: 0
      },
      userAddress: address
    }

    try {
      const file = await storage.downloadByUlid(downloadOptions)
      res.setHeader("Content-Disposition", `inline; filename=\"${file.name}\"`);
      res.setHeader("Content-Type", file.type);
      res.send(Buffer.from(await file.arrayBuffer()));
    } catch (e) {
      res.status(404).send("File not found.");
    }
  });

  app.get('/', (req: Request, res: Response) => {
    res.send('Hello Jackal!');
  });

  app.listen(port, () => {
    console.log(`Express file-sharing gateway listening on port ${port}`);
  });
}

async function init() {
  try {
    const setup: IClientSetup = {
      selectedWallet: "mnemonic",
      mnemonic: `${process.env.JKLTESTSEED}`,
      ...testnet, 
      networks: ['jackal'] as jackaljs.TSockets[],
  }


  const myClient = await ClientHandler.connect(setup)
  const storage: IStorageHandler = await myClient.createStorageHandler()
  storage.loadProviderPool()

  return storage;
  } catch (e) {
    console.error("Error during Jackal init:", e);
    throw(e)
  }
}

// Create server instance
const server = new McpServer({
  name: "weather",
  version: "1.0.0",
});

server.tool(
  "upload-to-jackal",
  "upload a file to the Jackal protocol using PIN",
  {
    filepath: z.string().describe("Path to the file")
  }, 
  async ({filepath}) => {
    try {
      const form = new FormData();

      form.append("file", fs.createReadStream(filepath));

      const options = {
        method: 'POST',
        headers: {Authorization: `Bearer ${process.env.JACKAL_PIN_TOKEN}`, 
        ...form.getHeaders(),
        },
        body: form,
      };

      const response = await fetch("https://pinapi.jackalprotocol.com/api/files", options);
      const json = await response.json();

      return {
        content: [
          {
            type: "text",
            text: `File uploaded successfully. Response: ${JSON.stringify(json)}`,
          },
        ],
      };
    } catch (err) {
      const error = err as Error;
      console.error("Upload error:", err);
      return {
        content: [
          {
            type: "text",
            text: `Failed to upload file: ${error.message}`,
          },
        ],
      };
    }
  }
)

server.tool(
  "send-tokens",
  "Send tokens to a user",
  {
    recipient: z.string().describe("The recipient's address"),
    amount: z.string().describe("Amount of tokens to send (without denomination)"),
  },
  async ({ recipient, amount }) => {
    console.log("send-tokens tool called with:", { recipient, amount });
    try {
      // Force reload environment variables
      const envPath = path.resolve(process.cwd(), '.env');
      console.log("Loading .env from:", envPath);
      const envConfig = dotenv.config({ path: envPath });
      console.log("Env config result:", envConfig);
      console.log("JKLTESTSEED value:", process.env.JKLTESTSEED);

      console.log("About to get mnemonic...");
      const mnemonic = getMnemonic("JKLTESTSEED");
      console.log("Got mnemonic successfully");

      console.log("About to connect...");
      const { client, address } = await connect(mnemonic, jklTestnetConfig);
      console.log("Connected successfully");
      
      // check if given wallet has enough balance 
      console.log("Checking balance...");
      const {amount: balance} = await client.getBalance(address, wasmdConfig.feeToken); 
      console.log("Balance checked:", balance);

      // Send tokens
      const fee = {
        amount: [{ denom: "ujkl", amount: "5000" }],
        gas: "200000",
      };

      // Convert amount to micro tokens (1 token = 1,000,000 micro tokens)
      const microAmount = (parseInt(amount) * 1000000).toString();

      console.log("Sending tokens...");
      const result = await client.sendTokens(
        address,
        recipient,
        [{ denom: "ujkl", amount: microAmount }],
        fee
      );
      console.log("Tokens sent successfully");

      return {
        content: [
          {
            type: "text",
            text: `Successfully sent ${amount} tokens to ${recipient}. Transaction hash: ${result.transactionHash}`,
          },
        ],
      };
    } catch (error) {
      console.error("Error in send-tokens:", error);
      throw error;
    }
  },
);

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Jackal MCP Server running on stdio");

  const storageHandler = await init();
  startExpressServer(storageHandler); // Both MCP and express should be running here
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});