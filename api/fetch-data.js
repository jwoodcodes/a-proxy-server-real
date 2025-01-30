const axios = require("axios");

// MongoDB API URL and API Key
const MONGODB_BASE_URL =
  "https://data.mongodb-api.com/app/data-pqtmg/endpoint/data/v1";
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

    // Initialize mongoResponses variable in outer scope
    let mongoResponses = [];
    let mongoStatus = "not attempted";

    // First clear the MongoDB collections
    console.log("Attempting to clear MongoDB collections...");
    try {
      const deleteEndpoint = `${MONGODB_BASE_URL}/action/deleteMany`;
      console.log("Attempting MongoDB delete with payload:", {
        dataSource: "DailyDynasties",
        database: "dailydynasties",
        collection: "weeklyPropData",
      });

      mongoResponses = await Promise.all([
        axios
          .post(
            deleteEndpoint,
            JSON.stringify({
              dataSource: "DailyDynasties",
              database: "dailydynasties",
              collection: "weeklyPropData",
              filter: {},
            }),
            {
              headers: {
                "Content-Type": "application/json",
                "api-key": API_KEY,
              },
            }
          )
          .then((response) => {
            console.log("First collection delete response:", response.data);
            return response;
          })
          .catch((error) => {
            console.error("First collection delete error:", {
              status: error.response?.status,
              data: error.response?.data,
              message: error.message,
              request: error.config?.data,
            });
            throw error;
          }),
        // Second collection
        axios
          .post(
            deleteEndpoint,
            JSON.stringify({
              dataSource: "DailyDynasties",
              database: "dailydynasties",
              collection: "prizepicksWeeklyPropsData",
              filter: {},
            }),
            {
              headers: {
                "Content-Type": "application/json",
                "api-key": API_KEY,
              },
            }
          )
          .then((response) => {
            console.log("Second collection response:", response.data);
            return response;
          })
          .catch((error) => {
            console.error("Second collection delete error:", {
              status: error.response?.status,
              data: error.response?.data,
              message: error.message,
              request: error.config?.data,
            });
            throw error;
          }),
      ]);

      mongoStatus = "collections cleared";
      console.log(
        "MongoDB collections cleared with responses:",
        mongoResponses.map((r) => r.data)
      );
    } catch (mongoError) {
      console.error("MongoDB Error Full Details:", mongoError);
      mongoStatus = "error clearing collections";
      // Continue even if MongoDB fails
    }

    // Then fetch data from both APIs
    const [api1Response, api2Response] = await Promise.all([
      axios.get("https://api.dailyfantasyapi.io/v1/lines/upcoming", {
        headers: {
          "x-api-key": "52226ad0-6d4a-49fe-8299-4d4c10480166",
        },
        params: {
          sportsbook: "Underdog",
          league: "NFL",
        },
      }),
      axios.get("https://api.dailyfantasyapi.io/v1/lines/upcoming", {
        headers: {
          "x-api-key": "52226ad0-6d4a-49fe-8299-4d4c10480166",
        },
        params: {
          sportsbook: "PrizePicks",
          league: "NFL",
        },
      }),
    ]);

    const api1Data = api1Response.data;
    const api2Data = api2Response.data;

    // Log API responses for debugging
    console.log("API Responses:", {
      underdog: { length: api1Data?.length || 0 },
      prizepicks: { length: api2Data?.length || 0 },
    });

    // Insert new data if available
    let insertResponses = [];
    if (api1Data?.length > 0 || api2Data?.length > 0) {
      try {
        const insertEndpoint = `${MONGODB_BASE_URL}/action/insertMany`;
        const insertPromises = [];

        if (api1Data?.length > 0) {
          insertPromises.push(
            axios.post(
              insertEndpoint,
              JSON.stringify({
                dataSource: "DailyDynasties",
                database: "dailydynasties",
                collection: "weeklyPropData",
                documents: api1Data,
              }),
              {
                headers: {
                  "Content-Type": "application/json",
                  "api-key": API_KEY,
                },
              }
            )
          );
        }

        if (api2Data?.length > 0) {
          insertPromises.push(
            axios.post(
              insertEndpoint,
              JSON.stringify({
                dataSource: "DailyDynasties",
                database: "dailydynasties",
                collection: "prizepicksWeeklyPropsData",
                documents: api2Data,
              }),
              {
                headers: {
                  "Content-Type": "application/json",
                  "api-key": API_KEY,
                },
              }
            )
          );
        }

        if (insertPromises.length > 0) {
          insertResponses = await Promise.all(insertPromises);
          mongoStatus = "collections cleared and data inserted";
          console.log(
            "MongoDB insert responses:",
            insertResponses.map((r) => r.data)
          );
        }
      } catch (insertError) {
        console.error("MongoDB Insert Error:", insertError);
        mongoStatus = "error inserting new data";
      }
    }

    // Handle off-season case
    if (!api1Data || (Array.isArray(api1Data) && api1Data.length === 0)) {
      return res.status(200).json({
        message: "No NFL games available (possibly off-season)",
        lastFetchedData: [],
        timestamp: new Date().toISOString(),
        season_status: "off-season",
        mongodb_status: mongoStatus,
        mongodb_details: {
          deletes: mongoResponses.length
            ? mongoResponses.map((r) => ({
                collection: JSON.parse(r.config.data).collection,
                deletedCount: r.data.deletedCount,
              }))
            : [],
          inserts: insertResponses.length
            ? insertResponses.map((r) => ({
                collection: JSON.parse(r.config.data).collection,
                insertedCount: r.data.insertedCount,
              }))
            : [],
        },
      });
    }

    // Send successful response with data
    res.status(200).json({
      message: "Data processed successfully",
      lastFetchedData: [api1Data, api2Data],
      timestamp: new Date().toISOString(),
      mongodb_status: mongoStatus,
      mongodb_details: {
        deletes: mongoResponses.length
          ? mongoResponses.map((r) => ({
              collection: JSON.parse(r.config.data).collection,
              deletedCount: r.data.deletedCount,
            }))
          : [],
        inserts: insertResponses.length
          ? insertResponses.map((r) => ({
              collection: JSON.parse(r.config.data).collection,
              insertedCount: r.data.insertedCount,
            }))
          : [],
      },
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
