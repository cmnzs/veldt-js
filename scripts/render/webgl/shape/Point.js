'use strict';

const lumo = require('lumo');
const morton = require('../../morton/Morton');
const BrightnessTransform = require('../shader/BrightnessTransform');

const SHADER = {
	common: BrightnessTransform.common,
	vert:
		`
		attribute vec2 aPosition;
		uniform float uRadius;
		uniform vec2 uTileOffset;
		uniform float uScale;
		uniform float uOutlineWidth;
		uniform vec2 uLODOffset;
		uniform float uLODScale;
		uniform float uPixelRatio;
		uniform mat4 uProjectionMatrix;
		uniform vec4 uColor;
		varying vec4 vColor;
		void main() {
			vec2 wPosition = (aPosition * uScale * uLODScale) + (uTileOffset + (uScale * uLODOffset));
			gl_PointSize = (uRadius + uOutlineWidth) * 2.0 * uPixelRatio;
			gl_Position = uProjectionMatrix * vec4(wPosition, 0.0, 1.0);
			vColor = brightnessTransform(uColor);
		}
		`,
	frag:
		`
		#ifdef GL_OES_standard_derivatives
			#extension GL_OES_standard_derivatives : enable
		#endif
		uniform float uRadius;
		uniform float uOutlineWidth;
		uniform vec4 uOutlineColor;
		varying vec4 vColor;
		void main() {
			vec2 cxy = 2.0 * gl_PointCoord - 1.0;
			float radius = dot(cxy, cxy);
			float fullRadius = uRadius + uOutlineWidth;
			#ifdef GL_OES_standard_derivatives
				float delta = fwidth(radius);
				float alpha = 1.0 - smoothstep(1.0 - delta, 1.0 + delta, radius);
				float outlineRadius = radius + (uOutlineWidth / fullRadius);
				float outlineDelta = fwidth(outlineRadius);
				float outlineAlpha = smoothstep(1.0 - outlineDelta, 1.0 + outlineDelta, outlineRadius);
				vec4 color = vec4(
					vColor.r * (1.0 - outlineAlpha) + uOutlineColor.r * outlineAlpha,
					vColor.g * (1.0 - outlineAlpha) + uOutlineColor.g * outlineAlpha,
					vColor.b * (1.0 - outlineAlpha) + uOutlineColor.b * outlineAlpha,
					vColor.a * (1.0 - outlineAlpha) + uOutlineColor.a * outlineAlpha);
			#else
				if (radius > 1.0) {
					discard;
				}
				vec4 color;
				if ((radius * fullRadius) >= (fullRadius - uOutlineWidth)) {
					// outline
					color = uOutlineColor;
				} else {
					// fill
					color = vColor;
				}
				float alpha = 1.0;
			#endif
			gl_FragColor = vec4(color.rgb, color.a * alpha);
		}
		`
};

const createPoint = function(gl) {
	const vertices = new Float32Array(2);
	vertices[0] = 0.0;
	vertices[1] = 0.0;
	// create quad buffer
	return new lumo.VertexBuffer(
		gl,
		vertices,
		{
			0: {
				size: 2,
				type: 'FLOAT'
			}
		},
		{
			mode: 'POINTS',
			count: 1
		});
};

const getOffsetIndices = function(x, y, extent, lod) {
	const partitions = Math.pow(2, lod);
	const xcell = x * partitions;
	const ycell = y * partitions;
	const stride = extent * partitions;
	const start = morton(xcell, ycell);
	const stop = start + (stride * stride);
	return [ start, stop ];
};

const draw = function(shader, atlas, renderables) {
	// for each renderable
	for (let i=0; i<renderables.length; i++) {
		const renderable = renderables[i];
		// set tile uniforms
		shader.setUniform('uScale', renderable.scale);
		shader.setUniform('uTileOffset', renderable.tileOffset);
		shader.setUniform('uLODScale', 1);
		shader.setUniform('uLODOffset', [0, 0]);
		// draw the points
		atlas.draw(renderable.hash, 'POINTS');
	}
};

const drawLOD = function(shader, atlas, plot, lod, renderables) {
	const zoom = Math.round(plot.zoom);
	// for each renderable
	for (let i=0; i<renderables.length; i++) {
		const renderable = renderables[i];

		// distance between actual zoom and the LOD of tile
		const dist = Math.abs(renderable.tile.coord.z - zoom);

		if (dist > lod) {
			// not enough lod to support it
			continue;
		}

		const xOffset = renderable.uvOffset[0];
		const yOffset = renderable.uvOffset[1];
		const extent = renderable.uvOffset[3];

		// set tile uniforms
		shader.setUniform('uScale', renderable.scale);
		shader.setUniform('uTileOffset', renderable.tileOffset);

		const lodScale = 1 / extent;

		const lodOffset = [
			-(xOffset * lodScale * plot.tileSize),
			-(yOffset * lodScale * plot.tileSize)];

		shader.setUniform('uLODScale', 1 / extent);
		shader.setUniform('uLODOffset', lodOffset);
		// get byte offset and count
		const [ start, stop ] = getOffsetIndices(
			xOffset,
			yOffset,
			extent,
			lod);

		const points = renderable.tile.data.points;
		const offsets = renderable.tile.data.offsets;

		const startByte = offsets[start];
		const stopByte = (stop === offsets.length) ? points.byteLength : offsets[stop];

		const offset = startByte / (atlas.stride * 4);
		const count = (stopByte - startByte) / (atlas.stride * 4);
		if (count > 0) {
			// draw the points
			atlas.draw(renderable.hash, 'POINTS', offset, count);
		}
	}
};

class Point {
	constructor(renderer) {
		this.renderer = renderer;
		this.ext = renderer.gl.getExtension('OES_standard_derivatives');
		this.point = createPoint(renderer.gl);
		this.shader = renderer.createShader(SHADER);
	}
	drawInstanced(atlas, radius, color, outlineWidth, outlineColor) {

		const shader = this.shader;
		const renderer = this.renderer;
		const layer = renderer.layer;
		const plot = layer.plot;
		const projection = renderer.getOrthoMatrix();

		// bind shader
		shader.use();

		// set global uniforms
		shader.setUniform('uProjectionMatrix', projection);
		shader.setUniform('uColor', color);
		shader.setUniform('uRadius', radius);
		shader.setUniform('uOutlineWidth', outlineWidth);
		shader.setUniform('uOutlineColor', outlineColor);
		shader.setUniform('uPixelRatio', plot.pixelRatio);
		shader.setUniform('uBrightness', renderer.brightness);

		// binds the vertex atlas
		atlas.bind();

		if (layer.lod > 0) {
			// draw using LOD
			drawLOD(
				shader,
				atlas,
				plot,
				layer.lod,
				renderer.getRenderablesLOD());
		} else {
			// draw non-LOD
			draw(
				shader,
				atlas,
				renderer.getRenderables());
		}

		// unbind
		atlas.unbind();
	}
	drawIndividual(target, radius, color, outlineWidth, outlineColor) {

		const shader = this.shader;
		const point = this.point;
		const renderer = this.renderer;
		const plot = renderer.layer.plot;
		const projection = renderer.getOrthoMatrix();
		const viewport = plot.getViewportPixelOffset();

		// get tile offset
		const coord = target.tile.coord;
		const scale = Math.pow(2, plot.zoom - coord.z);
		const tileOffset = [
			(coord.x * scale * plot.tileSize) + (scale * target.x) - viewport.x,
			(coord.y * scale * plot.tileSize) + (scale * target.y) - viewport.y
		];

		// bind shader
		shader.use();

		shader.setUniform('uProjectionMatrix', projection);
		shader.setUniform('uTileOffset', tileOffset);
		shader.setUniform('uLODScale', 1);
		shader.setUniform('uLODOffset', [0, 0]);
		shader.setUniform('uScale', scale);
		shader.setUniform('uColor', color);
		shader.setUniform('uRadius', radius);
		shader.setUniform('uOutlineWidth', outlineWidth);
		shader.setUniform('uOutlineColor', outlineColor);
		shader.setUniform('uPixelRatio', plot.pixelRatio);
		shader.setUniform('uBrightness', renderer.brightness);

		// binds the buffer to instance
		point.bind();

		// draw the points
		point.draw();

		// unbind
		point.unbind();
	}
}

module.exports = Point;
