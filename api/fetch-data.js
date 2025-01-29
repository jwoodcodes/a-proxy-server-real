const express = require("express");
const axios = require("axios");
const cors = require("cors");

// MongoDB API URL and API Key
const MONGODB_API_URL =
  "https://data.mongodb-api.com/app/data-pqtmg/endpoint/data/v1/action";
const API_KEY =
  "ke8FM7cCVbbhpaCbxB7kkbqR5X6YmQp4cMMmocbCAvozdbhMbZaJCLmHaLLGGt4M";

// Create handler for Vercel serverless function

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

  // Only allow POST requests
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    console.log("Scheduled event triggered");

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
    console.log("API 1 Data:", api1Data);

    // Fetch data from the second API
    const api2Response = await axios.get(
      "https://api.dailyfantasyapi.io/v1/lines/upcoming",
      {
        headers: {
          "x-api-key": "52226ad0-6d4a-49fe-8299-4d4c10480166",
        },
        params: {
          sportsbook: "PrizePicks",
          league: "NFL",
        },
      }
    );
    const api2Data = api2Response.data;
    console.log("API 2 Data:", api2Data);

    // Delete existing data in MongoDB collections
    await axios.post(
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
    );

    // Insert new data into MongoDB
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

    // Delete existing data in the second collection
    await axios.post(
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
    );

    // Insert new data into the second collection
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

    res.status(200).json({
      message: "Data processed successfully",
      lastFetchedData: [...api1Data, ...api2Data],
    });
  } catch (error) {
    console.error("Error fetching data:", error);
    res
      .status(500)
      .json({ error: "Error fetching data", details: error.message });
  }
};
