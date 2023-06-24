import * as dotenv from 'dotenv';
import { Telegraf } from 'telegraf';
import axios from 'axios';

dotenv.config();
const bot = new Telegraf(process.env.BOT_TOKEN);
let animeData = {};
let recentPagenumber;
let topAiringData;

bot.start(ctx => {
    let message = ` Welcome!!\nHello, ${ctx.update.message.from.first_name}\nType -help to know more`;
    ctx.reply(message);
})

bot.help(ctx => {
    let message = 'We are still under development process\nWe will be up soon\nThanks for visiting';
    ctx.reply(message);
})

bot.inlineQuery(/.+/, async (ctx) => {
    let query = ctx.update.inline_query.query;
    console.log(query);
    const url = `https://api.consumet.org/anime/zoro/${query}`;
    await axios.get(url)
        .then(res => {
            let data = res.data.results;
            let results = data.map((item, index) => {
                return {
                    type: 'article',
                    id: index,
                    thumb_url: item.image,
                    thumb_width: 280,
                    thumb_height: 400,
                    title: item.title,
                    description: item.type,
                    input_message_content: {
                        message_text: `/getInfo : ${item.id}`
                    }
                }
            });
            console.log(results.length);
            if (results.length === 0)
                results = [{
                    type: 'article',
                    id: '1',
                    title: "NO RESULTS!!",
                    input_message_content: {
                        message_text: `NO RESLUTS!!`,
                    }
                }]
            else
                ctx.answerInlineQuery(results);
        })
        .catch(e => {
            console.log(e);
            ctx.reply("No Results found")
        })
})

bot.command('/getInfo', async (ctx) => {
    ctx.deleteMessage();
    let id = ctx.update.message.text.slice(11);
    const url = `https://api.consumet.org/anime/zoro/info?id=${id}`;
    let data;
    await axios.get(url)
        .then(res => {
            data = res.data;
        })
        .catch(e => {
            console.log("ERROR")
        })
    animeData = data;
    animeData.apiname = 'zoro'
    ctx.replyWithPhoto(data.image, {
        caption: `<b>Title</b> : <i>${data.title}</i>\n<b>Type</b> : <i>${data.type}</i>\n<b>Sub/Dub</b> : <i>${data.subOrDub}</i>\n<b>Total Episodes</b> : <i>${data.totalEpisodes}</i>\n\n`,
        parse_mode: 'HTML',
        reply_markup: {
            inline_keyboard: [
                [
                    {
                        text: "Read Description",
                        callback_data: "readmore"
                    }
                ],
                [
                    {
                        text: `Watch ${data.title}`,
                        url: `${data.url}`
                    }
                ]
            ]
        }
    });
})

bot.action("readmore", ctx => {
    ctx.answerCbQuery();
    let watchurl = (animeData.apiname === 'zoro') ? animeData.url : ('https://www1.gogoanime.bid/' + animeData.url)
    ctx.reply(`<b>Description</b> : \n<i>${animeData.description}</i>`,
        {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: `Watch ${animeData.title}`,
                            url: `${watchurl}`
                        }
                    ]
                ]
            }
        });
})

bot.command("/recent", async (ctx) => {
    recentPagenumber = 1;
    let data = await getRecentData(recentPagenumber);
    ctx.reply(data.results, {
        parse_mode: 'HTML',
        reply_markup: {
            inline_keyboard: [
                data.buttons
            ],
        },
        disable_web_page_preview: true,
    });
});

async function getRecentData(pageNumber) {
    let buttons = [];
    let buttonCount = 0;
    let results = `<b>Recently released episodes\nPage : ${pageNumber}\n\n</b>`;
    await axios.get("https://api.consumet.org/anime/gogoanime/recent-episodes", { params: { page: pageNumber } })
        .then(res => {
            let data = res.data.results;
            for (let i = 0; i < data.length; i++) {
                results += `<i>${(res.data.currentPage - 1) * 20 + i + 1}. ${data[i].title}\n\t\   <a href="${data[i].url}"> Episode : ${data[i].episodeNumber}</a>\n</i>`;
            }
            if (pageNumber > 1)
                buttons[buttonCount++] = { text: `<- Previous Page`, callback_data: 'previousPage' };
            if (res.data.hasNextPage && recentPagenumber < 5)
                buttons[buttonCount++] = { text: 'Next Page ->', callback_data: 'nextPage' };
        })
        .catch(e => {
            results = `Sorry something went wrong!!\nPlease try again later`
            console.log('ERROR : ' + e.message);
        })
    return { results: results, buttons: buttons };
}

bot.action("nextPage", async ctx => {
    let data = await getRecentData(++recentPagenumber);
    ctx.editMessageText(data.results, {
        parse_mode: 'HTML',
        reply_markup: {
            inline_keyboard: [
                data.buttons
            ]
        },
        disable_web_page_preview: true,
    });
});

bot.action("previousPage", async ctx => {
    let data = await getRecentData(--recentPagenumber);
    ctx.editMessageText(data.results, {
        parse_mode: 'HTML',
        reply_markup: {
            inline_keyboard: [
                data.buttons
            ]
        },
        disable_web_page_preview: true,
    })
});

bot.command("/topairing", async (ctx) => {
    let buttons = []
    await axios.get("https://api.consumet.org/anime/gogoanime/top-airing", { params: { page: 1 } })
        .then(res => {
            let data = res.data.results;
            topAiringData = data.map((item) => { return { id: item.id } });
            for (let i = 0; i < data.length; i++) {
                buttons[i] = [{
                    text: `${i + 1}.  ${data[i].title.length > 40 ? data[i].title.slice(0, 40) + '...' : data[i].title}`,
                    callback_data: `topairing${i}`
                }]
            }
        })
        .catch(e => {
            console.log('error : ' + e.message);
        })
    ctx.reply('<i><b>TOP AIRING ANIMES</b></i>', {
        parse_mode: 'HTML',
        reply_markup: {
            inline_keyboard:
                buttons
        }
    });
});

bot.action(/topairing[0-9]/, async (ctx) => {
    let data;
    let id = '';
    if (topAiringData !== undefined)
        id = topAiringData[parseInt(ctx.match[0].slice(9))].id;
    await axios.get(`https://api.consumet.org/anime/gogoanime/info/${id}`)
        .then(res => {
            data = res.data;
            animeData = data;
            animeData.apiname = 'gogo'
            ctx.replyWithPhoto(data.image, {
                caption: `<b>Title</b> : <i>${data.title}</i>\n<b>Genres</b> : <i>${data.genres.join(',')}</i>\n<b>Sub/Dub</b> : <i>${data.subOrDub}</i>\n<b>Total Episodes</b> : <i>${data.totalEpisodes}</i>\n<b>Status : </b><i>${data.status}</i>\n`,
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text: "Read Description",
                                callback_data: "readmore"
                            }
                        ],
                        [
                            {
                                text: `Watch ${data.title}`,
                                url: `https://www1.gogoanime.bid/${data.url}`
                            }
                        ]
                    ]
                }
            });
        })
        .catch(e => {
            console.log('error : ' + e.message)
            ctx.reply('Response terminated!!')
        })
    ctx.answerCbQuery();
})

bot.launch();

/*
    // FOR AWS LAMBDA DEPLOYMENT //

export const handler = async (event, context, callback) => {
    const tmp = JSON.parse(event.body);
    bot.handleUpdate(tmp);
    return callback(null, {
        statusCode: 200,
        body: '',
    });
};

*/