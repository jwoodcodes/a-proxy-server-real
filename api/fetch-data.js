const axios = require("axios");

// MongoDB API URL and API Key
const MONGODB_BASE_URL =
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

    // First clear the MongoDB collections
    console.log("Attempting to clear MongoDB collections...");
    try {
      const deleteEndpoint = `${MONGODB_BASE_URL}/deleteMany`;
      console.log("MongoDB endpoint:", deleteEndpoint);

      const mongoResponses = await Promise.all([
        // Clear first collection
        axios
          .post(
            deleteEndpoint,
            {
              collection: "weeklyPropData",
              database: "dailydynasties",
              dataSource: "Cluster0",
              filter: {},
            },
            {
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Request-Headers": "*",
                "api-key": API_KEY,
              },
            }
          )
          .then((response) => {
            console.log("First collection response:", response.data);
            return response;
          }),
        // Clear second collection
        axios
          .post(
            deleteEndpoint,
            {
              collection: "prizepicksWeeklyPropsData",
              database: "dailydynasties",
              dataSource: "Cluster0",
              filter: {},
            },
            {
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Request-Headers": "*",
                "api-key": API_KEY,
              },
            }
          )
          .then((response) => {
            console.log("Second collection response:", response.data);
            return response;
          }),
      ]);

      console.log(
        "MongoDB collections cleared with responses:",
        mongoResponses.map((r) => r.data)
      );
    } catch (mongoError) {
      console.error("MongoDB Error Details:", {
        message: mongoError.message,
        response: mongoError.response?.data,
        status: mongoError.response?.status,
        headers: mongoError.response?.headers,
      });
      // Continue even if MongoDB fails
    }

    // Then fetch API data (keep existing API fetch code)
    const api1Response = await axios.get(
      "https://api.dailyfantasyapi.io/v1/lines/upcoming",
      {
        headers: {
          "x-api-key": "52226ad0-6d4a-49fe-8299-4d4c10480166",
        },
        params: {
          sportsbook: "Underdog",
          league: "NFL",
        },
      }
    );

    // Log the API response for debugging
    console.log("API Response:", {
      status: api1Response.status,
      dataLength: api1Response.data ? Object.keys(api1Response.data).length : 0,
      data: api1Response.data,
    });

    const api1Data = api1Response.data;

    // Handle off-season case
    if (!api1Data || (Array.isArray(api1Data) && api1Data.length === 0)) {
      return res.status(200).json({
        message: "No NFL games available (possibly off-season)",
        lastFetchedData: [],
        timestamp: new Date().toISOString(),
        season_status: "off-season",
        mongodb_status: "collections cleared",
      });
    }

    // Send successful response with data
    res.status(200).json({
      message: "Data processed successfully",
      lastFetchedData: [api1Data],
      timestamp: new Date().toISOString(),
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
