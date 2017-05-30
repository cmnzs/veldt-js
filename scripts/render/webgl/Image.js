'use strict';

const defaultTo = require('lodash/defaultTo');
const lumo = require('lumo');
const BrightnessTransform = require('./shader/BrightnessTransform');

const SHADER_GLSL = {
	common: BrightnessTransform.common,
	vert:
		`
		precision highp float;
		attribute vec2 aPosition;
		attribute vec2 aTextureCoord;
		uniform vec4 uTextureCoordOffset;
		uniform vec2 uTileOffset;
		uniform float uScale;
		uniform mat4 uProjectionMatrix;
		varying vec2 vTextureCoord;
		void main() {
			vTextureCoord = vec2(
				uTextureCoordOffset.x + (aTextureCoord.x * uTextureCoordOffset.z),
				uTextureCoordOffset.y + (aTextureCoord.y * uTextureCoordOffset.w));
			vec2 wPosition = (aPosition * uScale) + uTileOffset;
			gl_Position = uProjectionMatrix * vec4(wPosition, 0.0, 1.0);
		}
		`,
	frag:
		`
		precision highp float;
		uniform sampler2D uTextureSampler;
		uniform float uOpacity;
		varying vec2 vTextureCoord;
		void main() {
			vec4 color = texture2D(uTextureSampler, vec2(vTextureCoord.x, 1.0 - vTextureCoord.y));
			color = brightnessTransform(color);
			gl_FragColor = vec4(color.rgb, color.a * uOpacity);
		}
		`
};

const createQuad = function(gl, min, max) {
	const vertices = new Float32Array(24);
	// positions
	vertices[0] = min;
	vertices[1] = min;
	vertices[2] = max;
	vertices[3] = min;
	vertices[4] = max;
	vertices[5] = max;
	vertices[6] = min;
	vertices[7] = min;
	vertices[8] = max;
	vertices[9] = max;
	vertices[10] = min;
	vertices[11] = max;
	// uvs
	vertices[12] = 0;
	vertices[13] = 0;
	vertices[14] = 1;
	vertices[15] = 0;
	vertices[16] = 1;
	vertices[17] = 1;
	vertices[18] = 0;
	vertices[19] = 0;
	vertices[20] = 1;
	vertices[21] = 1;
	vertices[22] = 0;
	vertices[23] = 1;
	// create quad buffer
	return new lumo.VertexBuffer(
		gl,
		vertices,
		{
			0: {
				size: 2,
				type: 'FLOAT',
				byteOffset: 0
			},
			1: {
				size: 2,
				type: 'FLOAT',
				byteOffset: 2 * 6 * 4
			}
		},
		{
			count: 6,
		});
};

const addTile = function(array, tile) {
	array.set(tile.coord.hash, new Uint8Array(tile.data));
};

class Image extends lumo.WebGLTileRenderer {

	constructor(options = {}) {
		super(options);
		this.brightness = defaultTo(options.brightness, 1.0);
		this.quad = null;
		this.shader = null;
		this.array = null;
	}

	onAdd(layer) {
		super.onAdd(layer);
		this.quad = createQuad(this.gl, 0, layer.plot.tileSize);
		this.shader = this.createShader(SHADER_GLSL);
		this.array = this.createTextureArray({
			chunkSize: layer.plot.tileSize,
			onAdd: addTile.bind(this)
		});
		return this;
	}

	onRemove(layer) {
		this.destroyTextureArray(this.array);
		this.array = null;
		this.quad = null;
		this.shader = null;
		super.onRemove(layer);
		return this;
	}

	brightness(brightness) {
		this.brightness = brightness;
		if (this.plot) {
			this.layer.plot.setDirty();
		}
	}

	draw() {
		const gl = this.gl;
		const shader = this.shader;
		const array = this.array;
		const quad = this.quad;
		const renderables = this.getRenderablesLOD();
		const proj = this.getOrthoMatrix();

		// bind shader
		shader.use();
		// set global uniforms
		shader.setUniform('uProjectionMatrix', proj);
		shader.setUniform('uTextureSampler', 0);
		shader.setUniform('uOpacity', this.layer.opacity);
		shader.setUniform('uBrightness', this.brightness);

		// set blending func
		gl.enable(gl.BLEND);
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

		// bind quad
		quad.bind();

		// for each renderable
		for (let i=0; i<renderables.length; i++) {
			const renderable = renderables[i];
			array.bind(renderable.hash, 0);
			// set tile uniforms
			shader.setUniform('uTextureCoordOffset', renderable.uvOffset);
			shader.setUniform('uScale', renderable.scale);
			shader.setUniform('uTileOffset', renderable.tileOffset);
			// draw
			quad.draw();
			// no need to unbind texture
		}

		// unbind quad
		quad.unbind();
		return this;
	}
}

module.exports = Image;
