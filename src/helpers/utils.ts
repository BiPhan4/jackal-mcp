import axios from "axios";
import * as fs from "fs";
import dotenv from "dotenv";
import path from "path";

// Try to load .env from both root and src directories
console.log("Starting to load environment variables...");
console.log("Current working directory:", process.cwd());

// First try to load from root
const rootEnv = dotenv.config();
if (rootEnv.error) {
  console.log("No .env in root directory, trying src directory...");
  const srcEnv = dotenv.config({ path: path.resolve(process.cwd(), 'src', '.env') });
  if (srcEnv.error) {
    console.error("Error loading .env files:", srcEnv.error);
  } else {
    console.log("Successfully loaded .env from src directory");
  }
} else {
  console.log("Successfully loaded .env from root directory");
}

// Force reload the environment variables
const envPath = path.resolve(process.cwd(), '.env');
console.log("Loading .env from:", envPath);
const envConfig = dotenv.config({ path: envPath });
console.log("Env config result:", envConfig);

// Log all environment variables
console.log("All environment variables:", Object.keys(process.env));
console.log("JKLTESTSEED value:", process.env.JKLTESTSEED);

interface LocalContract {
  name: string;
  wasmFile: string;
}

interface RemoteContract {
  name: string;
  wasmUrl: string;
}

function isLocal(contract: Contract): contract is LocalContract {
  return (contract as LocalContract).wasmFile !== undefined;
}

export async function downloadWasm(url: string): Promise<Uint8Array> {
  const r = await axios.get(url, { responseType: "arraybuffer" });
  if (r.status !== 200) {
    throw new Error(`Download error: ${r.status}`);
  }
  return r.data;
}

function loadWasmFile(path: string): Uint8Array {
  return fs.readFileSync(path);
}

export type Contract = LocalContract | RemoteContract;

// Function to read .env file directly
function readEnvFile(): Record<string, string> {
  const envPath = path.resolve(process.cwd(), '.env');
  console.log("Reading .env from:", envPath);
  
  try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envVars: Record<string, string> = {};
    
    envContent.split('\n').forEach(line => {
      const [key, ...values] = line.split('=');
      if (key && values.length > 0) {
        envVars[key.trim()] = values.join('=').trim();
      }
    });
    
    console.log("Read env vars:", Object.keys(envVars));
    return envVars;
  } catch (error) {
    console.error("Error reading .env file:", error);
    throw error;
  }
}

// Check "MNEMONIC" env variable and ensure it is set to a reasonable value
export function getMnemonic(envVar: string): string {
  console.log("getMnemonic called with:", envVar);
  
  // Read .env file directly
  const envVars = readEnvFile();
  const mnemonic = envVars[envVar]?.trim();
  console.log("Raw mnemonic value:", mnemonic);
  
  if (!mnemonic) {
    throw new Error(`Environment variable ${envVar} is not set. Available env vars: ${Object.keys(envVars).join(', ')}`); 
  }
  
  // Split into words and check length
  const words = mnemonic.split(/\s+/);
  if (words.length !== 12 && words.length !== 24) {
    throw new Error(`${envVar} must be a 12 or 24 word phrase. Found ${words.length} words.`);
  }
  
  return mnemonic;
}

export async function loadContract(contract: Contract): Promise<Uint8Array> {
  if (isLocal(contract)) {
    return loadWasmFile(contract.wasmFile);
  } else {
    return downloadWasm(contract.wasmUrl);
  }
}
