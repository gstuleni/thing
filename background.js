let userProfile = null;
let authToken = null;

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getProfile') {
    sendResponse({ profile: userProfile, token: authToken });
  } else if (request.action === 'saveProfile') {
    userProfile = request.profile;
    authToken = request.token;
    chrome.storage.local.set({ userProfile, authToken });
    sendResponse({ success: true });
  } else if (request.action === 'autofill') {
    // Send profile data to content script
    chrome.tabs.sendMessage(sender.tab.id, {
      action: 'fillForm',
      profile: userProfile
    });
  }
  return true;
});

// Load saved profile on startup
chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.get(['userProfile', 'authToken'], (result) => {
    userProfile = result.userProfile;
    authToken = result.authToken;
  });
});