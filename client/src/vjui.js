'use strict';

(function( $ ) {

	var ctls = {};

	var baseCtl = {
		label: 'default',
		spec: 'unipolar',
		template: '<div></div>',
		initialize: function(options) {},
		render: function() {},
		change: function() {},
		remove: function() {}
	}	

var Ctl = function(options) {
	
	this.el = $(options.template);
	
	this.render = options.render.bind(this);
	this.change = options.change.bind(this);
	this.remove = options.change.bind(this);

	options.initialize.call(this, options);

	if(options.parent) this.el.appendTo(options.parent);
	
	return this;
}

Ctl.library = {};

Ctl.define = function(name, definition) {
	
	if(Ctl.library[name]) {
		throw new Error('ui item already loaded: ' + name);
	}
	
	if(!definition) return;
	
	Ctl.library[name] = definition;
	
}


Ctl.define('button', {
	template: '<button class="cv-button">control</button>',
	initialize: function(options) {
		this.label = options.label;
		this.el.text(this.label);
		this.el.on('mousedown', options.down.bind(this));
		this.up = options.up.bind(this);
		
		this.momentary = (options.momentary != null) ? options.momentary : false;
		
		this.active = false;
	},
	down: function() {
		if (this.momentary) {
			this.render(true);
			this.change();
			$(document.body).on('mouseup', this.up);
		} else {
			this.render(!this.active);
			this.change();
		}
	},
	up: function() {
		this.render(false);
		this.change();
		$(document.body).off('mouseup', this.up);
	},
	render: function(value, normal) {
		this.active = !!value;
		this.el.toggleClass('cv-active', this.active);
	},
	change: function() {
		$(this).trigger('change:vjui', this.active, this.active);
	},
	remove: function() {
		this.el.remove();
	}
	
});

Ctl.define('label', {
	
	template: '<label class="cv-label cv-meter">control</label>',
	
	initialize: function(options) {
		this.el.text(options.label);
		this.label = options.label;
		this.spec = options.spec;
		this.isBipolar = (options.bipolar != null)
				? !!options.bipolar
				: (this.spec.min < 0);
		
	},
	render: function(value, normal) {
		var width = this.el.width(),
				range;
				
		if (isNaN(normal)) {
			if (!isNaN(value)) {
				normal = this.spec.unmap(value);
			} else {
			}
		}
		//this.el.text( this.label );
		
		if (this.isBipolar) {
			range = Math.abs( normal-0.5 ) * width;
			this.el.css({
				'background-size': Math.abs( range ).toFixed() + 'px',
				'background-position': (Math.min(normal, 0.5) * width).toFixed() + 'px center'
			});
		} else {
			this.el.css('background-size', (normal * width).toFixed() + 'px');
		}
		
	},
	
	title: 'label'
	
});

Ctl.define('range', {
	template: '<input class="cv-slider" type="range" min=0 max=1 value=0.5 step=0.001 />',
	polyfillTemplate: '<div class="cv-slider cv-slider-polyfill"><div class="cv-slider-handle"></div></div>',
	usePolyfill: true,
	initialize: function(options) {
	
	
		// test html5 support
		if( this.el.attr('type') != 'range' || (options.usePolyfill) ) {
			this.isPolyfill = true;
			this.polyfillDown = options.polyfillDown.bind(this);
			this.polyfillUpdate = options.polyfillUpdate.bind(this);
			this.polyfillRender = options.polyfillRender.bind(this);
			options.makePolyfill.call(this, options.polyfillTemplate);
			// TODO crap hack
			this.polyfill.appendTo(options.parent);
		}
	
		var spec = options.spec;
		if( spec.step ) this.el.step = Math.max( spec.step / (spec.max - spec.min), 0.00001 );
		this.el.on('change', this.change);
		this.spec = spec;
	},
	render: function(value, normal) {
		if (isNaN(normal)) {
			if (!isNaN(value)) {
				normal = this.spec.unmap(value);
			} else {
				return;
			}
		}
		this.el.val( parseFloat(normal) );
		
	},
	change: function() {
		var normal = parseFloat(this.el.val()),
				value = this.spec.map(normal);
		$(this).trigger('change:vjui', value, normal);
	},
	
	remove: function() {
		this.el.remove();
		if(this.polyfill) this.polyfill.remove();
	},
	makePolyfill: function(polyfillTemplate) {
		var self = this,
				polyfill = $(polyfillTemplate),
				handle = polyfill.find('.cv-slider-handle');
		
		this.polyfill = polyfill;
		
		this.el.hide();
		
		polyfill.on('mousedown touchstart', this.polyfillDown);
		
		this.render = this.polyfillRender;
		
		
	},
	polyfillRender: function(value, normal) {
		if (isNaN(normal)) {
			if (!isNaN(value)) {
				normal = this.spec.unmap(value);
			} else {
				return;
			}
		} else {
			normal = parseFloat(normal);
		}
		
		this.el.val( normal );
		
		var handle = this.polyfill.find('.cv-slider-handle'),
				handleWidth = handle.width(),
				rangeWidth = this.polyfill.width(),
				pos = normal * (rangeWidth - (handleWidth*0.5));
		
		handle.css('left', pos.toFixed() + 'px');
		
	},
	polyfillDown: function(evt) {
		var self = this,
				polyfill = this.polyfill,
				rangeWidth = this.polyfill.width(),
				handleWidth = this.polyfill.find('.cv-slider-handle').width(),
				currentEvent;

		evt.preventDefault();
		
		var currentEvt = evt,
				offset = polyfill.offset();
		
		var move = function(evt) {
				currentEvt = evt;
				evt.preventDefault();
				self.polyfillUpdate.call(self, evt, offset, handleWidth, rangeWidth);
		};
		var end = function(evt) {
				self.polyfillUpdate.call(self, currentEvt, offset, handleWidth, rangeWidth);
				$(document.body).off('mousemove touchmove', move);
				$(document.body).off('mouseup touchend', end);
		};
		
		$(document.body).on('mousemove touchmove', move);
		$(document.body).on('mouseup touchend', end);
	},
	polyfillUpdate: function(evt, offset, handleWidth, rangeWidth) {
		
		if (evt.touches && evt.touches.length) {
			evt = evt.touches[evt.touches.length - 1];
		}
		
		var x = Math.min(Math.max(0, evt.clientX - offset.left), rangeWidth),
				normal,
				value;
		
		normal = (x - handleWidth / 2) / (rangeWidth - handleWidth);
		value = this.spec.map(normal);
		this.render(value, normal);
		
		console.log(normal, value);
		
		this.change();
	}
});

var formatNumber = function( x, chars, maxPrecision, alwaysSign ) {
	chars || (chars = 8);
	(maxPrecision != null) || (maxPrecision = 3);
	
	var output = (x<0)
				? '-'
				: (alwaysSign)
				? '+'
				: '',
			num = Math.abs(x),
			places = 0,
			precision,
			padding;
	
	chars -= output.length;
	if(maxPrecision) chars -= 1; // leave room for decimal point
	
	while( num >= 1 ) {
		num /= 10;
		places += 1;
	}
	
	precision = Math.min( Math.max(chars - places, 0), maxPrecision );
	padding = Math.max( chars - places - precision, 0 );
	
	while(padding > 0) {
		output += ' ';
		padding -= 1;
	}
	
	return output + Math.abs(x).toFixed(precision);
};

Ctl.define('number', {
	template: '<input type="text" class="cv-number" value=0.5 />',
	initialize: function(options) {
		var spec = options.spec;
		
		this.precision = 2;
		this.chars = 6;
		this.maxPrecision = 2;
		this.alwaysSign = true;
		this.step = spec.step || 0.01;
		
		this.spec = spec;
		
		this.el.on('change', this.change);
		
		this.el.on('mousewheel', options.wheel.bind(this));
		this.el.on('keydown', options.keyStep.bind(this));
		
	},
	render: function(value, normal) {
		var val = this.spec.roundClamp(value);
		var str = formatNumber( val, this.chars, this.maxPrecision, this.alwaysSign );
		this.el.val(str);
	},
	change: function() {
		var str = this.el.val(),
				val = parseFloat( str.replace(/ /g,'') ),
				normal = this.spec.unmap(val);
		$(this).trigger('change:vjui', val, normal);
		
	},
	
	remove: function() {
		this.el.remove();
	},
	
	wheel: function(evt) {
		var event = evt.originalEvent,
				direction = (event.wheelDelta >= 0) ? 1 : -1,
				spec = this.spec,
				step = this.step * direction, // for normalized
				SHIFT_SCALE = 10,
				ALT_STEP = (spec.max - spec.min) / 16,
				value = parseFloat( this.el.val().replace(/ /g,'') ),
				normal = spec.unmap(value),
				output;
				
		evt.preventDefault();
						
		if( event.shiftKey ) {
			output = value + step*SHIFT_SCALE;
		}
		else if( event.altKey ) {
			output = value + ALT_STEP*direction;
		}
		else {
			output = value + step;
		}
		
		this.render(output);
		this.change();
		
		return false;
	},
	keyStep: function(evt) {
		var SHIFT_SCALE = 10,
				mul = ( evt.shiftKey )
					? 10
					: ( evt.altKey )
					? 0.1
					: 1,
				step = this.step * mul,
				val = parseFloat( this.el.val().replace(/ /g,'') );
		switch( evt.which ) {
			case 38: // up
				this.render( val + step );
			break;
			case 40: // down
				this.render( val - step );
			break;
		}
		
		this.change();
		
	}


});

Ctl.define('control', {
	template: '<div class="cv-control"></div>',
	initialize: function(options) {
		var self = this,
				el = this.el[0],
				spec = options.spec;
		var childOptions = {
			parent: this.el,
			spec: options.spec,
			label: options.label,
			bipolar: options.bipolar
		};
		
		this.spec = spec;
			
		this.children = {
			label: this.el.vjui('label', childOptions),
			slider: this.el.vjui('range', childOptions),
			number: this.el.vjui('number', childOptions),
		};
		
		$(this.children.slider).on('change:vjui', function(evt, value, normal) {
			$(self).trigger('change:vjui', value, normal);
			self.children.label.render(value);
			self.children.number.render(value);
		});
		
		$(this.children.number).on('change:vjui', function(evt, value, normal) {
			$(self).trigger('change:vjui', value, normal);
			self.children.label.render(value);
			self.children.slider.render(value);
		});
		
	},
	render: function(value, normal) {
		this.children.label.render(value, normal);
		this.children.slider.render(value, normal);
		this.children.number.render(value, normal);
	},
	change: function() {
		console.log('not finished');
	},
	
	remove: function() {
		this.children.label.remove();
		this.children.slider.remove();
		this.children.number.remove();
	}
});


	$.fn.vjui = function(uiName, options) {
		var parent = this,
				definition,
				data;
		
		if ((options == null) && $.isPlainObject(uiName)) {
			options = uiName;
			uiName = 'default';
		}
		
		uiName || (uiName = 'default');
		
		definition = Ctl.library[uiName];
		
		if (!definition) throw Error('control not found');
		
		// parent will get overridden if defined earlier
		
		data = $.extend({}, baseCtl, definition, options);
		
		if(!data.parent) {
			data.parent = this;
		}
		
		if( !(data.spec instanceof ControlSpec) ) {
			data.spec = new ControlSpec(data.spec);
		}
		return new Ctl(data);
		
	}


})(jQuery);





