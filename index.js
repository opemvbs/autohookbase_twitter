require('dotenv').config();

const { Autohook } = require('twitter-autohook');
const { RateLimitError } = require('twitter-autohook/errors');
const util = require('util');
const request = require('request');

const post = util.promisify(request.post);

const oAuthConfig = {
    token: process.env.ACCESS_TOKEN,
    token_secret: process.env.ACCESS_TOKEN_SECRET,
    consumer_key: process.env.CONSUMER_KEY,
    consumer_secret: process.env.CONSUMER_KEY_SECRET,
    env: process.env.WEBHOOK_ENV
};

async function markAsRead(messageId, senderId, auth) {

    const requestRead = {
        url: 'https://api.twitter.com/1.1/direct_messages/mark_read.json',
        form: {
        last_read_event_id: messageId,
        recipient_id: senderId,
        },
        oauth: auth,
    };

await post(requestRead);
};

async function indicateTyping(senderId, auth) {

    const requestIndicator = {
        url: 'https://api.twitter.com/1.1/direct_messages/indicate_typing.json',
        form: {
        recipient_id: senderId,
        },
        oauth: auth,
    };

await post(requestIndicator);
};

async function replyMessage(event) {

    if (!event.direct_message_events) {
        return;
    };

    const message = event.direct_message_events[0];

    if (typeof message === 'undefined' || typeof message.message_create === 'undefined') {
        return;
    };

    if (message.message_create.sender_id === message.message_create.target.recipient_id) {
        return;
    };

    if (message.message_create.sender_id === '1267122167306543104') {
        return;
    };

    await markAsRead(message.message_create.id, message.message_create.sender_id, oAuthConfig);
    await indicateTyping(message.message_create.sender_id, oAuthConfig);
    
    const senderScreenName = event.users[message.message_create.sender_id].screen_name;

    const replyMessage = {
        url: 'https://api.twitter.com/1.1/direct_messages/events/new.json',
        oauth: oAuthConfig,
        json: {
        event: {
            type: 'message_create',
            message_create: {
            target: {
                recipient_id: message.message_create.sender_id,
            },
            message_data: {
                text: `Hi @${senderScreenName}! 👋. Your message will be tweeted. Please wait.`,
            },
            },
        },
        },
    };

    await post(replyMessage);
    console.log(`[CONSOLE] User @${senderScreenName} says: ${message.message_create.message_data.text}`);
};

async function postTweet(event) {

    if (!event.direct_message_events) {
        return;
    };

    const message = event.direct_message_events.shift();

    if (typeof message === 'undefined' || typeof message.message_create === 'undefined') {
        return;
    };

    if (message.message_create.sender_id === message.message_create.target.recipient_id) {
        return;
    };

    if (message.message_create.sender_id === '1267122167306543104') {
        return;
    };

    const senderScreenName = event.users[message.message_create.sender_id].screen_name
    const senderMessage = message.message_create.message_data.text;
    const senderUrl = message.message_create.message_data.entities.urls.url;


    const apiStatusUrl = 'https://api.twitter.com/1.1/statuses/update.json?';
    const encodeMsg = `status=${encodeURIComponent(senderMessage.trim())}`;
    const encodeUrl = `&attachment_url=${encodeURIComponent(senderUrl)}`;

    const twtNoUrl = apiStatusUrl + encodeMsg;
    const twtWithUrl = twtNoUrl + encodeUrl;

    var statusMsg = (senderUrl !== 'undefined') ? twtNoUrl : twtWithUrl;
    

    const sendTwt = {
        url: statusMsg,
        oauth: oAuthConfig,
    };
    await post(sendTwt);

    console.log(sendTwt.url);
    console.log(`[CONSOLE] Tweeted user @${senderScreenName}'s message.`);
};

function sleep(ms){
    return new Promise(resolve=>{
        setTimeout(resolve,ms)
    })
};

(async start => {

    try {
        const webhook = new Autohook(oAuthConfig);
        await webhook.removeWebhooks();
        await webhook.start();

        webhook.on('event', async event  => {
            if (event.direct_message_events) {
                await replyMessage(event);
                await postTweet(event);
            }
        });

        await webhook.subscribe({
            oauth_token: process.env.ACCESS_TOKEN,
            oauth_token_secret: process.env.ACCESS_TOKEN_SECRET
        });
    }
    
    catch (e) {
        console.error(e);
        if (e.name === 'RateLimitError') {
            await sleep(e.resetAt - new Date().getTime());
            process.exit(1);
        }

        else 
        process.exit(1);
    }
}) ();