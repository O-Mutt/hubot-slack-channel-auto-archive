# Hubot Slack Channel Auto Archiver!

This script is intended to be used for auto archiving stale/unused slack channels.

Requirements:
  - hubot
  - slack-adapter
  
Env setup:
  - HUBOT_AUTO_ARCHIVE_DAYS = Number of days of inactivity before archive (in days). _default_ 30 days
  - HUBOT_AUTO_ARCHIVE_CRON = The cron that will run the checks. _default_ `0 */6 * * *` (every 6 hours)
