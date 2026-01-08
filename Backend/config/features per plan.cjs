const PLAN_FEATURES = {
  free: {
    dailyLimit: 5,
    exportAllowed: false,
    themes: "basic",
    aiTools: false,
    teamCollab: false,
    apiAccess: false,
    prioritySpeed: false,
  },
  premium: {
    dailyLimit: Infinity,
    exportAllowed: true,
    themes: "all",
    aiTools: true,
    teamCollab: false,
    apiAccess: false,
    prioritySpeed: true,
  },
  enterprise: {
    dailyLimit: Infinity,
    exportAllowed: true,
    themes: "all",
    aiTools: true,
    teamCollab: true,
    apiAccess: true,
    prioritySpeed: true,
  },
};

module.exports = PLAN_FEATURES;
