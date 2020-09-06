/*jshint esversion: 9*/

require('dotenv').config();

const { Autohook }  = require('twitter-autohook');
const util          = require('util');
const request       = require('request').defaults({encoding: null});

const get           = util.promisify(request.get);
const post          = util.promisify(request.post);

// NOTE: CTRL + F and search for [CHANGEABLE] and change the things as you like.

// This is where your config is saved.
const oAuthConfig   = {
    token           : process.env.ACCESS_TOKEN,
    token_secret    : process.env.ACCESS_TOKEN_SECRET,
    consumer_key    : process.env.CONSUMER_KEY,
    consumer_secret : process.env.CONSUMER_KEY_SECRET,
    env             : process.env.WEBHOOK_ENV
};

// This is where the event processing (posting tweet, replying direct message) happens.
let messageVar  = {};
let usersVar    = {};
async function receiveDMEvent(event) {

    async function getDirectMessage() {

        if (!event.direct_message_events) {
            return;
        }
    
        // Count the users followers and tweets.
        const users           = Object.values(event.users);
        usersVar = {
            usersFollowersCount : (Object.values(users)[0]).followers_count,
            usersStatusesCount  : (Object.values(users)[0]).statuses_count
        };

        // Assigns the important constant variables.
        var message           = event.direct_message_events.shift();
        messageVar = {
            senderScreenName  : event.users[message.message_create.sender_id].screen_name,
            senderAttachment  : message.message_create.message_data.attachment,
            senderUrl         : message.message_create.message_data.entities.urls.url,
            senderMessage     : message.message_create.message_data.text,
            recipientId       : message.message_create.target.recipient_id,
            senderId          : message.message_create.sender_id,
            senderMsgId       : message.id,
        };
 
        // Check to see if the message is undefined/error.
        if (typeof message === 'undefined' || typeof message.message_create === 'undefined') {
            return;
        }
    
        // Check to see if the sender is the same as the recipient of the message.
        if (messageVar.senderId === messageVar.recipientId) {
            return;
        }
    
        // [CHANGEABLE] Put your own sender id to block the bot from sending DM to itself.
        // Check it in console.log(senderId);
        if (messageVar.senderId === '1267122167306543104') {
            return;
        }
    
        
        // [CHANGEABLE] Put your desired keyword here, replace the /tst/ keyword.
        if (!((messageVar.senderMessage).toLowerCase()).includes('/tst/')) {
            return;
        }

        // [CHANGEABLE] Rejects all messages from users below 100 followers and 500 tweets.
        else if (!(usersVar.usersFollowersCount > 100 && usersVar.usersStatusesCount > 300)) {
            await rejectMessage(messageVar.senderId, messageVar.senderScreenName);
            return;
        }
        else
    
        // This if else if functions will check the messages for an image.
        // If there's no image, then it will check for URL/Link.
        // If there's no URL/Link, then it will just post the text.
        if (typeof messageVar.senderAttachment !== 'undefined') {
    
            try {
    
                const senderMediaUrl = messageVar.senderAttachment.media.media_url;
    
                let image = {};
                await getMedia(senderMediaUrl).then(response => {
                    //console.log(JSON.stringify(response, null, 4));
                    image = { 
                    imageBuffer: Buffer.from(response.body)
                    };
                }); 
                var imageBase64 = (image.imageBuffer).toString('base64');
                var imageBytes = Buffer.byteLength(image.imageBuffer, 'base64');
        
                let media = {};
                await uploadMediaInit(imageBytes).then(response => {
                    //console.log(JSON.stringify(response, null, 4));
                    media = {
                    mediaBody : response.body,
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
        
                const senderMediaLink = message.message_create.message_data.entities.urls[0].url;
                
                var statusWithUrl = messageVar.senderMessage;
                var urlToRemove = senderMediaLink;
                var statusNoUrl = statusWithUrl.replace(urlToRemove, "");
                
                const encodeMsg = statusNoUrl;
                const encodeImg = mediaIdString;

                await postTweet(messageVar.senderScreenName, encodeMsg, undefined, encodeImg);
            }
    
            catch (e) {
                console.error(e);
            }
        }
    
        else if (typeof senderAttachment === 'undefined' && typeof senderUrl !== 'undefined') {
    
            try {
    
                const encodeMsg = messageVar.senderMessage;
                const encodeUrl = messageVar.senderUrl;

                await postTweet(messageVar.senderScreenName, encodeMsg, encodeUrl, undefined);
            }
            
            catch (e) {
                console.error(e);
            }
        }
    
        else if (typeof senderAttachment === 'undefined' && typeof senderUrl === 'undefined') {
    
            try {
    
                const encodeMsg = messageVar.senderMessage;

                await postTweet(messageVar.senderScreenName, encodeMsg, undefined, undefined);
            }
            
            catch (e) {
                console.error(e);
            }
        }
    }

    await getDirectMessage();    
}

async function replyDMEvent(event) {

    let tweetId = {};
    async function getTweetId() {

        if (!event.tweet_create_events) {
            return;
        }

        const tweet = event.tweet_create_events;

        tweetId = {
        id : Object.values(tweet)[0].id_str
        };
    }

    async function replyDirectMessage() {

        // Check to see if the message is undefined/error.
        if (typeof messageVar.senderId === 'undefined' || typeof messageVar.senderScreenName === 'undefined' || messageVar.senderMessage === 'undefined') {
            return;
        }
    
        // Check to see if the sender is the same as the recipient of the message.
        if (messageVar.senderId === messageVar.recipientId) {
            return;
        }
    
        // [CHANGEABLE] Put your own sender id to block the bot from sending DM to itself.
        // Check it in console.log(senderId);
        if (messageVar.senderId === '1267122167306543104') {
            return;
        }
    
        // [CHANGEABLE] Put your desired keyword here, replace the /tst/ keyword.
        if (!((messageVar.senderMessage).toLowerCase()).includes('/tst/')) {
            return;
        }

        // [CHANGEABLE] Rejects all message from users below 100 followers and 500 tweets.
        else if (!(usersVar.usersFollowersCount > 100 && usersVar.usersStatusesCount > 300)) {
            return;
        }
        else
        
        await replyMessage(messageVar.senderId, messageVar.senderScreenName, messageVar.senderMessage, tweetId.id);
    }

    // Calling function to mark read the message sent to us. 
    await markAsRead(messageVar.senderMsgId, messageVar.senderId).then(response => {
        //console.log(JSON.stringify(response, null, 4));
    });

    // Showing the typing thing when the bot is processing.
    await indicateTyping(messageVar.senderId).then(response => {
        //console.log(JSON.stringify(response, null, 4));
    });

    await getTweetId();

    await replyDirectMessage();
} 

// And all this functions below is the functions to be called inside the receive/replyDMEvent function.
async function markAsRead(message_id, sender_id) {

    const requestRead = {
        url: 'https://api.twitter.com/1.1/direct_messages/mark_read.json',
        oauth: oAuthConfig,
        form: {
        last_read_event_id: message_id,
        recipient_id: sender_id
        }
    };
    return await post(requestRead).then(function(response) {
        return response;
    })
    .catch(error => console.error(error));
}

async function indicateTyping(sender_id) {

    const requestIndicator = {
        url: 'https://api.twitter.com/1.1/direct_messages/indicate_typing.json',
        oauth: oAuthConfig,
        form: {
        recipient_id: sender_id
        }
    };
    return await post(requestIndicator).then(function(response) {
        return response;
    })
    .catch(error => console.error(error));
}

async function getMedia(url) {

    const getImage = {
        url: url,
        oauth: oAuthConfig
    };
    return await get(getImage).then(function(response) {
        return response; 
    })
    .catch(error => console.error(error));
}

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
}

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
}

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
}

async function replyMessage(sender_id, sender_screen_name, sender_message, tweet_id) {

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
                text: `Hi @${sender_screen_name}! 👋. Thank you for using testingfess autobase! https://twitter.com/testingfess/status/${tweet_id}`
            }
            }
        }
        }
    };
    console.log(`[${new Date().toLocaleString()}] [CONSOLE] User @${sender_screen_name} says: ${sender_message}`);
    return await post(requestReply).then(function(response) {
        return response;
    })
    .catch(error => console.error(error));
}

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
                text: `Hi @${sender_screen_name}! 👋. You should have atleast 100 followers, and 300 tweets in order to send a message to this base.`,
            }
            }
        }
        }
    };
    console.log(`[${new Date().toLocaleString()}] [CONSOLE] Rejected user @${sender_screen_name}'s message`);
    return await post(requestReject).then(function(response) {
        return response;
    })
    .catch(error => console.error(error));
}

async function postTweet(sender_screen_name, status, attachment_url, media_ids) {

    const sendTwt = {
        url: 'https://api.twitter.com/1.1/statuses/update.json',
        oauth: oAuthConfig,
        form: {
        status: status,
        attachment_url: attachment_url,
        media_ids: media_ids
        }
    };
    console.log(`[${new Date().toLocaleString()}] [CONSOLE] Tweeted user @${sender_screen_name}'s message`);
    return await post(sendTwt).then(function(response) {
        return response;
    })
    .catch(error => console.error(error));
}

function sleep(ms) {

    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
}

// Starts the bot.
(async start => {

    try {
        const webhook = new Autohook(oAuthConfig);
        await webhook.removeWebhooks();
        await webhook.start();

        webhook.on('event', async event  => {
            if (event.direct_message_events) {
                await receiveDMEvent(event);
            }
            else if (event.tweet_create_events) {
                await replyDMEvent(event);
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