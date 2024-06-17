import { config } from 'dotenv';
config();

import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';

const serviceAccountAuth = new JWT({
    email: process.env.SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
    ],
});

const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);
await doc.loadInfo();

const sheet = doc.sheetsByTitle["table"];

export async function addToTable(item, username) {
    await sheet.addRow({ 'Point': item.point, 'Price': item.price, 'Username': username, 'Commodity': item.commodity, 'Date': item.date, 'CompanyName': item.companyName, 'Telephone': item.telephone });
}