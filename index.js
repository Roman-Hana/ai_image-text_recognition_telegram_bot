import express from 'express';
import { config } from 'dotenv';
config();

import OpenAI from "openai";
import TelegramBot from 'node-telegram-bot-api';

import { addToTable } from './googleTable.js';

const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

async function useAi(question, type) {
    const model = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const thread = await model.beta.threads.create();
    if (type === "text") {
        await model.beta.threads.messages.create(thread.id, {
            role: "user",
            content: question,
        });
    } else {
        await model.beta.threads.messages.create(thread.id, {
            role: "user",
            content: [{ type: "image_url", image_url: { url: question } }],
        });
    }

    const run = await model.beta.threads.runs.create(thread.id, {
        assistant_id: process.env.OPENAI_ASSISTANT_ID,
    });

    await checkStatus(thread.id, run.id);

    const messages = await model.beta.threads.messages.list(thread.id);

    async function checkStatus(threadId, runId) {
        let isCompleted = false;
        while (!isCompleted) {
            const runsStatus = await model.beta.threads.runs.retrieve(threadId, runId);
            if (runsStatus.status === "completed") {
                isCompleted = true;
            } else {
                await new Promise((resolve) => setTimeout(resolve, 500));
            }
        }
    }

    return messages.body.data[0].content[0].text.value;

}

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    let username = null;

    bot.getChat(chatId)
        .then(chatInfo => {
            username = chatInfo.username;
        })
        .catch(err => {
            console.error(err);
        });

    if (msg.text) {
        let response = await useAi(msg.text, 'text');
        response = JSON.parse(response);
        for (let item of response.prices) {
            // console.log(item);
            await addToTable(item, username);
        }
    }

    if (msg.photo) {
        const photo = msg.photo[msg.photo.length - 1];
        const file = await bot.getFile(photo.file_id);
        const fileUrl = `https://api.telegram.org/file/bot${token}/${file.file_path}`;

        let response = await useAi(fileUrl, 'image');
        response = JSON.parse(response);
        for (let item of response.prices) {
            // console.log(item);
            await addToTable(item, username);
        }
    }
});

const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Bot is running');
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});