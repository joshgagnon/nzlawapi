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
			$('#actName').typeahead({ 
				items:10,  
				showHintOnFocus: true, 
				source: data.acts.map(function(a){
					return a[0];
				}),
				afterSelect: function(){
					this.$element.parents('.form-group').next().find('input, select').focus();
					console.log(this.$element.parents('.form-group').next().find('input, select').focus());
				}
			});
		});

	function updateReferences(){
		var ids = $('.legislation *[id]').map(function(){
			return this.id;
		}).toArray();
		console.log(ids);
		$.get('/find_references/'+ids.join(';'))
			.then(function(result){
				$('.reference_list').html('')
				var lis = result.references.map(function(r){
					return $('<li/>').append($('<a/>').attr('href', r[0]).text(r[1]));
				})
				$('.reference_list').append(lis)
			})
	}

	function updateLegislation(response){
		var legis = $(response).find('.legislation');
		if(legis.length){
			$('.legislation').remove();
			$(response).find('.legislation').appendTo('.legislation_viewer');
			$('.legislation_finder .error').hide();
			updateReferences();
		}else{
			$('.legislation_finder .error').show();
		}
	}


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
				.then(updateLegislation);

		}

	}

	$(document).on('change', '#find', function(){
		$('#valueLabel').text($('#find').find('option:selected').text());
	});
	$('#find').trigger('change');
	$(document).on('change keyup', '#actName, #find, #value', debounce(getResults, 300));

});