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

module.exports = (robot) => {
  const procVars = helpers.getProcessVariables(process.env);

  const { daysSinceLastInteraction, autoArchiveDays } = procVars;
  robot.logger.debug(`register the channel cleanup cron days since ${daysSinceLastInteraction} cron ${autoArchiveDays}`);
  const job = new CronJob(autoArchiveDays, async () => {
    try {
      robot.logger.debug("cron triggered");
      const web = new SlackClient.WebClient(robot.adapter.options.token);
      const { channels } = await web.conversations.list();
      robot.logger.debug("Found these channels", channels.join(' '));

      const channelsToArchive = [];
      const daysAgo = moment().subtract(daysSinceLastInteraction, 'days').toISOString();
      for (const channel in channels) {
        const { messages } = await web.conversation.history({ channel: channel.id, oldest: daysAgo })
        const nonHubotMessages = messages.filter((message) => {
          robot.logger.debug(' filter out the messages from hubot', message.user, robot);
          message.user !== robot.id;
        })
        if (nonHubotMessages.length <= 0) {
          robot.logger.debug(`This channel has been found to have no user messages in the last ${daysSinceLastInteraction} days`);
          channelsToArchive.push(channel.id);
        }
      }

      for (const readyToArchive in channelsToArchive) {
        robot.messageChannel(readyToArchive, 'This channel is inactive and will be exterminated :exterminate: tomorrow if no activity is recorded');
      }
    } catch (er) {
      robot.logger.debug(`An error occurred in the cron ${er.message}`);
    }
  }, null, true, 'America/Chicago');

  job.start();
};