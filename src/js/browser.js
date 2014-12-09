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

function sidebar(){
	$('[data-toggle=offcanvas]').click(function() {
	  	$(this).toggleClass('visible-xs text-center');
	    $(this).find('i').toggleClass('glyphicon-chevron-right glyphicon-chevron-left');
	    $('.row-offcanvas').toggleClass('active');
	    $('#lg-menu').toggleClass('hidden-xs').toggleClass('visible-xs');
	    $('#xs-menu').toggleClass('visible-xs').toggleClass('hidden-xs');
	    $('#btnShow').toggle();
	});
}


function scrollTo($element){
	$element.scrollintoview();
}


function fetch(url, query){
	$('.legislation_finder').addClass('loading');	
	return $.get(url, query)
		.then(function(response){
			$('.legislation_finder').removeClass('loading');	
			return response;
		});

}

$(document).on('ready', function(){
	return;
	sidebar();

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


	fetch('/acts.json')
		.then(function(data){
			$('#act-name').typeahead({ 
				items:10,  
				//showHintOnFocus: true, 
				source: data.acts.map(function(a){
					return a[0];
				}),
				appendAfter: $('.sidebar-offcanvas'),
				afterSelect: function(){
					this.$element.parents('.form-group').next().find('input, select').focus();
				}
			});
		});


	function appendExpandControl(legislation){
		var topLevel = $('.top-level', legislation);
		if( topLevel.height() > topLevel.parent().height()){
			$('<div/>').addClass('expand')
			.appendTo(topLevel.parent())
			.on('click', function(){
				legislation.toggleClass('expanded');
			});
		}
	}

	function appendCloseControl(legislation){
		var topLevel = $('.top-level', legislation);
		$('<div/>').addClass('close-page')
			.appendTo(topLevel.parent())
			.on('click', function(){
				legislation.remove();
			});
	}

	function updateReferences(){
		var ids = $('.legislation *[id]').map(function(){
			return this.id;
		}).toArray();
		if(ids.length){
			$.get('/find_references/'+ids.join(';'))
				.then(function(result){
					$('.reference_list').html('')
					var lis = result.references.map(function(r){
						return $('<li/>').append($('<a/>').attr('href', r[0]).text(r[1]));
					})
					$('.reference_list').append(lis);
				});
		}
	}

	function updateLegislation(response){
		var result = $(response).find('.result');
		if(result.length){
			result.appendTo('.legislation_viewer');
			$('.legislation_finder .error').hide();
			appendExpandControl(result);
			console.log(result)
			appendCloseControl(result);
			scrollTo(result);
			//updateReferences();
		}else{
			$('.legislation_finder .error').show();
		}
		return result;
	}

	var serial;
	function hasChanged(){
		var new_serial = $('.legislation_finder').serialize();
		if(new_serial !== serial){
			serial = new_serial;
			return true;
		}
		return false;
	}


	function submit(event){
		switch($('#type').val()){
			case "act":
				submitAct();
				break;
			case "case":
				submitCase();
				break;

		}

		return false;
	}

	function submitCase(){
		var query = $('#query').val(),
			url = "/case/search"
		if(query){
			fetch(url, {query: query})
				.then(updateLegislation)	
		}

	}

	function submitAct(){
		var act = $('#act-name').val().toLowerCase().replace(/ /g, ''),
			find = $('#find').val(),
			value = $('#value').val(),
			url = '/act/';
		url += act+'/';
		if(find === 'full'){
			getFullAct(act);
		}	
		else if(hasChanged() && value){
			if(find !== 'section'){
				url += find +'/';
			}
			url += value;
			fetch(url)
				.then(updateLegislation)	
		}
	}

	function getFullAct(act){
		if(hasChanged() && act){
			fetch('/act/'+act+'/full')
				.then(updateLegislation)							
		}
	}

	function getQuery(){
		var value = $('#query').val();
		if(hasChanged() && value){
			fetch('/full_search/', {query: value})
				.then(updateLegislation)			
		}
	}

	function handleLink(event){
		var link = $(event.target).attr('href');
		$.get(link)
			.then(updateLegislation)
		return false;
	}


	$('.legislation_finder').on('change', '#type', function(){
		var val = $(this).val();
		$('.legislation_finder').find('.switchable').hide();
		$('.switchable').each(function(){
			if($(this).hasClass('visible-'+val)){
				$(this).show();
			}
		});
	});

	$('.legislation_finder').on('change', '#find', function(){
		$('#valueLabel').text($('#find').find('option:selected').text());
	});
	$('#find').trigger('change');

	$('.legislation_finder').on('click', '#submit', submit);
	$('.legislation_finder').on('click', '#submit_loading', function(){
		return false;
	});

	$('#find, #type').trigger('change');

	$('.legislation_viewer').on('click', 'a', handleLink);

});