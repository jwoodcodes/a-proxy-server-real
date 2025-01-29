const axios = require("axios");

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

    // Fetch data from the first API
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
    const api1Data = api1Response.data;
    console.log("API 1 Data received");

    // Send successful response
    res.status(200).json({
      message: "Data processed successfully",
      lastFetchedData: [api1Data],
    });
  } catch (error) {
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      error: "Error fetching data",
      details: error.message,
    });
  }
};
