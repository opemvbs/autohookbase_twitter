require('dotenv').config();

const { Autohook } = require('twitter-autohook');
const util = require('util');
const request = require('request').defaults({encoding: null});

const get = util.promisify(request.get);
const post = util.promisify(request.post);

const time = new Date().toUTCString();

const oAuthConfig = {
    token: process.env.ACCESS_TOKEN,
    token_secret: process.env.ACCESS_TOKEN_SECRET,
    consumer_key: process.env.CONSUMER_KEY,
    consumer_secret: process.env.CONSUMER_KEY_SECRET,
    env: process.env.WEBHOOK_ENV
};

async function processEvent(event) {

    if (!event.direct_message_events) {
        return;
    };

    const users = event.users;
    const usersFollowersCount = (Object.values(users)[0]).followers_count;
    const usersStatusesCount = (Object.values(users)[0]).statuses_count;

    const message = event.direct_message_events.shift();
    const senderScreenName = event.users[message.message_create.sender_id].screen_name;
    const senderAttachment = message.message_create.message_data.attachment; 
    const senderUrl = message.message_create.message_data.entities.urls.url;
    const senderMessage = message.message_create.message_data.text;
    const recipientId = message.message_create.target.recipient_id;
    const senderId = message.message_create.sender_id;
    const senderMsgId = message.id;


    if (typeof message === 'undefined' || typeof message.message_create === 'undefined') {
        return;
    };

    if (senderId === recipientId) {
        return;
    };

    // Put your own sender id to block the bot from sending DM to itself.
    // Check it in console.log(senderId);
    if (senderId === '1267122167306543104') {
        return;
    };

    // Rejecting all message from users below 100 followers and 500 tweets.
    // Put your desired keyword here, replace the [test] keyword.
    if (!(senderMessage.toLowerCase()).includes('[test]')) {
        return;
    }

    else if (!(usersFollowersCount > 100 && usersStatusesCount > 500)) {
        await rejectMessage(senderId, senderScreenName);
        return;
    }
    else;

    await markAsRead(senderMsgId, senderId).then(response => {
        //console.log(JSON.stringify(response, null, 4));
    });
    await indicateTyping(senderId).then(response => {
        //console.log(JSON.stringify(response, null, 4));
    });

    // This if else if functions will check the messages for an image.
    // If there's no image, then it will check for URL/Link.
    // If there's no URL/Link, then it will just post the text.
    if (typeof senderAttachment !== 'undefined') {

        const senderMediaUrl = senderAttachment.media.media_url;

        let image = {};
        let media = {};
        await getMedia(senderMediaUrl).then(response => {
            //console.log(JSON.stringify(response, null, 4));
            image = { 
            imageBuffer: Buffer.from(response.body)
            };
        }); 

        var imageBase64 = (image.imageBuffer).toString('base64');
        var imageBytes = Buffer.byteLength(image.imageBuffer, 'base64');
    
        await uploadMediaInit(imageBytes).then(response => {
            //console.log(JSON.stringify(response, null, 4));
            media = {
            mediaBody : response.body
            };
        });

        var mediaJson = JSON.parse(media.mediaBody);
        var mediaIdString = mediaJson.media_id_string;
            
        await uploadMediaAppend(mediaIdString, imageBase64).then(response => {
            //console.log(JSON.stringify(response, null, 4));
        });
           
        await uploadMediaFinalize(mediaIdString).then(response => {
            //console.log(JSON.stringify(response, null, 4));
        });

        const apiStatusUrl = 'https://api.twitter.com/1.1/statuses/update.json';

        const senderMediaLink = message.message_create.message_data.entities.urls[0].url;
        
        var statusWithUrl = senderMessage;
        var urlToRemove = senderMediaLink;
        var statusNoUrl = statusWithUrl.replace(urlToRemove, "")
        
        const encodeMsg = `?status=${encodeURIComponent(statusNoUrl)}`;
        const encodeImg = `&media_ids=${encodeURIComponent(mediaIdString)}`;
        
        const twtWithMedia = apiStatusUrl + encodeMsg + encodeImg;
        
        var statusMsg = twtWithMedia;
    
        await postTweet(statusMsg, senderScreenName).then(response => {
            //console.log(JSON.stringify(response, null, 4));
        })
        await replyMessage(senderId, senderScreenName, senderMessage).then(response => {
            //console.log(JSON.stringify(response, null, 4));
        });
    }

    else if (typeof senderAttachment === 'undefined' && typeof senderUrl !== 'undefined') {

        const apiStatusUrl = 'https://api.twitter.com/1.1/statuses/update.json';
        const encodeMsg = `?status=${encodeURIComponent(senderMessage.replace(senderUrl, ""))}`;
        const encodeUrl = `&attachment_url=${encodeURIComponent(senderUrl)}`;

        const twtWithUrl = apiStatusUrl + encodeMsg + encodeUrl;

        var statusMsg = twtWithUrl;

        await postTweet(statusMsg, senderScreenName);
        await replyMessage(senderId, senderScreenName, senderMessage);
    }

    else if (typeof senderAttachment === 'undefined' && typeof senderUrl === 'undefined') {

        const apiStatusUrl = 'https://api.twitter.com/1.1/statuses/update.json';
        const encodeMsg = `?status=${encodeURIComponent(senderMessage)}`;

        const twtNoUrl = apiStatusUrl + encodeMsg;

        var statusMsg = twtNoUrl;

        await postTweet(statusMsg, senderScreenName);
        await replyMessage(senderId, senderScreenName, senderMessage);
    }
};

async function markAsRead(message_id, sender_id) {

    const requestRead = {
        url: 'https://api.twitter.com/1.1/direct_messages/mark_read.json',
        oauth: oAuthConfig,
        form: {
        last_read_event_id: message_id,
        recipient_id: sender_id
        },
    };
    return await post(requestRead).then(function(response) {
        return response;
    })
    .catch(error => console.error(error));
};

async function indicateTyping(sender_id) {

    const requestIndicator = {
        url: 'https://api.twitter.com/1.1/direct_messages/indicate_typing.json',
        oauth: oAuthConfig,
        form: {
        recipient_id: sender_id
        },
    };
    return await post(requestIndicator).then(function(response) {
        return response;
    })
    .catch(error => console.error(error));
};

async function getMedia(url) {

    const getImage = {
        url: url,
        oauth: oAuthConfig
    };
    return await get(getImage).then(function(response) {
        return response; 
    })
    .catch(error => console.error(error));
};

async function uploadMediaInit(total_bytes) {
    
    const uploadImageInit = {
        url: 'https://upload.twitter.com/1.1/media/upload.json',
        oauth: oAuthConfig,
        form: {
        command: 'INIT',
        total_bytes: total_bytes,
        media_type: 'image/jpeg'
        }
    };
    return await post(uploadImageInit).then(function(response) {
        return response;
    })
    .catch(error => console.error(error));
};

async function uploadMediaAppend(media_id, media_data) {

    const uploadImageAppend = {
        url: 'https://upload.twitter.com/1.1/media/upload.json',
        oauth: oAuthConfig,
        formData: {
        command: 'APPEND',
        media_id: media_id,
        segment_index: '0',
        media_data: media_data
        }
    };
    return await post(uploadImageAppend).then(function(response) {
        return response;
    })
    .catch(error => console.error(error));
};

async function uploadMediaFinalize(media_id) {

    const uploadImageFinalize = {
        url: 'https://upload.twitter.com/1.1/media/upload.json',
        oauth: oAuthConfig,
        form: {
        command: 'FINALIZE',
        media_id: media_id
        }
    };
    return await post(uploadImageFinalize).then(function(response) {
        return response;
    })
    .catch(error => console.error(error));
};

async function replyMessage(sender_id, sender_screen_name, sender_message) {

    const requestReply = {
        url: 'https://api.twitter.com/1.1/direct_messages/events/new.json',
        oauth: oAuthConfig,
        json: {
        event: {
            type: 'message_create',
            message_create: {
            target: {
                recipient_id: sender_id
            },
            message_data: {
                text: `Hi @${sender_screen_name}! 👋. Your message will be tweeted. Please wait.`
            },
            },
        },
        },
    };
    console.log(`[${time}] [CONSOLE] User @${sender_screen_name} says: ${sender_message}`);
    return await post(requestReply).then(function(response) {
        return response;
    })
    .catch(error => console.error(error));
};

async function rejectMessage(sender_id, sender_screen_name) {

    const requestReject = {
        url: 'https://api.twitter.com/1.1/direct_messages/events/new.json',
        oauth: oAuthConfig,
        json: {
        event: {
            type: 'message_create',
            message_create: {
            target: {
                recipient_id: sender_id
            },
            message_data: {
                text: `Hi @${sender_screen_name}! 👋. You should have atleast 100 followers, and 500 tweets in order to send a message to this base.`
            },
            },
        },
        },
    };
    console.log(`[${time}] [CONSOLE] Rejected user @${sender_screen_name}'s message`);
    return await post(requestReject).then(function(response) {
        return response;
    })
    .catch(error => console.error(error));
};

async function postTweet(url, sender_screen_name) {

    const sendTwt = {
        url: url,
        oauth: oAuthConfig,
    };
    console.log(`[${time}] [CONSOLE] Tweeted user @${sender_screen_name}'s message`);
    return await post(sendTwt).then(function(response) {
        return response;
    })
    .catch(error => console.error(error));
};

function sleep(ms) {

    return new Promise(resolve => {
        setTimeout(resolve, ms)
    })
};

(async start => {

    try {
        const webhook = new Autohook(oAuthConfig);
        await webhook.removeWebhooks();
        await webhook.start();

        webhook.on('event', async event  => {
            if (event.direct_message_events) {
                await processEvent(event);
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