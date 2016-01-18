chrome.tabs.query({currentWindow: true, active: true}, function(tabs){
	if (!localStorage.getItem('active_tab' == tabs[0].url)){
		localStorage.removeItem('blocked_id');
		localStorage.removeItem('qs_failover');
		localStorage.removeItem('title');
		localStorage.removeItem('doi');
		localStorage.removeItem('author');
		localStorage.removeItem('journal');
	}
    localStorage.setItem('active_tab', tabs[0].url);
    localStorage.setItem('tab_id', tabs[0].id);
    document.getElementById('oabutton_frame').src = chrome.extension.getURL('ui/login.html');
    document.getElementById('placeholder').style.display = 'none';
});