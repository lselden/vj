var fs = require('fs'),
		http = require('http'),
		socketio = require('socket.io'),
		net = require('net'),
		path = require('path'),
		url = require('url'),
		connect = require('connect'),
		util = require('util'),
		_ = require('underscore'),
		midi = require('./midi.input.js');
		
		
var PORT = 8080;
		
var base = 'client/';
var files = fs.readdirSync(base + 'assets/');

files = files.filter(function(file) {
	return /\./.test(file);
});

var assets = _(files).map(function(file, i) {
	return {
		index: i,
		name: file.split('.')[0],
		path: 'assets/' + file,
		thumb: 'assets/thumbs/' + file.split('.')[0] + '.jpg'
	};
});

//var __dirname = __dirname || process.cwd();

var app = connect();
var server = app.listen(PORT);

var io = socketio.listen(server);

app.use(function(req, res, next) {
	//console.log(req.url);
	next();
});

app.use('/', connect.static(__dirname + '/' + base));
app.use('/videos', function(req, res, next) {
	res.writeHead(200, {
		'Content-Type': 'application/json' 
	});
	res.end( JSON.stringify(assets) );
	next();
});
	

//app.listen(80);

var clients = {};
var vjData = {};

io.sockets.on('connection', function (socket) {
  socket.emit('hello', { 
		hello: 'world',
		assets: assets,
		controller: midi.controls,
		vjdata: vjData
	});
	socket.on('pageinfo', function(data) {
		clients[data.name] = socket;
	});
  socket.on('video', function (data) {
		var index = data.index;
		var name = data.name;
    socket.broadcast.emit(data.target + '.' + 'src', data.path);
		console.log('change video', data);
  });
	socket.on('source', function(data) {
		socket.broadcast.emit(data.target + '.' + 'source', data.source);
		console.log('change source', data);
	});
	socket.on('keyevent', function(key) {
		socket.broadcast.emit('keyevent', key);
	});
	
	socket.on('log', function() {
		console.log(arguments);
	});
	
	socket.on('set', function(data) {
		socket.broadcast.emit(data.path, data.value);
	});
	socket.on('bypass', function(data) {
		socket.broadcast.emit(data.path + '.bypass', data.value);
	});
	/*
	_(ccs).each(function(data, cc) {
		socket.on(data.name, function(msg) {
			ccs[cc].value = msg;
			console.log(data.name, msg);
			socket.broadcast.emit(data.name, msg);
		});
	});
	*/
	socket.on('controls', function(data) {
		var flat = {};
		
		_(data).each(function(patch, key) {
			_(patch).each(function(ctl, ctlName) {
				var flatKey = key + '.' + ctlName;
				
				flat[flatKey] = ctl;
				
			});
		});
		
		//console.log(util.inspect(flat, true, 2, true));
		socket.broadcast.emit('vjdata', vjData);
		
		vjData.patches = data;
		vjData.flat = flat;
		
	});
	
});

midi.input.on('ready', function(name) {
	console.log('midi ready', name);
});

midi.controls[0].loop.path = 'invert.invert';

midi.controls[0].stop.path = 'invert.mute';
midi.controls[0].stop.momentary = true;

midi.controls[0].rec.path = 'mixer.mode';
midi.controls[0].rec.momentary = true;

midi.controls[1].fade.path = 'key1.tolerance';
midi.controls[1].knob.path = 'key1.softness';
midi.controls[1].b_hi.path = 'key1.invert';

midi.controls[1].b_lo.path = 'key1.bypass';

midi.controls[2].fade.path = 'key1.color.l';
midi.controls[2].knob.path = 'key1.brightness';
midi.controls[3].fade.path = 'move1.size';
midi.controls[3].knob.path = 'move1.rotation';
midi.controls[4].fade.path = 'key2.tolerance';
midi.controls[4].knob.path = 'key2.softness';
midi.controls[4].b_hi.path = 'key2.invert';
midi.controls[4].b_lo.path = 'key2.bypass';

midi.controls[5].fade.path = 'key2.color.l';
midi.controls[5].knob.path = 'key2.brightness';
midi.controls[6].fade.path = 'move2.size';
midi.controls[6].knob.path = 'move2.rotation';

midi.controls[7].fade.path = 'move2.offset.y';
midi.controls[7].fade.min = -1;
midi.controls[7].fade.max = 1;

midi.controls[7].knob.path = 'move2.offset.x';
midi.controls[7].knob.min = -1;
midi.controls[7].knob.max = 1;


midi.controls[8].fade.path = 'move2.gain';
midi.controls[8].knob.path = 'move1.gain';
midi.controls[9].fade.path = 'mixer.opacity';

midi.input.on('message', function(deltaTime, message) {
	//console.log('m:' + message + ' d:' + deltaTime.toFixed(3));
	var data = message,
			cc = data[1],
			val = data[2]/127,
			ctlMap = midi.cc[cc],
			ctlGroup = midi.controls[ctlMap[0]],
			ctl = (ctlGroup) ? ctlGroup[ctlMap[1]] : null,
			messageName = (ctl) ? (ctl.path || ctl.name) : null;
	
	
	if(ctl) {
		if(vjData && vjData.flat) {
			//console.log(ctl.path || ctl.name, val, vjData.flat[ctl.path]);
		}
		
		if((ctl.min != null) && (ctl.max != null)) {
			val = val*(ctl.max - ctl.min) + ctl.min;
		}
		
		if(ctl.type === 'boolean' && !ctl.momentary) {
			console.log('toggle', ctl.currentValue, val, deltaTime);
			if(val) {
				if(ctl.currentValue) {
					val = 0;
					ctl.currentValue = 0;
				} else {
					ctl.currentValue = 127;
				}
			} else {
				return; // ignore
			}
			
		}
		
		if(ctl.name === 'record') {
			console.log(deltaTime.toFixed(3));
			if(vjData) {
				try {
					var options = vjData.patches.mixer.mode.options;
					
					
					if(val) {
						val = Math.floor(Math.random()*options.length);
						
						_(clients).each(function(socket) {
							socket.emit('mixer.mode', options[val][0]);
						});
					} else if(deltaTime > 1.5) {
						
						_(clients).each(function(socket) {
							socket.emit('mixer.mode', options[0][0]);
						});
						
					}
					
					return;
				} catch(e) {
					console.warn('couldnt set mode', e);
				}
			}
		}
		
		_(clients).each(function(socket) {
			socket.emit(ctl.path || ctl.name, val);
		});
	} else {
		console.log('unknown', cc, val);
	}
		
}); 

// Sysex, timing, and active sensing messages are ignored
// by default. To enable these message types, pass false for
// the appropriate type in the function below.
// Order: (Sysex, Timing, Active Sensing)
midi.input.ignoreTypes(false, false, false);


// Close the port when done.
process.on('exit', function() {
	console.log('we exited');
	input.closePort();
});

