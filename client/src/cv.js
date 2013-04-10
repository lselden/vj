'use strict';

var CV, ControlSpec, 
	clamp,
	nextHighestPowerOf,
	_hasOwnProperty = {}.hasOwnProperty,
	MATH_E_MINUS_ONE = Math.E - 1;

clamp = function(value, min, max) {
		return Math.min(Math.max(min, value), max);
	};

nextHighestPowerOf = function(num, base) {
	return Math.pow(base, Math.ceil(Math.log(Math.abs(num)) / Math.log(base))) * (num < 0 ? -1 : 1);
};

/**
* ControlSpec
*/

var ControlSpec = function(spec) {
	var key, 
			_ = {
				min: 0,
				max: 1,
				step: 0,
				warp: 'lin',
				events: null
			};
	
	spec || (spec = {});
			
	Object.defineProperty(this, '_', {
		enumerable: false,
		configurable: true,
		writable: true,
		value: _
	});
	
	if (typeof spec === 'string') {
		spec = ControlSpec.specs[spec] || {};
	}
	
	// copy over spec values
	for (key in _) {
		if (!_hasOwnProperty.call(_, key)) continue;
		if (spec[key] != null) _[key] = spec[key];
	}
		
	this._ = _;
	
	this.initial = (spec.initial != null) ? spec.initial : Math.max(_.min, 0);
	this.name = (spec.name != null) ? spec.name : 'spec';
	
	Object.defineProperties(this, {
		min: {
			enumerable: true, configurable: true,
			get: function() { return this._.min; },
			set: function(value) {
				var min = this._.min,
						max = this._.max;

				if (isNaN(value) || value === max) {
					return min;
				}
				if (value > max) {
					this._.min = min;
					this._.max = value;
				} else {
					this._.min = value;
				}
				return this.trigger('change.min', this._.min);
			}
		},
		max: {
			enumerable: true, configurable: true,
			get: function() {	return this._.max; },
			set: function(value) {
				var min = this._.min,
						max = this._.max;

				if (isNaN(value) || value === min) {
					return max;
				}
				if (value < this._.min) {
					this._.max = min;
					this._.min = value;
				} else {
					this._.max = value;
				}
				return this.trigger('change.max', this._.max);
			}
		},
		step: {
			enumerable: true, configurable: true,
			get: function() {
				return this._.step;
			},
			set: function(value) {
				if (isNaN(value)) {
					return this._.step;
				}
				this._.step = clamp(value, 0, this._.max - this._.min);
				return this.trigger('change.step', this._.step);
			}
		},
		warp: {
			enumerable: true, configurable: true,
			get: function() { return this._.warp; },
			set: function(value) {
				if (!value) {
					return;
				}
				this._.warp = value;
				switch (value) {
					case 'exp':
						this.map = ControlSpec.warps.exp.map;
						this.unmap = ControlSpec.warps.exp.unmap;
						break;
					case 'lin':
						this.map = ControlSpec.warps.lin.map;
						this.unmap = ControlSpec.warps.lin.unmap;
						break;
					default:
						this.map = ControlSpec.warps.lin.map;
						this.unmap = ControlSpec.warps.lin.unmap;
						console.warn('defaulting warp to linear');
				}
				this.map = this.map.bind(this);
				this.unmap = this.unmap.bind(this);
				return this.trigger('change.warp', value);
			}
		}
	});
	
	this.warp = this._.warp; // initialize map and unmap
	
	return this;
}

ControlSpec.prototype.roundClamp = function(val) {
	var _ = this._,
			step = _.step;
	
	if (typeof val === 'string') {
		val = parseFloat(val);
	}
	if (step) {
		val = Math.round(val / step) * step;
	}
	return clamp(val, _.min, _.max);
};

ControlSpec.prototype.set = function(key, val, silent) {
	if (!silent) {
		this[key] = val;
	} else {
		this._[key] = val;
	}
};

ControlSpec.prototype.get = function(key) {
	return this[key];
};

ControlSpec.prototype.trigger = function(event, newval) {
	var events = this._.events, i, n;

	event || (event = 'change');
	
	if (events != null) {
		for (i = 0, n = events.length; i < n; i++) {
			events[i].call(this, event, newval);
		}
	}
};

ControlSpec.prototype.change = function(fn) {
	var _ = this._;
	_.events || (_.events = []);
	
	if (_.events.indexOf(fn) < 0) {
		_.events.push(fn);
	}
	
};

ControlSpec.prototype.toString = function() {
	return "[object ControlSpec]";
};

ControlSpec.prototype.toJSON = function() {
	return {
		min: this.min,
		max: this.max,
		step: this.step,
		initial: this.initial,
		warp: this.warp,
		name: this.name
	};
};

ControlSpec.warps = {
	lin: {
		map: function(x) {
			var min = this.min,
					max = this.max;
			if (x <= 0) {
				return min;
			} else if (x >= 1) {
				return max;
			} else {
				return x * (max - min) + min;
			}
		},
		unmap: function(x) {
			var min = this.min,
					max = this.max;
			if (x <= min) {
				return 0;
			} else if (x >= max) {
				return 1;
			} else {
				return (x - min) / (max - min);
			}
		}
	},
	exp: {
		map: function(x) {
			var min = this.min,
					max = this.max,
					expX;
			if (x <= 0) return min;
			if (x >= 1) return max;
			
			expX = (Math.exp(x) - 1) / MATH_E_MINUS_ONE;
			return expX * (max-min) + min;
		},
		unmap: function(x) {
			var min = this.min,
					max = this.max,
					linX;
			
			if (x < min) return 0;
			if (x > max) return 1;
			
			linX = (x - min)/(max-min);
			return Math.log( (MATH_E_MINUS_ONE * linX) + 1);
		}
			
	},
		/* easing */
	linear: { 
		map: function(min, max, v) { return v * (max-min) + min; },
		unmap: function(min, max, v) { return (v-min) / (max-min); }
	},
	quadIn: {
		map: function(min, max, v) { return (max-min) * v*v + min; },
		unmap: function(min, max, v) { return Math.sqrt( (v-min)/(max-min) );	}
	},
	quadOut: {
		map: function(min, max, v) { return min - v*(v-2) * (max-min); },
		unmap: function(min, max, v) { return 1 - Math.sqrt( (v-max)*(max-min) )/(max-min); }
	}

};

ControlSpec.specs = {
	unipolar: { min: 0, max: 1, warp: 'lin', step: 0, initial: 0 },
	bipolar: { min: -1, max: 1, initial: 0},
	
	bool: { min: 0, max: 1, warp: 'lin', step: 1, initial: 0},
	rotate: { min: -180, max: 180, warp: 'lin', step: 1, initial: 0 },

	freq: {min: 20, max: 20000, warp: 'exp', step: 0, initial: 440},
	lofreq: {min: 0.1, max: 100, warp: 'exp', step: 0, initial: 6},
	midfreq: {min: 25, max: 4200, warp: 'exp', step: 0, initial: 440},
	widefreq: {min: 0.1, max: 20000, warp: 'exp', step: 0, initial: 440},
	phase: {min: 0, max: 360},
	rq: {min: 0.001, max: 2, warp: 'exp', step: 0, initial: 0.707},
	
	midi: {min: 0, max: 127, step: 1, initial: 64},
	midinote: {min: 0, max: 127, step: 1, initial: 60},
	midivelocity: {min: 1, max: 127, initial: 64},

	amp: {min: 0, max: 1, warp: 'amp', step: 0, initial: 0},
	boostcut: {min: -20, max: 20, initial: 0},

	pan: {min: -1, max: 1, initial: 0},
	detune: {min: -20, max: 20, initial: 0},
	rate: {min: 0.125, max: 8, warp: 'exp', step: 0, initial: 1},
	beats: {min: 0, max: 20},
	delay: {min: 0.0001, max: 1, warp: 'exp', step: 0, initial: 0.3 },
	
	// 8bit
	//'8bit': {min: -255, max: 255, warp: 'lin', step: 1, initial 0 },
	// 16bit values
	none: {min: -1 << 12, max: 1 << 12, warp: 'lin', step: 0, initial: 0 },
	integer: {min: -1024, max: 1024, warp: 'lin', step: 1, initial: 0 },
	float: {min: -1024, max: 1024, warp: 'lin', step: 0, initial: 0 }
};

var CV = function(value, spec) {
	var self = this;
	
	Object.defineProperty(this, '_', {
		enumerable: false,
		configurable: true,
		writable: true,
		value: { normal: 0, value: 0, events: null }
	});
	
	if (!spec && isNaN(value)) {
		this.spec = new ControlSpec(value);
	} else {
		this.spec = new ControlSpec(spec);
	}
	if (!isNaN(value)) {
		if (!spec) { // we're using default spec
			if (value < 0) {
				this.spec.min = nextHighestPowerOf(value, 10);
				this.spec.max = -1 * this.spec.min;
			}
			
			if (value > this.spec.max) {
				this.spec.max = nextHighestPowerOf(value, 10);
			}
		}
	} else {
		value = this.spec.initial;
	}
	
	this._.value = this.spec.roundClamp(value);
	this._.normal = this.spec.unmap(this._.value);

	Object.defineProperties(this, {
		normal: {
			enumerable: true, configurable: true,
			get: function() { return this._.normal; },
			set: function(norm) {
				var _ = self._,
						old = _.normal;
						
				if (typeof norm === 'string') {
					norm = parseFloat(norm);
				}
				if (isNaN(norm)) {
					return old;
				}
				norm = clamp(norm, 0, 1);
				_.normal = norm;
				_.value = self.spec.map(norm);
				if (old !== norm) {
					return self.trigger('change.normal', self._.value, norm);
				}
			}
		},
		value: {
			enumerable: true,
			configurable: true,
			get: function() { return this._.value; },
			set: function(newval) {
				var _ = self._,
						old = _.value;

				if (typeof newval === 'string') {
					newval = parseFloat(newval);
				}
				if (isNaN(newval)) {
					return old;
				}
				_.normal = self.spec.unmap(newval);
				_.value = newval = self.spec.roundClamp(newval);
				if (old !== newval) {
					return self.trigger('change', newval, _.normal);
				}
			}
		}
	});
	
	this.spec.change(function() { self.value = self.value; }); // updates value
	
	return this;
	
}

// inherit all of Number's functions
CV.prototype = Object.create( Number.prototype );

// usage:
// set( 'some key', 0.3, true);
// set( 0.3, true )
// set( 0.3 )
CV.prototype.set = function(x, isNormalized, silent) {
	if (isNormalized == null) {
		isNormalized = false;
	}
	if (silent == null) {
	silent = false;
	}
	if (isNormalized) {
		this.normal = x;
	} else {
		this.value = x;
	}
}
CV.prototype.get = function(isNormalized) {
	if (isNormalized) { // only true (not null)
		return this._.normal;
	} else {
		return this._.value;
	}
};


CV.prototype.trigger = function(event, newval, newnorm) {
	var events = this._.events, i, n;

	event || (event = 'change');
	
	if (events != null) {
		for (i = 0, n = events.length; i < n; i++) {
			events[i].call(this, event, newval, newnorm);
		}
	}
};

CV.prototype.change = function(fn) {
	var _ = this._;
	_.events || (_.events = []);
	
	if (_.events.indexOf(fn) < 0) {
		_.events.push(fn);
	}
	
};

CV.prototype.valueOf = function() {
	return this._.value;
}

CV.prototype.toString = function() {
	return this._.value.toString();
}

CV.prototype.toJSON = function() {
	return {
		value: Math.round(this._.value * 1000) / 1000, // 3 decimal places
		normalized: Math.round(this._.normal * 1000) / 1000,
		spec: this.spec.toJSON()
	};
}

if (typeof exports !== 'undefined' && exports !== null) {
	exports = exports || {};
	exports.ControlSpec = ControlSpec;
	exports.CV = CV;
} else {
	this.ControlSpec = ControlSpec;
	this.CV = CV;
}





