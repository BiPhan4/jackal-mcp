# Weather MCP Server

A Model Context Protocol (MCP) server implementation that provides weather information and token management capabilities.

## Features

- Weather alerts by state
- Weather forecasts by location (latitude/longitude)
- Token management (send tokens between addresses)

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the root directory with your configuration:
```
JKLTESTSEED=your_seed_phrase_here
```

3. Build the project:
```bash
npm run build
```

4. Run the server:
```bash
node build/index.js
```

## Available Tools

### send-tokens
Send tokens to a specified address:
- `recipient`: The recipient's address
- `amount`: Amount of tokens to send (without denomination)

### get-alerts
Get weather alerts for a US state:
- `state`: Two-letter state code (e.g., CA, NY)

### get-forecast
Get weather forecast for a location:
- `latitude`: Latitude of the location (-90 to 90)
- `longitude`: Longitude of the location (-180 to 180)

## Development

This project uses TypeScript and the Model Context Protocol SDK. To contribute:

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to your branch
5. Create a Pull Request 