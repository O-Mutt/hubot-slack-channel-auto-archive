
function getProcessVariables(env) {
  const procVars = {};
  procVars.daysSinceLastInteraction = env.HUBOT_AUTO_ARCHIVE_DAYS || '30';
  procVars.autoArchiveDays = env.HUBOT_AUTO_ARCHIVE_CRON || '0 */6 * * *';
  return procVars;
}

module.exports = {
  getProcessVariables,
};
