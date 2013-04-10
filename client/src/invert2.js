(function (window, undefined) {
"use strict";

window.Seriously = window.Seriously ||
	{ plugin: function (name, opt) { this[name] = opt; } };

Seriously.plugin('invert2', {
	shader: function(inputs, shaderSource, utilities) {
		shaderSource.fragment = '#ifdef GL_ES\n\n' +
			'precision mediump float;\n\n' +
			'#endif\n\n' +
			'\n' +
			'#define WHITE vec4(1.0)\n' +
			'#define BLACK vec4(0.0,0.0,0.0,1.0)\n' +
			'\n' +
			'varying vec2 vTexCoord;\n' +
			'varying vec4 vPosition;\n' +
			'\n' +
			'uniform sampler2D source;\n' +
			'uniform bool invert;\n' +
			'uniform bool mute;\n' +
			'\n' +
			'void main(void) {\n' +
			'	if(mute) {\n' +
			'		gl_FragColor = BLACK;\n' +
			'	} else {\n' +
			'		gl_FragColor = texture2D(source, vTexCoord);\n' +
			'	}\n' +
			'\n' +
			' if(invert) {\n' +
			'		gl_FragColor = vec4(1.0 - gl_FragColor.rgb, gl_FragColor.a);\n' +
			'	}\n' +
			'}\n';
		return shaderSource;
	},
	inPlace: true,
	inputs: {
		source: {
			type: 'image',
			uniform: 'source',
			shaderDirty: false
		},
		invert: {
			type: 'boolean',
			uniform: 'invert',
			defaultValue: false
		},
		mute: {
			type: 'boolean',
			uniform: 'mute',
			defaultValue: false
		}
	},
	title: 'Invert',
	description: 'Invert image color'
});

}(window));
