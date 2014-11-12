function ajaxHTML(url) {

	return new Promise(function(resolve, reject) {
		var req = new XMLHttpRequest();
		req.responseType = "document";
		req.open('GET', url);
		req.onload = function() {
			if (req.status == 200) {
				resolve(req.response);
			} else {
				reject(Error(req.statusText));
			}
		};
		req.onerror = function() {
			reject(Error("Network Error"));
		};
		req.send();
	});
}

function create_close(){
	var button = document.createElement('tag');
	button.classList.add('close_page');
	return button;
}

window.addEventListener('load', function() {

	document.body.addEventListener('click', function(event) {
		if (event.target.matches('a')) {
			event.preventDefault();
			ajaxHTML(event.target.href)
				.then(function(response) {
					var el = response.querySelector('.legislation');
					if (el) {
						el.insertBefore(create_close(), el.firstChild);
						document.body.appendChild(el);
					} else {
						throw 'error'
					}
				}).catch(function(e) {
					console.log('error', e)
				})
		}
		else if (event.target.matches('.close_page')) {
			event.target.parentElement.parentElement.removeChild(event.target.parentElement);
		}
	});
});