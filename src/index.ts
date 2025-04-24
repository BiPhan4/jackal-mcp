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
import { TSockets } from "@jackallabs/jackal.js";
import { ClientHandler } from '@jackallabs/jackal.js'
import type { IClientSetup, IStorageHandler } from '@jackallabs/jackal.js'

const chainId = 'lupulella-2'

function startExpressServer(storage: IStorageHandler) {

  const express = require('express')
  const app = express()
  const port = 3088

  // code below might not work with our official tutorial?
  // https://docs.jackalprotocol.com/devs/jjs-quickstart.html

  

}

async function init() {
  dotenv.config();

  try {

    const mnemonic = `${process.env.JKLTESTSEED}`;
    console.log("mnemonic:", mnemonic);
    console.log("mnemonic length:", mnemonic.split(" ").length);

    const setup: IClientSetup = {
      selectedWallet: "mnemonic",
      mnemonic,
      ...testnet, 
      networks: ['jackal'] as TSockets[],
  }

  console.log("got setup object")

  const myClient = await ClientHandler.connect(setup)
  console.log("connected to the client handler")
  const storage: IStorageHandler = await myClient.createStorageHandler()
  console.log("created storage handler")
  storage.loadProviderPool()
  console.log("loaded provider pool")

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