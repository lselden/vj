(function (window, undefined) {
'use strict';

window.Seriously = window.Seriously ||
	{ plugin: function (name, opt) { this[name] = opt; } };

Seriously.plugin('transform', {
	shader: function(inputs, shaderSource, utilities) {
		
		shaderSource.vertex = [
			"#ifdef GL_ES",
			"	precision mediump float;",
			"#endif",
			"",
			"attribute vec3 position;",
			"attribute vec2 texCoord;",
			"uniform mat4 transform;",
			"",
			"varying vec2 vTexCoord;",
			"varying vec4 vPosition;",
			"",
			"uniform float rotation;",
			"uniform float size;",
			"uniform vec2 offset;",
			"",
			"void main() {",		
			"	vec4 rotatedPosition = vec4(position,1.0);",
			"	rotatedPosition.x = ( cos( rotation ) * position.x - sin( rotation ) * position.y ) * size + offset.x;",
			"	rotatedPosition.y = ( sin( rotation ) * position.x + cos( rotation ) * position.y ) * size + offset.y;",
	    "",
			"	gl_Position = transform * rotatedPosition;",
			"	vTexCoord = vec2(texCoord.s, texCoord.t);",
			"	vPosition = gl_Position;",
			"}"
		].join('\n');
		
		shaderSource.fragment = [
			"#ifdef GL_ES",
			"	precision mediump float;",
			"#endif",
			"",
			"varying vec2 vTexCoord;",
			"varying vec4 vPosition;",
			"",
			"uniform sampler2D source;",
			"uniform float gain;",
			"",
			"void main(void) {",
			"	vec4 pixel = texture2D(source, vTexCoord);",
			"	gl_FragColor = vec4(pixel.rgb, clamp(pixel.a*gain, 0.0, 1.0));",
			"}"
		].join('\n');
		
		return shaderSource;
		
	},
	inPlace: true,
	inputs: {
		source: {
			type: 'image',
			uniform: 'source'
		},
		offset: {
			type: 'vector',
			dimensions: 2,
			min: -1,
			max: 1,
			defaultValue: [0, 0],
			uniform: 'offset'
		},
		rotation: {
			type: 'number',
			uniform: 'rotation',
			defaultValue: 0,
			min: -2*Math.PI,
			max: 2*Math.PI
		},
		// min 0 max 1
		size: {
			type: 'number',
			uniform: 'size',
			defaultValue: 1,
			min: 0.5,
			max: 2
		},
		gain: {
			type: 'number',
			uniform: 'gain',
			defaultValue: 1,
			min: 0.8,
			max: 1.2
		}
	},
	title: 'Transform',
	description: ''
});

}(window));