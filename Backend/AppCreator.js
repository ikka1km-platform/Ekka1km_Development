/**
 * ============================================================
 * EKKA1KM BACKEND
 * V5.8.0 - APPCREATOR24 APIs
 * AppCreator.js
 * ============================================================
 */

function getAppConfig() {
  return getKeyValueSheet("AppConfig");
}

function getAppVersion() {
  return getSheetData("AppVersion");
}

function getForceUpdate() {
  const data = getSheetData("AppVersion");

  return data.map(v => ({
    platform: v.Platform,
    currentVersion: v.CurrentVersion,
    minimumVersion: v.MinimumVersion,
    forceUpdate: String(v.ForceUpdate).toUpperCase() === "TRUE",
    updateMessage: v.UpdateMessage,
    updateURL: v.UpdateURL
  }));
}

function getMaintenance() {
  return getSheetData("Maintenance");
}

function getDynamicMenu() {
  return getSheetData("DynamicMenu");
}

function getRemoteAnnouncements() {
  return getSheetData("RemoteAnnouncements");
}

function getRemoteBanners() {
  return getSheetData("RemoteBanners");
}

function getFeatureFlags() {
  return getSheetData("FeatureFlags");
}

