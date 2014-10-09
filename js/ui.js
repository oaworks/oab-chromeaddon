var page_main = ""

window.addEventListener('load', function () {
    document.getElementById("button").addEventListener('click', function(){
		document.getElementById("main").innerHTML = page_main;
		console.log(feed.innerhtml)
    });
});