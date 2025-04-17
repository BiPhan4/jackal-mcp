import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { connect } from "./helpers/connect.js";
import { Network } from "./helpers/networks.js";
import { getMnemonic } from "./helpers/utils.js";
import { jklTestnetConfig, wasmdConfig } from "./helpers/networks.js";
import path from "path";
import dotenv from "dotenv";
import { saveText, getText, getAllTexts, deleteText } from "./helpers/database.js";

// Create server instance
const server = new McpServer({
  name: "weather",
  version: "1.0.0",
});

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
  console.error("Weather MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});