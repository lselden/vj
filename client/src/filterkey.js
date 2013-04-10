(function (window, undefined) {
'use strict';

window.Seriously = window.Seriously ||
	{ plugin: function (name, opt) { this[name] = opt; } };

Seriously.plugin('filterkey', {
	shader: function(inputs, shaderSource, utilities) {
		
		shaderSource.fragment = [
			"#ifdef GL_ES",
			"	precision highp float;",
			"#endif",
			
			"varying vec2 vTexCoord;",
			"varying vec4 vPosition;",
			"",
			"uniform sampler2D source;",
			"",
			"uniform float tolerance;",
			"uniform float softness;",
			"uniform float hueshift;",
			"uniform float saturation;",
			"uniform float brightness;",
			"uniform vec3 color;",
			"",
			"uniform bool invert;",
			"uniform bool opaque;",
			"",
			"vec3 RGBToHSL(vec3 color) {",
			"	vec3 hsl; // init to 0 to avoid warnings ? (and reverse if + remove first part)",
			"	",
			"	float fmin = min(min(color.r, color.g), color.b);    //Min. value of RGB",
			"	float fmax = max(max(color.r, color.g), color.b);    //Max. value of RGB",
			"	float delta = fmax - fmin;             //Delta RGB value",

			"	hsl.z = (fmax + fmin) / 2.0; // Luminance",

			"	if (delta == 0.0) {		//This is a gray, no chroma...",
			"		hsl.x = 0.0;	// Hue",
			"		hsl.y = 0.0;	// Saturation",
			"	} else {                                  //Chromatic data...",
			"		if (hsl.z < 0.5)",
			"			hsl.y = delta / (fmax + fmin); // Saturation",
			"		else",
			"			hsl.y = delta / (2.0 - fmax - fmin); // Saturation",
			"		",
			"		float deltaR = (((fmax - color.r) / 6.0) + (delta / 2.0)) / delta;",
			"		float deltaG = (((fmax - color.g) / 6.0) + (delta / 2.0)) / delta;",
			"		float deltaB = (((fmax - color.b) / 6.0) + (delta / 2.0)) / delta;",

			"		if (color.r == fmax )",
			"			hsl.x = deltaB - deltaG; // Hue",
			"		else if (color.g == fmax)",
			"			hsl.x = (1.0 / 3.0) + deltaR - deltaB; // Hue",
			"		else if (color.b == fmax)",
			"			hsl.x = (2.0 / 3.0) + deltaG - deltaR; // Hue",

			"		if (hsl.x < 0.0)",
			"			hsl.x += 1.0; // Hue",
			"		else if (hsl.x > 1.0)",
			"			hsl.x -= 1.0; // Hue",
			"	}",

			"	return hsl;",
			"}",
			"float HueToRGB(in float f1, in float f2, in float hue)",
			"{",
			"    if (hue < 0.0)",
			"        hue += 1.0;",
			"    else if (hue > 1.0)",
			"        hue -= 1.0;",
			"    float res;",
			"    if ((6.0 * hue) < 1.0)",
			"        res = f1 + (f2 - f1) * 6.0 * hue;",
			"    else if ((2.0 * hue) < 1.0)",
			"        res = f2;",
			"    else if ((3.0 * hue) < 2.0)",
			"        res = f1 + (f2 - f1) * ((2.0 / 3.0) - hue) * 6.0;",
			"    else",
			"        res = f1;",
			"    return res;",
			"}",
			"",
			"vec3 HSLToRGB(in vec3 hsl)",
			"{",
			"    vec3 rgb;",
			"",
			"    if (hsl.y == 0.0)",
			"        rgb = vec3(hsl.z); // Luminance",
			"    else",
			"    {",
			"        float f1, f2;",
			"",
			"        if (hsl.z < 0.5)",
			"            f2 = hsl.z * (1.0 + hsl.y);",
			"        else",
			"            f2 = (hsl.z + hsl.y) - (hsl.y * hsl.z);",
			"",
			"        f1 = 2.0 * hsl.z - f2;",
			"",
			"        rgb.r = HueToRGB(f1, f2, hsl.x + (1.0/3.0));",
			"        rgb.g = HueToRGB(f1, f2, hsl.x);",
			"        rgb.b = HueToRGB(f1, f2, hsl.x - (1.0/3.0));",
			"    }",
			"",
			"    return rgb;",
			"}",
			
			"void main() {",
			"	vec4 pixel = texture2D(source, vTexCoord);",
			"	vec3 pixelHSL = RGBToHSL(pixel.rgb);",
			"	vec3 colorHSL = RGBToHSL(color.rgb);",
			"	float originalAlpha = pixel.a;",
			"	",
			"	pixelHSL.x = mod(pixelHSL.x + hueshift, 1.0);",
			"	pixelHSL.y = clamp(pixelHSL.y * saturation, 0.0, 1.0);",
			"	pixelHSL.z = clamp(pixelHSL.z * brightness, 0.0, 1.0);",
			"	",
			"	float hueDifference = 2.0*mod(abs(pixelHSL.x - colorHSL.x), 0.5) ; // circular hue",
			"	float valDifference = abs(pixelHSL.z - colorHSL.z);",
			"	float difference = mix(valDifference, hueDifference, colorHSL.y);",
			"	",
			"	",
			"	if(difference > tolerance) {",
			"		if(softness > 0.0 && difference < tolerance+softness) {",
			"			pixel.a = smoothstep(pixel.a, 0.0, (difference-tolerance)/softness);",
			"		} else {",
			"			pixel.a = 0.0;",
			"		}",
			"	}",
			"	",
			"	pixel.rgb = HSLToRGB(pixelHSL);",
			"	",
			"	if(invert) {",
			"		pixel.a = originalAlpha - pixel.a;",
			"	}",
			"	",
			"	if(opaque) {",
			"		pixel.rgb *= pixel.a;",
			"		pixel.a = 1.0;",
			"	}",
			"	",
			"	gl_FragColor = pixel;",
			"}"].join("\n");
	
		return shaderSource;
		
	},
	inPlace: true,
	inputs: {
		source: {
			type: 'image',
			uniform: 'source'
		},
		tolerance: {
			type: 'number',
			uniform: 'tolerance',
			defaultValue: 0.25,
			min: 0,
			max: 1
		},
		// min 0 max 1
		softness: {
			type: 'number',
			uniform: 'softness',
			defaultValue: 0.1,
			min: 0,
			max: 1
		},
		hueshift: {
			type: 'number',
			uniform: 'hueshift',
			defaultValue: 0,
			min: -0.5,
			max: 0.5
		},
		saturation: {
			type: 'number',
			uniform: 'saturation',
			defaultValue: 1.0,
			min: 0,
			max: 2
		},
		brightness: {
			type: 'number',
			uniform: 'brightness',
			defaultValue: 1,
			min: 0,
			max: 2
		},
		invert: {
			type: 'boolean',
			uniform: 'invert',
			defaultValue: false
		},
		opaque: {
			type: 'boolean',
			uniform: 'opaque',
			defaultValue: false
		},
		color: {
			type: 'color',
			uniform: 'color',
			defaultValue: [0.5, 0.5, 0.5, 1]
		}
	},
	title: 'Super Key',
	description: ''
});

}(window));