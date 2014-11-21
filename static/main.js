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
	var button = document.createElement('div');
	button.classList.add('close_page');
	return button;
}

window.addEventListener('load', function() {
	

	document.body.addEventListener('click', function(event) {
				var element = event.target.parentElement;;
		if (event.target.matches('a')) {
			event.preventDefault();
			ajaxHTML(event.target.href)
				.then(function(response) {
					var el = response.querySelector('.legislation');
					if (el) {
										console.log(element, el)
						el.insertBefore(create_close(), el.firstChild);
		
						document.body.querySelector('.page_wrapper ').appendChild(el);
					} else {
						throw 'error'
					}
				}).catch(function(e) {
					console.log('error', e)
				})
		}
		else if (event.target.matches('.close_page')) {
			element.parentElement.removeChild(element);
		}
	});
});