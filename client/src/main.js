var s = Seriously();


var ColorUtils = {
	RGBtoHSL: function(r, g, b){
		var max = Math.max(r, g, b),
				min = Math.min(r, g, b),
				d = max - min;
		var h, s, l = (max + min) / 2;

		if (max == min) {
			h = s = 0; // achromatic
		} else {
			s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
			switch (max) {
				case r: h = (g - b) / d + (g < b ? 6 : 0); break;
				case g: h = (b - r) / d + 2; break;
				case b: h = (r - g) / d + 4; break;
			}
			h /= 6;
		}

		return [h,s,l];
	},

	HSLtoRGB: (function() {
		hue2rgb = function (p, q, t) {
			if(t < 0) t += 1;
			if(t > 1) t -= 1;
			if(t < 1/6) return p + (q - p) * 6 * t;
			if(t < 1/2) return q;
			if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
			return p;
		}
		
		return function (h, s, l) {
			var r, g, b,
					q, p;

			if (s == 0){
				r = g = b = l; // achromatic
			} else {
				q = l < 0.5 ? l * (1 + s) : l + s - l * s;
				p = 2 * l - q;
				
				r = hue2rgb(p, q, h + 1/3);
				g = hue2rgb(p, q, h);
				b = hue2rgb(p, q, h - 1/3);
			}

			return [r, g, b];

		}
	})(),
		
	RGBtoHEX: function(r, g, b) {
		var hex = ( r * 255 ) << 16 ^ ( g * 255 ) << 8 ^ ( b * 255 ) << 0;
		return '#' + ( '000000' + hex.toString(16) ).slice( -6 );
	}
}


var C3Node = function(name) {
	
	this.id = name + C3Node.count;
	C3Node.count++;
	
	this.name = name;
	
	C3Node.library.push(this.id);
	
	return this;
};
C3Node.library = [];
C3Node.count = 0;

C3Node.prototype = Object.create(EventEmitter.prototype);

C3Node.prototype.controls = null;
C3Node.prototype.name = 'C3Node';
C3Node.prototype.remove = function() {
	C3Node.library.splice(C3Node.library.indexOf(this), 1);
	if(this.node) this.node.destroy();
	if(this.effect) this.effect.destroy();
	if(this.el) $(this.el).remove();
}
// setup event listeners
// TODO ugly ugly code
C3Node.prototype.attachIO = function(socket, id, main) {
	id || (id = this.id);
	
	var self = this,
			prefix = id + '.',
			effect = this.effect,
			controls = this.controls,
			ctl;
	
	for(var key in controls) {
		if (!controls.hasOwnProperty(key)) continue;
		
		ctl = controls[key];
		
		switch (ctl.type) {
		// TODO this is hella hacky o yeah
			case 'image':
				socket.on(prefix + key, (function(key, library, sourceNodeName) {
					this.setInput('source', library[sourceNodeName]);
				}).bind(this, key, main));
			break;
			case 'color':
				socket.on(prefix + key + '.h', this.set.bind(this, key + '.h'));
				socket.on(prefix + key + '.s', this.set.bind(this, key + '.s'));
				socket.on(prefix + key + '.l', this.set.bind(this, key + '.l'));
				socket.on(prefix + key, (function(key, value) {
					this.set(key, value);
				}).bind(this, key));
			break;
			case 'number':
				socket.on(prefix + key, (function(key, min, max, normal) {
					var value = (normal*(max - min)) + min;
					this.set(key, value);
				}).bind(this, key, ctl.min || 0, ctl.max || 1));
			break;
			case 'vector':
				socket.on(prefix + key + '.x', this.set.bind(this, key + '.x'));
				socket.on(prefix + key + '.y', this.set.bind(this, key + '.y'));
			case 'string':
			default:
				socket.on(prefix + key, (function(key, src) {
					self.set(key, src);
				}).bind(this, key));
			break;
				
		}
	}
	
	socket.on(prefix + 'bypass', function(bool) {
		self.bypass(bool);
	});
	
	return this;
}

C3Node.prototype.set = function(key, value) {
	var hasSubComponent = /\./.test(key),
			componentKey, componentIndex, rgbValue, hslValue,
			control;
			
	if(hasSubComponent) {
		componentKey = key.split('.')[1];
		key = key.split('.')[0];
	}
	
	control = this.controls[key];
	
	if(!control) throw Error('invalid key', key, value);
	
	if (!this.effect) {
		console.warn('no effect/node set yet', key, value);
		return;
	}
	
	if (control.type === 'color') {
		rgbValue = control.value,
		hslValue = control.hsl; // color array
		
		if(hasSubComponent) {
		
			componentIndex = 'hslrgb'.indexOf(componentKey);
			
			if (!~componentIndex) { // not equal -1
				throw Error(['invalid subcomponent', componentKey, componentIndex, key].join());
			} else if (componentIndex > 2) { // rgb
				rgbValue[componentIndex - 3] = value;
				hslValue = ColorUtils.RGBtoHSL.apply(null, rgbValue);
			} else {
				hslValue[componentIndex] = value;
				rgbValue = ColorUtils.HSLtoRGB.apply(null, hslValue);
			}
			
		} else if (Array.isArray(value)) {
			rgbValue = value;
			hslValue = ColorUtils.RGBtoHSL.apply(null, rgbValue);
		}
		
		control.value = rgbValue;
		control.hsl = hslValue;
	} else if (control.type === 'vector') {
		rgbValue = control.value;
		
		if (hasSubComponent) {
			if(componentKey === 'x') {
				rgbValue[0] = value;
			} else {
				rgbValue[1] = value;
			}
			
			control.value = rgbValue;
			
		} else {
		
			control.value = value;
		}
	
	} else {
		control.value = value;
	}
	
	this.effect[key] = control.value;
	
	this.emit('change', key, control.value);
	
	return this;
}

C3Node.prototype.get = function(key) {
	var controlVal = this.controls[key] && this.controls[key].value,
			effectVal = this.effect && this.effect[key];
	
	if(controlVal != effectVal) {
		//console.warn("get, values don't match: ", controlVal, effectVal);
	}
	
	return controlVal;
}

var Patch = function(effectName, settings, description) {
	settings || (settings = {});
	C3Node.call(this, effectName);
	
	this.effect = s.effect(effectName);
	
	this.inputs = {};
	
	this.initControls(effectName);
	
	for(var key in settings) {
		if(settings.hasOwnProperty(key)) {
			if( ~['top','bottom','source'].indexOf(key)) {
				this.setInput(key, settings[key]);
			} else {
				this.set(key, settings[key]);
			}
		}
	}
	
	return this;
	
}

Patch.prototype = Object.create(C3Node.prototype);

$.extend(Patch.prototype, C3Node.prototype, {
	load: function(effectName) {
		var self = this,
				oldEffect = this.effect;
		
		this.effect = s.effect(effectName);
		
		this.initControls(effectName);
		
		this.emit('load', this.effect, oldEffect);
		
		if(oldEffect) {
			oldEffect.destroy();
		}
		
	},
	initControls: function(effectName) {
		var controls = Seriously().effects()[effectName].inputs,
				sourceInputs = this.inputs,
				effect = this.effect,
				control;
		
		for(var key in controls) {
			if (!controls.hasOwnProperty(key)) continue;
			
			control = controls[key];
			
			if (control.type === 'image') {
				
				if (key === 'bottom' && sourceInputs.bottom) {
					effect.bottom = sourceInputs.bottom.valueOf();
				} else if (sourceInputs.top) {
					effect[key] = sourceInputs.top.valueOf();
				}
				
			} else if (control.type === 'color') {
				
				// TODO set up event handling? nah.....
				control.value = control.defaultValue;
				control.hsl = ColorUtils.RGBtoHSL.apply(null, control.value);
				
				
			} else {
				// initialize value for tracking
				control.value = control.defaultValue;
			}
		}
		
		this.controls = controls;
		
	},
	valueOf: function() {
		return this.effect;
	},
	// TODO not ideal -- assumes 'source' top or bottom as input keys
	setInput: function(key, input) {
		
		if(key.toString() !== key) {
			input = key;
			key = 'top';
		}
		
		if(key==='source') key = 'top';
		this.inputs[key] = input;
		
		if(input.on) {
			input.on('load', this.updateInput.bind(this, input, key));
		}
		
		if (!input.valueOf() || !this.effect) return; // skip if not yet initialized
		
		this.updateInput(input, key, input);
	},
	// called on load event -- note that binding ninja-foo
	// TODO too tricky/hacky use of binding
	updateInput: function(input, key, newInput, oldInput) {
		// if since updated so we don't care about this input then remove event listener
		if(this.inputs[key] && this.inputs[key] != input) {
			console.warn('load event on removed input, ignoring', this.id, input.id);
			return true;
		}
		
		if(!newInput) {
			console.warn("can't update input, no newInput:", key, newInput, oldInput);
			return;
		}
		
		if(key === 'top' && ('source' in this.effect)) {
			this.effect.source = newInput.valueOf();
		} else {
			this.effect[key] = newInput.valueOf();
		}
	},
	bypass: function(isBypassed) {
		if(isBypassed) {
			this.emit('load', this.inputs.top.valueOf(), this.effect);
		} else {
			this.emit('load', this.effect, this.inputs.top.valueOf());
		}
	},
	randomTrianglesMatte: function(quantize, numTriangles) {
		quantize || (quantize = 4 + Math.round(Math.random()*26));
		numTriangles || (numTriangles = Math.round(Math.random()*5 + 2));
		
		var triangles = [], pts;
		
		for(var i=0; i<numTriangles; i++) {
			pts = [];
			for(var j=0; j<3; j++) {
				pts.push([
					(2*Math.round(Math.random()*quantize)/quantize) - 1,
					(2*Math.round(Math.random()*quantize)/quantize) - 1
				]);
			}
			triangles.push(pts);
		}
		
		this.effect.matte(triangles);
	
	},
	horizontalMatte: function(quantize, num) {
		quantize || (quantize = 1 + Math.round(Math.random()*79));
		num || (num = 1);
		
		var position = (2*Math.round(Math.random()*(quantize-1))/quantize)-1;
		
		var points = [];
		
		for (var i=0; i<num; i++) {
			points[i] = [
				[position, -1],
				[position + quantize, -1],
				[position + quantize, 1],
				[position, 1]
			];
		}
		
		this.effect.matte(points);
		
		return points;
		
	},
	verticalMatte: function(quantize, num) {
		quantize || (quantize = 1 + Math.round(Math.random()*59));
		num || (num = 1);
		
		var position = (2*Math.round(Math.random()*(quantize-1))/quantize)-1;
		
		var points = [];
		
		for (var i=0; i<num; i++) {
			points[i] = [
				[-1, position],
				[1, position],
				[1, position + quantize],
				[-1, position + quantize],
			];
		}
		
		this.effect.matte(points);
		
	},
	clearMatte: function() {
		this.effect.matte([
			[0, 0],
			[1, 0],
			[1, 1],
			[0, 1],
		]);
	}
	
});

var C3Image = function(src, options) {
	options || (options = {});
	
	var self = this;
	
	C3Node.call(this, 'image');
	
	this.el = $('img', {
		css: {
			position: 'absolute',
			top: 0,
			left: 0,
			'z-index': -100
		}
	});
	
	
	this.animate = !!options.animate;
	
	if(this.animate) {
		this.on('load', this.play.bind(this));
	}
	
	if(src) this.load(src);
	
	Object.defineProperties(this, {
		paused: {
			enumerable: true, configurable: true,
			get: function() { return self.animate; },
			set: function(newState) { 
				if(!!newState && !self.animate) self.pause();
				else if(!newState && self.animate) self.play();
			}
		},
		src: {
			enumerable: true, configurable: true,
			get: function() { return self.el.src; },
			set: function(src) { self.load(src); }
		}
	});
	
	return this;
}


C3Image.prototype = Object.create(C3Node.prototype);

$.extend(C3Image.prototype, C3Node.prototype, {
	controls: {
		'src': {
			type: 'string',
			defaultValue: '',
			uniform: 'src'
		},
		'paused': {
			type: 'boolean',
			defaultValue: false,
			uniform: 'paused'
		}
	},
	play: function() {
		var self = this;
console.log('playing');
		this.animate = true;
		
		var updateFunction = function() {
			if(self.effect) {
				self.effect.update();
			}
			
			if(self.animate) {
				setTimeout(updateFunction, 1000/30);
			}
			
		};
		
		setTimeout(updateFunction, 1000/30);
	},
	pause: function() {
		this.animate = false;
		
	},
	get: function(key) {
		return this[key];
	},
	set: function(key, value) {
		this[key] = value;
	},
	bypass: function(bool) {
		console.warn('no bypass for image');
	},
	load: function(src) {
		var self = this,
				$el = $('<img>', {
					src: src,
					css: {
						top: 0,
						left: 0,
						position: 'absolute',
						'z-index': -1000
					}
				}).appendTo(document.body);
	
				promise = $.Deferred();

		$el.on('load', function(evt) {
			promise.resolve();
		});
		
		promise.done(function() {
			var oldEl = self.el,
					oldNode = self.effect;
			
			self.el = $el[0];
			self.effect = s.source(self.el);
			self.emit('load', self.effect, oldNode);
			
			if(oldNode) {
				oldNode.destroy();
			}
			
			if(oldEl) {
				$(oldEl).remove();
			}
			
		});
	},

	valueOf: function() {
		return this.effect;
	}
});



var Video = function(src, output, outputKey) {
	var self = this;
	
	C3Node.call(this, 'video');
	
	//this.el = this.makeVideoElement();
	
	if(src) this.load(src);
	
	Object.defineProperties(this, {
		speed: {
			enumerable: true, configurable: true,
			get: function() { return self.el.playbackRate; },
			set: function(newSpeed) { 
				if(isNaN(newSpeed)) return;
				self.el.playbackRate = Math.min(Math.max(0, newSpeed), self.MAXIMUM_VIDEO_SPEED);
			}
		},
		paused: {
			enumerable: true, configurable: true,
			get: function() { return self.el.paused; },
			set: function(newState) { 
				if(!!newState && !self.el.paused) self.el.pause();
				else if(!newState && self.el.paused) self.el.play();
			}
		},
		src: {
			enumerable: true, configurable: true,
			get: function() { return self.el.src; },
			set: function(src) { self.load(src); }
		}
	});
	
	
	return this;	
}

Video.prototype = Object.create(C3Node.prototype);

$.extend(Video.prototype, C3Node.prototype, {
	MAXIMUM_VIDEO_SPEED: 4,
	controls: {
		'paused': {
			type: 'boolean',
			defaultValue: false,
			uniform: 'paused'
		},
		'speed': {
			type: 'number',
			min: 0,
			max: 2,
			defaultValue: 1,
			uniform: 'speed'
		},
		'src': {
			type: 'string',
			defaultValue: '',
			uniform: 'src'
		}
	},
	play: function() {
		this.el.play();
		//this.timer = setInterval
		
	},
	pause: function() {
		this.el.pause();
	},
	stop: function() {
		this.el.pause();
	},
	get: function(key) {
		return this[key];
	},
	set: function(key, value) {
		this[key] = value;
	},
	bypass: function(bool) {
		if(bool) {
			this.pause();
		} else {
			this.play();
		}
	},
	
	makeVideoElement: function() {
		var vid = document.createElement('video');
		vid.preload = 'auto';
		vid.loop = 'true';
		vid.width = 640;
		vid.height = 360;
		vid.muted = true;
		return vid;
	},
	load: function(src) {
		var self = this,
				targetEl,
				promise;

		targetEl = this.makeVideoElement();
		promise = this.loadVideo(src, targetEl).done(function(vid) {
			
			var oldEl = self.el,
					oldNode = self.effect;
			
			self.el = vid;
			self.effect = s.source(self.el);
			
			// trigger downstream to update
			self.emit('load', self.effect, oldNode);
			
			if(oldNode) {
				oldNode.destroy();
			}
			if(oldEl) {
				$(oldEl).remove();
			}
			
			//if(self.output) self.output[self.outputKey] = self.effect;			
		}).fail(function(vid) {
			console.error('vid load error', vid.error);
		});
		return promise;
	},
	loadVideo: function(src, vid) {
		var self = this,
				$self = $(self),
				$vid = $(vid),
				promise = new $.Deferred();
				
		$vid
			.one('loadedmetadata', function() {
				vid.width = vid.videoWidth;
				vid.height = vid.videoHeight;
			})
			.one('canplay', function() {
				vid.play();
				console.log('canplay', vid);
				self.emit('active');
				promise.resolve(vid);
			})
			.one('error', function() {
				promise.reject(vid);
			});
			
		$vid.on('error', function(evt) {
			var err = vid.error;
			if (err.code === err.MEDIA_ERR_DECODE) {
				console.warn('video error, restarting');
				vid.play();
			} else {
			console.warn('video error, no restart')
			}
		});

		if( (src.toString() !== src) && (vid.mozSrcObject !== undefined)) {
			vid.mozSrcObject = src;
			vid.play();
		} else {
			vid.src = src;
			vid.load();
		}
		
		return promise;
	},
	loadWebCam: function() {
		var self = this,
				videoEl = this.el || this.makeVideoElement(),
				getUserMedia = navigator.getUserMedia || navigator.mozGetUserMedia || navigator.webkitGetUserMedia,
				URL = window.URL || window.mozURL || window.webkitURL;
		
		if( !getUserMedia ) {
			throw new Error('getUserMedia is not available');
		}
		
		getUserMedia.call(navigator, {video: true}, function(stream) {				
			var src = (URL) ? URL.createObjectURL(stream) : stream;
			console.log('got stream');
			self.stream = stream;
			
			if (videoEl.mozSrcObject !== undefined) {
				self.load.call(self, stream);
				//video.mozSrcObject = stream;
			} else {
				self.load.call(self, src);
			}
			
			
			
			
		}, function(error) {
			console.error('webcam load error', error);
		});
		
	},
	valueOf: function() {
		return this.effect;
	}
});



var Main =function(initialImageUrl) {
	if( !(this instanceof Main) ) return new Main();
	
	var self = this;
	
	this.webcam = new Video();
	this.webcam.loadWebCam();
	
	
	
	/*
	this.vid1 = new C3Image(initialImageUrl, {
		animate: true
	});
	
	//this.kitten.load(  );
	*/
	this.vid1 = new Video();
	this.vid1.load(initialImageUrl);
	/*
	this.vid1.on('load', function() {
		console.log(self.vid1);
		var el = self.vid1.el,
				canvas = $('#canvas'),
				w = el.videoWidth,
				h = el.videoHeight,
				cW = canvas.width(),
				cH = canvas.height(),
				screenW = $(document.body).width(),
				screenH = $(document.body).height(),
				aspect;
		
		if(w && h) {
			aspect = w/h;
			canvas.height( Math.round(parseFloat(cW)/aspect) );
			console.log('set height from', cH, 'to', Math.round(parseFloat(cW)/aspect));
		}
		
		
	});
	*/
	// input
	this.key1 = new Patch('filterkey', {
		source: this.vid1
	});
	

	this.webcam.on('active', (function(self) {
		console.log('is active');
		var callback = function() {
			self.key1.setInput('top', self.webcam);
			self.vid1.pause();
			
			self.vid1.effect.destroy();
			$(self.vid1.el).remove();
			
			self.webcam.off('active', callback);
		}
		
		return callback;
		
	})(self));
	
	this.invert = new Patch('invert2', {
		source: this.key1
	});
	
	// will want crossfade in here?
	
	this.move1 = new Patch('transform', {
		source: this.invert
	});
		
	this.move2 = new Patch('transform', {
		source: this.key1
	});
	
	this.mixer = new Patch('blend2', {
		top: this.move1,
		bottom: this.move2
	});
	
	this.target = s.target('#canvas');
	
	this.target.source = this.mixer.valueOf();
	this.mixer.on('load', function(newInput) {
		self.target.source = self.mixer;
	});
	
	this.startCount = 0;
	var start = function() {

		var buffer = self.mixer.effect.getTexture();
		if (!buffer) {
			console.warn('buffer is null :-(');
			if (self.startCount < 10) {
				setTimeout(start, 2000);
			}
		} else {
			self.move2.setInput('top', buffer);
			self.feedback = buffer;
		}
		
		s.go();
		
		self.emit('ready');
		
	}
	
	this.target.render(start);
	
	this.emit('load');
	
	return this;
}

Main.prototype = Object.create(EventEmitter.prototype);

Main.prototype.getControls = function() {
	var out = {},
			controls, data;
	for(var key in this) {
		if(this.hasOwnProperty(key) && this[key].controls) {
			controls = this[key].controls;
			
			out[key] = {};
			
			for(var ctl in controls) {
				if (!controls.hasOwnProperty(ctl)) continue;
				if (!controls[ctl].type) continue;
				data = controls[ctl];
				
				out[key][ctl] = {
					type: data.type,
					defaultValue: data.defaultValue,
					value: data.value,
					title: data.title
				};
				
				if (data.type === 'number' || data.type === 'vector') {
					$.extend(out[key][ctl], {
						min: data.min,
						max: data.max,
						step: data.step						
					});
				}
				
				if (data.type === 'enum') {
					out[key][ctl].options = data.options;
				}
			}
		}
	}
	
	return out;
}


var MATTE_QUANTIZE = 9;
var MATTE_NUM = 1;
Main.prototype.attachIO = function(socket) {
	var self = this;
	for(var key in this) {
		if(this.hasOwnProperty(key) && this[key].attachIO) {
			this[key].attachIO(socket, key, this);
		}
	}	
	
	socket.on('record', function(isDown) {
		var effect = main.mixer,
				ctl = effect.controls.mode,
				options = ctl.options,
				n = options.length -1,
				i = Math.round(Math.random()*n);
		console.log(i, n, options[i]);
		if(isDown) {
			effect.set('mode', options[i][0]);
			socket.emit('log', 'set mode to ' + options[i][0]);
			//socket.emit('set', {path: 'mixer.mode', value: options[i][0]});
			socket.emit('mixer.mode', options[i][0]);
		} else {
			
		}
	});
	
	/*
	socket.on('loop', function(isDown) {
		console.log(isDown);
		if(isDown) {
			main.mixer.horizontalMatte(MATTE_QUANTIZE, MATTE_NUM);
		} else {
			
		}
	});
	
	socket.on('stop', function(isDown) {
		console.log(isDown);
		if(isDown) {
			main.mixer.clearMatte();
		} else {
			
		}
	});
	
	*/
	socket.emit('controls', this.getControls() );
	
}