import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { google } from "googleapis";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Google Sheets API Setup
  const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID || "12yFMH9GrrlBdqo9d9s8VYbsKQSPsjlnyDxg49sfaAH8";
  const SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY;

  if (!SERVICE_ACCOUNT_EMAIL || !PRIVATE_KEY) {
    console.error("GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_PRIVATE_KEY not configured.");
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: SERVICE_ACCOUNT_EMAIL,
      private_key: PRIVATE_KEY?.trim().replace(/^["']|["']$/g, "").replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const sheets = google.sheets({ version: "v4", auth });

  // Helper to ensure headers exist
  async function ensureHeaders() {
    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: "Sheet1!A1:I1",
      });

      const expectedHeaders = ["Registration Date", "Mandal", "Name", "Contact", "Arrival Date", "Total Guests", "Breakfast", "Lunch", "Dinner"];
      const currentFirstRow = response.data.values ? response.data.values[0] : [];

      // If the first cell is not our header, we need to add headers
      if (currentFirstRow[0] !== expectedHeaders[0]) {
        if (!response.data.values || response.data.values.length === 0) {
          // Sheet is completely empty, just update the first row
          await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: "Sheet1!A1:I1",
            valueInputOption: "USER_ENTERED",
            requestBody: {
              values: [expectedHeaders],
            },
          });
        } else {
          // Sheet has data but row 1 is not headers. Insert a new row at the top.
          await sheets.spreadsheets.batchUpdate({
            spreadsheetId: SPREADSHEET_ID,
            requestBody: {
              requests: [
                {
                  insertDimension: {
                    range: {
                      sheetId: 0, // Usually the first sheet
                      dimension: "ROWS",
                      startIndex: 0,
                      endIndex: 1,
                    },
                    inheritFromBefore: false,
                  },
                },
                {
                  updateCells: {
                    rows: [
                      {
                        values: expectedHeaders.map(header => ({
                          userEnteredValue: { stringValue: header },
                          userEnteredFormat: {
                            textFormat: { bold: true },
                            backgroundColor: { red: 0.95, green: 0.95, blue: 0.95 }
                          }
                        }))
                      }
                    ],
                    fields: "userEnteredValue,userEnteredFormat",
                    range: {
                      sheetId: 0,
                      startRowIndex: 0,
                      endRowIndex: 1,
                      startColumnIndex: 0,
                      endColumnIndex: 9
                    }
                  }
                }
              ],
            },
          });
        }
      }
    } catch (error) {
      console.error("Error ensuring headers:", error);
    }
  }

  // API Route for registration (Write to Google Sheets)
  app.post("/api/register", async (req, res) => {
    try {
      if (!SERVICE_ACCOUNT_EMAIL || !PRIVATE_KEY) {
        return res.status(500).json({ error: "Google Service Account credentials (EMAIL/KEY) are not configured in Secrets." });
      }
      const { mandal, name, phone, arrivalDate, guestCount, breakfastCount, lunchCount, dinnerCount, createdAt } = req.body;

      if (!SPREADSHEET_ID) {
        return res.status(500).json({ error: "GOOGLE_SHEET_ID not configured." });
      }

      await ensureHeaders();

      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: "Sheet1!A:I",
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [
            [
              createdAt,
              mandal,
              name,
              phone,
              arrivalDate,
              guestCount,
              breakfastCount,
              lunchCount,
              dinnerCount
            ],
          ],
        },
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error("Google Sheets Write Error:", error);
      const errorMessage = error.response?.data?.error?.message || error.message || "Failed to write to Google Sheets";
      res.status(500).json({ error: errorMessage });
    }
  });

  // API Route to fetch all registrations from Google Sheets
  app.get("/api/registrations", async (req, res) => {
    try {
      if (!SERVICE_ACCOUNT_EMAIL || !PRIVATE_KEY) {
        return res.status(500).json({ error: "Google Service Account credentials (EMAIL/KEY) are not configured in Secrets." });
      }
      if (!SPREADSHEET_ID) {
        return res.status(500).json({ error: "GOOGLE_SHEET_ID not configured." });
      }

      await ensureHeaders();

      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: "Sheet1!A:I",
      });

      const rows = response.data.values || [];
      
      // If only headers exist or sheet is empty
      if (rows.length <= 1) {
        return res.json([]);
      }

      // Map rows to objects, skipping the header row
      const registrations = rows
        .slice(1) 
        .map((row, index) => {
          if (!row || row.length === 0) return null;
          
          return {
            id: (index + 1).toString(), // This 'id' will be used to calculate rowIndex = id + 1
            createdAt: row[0] || "",
            mandal: row[1] || "",
            name: row[2] || "",
            phone: row[3] || "",
            arrivalDate: row[4] || "",
            guestCount: parseInt(row[5]) || 0,
            breakfastCount: parseInt(row[6]) || 0,
            lunchCount: parseInt(row[7]) || 0,
            dinnerCount: parseInt(row[8]) || 0,
          };
        })
        .filter(reg => reg !== null)
        .reverse(); // Newest first

      res.json(registrations);
    } catch (error: any) {
      console.error("Google Sheets Read Error:", error);
      const errorMessage = error.response?.data?.error?.message || error.message || "Failed to read from Google Sheets";
      res.status(500).json({ error: errorMessage });
    }
  });

  // API Route to delete a registration (Clear row in Google Sheets)
  app.delete("/api/registrations/:id", async (req, res) => {
    try {
      if (!SERVICE_ACCOUNT_EMAIL || !PRIVATE_KEY) {
        return res.status(500).json({ error: "Google Service Account credentials (EMAIL/KEY) are not configured in Secrets." });
      }
      const id = parseInt(req.params.id);
      if (!SPREADSHEET_ID) return res.status(500).json({ error: "Not configured" });

      // id is the original row index from the registrations array (which was index + 1 after slice)
      // So the real row index in Sheets is id + 1 (since Sheets is 1-indexed and id 1 is row 2)
      const rowIndex = id + 1; 
      await sheets.spreadsheets.values.clear({
        spreadsheetId: SPREADSHEET_ID,
        range: `Sheet1!A${rowIndex}:I${rowIndex}`,
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error("Google Sheets Delete Error:", error);
      const errorMessage = error.response?.data?.error?.message || error.message || "Failed to delete from Google Sheets";
      res.status(500).json({ error: errorMessage });
    }
  });

  // API Route to update a registration in Google Sheets
  app.put("/api/registrations/:id", async (req, res) => {
    try {
      if (!SERVICE_ACCOUNT_EMAIL || !PRIVATE_KEY) {
        return res.status(500).json({ error: "Google Service Account credentials (EMAIL/KEY) are not configured in Secrets." });
      }
      const id = parseInt(req.params.id);
      const { mandal, name, phone, arrivalDate, guestCount, breakfastCount, lunchCount, dinnerCount, createdAt } = req.body;
      if (!SPREADSHEET_ID) return res.status(500).json({ error: "Not configured" });

      const rowIndex = id + 1; 
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `Sheet1!A${rowIndex}:I${rowIndex}`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [
            [
              createdAt,
              mandal,
              name,
              phone,
              arrivalDate,
              guestCount,
              breakfastCount,
              lunchCount,
              dinnerCount
            ],
          ],
        },
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error("Google Sheets Update Error:", error);
      const errorMessage = error.response?.data?.error?.message || error.message || "Failed to update Google Sheets";
      res.status(500).json({ error: errorMessage });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
