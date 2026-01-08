export const PLAN_FEATURES = {
  free: { dailyLimit: 5, basicThemesOnly: true, canExport: false, aiTools: false, teamCollab: false, apiAccess: false, priorityGeneration: false, support: false },
  premium: { dailyLimit: Infinity, basicThemesOnly: false, canExport: true, aiTools: true, teamCollab: false, apiAccess: false, priorityGeneration: true, support: false },
  enterprise: { dailyLimit: Infinity, basicThemesOnly: false, canExport: true, aiTools: true, teamCollab: true, apiAccess: true, priorityGeneration: true, support: true },
};
