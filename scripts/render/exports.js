'use strict';

const lumo = require('lumo');

// core renderers
const Core = {
	DOM: require('dom/DOMRenderer'),
	HTML: require('dom/HTMLRenderer'),
	SVG: require('dom/SVGRenderer'),
	WebGL: lumo.WebGLRenderer
};

// html renderers
const HTML = {
	CommunityLabel: require('./html/CommunityLabel'),
	Debug: require('./html/Debug'),
	WordCloud: require('./html/WordCloud')
};

// webgl renderers
const WebGL = {
	Community: require('./webgl/Community'),
	CommunityBucket: require('./webgl/CommunityBucket'),
	Heatmap: require('./webgl/Heatmap'),
	Micro: require('./webgl/Micro'),
	Macro: require('./webgl/Macro'),
	MacroEdge: require('./webgl/MacroEdge'),
	Repeat: require('./webgl/Repeat')
};

module.exports = {
	Core: Core,
	HTML: HTML,
	WebGL: WebGL
};
