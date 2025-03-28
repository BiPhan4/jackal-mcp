import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { connect } from "./helpers/connect.js";
import { Network } from "./helpers/networks.js";
import { getMnemonic } from "./helpers/utils.js";
import { jklTestnetConfig, wasmdConfig } from "./helpers/networks.js";
import path from "path";
import dotenv from "dotenv";


const NWS_API_BASE = "https://api.weather.gov";
const USER_AGENT = "weather-app/1.0";

// Helper function for making NWS API requests
async function makeNWSRequest<T>(url: string): Promise<T | null> {
  const headers = {
    "User-Agent": USER_AGENT,
    Accept: "application/geo+json",
  };

  try {
    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return (await response.json()) as T;
  } catch (error) {
    console.error("Error making NWS request:", error);
    return null;
  }
}

interface AlertFeature {
  properties: {
    event?: string;
    areaDesc?: string;
    severity?: string;
    status?: string;
    headline?: string;
  };
}

// Format alert data
function formatAlert(feature: AlertFeature): string {
  const props = feature.properties;
  return [
    `Event: ${props.event || "Unknown"}`,
    `Area: ${props.areaDesc || "Unknown"}`,
    `Severity: ${props.severity || "Unknown"}`,
    `Status: ${props.status || "Unknown"}`,
    `Headline: ${props.headline || "No headline"}`,
    "---",
  ].join("\n");
}

interface ForecastPeriod {
  name?: string;
  temperature?: number;
  temperatureUnit?: string;
  windSpeed?: string;
  windDirection?: string;
  shortForecast?: string;
}

interface AlertsResponse {
  features: AlertFeature[];
}

interface PointsResponse {
  properties: {
    forecast?: string;
  };
}

interface ForecastResponse {
  properties: {
    periods: ForecastPeriod[];
  };
}

// Create server instance
const server = new McpServer({
  name: "weather",
  version: "1.0.0",
});

server.tool(
  "send-money",
  "Send money to a user",
  {
    recipient: z.string().describe("The recipient's address"),
    amount: z.string().describe("Amount to send (without denomination)"),
    memo: z.string().optional().describe("Optional memo to include with the transfer"),
  },
  async ({ recipient, amount, memo }) => {
    console.log("send-money tool called with:", { recipient, amount, memo });
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
      const {amount: balance} = await client.getBalance(address, "ujkl"); 
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
        fee,
        memo || "" // Include memo if provided, otherwise empty string
      );
      console.log("Tokens sent successfully");

      return {
        content: [
          {
            type: "text",
            text: `Successfully sent ${amount} tokens to ${recipient}${memo ? ` with memo: ${memo}` : ""}. Transaction hash: ${result.transactionHash}`,
          },
        ],
      };
    } catch (error) {
      console.error("Error in send-money:", error);
      throw error;
    }
  },
);

// Register weather tools
server.tool(
  "get-alerts",
  "Get weather alerts for a state",
  {
    state: z.string().length(2).describe("Two-letter state code (e.g. CA, NY)"),
  },
  async ({ state }) => {
    const stateCode = state.toUpperCase();
    const alertsUrl = `${NWS_API_BASE}/alerts?area=${stateCode}`;
    const alertsData = await makeNWSRequest<AlertsResponse>(alertsUrl);

    if (!alertsData) {
      return {
        content: [
          {
            type: "text",
            text: "Failed to retrieve alerts data",
          },
        ],
      };
    }

    const features = alertsData.features || [];
    if (features.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: `No active alerts for ${stateCode}`,
          },
        ],
      };
    }

    const formattedAlerts = features.map(formatAlert);
    const alertsText = `Active alerts for ${stateCode}:\n\n${formattedAlerts.join("\n")}`;

    return {
      content: [
        {
          type: "text",
          text: alertsText,
        },
      ],
    };
  },
);

server.tool(
  "get-forecast",
  "Get weather forecast for a location",
  {
    latitude: z.number().min(-90).max(90).describe("Latitude of the location"),
    longitude: z
      .number()
      .min(-180)
      .max(180)
      .describe("Longitude of the location"),
  },
  async ({ latitude, longitude }) => {
    // Get grid point data
    const pointsUrl = `${NWS_API_BASE}/points/${latitude.toFixed(4)},${longitude.toFixed(4)}`;
    const pointsData = await makeNWSRequest<PointsResponse>(pointsUrl);

    if (!pointsData) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to retrieve grid point data for coordinates: ${latitude}, ${longitude}. This location may not be supported by the NWS API (only US locations are supported).`,
          },
        ],
      };
    }

    const forecastUrl = pointsData.properties?.forecast;
    if (!forecastUrl) {
      return {
        content: [
          {
            type: "text",
            text: "Failed to get forecast URL from grid point data",
          },
        ],
      };
    }

    // Get forecast data
    const forecastData = await makeNWSRequest<ForecastResponse>(forecastUrl);
    if (!forecastData) {
      return {
        content: [
          {
            type: "text",
            text: "Failed to retrieve forecast data",
          },
        ],
      };
    }

    const periods = forecastData.properties?.periods || [];
    if (periods.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: "No forecast periods available",
          },
        ],
      };
    }

    // Format forecast periods
    const formattedForecast = periods.map((period: ForecastPeriod) =>
      [
        `${period.name || "Unknown"}:`,
        `Temperature: ${period.temperature || "Unknown"}°${period.temperatureUnit || "F"}`,
        `Wind: ${period.windSpeed || "Unknown"} ${period.windDirection || ""}`,
        `${period.shortForecast || "No forecast available"}`,
        "---",
      ].join("\n"),
    );

    const forecastText = `Forecast for ${latitude}, ${longitude}:\n\n${formattedForecast.join("\n")}`;

    return {
      content: [
        {
          type: "text",
          text: forecastText,
        },
      ],
    };
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