
var midi = require('midi'),
		_ = require('underscore');

var input = new midi.input();

function initializeMidi() {
	if(input.getPortCount()) {
	
		input.openPort(0);
		input.emit('ready', input.getPortName(0));
		
	} else {
		setTimeout(initializeMidi, 5000);
	}
}

initializeMidi();



var CCMap = {
	47: [0, 'rwd'],
	48: [0, 'fwd'],
	45: [0, 'play'],
	49: [0, 'loop'],
	46: [0, 'stop'],
	44: [0, 'rec']
};

var ControllerLayout = {
	fader: _.range(2, 6+1, 1).concat(8,9,12,13).map(function(ccNumber, i) {
		CCMap[ccNumber] = [i+1, 'fade'];
		return {
			cc: ccNumber,
			type: 'number',
			name: 'fade' + (i+1)
		};
	}),
	knob: _.range(14, 22+1, 1).map(function(ccNumber, i) {
		CCMap[ccNumber] = [i+1, 'knob'];
		return {
			cc: ccNumber,
			type: 'number',
			name: 'knob' + (i+1)
		};
	}),
	btnhi: _.range(23, 31+1, 1).map(function(ccNumber, i) {
		CCMap[ccNumber] = [i+1, 'b_hi'];
		return {
			cc: ccNumber,
			type: 'boolean',
			name: 'b_hi' + (i+1)
		};
	}),
	btnlo: _.range(33, 41+1, 1).map(function(ccNumber, i) {
		CCMap[ccNumber] = [i+1, 'b_lo'];
		return {
			cc: ccNumber,
			type: 'boolean',
			name: 'b_lo' + (i+1)
		};
	}),
	rwd: { cc: 47, type: 'boolean', name: 'rewind'	},
	fwd: { cc: 48, type: 'boolean', name: 'forward'	},
	play: { cc: 45, type: 'boolean', name: 'play'	},
	loop: { cc: 49, type: 'boolean', name: 'loop'	},
	stop: { cc: 46, type: 'boolean', name: 'stop'	},
	rec: { cc: 44, type: 'boolean', name: 'record'	}
};

var controls = [];

// main controls
controls[0] = {
	rwd: { cc: 47, type: 'boolean', name: 'rewind'	},
	fwd: { cc: 48, type: 'boolean', name: 'forward'	},
	play: { cc: 45, type: 'boolean', name: 'play'	},
	loop: { cc: 49, type: 'boolean', name: 'loop'	},
	stop: { cc: 46, type: 'boolean', name: 'stop'	},
	rec: { cc: 44, type: 'boolean', name: 'record'	}
};

_.range(1, 10, 1).forEach(function(ctlIndex, index) {
	controls[ctlIndex] = {
		fade: ControllerLayout.fader[index],
		knob: ControllerLayout.knob[index],
		b_lo: ControllerLayout.btnlo[index],
		b_hi: ControllerLayout.btnhi[index]
	};
});

module.exports = {
	input: input,
	cc: CCMap,
	layout: ControllerLayout,
	controls: controls
};

