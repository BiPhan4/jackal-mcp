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
import {Blob} from 'buffer';
import { File } from 'node-fetch';

// jjs quickstart:   https://docs.jackalprotocol.com/devs/jjs-quickstart.html

const chainId = 'lupulella-2'

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

        // convert file from path into 'File' object
        const absolutePath = path.resolve(filepath);
        const fileBuffer = fs.readFileSync(absolutePath);
        const filename = path.basename(absolutePath);

        const type = mime.lookup(absolutePath) || "application/octet-stream";

        const file = new File([fileBuffer], filename, { type });
        console.log("filename is:", filename)  

        await storagehandler.queuePrivate(file)
        await storagehandler.processAllQueues(/*{ monitorTimeout: 60 }*/)
        // console.log("processAllQueues result:", result); 

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
        console.error("Uploading error:", err);
        return {
          content: [
            {
              type: "text",
              text: `Could not upload a file: ${error.message}`,
            },
          ],
        };
      }
    }
  )

  server.tool(
    "download-file",
    "download a file from the jackal protocol",
    {
      name: z.string().describe("name of file")
    }, 
    async ({name}) => { // don't need?

      try {

        const tracker = { progress: 0, chunks: [] }
        const myFileName = name

        const myFile = await storagehandler.downloadFile(`Home/${myFileName}`, tracker)
        
        

        return {
          content: [
            {
              type: "text",
              text: `Successfully downloaded a file: ${myFile}`,
            },
          ],
        };
      } catch (err) {
        const error = err as Error;
        console.error("download error:", err);
        return {
          content: [
            {
              type: "text",
              text: `Failed to download a file: ${error.message}`,
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

  const initPool = {
    jkl1yvnfpj68wtdxpyfpwa7fgrf8gcdnf6pw9d8jcr: "https://tprov01.jackallabs.io",
  }

  const pool = await storage.loadProviderPool(initPool)
  console.log("=== Pool Loaded?===")
  console.dir(pool, { depth: null});

  return storage;
  } catch (e) {
    console.error("Error during Jackal init:", e);
    throw(e) 
  }
}

// Start the server
async function main() {
  const storageHandler = await init();
  const options: IReadFolderContentOptions = {
    path: 'Home/movies'
  };

  await storageHandler.upgradeSigner()
  await storageHandler.initStorage()
  await storageHandler.loadDirectory(options)

  registerTools(storageHandler); // 🔥 all tools now wired up with shared access

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Jackal MCP Server running on stdio");

  console.log("everything ready to go!")
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});