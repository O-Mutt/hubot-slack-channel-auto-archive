// Description:
//   Hubot extension that will hear/respond to hey janet commands
//
// Author:
//   Matt Erickson (MutMatt) Matt@MattErickson.me
//
// Configuration:
//   None
//
// Dependencies:
//   None
//
// Commands:
//   hubot respond to {a text} with {value} - Creates a respond to {a text} and responds with value {value}
//   hubot here respond to {a text} with {value} - Creates a respond to {a text} and responds with value {value} but in the current room
//   hubot delete respond to {a text} - Deletes respond to {a text}
//   hubot from here delete respond to {a text} - Deletes respond to {a text} from the current room
//   hubot list responds - Lists all responds

const { CronJob } = require("cron");
const helpers = require('./lib/helpers');
const SlackClient = require('@slack/client');
const moment = require('moment');

module.exports = (robot) => {
  const procVars = helpers.getProcessVariables(process.env);

  const { daysSinceLastInteraction, autoArchiveDays } = procVars;
  robot.logger.debug(`register the channel cleanup cron days since ${daysSinceLastInteraction} cron ${autoArchiveDays}`);
  const job = new CronJob(autoArchiveDays, async () => {
    try {
      robot.logger.debug("cron triggered");
      const web = new SlackClient.WebClient(robot.adapter.options.token);
      const { channels } = await web.conversations.list();
      robot.logger.debug("Found these channels", JSON.stringify(channels));

      const channelsToArchive = [];
      const daysAgo = moment().subtract(daysSinceLastInteraction, 'days').valueOf();
      for (const channel of channels) {
        if (!channel.id) {
          robot.logger.debug(`Missing channel id ${JSON.stringify(channel)}`);
          continue;
        }
        robot.logger.debug(`Trying to find history for ${channel.id} with the oldest message ${daysAgo} days ago`);
        const { messages } = await web.conversations.history({ channel: channel.id, oldest: daysAgo });
        robot.logger.debug(`These are the messages[${messages.length}], ${JSON.stringify(messages[0])}`);
        const nonHubotMessages = messages.filter((message) => {
          robot.logger.debug('filter out the messages from hubot', message.user, robot);
          message.user !== robot.id;
        })
        if (nonHubotMessages.length <= 0) {
          robot.logger.debug(`This channel has been found to have no user messages in the last ${daysSinceLastInteraction} days`);
          channelsToArchive.push(channel.id);
        }
      }

      for (const readyToArchive of channelsToArchive) {
        robot.messageRoom(readyToArchive, 'This channel is inactive and will be exterminated :exterminate: tomorrow if no activity is recorded');
      }
    } catch (er) {
      robot.logger.debug(`An error occurred in the cron ${er.message}`);
    }
  }, null, true, 'America/Chicago');

  job.start();
};