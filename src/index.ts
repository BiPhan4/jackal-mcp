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
import mime from "mime-types";
(globalThis as any).WebSocket = WebSocket; 
import { TSockets } from "@jackallabs/jackal.js";
import { ClientHandler } from '@jackallabs/jackal.js'
import type { IClientSetup, IStorageHandler, IReadFolderContentOptions } from '@jackallabs/jackal.js'

// jjs quickstart:   https://docs.jackalprotocol.com/devs/jjs-quickstart.html

const chainId = 'lupulella-2'

function startExpressServer(storage: IStorageHandler) {

  const express = require('express')
  const app = express()
  const port = 3088

}

// Create server instance
const server = new McpServer({
  name: "jackal",
  version: "1.0.0",
});

export function registerTools(storagehandler: IStorageHandler) {
  server.tool(
    "buy-storage",
    "buy a storage plan from the jackal protocol",
    {
      // filepath: z.string().describe("Path to the file") // don't need? 
    }, 
    async ({/*filepath*/}) => { // don't need?

      try {

        const options = {
          gb: 1000,
          days: 365
        }

        await storagehandler.purchaseStoragePlan(options)
      
        return {
          content: [
            {
              type: "text",
              text: `Successfully purchased storage.`,
            },
          ],
        };
      } catch (err) {
        const error = err as Error;
        console.error("Purchase error:", err);
        return {
          content: [
            {
              type: "text",
              text: `Failed to buy storage: ${error.message}`,
            },
          ],
        };
      }
    }
  )

  server.tool(
    "upload-file",
    "upload a file to the jackal protocol",
    {
      filepath: z.string().describe("Path to the file")
    }, 
    async ({filepath}) => { // don't need?

      try {

        
        const options: IReadFolderContentOptions = {
          path: 'Home'
        };

        await storagehandler.upgradeSigner()
        await storagehandler.initStorage()
        await storagehandler.loadDirectory(options)

        // convert file from path into 'File' object
        const absolutePath = path.resolve(filepath);
        const fileBuffer = fs.readFileSync(absolutePath);
        const filename = path.basename(absolutePath);

        const type = mime.lookup(absolutePath) || "application/octet-stream";
        const file = new File([fileBuffer], filename, {
          type: type, 
        })
        await storagehandler.queuePrivate(file)
        await storagehandler.processAllQueues()

        return {
          content: [
            {
              type: "text",
              text: `Successfully uploaded a file: ${filename}`,
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
              text: `Failed to upload a file: ${error.message}`,
            },
          ],
        };
      }
    }
  )

  // can register more tools here 
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

// Start the server
async function main() {
  const storageHandler = await init();
  registerTools(storageHandler); // 🔥 all tools now wired up with shared access

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Jackal MCP Server running on stdio");

  // TODO: I don't think we need the express server
  startExpressServer(storageHandler); // Both MCP and express should be running here
  console.log("everything ready to go!")
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});