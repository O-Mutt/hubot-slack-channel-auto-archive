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
  const warningMessage = 'This channel is inactive and will be exterminated :exterminate: shortly if no activity is recorded';

  const { daysSinceLastInteraction, autoArchiveDays } = procVars;
  robot.logger.debug(`register the channel cleanup cron days since ${daysSinceLastInteraction} cron ${autoArchiveDays}`);
  const job = new CronJob(autoArchiveDays, async () => {
    try {
      robot.logger.debug(`cron triggered for robot ${robot}`);
      const web = new SlackClient.WebClient(robot.adapter.options.token);
      const { channels } = await web.conversations.list();
      robot.logger.debug("Found these channels", channels.map((channel) => channel.id).join(', '));

      const channelsToArchive = [];
      const channelsToWarn = [];
      const daysAgo = moment().subtract(daysSinceLastInteraction, 'days').unix();
      for (const channel of channels) {
        if (!channel.id) {
          robot.logger.debug(`Missing channel id ${JSON.stringify(channel)}`);
          continue;
        }
        robot.logger.debug(`Trying to find history for ${channel.id} with the oldest message ${daysAgo} days ago`);
        const { messages } = await web.conversations.history({ channel: channel.id, oldest: daysAgo });
        robot.logger.debug(`Got the history for ${channel.name} there are ${messages.length} messages since ${moment(daysAgo).format('MM/DD/YYYY')}, E.G:\n ${JSON.stringify(messages[0])}`);
        const hubotWarningMessages = messages.filter((message) => {
          robot.logger.debug(`Filter out the messages from hubot ${message.user}, ${message.text}`);
          message.user === robot.id && message.text === warningMessage;
        });
        const nonHubotMessages = messages.filter((message) => {
          robot.logger.debug(`Filter out the messages from hubot ${message.user}, ${message.text}`);
          message.user !== robot.id;
        })
        if (nonHubotMessages.length <= 0 && hubotWarningMessages > 4) {
          robot.logger.debug(`This channel has been found to have no user messages in the last ${daysSinceLastInteraction} days`);
          channelsToArchive.push(channel.id);
        }
        if (nonHubotMessages.length <= 0) {
          channelsToWarn.push(channel.id);
        }
      }



      for (const warnTheChannel of channelsToWarn) {
        try {
          await web.conversations.join({ channel: warnTheChannel });
        } catch (e) {
          robot.logger.error(`Couldn't join channel #${warnTheChannel} ${e.message}`);
        }
        try { 
          robot.messageRoom(warnTheChannel, warningMessage);
        } catch (e) {
          robot.logger.error(`Couldn't message channel #${warnTheChannel} ${e.message}`);
        }
      }

      for (const channelToArchive of channelsToArchive) {
        try {
          await web.conversations.archive({ channel: channelToArchive });
        } catch (e) {
          robot.logger.error(`Couldn't archive channel #${channelToArchive} ${e.message}`);
        }
      }

    } catch (er) {
      robot.logger.debug(`An error occurred in the cron ${er.message}`);
    }
  }, null, true, 'America/Chicago');

  job.start();
};