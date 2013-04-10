
var MakeThatGifDance = function() {
	var height = 360;
	var url = 'assets/peanuts.gif',
	var id = 'gifsource';
	var self = this;
	
	this.backgroundColor = '#fff';

	this.init = function() {
		this.$img = $('<img>', {
			src: url,
			css: {
				position: absolute,
				opacity: 0
			}
		}).appendTo(document.body);
		this.$canvas = $('<canvas>', {
			src: url,
			id: id,
			css: {
				position: absolute,
				opacity: 0
			}
		}).appendTo(document.body);
		
		this.pos = {x: 0.5, y: 0.5};
		this.scale = 1;
		this.aspect = this.$img.width() / this.$img.height();
		this.height = 360;
		this.width = this.height * this.aspect;
		
		this.renderFunction = window.requestAnimationFrame.bind(window, this.run);
		
	}
	
	this.stop = function() {
		this.active = false;
	}
	
	this.start = function() {
		this.active = true;
		this.run();
	}
	
	this.run = function() {
		var gif = self.$gif,
				canvas = self.$canvas,
				pos = self.pos,
				scale = self.scale,
				canvasWidth = canvas.width(),
				canvasHeight = canvas.height(),
				height = self.height * scale,
				width = self.width * scale,
				ctx = canvas[0].getContext('2d');
		
		//ctx.clearRect(0, 0, width, height);
		ctx.fillStyle = self.backgroundColor;
		ctx.fillRect(0, 0, canvasWidth, canvasHeight);
		ctx.drawImage(gif[0], pos.x*canvasWidth - (width*0.5), pos.y*canvasHeight - (height*0.5), width, height);
		
		if(self.seriousSourceNode) self.seriousSourceNode.update();
		if(self.active) self.renderFunction();
	}
	return this;
	
}

var MakeThatCameraDance = function() {
	var self = this,
			width = 640,
			height = 480,
			id = 'camerasource',
			video,
			getUserMedia = navigator.getUserMedia || navigator.mozGetUserMedia || navigator.webkitGetUserMedia,
			url = window.URL || window.mozURL || window.webkitURL;
	
	this.active = false;
	
	this.init = function() {
		self.$video = $('<video>', {
			id: id,
			width: width,
			height: height,
			autoplay: 'autoplay',
			css:  { display: none }
		}).appendTo(document.body);
		
		video = self.$video[0];
		
		return self.start();
	}
		
	this.start = function() {
		self.loaded = new $.Deferred();
		
		if( !getUserMedia ) {
			self.loaded.fail('getUserMedia is not available');
			throw new Error('getUserMedia is not available');
		}
		
		getUserMedia.call(navigator, {video: true}, function(stream) {
			self.stream = stream;
			if (video.mozSrcObject !== undefined) {
				video.mozSrcObject = stream;
			} else {
				video.src = (url) ? url.createObjectURL(stream) : stream;
			}
			video.play();
			self.active = true;
			self.loaded.resolve();
		}, function(e) {
			console.error('getusermedia', e.code);
			self.loaded.fail();
		});
		
		self.$video.on('error', function(e) {
			console.error('video', e.code);
		});
		
		return self.loaded;
	}
	
	this.stop = function() {
		self.stream.stop();
		self.stream = null;
		
		
		
	}
	
	return this;
	
}










