(function() {
  var requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame ||
                              window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;
  window.requestAnimationFrame = requestAnimationFrame;
})();		
		
		
		var C3Vector = function(inputVector, spec) {
			var self = this,
					x = 0, y = 0;
			
			if (Array.isArray(inputVector)) {
				x = inputVector[0];
				y = inputVector[1];
			} else if (inputVector instanceof Object) {
				x = inputVector.x;
				y = inputVector.y;
			} else if (!isNaN(inputVector)) {
				x = inputVector;
				y = inputVector;
			}
			
			this.vector = {
				x: new CV(x, spec),
				y: new CV(y, spec)
			};
			
			Object.defineProperty(this, 'x', {
				get: function() { return self.vector.x; },
				set: function(v) { self.vector.x.value = v; }
			});
			
			Object.defineProperty(this, 'y', {
				get: function() { return self.vector.y; },
				set: function(v) { self.vector.y.value = v; }
			});
			
			this.vector.x.change(function() {
				self.trigger.apply(self, arguments);
			});
			
			this.vector.y.change(function() {
				self.trigger.apply(self, arguments);
			});
			
			return this;
			
		}
		
		C3Vector.prototype.tolerance = 1/256; // ignore if change is less than this
		C3Vector.prototype.trigger = function(event, key, value) {
			var events = this.events, i, n;

			event || (event = 'change');
			
			if (events != null) {
				for (i = 0, n = events.length; i < n; i++) {
					events[i].call(this, event, key, value);
				}
			}
		};

		C3Vector.prototype.change = function(fn) {
			
			this.events || (this.events = []);
			
			if (this.events.indexOf(fn) < 0) {
				this.events.push(fn);
			}
			
		};
		
		C3Vector.prototype.toArray = function() {
			return [this.x.value, this.y.value];
		}
		
		C3Vector.prototype.set = function( key, value, isNormalized, silent ) {
			var vector = this.vector;
			
			if (key.toString() === key) {
				vector[key].set(value, isNormalized, true);
			} else if (key instanceof Object) {
				
				if (silent == null) {
					silent = isNormalized;
					isNormalized = value;
				}
			
				('x' in key) && vector.x.set(key.x, isNormalized, true);
				('y' in key) && vector.y.set(key.y, isNormalized, true);
			}
			
			if(!silent) {
				this.trigger('change', '*');
			}
			
		}



		var C3Color = function(inputColor) {
			var self = this,
					color = {r: 0, g: 0, b: 0, h: 0, s: 0, l: 0};
			
			this.color = color;
			
			if (Array.isArray(inputColor)) {
				this.set({
					r: inputColor[0],
					g: inputColor[1],
					b: inputColor[2]
				}, true);
			} else if (inputColor instanceof Object) {
				this.set(inputColor, true); // silent set
			}
			
			for (var key in this.color) {
				if (this.color.hasOwnProperty(key)) {
					Object.defineProperty(this, key, {
						enumerable: true, 
						configurable: true,
						get: (function (key) { return self.color[key]; }).bind(self, key),
						set: self.setComponent.bind(self, key)
					});
				}
			}
			
			return this;
			
		}
		
		C3Color.prototype.tolerance = 1/256; // ignore if change is less than this
		C3Color.prototype.trigger = function(event, key, value) {
			var events = this.events, i, n;

			event || (event = 'change');
			
			if (events != null) {
				for (i = 0, n = events.length; i < n; i++) {
					events[i].call(this, event, key, value);
				}
			}
		};

		C3Color.prototype.change = function(fn) {
			
			this.events || (this.events = []);
			
			if (this.events.indexOf(fn) < 0) {
				this.events.push(fn);
			}
			
		};
				
		C3Color.prototype.setComponent = function( key, value ) {
			var color = this.color;
			
			if( Math.abs(color[key] - value) < this.tolerance ) return false;
			
			color[key] = Math.round(Math.min(Math.max(0, value), 1)*256)/256; // clamp and round
			
			// if not already black then update hsv
			if ( color.l === 0 && /^[rgb]/.test(key) ) {
				console.log('not updating');
			} else {
				this.update( key );
			}
			
			this.trigger('change', key, color[key]*256);
			
			return true;
			
		}
		C3Color.prototype.update = function( key ) {

			switch(key) {
				case 'h':
				case 's':
				case 'l':
					this.HSLtoRGB();
				break;
				
				case 'r':
				case 'g':
				case 'b':
					this.RGBtoHSL();
				break;
			}

		}
		
		C3Color.prototype.set = function( key, value, silent ) {
			var color = this.color,
					regex = /^[rgbhslv]/,
					isrgb = /^[rgb]/,
					ishsl = /^[hsl]/,
					updateRGB = false,
					updateHSL = false;
			
			if (key.toString() === key && regex.test(key)) {
				color[key] = value;
				this.update(key);
			} else if (key instanceof Object) {
			
				if (silent == null) silent = value;
			
				for (var k in key) {
					if (key.hasOwnProperty(k) && regex.test(k)) {
						if (isrgb.test(k)) updateRGB = true;
						else if (ishsl.test(k)) updateHSL = true;
						color[k] = key[k];
					}
				}
				
				if (updateRGB && !updateHSL) this.update('r');
				else if (updateHSL && !updateRGB) this.update('h');
				// else don't do anything, assume full update
			}
			
			if(!silent) {
				this.trigger('change', '*');
			}
			
		}
		// culled from https://github.com/timoxley/color-convert/blob/master/index.js

		C3Color.prototype.RGBtoHSV = function() {
			var color = this.color,
					r = color.r, g = color.g, b = color.b,
					max = Math.max(r, g, b),
					min = Math.min(r, g, b),
					h = max, s = max, v = max,
					d = max - min;

			s = max == 0 ? 0 : d / max;

			if(max == min){
				h = 0; // achromatic
			}else{
				switch(max){
					case r: h = (g - b) / d + (g < b ? 6 : 0); break;
					case g: h = (b - r) / d + 2; break;
					case b: h = (r - g) / d + 4; break;
				}
				h /= 6;
			}
			
			color.h = h;
			color.s = s;
			color.v = v;
			
			return color;
		}

		/**
		 * Converts an HSV color value to RGB. Conversion formula
		 * adapted from http://en.wikipedia.org/wiki/HSV_color_space.
		 * Assumes h, s, and v are contained in the set [0, 1] and
		 * returns r, g, and b in the set [0, 255].
		 *
		 * @param {Number} h The hue
		 * @param {Number} s The saturation
		 * @param {Number} v The value
		 * @return {Array} The RGB representation
		 * @api public
		 */

		C3Color.prototype.HSVtoRGB = function(){
			var color = this.color,
					h = color.h, s = color.s, v = color.v,
					i = Math.floor(h * 6),
					f = h * 6 - i,
					p = v * (1 - s),
					q = v * (1 - f * s),
					t = v * (1 - (1 - f) * s),
					r, g, b;

			switch(i % 6) {
				case 0: r = v, g = t, b = p; break;
				case 1: r = q, g = v, b = p; break;
				case 2: r = p, g = v, b = t; break;
				case 3: r = p, g = q, b = v; break;
				case 4: r = t, g = p, b = v; break;
				case 5: r = v, g = p, b = q; break;
			}

			color.r = r;
			color.g = g;
			color.b = b;
			
			return color;
		}
		
				
		C3Color.prototype.RGBtoHSL = function(){
			var color = this.color,
					r = color.r, g = color.g, b = color.b,
					max = Math.max(r, g, b),
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

			color.h = h;
			color.s = s;
			color.l = l;
			
			return color;
		}

		/**
		 * Converts an HSL color value to RGB. Conversion formula
		 * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
		 * Assumes h, s, and l are contained in the set [0, 1] and
		 * returns r, g, and b in the set [0, 255].
		 *
		 * @param {Number} h The hue
		 * @param {Number} s The saturation
		 * @param {Number} l The lightness
		 * @return {Array} The RGB representation
		 * @api public
		 */
		
		C3Color.prototype.HSLtoRGB = (function() {
			hue2rgb = function (p, q, t) {
				if(t < 0) t += 1;
				if(t > 1) t -= 1;
				if(t < 1/6) return p + (q - p) * 6 * t;
				if(t < 1/2) return q;
				if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
				return p;
			}
			
			return function () {
				var color = this.color,
						h = color.h, s = color.s, l = color.l,
						r, g, b,
						q, p;

				if(s == 0){
					r = g = b = l; // achromatic
				} else {
				
					q = l < 0.5 ? l * (1 + s) : l + s - l * s;
					p = 2 * l - q;
					
					r = hue2rgb(p, q, h + 1/3);
					g = hue2rgb(p, q, h);
					b = hue2rgb(p, q, h - 1/3);
				}

				color.r = r;
				color.g = g;
				color.b = b;
				
				return color;

			}
		})();

		
		C3Color.prototype.toString = function() {
			var color = this.color,
					hex = ( color.r * 255 ) << 16 ^ ( color.g * 255 ) << 8 ^ ( color.b * 255 ) << 0;
			return '#' + ( '000000' + hex.toString(16) ).slice( -6 );
		}
		
		C3Color.prototype.toArray = function() {
			var color = this.color;
			
			return [color.r, color.g, color.b, 1.0];
		}
		
		widgets = {
			number: function(options) {
				options || (options = {});
				
				var obj = {},
						container = options.container || '#controls';
				
				obj.value = options.cv || new CV(options.defaultValue, { min: options.min, max: options.max });
				
				obj.pane = new Interface.Panel({ container: container, useRelativeSizesAndPositions: true });
				obj.slider = new Interface.Slider({
					label: options.title,
					isVertical: false,
					value: options.defaultValue || 0,
					bounds: [0, 0, 1, 1],
					min: (options.min != null) ? options.min : 0,
					max: (options.max != null) ? options.max : 1,
					target: obj.value,
					key: 'value'
				});
				obj.pane.add(obj.slider);
				
				return obj;
			},
			boolean: function(options) {
				options || (options = {});
				var obj = {},
						container = options.container || '#controls';
				
				obj.el = document.createElement('input');
				obj.el.type = 'checkbox';
				
				$(container).append('<label>' + options.title + '</label>');
				$(container).append(obj.el);
				
				return obj;
				
			},
			enum: function (options) {
				options || (options = {});
				
				var obj = {},
						container = options.container || '#controls';
				
				
				obj.value = '';
				obj.cv = new CV(0, {min: 0, max: options.options.length-1, step: 1});
				obj.options = options.options.map(function(pair) {
					return pair[0];
				});
				obj.pane = new Interface.Panel({ container: container, useRelativeSizesAndPositions: true });
				obj.menu = new Interface.Menu({
					bound: [0, 0, 1, 1],
					options: obj.options,
					target: obj,
					key: 'value',
					onvaluechange: function() {
						obj.cv.trigger('change', obj.value);
					}
				});
				obj.pane.add(obj.menu);
				return obj;
				
			},
			vector: function (options) {
				options || (options = {});
				
				var obj = {},
						container = options.container || '#controls',
						spec = {
							min: (options.min != null) ? options.min : -1,
							max: (options.max != null) ? options.max : -1,
							step: (options.step != null) ? options.step : 0,
						};
				
				if (options.dimensions > 2) {
					console.warn('only using 2d of vector');
				}
				
				obj.value = new C3Vector(options.value || options.defaultValue, spec);
				
				obj.pane = new Interface.Panel({ container: container, useRelativeSizesAndPositions: true });
				obj.label = new Interface.Label({
					value: options.title,
					size: 12,
					bounds: [0, 0, 1, 0.1]
				});
				obj.xy = new Interface.XY({
					x: obj.value.x.normal,
					y: obj.value.y.normal,
					usePhysics: false,
					keys: { x: 'x', y: 'y' },
					numChildren: 1,
					background: 'rgba(0,0,0,0.5)',
					fill: 'rgba(127,127,127,0.5)',
					//stroke: '#fff',
					bounds: [0, 0, 1, 1],
					onvaluechange: function() {
						var pos = obj.xy.values[0];
						
						obj.value.set({
							x: pos.x,
							y: 1.0 - pos.y
						}, true);
					}
				});
				obj.pane.add(obj.label);
				obj.pane.add(obj.xy);
				
				return obj;
				
			},
			color: function(options) {
				options || (options = {});
				
				var obj = {},
						container = options.container || '#controls';
				
				obj.value = new C3Color(options.value || options.defaultValue);
				
				obj.pane = new Interface.Panel({ container: container, useRelativeSizesAndPositions: true });
				obj.label = new Interface.Label({
					value: options.title,
					size: 12,
					bounds: [0, 0, 1, 0.1]
				});
				obj.xy = new Interface.XY({
					x: obj.value.h,
					y: obj.value.v,
					usePhysics: false,
					keys: { x: 'h', y: 'l' },
					numChildren: 1,
					background: obj.value.toString(),
					fill: 'rgba(127,127,127,0.1)',
					stroke: '#fff',
					bounds: [0, 0, 0.8, 1],
					//bounds: [0, 0, 1.0, 0.8],
					onvaluechange: function() {
						var pos = obj.xy.values[0];
						
						obj.value.set({
							h: pos.x,
							s: obj.z.value,
							l: 1.0 - pos.y
						});
					}
				});
				obj.z = new Interface.Slider({
					//bounds: [0, 0.8, 1.0, 0.2],
					bounds: [0.8, 0, 0.2, 1],
					isVertical: true,
					label: 'saturation',
					target: obj.value,
					key: 's',
					value: 0.5
				});
				
				obj.pane.add(obj.label);
				obj.pane.add(obj.xy)
				obj.pane.add(obj.z);
				
				obj.value.change(function() {
					var c = obj.value,
							colorString = c.toString(),
							pos = obj.xy.values[0];
					
					pos.x = c.h;
					pos.y = 1 - c.l;
					
					obj.xy.background = colorString;
					
					obj.z.setValue.call(obj.z, c.s, false);
					obj.xy.refresh.call(obj.xy);
					
				});
				
				return obj;
			}
		}
	