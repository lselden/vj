function initKeys() {
	var MOVE_INCREMENT = 0.01;
	
	jwerty.key('shift+=', function(event, key) {
		$('#controls').toggle();
	});
	
	jwerty.key('ctrl+=', function(event, key) {
		$('body').toggleClass('black');
	});
	
	jwerty.key('open-bracket/close-bracket', function(event, key) {
		var obj = main.key1,
				old = obj.get('tolerance'),
				val;
				
		val = /open/.test(key)
			? old - MOVE_INCREMENT
			: old + MOVE_INCREMENT;
			
		obj.set('tolerance', val);
	});
	
	jwerty.key('shift+open-bracket/shift+close-bracket', function(event, key) {
		var obj = main.key2,
				old = obj.get('tolerance'),
				val;
				
		val =  /open/.test(key)
			? old - MOVE_INCREMENT
			: old + MOVE_INCREMENT;
			
		obj.set('tolerance', val);
	});
	
	jwerty.key('w/s/a/d/up/down/left/right', function(event, key) {
		var obj = /(up|down|left|right)/.test(key) ? main.move2 : main.move1,
				current = obj.get('offset');
		
		if(!Array.isArray(current)) {
			current = [current.x, current.y];
		}
		
		switch(key) {
			case 'up':
			case 'w':
				current[1] = current[1] + MOVE_INCREMENT; break;
			case 'down':
			case 's':
				current[1] = current[1] - MOVE_INCREMENT; break;
			case 'left':
			case 'a':
				current[0] = current[0] - MOVE_INCREMENT; break;
			case 'right':
			case 'd':
				current[0] = current[0] + MOVE_INCREMENT; break;
		}
		
		// avoid excessive floating point errors
		current = current.map(function(x) { return Math.round(x*1000)/1000; });

		obj.set('offset', current);
	});
	
	jwerty.key('shift+w/shift+a/shift+s/shift+d/shift+up/shift+down/shift+left/shift+right', function(event, key) {
		var obj = /(up|down|left|right)/.test(key) ? main.move2 : main.move1,
				scale = obj.get('size'),
				rotation = obj.get('rotation');
		
		switch(key.replace('shift+', '')) {
			case 'up':
			case 'w':
				obj.set('size', Math.round((scale + MOVE_INCREMENT)*1000)/1000);
			break;
			case 'down':
			case 's':
				obj.set('size', Math.round((scale - MOVE_INCREMENT)*1000)/1000);
			break;
			case 'left':
			case 'a':
				obj.set('rotation', Math.round((rotation - MOVE_INCREMENT)*1000)/1000);
			break;
			case 'right':
			case 'd':
				obj.set('rotation', Math.round((rotation + MOVE_INCREMENT)*1000)/1000);
			break;
		}

	});
	//jwerty.key('[1-2]+comma/[1-2]+commaperiod-forward-slash]', function(event, key, z) {
	
	var SPEED_INCREMENT = 0.1;
	
	jwerty.key('comma', function(event, key) {
		var pre = main.vid1.speed;
		main.vid1.speed = main.vid1.speed - SPEED_INCREMENT;
		main.vid2.speed = main.vid2.speed - SPEED_INCREMENT;
	});
	
	jwerty.key('period', function(event, key) {
		var pre = main.vid1.speed;
		main.vid1.speed += SPEED_INCREMENT;
		main.vid2.speed += SPEED_INCREMENT;
	});
	
	jwerty.key('forward-slash', function(event, key) {
		if(main.vid1.paused) {
			main.vid1.play();
		} else {
			main.vid1.pause();
		}
		
		if(main.vid2.paused) {
			main.vid2.play();
		} else {
			main.vid2.pause();
		}
	});
	
	var activeStatus = null;
	jwerty.key('ctrl+enter', function(event, key) {
		if(activeStatus) {
			Seriously().go();
			main.target.go();
			if(activeStatus.vid1) main.vid1.play();
			if(activeStatus.vid2) main.vid2.play();
			activeStatus = null;
		} else {
			activeStatus = {
				vid1: !main.vid1.paused,
				vid2: !main.vid2.paused
			};
			Seriously().stop();
			main.vid1.stop();
			main.vid2.stop();
			main.target.stop();
		}
	});
	
}