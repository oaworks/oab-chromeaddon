chrome.tabs.query({currentWindow: true, active: true}, function(tabs){
    localStorage.setItem('active_tab', tabs[0].url);
    console.log(localStorage.getItem('active_tab'));
    chrome.tabs.create({'url': chrome.extension.getURL('ui/login.html')});
});