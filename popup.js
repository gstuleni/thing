// popup.js
let isConnected = false;
let userProfile = null;

// Check connection status on load
chrome.runtime.sendMessage({ action: 'getProfile' }, (response) => {
  if (response && response.profile) {
    showConnected(response.profile);
  }
});

// Connect button click
document.getElementById('connectBtn').addEventListener('click', () => {
  // Open ScholarAI website to login
  chrome.tabs.create({ url: 'http://localhost:3002' });
  
  // Listen for profile update
  window.addEventListener('message', (event) => {
    if (event.data.type === 'scholarai-profile') {
      chrome.runtime.sendMessage({
        action: 'saveProfile',
        profile: event.data.profile,
        token: event.data.token
      }, () => {
        showConnected(event.data.profile);
      });
    }
  });
});

// Fill button click
document.getElementById('fillBtn').addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, {
      action: 'fillForm',
      profile: userProfile
    });
    window.close();
  });
});

function showConnected(profile) {
  isConnected = true;
  userProfile = profile;
  
  document.getElementById('status').className = 'status connected';
  document.getElementById('status').textContent = 'Connected to ScholarAI';
  
  document.getElementById('profileInfo').style.display = 'block';
  document.getElementById('userName').textContent = profile.name || 'User';
  document.getElementById('userEmail').textContent = profile.email || '';
  
  document.getElementById('connectBtn').style.display = 'none';
  document.getElementById('fillBtn').style.display = 'block';
}