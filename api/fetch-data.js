const axios = require("axios");

// MongoDB API URL and API Key
const MONGODB_API_URL =
  "https://data.mongodb-api.com/app/data-pqtmg/endpoint/data/v1/action";
const API_KEY =
  "ke8FM7cCVbbhpaCbxB7kkbqR5X6YmQp4cMMmocbCAvozdbhMbZaJCLmHaLLGGt4M";

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Handle OPTIONS request for CORS
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  try {
    console.log("Request received at /api/fetch-data");

    // Fetch data from both APIs
    const [api1Response, api2Response] = await Promise.all([
      axios.get("https://api.dailyfantasyapi.io/v1/lines/upcoming", {
        headers: { "x-api-key": "52226ad0-6d4a-49fe-8299-4d4c10480166" },
        params: { sportsbook: "Underdog", league: "NFL" },
      }),
      axios.get("https://api.dailyfantasyapi.io/v1/lines/upcoming", {
        headers: { "x-api-key": "52226ad0-6d4a-49fe-8299-4d4c10480166" },
        params: { sportsbook: "PrizePicks", league: "NFL" },
      }),
    ]);

    const api1Data = api1Response.data;
    const api2Data = api2Response.data;

    // Even if no new data, clear old data from MongoDB
    await Promise.all([
      // Clear first collection
      axios.post(
        MONGODB_API_URL,
        {
          Collection: "weeklyPropData",
          Database: "dailydynasties",
          Action: "deleteMany",
          filter: {},
        },
        {
          headers: {
            "Content-Type": "application/json",
            "api-key": API_KEY,
          },
        }
      ),
      // Clear second collection
      axios.post(
        MONGODB_API_URL,
        {
          Collection: "prizepicksWeeklyPropsData",
          Database: "dailydynasties",
          Action: "deleteMany",
          filter: {},
        },
        {
          headers: {
            "Content-Type": "application/json",
            "api-key": API_KEY,
          },
        }
      ),
    ]);

    // If we have new data, insert it
    if (api1Data && api1Data.length > 0) {
      await axios.post(
        MONGODB_API_URL,
        {
          data: api1Data,
          Collection: "weeklyPropData",
          Database: "dailydynasties",
          Action: "insertMany",
        },
        {
          headers: {
            "Content-Type": "application/json",
            "api-key": API_KEY,
          },
        }
      );
    }

    if (api2Data && api2Data.length > 0) {
      await axios.post(
        MONGODB_API_URL,
        {
          data: api2Data,
          Collection: "prizepicksWeeklyPropsData",
          Database: "dailydynasties",
          Action: "insertMany",
        },
        {
          headers: {
            "Content-Type": "application/json",
            "api-key": API_KEY,
          },
        }
      );
    }

    // Send response
    res.status(200).json({
      message:
        api1Data.length === 0
          ? "No NFL games available (possibly off-season)"
          : "Data processed successfully",
      lastFetchedData: [api1Data, api2Data],
      timestamp: new Date().toISOString(),
      season_status: api1Data.length === 0 ? "off-season" : "in-season",
      mongodb_status: "collections cleared",
    });
  } catch (error) {
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
      response: error.response?.data,
    });

    res.status(500).json({
      error: "Error fetching data",
      details: error.message,
      timestamp: new Date().toISOString(),
    });
  }
};
