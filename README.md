# autohookbase_twitter

This is a Twitter bot that utilizes [twitterdev/autohook](https://github.com/twitterdev/autohook)  to automatically process Twitter's webhook for you asynchronously. This bot will detect a Direct Message event which will take the message that someone Direct Message'd your Twitter account as an input, and then check it whether or not it contains an image/link or just a message, and will process it to post as your own tweet. You are able to filter to only process messages that contains certain keyword, as an example inside is `/tst/`keyword.

## Requirements

- Operating System: Linux or Windows

I used Linux solely while developing this bot, so if there's a problem running this bot on Windows,
you're on your own. But in theory there shouldn't be any problem anyway.

- [Node.js](https://nodejs.org/en/)

This bot uses Node.js in order to run the codes. Install the current version of Node.js

- Git

To clone the repository.

- [Twitter Developer Apps](https://developer.twitter.com/en)

Make a new Twitter account for your autobase, don't use your personal Twitter account. Create the app for your bot to use [here](https://developer.twitter.com/en/apps), register your app, and then put your authentication information to the .env file.

- [Heroku](https://heroku.com) or [Glitch](https://glitch.com/)

You can deploy the bot to Heroku or Glitch so you don't have to host it on your computer. Note: Heroku and Glitch have its own limitations, read more about it yourself.

## Dependencies

This javascript program depends on three packages:

- [twitter-autohook](https://github.com/twitterdev/autohook)

```$ npm install twitter-autohook```

- [request](https://www.npmjs.com/package/request)  

```$ npm install request```

- [dotenv](https://www.npmjs.com/package/dotenv)  

```$ npm install dotenv```

Or you can just do this on terminal inside the cloned repository.

```$ npm install```

## Usage

```$ node index.js```

See the demo usage [here.](https://raw.githubusercontent.com/opemvbs/autohookbase_twitter/master/demo.webm)

## TODO

- Put in more features, ~~like put limitations on minimal followers, tweets, or other things other people had to have in order to use your autobase~~.
- ~~Put catch error function to catch more errors/anomalies~~.
- Other improvements and features that is not in my mind right now.

## Updates

- Updated script to be able to set followers and tweets requirements from user sending message to the bot.
- Updated script with catch error functions.
