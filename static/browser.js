function debounce(func, delay) {
    var timeout;
    return function() {
        var args = arguments;
        if (timeout)
            clearTimeout(timeout)
        timeout = setTimeout(function() {
            func.apply(null, arguments);
        }, delay || 100);
        return timeout;
    };
}



$(document).on('ready', function(){

	function createSelect(data){
		var select = document.createElement('select');
		var option_base = document.createElement('option');
		for(var i=0;i<data.length;i++){
			option = option_base.cloneNode();
			option.value = data[i][1];
			option.text = data[i][0];
			select.appendChild(option);			
		}
		return select;
	}


	$.get('/acts.json')
		.then(function(data){
			$('#actName').typeahead({ items:10,  showHintOnFocus: true, source:data.acts.map(function(a){
				return a[0];
			}) });
		});

	function getResults(){
		var act = $('#actName').val().toLowerCase().replace(/ /g, ''),
			find = $('#find').val(),
			value = $('#value').val(),
			url = '/act/';
		url += act+'/';
		if(value){
			if(find !== 'section'){
				url += find+'/';
			}
			url += value;
			$.get(url)
				.then(function(response){
					var legis = $(response).find('.legislation');
					if(legis.length){
						$('.legislation').remove();
						$(response).find('.legislation').appendTo('.legislation_viewer');
						$('.legislation_finder .error').hide();
					}else{
						$('.legislation_finder .error').show();
					}
				})

		}

	}

	$(document).on('change', '#find', function(){
		$('#valueLabel').text($('#find').find('option:selected').text());
	});
	$('#find').trigger('change');
	$(document).on('change keyup', '#actName, #find, #value', debounce(getResults, 300));

});