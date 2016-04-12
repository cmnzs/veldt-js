(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.prism = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function () {

    'use strict';

    var WebGLContext = require('./WebGLContext'),
        _boundBuffer = null;

    /**
     * Instantiates an IndexBuffer object.
     * @class IndexBuffer
     * @classdesc An index buffer object.
     */
    function IndexBuffer( arg, options ) {
        options = options || {};
        this.gl = WebGLContext.get();
        this.buffer = 0;
        if ( arg ) {
            if ( arg instanceof WebGLBuffer ) {
                // if the argument is already a webglbuffer, simply wrap it
                this.buffer = arg;
                this.type = options.type || 'UNSIGNED_SHORT';
                this.count = ( options.count !== undefined ) ? options.count : 0;
            } else {
                // otherwise, buffer it
                this.bufferData( arg );
            }
        }
        this.offset = ( options.offset !== undefined ) ? options.offset : 0;
        this.mode = ( options.mode !== undefined ) ? options.mode : 'TRIANGLES';
    }

    /**
     * Upload index data to the GPU.
     * @memberof IndexBuffer
     *
     * @param {Array|Uint16Array|Uint32Array} arg - The array of data to buffer.
     *
     * @returns {IndexBuffer} The index buffer object for chaining.
     */
    IndexBuffer.prototype.bufferData = function( arg ) {
        var gl = this.gl;
        // check for type support
        var uint32support = WebGLContext.checkExtension( 'OES_element_index_uint' );
        if( !uint32support ) {
            // no support for uint32
            if ( arg instanceof Array ) {
                // if array, buffer to uint16
                arg = new Uint16Array( arg );
            } else if ( arg instanceof Uint32Array ) {
                // if uint32, downgrade to uint16
                console.warn( 'Cannot create IndexBuffer of format ' +
                    'gl.UNSIGNED_INT as OES_element_index_uint is not ' +
                    'supported, defaulting to gl.UNSIGNED_SHORT.' );
                arg = new Uint16Array( arg );
            }
        } else {
            // uint32 is supported
            if ( arg instanceof Array ) {
                // if array, buffer to uint32
                arg = new Uint32Array( arg );
            }
        }
        // set data type based on array
        if ( arg instanceof Uint16Array ) {
            this.type = 'UNSIGNED_SHORT';
        } else if ( arg instanceof Uint32Array ) {
            this.type = 'UNSIGNED_INT';
        } else {
            console.error( 'IndexBuffer requires an Array or ' +
                'ArrayBuffer argument, command ignored.' );
            return;
        }
        // create buffer, store count
        if ( !this.buffer ) {
            this.buffer = gl.createBuffer();
        }
        this.count = arg.length;
        gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, this.buffer );
        gl.bufferData( gl.ELEMENT_ARRAY_BUFFER, arg, gl.STATIC_DRAW );
        return this;
    };

    /**
     * Binds the index buffer object.
     * @memberof IndexBuffer
     *
     * @returns {IndexBuffer} Returns the index buffer object for chaining.
     */
    IndexBuffer.prototype.bind = function() {
        // if this buffer is already bound, exit early
        if ( _boundBuffer === this ) {
            return;
        }
        var gl = this.gl;
        gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, this.buffer );
        _boundBuffer = this;
        return this;
    };

    /**
     * Unbinds the index buffer object.
     * @memberof IndexBuffer
     *
     * @returns {IndexBuffer} Returns the index buffer object for chaining.
     */
    IndexBuffer.prototype.unbind = function() {
        // if there is no buffer bound, exit early
        if ( _boundBuffer === null ) {
            return;
        }
        var gl = this.gl;
        gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, null );
        _boundBuffer = null;
        return this;
    };

    /**
     * Execute the draw command for the bound buffer.
     * @memberof IndexBuffer
     *
     * @param {Object} options - The options to pass to 'drawElements'. Optional.
     *
     * @returns {IndexBuffer} Returns the index buffer object for chaining.
     */
    IndexBuffer.prototype.draw = function( options ) {
        options = options || {};
        if ( _boundBuffer === null ) {
            console.warn( 'No IndexBuffer is bound, command ignored.' );
            return;
        }
        var gl = this.gl;
        var mode = gl[ options.mode || this.mode || 'TRIANGLES' ];
        var offset = ( options.offset !== undefined ) ? options.offset : this.offset;
        var count = ( options.count !== undefined ) ? options.count : this.count;
        gl.drawElements(
            mode,
            count,
            gl[ this.type ],
            offset );
        return this;
    };

    module.exports = IndexBuffer;

}());

},{"./WebGLContext":11}],2:[function(require,module,exports){
(function () {

    'use strict';

    var WebGLContext = require('./WebGLContext'),
        Stack = require('../util/Stack'),
        _stack = new Stack(),
        _boundBuffer = null;

    /**
     * Binds the renderTarget object, caching it to prevent unnecessary rebinds.
     *
     * @param {RenderTarget} renderTarget - The RenderTarget object to bind.
     */
     function bind( renderTarget ) {
        // if this buffer is already bound, exit early
        if ( _boundBuffer === renderTarget ) {
            return;
        }
        var gl = renderTarget.gl;
        gl.bindFramebuffer( gl.FRAMEBUFFER, renderTarget.framebuffer );
        _boundBuffer = renderTarget;
    }

    /**
     * Unbinds the renderTarget object. Prevents unnecessary unbinding.
     *
     * @param {RenderTarget} renderTarget - The RenderTarget object to unbind.
     */
     function unbind( renderTarget ) {
        // if there is no buffer bound, exit early
        if ( _boundBuffer === null ) {
            return;
        }
        var gl = renderTarget.gl;
        gl.bindFramebuffer( gl.FRAMEBUFFER, null );
        _boundBuffer = null;
    }

    /**
     * Instantiates a RenderTarget object.
     * @class RenderTarget
     * @classdesc A renderTarget class to allow rendering to textures.
     */
    function RenderTarget() {
        var gl = this.gl = WebGLContext.get();
        this.framebuffer = gl.createFramebuffer();
        this.textures = {};
        return this;
    }

    /**
     * Binds the renderTarget object and pushes it to the front of the stack.
     * @memberof RenderTarget
     *
     * @returns {RenderTarget} The renderTarget object, for chaining.
     */
    RenderTarget.prototype.push = function() {
        _stack.push( this );
        bind( this );
        return this;
    };

    /**
     * Unbinds the renderTarget object and binds the renderTarget beneath it on
     * this stack. If there is no underlying renderTarget, bind the backbuffer.
     * @memberof RenderTarget
     *
     * @returns {RenderTarget} The renderTarget object, for chaining.
     */
    RenderTarget.prototype.pop = function() {
        var top;
        _stack.pop();
        top = _stack.top();
        if ( top ) {
            bind( top );
        } else {
            unbind( this );
        }
        return this;
    };

    /**
     * Attaches the provided texture to the provided attachment location.
     * @memberof RenderTarget
     *
     * @param {Texture2D} texture - The texture to attach.
     * @param {number} index - The attachment index. (optional)
     * @param {String} target - The texture target type. (optional)
     *
     * @returns {RenderTarget} The renderTarget object, for chaining.
     */
    RenderTarget.prototype.setColorTarget = function( texture, index, target ) {
        var gl = this.gl;
        if ( typeof index === 'string' ) {
            target = index;
            index = undefined;
        }
        index = ( index !== undefined ) ? index : 0;
        this.textures[ 'color' + index ] = texture;
        this.push();
        gl.framebufferTexture2D(
            gl.FRAMEBUFFER,
            gl[ 'COLOR_ATTACHMENT' + index ],
            gl[ target || 'TEXTURE_2D' ],
            texture.texture,
            0 );
        this.pop();
        return this;
    };

    /**
     * Attaches the provided texture to the provided attachment location.
     * @memberof RenderTarget
     *
     * @param {Texture2D} texture - The texture to attach.
     *
     * @returns {RenderTarget} The renderTarget object, for chaining.
     */
    RenderTarget.prototype.setDepthTarget = function( texture ) {
        var gl = this.gl;
        this.textures.depth = texture;
        this.push();
        gl.framebufferTexture2D(
            gl.FRAMEBUFFER,
            gl.DEPTH_ATTACHMENT,
            gl.TEXTURE_2D,
            texture.texture,
            0 );
        this.pop();
        return this;
    };

    /**
     * Clears the color bits of the renderTarget.
     * @memberof RenderTarget
     *
     * @param {number} r - The red value.
     * @param {number} g - The green value.
     * @param {number} b - The blue value.
     * @param {number} a - The alpha value.
     *
     * @returns {RenderTarget} The renderTarget object, for chaining.
     */
    RenderTarget.prototype.clearColor = function( r, g, b, a ) {
        var gl = this.gl;
        r = ( r !== undefined ) ? r : 0;
        g = ( g !== undefined ) ? g : 0;
        b = ( b !== undefined ) ? b : 0;
        a = ( a !== undefined ) ? a : 0;
        this.push();
        gl.clearColor( r, g, b, a );
        gl.clear( gl.COLOR_BUFFER_BIT );
        this.pop();
        return this;
    };

    /**
     * Clears the depth bits of the renderTarget.
     * @memberof RenderTarget
     *
     * @returns {RenderTarget} The renderTarget object, for chaining.
     */
    RenderTarget.prototype.clearDepth = function( r, g, b, a ) {
        var gl = this.gl;
        r = ( r !== undefined ) ? r : 0;
        g = ( g !== undefined ) ? g : 0;
        b = ( b !== undefined ) ? b : 0;
        a = ( a !== undefined ) ? a : 0;
        this.push();
        gl.clearColor( r, g, b, a );
        gl.clear( gl.DEPTH_BUFFER_BIT );
        this.pop();
        return this;
    };

    /**
     * Clears the stencil bits of the renderTarget.
     * @memberof RenderTarget
     *
     * @returns {RenderTarget} The renderTarget object, for chaining.
     */
    RenderTarget.prototype.clearStencil = function( r, g, b, a ) {
        var gl = this.gl;
        r = ( r !== undefined ) ? r : 0;
        g = ( g !== undefined ) ? g : 0;
        b = ( b !== undefined ) ? b : 0;
        a = ( a !== undefined ) ? a : 0;
        this.push();
        gl.clearColor( r, g, b, a );
        gl.clear( gl.STENCIL_BUFFER_BIT );
        this.pop();
        return this;
    };

    /**
     * Clears all the bits of the renderTarget.
     * @memberof RenderTarget
     *
     * @returns {RenderTarget} The renderTarget object, for chaining.
     */
    RenderTarget.prototype.clear = function( r, g, b, a ) {
        var gl = this.gl;
        r = ( r !== undefined ) ? r : 0;
        g = ( g !== undefined ) ? g : 0;
        b = ( b !== undefined ) ? b : 0;
        a = ( a !== undefined ) ? a : 0;
        this.push();
        gl.clearColor( r, g, b, a );
        gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT );
        this.pop();
        return this;
    };

    /**
     * Resizes the renderTarget and all attached textures by the provided height
     * and width.
     * @memberof RenderTarget
     *
     * @param {number} width - The new width of the renderTarget.
     * @param {number} height - The new height of the renderTarget.
     *
     * @returns {RenderTarget} The renderTarget object, for chaining.
     */
    RenderTarget.prototype.resize = function( width, height ) {
        var key;
        if ( !width || !height ) {
            console.warn( 'Width or height arguments missing, command ignored.' );
            return this;
        }
        for ( key in this.textures ) {
            if ( this.textures.hasOwnProperty( key ) ) {
                this.textures[ key ].resize( width, height );
            }
        }
        return this;
    };

    module.exports = RenderTarget;

}());

},{"../util/Stack":13,"./WebGLContext":11}],3:[function(require,module,exports){
(function () {

    'use strict';

    var VertexPackage = require('../core/VertexPackage'),
        VertexBuffer = require('../core/VertexBuffer'),
        IndexBuffer = require('../core/IndexBuffer');

    function Renderable( spec, options ) {
        spec = spec || {};
        options = options || {};
        if ( spec.vertexBuffer || spec.vertexBuffers ) {
            // use existing vertex buffer
            this.vertexBuffers = spec.vertexBuffers || [ spec.vertexBuffer ];
        } else {
            // create vertex package
            var vertexPackage = new VertexPackage( spec.vertices );
            // create vertex buffer
            this.vertexBuffers = [ new VertexBuffer( vertexPackage ) ];
        }
        if ( spec.indexBuffer ) {
            // use existing index buffer
            this.indexBuffer = spec.indexBuffer;
        } else {
            if ( spec.indices ) {
                // create index buffer
                this.indexBuffer = new IndexBuffer( spec.indices );
            }
        }
        // store rendering options
        this.options = {
            mode: options.mode,
            offset: options.offset,
            count: options.count
        };
        return this;
    }

    Renderable.prototype.draw = function( options ) {
        var overrides = options || {};
        // override options if provided
        overrides.mode = overrides.mode || this.options.mode;
        overrides.offset = ( overrides.offset !== undefined ) ? overrides.offset : this.options.offset;
        overrides.count = ( overrides.count !== undefined ) ? overrides.count : this.options.count;
        // draw the renderable
        if ( this.indexBuffer ) {
            // use index buffer to draw elements
            this.vertexBuffers.forEach( function( vertexBuffer ) {
                vertexBuffer.bind();
                // no advantage to unbinding as there is no stack used
            });
            this.indexBuffer.bind();
            this.indexBuffer.draw( overrides );
            // no advantage to unbinding as there is no stack used
        } else {
            // no index buffer, use draw arrays
            this.vertexBuffers.forEach( function( vertexBuffer ) {
                vertexBuffer.bind();
                vertexBuffer.draw( overrides );
                // no advantage to unbinding as there is no stack used
            });
        }
        return this;
    };

    module.exports = Renderable;

}());

},{"../core/IndexBuffer":1,"../core/VertexBuffer":8,"../core/VertexPackage":9}],4:[function(require,module,exports){
(function () {

    'use strict';

    var WebGLContext = require('./WebGLContext'),
        ShaderParser = require('./ShaderParser'),
        Util = require('../util/Util'),
        XHRLoader = require('../util/XHRLoader'),
        Stack = require('../util/Stack'),
        UNIFORM_FUNCTIONS = {
            'bool': 'uniform1i',
            'bool[]': 'uniform1iv',
            'float': 'uniform1f',
            'float[]': 'uniform1fv',
            'int': 'uniform1i',
            'int[]': 'uniform1iv',
            'uint': 'uniform1i',
            'uint[]': 'uniform1iv',
            'vec2': 'uniform2fv',
            'vec2[]': 'uniform2fv',
            'ivec2': 'uniform2iv',
            'ivec2[]': 'uniform2iv',
            'vec3': 'uniform3fv',
            'vec3[]': 'uniform3fv',
            'ivec3': 'uniform3iv',
            'ivec3[]': 'uniform3iv',
            'vec4': 'uniform4fv',
            'vec4[]': 'uniform4fv',
            'ivec4': 'uniform4iv',
            'ivec4[]': 'uniform4iv',
            'mat2': 'uniformMatrix2fv',
            'mat2[]': 'uniformMatrix2fv',
            'mat3': 'uniformMatrix3fv',
            'mat3[]': 'uniformMatrix3fv',
            'mat4': 'uniformMatrix4fv',
            'mat4[]': 'uniformMatrix4fv',
            'sampler2D': 'uniform1i',
            'samplerCube': 'uniform1i'
        },
        _stack = new Stack(),
        _boundShader = null;

    /**
     * Given vertex and fragment shader source, returns an object containing
     * information pertaining to the uniforms and attribtues declared.
     *
     * @param {String} vertSource - The vertex shader source.
     * @param {String} fragSource - The fragment shader source.
     *
     * @returns {Object} The attribute and uniform information.
     */
    function getAttributesAndUniformsFromSource( vertSource, fragSource ) {
        var declarations = ShaderParser.parseDeclarations(
                [ vertSource, fragSource ],
                [ 'uniform', 'attribute' ]),
            attributes = {},
            uniforms = {},
            attrCount = 0,
            declaration,
            i;
        // for each declaration in the shader
        for ( i=0; i<declarations.length; i++ ) {
            declaration = declarations[i];
            // check if its an attribute or uniform
            if ( declaration.qualifier === 'attribute' ) {
                // if attribute, store type and index
                attributes[ declaration.name ] = {
                    type: declaration.type,
                    index: attrCount++
                };
            } else if ( declaration.qualifier === 'uniform' ) {
                // if uniform, store type and buffer function name
                uniforms[ declaration.name ] = {
                    type: declaration.type,
                    func: UNIFORM_FUNCTIONS[ declaration.type + (declaration.count > 1 ? '[]' : '') ]
                };
            }
        }
        return {
            attributes: attributes,
            uniforms: uniforms
        };
    }

    /*
     * Given a shader source string and shader type, compiles the shader and
     * returns the resulting WebGLShader object.
     *
     * @param {WebGLRenderingContext} gl - The webgl rendering context.
     * @param {String} shaderSource - The shader source.
     * @param {String} type - The shader type.
     *
     * @returns {WebGLShader} The compiled shader object.
     */
    function compileShader( gl, shaderSource, type ) {
        var shader = gl.createShader( gl[ type ] );
        gl.shaderSource( shader, shaderSource );
        gl.compileShader( shader );
        if ( !gl.getShaderParameter( shader, gl.COMPILE_STATUS ) ) {
            console.error( 'An error occurred compiling the shaders: ' +
                gl.getShaderInfoLog( shader ) );
            return null;
        }
        return shader;
    }

    /**
     * Binds the attribute locations for the Shader object.
     *
     * @param {Shader} shader - The Shader object.
     */
    function bindAttributeLocations( shader ) {
        var gl = shader.gl,
            attributes = shader.attributes,
            name;
        for ( name in attributes ) {
            if ( attributes.hasOwnProperty( name ) ) {
                // bind the attribute location
                gl.bindAttribLocation(
                    shader.program,
                    attributes[ name ].index,
                    name );
                /*
                console.log( 'Bound vertex attribute \`' + name +
                    '\' to location ' + attributes[ name ].index );
                */
            }
        }
    }

    /**
     * Queries the webgl rendering context for the uniform locations.
     *
     * @param {Shader} shader - The Shader object.
     */
    function getUniformLocations( shader ) {
        var gl = shader.gl,
            uniforms = shader.uniforms,
            uniform,
            name;
        for ( name in uniforms ) {
            if ( uniforms.hasOwnProperty( name ) ) {
                uniform = uniforms[ name ];
                // get the uniform location
                uniform.location = gl.getUniformLocation( shader.program, name );
                /*
                console.log( name + ', ' +
                    gl.getUniformLocation( shader.program, name ) + ',' );
                */
            }
        }
    }

    /**
     * Returns a function to load shader source from a url.
     *
     * @param {String} url - The url to load the resource from.
     *
     * @returns {Function} The function to load the shader source.
     */
    function loadShaderSource( url ) {
        return function( done ) {
            XHRLoader.load(
                url,
                {
                    responseType: 'text',
                    success: done,
                    error: function(err) {
                        console.error( err );
                        done( null );
                    }
                });
        };
    }

    /**
     * Returns a function to pass through the shader source.
     *
     * @param {String} source - The source of the shader.
     *
     * @returns {Function} The function to pass through the shader source.
     */
    function passThroughSource( source ) {
        return function( done ) {
            done( source );
        };
    }

    /**
     * Returns a function that takes an array of GLSL source strings and URLs,
     * and resolves them into and array of GLSL source.
     */
    function resolveSources( sources ) {
        return function( done ) {
            var jobs = [];
            sources = sources || [];
            sources = ( !( sources instanceof Array ) ) ? [ sources ] : sources;
            sources.forEach( function( source ) {
                if ( ShaderParser.isGLSL( source ) ) {
                    jobs.push( passThroughSource( source ) );
                } else {
                    jobs.push( loadShaderSource( source ) );
                }
            });
            Util.async( jobs, function( results ) {
                done( results );
            });
        };
    }

    /**
     * Binds the shader object, caching it to prevent unnecessary rebinds.
     *
     * @param {Shader} shader - The Shader object to bind.
     */
    function bind( shader ) {
        // if this shader is already bound, exit early
        if ( _boundShader === shader ) {
            return;
        }
        shader.gl.useProgram( shader.program );
        _boundShader = shader;
    }

    /**
     * Unbinds the shader object. Prevents unnecessary unbinding.
     *
     * @param {Shader} shader - The Shader object to unbind.
     */
    function unbind( shader ) {
        // if there is no shader bound, exit early
        if ( _boundShader === null ) {
            return;
        }
        shader.gl.useProgram( null );
        _boundShader = null;
    }

    /**
     * Clears the shader attributes due to aborting of initialization.
     *
     * @param {Shader} shader - The Shader object.
     */
    function abortShader( shader ) {
        shader.program = null;
        shader.attributes = null;
        shader.uniforms = null;
        return shader;
    }

    /**
     * Instantiates a Shader object.
     * @class Shader
     * @classdesc A shader class to assist in compiling and linking webgl
     * shaders, storing attribute and uniform locations, and buffering uniforms.
     */
    function Shader( spec, callback ) {
        var that = this;
        spec = spec || {};
        this.program = 0;
        this.gl = WebGLContext.get();
        this.version = spec.version || '1.00';
        // check source arguments
        if ( !spec.vert ) {
            console.error( 'Vertex shader argument has not been provided, ' +
                'shader initialization aborted.' );
        }
        if ( !spec.frag ) {
            console.error( 'Fragment shader argument has not been provided, ' +
                'shader initialization aborted.' );
        }
        // create the shader
        Util.async({
            common: resolveSources( spec.common ),
            vert: resolveSources( spec.vert ),
            frag: resolveSources( spec.frag ),
        }, function( shaders ) {
            that.create( shaders );
            if ( callback ) {
                callback( that );
            }
        });
    }

    /**
     * Creates the shader object from source strings. This includes:
     *    1) Compiling and linking the shader program.
     *    2) Parsing shader source for attribute and uniform information.
     *    3) Binding attribute locations, by order of delcaration.
     *    4) Querying and storing uniform location.
     * @memberof Shader
     *
     * @param {Object} shaders - A map containing sources under 'vert' and
     *     'frag' attributes.
     *
     * @returns {Shader} The shader object, for chaining.
     */
    Shader.prototype.create = function( shaders ) {
        // once all shader sources are loaded
        var gl = this.gl,
            common = shaders.common.join( '' ),
            vert = shaders.vert.join( '' ),
            frag = shaders.frag.join( '' ),
            vertexShader,
            fragmentShader,
            attributesAndUniforms;
        // compile shaders
        vertexShader = compileShader( gl, common + vert, 'VERTEX_SHADER' );
        fragmentShader = compileShader( gl, common + frag, 'FRAGMENT_SHADER' );
        if ( !vertexShader || !fragmentShader ) {
            console.error( 'Aborting instantiation of shader due to compilation errors.' );
            return abortShader( this );
        }
        // parse source for attribute and uniforms
        attributesAndUniforms = getAttributesAndUniformsFromSource( vert, frag );
        // set member attributes
        this.attributes = attributesAndUniforms.attributes;
        this.uniforms = attributesAndUniforms.uniforms;
        // create the shader program
        this.program = gl.createProgram();
        // attach vertex and fragment shaders
        gl.attachShader( this.program, vertexShader );
        gl.attachShader( this.program, fragmentShader );
        // bind vertex attribute locations BEFORE linking
        bindAttributeLocations( this );
        // link shader
        gl.linkProgram( this.program );
        // If creating the shader program failed, alert
        if ( !gl.getProgramParameter( this.program, gl.LINK_STATUS ) ) {
            console.error( 'An error occured linking the shader: ' +
                gl.getProgramInfoLog( this.program ) );
            console.error( 'Aborting instantiation of shader due to linking errors.' );
            return abortShader( this );
        }
        // get shader uniform locations
        getUniformLocations( this );
        return this;
    };

    /**
     * Binds the shader object and pushes it to the front of the stack.
     * @memberof Shader
     *
     * @returns {Shader} The shader object, for chaining.
     */
    Shader.prototype.push = function() {
        _stack.push( this );
        bind( this );
        return this;
    };

    /**
     * Unbinds the shader object and binds the shader beneath it on
     * this stack. If there is no underlying shader, bind the backbuffer.
     * @memberof Shader
     *
     * @returns {Shader} The shader object, for chaining.
     */
    Shader.prototype.pop = function() {
        var top;
        _stack.pop();
        top = _stack.top();
        if ( top ) {
            bind( top );
        } else {
            unbind( this );
        }
        return this;
    };

    /**
     * Buffer a uniform value by name.
     * @memberof Shader
     *
     * @param {String} uniformName - The uniform name in the shader source.
     * @param {*} uniform - The uniform value to buffer.
     *
     * @returns {Shader} The shader object, for chaining.
     */
    Shader.prototype.setUniform = function( uniformName, uniform ) {
        if ( !this.program ) {
            if ( !this.hasLoggedError ) {
                console.warn( 'Attempting to use an incomplete shader, command ignored.' );
                this.hasLoggedError = true;
            }
            return;
        }
        if ( this !== _boundShader ) {
            console.warn( 'Attempting to set uniform `' + uniformName +
                '` for an unbound shader, command ignored.' );
            return;
        }
        var uniformSpec = this.uniforms[ uniformName ],
            func,
            type,
            location,
            value;
        // ensure that the uniform spec exists for the name
        if ( !uniformSpec ) {
            console.warn( 'No uniform found under name `' + uniformName +
                '`, command ignored.' );
            return;
        }
        // ensure that the uniform argument is defined
        if ( uniform === undefined ) {
            console.warn( 'Argument passed for uniform `' + uniformName +
                '` is undefined, command ignored.' );
            return;
        }
        // get the uniform location, type, and buffer function
        func = uniformSpec.func;
        type = uniformSpec.type;
        location = uniformSpec.location;
        value = uniform.toArray ? uniform.toArray() : uniform;
        value = ( value instanceof Array ) ? new Float32Array( value ) : value;
        // convert boolean's to 0 or 1
        value = ( typeof value === 'boolean' ) ? ( value ? 1 : 0 ) : value;
        // pass the arguments depending on the type
        switch ( type ) {
            case 'mat2':
            case 'mat3':
            case 'mat4':
                this.gl[ func ]( location, false, value );
                break;
            default:
                this.gl[ func ]( location, value );
                break;
        }
        return this;
    };

    module.exports = Shader;

}());

},{"../util/Stack":13,"../util/Util":14,"../util/XHRLoader":15,"./ShaderParser":5,"./WebGLContext":11}],5:[function(require,module,exports){
(function () {

    'use strict';

    var PRECISION_QUALIFIERS = {
        highp: true,
        mediump: true,
        lowp: true
    };

    var PRECISION_TYPES = {
        float: 'float',
        vec2: 'float',
        vec3: 'float',
        vec4: 'float',
        ivec2: 'int',
        ivec3: 'int',
        ivec4: 'int',
        int: 'int',
        uint: 'int',
        sampler2D: 'sampler2D',
        samplerCube: 'samplerCube',
    };

    var COMMENTS_REGEXP = /(\/\*([\s\S]*?)\*\/)|(\/\/(.*)$)/gm;
    var ENDLINE_REGEXP = /(\r\n|\n|\r)/gm;
    var WHITESPACE_REGEXP = /\s{2,}/g;
    var BRACKET_WHITESPACE_REGEXP = /(\s*)(\[)(\s*)(\d+)(\s*)(\])(\s*)/g;
    var NAME_COUNT_REGEXP = /([a-zA-Z_][a-zA-Z0-9_]*)(?:\[(\d+)\])?/;
    var PRECISION_REGEX = /\b(precision)\s+(\w+)\s+(\w+)/;
    var GLSL_REGEXP =  /void\s+main\s*\(\s*\)\s*/mi;

    /**
     * Removes standard comments from the provided string.
     *
     * @param {String} str - The string to strip comments from.
     *
     * @return {String} The commentless string.
     */
    function stripComments( str ) {
        // regex source: https://github.com/moagrius/stripcomments
        return str.replace( COMMENTS_REGEXP, '' );
    }

    /**
     * Converts all whitespace into a single ' ' space character.
     *
     * @param {String} str - The string to normalize whitespace from.
     *
     * @return {String} The normalized string.
     */
    function normalizeWhitespace( str ) {
        return str.replace( ENDLINE_REGEXP, ' ' ) // remove line endings
            .replace( WHITESPACE_REGEXP, ' ' ) // normalize whitespace to single ' '
            .replace( BRACKET_WHITESPACE_REGEXP, '$2$4$6' ); // remove whitespace in brackets
    }

    /**
     * Parses the name and count out of a name statement, returning the
     * declaration object.
     *
     * @param {String} qualifier - The qualifier string.
     * @param {String} precision - The precision string.
     * @param {String} type - The type string.
     * @param {String} entry - The variable declaration string.
     */
    function parseNameAndCount( qualifier, precision, type, entry ) {
        // determine name and size of variable
        var matches = entry.match( NAME_COUNT_REGEXP );
        var name = matches[1];
        var count = ( matches[2] === undefined ) ? 1 : parseInt( matches[2], 10 );
        return {
            qualifier: qualifier,
            precision: precision,
            type: type,
            name: name,
            count: count
        };
    }

    /**
     * Parses a single 'statement'. A 'statement' is considered any sequence of
     * characters followed by a semi-colon. Therefore, a single 'statement' in
     * this sense could contain several comma separated declarations. Returns
     * all resulting declarations.
     *
     * @param {String} statement - The statement to parse.
     * @param {Object} precisions - The current state of global precisions.
     *
     * @returns {Array} The array of parsed declaration objects.
     */
    function parseStatement( statement, precisions ) {
        // split statement on commas
        //
        // [ 'uniform highp mat4 A[10]', 'B', 'C[2]' ]
        //
        var commaSplit = statement.split(',').map( function( elem ) {
            return elem.trim();
        });

        // split declaration header from statement
        //
        // [ 'uniform', 'highp', 'mat4', 'A[10]' ]
        //
        var header = commaSplit.shift().split(' ');

        // qualifier is always first element
        //
        // 'uniform'
        //
        var qualifier = header.shift();

        // precision may or may not be declared
        //
        // 'highp' || (if it was omited) 'mat4'
        //
        var precision = header.shift();
        var type;
        // if not a precision keyword it is the type instead
        if ( !PRECISION_QUALIFIERS[ precision ] ) {
            type = precision;
            precision = precisions[ PRECISION_TYPES[ type ] ];
        } else {
            type = header.shift();
        }

        // last part of header will be the first, and possible only variable name
        //
        // [ 'A[10]', 'B', 'C[2]' ]
        //
        var names = header.concat( commaSplit );
        // if there are other names after a ',' add them as well
        var results = [];
        names.forEach( function( name ) {
            results.push( parseNameAndCount( qualifier, precision, type, name ) );
        });
        return results;
    }

    /**
     * Splits the source string by semi-colons and constructs an array of
     * declaration objects based on the provided qualifier keywords.
     *
     * @param {String} source - The shader source string.
     * @param {String|Array} keywords - The qualifier declaration keywords.
     *
     * @returns {Array} The array of qualifier declaration objects.
     */
    function parseSource( source, keywords ) {
        // remove all comments from source
        var commentlessSource = stripComments( source );
        // normalize all whitespace in the source
        var normalized = normalizeWhitespace( commentlessSource );
        // get individual statements ( any sequence ending in ; )
        var statements = normalized.split(';');
        // build regex for parsing statements with targetted keywords
        var keywordStr = keywords.join('|');
        var keywordRegex = new RegExp( '.*\\b(' + keywordStr + ')\\b.*' );
        // parse and store global precision statements and any declarations
        var precisions = {};
        var matched = [];
        // for each statement
        statements.forEach( function( statement ) {
            // check if precision statement
            //
            // [ 'precision highp float', 'precision', 'highp', 'float' ]
            //
            var pmatch = statement.match( PRECISION_REGEX );
            if ( pmatch ) {
                precisions[ pmatch[3] ] = pmatch[2];
                return;
            }
            // check for keywords
            //
            // [ 'uniform float time' ]
            //
            var kmatch = statement.match( keywordRegex );
            if ( kmatch ) {
                // parse statement and add to array
                matched = matched.concat( parseStatement( kmatch[0], precisions ) );
            }
        });
        return matched;
    }

    /**
     * Filters out duplicate declarations present between shaders.
     *
     * @param {Array} declarations - The array of declarations.
     *
     * @returns {Array} The filtered array of declarations.
     */
    function filterDuplicatesByName( declarations ) {
        // in cases where the same declarations are present in multiple
        // sources, this function will remove duplicates from the results
        var seen = {};
        return declarations.filter( function( declaration ) {
            if ( seen[ declaration.name ] ) {
                return false;
            }
            seen[ declaration.name ] = true;
            return true;
        });
    }

    module.exports = {

        /**
         * Parses the provided GLSL source, and returns all declaration statements
         * that contain the provided qualifier type. This can be used to extract
         * all attributes and uniform names and types from a shader.
         *
         * For example, when provided a 'uniform' qualifiers, the declaration:
         * <pre>
         *     'uniform highp vec3 uSpecularColor;'
         * </pre>
         * Would be parsed to:
         * <pre>
         *     {
         *         qualifier: 'uniform',
         *         type: 'vec3',
         *         name: 'uSpecularColor',
         *         count: 1
         *     }
         * </pre>
         * @param {String|Array} sources - The shader sources.
         * @param {String|Array} qualifiers - The qualifiers to extract.
         *
         * @returns {Array} The array of qualifier declaration statements.
         */
        parseDeclarations: function( sources, qualifiers ) {
            // if no sources or qualifiers are provided, return empty array
            if ( !qualifiers || qualifiers.length === 0 ||
                !sources || sources.length === 0 ) {
                return [];
            }
            sources = ( sources instanceof Array ) ? sources : [ sources ];
            qualifiers = ( qualifiers instanceof Array ) ? qualifiers : [ qualifiers ];
            // parse out targetted declarations
            var declarations = [];
            sources.forEach( function( source ) {
                declarations = declarations.concat( parseSource( source, qualifiers ) );
            });
            // remove duplicates and return
            return filterDuplicatesByName( declarations );
        },

        /**
         * Detects based on the existence of a 'void main() {' statement, if
         * the string is glsl source code.
         *
         * @param {String} str - The input string to test.
         *
         * @returns {boolean} - True if the string is glsl code.
         */
        isGLSL: function( str ) {
            return GLSL_REGEXP.test( str );
        }

    };

}());

},{}],6:[function(require,module,exports){
(function () {

    'use strict';

    var WebGLContext = require('./WebGLContext'),
        Util = require('../util/Util'),
        Stack = require('../util/Stack'),
        _stack = {},
        _boundTexture = null;

    /**
     * If the provided image dimensions are not powers of two, it will redraw
     * the image to the next highest power of two.
     *
     * @param {HTMLImageElement} image - The image object.
     *
     * @returns {HTMLImageElement} The new image object.
     */
    function ensurePowerOfTwo( image ) {
        if ( !Util.isPowerOfTwo( image.width ) ||
            !Util.isPowerOfTwo( image.height ) ) {
            var canvas = document.createElement( 'canvas' );
            canvas.width = Util.nextHighestPowerOfTwo( image.width );
            canvas.height = Util.nextHighestPowerOfTwo( image.height );
            var ctx = canvas.getContext('2d');
            ctx.drawImage(
                image,
                0, 0,
                image.width, image.height,
                0, 0,
                canvas.width, canvas.height );
            return canvas;
        }
        return image;
    }

    /**
     * Binds the texture object to a location and activates the texture unit
     * while caching it to prevent unnecessary rebinds.
     *
     * @param {Texture2D} texture - The Texture2D object to bind.
     * @param {number} location - The texture unit location index.
     */
    function bind( texture, location ) {
        // if this buffer is already bound, exit early
        if ( _boundTexture === texture ) {
            return;
        }
        var gl = texture.gl;
        location = gl[ 'TEXTURE' + location ] || gl.TEXTURE0;
        gl.activeTexture( location );
        gl.bindTexture( gl.TEXTURE_2D, texture.texture );
        _boundTexture = texture;
    }

    /**
     * Unbinds the texture object. Prevents unnecessary unbinding.
     *
     * @param {Texture2D} texture - The Texture2D object to unbind.
     */
    function unbind( texture ) {
        // if no buffer is bound, exit early
        if ( _boundTexture === null ) {
            return;
        }
        var gl = texture.gl;
        gl.bindTexture( gl.TEXTURE_2D, null );
        _boundTexture = null;
    }

    /**
     * Instantiates a Texture2D object.
     * @class Texture2D
     * @classdesc A texture class to represent a 2D texture.
     */
    function Texture2D( spec, callback ) {
        var that = this;
        // default
        spec = spec || {};
        this.gl = WebGLContext.get();
        // create texture object
        this.texture = this.gl.createTexture();
        this.wrap = spec.wrap || 'REPEAT';
        this.filter = spec.filter || 'LINEAR';
        this.invertY = spec.invertY !== undefined ? spec.invertY : true;
        this.mipMap = spec.mipMap !== undefined ? spec.mipMap : true;
        this.preMultiplyAlpha = spec.preMultiplyAlpha !== undefined ? spec.preMultiplyAlpha : true;
        // buffer the texture based on arguments
        if ( spec.image ) {
            // use existing Image object
            this.bufferData( spec.image );
            this.setParameters( this );
        } else if ( spec.url ) {
            // request image source from url
            var image = new Image();
            image.onload = function() {
                that.bufferData( image );
                that.setParameters( that );
                callback( that );
            };
            image.src = spec.url;
        } else {
            // assume this texture will be  rendered to. In this case disable
            // mipmapping, there is no need and it will only introduce very
            // peculiar rendering bugs in which the texture 'transforms' at
            // certain angles / distances to the mipmapped (empty) portions.
            this.mipMap = false;
            // buffer data
            if ( spec.format === 'DEPTH_COMPONENT' ) {
                // depth texture
                var depthTextureExt = WebGLContext.checkExtension( 'WEBGL_depth_texture' );
                if( !depthTextureExt ) {
                    console.warn( 'Cannot create Texture2D of format ' +
                        'gl.DEPTH_COMPONENT as WEBGL_depth_texture is ' +
                        'unsupported by this browser, command ignored' );
                    return;
                }
                // set format
                this.format = spec.format;
                // set type
                if ( !spec.type ) {
                    // default to unsigned int for higher precision
                    this.type = 'UNSIGNED_INT';
                } else if ( spec.type === 'UNSIGNED_SHORT' || spec.type === 'UNSIGNED_INT' ) {
                    // set to accept types
                    this.type = spec.type;
                } else {
                    // error
                    console.warn( 'Depth textures do not support type`' +
                        spec.type + '`, defaulting to `UNSIGNED_INT`.');
                    // default
                    this.type = 'UNSIGNED_INT';
                }
                // always disable mip mapping for depth texture
            } else {
                // other
                this.format = spec.format || 'RGBA';
                this.type = spec.type || 'UNSIGNED_BYTE';
            }
            this.internalFormat = this.format; // webgl requires format === internalFormat
            this.bufferData( spec.data || null, spec.width, spec.height );
            this.setParameters( this );
        }
    }

    /**
     * Binds the texture object and pushes it to the front of the stack.
     * @memberof Texture2D
     *
     * @param {number} location - The texture unit location index.
     *
     * @returns {Texture2D} The texture object, for chaining.
     */
    Texture2D.prototype.push = function( location ) {
        _stack[ location ] = _stack[ location ] || new Stack();
        _stack[ location ].push( this );
        bind( this, location );
        return this;
    };

    /**
     * Unbinds the texture object and binds the texture beneath it on
     * this stack. If there is no underlying texture, unbinds the unit.
     * @memberof Texture2D
     *
     * @param {number} location - The texture unit location index.
     *
     * @returns {Texture2D} The texture object, for chaining.
     */
    Texture2D.prototype.pop = function( location ) {
        var top;
        if ( !_stack[ location ] ) {
            console.warn( 'No texture was bound to texture unit `' + location +
                '`, command ignored.' );
        }
        _stack[ location ].pop();
        top = _stack[ location ].top();
        if ( top ) {
            bind( top, location );
        } else {
            unbind( this );
        }
        return this;
    };

    /**
     * Buffer data into the texture.
     * @memberof Texture2D
     *
     * @param {ImageData|ArrayBufferView|HTMLImageElement} data - The data.
     * @param {number} width - The width of the data.
     * @param {number} height - The height of the data.
     *
     * @returns {Texture2D} The texture object, for chaining.
     */
    Texture2D.prototype.bufferData = function( data, width, height ) {
        var gl = this.gl;
        this.push();
        // invert y if specified
        gl.pixelStorei( gl.UNPACK_FLIP_Y_WEBGL, this.invertY );
        // premultiple alpha if specified
        gl.pixelStorei( gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, this.preMultiplyAlpha );
        // buffer texture based on type of data
        if ( data instanceof HTMLImageElement ) {
            // set dimensions of original image before resizing
            this.width = data.width;
            this.height = data.height;
            data = ensurePowerOfTwo( data );
            this.image = data;
            gl.texImage2D(
                gl.TEXTURE_2D,
                0, // level
                gl.RGBA,
                gl.RGBA,
                gl.UNSIGNED_BYTE,
                data );
        } else {
            this.data = data;
            this.width = width || this.width;
            this.height = height || this.height;
            gl.texImage2D(
                gl.TEXTURE_2D,
                0, // level
                gl[ this.internalFormat ],
                this.width,
                this.height,
                0, // border, must be 0
                gl[ this.format ],
                gl[ this.type ],
                this.data );
        }
        if ( this.mipMap ) {
            gl.generateMipmap( gl.TEXTURE_2D );
        }
        this.pop();
        return this;
    };

    /**
     * Set the texture parameters.
     * @memberof Texture2D
     *
     * @param {Object} parameters - The parameters by name.
     * <pre>
     *     wrap | wrap.s | wrap.t - The wrapping type.
     *     filter | filter.min | filter.mag - The filter type.
     * </pre>
     * @returns {Texture2D} The texture object, for chaining.
     */
    Texture2D.prototype.setParameters = function( parameters ) {
        var gl = this.gl;
        this.push();
        if ( parameters.wrap ) {
            // set wrap parameters
            this.wrap = parameters.wrap;
            gl.texParameteri(
                gl.TEXTURE_2D,
                gl.TEXTURE_WRAP_S,
                gl[ this.wrap.s || this.wrap ] );
            gl.texParameteri(
                gl.TEXTURE_2D,
                gl.TEXTURE_WRAP_T,
                gl[ this.wrap.t || this.wrap ] );
        }
        if ( parameters.filter ) {
            // set filter parameters
            this.filter = parameters.filter;
            var minFilter = this.filter.min || this.filter;
            if ( this.mipMap ) {
                // append mipmap suffix to min filter
                minFilter += '_MIPMAP_LINEAR';
            }
            gl.texParameteri(
                gl.TEXTURE_2D,
                gl.TEXTURE_MAG_FILTER,
                gl[ this.filter.mag || this.filter ] );
            gl.texParameteri(
                gl.TEXTURE_2D,
                gl.TEXTURE_MIN_FILTER,
                gl[ minFilter] );
        }
        this.pop();
        return this;
    };

    /**
     * Resize the texture.
     * @memberof Texture2D
     *
     * @param {number} width - The new width of the texture.
     * @param {number} height - The new height of the texture.
     *
     * @returns {Texture2D} The texture object, for chaining.
     */
    Texture2D.prototype.resize = function( width, height ) {
        if ( this.image ) {
            // there is no need to ever resize a texture that is based
            // of an actual image. That is what sampling is for.
            console.error( 'Cannot resize image based Texture2D' );
            return;
        }
        if ( !width || !height ) {
            console.warn( 'Width or height arguments missing, command ignored.' );
            return;
        }
        this.bufferData( this.data, width, height );
        return this;
    };

    module.exports = Texture2D;

}());

},{"../util/Stack":13,"../util/Util":14,"./WebGLContext":11}],7:[function(require,module,exports){
(function () {

    'use strict';

    var WebGLContext = require('./WebGLContext'),
        Util = require('../util/Util'),
        Stack = require('../util/Stack'),
        FACES = [
            '-x', '+x',
            '-y', '+y',
            '-z', '+z'
        ],
        FACE_TARGETS = {
            '+z': 'TEXTURE_CUBE_MAP_POSITIVE_Z',
            '-z': 'TEXTURE_CUBE_MAP_NEGATIVE_Z',
            '+x': 'TEXTURE_CUBE_MAP_POSITIVE_X',
            '-x': 'TEXTURE_CUBE_MAP_NEGATIVE_X',
            '+y': 'TEXTURE_CUBE_MAP_POSITIVE_Y',
            '-y': 'TEXTURE_CUBE_MAP_NEGATIVE_Y'
        },
        _stack = {},
        _boundTexture = null;

    /**
     * If the provided image dimensions are not powers of two, it will redraw
     * the image to the next highest power of two.
     *
     * @param {HTMLImageElement} image - The image object.
     *
     * @returns {HTMLImageElement} The new image object.
     */
    function ensurePowerOfTwo( image ) {
        if ( !Util.isPowerOfTwo( image.width ) ||
            !Util.isPowerOfTwo( image.height ) ) {
            var canvas = document.createElement( 'canvas' );
            canvas.width = Util.nextHighestPowerOfTwo( image.width );
            canvas.height = Util.nextHighestPowerOfTwo( image.height );
            var ctx = canvas.getContext('2d');
            ctx.drawImage(
                image,
                0, 0,
                image.width, image.height,
                0, 0,
                canvas.width, canvas.height );
            return canvas;
        }
        return image;
    }

    /**
     * Binds the texture object to a location and activates the texture unit
     * while caching it to prevent unnecessary rebinds.
     *
     * @param {TextureCubeMap} texture - The TextureCubeMap object to bind.
     * @param {number} location - The texture unit location index.
     */
    function bind( texture, location ) {
        // if this buffer is already bound, exit early
        if ( _boundTexture === texture ) {
            return;
        }
        var gl = texture.gl;
        location = gl[ 'TEXTURE' + location ] || gl.TEXTURE0;
        gl.activeTexture( location );
        gl.bindTexture( gl.TEXTURE_CUBE_MAP, texture.texture );
        _boundTexture = texture;
    }

    /**
     * Unbinds the texture object. Prevents unnecessary unbinding.
     *
     * @param {TextureCubeMap} texture - The TextureCubeMap object to unbind.
     */
    function unbind( texture ) {
        // if no buffer is bound, exit early
        if ( _boundTexture === null ) {
            return;
        }
        var gl = texture.gl;
        gl.bindTexture( gl.TEXTURE_CUBE_MAP, null );
        _boundTexture = null;
    }

    /**
     * Returns a function to load and buffer a given cube map face.
     *
     * @param {TextureCubeMap} cubeMap - The cube map object.
     * @param {String} url - The url to load the image.
     * @param {String} face - The face identification string.
     *
     * @returns {Function} The resulting function.
     */
    function loadAndBufferImage( cubeMap, url, face ) {
        return function( done ) {
            var image = new Image();
            image.onload = function() {
                // buffer face texture
                cubeMap.bufferFaceData( face, image );
                done();
            };
            image.src = url;
        };
    }

    /**
     * Instantiates a TextureCubeMap object.
     * @class TextureCubeMap
     * @classdesc A texture class to represent a cube map texture.
     */
    function TextureCubeMap( spec, callback ) {
        var that = this,
            face,
            jobs;
        // store gl context
        this.gl = WebGLContext.get();
        this.texture = this.gl.createTexture();
        this.wrap = spec.wrap || 'CLAMP_TO_EDGE';
        this.filter = spec.filter || 'LINEAR';
        this.invertY = spec.invertY !== undefined ? spec.invertY : false;
        // create cube map based on input
        if ( spec.images ) {
            // multiple Image objects
            for ( face in spec.images ) {
                if ( spec.images.hasOwnProperty( face ) ) {
                    // buffer face texture
                    this.bufferFaceData( face, spec.images[ face ] );
                }
            }
            this.setParameters( this );
        } else if ( spec.urls ) {
            // multiple urls
            jobs = {};
            for ( face in spec.urls ) {
                if ( spec.urls.hasOwnProperty( face ) ) {
                    // add job to map
                    jobs[ face ] = loadAndBufferImage(
                        this,
                        spec.urls[ face ],
                        face );
                }
            }
            Util.async( jobs, function() {
                that.setParameters( that );
                callback( that );
            });
        } else {
            // empty cube map
            this.format = spec.format || 'RGBA';
            this.internalFormat = this.format; // webgl requires format === internalFormat
            this.type = spec.type || 'UNSIGNED_BYTE';
            this.mipMap = spec.mipMap !== undefined ? spec.mipMap : false;
            FACES.forEach( function( face ) {
                var data = ( spec.data ? spec.data[face] : spec.data ) || null;
                that.bufferFaceData( face, data, spec.width, spec.height );
            });
            this.setParameters( this );
        }
    }

    /**
     * Binds the texture object and pushes it to the front of the stack.
     * @memberof TextureCubeMap
     *
     * @param {number} location - The texture unit location index.
     *
     * @returns {TextureCubeMap} The texture object, for chaining.
     */
     TextureCubeMap.prototype.push = function( location ) {
        _stack[ location ] = _stack[ location ] || new Stack();
        _stack[ location ].push( this );
        bind( this, location );
        return this;
    };

    /**
     * Unbinds the texture object and binds the texture beneath it on
     * this stack. If there is no underlying texture, unbinds the unit.
     * @memberof TextureCubeMap
     *
     * @param {number} location - The texture unit location index.
     *
     * @returns {TextureCubeMap} The texture object, for chaining.
     */
     TextureCubeMap.prototype.pop = function( location ) {
        var top;
        if ( !_stack[ location ] ) {
            console.log('No texture was bound to texture unit `' + location +
                '`, command ignored.');
        }
        _stack[ location ].pop();
        top = _stack[ location ].top();
        if ( top ) {
            bind( top, location );
        } else {
            unbind( this );
        }
        return this;
    };

    /**
     * Buffer data into the respective cube map face.
     * @memberof TextureCubeMap
     *
     * @param {String} face - The face identification string.
     * @param {ImageData|ArrayBufferView|HTMLImageElement} data - The data.
     * @param {number} width - The width of the data.
     * @param {number} height - The height of the data.
     *
     * @returns {TextureCubeMap} The texture object, for chaining.
     */
    TextureCubeMap.prototype.bufferFaceData = function( face, data, width, height ) {
        var gl = this.gl,
            faceTarget = gl[ FACE_TARGETS[ face ] ];
        if ( !faceTarget ) {
            console.log('Invalid face enumeration `' + face + '` provided, ' +
                'command ignored.');
        }
        // buffer face texture
        this.push();
        if ( data instanceof HTMLImageElement ) {
            this.images = this.images || {};
            this.images[ face ] = ensurePowerOfTwo( data );
            this.filter = 'LINEAR'; // must be linear for mipmapping
            this.mipMap = true;
            gl.pixelStorei( gl.UNPACK_FLIP_Y_WEBGL, this.invertY );
            gl.texImage2D(
                faceTarget,
                0, // level
                gl.RGBA,
                gl.RGBA,
                gl.UNSIGNED_BYTE,
                this.images[ face ] );
        } else {
            this.data = this.data || {};
            this.data[ face ] = data;
            this.width = width || this.width;
            this.height = height || this.height;
            gl.texImage2D(
                faceTarget,
                0, // level
                gl[ this.internalFormat ],
                this.width,
                this.height,
                0, // border, must be 0
                gl[ this.format ],
                gl[ this.type ],
                data );
        }
        // only generate mipmaps if all faces are buffered
        this.bufferedFaces = this.bufferedFaces || {};
        this.bufferedFaces[ face ] = true;
        // once all faces are buffered
        if ( this.mipMap &&
            this.bufferedFaces['-x'] && this.bufferedFaces['+x'] &&
            this.bufferedFaces['-y'] && this.bufferedFaces['+y'] &&
            this.bufferedFaces['-z'] && this.bufferedFaces['+z'] ) {
            // generate mipmaps once all faces are buffered
            gl.generateMipmap( gl.TEXTURE_CUBE_MAP );
        }
        this.pop();
        return this;
    };

    /**
     * Set the texture parameters.
     * @memberof TextureCubeMap
     *
     * @param {Object} parameters - The parameters by name.
     * <pre>
     *     wrap | wrap.s | wrap.t - The wrapping type.
     *     filter | filter.min | filter.mag - The filter type.
     * </pre>
     * @returns {TextureCubeMap} The texture object, for chaining.
     */
    TextureCubeMap.prototype.setParameters = function( parameters ) {
        var gl = this.gl;
        this.push();
        if ( parameters.wrap ) {
            // set wrap parameters
            this.wrap = parameters.wrap;
            gl.texParameteri(
                gl.TEXTURE_CUBE_MAP,
                gl.TEXTURE_WRAP_S,
                gl[ this.wrap.s || this.wrap ] );
            gl.texParameteri(
                gl.TEXTURE_CUBE_MAP,
                gl.TEXTURE_WRAP_T,
                gl[ this.wrap.t || this.wrap ] );
            /* not supported in webgl 1.0
            gl.texParameteri(
                gl.TEXTURE_CUBE_MAP,
                gl.TEXTURE_WRAP_R,
                gl[ this.wrap.r || this.wrap ] );
            */
        }
        if ( parameters.filter ) {
            // set filter parameters
            this.filter = parameters.filter;
            var minFilter = this.filter.min || this.filter;
            if ( this.minMap ) {
                // append min mpa suffix to min filter
                minFilter += '_MIPMAP_LINEAR';
            }
            gl.texParameteri(
                gl.TEXTURE_CUBE_MAP,
                gl.TEXTURE_MAG_FILTER,
                gl[ this.filter.mag || this.filter ] );
            gl.texParameteri(
                gl.TEXTURE_CUBE_MAP,
                gl.TEXTURE_MIN_FILTER,
                gl[ minFilter] );
        }
        this.pop();
        return this;
    };

    module.exports = TextureCubeMap;

}());

},{"../util/Stack":13,"../util/Util":14,"./WebGLContext":11}],8:[function(require,module,exports){
(function () {

    'use strict';

    var WebGLContext = require('./WebGLContext'),
        VertexPackage = require('./VertexPackage'),
        Util = require('../util/Util'),
        _boundBuffer = null,
        _enabledAttributes = null;

    function getStride( attributePointers ) {
        var BYTES_PER_COMPONENT = 4;
        var maxOffset = 0;
        var stride = 0;
        Object.keys( attributePointers ).forEach( function( key ) {
            // track the largest offset to determine the stride of the buffer
            var pointer = attributePointers[ key ];
            var offset = pointer.offset;
            if ( offset > maxOffset ) {
                maxOffset = offset;
                stride = offset + ( pointer.size * BYTES_PER_COMPONENT );
            }
        });
        return stride;
    }

    function getAttributePointers( attributePointers ) {
        // ensure there are pointers provided
        if ( !attributePointers || Object.keys( attributePointers ).length === 0 ) {
            console.warning( 'VertexBuffer requires attribute pointers to be ' +
                'specified upon instantiation, this buffer will not draw correctly.' );
            return {};
        }
        // parse pointers to ensure they are valid
        var pointers = {};
        Object.keys( attributePointers ).forEach( function( key ) {
            var index = parseInt( key, 10 );
            // check that key is an valid integer
            if ( isNaN( index ) ) {
                console.warn('Attribute index `' + key + '` does not represent an integer, discarding attribute pointer.');
                return;
            }
            var pointer = attributePointers[key];
            var size = pointer.size;
            var type = pointer.type;
            var offset = pointer.offset;
            // check size
            if ( !size || size < 1 || size > 4 ) {
                console.warn('Attribute pointer `size` parameter is invalid, ' +
                    'defaulting to 4.');
                size = 4;
            }
            // check type
            if ( !type || type !== 'FLOAT' ) {
                console.warn('Attribute pointer `type` parameter is invalid, ' +
                    'defaulting to `FLOAT`.');
                type = 'FLOAT';
            }
            pointers[ index ] = {
                size: size,
                type: type,
                offset: ( offset !== undefined ) ? offset : 0
            };
        });
        return pointers;
    }

    function getNumComponents(pointers) {
        var size = 0;
        var index;
        for ( index in pointers ) {
            if ( pointers.hasOwnProperty( index ) ) {
                size += pointers[ index ].size;
            }
        }
        return size;
    }

    function VertexBuffer( arg, attributePointers, options ) {
        options = options || {};
        this.buffer = 0;
        this.gl = WebGLContext.get();
        // first, set the attribute pointers
        if ( arg instanceof VertexPackage ) {
            // VertexPackage argument, use its attribute pointers
            this.pointers = arg.attributePointers();
            // shift options arg since there will be no attrib pointers arg
            options = attributePointers || {};
        } else {
            this.pointers = getAttributePointers( attributePointers );
        }
        // then buffer the data
        if ( arg ) {
            if ( arg instanceof VertexPackage ) {
                // VertexPackage argument
                this.bufferData( arg.buffer() );
            } else if ( arg instanceof WebGLBuffer ) {
                // WebGLBuffer argument
                this.buffer = arg;
                this.count = ( options.count !== undefined ) ? options.count : 0;
            } else {
                // Array or ArrayBuffer or number argument
                this.bufferData( arg );
            }
        }
        // set stride
        this.stride = getStride( this.pointers );
        // set draw offset and mode
        this.offset = ( options.offset !== undefined ) ? options.offset : 0;
        this.mode = ( options.mode !== undefined ) ? options.mode : 'TRIANGLES';
    }

    VertexBuffer.prototype.bufferData = function( arg ) {
        var gl = this.gl;
        if ( arg instanceof Array ) {
            // cast arrays into bufferview
            arg = new Float32Array( arg );
        } else if ( !Util.isTypedArray( arg ) && typeof arg !== 'number' ) {
            console.error( 'VertexBuffer requires an Array or ArrayBuffer, ' +
                'or a size argument, command ignored.' );
            return;
        }
        if ( !this.buffer ) {
            this.buffer = gl.createBuffer();
        }
        // get the total number of attribute components from pointers
        var numComponents = getNumComponents(this.pointers);
        // set count based on size of buffer and number of components
        if (typeof arg === 'number') {
            this.count = arg / numComponents;
        } else {
            this.count = arg.length / numComponents;
        }
        gl.bindBuffer( gl.ARRAY_BUFFER, this.buffer );
        gl.bufferData( gl.ARRAY_BUFFER, arg, gl.STATIC_DRAW );
    };

    VertexBuffer.prototype.bufferSubData = function( array, offset ) {
        var gl = this.gl;
        if ( !this.buffer ) {
            console.error( 'VertexBuffer has not been initially buffered, ' +
                'command ignored.' );
            return;
        }
        if ( array instanceof Array ) {
            array = new Float32Array( array );
        } else if ( !Util.isTypedArray( array ) ) {
            console.error( 'VertexBuffer requires an Array or ArrayBuffer ' +
                'argument, command ignored.' );
            return;
        }
        offset = ( offset !== undefined ) ? offset : 0;
        gl.bindBuffer( gl.ARRAY_BUFFER, this.buffer );
        gl.bufferSubData( gl.ARRAY_BUFFER, offset, array );
    };

    VertexBuffer.prototype.bind = function() {
        // if this buffer is already bound, exit early
        if ( _boundBuffer === this ) {
            return;
        }
        var gl = this.gl,
            pointers = this.pointers,
            previouslyEnabledAttributes = _enabledAttributes || {},
            pointer,
            index;
        // cache this vertex buffer
        _boundBuffer = this;
        _enabledAttributes = {};
        // bind buffer
        gl.bindBuffer( gl.ARRAY_BUFFER, this.buffer );
        for ( index in pointers ) {
            if ( pointers.hasOwnProperty( index ) ) {
                pointer = this.pointers[ index ];
                // set attribute pointer
                gl.vertexAttribPointer( index,
                    pointer.size,
                    gl[ pointer.type ],
                    false,
                    this.stride,
                    pointer.offset );
                // enabled attribute array
                gl.enableVertexAttribArray( index );
                // cache attribute
                _enabledAttributes[ index ] = true;
                // remove from previous list
                delete previouslyEnabledAttributes[ index ];
            }
        }
        // ensure leaked attribute arrays are disabled
        for ( index in previouslyEnabledAttributes ) {
            if ( previouslyEnabledAttributes.hasOwnProperty( index ) ) {
                gl.disableVertexAttribArray( index );
            }
        }
    };

    VertexBuffer.prototype.draw = function( options ) {
        options = options || {};
        if ( _boundBuffer === null ) {
            console.warn( 'No VertexBuffer is bound, command ignored.' );
            return;
        }
        var gl = this.gl;
        var mode = gl[ options.mode || this.mode || 'TRIANGLES' ];
        var offset = ( options.offset !== undefined ) ? options.offset : this.offset;
        var count = ( options.count !== undefined ) ? options.count : this.count;
        gl.drawArrays(
            mode, // primitive type
            offset, // offset
            count ); // count
    };

    VertexBuffer.prototype.unbind = function() {
        // if no buffer is bound, exit early
        if ( _boundBuffer === null ) {
            return;
        }
        var gl = this.gl,
            pointers = this.pointers,
            index;
        for ( index in pointers ) {
            if ( pointers.hasOwnProperty( index ) ) {
                gl.disableVertexAttribArray( index );
            }
        }
        gl.bindBuffer( gl.ARRAY_BUFFER, null );
        _boundBuffer = null;
        _enabledAttributes = {};
    };

    module.exports = VertexBuffer;

}());

},{"../util/Util":14,"./VertexPackage":9,"./WebGLContext":11}],9:[function(require,module,exports){
(function () {

    'use strict';

    var COMPONENT_TYPE = 'FLOAT';
    var BYTES_PER_COMPONENT = 4;

    /**
     * Removes invalid attribute arguments. A valid argument
     * must be an Array of length > 0 key by a string representing an int.
     *
     * @param {Object} attributes - The map of vertex attributes.
     *
     * @returns {Array} The valid array of arguments.
     */
    function parseAttributeMap( attributes ) {
        var goodAttributes = [];
        Object.keys( attributes ).forEach( function( key ) {
            var index = parseInt( key, 10 );
            // check that key is an valid integer
            if ( isNaN( index ) ) {
                console.warn('Attribute index `' + key + '` does not ' +
                    'represent an integer, discarding attribute pointer.');
                return;
            }
            var vertices = attributes[key];
            // ensure attribute is valid
            if ( vertices &&
                vertices instanceof Array &&
                vertices.length > 0 ) {
                // add attribute data and index
                goodAttributes.push({
                    index: index,
                    data: vertices
                });
            } else {
                console.warn( 'Error parsing attribute of index `' + key +
                    '`, attribute discarded.' );
            }
        });
        // sort attributes ascending by index
        goodAttributes.sort(function(a,b) {
            return a.index - b.index;
        });
        return goodAttributes;
    }

    /**
     * Returns a component's byte size.
     *
     * @param {Object|Array} component - The component to measure.
     *
     * @returns {integer} The byte size of the component.
     */
    function getComponentSize( component ) {
        // check if vector
        if ( component.x !== undefined ) {
            // 1 component vector
            if ( component.y !== undefined ) {
                // 2 component vector
                if ( component.z !== undefined ) {
                    // 3 component vector
                    if ( component.w !== undefined ) {
                        // 4 component vector
                        return 4;
                    }
                    return 3;
                }
                return 2;
            }
            return 1;
        }
        // check if array
        if ( component instanceof Array ) {
            return component.length;
        }
        return 1;
    }

    /**
     * Calculates the type, size, and offset for each attribute in the
     * attribute array along with the length and stride of the package.
     *
     * @param {VertexPackage} vertexPackage - The VertexPackage object.
     * @param {Array} attributes - The array of vertex attributes.
     */
    function setPointersAndStride( vertexPackage, attributes ) {
        var shortestArray = Number.MAX_VALUE;
        var offset = 0;
        // clear pointers
        vertexPackage.pointers = {};
        // for each attribute
        attributes.forEach( function( vertices ) {
            // set size to number of components in the attribute
            var size = getComponentSize( vertices.data[0] );
            // length of the package will be the shortest attribute array length
            shortestArray = Math.min( shortestArray, vertices.data.length );
            // store pointer under index
            vertexPackage.pointers[ vertices.index ] = {
                type : COMPONENT_TYPE,
                size : size,
                offset : offset * BYTES_PER_COMPONENT
            };
            // accumulate attribute offset
            offset += size;
        });
        // set stride to total offset
        vertexPackage.stride = offset * BYTES_PER_COMPONENT;
        // set length of package to the shortest attribute array length
        vertexPackage.length = shortestArray;
    }

    function VertexPackage( attributes ) {
        if ( attributes !== undefined ) {
            return this.set( attributes );
        } else {
            this.data = new Float32Array(0);
            this.pointers = {};
        }
    }

    VertexPackage.prototype.set = function( attributeMap ) {
        var that = this;
        // remove bad attributes
        var attributes = parseAttributeMap( attributeMap );
        // set attribute pointers and stride
        setPointersAndStride( this, attributes );
        // set size of data vector
        this.data = new Float32Array( this.length * ( this.stride / BYTES_PER_COMPONENT ) );
        // for each vertex attribute array
        attributes.forEach( function( vertices ) {
            // get the pointer
            var pointer = that.pointers[ vertices.index ];
            // get the pointers offset
            var offset = pointer.offset / BYTES_PER_COMPONENT;
            // get the package stride
            var stride = that.stride / BYTES_PER_COMPONENT;
            // for each vertex
            var vertex, i, j;
            for ( i=0; i<that.length; i++ ) {
                vertex = vertices.data[i];
                // get the index in the buffer to the particular vertex
                j = offset + ( stride * i );
                switch ( pointer.size ) {
                    case 2:
                        that.data[j] = ( vertex.x !== undefined ) ? vertex.x : vertex[0];
                        that.data[j+1] = ( vertex.y !== undefined ) ? vertex.y : vertex[1];
                        break;
                    case 3:
                        that.data[j] = ( vertex.x !== undefined ) ? vertex.x : vertex[0];
                        that.data[j+1] = ( vertex.y !== undefined ) ? vertex.y : vertex[1];
                        that.data[j+2] = ( vertex.z !== undefined ) ? vertex.z : vertex[2];
                        break;
                    case 4:
                        that.data[j] = ( vertex.x !== undefined ) ? vertex.x : vertex[0];
                        that.data[j+1] = ( vertex.y !== undefined ) ? vertex.y : vertex[1];
                        that.data[j+2] = ( vertex.z !== undefined ) ? vertex.z : vertex[2];
                        that.data[j+3] = ( vertex.w !== undefined ) ? vertex.w : vertex[3];
                        break;
                    default:
                        if ( vertex.x !== undefined ) {
                            that.data[j] = vertex.x;
                        } else if ( vertex[0] !== undefined ) {
                            that.data[j] = vertex[0];
                        } else {
                            that.data[j] = vertex;
                        }
                        break;
                }
            }
        });
        return this;
    };

    VertexPackage.prototype.buffer = function() {
        return this.data;
    };

    VertexPackage.prototype.attributePointers = function() {
        return this.pointers;
    };

    module.exports = VertexPackage;

}());

},{}],10:[function(require,module,exports){
(function() {

    'use strict';

    var WebGLContext = require('./WebGLContext'),
        Stack = require('../util/Stack'),
        _stack = new Stack();

    function set( viewport, x, y, width, height ) {
        var gl = viewport.gl;
        x = ( x !== undefined ) ? x : viewport.x;
        y = ( y !== undefined ) ? y : viewport.y;
        width = ( width !== undefined ) ? width : viewport.width;
        height = ( height !== undefined ) ? height : viewport.height;
        gl.viewport( x, y, width, height );
    }

    function Viewport( spec ) {
        spec = spec || {};
        this.gl = WebGLContext.get();
        // set size
        this.resize(
            spec.width || this.gl.canvas.width,
            spec.height || this.gl.canvas.height );
        // set offset
        this.offset(
            spec.x !== undefined ? spec.x : 0,
            spec.y !== undefined ? spec.y : 0);
    }

    /**
     * Updates the viewport objects width and height.
     * @memberof Viewport
     *
     * @returns {Viewport} The viewport object, for chaining.
     */
    Viewport.prototype.resize = function( width, height ) {
        if ( width !== undefined && height !== undefined ) {
            this.width = width;
            this.height = height;
            this.gl.canvas.width = width + this.x;
            this.gl.canvas.height = height + this.y;
        }
        return this;
    };

    /**
     * Updates the viewport objects x and y offsets.
     * @memberof Viewport
     *
     * @returns {Viewport} The viewport object, for chaining.
     */
    Viewport.prototype.offset = function( x, y ) {
        if ( x !== undefined && y !== undefined ) {
            this.x = x;
            this.y = y;
            this.gl.canvas.width = this.width + x;
            this.gl.canvas.height = this.height + y;
        }
        return this;
    };

    /**
     * Sets the viewport object and pushes it to the front of the stack.
     * @memberof Viewport
     *
     * @returns {Viewport} The viewport object, for chaining.
     */
     Viewport.prototype.push = function( x, y, width, height ) {
        _stack.push({
            viewport: this,
            x: x,
            y: y,
            width: width,
            height: height
        });
        set( this, x, y, width, height );
        return this;
    };

    /**
     * Pops current the viewport object and sets the viewport beneath it.
     * @memberof Viewport
     *
     * @returns {Viewport} The viewport object, for chaining.
     */
     Viewport.prototype.pop = function() {
        var top;
        _stack.pop();
        top = _stack.top();
        if ( top ) {
            set( top.viewport, top.x, top.y, top.width, top.height );
        } else {
            set( this );
        }
        return this;
    };

    module.exports = Viewport;

}());

},{"../util/Stack":13,"./WebGLContext":11}],11:[function(require,module,exports){
(function() {

    'use strict';

    var _boundContext = null,
        _contextsById = {},
        EXTENSIONS = [
            // ratified
            'OES_texture_float',
            'OES_texture_half_float',
            'WEBGL_lose_context',
            'OES_standard_derivatives',
            'OES_vertex_array_object',
            'WEBGL_debug_renderer_info',
            'WEBGL_debug_shaders',
            'WEBGL_compressed_texture_s3tc',
            'WEBGL_depth_texture',
            'OES_element_index_uint',
            'EXT_texture_filter_anisotropic',
            'WEBGL_draw_buffers',
            'ANGLE_instanced_arrays',
            'OES_texture_float_linear',
            'OES_texture_half_float_linear',
            // community
            'WEBGL_compressed_texture_atc',
            'WEBGL_compressed_texture_pvrtc',
            'EXT_color_buffer_half_float',
            'WEBGL_color_buffer_float',
            'EXT_frag_depth',
            'EXT_sRGB',
            'WEBGL_compressed_texture_etc1',
            'EXT_blend_minmax',
            'EXT_shader_texture_lod'
        ];

    /**
     * Returns a Canvas element object from either an existing object, or
     * identification string.
     *
     * @param {HTMLCanvasElement|String} arg - The Canvas
     *     object or Canvas identification string.
     *
     * @returns {HTMLCanvasElement} The Canvas element object.
     */
    function getCanvas( arg ) {
        if ( arg instanceof HTMLImageElement ||
             arg instanceof HTMLCanvasElement ) {
            return arg;
        } else if ( typeof arg === 'string' ) {
            return document.getElementById( arg );
        }
        return null;
    }

    /**
     * Attempts to retreive a wrapped WebGLRenderingContext.
     *
     * @param {HTMLCanvasElement} The Canvas element object to create the context under.
     *
     * @returns {Object} The context wrapper.
     */
    function getContextWrapper( arg ) {
        if ( !arg ) {
            if ( _boundContext ) {
                // return last bound context
                return _boundContext;
            }
        } else {
            var canvas = getCanvas( arg );
            if ( canvas ) {
                return _contextsById[ canvas.id ];
            }
        }
        // no bound context or argument
        return null;
    }

    /**
     * Attempts to load all known extensions for a provided
     * WebGLRenderingContext. Stores the results in the context wrapper for
     * later queries.
     *
     * @param {Object} contextWrapper - The context wrapper.
     */
    function loadExtensions( contextWrapper ) {
        var gl = contextWrapper.gl,
            extension,
            i;
        for ( i=0; i<EXTENSIONS.length; i++ ) {
            extension = EXTENSIONS[i];
            contextWrapper.extensions[ extension ] = gl.getExtension( extension );
        }
    }

    /**
     * Attempts to create a WebGLRenderingContext wrapped inside an object which
     * will also store the extension query results.
     *
     * @param {HTMLCanvasElement} The Canvas element object to create the context under.
     * @param {Object}} options - Parameters to the webgl context, only used during instantiation. Optional.
     *
     * @returns {Object} The context wrapper.
     */
    function createContextWrapper( canvas, options ) {
        var contextWrapper,
            gl;
        try {
            // get WebGL context, fallback to experimental
            gl = canvas.getContext( 'webgl', options ) || canvas.getContext( 'experimental-webgl', options );
            // wrap context
            contextWrapper = {
                id: canvas.id,
                gl: gl,
                extensions: {}
            };
            // load WebGL extensions
            loadExtensions( contextWrapper );
            // add context wrapper to map
            _contextsById[ canvas.id ] = contextWrapper;
            // bind the context
            _boundContext = contextWrapper;
        } catch( err ) {
            console.error( err.message );
        }
        if ( !gl ) {
            console.error( 'Unable to initialize WebGL. Your browser may not ' +
                'support it.' );
        }
        return contextWrapper;
    }

    module.exports = {

        /**
         * Binds a specific WebGL context as the active context. This context
         * will be used for all code /webgl.
         *
         * @param {HTMLCanvasElement|String} arg - The Canvas object or Canvas identification string.
         *
         * @returns {WebGLContext} This namespace, used for chaining.
         */
        bind: function( arg ) {
            var wrapper = getContextWrapper( arg );
            if ( wrapper ) {
                _boundContext = wrapper;
                return this;
            }
            console.error( 'No context exists for provided argument `' + arg +
                '`, command ignored.' );
            return this;
        },

        /**
         * Creates a new or retreives an existing WebGL context for a provided
         * canvas object. During creation attempts to load all extensions found
         * at: https://www.khronos.org/registry/webgl/extensions/. If no
         * argument is provided it will attempt to return the currently bound
         * context. If no context is bound, it will return 'null'.
         *
         * @param {HTMLCanvasElement|String} arg - The Canvas object or Canvas identification string. Optional.
         * @param {Object}} options - Parameters to the webgl context, only used during instantiation. Optional.
         *
         * @returns {WebGLRenderingContext} The WebGLRenderingContext context object.
         */
        get: function( arg, options ) {
            var wrapper = getContextWrapper( arg );
            if ( wrapper ) {
                // return the native WebGLRenderingContext
                return wrapper.gl;
            }
            // get canvas element
            var canvas = getCanvas( arg );
            // try to find or create context
            if ( !canvas || !createContextWrapper( canvas, options ) ) {
                console.error( 'Context could not be found or created for ' +
                    'argument of type`' + ( typeof arg ) + '`, returning `null`.' );
                return null;
            }
            // return context
            return _contextsById[ canvas.id ].gl;
        },

        /**
         * Returns an array of all supported extensions for the provided canvas
         * object. If no argument is provided it will attempt to query the
         * currently bound context. If no context is bound, it will return
         * an empty array.
         *
         * @param {HTMLCanvasElement|String} arg - The Canvas object or Canvas identification string. Optional.
         *
         * @returns {Array} All supported extensions.
         */
        supportedExtensions: function( arg ) {
            var wrapper = getContextWrapper( arg );
            if ( wrapper ) {
                var extensions = wrapper.extensions;
                var supported = [];
                for ( var key in extensions ) {
                    if ( extensions.hasOwnProperty( key ) && extensions[ key ] ) {
                        supported.push( key );
                    }
                }
                return supported;
            }
            console.error('No context is currently bound or was provided, ' +
                'returning an empty array.');
            return [];
        },

        /**
         * Returns an array of all unsupported extensions for the provided canvas
         * object. If no argument is provided it will attempt to query the
         * currently bound context. If no context is bound, it will return
         * an empty array.
         *
         * @param {HTMLCanvasElement|String} arg - The Canvas object or Canvas identification string. Optional.
         *
         * @returns {Array} All unsupported extensions.
         */
        unsupportedExtensions: function( arg ) {
            var wrapper = getContextWrapper( arg );
            if ( wrapper ) {
                var extensions = wrapper.extensions;
                var unsupported = [];
                for ( var key in extensions ) {
                    if ( extensions.hasOwnProperty( key ) && !extensions[ key ] ) {
                        unsupported.push( key );
                    }
                }
                return unsupported;
            }
            console.error('No context is currently bound or was provided, ' +
                'returning an empty array.');
            return [];
        },

        /**
         * Checks if an extension has been successfully loaded by the provided
         * canvas object. If no argument is provided it will attempt to return
         * the currently bound context. If no context is bound, it will return
         * 'false'.
         *
         * @param {HTMLCanvasElement|String} arg - The Canvas object or Canvas identification string. Optional.
         * @param {String} extension - The extension name.
         *
         * @returns {boolean} Whether or not the provided extension has been loaded successfully.
         */
        checkExtension: function( arg, extension ) {
            if ( !extension ) {
                // shift parameters if no canvas arg is provided
                extension = arg;
                arg = null;
            }
            var wrapper = getContextWrapper( arg );
            if ( wrapper ) {
                var extensions = wrapper.extensions;
                return extensions[ extension ] ? extensions[ extension ] : false;
            }
            console.error('No context is currently bound or provided as ' +
                'argument, returning false.');
            return false;
        }
    };

}());

},{}],12:[function(require,module,exports){
(function () {

    'use strict';

    module.exports = {
        IndexBuffer: require('./core/IndexBuffer'),
        Renderable: require('./core/Renderable'),
        RenderTarget: require('./core/RenderTarget'),
        Shader: require('./core/Shader'),
        Texture2D: require('./core/Texture2D'),
        TextureCubeMap: require('./core/TextureCubeMap'),
        VertexBuffer: require('./core/VertexBuffer'),
        VertexPackage: require('./core/VertexPackage'),
        Viewport: require('./core/Viewport'),
        WebGLContext: require('./core/WebGLContext')
    };

}());

},{"./core/IndexBuffer":1,"./core/RenderTarget":2,"./core/Renderable":3,"./core/Shader":4,"./core/Texture2D":6,"./core/TextureCubeMap":7,"./core/VertexBuffer":8,"./core/VertexPackage":9,"./core/Viewport":10,"./core/WebGLContext":11}],13:[function(require,module,exports){
(function () {

    'use strict';

    function Stack() {
        this.data = [];
    }

    Stack.prototype.push = function( value ) {
        this.data.push( value );
        return this;
    };

    Stack.prototype.pop = function() {
        this.data.pop();
        return this;
    };

    Stack.prototype.top = function() {
        var index = this.data.length - 1;
        if ( index < 0 ) {
            return null;
        }
        return this.data[ index ];
    };

    module.exports = Stack;

}());

},{}],14:[function(require,module,exports){
(function () {

    'use strict';

    var simplyDeferred = require('simply-deferred'),
        Deferred = simplyDeferred.Deferred,
        when = simplyDeferred.when;

    /**
     * Returns a function that resolves the provided deferred.
     *
     * @param {Deferred} deferred - The deferred object.
     *
     * @returns {Function} The function to resolve the deferred.
     */
    function resolveDeferred( deferred ) {
        return function( result ) {
            deferred.resolve( result );
        };
    }

    /**
     * Dispatches an array of jobs, accumulating the results and
     * passing them to the callback function in corresponding indices.
     *
     * @param {Array} jobs - The job array.
     * @param {Function} callback - The callback function.
     */
     function asyncArray( jobs, callback ) {
        var deferreds = [],
            deferred,
            i;
        for ( i=0; i<jobs.length; i++ ) {
            deferred = new Deferred();
            deferreds.push( deferred );
            jobs[i]( resolveDeferred( deferred ) );
        }
        when.apply( when, deferreds ).then( function() {
            var results = Array.prototype.slice.call( arguments, 0 );
            callback( results );
        });
    }

    /**
     * Dispatches a map of jobs, accumulating the results and
     * passing them to the callback function under corresponding
     * keys.
     *
     * @param {Object} jobs - The job map.
     * @param {Function} callback - The callback function.
     */
     function asyncObj( jobs, callback ) {
        var jobsByIndex = [],
            deferreds = [],
            deferred,
            key;
        for ( key in jobs ) {
            if ( jobs.hasOwnProperty( key ) ) {
                deferred = new Deferred();
                deferreds.push( deferred );
                jobsByIndex.push( key );
                jobs[ key ]( resolveDeferred( deferred ) );
            }
        }
        when.apply( when, deferreds ).done( function() {
            var results = Array.prototype.slice.call( arguments, 0 ),
                resultsByKey = {},
                i;
            for ( i=0; i<jobsByIndex.length; i++ ) {
                resultsByKey[ jobsByIndex[i] ] = results[i];
            }
            callback( resultsByKey );
        });
    }

    module.exports = {

        /**
         * Execute a set of functions asynchronously, once all have been
         * completed, execute the provided callback function. Jobs may be passed
         * as an array or object. The callback function will be passed the
         * results in the same format as the jobs. All jobs must have accept and
         * execute a callback function upon completion.
         *
         * @param {Array|Object} jobs - The set of functions to execute.
         * @param {Function} callback - The callback function to be executed upon completion.
         */
        async: function( jobs, callback ) {
            if ( jobs instanceof Array ) {
                asyncArray( jobs, callback );
            } else {
                asyncObj( jobs, callback );
            }
        },

        /**
         * Returns true if a provided array is a javscript TypedArray.
         *
         * @param {*} array - The variable to test.
         *
         * @returns {boolean} - Whether or not the variable is a TypedArray.
         */
        isTypedArray: function( array ) {
            return array &&
                array.buffer instanceof ArrayBuffer &&
                array.byteLength !== undefined;
        },

        /**
         * Returns true if the provided integer is a power of two.
         *
         * @param {integer} num - The number to test.
         *
         * @returns {boolean} - Whether or not the number is a power of two.
         */
        isPowerOfTwo: function( num ) {
            return ( num !== 0 ) ? ( num & ( num - 1 ) ) === 0 : false;
        },

        /**
         * Returns the next highest power of two for a number.
         *
         * Ex.
         *
         *     200 -> 256
         *     256 -> 256
         *     257 -> 512
         *
         * @param {integer} num - The number to modify.
         *
         * @returns {integer} - Next highest power of two.
         */
        nextHighestPowerOfTwo: function( num ) {
            var i;
            if ( num !== 0 ) {
                num = num-1;
            }
            for ( i=1; i<32; i<<=1 ) {
                num = num | num >> i;
            }
            return num + 1;
        }
    };

}());

},{"simply-deferred":20}],15:[function(require,module,exports){
(function() {

    'use strict';

    module.exports = {

        /**
         * Sends an XMLHttpRequest GET request to the supplied url.
         *
         * @param {String} url - The URL for the resource.
         * @param {Object} options - Contains the following options:
         * <pre>
         *     {
         *         {String} success - The success callback function.
         *         {String} error - The error callback function.
         *         {String} progress - The progress callback function.
         *         {String} responseType - The responseType of the XHR.
         *     }
         * </pre>
         */
        load: function ( url, options ) {
            var request = new XMLHttpRequest();
            request.open( 'GET', url, true );
            request.responseType = options.responseType;
            request.addEventListener( 'load', function () {
                if ( options.success ) {
                    options.success( this.response );
                }
            });
            if ( options.progress ) {
                request.addEventListener( 'progress', function ( event ) {
                    options.progress( event );
                });
            }
            if ( options.error ) {
                request.addEventListener( 'error', function ( event ) {
                    options.error( event );
                });
            }
            request.send();
        }
    };

}());

},{}],16:[function(require,module,exports){
var json = typeof JSON !== 'undefined' ? JSON : require('jsonify');

module.exports = function (obj, opts) {
    if (!opts) opts = {};
    if (typeof opts === 'function') opts = { cmp: opts };
    var space = opts.space || '';
    if (typeof space === 'number') space = Array(space+1).join(' ');
    var cycles = (typeof opts.cycles === 'boolean') ? opts.cycles : false;
    var replacer = opts.replacer || function(key, value) { return value; };

    var cmp = opts.cmp && (function (f) {
        return function (node) {
            return function (a, b) {
                var aobj = { key: a, value: node[a] };
                var bobj = { key: b, value: node[b] };
                return f(aobj, bobj);
            };
        };
    })(opts.cmp);

    var seen = [];
    return (function stringify (parent, key, node, level) {
        var indent = space ? ('\n' + new Array(level + 1).join(space)) : '';
        var colonSeparator = space ? ': ' : ':';

        if (node && node.toJSON && typeof node.toJSON === 'function') {
            node = node.toJSON();
        }

        node = replacer.call(parent, key, node);

        if (node === undefined) {
            return;
        }
        if (typeof node !== 'object' || node === null) {
            return json.stringify(node);
        }
        if (isArray(node)) {
            var out = [];
            for (var i = 0; i < node.length; i++) {
                var item = stringify(node, i, node[i], level+1) || json.stringify(null);
                out.push(indent + space + item);
            }
            return '[' + out.join(',') + indent + ']';
        }
        else {
            if (seen.indexOf(node) !== -1) {
                if (cycles) return json.stringify('__cycle__');
                throw new TypeError('Converting circular structure to JSON');
            }
            else seen.push(node);

            var keys = objectKeys(node).sort(cmp && cmp(node));
            var out = [];
            for (var i = 0; i < keys.length; i++) {
                var key = keys[i];
                var value = stringify(node, key, node[key], level+1);

                if(!value) continue;

                var keyValue = json.stringify(key)
                    + colonSeparator
                    + value;
                ;
                out.push(indent + space + keyValue);
            }
            seen.splice(seen.indexOf(node), 1);
            return '{' + out.join(',') + indent + '}';
        }
    })({ '': obj }, '', obj, 0);
};

var isArray = Array.isArray || function (x) {
    return {}.toString.call(x) === '[object Array]';
};

var objectKeys = Object.keys || function (obj) {
    var has = Object.prototype.hasOwnProperty || function () { return true };
    var keys = [];
    for (var key in obj) {
        if (has.call(obj, key)) keys.push(key);
    }
    return keys;
};

},{"jsonify":17}],17:[function(require,module,exports){
exports.parse = require('./lib/parse');
exports.stringify = require('./lib/stringify');

},{"./lib/parse":18,"./lib/stringify":19}],18:[function(require,module,exports){
var at, // The index of the current character
    ch, // The current character
    escapee = {
        '"':  '"',
        '\\': '\\',
        '/':  '/',
        b:    '\b',
        f:    '\f',
        n:    '\n',
        r:    '\r',
        t:    '\t'
    },
    text,

    error = function (m) {
        // Call error when something is wrong.
        throw {
            name:    'SyntaxError',
            message: m,
            at:      at,
            text:    text
        };
    },
    
    next = function (c) {
        // If a c parameter is provided, verify that it matches the current character.
        if (c && c !== ch) {
            error("Expected '" + c + "' instead of '" + ch + "'");
        }
        
        // Get the next character. When there are no more characters,
        // return the empty string.
        
        ch = text.charAt(at);
        at += 1;
        return ch;
    },
    
    number = function () {
        // Parse a number value.
        var number,
            string = '';
        
        if (ch === '-') {
            string = '-';
            next('-');
        }
        while (ch >= '0' && ch <= '9') {
            string += ch;
            next();
        }
        if (ch === '.') {
            string += '.';
            while (next() && ch >= '0' && ch <= '9') {
                string += ch;
            }
        }
        if (ch === 'e' || ch === 'E') {
            string += ch;
            next();
            if (ch === '-' || ch === '+') {
                string += ch;
                next();
            }
            while (ch >= '0' && ch <= '9') {
                string += ch;
                next();
            }
        }
        number = +string;
        if (!isFinite(number)) {
            error("Bad number");
        } else {
            return number;
        }
    },
    
    string = function () {
        // Parse a string value.
        var hex,
            i,
            string = '',
            uffff;
        
        // When parsing for string values, we must look for " and \ characters.
        if (ch === '"') {
            while (next()) {
                if (ch === '"') {
                    next();
                    return string;
                } else if (ch === '\\') {
                    next();
                    if (ch === 'u') {
                        uffff = 0;
                        for (i = 0; i < 4; i += 1) {
                            hex = parseInt(next(), 16);
                            if (!isFinite(hex)) {
                                break;
                            }
                            uffff = uffff * 16 + hex;
                        }
                        string += String.fromCharCode(uffff);
                    } else if (typeof escapee[ch] === 'string') {
                        string += escapee[ch];
                    } else {
                        break;
                    }
                } else {
                    string += ch;
                }
            }
        }
        error("Bad string");
    },

    white = function () {

// Skip whitespace.

        while (ch && ch <= ' ') {
            next();
        }
    },

    word = function () {

// true, false, or null.

        switch (ch) {
        case 't':
            next('t');
            next('r');
            next('u');
            next('e');
            return true;
        case 'f':
            next('f');
            next('a');
            next('l');
            next('s');
            next('e');
            return false;
        case 'n':
            next('n');
            next('u');
            next('l');
            next('l');
            return null;
        }
        error("Unexpected '" + ch + "'");
    },

    value,  // Place holder for the value function.

    array = function () {

// Parse an array value.

        var array = [];

        if (ch === '[') {
            next('[');
            white();
            if (ch === ']') {
                next(']');
                return array;   // empty array
            }
            while (ch) {
                array.push(value());
                white();
                if (ch === ']') {
                    next(']');
                    return array;
                }
                next(',');
                white();
            }
        }
        error("Bad array");
    },

    object = function () {

// Parse an object value.

        var key,
            object = {};

        if (ch === '{') {
            next('{');
            white();
            if (ch === '}') {
                next('}');
                return object;   // empty object
            }
            while (ch) {
                key = string();
                white();
                next(':');
                if (Object.hasOwnProperty.call(object, key)) {
                    error('Duplicate key "' + key + '"');
                }
                object[key] = value();
                white();
                if (ch === '}') {
                    next('}');
                    return object;
                }
                next(',');
                white();
            }
        }
        error("Bad object");
    };

value = function () {

// Parse a JSON value. It could be an object, an array, a string, a number,
// or a word.

    white();
    switch (ch) {
    case '{':
        return object();
    case '[':
        return array();
    case '"':
        return string();
    case '-':
        return number();
    default:
        return ch >= '0' && ch <= '9' ? number() : word();
    }
};

// Return the json_parse function. It will have access to all of the above
// functions and variables.

module.exports = function (source, reviver) {
    var result;
    
    text = source;
    at = 0;
    ch = ' ';
    result = value();
    white();
    if (ch) {
        error("Syntax error");
    }

    // If there is a reviver function, we recursively walk the new structure,
    // passing each name/value pair to the reviver function for possible
    // transformation, starting with a temporary root object that holds the result
    // in an empty key. If there is not a reviver function, we simply return the
    // result.

    return typeof reviver === 'function' ? (function walk(holder, key) {
        var k, v, value = holder[key];
        if (value && typeof value === 'object') {
            for (k in value) {
                if (Object.prototype.hasOwnProperty.call(value, k)) {
                    v = walk(value, k);
                    if (v !== undefined) {
                        value[k] = v;
                    } else {
                        delete value[k];
                    }
                }
            }
        }
        return reviver.call(holder, key, value);
    }({'': result}, '')) : result;
};

},{}],19:[function(require,module,exports){
var cx = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
    escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
    gap,
    indent,
    meta = {    // table of character substitutions
        '\b': '\\b',
        '\t': '\\t',
        '\n': '\\n',
        '\f': '\\f',
        '\r': '\\r',
        '"' : '\\"',
        '\\': '\\\\'
    },
    rep;

function quote(string) {
    // If the string contains no control characters, no quote characters, and no
    // backslash characters, then we can safely slap some quotes around it.
    // Otherwise we must also replace the offending characters with safe escape
    // sequences.
    
    escapable.lastIndex = 0;
    return escapable.test(string) ? '"' + string.replace(escapable, function (a) {
        var c = meta[a];
        return typeof c === 'string' ? c :
            '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
    }) + '"' : '"' + string + '"';
}

function str(key, holder) {
    // Produce a string from holder[key].
    var i,          // The loop counter.
        k,          // The member key.
        v,          // The member value.
        length,
        mind = gap,
        partial,
        value = holder[key];
    
    // If the value has a toJSON method, call it to obtain a replacement value.
    if (value && typeof value === 'object' &&
            typeof value.toJSON === 'function') {
        value = value.toJSON(key);
    }
    
    // If we were called with a replacer function, then call the replacer to
    // obtain a replacement value.
    if (typeof rep === 'function') {
        value = rep.call(holder, key, value);
    }
    
    // What happens next depends on the value's type.
    switch (typeof value) {
        case 'string':
            return quote(value);
        
        case 'number':
            // JSON numbers must be finite. Encode non-finite numbers as null.
            return isFinite(value) ? String(value) : 'null';
        
        case 'boolean':
        case 'null':
            // If the value is a boolean or null, convert it to a string. Note:
            // typeof null does not produce 'null'. The case is included here in
            // the remote chance that this gets fixed someday.
            return String(value);
            
        case 'object':
            if (!value) return 'null';
            gap += indent;
            partial = [];
            
            // Array.isArray
            if (Object.prototype.toString.apply(value) === '[object Array]') {
                length = value.length;
                for (i = 0; i < length; i += 1) {
                    partial[i] = str(i, value) || 'null';
                }
                
                // Join all of the elements together, separated with commas, and
                // wrap them in brackets.
                v = partial.length === 0 ? '[]' : gap ?
                    '[\n' + gap + partial.join(',\n' + gap) + '\n' + mind + ']' :
                    '[' + partial.join(',') + ']';
                gap = mind;
                return v;
            }
            
            // If the replacer is an array, use it to select the members to be
            // stringified.
            if (rep && typeof rep === 'object') {
                length = rep.length;
                for (i = 0; i < length; i += 1) {
                    k = rep[i];
                    if (typeof k === 'string') {
                        v = str(k, value);
                        if (v) {
                            partial.push(quote(k) + (gap ? ': ' : ':') + v);
                        }
                    }
                }
            }
            else {
                // Otherwise, iterate through all of the keys in the object.
                for (k in value) {
                    if (Object.prototype.hasOwnProperty.call(value, k)) {
                        v = str(k, value);
                        if (v) {
                            partial.push(quote(k) + (gap ? ': ' : ':') + v);
                        }
                    }
                }
            }
            
        // Join all of the member texts together, separated with commas,
        // and wrap them in braces.

        v = partial.length === 0 ? '{}' : gap ?
            '{\n' + gap + partial.join(',\n' + gap) + '\n' + mind + '}' :
            '{' + partial.join(',') + '}';
        gap = mind;
        return v;
    }
}

module.exports = function (value, replacer, space) {
    var i;
    gap = '';
    indent = '';
    
    // If the space parameter is a number, make an indent string containing that
    // many spaces.
    if (typeof space === 'number') {
        for (i = 0; i < space; i += 1) {
            indent += ' ';
        }
    }
    // If the space parameter is a string, it will be used as the indent string.
    else if (typeof space === 'string') {
        indent = space;
    }

    // If there is a replacer, it must be a function or an array.
    // Otherwise, throw an error.
    rep = replacer;
    if (replacer && typeof replacer !== 'function'
    && (typeof replacer !== 'object' || typeof replacer.length !== 'number')) {
        throw new Error('JSON.stringify');
    }
    
    // Make a fake root object containing our value under the key of ''.
    // Return the result of stringifying the value.
    return str('', {'': value});
};

},{}],20:[function(require,module,exports){
// Generated by CoffeeScript 1.6.3
(function() {
  var Deferred, PENDING, REJECTED, RESOLVED, VERSION, after, execute, flatten, has, installInto, isArguments, isPromise, wrap, _when,
    __slice = [].slice;

  VERSION = '3.0.0';

  PENDING = "pending";

  RESOLVED = "resolved";

  REJECTED = "rejected";

  has = function(obj, prop) {
    return obj != null ? obj.hasOwnProperty(prop) : void 0;
  };

  isArguments = function(obj) {
    return has(obj, 'length') && has(obj, 'callee');
  };

  isPromise = function(obj) {
    return has(obj, 'promise') && typeof (obj != null ? obj.promise : void 0) === 'function';
  };

  flatten = function(array) {
    if (isArguments(array)) {
      return flatten(Array.prototype.slice.call(array));
    }
    if (!Array.isArray(array)) {
      return [array];
    }
    return array.reduce(function(memo, value) {
      if (Array.isArray(value)) {
        return memo.concat(flatten(value));
      }
      memo.push(value);
      return memo;
    }, []);
  };

  after = function(times, func) {
    if (times <= 0) {
      return func();
    }
    return function() {
      if (--times < 1) {
        return func.apply(this, arguments);
      }
    };
  };

  wrap = function(func, wrapper) {
    return function() {
      var args;
      args = [func].concat(Array.prototype.slice.call(arguments, 0));
      return wrapper.apply(this, args);
    };
  };

  execute = function(callbacks, args, context) {
    var callback, _i, _len, _ref, _results;
    _ref = flatten(callbacks);
    _results = [];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      callback = _ref[_i];
      _results.push(callback.call.apply(callback, [context].concat(__slice.call(args))));
    }
    return _results;
  };

  Deferred = function() {
    var candidate, close, closingArguments, doneCallbacks, failCallbacks, progressCallbacks, state;
    state = PENDING;
    doneCallbacks = [];
    failCallbacks = [];
    progressCallbacks = [];
    closingArguments = {
      'resolved': {},
      'rejected': {},
      'pending': {}
    };
    this.promise = function(candidate) {
      var pipe, storeCallbacks;
      candidate = candidate || {};
      candidate.state = function() {
        return state;
      };
      storeCallbacks = function(shouldExecuteImmediately, holder, holderState) {
        return function() {
          if (state === PENDING) {
            holder.push.apply(holder, flatten(arguments));
          }
          if (shouldExecuteImmediately()) {
            execute(arguments, closingArguments[holderState]);
          }
          return candidate;
        };
      };
      candidate.done = storeCallbacks((function() {
        return state === RESOLVED;
      }), doneCallbacks, RESOLVED);
      candidate.fail = storeCallbacks((function() {
        return state === REJECTED;
      }), failCallbacks, REJECTED);
      candidate.progress = storeCallbacks((function() {
        return state !== PENDING;
      }), progressCallbacks, PENDING);
      candidate.always = function() {
        var _ref;
        return (_ref = candidate.done.apply(candidate, arguments)).fail.apply(_ref, arguments);
      };
      pipe = function(doneFilter, failFilter, progressFilter) {
        var filter, master;
        master = new Deferred();
        filter = function(source, funnel, callback) {
          if (!callback) {
            return candidate[source](master[funnel]);
          }
          return candidate[source](function() {
            var args, value;
            args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
            value = callback.apply(null, args);
            if (isPromise(value)) {
              return value.done(master.resolve).fail(master.reject).progress(master.notify);
            } else {
              return master[funnel](value);
            }
          });
        };
        filter('done', 'resolve', doneFilter);
        filter('fail', 'reject', failFilter);
        filter('progress', 'notify', progressFilter);
        return master;
      };
      candidate.pipe = pipe;
      candidate.then = pipe;
      if (candidate.promise == null) {
        candidate.promise = function() {
          return candidate;
        };
      }
      return candidate;
    };
    this.promise(this);
    candidate = this;
    close = function(finalState, callbacks, context) {
      return function() {
        if (state === PENDING) {
          state = finalState;
          closingArguments[finalState] = arguments;
          execute(callbacks, closingArguments[finalState], context);
          return candidate;
        }
        return this;
      };
    };
    this.resolve = close(RESOLVED, doneCallbacks);
    this.reject = close(REJECTED, failCallbacks);
    this.notify = close(PENDING, progressCallbacks);
    this.resolveWith = function(context, args) {
      return close(RESOLVED, doneCallbacks, context).apply(null, args);
    };
    this.rejectWith = function(context, args) {
      return close(REJECTED, failCallbacks, context).apply(null, args);
    };
    this.notifyWith = function(context, args) {
      return close(PENDING, progressCallbacks, context).apply(null, args);
    };
    return this;
  };

  _when = function() {
    var def, defs, finish, resolutionArgs, trigger, _i, _len;
    defs = flatten(arguments);
    if (defs.length === 1) {
      if (isPromise(defs[0])) {
        return defs[0];
      } else {
        return (new Deferred()).resolve(defs[0]).promise();
      }
    }
    trigger = new Deferred();
    if (!defs.length) {
      return trigger.resolve().promise();
    }
    resolutionArgs = [];
    finish = after(defs.length, function() {
      return trigger.resolve.apply(trigger, resolutionArgs);
    });
    defs.forEach(function(def, index) {
      if (isPromise(def)) {
        return def.done(function() {
          var args;
          args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
          resolutionArgs[index] = args.length > 1 ? args : args[0];
          return finish();
        });
      } else {
        resolutionArgs[index] = def;
        return finish();
      }
    });
    for (_i = 0, _len = defs.length; _i < _len; _i++) {
      def = defs[_i];
      isPromise(def) && def.fail(trigger.reject);
    }
    return trigger.promise();
  };

  installInto = function(fw) {
    fw.Deferred = function() {
      return new Deferred();
    };
    fw.ajax = wrap(fw.ajax, function(ajax, options) {
      var createWrapper, def, promise, xhr;
      if (options == null) {
        options = {};
      }
      def = new Deferred();
      createWrapper = function(wrapped, finisher) {
        return wrap(wrapped, function() {
          var args, func;
          func = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
          if (func) {
            func.apply(null, args);
          }
          return finisher.apply(null, args);
        });
      };
      options.success = createWrapper(options.success, def.resolve);
      options.error = createWrapper(options.error, def.reject);
      xhr = ajax(options);
      promise = def.promise();
      promise.abort = function() {
        return xhr.abort();
      };
      return promise;
    });
    return fw.when = _when;
  };

  if (typeof exports !== 'undefined') {
    exports.Deferred = function() {
      return new Deferred();
    };
    exports.when = _when;
    exports.installInto = installInto;
  } else if (typeof define === 'function' && define.amd) {
    define(function() {
      if (typeof Zepto !== 'undefined') {
        return installInto(Zepto);
      } else {
        Deferred.when = _when;
        Deferred.installInto = installInto;
        return Deferred;
      }
    });
  } else if (typeof Zepto !== 'undefined') {
    installInto(Zepto);
  } else {
    this.Deferred = function() {
      return new Deferred();
    };
    this.Deferred.when = _when;
    this.Deferred.installInto = installInto;
  }

}).call(this);

},{}],21:[function(require,module,exports){
(function () {

    'use strict';

    module.exports = {
        TileLayer: require('./layer/exports'),
        Renderer: require('./renderer/exports'),
        TileRequestor: require('./request/TileRequestor'),
        MetaRequestor: require('./request/MetaRequestor')
    };

}());

},{"./layer/exports":26,"./renderer/exports":50,"./request/MetaRequestor":62,"./request/TileRequestor":64}],22:[function(require,module,exports){
(function() {

    'use strict';

    var Image = require('./Image');

    var Debug = Image.extend({

        options: {
            unloadInvisibleTiles: true,
            zIndex: 5000
        },

        initialize: function(options) {
            // set renderer
            if (!options.rendererClass) {
                console.warn('No `rendererClass` option found, this layer will not render any data.');
            } else {
                // recursively extend
                $.extend(true, this, options.rendererClass);
            }
            // set options
            L.setOptions(this, options);
        },

        redraw: function() {
            if (this._map) {
                this._reset({
                    hard: true
                });
                this._update();
            }
            return this;
        },

        _redrawTile: function(tile) {
            var coord = {
                x: tile._tilePoint.x,
                y: tile._tilePoint.y,
                z: this._map._zoom
            };
            this.renderTile(tile, coord);
            this.tileDrawn(tile);
        },

        _createTile: function() {
            var tile = L.DomUtil.create('div', 'leaflet-tile leaflet-debug-tile');
            tile.width = this.options.tileSize;
            tile.height = this.options.tileSize;
            tile.onselectstart = L.Util.falseFn;
            tile.onmousemove = L.Util.falseFn;
            return tile;
        },

        _loadTile: function(tile, tilePoint) {
            tile._layer = this;
            tile._tilePoint = tilePoint;
            this._adjustTilePoint(tilePoint);
            this._redrawTile(tile);
        },

        renderTile: function( /*elem, coord*/ ) {
            // override
        },

        tileDrawn: function(tile) {
            this._tileOnLoad.call(tile);
        }

    });

    module.exports = Debug;

}());

},{"./Image":23}],23:[function(require,module,exports){
(function() {

    'use strict';

    var Image = L.TileLayer.extend({

        getOpacity: function() {
            return this.options.opacity;
        },

        show: function() {
            this._hidden = false;
            this._prevMap.addLayer(this);
        },

        hide: function() {
            this._hidden = true;
            this._prevMap = this._map;
            this._map.removeLayer(this);
        },

        isHidden: function() {
            return this._hidden;
        },

        setBrightness: function(brightness) {
            this._brightness = brightness;
            $(this._container).css('-webkit-filter', 'brightness(' + (this._brightness * 100) + '%)');
            $(this._container).css('filter', 'brightness(' + (this._brightness * 100) + '%)');
        },

        getBrightness: function() {
            return (this._brightness !== undefined) ? this._brightness : 1;
        }

    });

    module.exports = Image;

}());

},{}],24:[function(require,module,exports){
(function() {

    'use strict';

    var MIN = Number.MAX_VALUE;
    var MAX = 0;

    var Live = L.Class.extend({

        initialize: function(meta, options) {
            // set renderer
            if (!options.rendererClass) {
                console.warn('No `rendererClass` option found, this layer will not render any data.');
            } else {
                // recursively extend and initialize
                if (options.rendererClass.prototype) {
                    $.extend(true, this, options.rendererClass.prototype);
                    options.rendererClass.prototype.initialize.apply(this, arguments);
                } else {
                    $.extend(true, this, options.rendererClass);
                    options.rendererClass.initialize.apply(this, arguments);
                }
            }
            // set options
            L.setOptions(this, options);
            // set meta
            this._meta = meta;
            // set params
            this._params = {
                binning: {}
            };
            this.clearExtrema();
        },

        clearExtrema: function() {
            this._extrema = {
                min: MIN,
                max: MAX
            };
            this._cache = {};
        },

        getExtrema: function() {
            return this._extrema;
        },

        updateExtrema: function(data) {
            var extrema = this.extractExtrema(data);
            var changed = false;
            if (extrema.min < this._extrema.min) {
                changed = true;
                this._extrema.min = extrema.min;
            }
            if (extrema.max > this._extrema.max) {
                changed = true;
                this._extrema.max = extrema.max;
            }
            return changed;
        },

        extractExtrema: function(data) {
            return {
                min: _.min(data),
                max: _.max(data)
            };
        },

        setMeta: function(meta) {
            this._meta = meta;
            return this;
        },

        getMeta: function() {
            return this._meta;
        },

        setParams: function(params) {
            this._params = params;
        },

        getParams: function() {
            return this._params;
        }

    });

    module.exports = Live;

}());

},{}],25:[function(require,module,exports){
(function() {

    'use strict';

    var Image = require('./Image');

    var Pending = Image.extend({

        options: {
            unloadInvisibleTiles: true,
            zIndex: 5000
        },

        initialize: function(options) {
            this._pendingTiles = {};
            // set renderer
            if (!options.rendererClass) {
                console.warn('No `rendererClass` option found, this layer will not render any data.');
            } else {
                // recursively extend
                $.extend(true, this, options.rendererClass);
            }
            // set options
            L.setOptions(this, options);
        },

        increment: function(coord) {
            var hash = this._getTileHash(coord);
            if (this._pendingTiles[hash] === undefined) {
                this._pendingTiles[hash] = 1;
                var tiles = this._getTilesWithHash(hash);
                tiles.forEach(function(tile) {
                    this._redrawTile(tile);
                }, this);
            } else {
                this._pendingTiles[hash]++;
            }
        },

        decrement: function(coord) {
            var hash = this._getTileHash(coord);
            this._pendingTiles[hash]--;
            if (this._pendingTiles[hash] === 0) {
                delete this._pendingTiles[hash];
                var tiles = this._getTilesWithHash(hash);
                tiles.forEach(function(tile) {
                    this._redrawTile(tile);
                }, this);
            }
        },

        redraw: function() {
            if (this._map) {
                this._reset({
                    hard: true
                });
                this._update();
            }
            return this;
        },

        _getTileClass: function(hash) {
            return 'pending-' + hash;
        },

        _getTileHash: function(coord) {
            return coord.z + '-' + coord.x + '-' + coord.y;
        },

        _getTilesWithHash: function(hash) {
            var className = this._getTileClass(hash);
            var tiles = [];
            $(this._container).find('.' + className).each(function() {
                tiles.push(this);
            });
            return tiles;
        },

        _redrawTile: function(tile) {
            var coord = {
                x: tile._tilePoint.x,
                y: tile._tilePoint.y,
                z: this._map._zoom
            };
            var hash = this._getTileHash(coord);
            $(tile).addClass(this._getTileClass(hash));
            if (this._pendingTiles[hash] > 0) {
                this.renderTile(tile, coord);
            } else {
                tile.innerHTML = '';
            }
            this.tileDrawn(tile);
        },

        _createTile: function() {
            var tile = L.DomUtil.create('div', 'leaflet-tile leaflet-pending-tile');
            tile.width = this.options.tileSize;
            tile.height = this.options.tileSize;
            tile.onselectstart = L.Util.falseFn;
            tile.onmousemove = L.Util.falseFn;
            return tile;
        },

        _loadTile: function(tile, tilePoint) {
            tile._layer = this;
            tile._tilePoint = tilePoint;
            this._adjustTilePoint(tilePoint);
            this._redrawTile(tile);
        },

        renderTile: function( /*elem*/ ) {
            // override
        },

        tileDrawn: function(tile) {
            this._tileOnLoad.call(tile);
        }

    });

    module.exports = Pending;

}());

},{"./Image":23}],26:[function(require,module,exports){
(function() {

    'use strict';

    // debug tile layer
    var Debug = require('./core/Debug');

    // pending tile layer
    var Pending = require('./core/Pending');

    // standard XYZ / TMX image layer
    var Image = require('./core/Image');

    // live tile layers
    var Heatmap = require('./types/Heatmap');
    var TopCount = require('./types/TopCount');
    var TopFrequency = require('./types/TopFrequency');
    var TopicCount = require('./types/TopicCount');
    var TopicFrequency = require('./types/TopicFrequency');

    module.exports = {
        Debug: Debug,
        Pending: Pending,
        Image: Image,
        Heatmap: Heatmap,
        TopCount: TopCount,
        TopFrequency: TopFrequency,
        TopicCount: TopicCount,
        TopicFrequency: TopicFrequency
    };

}());

},{"./core/Debug":22,"./core/Image":23,"./core/Pending":25,"./types/Heatmap":41,"./types/TopCount":42,"./types/TopFrequency":43,"./types/TopicCount":44,"./types/TopicFrequency":45}],27:[function(require,module,exports){
(function() {

    'use strict';

    function rgb2lab(rgb) {
        var r = rgb[0] > 0.04045 ? Math.pow((rgb[0] + 0.055) / 1.055, 2.4) : rgb[0] / 12.92;
        var g = rgb[1] > 0.04045 ? Math.pow((rgb[1] + 0.055) / 1.055, 2.4) : rgb[1] / 12.92;
        var b = rgb[2] > 0.04045 ? Math.pow((rgb[2] + 0.055) / 1.055, 2.4) : rgb[2] / 12.92;
        //Observer. = 2°, Illuminant = D65
        var x = r * 0.4124564 + g * 0.3575761 + b * 0.1804375;
        var y = r * 0.2126729 + g * 0.7151522 + b * 0.0721750;
        var z = r * 0.0193339 + g * 0.1191920 + b * 0.9503041;
        x = x / 0.95047; // Observer= 2°, Illuminant= D65
        y = y / 1.00000;
        z = z / 1.08883;
        x = x > 0.008856 ? Math.pow(x, 1 / 3) : (7.787037 * x) + (16 / 116);
        y = y > 0.008856 ? Math.pow(y, 1 / 3) : (7.787037 * y) + (16 / 116);
        z = z > 0.008856 ? Math.pow(z, 1 / 3) : (7.787037 * z) + (16 / 116);
        return [(116 * y) - 16,
            500 * (x - y),
            200 * (y - z),
            rgb[3]];
    }

    function lab2rgb(lab) {
        var y = (lab[0] + 16) / 116;
        var x = y + lab[1] / 500;
        var z = y - lab[2] / 200;
        x = x > 0.206893034 ? x * x * x : (x - 4 / 29) / 7.787037;
        y = y > 0.206893034 ? y * y * y : (y - 4 / 29) / 7.787037;
        z = z > 0.206893034 ? z * z * z : (z - 4 / 29) / 7.787037;
        x = x * 0.95047; // Observer= 2°, Illuminant= D65
        y = y * 1.00000;
        z = z * 1.08883;
        var r = x * 3.2404542 + y * -1.5371385 + z * -0.4985314;
        var g = x * -0.9692660 + y * 1.8760108 + z * 0.0415560;
        var b = x * 0.0556434 + y * -0.2040259 + z * 1.0572252;
        r = r > 0.00304 ? 1.055 * Math.pow(r, 1 / 2.4) - 0.055 : 12.92 * r;
        g = g > 0.00304 ? 1.055 * Math.pow(g, 1 / 2.4) - 0.055 : 12.92 * g;
        b = b > 0.00304 ? 1.055 * Math.pow(b, 1 / 2.4) - 0.055 : 12.92 * b;
        return [Math.max(Math.min(r, 1), 0), Math.max(Math.min(g, 1), 0), Math.max(Math.min(b, 1), 0), lab[3]];
    }

    function distance(c1, c2) {
        return Math.sqrt(
            (c1[0] - c2[0]) * (c1[0] - c2[0]) +
            (c1[1] - c2[1]) * (c1[1] - c2[1]) +
            (c1[2] - c2[2]) * (c1[2] - c2[2]) +
            (c1[3] - c2[3]) * (c1[3] - c2[3])
        );
    }

    var GRADIENT_STEPS = 200;

    // Interpolate between a set of colors using even perceptual distance and interpolation in CIE L*a*b* space
    var buildPerceptualLookupTable = function(baseColors) {
        var outputGradient = [];
        // Calculate perceptual spread in L*a*b* space
        var labs = _.map(baseColors, function(color) {
            return rgb2lab([color[0] / 255, color[1] / 255, color[2] / 255, color[3] / 255]);
        });
        var distances = _.map(labs, function(color, index, colors) {
            return index > 0 ? distance(color, colors[index - 1]) : 0;
        });
        // Calculate cumulative distances in [0,1]
        var totalDistance = _.reduce(distances, function(a, b) {
            return a + b;
        }, 0);
        distances = _.map(distances, function(d) {
            return d / totalDistance;
        });
        var distanceTraversed = 0;
        var key = 0;
        var progress;
        var stepProgress;
        var rgb;
        for (var i = 0; i < GRADIENT_STEPS; i++) {
            progress = i / (GRADIENT_STEPS - 1);
            if (progress > distanceTraversed + distances[key + 1] && key + 1 < labs.length - 1) {
                key += 1;
                distanceTraversed += distances[key];
            }
            stepProgress = (progress - distanceTraversed) / distances[key + 1];
            rgb = lab2rgb([
                labs[key][0] + (labs[key + 1][0] - labs[key][0]) * stepProgress,
                labs[key][1] + (labs[key + 1][1] - labs[key][1]) * stepProgress,
                labs[key][2] + (labs[key + 1][2] - labs[key][2]) * stepProgress,
                labs[key][3] + (labs[key + 1][3] - labs[key][3]) * stepProgress
            ]);
            outputGradient.push([
                Math.round(rgb[0] * 255),
                Math.round(rgb[1] * 255),
                Math.round(rgb[2] * 255),
                Math.round(rgb[3] * 255)
            ]);
        }
        return outputGradient;
    };

    var COOL = buildPerceptualLookupTable([
        [0x04, 0x20, 0x40, 0x50],
        [0x08, 0x40, 0x81, 0x7f],
        [0x08, 0x68, 0xac, 0xff],
        [0x2b, 0x8c, 0xbe, 0xff],
        [0x4e, 0xb3, 0xd3, 0xff],
        [0x7b, 0xcc, 0xc4, 0xff],
        [0xa8, 0xdd, 0xb5, 0xff],
        [0xcc, 0xeb, 0xc5, 0xff],
        [0xe0, 0xf3, 0xdb, 0xff],
        [0xf7, 0xfc, 0xf0, 0xff]
    ]);

    var HOT = buildPerceptualLookupTable([
        [0x40, 0x00, 0x13, 0x50],
        [0x80, 0x00, 0x26, 0x7f],
        [0xbd, 0x00, 0x26, 0xff],
        [0xe3, 0x1a, 0x1c, 0xff],
        [0xfc, 0x4e, 0x2a, 0xff],
        [0xfd, 0x8d, 0x3c, 0xff],
        [0xfe, 0xb2, 0x4c, 0xff],
        [0xfe, 0xd9, 0x76, 0xff],
        [0xff, 0xed, 0xa0, 0xff]
    ]);

    var VERDANT = buildPerceptualLookupTable([
        [0x00, 0x40, 0x26, 0x50],
        [0x00, 0x5a, 0x32, 0x7f],
        [0x23, 0x84, 0x43, 0xff],
        [0x41, 0xab, 0x5d, 0xff],
        [0x78, 0xc6, 0x79, 0xff],
        [0xad, 0xdd, 0x8e, 0xff],
        [0xd9, 0xf0, 0xa3, 0xff],
        [0xf7, 0xfc, 0xb9, 0xff],
        [0xff, 0xff, 0xe5, 0xff]
    ]);

    var SPECTRAL = buildPerceptualLookupTable([
        [0x26, 0x1a, 0x40, 0x50],
        [0x44, 0x2f, 0x72, 0x7f],
        [0xe1, 0x2b, 0x02, 0xff],
        [0x02, 0xdc, 0x01, 0xff],
        [0xff, 0xd2, 0x02, 0xff],
        [0xff, 0xff, 0xff, 0xff]
    ]);

    var TEMPERATURE = buildPerceptualLookupTable([
        [0x00, 0x16, 0x40, 0x50],
        [0x00, 0x39, 0x66, 0x7f], //blue
        [0x31, 0x3d, 0x66, 0xff], //purple
        [0xe1, 0x2b, 0x02, 0xff], //red
        [0xff, 0xd2, 0x02, 0xff], //yellow
        [0xff, 0xff, 0xff, 0xff] //white
    ]);

    var GREYSCALE = buildPerceptualLookupTable([
        [0x00, 0x00, 0x00, 0x7f],
        [0x40, 0x40, 0x40, 0xff],
        [0xff, 0xff, 0xff, 0xff]
    ]);

    var POLAR_HOT = buildPerceptualLookupTable([
        [ 0xff, 0x44, 0x00, 0xff ],
        [ 0xbd, 0xbd, 0xbd, 0xb0 ]
    ]);

    var POLAR_COLD = buildPerceptualLookupTable([
        [ 0xbd, 0xbd, 0xbd, 0xb0 ],
        [ 0x32, 0xa5, 0xf9, 0xff ]
    ]);

    var buildLookupFunction = function(RAMP) {
        return function(scaledValue, inColor) {
            var color = RAMP[Math.floor(scaledValue * (RAMP.length - 1))];
            inColor[0] = color[0];
            inColor[1] = color[1];
            inColor[2] = color[2];
            inColor[3] = color[3];
            return inColor;
        };
    };

    var ColorRamp = {
        cool: buildLookupFunction(COOL),
        hot: buildLookupFunction(HOT),
        verdant: buildLookupFunction(VERDANT),
        spectral: buildLookupFunction(SPECTRAL),
        temperature: buildLookupFunction(TEMPERATURE),
        grey: buildLookupFunction(GREYSCALE),
        polar: buildLookupFunction(POLAR_HOT.concat(POLAR_COLD))
    };

    var setColorRamp = function(type) {
        var func = ColorRamp[type.toLowerCase()];
        if (func) {
            this._colorRamp = func;
        }
        return this;
    };

    var getColorRamp = function() {
        return this._colorRamp;
    };

    var initialize = function() {
        this._colorRamp = ColorRamp.verdant;
    };

    module.exports = {
        initialize: initialize,
        setColorRamp: setColorRamp,
        getColorRamp: getColorRamp
    };

}());

},{}],28:[function(require,module,exports){
(function() {

    'use strict';

    var SIGMOID_SCALE = 0.15;

    // log10

    function log10Transform(val, min, max) {
        var logMin = Math.log10(min || 1);
        var logMax = Math.log10(max || 1);
        var logVal = Math.log10(val || 1);
        return (logVal - logMin) / ((logMax - logMin) || 1);
    }

    function inverseLog10Transform(nval, min, max) {
        var logMin = Math.log10(min || 1);
        var logMax = Math.log10(max || 1);
        return Math.pow(10, (nval * logMax - nval * logMin) + logMin);
    }

    // sigmoid

    function sigmoidTransform(val, min, max) {
        var absMin = Math.abs(min);
        var absMax = Math.abs(max);
        var distance = Math.max(absMin, absMax);
        var scaledVal = val / (SIGMOID_SCALE * distance);
        return 1 / (1 + Math.exp(-scaledVal));
    }

    function inverseSigmoidTransform(nval, min, max) {
        var absMin = Math.abs(min);
        var absMax = Math.abs(max);
        var distance = Math.max(absMin, absMax);
        return Math.log((1/nval) - 1) * -(SIGMOID_SCALE * distance);
    }

    // linear

    function linearTransform(val, min, max) {
        var range = max - min;
        return (val - min) / range;
    }

    function inverseLinearTransform(nval, min, max) {
        var range = max - min;
        return min + nval * range;
    }

    var Transform = {
        linear: linearTransform,
        log10: log10Transform,
        sigmoid: sigmoidTransform
    };

    var Inverse = {
        linear: inverseLinearTransform,
        log10: inverseLog10Transform,
        sigmoid: inverseSigmoidTransform
    };

    var initialize = function() {
        this._range = {
            min: 0,
            max: 1
        };
        this._transformFunc = log10Transform;
        this._inverseFunc = inverseLog10Transform;
    };

    var setTransformFunc = function(type) {
        var func = type.toLowerCase();
        this._transformFunc = Transform[func];
        this._inverseFunc = Inverse[func];
    };

    var setValueRange = function(range) {
        this._range.min = range.min;
        this._range.max = range.max;
    };

    var getValueRange = function() {
        return this._range;
    };

    var interpolateToRange = function(nval) {
        // interpolate between the filter range
        var rMin = this._range.min;
        var rMax = this._range.max;
        var rval = (nval - rMin) / (rMax - rMin);
        // ensure output is [0:1]
        return Math.max(0, Math.min(1, rval));
    };

    var transformValue = function(val) {
        // clamp the value between the extreme (shouldn't be necessary)
        var min = this._extrema.min;
        var max = this._extrema.max;
        var clamped = Math.max(Math.min(val, max), min);
        // normalize the value
        return this._transformFunc(clamped, min, max);
    };

    var untransformValue = function(nval) {
        var min = this._extrema.min;
        var max = this._extrema.max;
        // clamp the value between the extreme (shouldn't be necessary)
        var clamped = Math.max(Math.min(nval, 1), 0);
        // unnormalize the value
        return this._inverseFunc(clamped, min, max);
    };

    module.exports = {
        initialize: initialize,
        setTransformFunc: setTransformFunc,
        setValueRange: setValueRange,
        getValueRange: getValueRange,
        transformValue: transformValue,
        untransformValue: untransformValue,
        interpolateToRange: interpolateToRange
    };

}());

},{}],29:[function(require,module,exports){
(function() {

    'use strict';

    var Tiling = require('./Tiling');

    var setResolution = function(resolution) {
        if (resolution !== this._params.binning.resolution) {
            this._params.binning.resolution = resolution;
            this.clearExtrema();
        }
        return this;
    };

    var getResolution = function() {
        return this._params.binning.resolution;
    };

    module.exports = {
        // tiling
        setXField: Tiling.setXField,
        getXField: Tiling.getXField,
        setYField: Tiling.setYField,
        getYField: Tiling.getYField,
        // binning
        setResolution: setResolution,
        getResolution: getResolution
    };

}());

},{"./Tiling":39}],30:[function(require,module,exports){
(function(){

  'use strict';

  function isValidQuery(meta, query){
    if (query && Array.isArray(query.must)){
      var queryComponentCheck = true;
      query.must.forEach(function(queryBlock){
        if (queryBlock.term) {
            if (!meta[queryBlock.term.field]){
              queryComponentCheck = false;
            }
        } else if (queryBlock.range) {
          if (!meta[queryBlock.range.field]){
            queryComponentCheck = false;
          }
        } else {
          queryComponentCheck = false;
        }
      });
      return queryComponentCheck;
    } else {
      return false;
    }
  }

  function addBoolQuery(query){

    var meta = this._meta;

    if (isValidQuery(meta, query)) {
      console.log('Valid bool_query');
      this._params.bool_query = query;
    } else {
      console.warn('Invalid bool_query');
    }
  }

  function removeBoolQuery(){
    this._params.bool_query = null;
    delete this._params.bool_query;
  }

  function getBoolQuery(){
    return this._params.bool_query;
  }

  module.exports = {
    addBoolQuery : addBoolQuery,
    removeBoolQuery : removeBoolQuery,
    getBoolQuery : getBoolQuery
  };
}());

},{}],31:[function(require,module,exports){
(function() {

    'use strict';

    var setDateHistogram = function(field, from, to, interval) {
        if (!field) {
            console.warn('DateHistogram `field` is missing from argument. Ignoring command.');
            return;
        }
        if (from === undefined) {
            console.warn('DateHistogram `from` are missing from argument. Ignoring command.');
            return;
        }
        if (to === undefined) {
            console.warn('DateHistogram `to` are missing from argument. Ignoring command.');
            return;
        }
        this._params.date_histogram = {
            field: field,
            from: from,
            to: to,
            interval: interval
        };
        this.clearExtrema();
        return this;
    };

    var getDateHistogram = function() {
        return this._params.date_histogram;
    };

    module.exports = {
        setDateHistogram: setDateHistogram,
        getDateHistogram: getDateHistogram
    };

}());

},{}],32:[function(require,module,exports){
(function() {

    'use strict';

    var setHistogram = function(field, interval) {
        if (!field) {
            console.warn('Histogram `field` is missing from argument. Ignoring command.');
            return;
        }
        if (!interval) {
            console.warn('Histogram `interval` are missing from argument. Ignoring command.');
            return;
        }
        this._params.histogram = {
            field: field,
            interval: interval
        };
        this.clearExtrema();
        return this;
    };

    var getHistogram = function() {
        return this._params.histogram;
    };

    module.exports = {
        setHistogram: setHistogram,
        getHistogram: getHistogram
    };

}());

},{}],33:[function(require,module,exports){
(function() {

    'use strict';

    var METRICS = {
        'min': true,
        'max': true,
        'sum': true,
        'avg': true
    };

    var checkField = function(meta, field) {
        if (meta) {
            if (meta.extrema) {
                return true;
            } else {
                console.warn('Field `' + field + '` is not ordinal in meta data. Ignoring command.');
            }
        } else {
            console.warn('Field `' + field + '` is not recognized in meta data. Ignoring command.');
        }
        return false;
    };

    var setMetricAgg = function(field, type) {
        if (!field) {
            console.warn('MetricAgg `field` is missing from argument. Ignoring command.');
            return;
        }
        if (!type) {
            console.warn('MetricAgg `type` is missing from argument. Ignoring command.');
            return;
        }
        var meta = this._meta[field];
        if (checkField(meta, field)) {
            if (!METRICS[type]) {
                console.warn('MetricAgg type `' + type + '` is not supported. Ignoring command.');
                return;
            }
            this._params.metric_agg = {
                field: field,
                type: type
            };
            this.clearExtrema();
        }
        return this;
    };

    var getMetricAgg = function() {
        return this._params.metric_agg;
    };

    module.exports = {
        // tiling
        setMetricAgg: setMetricAgg,
        getMetricAgg: getMetricAgg,
    };

}());

},{}],34:[function(require,module,exports){
(function() {

    'use strict';

    var checkField = function(meta, field) {
        if (meta) {
            if (meta.type === 'string') {
                return true;
            } else {
                console.warn('Field `' + field + '` is not of type `string` in meta data. Ignoring command.');
            }
        } else {
            console.warn('Field `' + field + '` is not recognized in meta data. Ignoring command.');
        }
        return false;
    };

    var normalizeTerms = function(prefixes) {
        prefixes.sort(function(a, b) {
            if (a < b) {
                return -1;
            }
            if (a > b) {
                return 1;
            }
            return 0;
        });
        return prefixes;
    };

    var addPrefixFilter = function(field, prefixes) {
        if (!field) {
            console.warn('PrefixFilter `field` is missing from argument. Ignoring command.');
            return;
        }
        if (prefixes === undefined) {
            console.warn('PrefixFilter `prefixes` are missing from argument. Ignoring command.');
            return;
        }
        var meta = this._meta[field];
        if (checkField(meta, field)) {
            var filter = _.find(this._params.prefix_filter, function(filter) {
                return filter.field === field;
            });
            if (filter) {
                console.warn('Range with `field` of `' + field + '` already exists, used `updateRange` instead.');
                return;
            }
            this._params.prefix_filter = this._params.prefix_filter || [];
            this._params.prefix_filter.push({
                field: field,
                prefixes: normalizeTerms(prefixes)
            });
            this.clearExtrema();
        }
        return this;
    };

    var updatePrefixFilter = function(field, prefixes) {
        var filter = _.find(this._params.prefix_filter, function(filter) {
            return filter.field === field;
        });
        if (!filter) {
            console.warn('Range with `field` of `' + field + '` does not exist. Ignoring command.');
            return;
        }
        if (prefixes !== undefined) {
            filter.prefixes = normalizeTerms(prefixes);
            this.clearExtrema();
        }
        return this;
    };

    var removePrefixFilter = function(field) {
        var filter = _.find(this._params.prefix_filter, function(filter) {
            return filter.field === field;
        });
        if (!filter) {
            console.warn('Range with `field` of `' + field + '` does not exist. Ignoring command.');
            return;
        }
        this._params.prefix_filter = _.filter(this._params.prefix_filter, function(filter) {
            return filter.field !== field;
        });
        this.clearExtrema();
        return this;
    };

    var getPrefixFilter = function() {
        return this._params.prefix_filter;
    };

    module.exports = {
        addPrefixFilter: addPrefixFilter,
        updatePrefixFilter: updatePrefixFilter,
        removePrefixFilter: removePrefixFilter,
        getPrefixFilter: getPrefixFilter
    };

}());

},{}],35:[function(require,module,exports){
(function() {

    'use strict';

    var checkField = function(meta, field) {
        if (meta) {
            if (meta.type === 'string') {
                return true;
            } else {
                console.warn('Field `' + field + '` is not `string` in meta data. Ignoring command.');
            }
        } else {
            console.warn('Field `' + field + '` is not recognized in meta data. Ignoring command.');
        }
        return false;
    };

    var addQueryString = function(field, str) {
        if (!field) {
            console.warn('QueryString `field` is missing from argument. Ignoring command.');
            return;
        }
        if (!str) {
            console.warn('QueryString `string` is missing from argument. Ignoring command.');
            return;
        }
        var meta = this._meta[field];
        if (checkField(meta, field)) {
            var query = _.find(this._params.query_string, function(query) {
                return query.field === field;
            });
            if (query) {
                console.warn('QueryString with `field` of `' + field + '` already exists, used `updateQueryString` instead.');
                return;
            }
            this._params.query_string = this._params.query_string || [];
            this._params.query_string.push({
                field: field,
                string: str
            });
            this.clearExtrema();
        }
        return this;
    };

    var updateQueryString = function(field, str) {
        var query = _.find(this._params.query_string, function(query) {
            return query.field === field;
        });
        if (!query) {
            console.warn('QueryString with `field` of `' + field + '` does not exist. Ignoring command.');
            return;
        }
        var changed = false;
        if (str !== undefined) {
            changed = true;
            query.string = str;
        }
        if (changed) {
            this.clearExtrema();
        }
        return this;
    };

    var removeQueryString = function(field) {
        var query = _.find(this._params.query_string, function(query) {
            return query.field === field;
        });
        if (!query) {
            console.warn('QueryString with `field` of `' + field + '` does not exist. Ignoring command.');
            return;
        }
        this._params.query_string = _.filter(this._params.query_string, function(query) {
            return query.field !== field;
        });
        this.clearExtrema();
        return this;
    };

    var getQueryString = function() {
        return this._params.query_string;
    };

    module.exports = {
        addQueryString: addQueryString,
        updateQueryString: updateQueryString,
        removeQueryString: removeQueryString,
        getQueryString: getQueryString
    };

}());

},{}],36:[function(require,module,exports){
(function() {

    'use strict';

    var checkField = function(meta, field) {
        if (meta) {
            if (meta.extrema) {
                return true;
            } else {
                console.warn('Field `' + field + '` is not ordinal in meta data. Ignoring command.');
            }
        } else {
            console.warn('Field `' + field + '` is not recognized in meta data. Ignoring command.');
        }
        return false;
    };

    var addRange = function(field, from, to) {
        if (!field) {
            console.warn('Range `field` is missing from argument. Ignoring command.');
            return;
        }
        if (from === undefined) {
            console.warn('Range `from` is missing from argument. Ignoring command.');
            return;
        }
        if (to === undefined) {
            console.warn('Range `to` is missing from argument. Ignoring command.');
            return;
        }
        var meta = this._meta[field];
        if (checkField(meta, field)) {
            var range = _.find(this._params.range, function(range) {
                return range.field === field;
            });
            if (range) {
                console.warn('Range with `field` of `' + field + '` already exists, used `updateRange` instead.');
                return;
            }
            this._params.range = this._params.range || [];
            this._params.range.push({
                field: field,
                from: from,
                to: to
            });
            this.clearExtrema();
        }
        return this;
    };

    var updateRange = function(field, from, to) {
        var range = _.find(this._params.range, function(range) {
            return range.field === field;
        });
        if (!range) {
            console.warn('Range with `field` of `' + field + '` does not exist. Ignoring command.');
            return;
        }
        var changed = false;
        if (from !== undefined) {
            changed = true;
            range.from = from;
        }
        if (to !== undefined) {
            changed = true;
            range.to = to;
        }
        if (changed) {
            this.clearExtrema();
        }
        return this;
    };

    var removeRange = function(field) {
        var range = _.find(this._params.range, function(range) {
            return range.field === field;
        });
        if (!range) {
            console.warn('Range with `field` of `' + field + '` does not exist. Ignoring command.');
            return;
        }
        this._params.range = _.filter(this._params.range, function(range) {
            return range.field !== field;
        });
        this.clearExtrema();
        return this;
    };

    var getRange = function() {
        return this._params.range;
    };

    module.exports = {
        addRange: addRange,
        updateRange: updateRange,
        removeRange: removeRange,
        getRange: getRange
    };

}());

},{}],37:[function(require,module,exports){
(function() {

    'use strict';

    var checkField = function(meta, field) {
        if (meta) {
            if (meta.type === 'string') {
                return true;
            } else {
                console.warn('Field `' + field + '` is not of type `string` in meta data. Ignoring command.');
            }
        } else {
            console.warn('Field `' + field + '` is not recognized in meta data. Ignoring command.');
        }
        return false;
    };

    var normalizeTerms = function(terms) {
        terms.sort(function(a, b) {
            if (a < b) {
                return -1;
            }
            if (a > b) {
                return 1;
            }
            return 0;
        });
        return terms;
    };

    var setTermsAgg = function(field, terms) {
        if (!field) {
            console.warn('TermsAgg `field` is missing from argument. Ignoring command.');
            return;
        }
        if (terms === undefined) {
            console.warn('TermsAgg `terms` are missing from argument. Ignoring command.');
            return;
        }
        var meta = this._meta[field];
        if (checkField(meta, field)) {
            this._params.terms_agg = {
                field: field,
                terms: normalizeTerms(terms)
            };
            this.clearExtrema();
        }
        return this;
    };

    var getTermsAgg = function() {
        return this._params.terms_agg;
    };

    module.exports = {
        setTermsAgg: setTermsAgg,
        getTermsAgg: getTermsAgg
    };

}());

},{}],38:[function(require,module,exports){
(function() {

    'use strict';

    var checkField = function(meta, field) {
        if (meta) {
            if (meta.type === 'string') {
                return true;
            } else {
                console.warn('Field `' + field + '` is not of type `string` in meta data. Ignoring command.');
            }
        } else {
            console.warn('Field `' + field + '` is not recognized in meta data. Ignoring command.');
        }
        return false;
    };

    var normalizeTerms = function(terms) {
        terms.sort(function(a, b) {
            if (a < b) {
                return -1;
            }
            if (a > b) {
                return 1;
            }
            return 0;
        });
        return terms;
    };

    var addTermsFilter = function(field, terms) {
        if (!field) {
            console.warn('TermsFilter `field` is missing from argument. Ignoring command.');
            return;
        }
        if (terms === undefined) {
            console.warn('TermsFilter `terms` are missing from argument. Ignoring command.');
            return;
        }
        var meta = this._meta[field];
        if (checkField(meta, field)) {
            var filter = _.find(this._params.terms_filter, function(filter) {
                return filter.field === field;
            });
            if (filter) {
                console.warn('TermsFilter with `field` of `' + field + '` already exists, used `updateRange` instead.');
                return;
            }
            this._params.terms_filter = this._params.terms_filter || [];
            this._params.terms_filter.push({
                field: field,
                terms: normalizeTerms(terms)
            });
            this.clearExtrema();
        }
        return this;
    };

    var updateTermsFilter = function(field, terms) {
        var filter = _.find(this._params.terms_filter, function(filter) {
            return filter.field === field;
        });
        if (!filter) {
            console.warn('Range with `field` of `' + field + '` does not exist. Ignoring command.');
            return;
        }
        if (terms !== undefined) {
            filter.terms = normalizeTerms(terms);
            this.clearExtrema();
        }
        return this;
    };

    var removeTermsFilter = function(field) {
        var filter = _.find(this._params.terms_filter, function(filter) {
            return filter.field === field;
        });
        if (!filter) {
            console.warn('Range with `field` of `' + field + '` does not exist. Ignoring command.');
            return;
        }
        this._params.terms_filter = _.filter(this._params.terms_filter, function(filter) {
            return filter.field !== field;
        });
        this.clearExtrema();
        return this;
    };

    var getTermsFilter = function(field) {
        return this._params.terms_filter[field];
    };

    module.exports = {
        addTermsFilter: addTermsFilter,
        updateTermsFilter: updateTermsFilter,
        removeTermsFilter: removeTermsFilter,
        getTermsFilter: getTermsFilter
    };

}());

},{}],39:[function(require,module,exports){
(function() {

    'use strict';

    var DEFAULT_X_FIELD = 'pixel.x';
    var DEFAULT_Y_FIELD = 'pixel.y';

    var checkField = function(meta, field) {
        if (meta) {
            if (meta.extrema) {
                return true;
            } else {
                console.warn('Field `' + field + '` is not ordinal in meta data. Ignoring command.');
            }
        } else {
            console.warn('Field `' + field + '` is not recognized in meta data. Ignoring command.');
        }
        return false;
    };

    var setXField = function(field) {
        if (field !== this._params.binning.x) {
            if (field === DEFAULT_X_FIELD) {
                // reset if default
                this._params.binning.x = undefined;
                this._params.binning.left = undefined;
                this._params.binning.right = undefined;
                this.clearExtrema();
            } else {
                var meta = this._meta[field];
                if (checkField(meta, field)) {
                    this._params.binning.x = field;
                    this._params.binning.left = meta.extrema.min;
                    this._params.binning.right = meta.extrema.max;
                    this.clearExtrema();
                }
            }
        }
        return this;
    };

    var getXField = function() {
        return this._params.binning.x;
    };

    var setYField = function(field) {
        if (field !== this._params.binning.y) {
            if (field === DEFAULT_Y_FIELD) {
                // reset if default
                this._params.binning.y = undefined;
                this._params.binning.bottom = undefined;
                this._params.binning.top = undefined;
                this.clearExtrema();
            } else {
                var meta = this._meta[field];
                if (checkField(meta, field)) {
                    this._params.binning.y = field;
                    this._params.binning.bottom = meta.extrema.min;
                    this._params.binning.top = meta.extrema.max;
                    this.clearExtrema();
                }
            }
        }
        return this;
    };

    var getYField = function() {
        return this._params.binning.y;
    };

    module.exports = {
        setXField: setXField,
        getXField: getXField,
        setYField: setYField,
        getYField: getYField,
        DEFAULT_X_FIELD: DEFAULT_X_FIELD,
        DEFAULT_Y_FIELD: DEFAULT_Y_FIELD
    };

}());

},{}],40:[function(require,module,exports){
(function() {

    'use strict';

    var checkField = function(meta, field) {
        if (meta) {
            if (meta.type === 'string') {
                return true;
            } else {
                console.warn('Field `' + field + '` is not of type `string` in meta data. Ignoring command.');
            }
        } else {
            console.warn('Field `' + field + '` is not recognized in meta data. Ignoring command.');
        }
        return false;
    };

    var setTopTerms = function(field, size) {
        if (!field) {
            console.warn('TopTerms `field` is missing from argument. Ignoring command.');
            return;
        }
        var meta = this._meta[field];
        if (checkField(meta, field)) {
            this._params.top_terms = {
                field: field,
                size: size
            };
            this.clearExtrema();
        }
        return this;
    };

    var getTopTerms = function() {
        return this._params.top_terms;
    };

    module.exports = {
        setTopTerms: setTopTerms,
        getTopTerms: getTopTerms
    };

}());

},{}],41:[function(require,module,exports){
(function() {

    'use strict';

    var Live = require('../core/Live');
    var Binning = require('../params/Binning');
    var MetricAgg = require('../params/MetricAgg');
    var TermsFilter = require('../params/TermsFilter');
    var BoolQuery = require('../params/BoolQuery');
    var PrefixFilter = require('../params/PrefixFilter');
    var Range = require('../params/Range');
    var QueryString = require('../params/QueryString');
    var ColorRamp = require('../mixins/ColorRamp');
    var ValueTransform = require('../mixins/ValueTransform');

    var Heatmap = Live.extend({

        includes: [
            // params
            Binning,
            MetricAgg,
            TermsFilter,
            BoolQuery,
            PrefixFilter,
            Range,
            QueryString,
            // mixins
            ColorRamp,
            ValueTransform
        ],

        type: 'heatmap',

        initialize: function() {
            ColorRamp.initialize.apply(this, arguments);
            ValueTransform.initialize.apply(this, arguments);
            // base
            Live.prototype.initialize.apply(this, arguments);
        },

        extractExtrema: function(data) {
            var bins = new Float64Array(data);
            return {
                min: _.min(bins),
                max: _.max(bins)
            };
        }

    });

    module.exports = Heatmap;

}());

},{"../core/Live":24,"../mixins/ColorRamp":27,"../mixins/ValueTransform":28,"../params/Binning":29,"../params/BoolQuery":30,"../params/MetricAgg":33,"../params/PrefixFilter":34,"../params/QueryString":35,"../params/Range":36,"../params/TermsFilter":38}],42:[function(require,module,exports){
(function() {

    'use strict';

    var Live = require('../core/Live');
    var Tiling = require('../params/Tiling');
    var TermsFilter = require('../params/TermsFilter');
    var PrefixFilter = require('../params/PrefixFilter');
    var TopTerms = require('../params/TopTerms');
    var Range = require('../params/Range');
    var Histogram = require('../params/Histogram');
    var ValueTransform = require('../mixins/ValueTransform');

    var TopCount = Live.extend({

        includes: [
            // params
            Tiling,
            TopTerms,
            TermsFilter,
            PrefixFilter,
            Range,
            Histogram,
            // mixins
            ValueTransform
        ],

        type: 'top_count',

        initialize: function() {
            ValueTransform.initialize.apply(this, arguments);
            // base
            Live.prototype.initialize.apply(this, arguments);
        },

    });

    module.exports = TopCount;

}());

},{"../core/Live":24,"../mixins/ValueTransform":28,"../params/Histogram":32,"../params/PrefixFilter":34,"../params/Range":36,"../params/TermsFilter":38,"../params/Tiling":39,"../params/TopTerms":40}],43:[function(require,module,exports){
(function() {

    'use strict';

    var Live = require('../core/Live');
    var Tiling = require('../params/Tiling');
    var TopTerms = require('../params/TopTerms');
    var TermsFilter = require('../params/TermsFilter');
    var PrefixFilter = require('../params/PrefixFilter');
    var Range = require('../params/Range');
    var DateHistogram = require('../params/DateHistogram');
    var Histogram = require('../params/Histogram');
    var ValueTransform = require('../mixins/ValueTransform');

    var TopFrequency = Live.extend({

        includes: [
            // params
            Tiling,
            TopTerms,
            TermsFilter,
            PrefixFilter,
            Range,
            DateHistogram,
            Histogram,
            // mixins
            ValueTransform
        ],

        type: 'top_frequency',

        initialize: function() {
            ValueTransform.initialize.apply(this, arguments);
            // base
            Live.prototype.initialize.apply(this, arguments);
        },

    });

    module.exports = TopFrequency;

}());

},{"../core/Live":24,"../mixins/ValueTransform":28,"../params/DateHistogram":31,"../params/Histogram":32,"../params/PrefixFilter":34,"../params/Range":36,"../params/TermsFilter":38,"../params/Tiling":39,"../params/TopTerms":40}],44:[function(require,module,exports){
(function() {

    'use strict';

    var Live = require('../core/Live');
    var Tiling = require('../params/Tiling');
    var TermsAgg = require('../params/TermsAgg');
    var Range = require('../params/Range');
    var Histogram = require('../params/Histogram');
    var ValueTransform = require('../mixins/ValueTransform');

    var TopicCount = Live.extend({

        includes: [
            // params
            Tiling,
            TermsAgg,
            Range,
            Histogram,
            // mixins
            ValueTransform
        ],

        type: 'topic_count',

        initialize: function() {
            ValueTransform.initialize.apply(this, arguments);
            // base
            Live.prototype.initialize.apply(this, arguments);
        },

    });

    module.exports = TopicCount;

}());

},{"../core/Live":24,"../mixins/ValueTransform":28,"../params/Histogram":32,"../params/Range":36,"../params/TermsAgg":37,"../params/Tiling":39}],45:[function(require,module,exports){
(function() {

    'use strict';

    var Live = require('../core/Live');
    var Tiling = require('../params/Tiling');
    var TermsAgg = require('../params/TermsAgg');
    var Range = require('../params/Range');
    var DateHistogram = require('../params/DateHistogram');
    var Histogram = require('../params/Histogram');
    var ValueTransform = require('../mixins/ValueTransform');

    var TopicFrequency = Live.extend({

        includes: [
            // params
            Tiling,
            TermsAgg,
            Range,
            DateHistogram,
            Histogram,
            // mixins
            ValueTransform
        ],

        type: 'topic_frequency',

        initialize: function() {
            ValueTransform.initialize.apply(this, arguments);
            // base
            Live.prototype.initialize.apply(this, arguments);
        },

    });

    module.exports = TopicFrequency;

}());

},{"../core/Live":24,"../mixins/ValueTransform":28,"../params/DateHistogram":31,"../params/Histogram":32,"../params/Range":36,"../params/TermsAgg":37,"../params/Tiling":39}],46:[function(require,module,exports){
(function() {

    'use strict';

    var DOM = require('./DOM');

    var Canvas = DOM.extend({

        _createTile: function() {
            var tile = L.DomUtil.create('canvas', 'leaflet-tile');
            tile.width = tile.height = this.options.tileSize;
            tile.onselectstart = tile.onmousemove = L.Util.falseFn;
            return tile;
        }

    });

    module.exports = Canvas;

}());

},{"./DOM":47}],47:[function(require,module,exports){
(function() {

    'use strict';

    var Image = require('../../layer/core/Image');

    var DOM = Image.extend({

        onAdd: function(map) {
            L.TileLayer.prototype.onAdd.call(this, map);
            map.on('zoomstart', this.clearExtrema, this);
        },

        onRemove: function(map) {
            map.off('zoomstart', this.clearExtrema, this);
            L.TileLayer.prototype.onRemove.call(this, map);
        },

        redraw: function() {
            if (this._map) {
                this._reset({
                    hard: true
                });
                this._update();
            }
            return this;
        },

        _createTile: function() {
            // override
        },

        _loadTile: function(tile, tilePoint) {
            tile._layer = this;
            tile._tilePoint = tilePoint;
            tile._unadjustedTilePoint = {
                x: tilePoint.x,
                y: tilePoint.y
            };
            tile.dataset.x = tilePoint.x;
            tile.dataset.y = tilePoint.y;
            this._adjustTilePoint(tilePoint);
            this._redrawTile(tile);
        },

        _adjustTileKey: function(key) {
            // when dealing with wrapped tiles, internally leafet will use
            // coordinates n < 0 and n > (2^z) to position them correctly.
            // this function converts that to the modulos key used to cache them
            // data.
            // Ex. '-1:3' at z = 2 becomes '3:3'
            var kArr = key.split(':');
            var x = parseInt(kArr[0], 10);
            var y = parseInt(kArr[1], 10);
            var tilePoint = {
                x: x,
                y: y
            };
            this._adjustTilePoint(tilePoint);
            return tilePoint.x + ':' + tilePoint.y + ':' + tilePoint.z;
        },

        _removeTile: function(key) {
            var adjustedKey = this._adjustTileKey(key);
            var cached = this._cache[adjustedKey];
            // remove the tile from the cache
            delete cached.tiles[key];
            if (_.keys(cached.tiles).length === 0) {
                // no more tiles use this cached data, so delete it
                delete this._cache[adjustedKey];
            }
            // call parent method
            L.TileLayer.prototype._removeTile.call(this, key);
        },

        _redrawTile: function(tile) {
            var self = this;
            var cache = this._cache;
            var coord = {
                x: tile._tilePoint.x,
                y: tile._tilePoint.y,
                z: this._map._zoom
            };
            // use the adjusted coordinates to hash the the cache values, this
            // is because we want to only have one copy of the data
            var hash = coord.x + ':' + coord.y + ':' + coord.z;
            // use the unadjsuted coordinates to track which 'wrapped' tiles
            // used the cached data
            var unadjustedHash = tile._unadjustedTilePoint.x + ':' + tile._unadjustedTilePoint.y;
            // check cache
            var cached = cache[hash];
            if (cached) {
                if (cached.isPending) {
                    // currently pending
                    // store the tile in the cache to draw to later
                    cached.tiles[unadjustedHash] = tile;
                } else {
                    // already requested
                    // store the tile in the cache
                    cached.tiles[unadjustedHash] = tile;
                    // draw the tile
                    self.renderTile(tile, cached.data);
                    self.tileDrawn(tile);
                }
            } else {
                // create a cache entry
                cache[hash] = {
                    isPending: true,
                    tiles: {},
                    data: null
                };
                // add tile to the cache entry
                cache[hash].tiles[unadjustedHash] = tile;
                // request the tile
                this.requestTile(coord, function(data) {
                    var cached = cache[hash];
                    if (!cached) {
                        // tile is no longer being tracked, ignore
                        return;
                    }
                    cached.isPending = false;
                    cached.data = data;
                    // update the extrema
                    if (data && self.updateExtrema(data)) {
                        // extrema changed, redraw all tiles
                        self.redraw();
                    } else {
                        // same extrema, we are good to render the tiles. In
                        // the case of a map with wraparound, we may have
                        // multiple tiles dependent on the response, so iterate
                        // over each tile and draw it.
                        _.forIn(cached.tiles, function(tile) {
                            self.renderTile(tile, data);
                            self.tileDrawn(tile);
                        });
                    }
                });
            }
        },

        tileDrawn: function(tile) {
            this._tileOnLoad.call(tile);
        },

        requestTile: function() {
            // override
        },

        renderTile: function() {
            // override
        },

    });

    module.exports = DOM;

}());

},{"../../layer/core/Image":23}],48:[function(require,module,exports){
(function() {

    'use strict';

    var DOM = require('./DOM');

    var HTML = DOM.extend({

        options: {
            handlers: {}
        },

        onAdd: function(map) {
            var self = this;
            DOM.prototype.onAdd.call(this, map);
            map.on('click', this.onClick, this);
            $(this._container).on('mouseover', function(e) {
                self.onMouseOver(e);
            });
            $(this._container).on('mouseout', function(e) {
                self.onMouseOut(e);
            });
        },

        onRemove: function(map) {
            map.off('click', this.onClick, this);
            $(this._container).off('mouseover');
            $(this._container).off('mouseout');
            DOM.prototype.onRemove.call(this, map);
        },

        _createTile: function() {
            var tile = L.DomUtil.create('div', 'leaflet-tile leaflet-html-tile');
            tile.width = this.options.tileSize;
            tile.height = this.options.tileSize;
            tile.onselectstart = L.Util.falseFn;
            tile.onmousemove = L.Util.falseFn;
            return tile;
        },

        onMouseOver: function() {
            // override
        },

        onMouseOut: function() {
            // override
        },


        onClick: function() {
            // override
        }

    });

    module.exports = HTML;

}());

},{"./DOM":47}],49:[function(require,module,exports){
(function() {

    'use strict';

    var esper = require('esper');

    function translationMatrix(translation) {
        return new Float32Array([
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            translation[0], translation[1], translation[2], 1
        ]);
    }

    function orthoMatrix(left, right, bottom, top, near, far) {
        var mat = new Float32Array(16);
        mat[0] = 2 / ( right - left );
        mat[1] = 0;
        mat[2] = 0;
        mat[3] = 0;
        mat[4] = 0;
        mat[5] = 2 / ( top - bottom );
        mat[6] = 0;
        mat[7] = 0;
        mat[8] = 0;
        mat[9] = 0;
        mat[10] = -2 / ( far - near );
        mat[11] = 0;
        mat[12] = -( ( right + left ) / ( right - left ) );
        mat[13] = -( ( top + bottom ) / ( top - bottom ) );
        mat[14] = -( ( far + near ) / ( far - near ) );
        mat[15] = 1;
        return mat;
    }

    // TODO:
    //     - fix zoom transition animation bug
    //     - fix show / hide bug

    var WebGL = L.Class.extend({

        includes: [
            L.Mixin.Events
        ],

        options: {
            minZoom: 0,
            maxZoom: 18,
            zoomOffset: 0,
            opacity: 1,
            shaders: {
                vert: null,
                frag: null
            },
            unloadInvisibleTiles: L.Browser.mobile,
            updateWhenIdle: L.Browser.mobile
        },

        initialize: function(meta, options) {
            options = L.setOptions(this, options);
            if (options.bounds) {
                options.bounds = L.latLngBounds(options.bounds);
            }
        },

        getOpacity: function() {
            return this.options.opacity;
        },

        show: function() {
            this._hidden = false;
            this._prevMap.addLayer(this);
        },

        hide: function() {
            this._hidden = true;
            this._prevMap = this._map;
            this._map.removeLayer(this);
        },

        isHidden: function() {
            return this._hidden;
        },

        onAdd: function(map) {
            this._map = map;
            this._animated = map._zoomAnimated;
            if (!this._canvas) {
                // create canvas
                this._initCanvas();
                map._panes.tilePane.appendChild(this._canvas);
                // initialize the webgl context
                this._initGL();
            } else {
                map._panes.tilePane.appendChild(this._canvas);
            }
            // set up events
            map.on({
                'resize': this._resize,
                'viewreset': this._reset,
                'moveend': this._update,
                'zoomstart': this.clearExtrema
            }, this);
            if (map.options.zoomAnimation && L.Browser.any3d) {
                map.on({
                    'zoomstart': this._enableZooming,
                    'zoomanim': this._animateZoom,
                    'zoomend': this._disableZooming,
                }, this);
            }
            if (!this.options.updateWhenIdle) {
                this._limitedUpdate = L.Util.limitExecByInterval(this._update, 150, this);
                map.on('move', this._limitedUpdate, this);
            }
            this._reset();
            this._update();
        },

        addTo: function(map) {
            map.addLayer(this);
            return this;
        },

        onRemove: function(map) {
            // clear the current buffer
            this._clearBackBuffer();
            map.getPanes().tilePane.removeChild(this._canvas);
            map.off({
                'resize': this._resize,
                'viewreset': this._reset,
                'moveend': this._update,
                'zoomstart': this.clearExtrema
            }, this);
            if (map.options.zoomAnimation) {
                map.off({
                    'zoomstart': this._enableZooming,
                    'zoomanim': this._animateZoom,
                    'zoomend': this._disableZooming
                }, this);
            }
            if (!this.options.updateWhenIdle) {
                map.off('move', this._limitedUpdate, this);
            }
            this._map = null;
            this._animated = null;
            this._isZooming = false;
            this._cache = {};
        },

        _enableZooming: function() {
            this._isZooming = true;
        },

        _disableZooming: function() {
            this._isZooming = false;
            this._clearBackBuffer();
        },

        bringToFront: function() {
            var pane = this._map._panes.tilePane;
            if (this._canvas) {
                pane.appendChild(this._canvas);
                this._setAutoZIndex(pane, Math.max);
            }
            return this;
        },

        bringToBack: function() {
            var pane = this._map._panes.tilePane;
            if (this._canvas) {
                pane.insertBefore(this._canvas, pane.firstChild);
                this._setAutoZIndex(pane, Math.min);
            }
            return this;
        },

        _setAutoZIndex: function(pane, compare) {
            var layers = pane.children;
            var edgeZIndex = -compare(Infinity, -Infinity); // -Infinity for max, Infinity for min
            var zIndex;
            var i;
            var len;
            for (i = 0, len = layers.length; i < len; i++) {
                if (layers[i] !== this._canvas) {
                    zIndex = parseInt(layers[i].style.zIndex, 10);
                    if (!isNaN(zIndex)) {
                        edgeZIndex = compare(edgeZIndex, zIndex);
                    }
                }
            }
            this.options.zIndex = this._canvas.style.zIndex = (isFinite(edgeZIndex) ? edgeZIndex : 0) + compare(1, -1);
        },

        setOpacity: function(opacity) {
            this.options.opacity = opacity;
            return this;
        },

        setZIndex: function(zIndex) {
            this.options.zIndex = zIndex;
            this._updateZIndex();
            return this;
        },

        _updateZIndex: function() {
            if (this._canvas && this.options.zIndex !== undefined) {
                this._canvas.style.zIndex = this.options.zIndex;
            }
        },

        _reset: function(e) {
            var self = this;
            _.forIn(this._tiles, function(tile) {
                self.fire('tileunload', {
                    tile: tile
                });
            });
            this._tiles = {};
            this._tilesToLoad = 0;
            if (this._animated && e && e.hard) {
                this._clearBackBuffer();
            }
        },

        _update: function() {
            if (!this._map) {
                return;
            }
            var map = this._map;
            var bounds = map.getPixelBounds();
            var zoom = map.getZoom();
            var tileSize = this._getTileSize();
            if (zoom > this.options.maxZoom ||
                zoom < this.options.minZoom) {
                return;
            }
            var tileBounds = L.bounds(
                bounds.min.divideBy(tileSize)._floor(),
                bounds.max.divideBy(tileSize)._floor());
            this._addTilesFromCenterOut(tileBounds);
            if (this.options.unloadInvisibleTiles) {
                this._removeOtherTiles(tileBounds);
            }
        },

        _addTilesFromCenterOut: function(bounds) {
            var queue = [];
            var center = bounds.getCenter();
            var j;
            var i;
            var point;
            for (j = bounds.min.y; j <= bounds.max.y; j++) {
                for (i = bounds.min.x; i <= bounds.max.x; i++) {
                    point = new L.Point(i, j);
                    if (this._tileShouldBeLoaded(point)) {
                        queue.push(point);
                    }
                }
            }
            var tilesToLoad = queue.length;
            if (tilesToLoad === 0) {
                return;
            }
            // load tiles in order of their distance to center
            queue.sort(function(a, b) {
                return a.distanceTo(center) - b.distanceTo(center);
            });
            // if its the first batch of tiles to load
            if (!this._tilesToLoad) {
                this.fire('loading');
            }
            this._tilesToLoad += tilesToLoad;
            for (i = 0; i < tilesToLoad; i++) {
                this._addTile(queue[i]);
            }
        },

        _tileShouldBeLoaded: function(tilePoint) {
            if ((tilePoint.x + ':' + tilePoint.y) in this._tiles) {
                return false; // already loaded
            }
            var options = this.options;
            if (!options.continuousWorld) {
                var limit = this._getWrapTileNum();
                // don't load if exceeds world bounds
                if ((options.noWrap && (tilePoint.x < 0 || tilePoint.x >= limit.x)) ||
                    tilePoint.y < 0 || tilePoint.y >= limit.y) {
                    return false;
                }
            }
            if (options.bounds) {
                var tileSize = this._getTileSize();
                var nwPoint = tilePoint.multiplyBy(tileSize);
                var sePoint = nwPoint.add([tileSize, tileSize]);
                var nw = this._map.unproject(nwPoint);
                var se = this._map.unproject(sePoint);
                // TODO temporary hack, will be removed after refactoring projections
                // https://github.com/Leaflet/Leaflet/issues/1618
                if (!options.continuousWorld && !options.noWrap) {
                    nw = nw.wrap();
                    se = se.wrap();
                }
                if (!options.bounds.intersects([nw, se])) {
                    return false;
                }
            }
            return true;
        },

        _removeOtherTiles: function(bounds) {
            var self = this;
            _.forIn(this._tiles, function(tile, key) {
                var kArr = key.split(':');
                var x = parseInt(kArr[0], 10);
                var y = parseInt(kArr[1], 10);
                // remove tile if it's out of bounds
                if (x < bounds.min.x ||
                    x > bounds.max.x ||
                    y < bounds.min.y ||
                    y > bounds.max.y) {
                    self._removeTile(key);
                }
            });
        },

        _getTileSize: function() {
            var map = this._map;
            var zoom = map.getZoom() + this.options.zoomOffset;
            var zoomN = this.options.maxNativeZoom;
            var tileSize = 256;
            if (zoomN && zoom > zoomN) {
                tileSize = Math.round(map.getZoomScale(zoom) / map.getZoomScale(zoomN) * tileSize);
            }
            return tileSize;
        },

        redraw: function() {
            if (this._map) {
                this._reset({
                    hard: true
                });
                this._update();
            }
            return this;
        },

        _createTile: function() {
            return {};
        },

        _addTile: function(tilePoint) {
            // create a new tile
            var tile = this._createTile();
            this._tiles[tilePoint.x + ':' + tilePoint.y] = tile;
            this._loadTile(tile, tilePoint);
        },

        _loadTile: function(tile, tilePoint) {
            tile._layer = this;
            tile._tilePoint = tilePoint;
            tile._unadjustedTilePoint = {
                x: tilePoint.x,
                y: tilePoint.y
            };
            this._adjustTilePoint(tilePoint);
            this._redrawTile(tile);
        },

        _adjustTileKey: function(key) {
            // when dealing with wrapped tiles, internally leafet will use
            // coordinates n < 0 and n > (2^z) to position them correctly.
            // this function converts that to the modulos key used to cache them
            // data.
            // Ex. '-1:3' at z = 2 becomes '3:3'
            var kArr = key.split(':');
            var x = parseInt(kArr[0], 10);
            var y = parseInt(kArr[1], 10);
            var tilePoint = {
                x: x,
                y: y
            };
            this._adjustTilePoint(tilePoint);
            return tilePoint.x + ':' + tilePoint.y + ':' + tilePoint.z;
        },

        _getZoomForUrl: function() {
            var options = this.options;
            var zoom = this._map.getZoom();
            if (options.zoomReverse) {
                zoom = options.maxZoom - zoom;
            }
            zoom += options.zoomOffset;
            return options.maxNativeZoom ? Math.min(zoom, options.maxNativeZoom) : zoom;
        },

        _getTilePos: function(tilePoint) {
            var origin = this._map.getPixelOrigin();
            var tileSize = this._getTileSize();
            return tilePoint.multiplyBy(tileSize).subtract(origin);
        },

        _getWrapTileNum: function() {
            var crs = this._map.options.crs;
            var size = crs.getSize(this._map.getZoom());
            return size.divideBy(this._getTileSize())._floor();
        },

        _adjustTilePoint: function(tilePoint) {
            var limit = this._getWrapTileNum();
            // wrap tile coordinates
            if (!this.options.continuousWorld && !this.options.noWrap) {
                tilePoint.x = ((tilePoint.x % limit.x) + limit.x) % limit.x;
            }
            if (this.options.tms) {
                tilePoint.y = limit.y - tilePoint.y - 1;
            }
            tilePoint.z = this._getZoomForUrl();
        },

        _removeTile: function(key) {
            var adjustedKey = this._adjustTileKey(key);
            var cached = this._cache[adjustedKey];
            // remove the tile from the cache
            delete cached.tiles[key];
            if (_.keys(cached.tiles).length === 0) {
                // no more tiles use this cached data, so delete it
                delete this._cache[adjustedKey];
            }
            // unload the tile
            var tile = this._tiles[key];
            this.fire('tileunload', {
                tile: tile
            });
            delete this._tiles[key];
        },

        _tileLoaded: function() {
            this._tilesToLoad--;
            if (this._animated) {
                L.DomUtil.addClass(this._canvas, 'leaflet-zoom-animated');
            }
            if (!this._tilesToLoad) {
                this.fire('load');
                if (this._animated) {
                    // clear scaled tiles after all new tiles are loaded (for performance)
                    clearTimeout(this._clearBufferTimer);
                    this._clearBufferTimer = setTimeout(L.bind(this._clearBackBuffer, this), 500);
                }
            }
        },

        _tileOnLoad: function() {
            var layer = this._layer;
            L.DomUtil.addClass(this, 'leaflet-tile-loaded');
            layer.fire('tileload', {
                tile: this
            });
            layer._tileLoaded();
        },

        _tileOnError: function() {
            var layer = this._layer;
            layer.fire('tileerror', {
                tile: this
            });
            layer._tileLoaded();
        },

        _encodeFloatAsUint8: function(num) {
            return new Uint8Array([
                (num & 0xff000000) >> 24,
                (num & 0x00ff0000) >> 16,
                (num & 0x0000ff00) >> 8,
                (num & 0x000000ff)
            ]);
        },

        _createDataTexture: function(data) {
            var doubles = new Float64Array(data);
            var resolution = Math.sqrt(doubles.length);
            var buffer = new ArrayBuffer(resolution * resolution * 4);
            var encodedBins = new Uint8Array(buffer);
            for (var i = 0; i < resolution * resolution; i++) {
                // cast from float64 to float32
                var enc = this._encodeFloatAsUint8(doubles[i]);
                encodedBins[i * 4] = enc[0];
                encodedBins[i * 4 + 1] = enc[1];
                encodedBins[i * 4 + 2] = enc[2];
                encodedBins[i * 4 + 3] = enc[3];
            }
            return new esper.Texture2D({
                height: resolution,
                width: resolution,
                data: encodedBins,
                format: 'RGBA',
                type: 'UNSIGNED_BYTE',
                wrap: 'CLAMP_TO_EDGE',
                filter: 'NEAREST',
                invertY: true
            });
        },

        _redrawTile: function(tile) {
            var self = this;
            var cache = this._cache;
            var coord = {
                x: tile._tilePoint.x,
                y: tile._tilePoint.y,
                z: this._map._zoom
            };
            // use the adjusted coordinates to hash the the cache values, this
            // is because we want to only have one copy of the data
            var hash = coord.x + ':' + coord.y + ':' + coord.z;
            // use the unadjsuted coordinates to track which 'wrapped' tiles
            // used the cached data
            var unadjustedHash = tile._unadjustedTilePoint.x + ':' + tile._unadjustedTilePoint.y;
            // check cache
            var cached = cache[hash];
            if (cached) {
                // store the tile in the cache to draw to later
                cached.tiles[unadjustedHash] = tile;
            } else {
                // create a cache entry
                cache[hash] = {
                    isPending: true,
                    tiles: {},
                    data: null
                };
                // add tile to the cache entry
                cache[hash].tiles[unadjustedHash] = tile;
                // request the tile
                this.requestTile(coord, function(data) {
                    var cached = cache[hash];
                    if (!cached) {
                        // tile is no longer being tracked, ignore
                        return;
                    }
                    cached.isPending = false;
                    // if data is null, exit early
                    if (data === null) {
                        return;
                    }
                    // update the extrema
                    self.updateExtrema(data);
                    cached.data = self._createDataTexture(data);
                });
            }
        },

        _initGL: function() {
            var self = this;
            var gl = this._gl = esper.WebGLContext.get(this._canvas);
            // handle missing context
            if (!gl) {
                console.error('Unable to acquire a WebGL context.');
                return;
            }
            // init the webgl state
            gl.clearColor(0, 0, 0, 0);
            gl.enable(gl.BLEND);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
            gl.disable(gl.DEPTH_TEST);
            // create tile renderable
            self._renderable = new esper.Renderable({
                vertices: {
                    0: [
                        [0, -256],
                        [256, -256],
                        [256, 0],
                        [0, 0]
                    ],
                    1: [
                        [0, 0],
                        [1, 0],
                        [1, 1],
                        [0, 1]
                    ]
                },
                indices: [
                    0, 1, 2,
                    0, 2, 3
                ]
            });
            // load shaders
            this._shader = new esper.Shader({
                vert: this.options.shaders.vert,
                frag: this.options.shaders.frag
            }, function() {
                // execute callback
                var width = self._canvas.width;
                var height = self._canvas.height;
                self._viewport = new esper.Viewport({
                    width: width,
                    height: height
                });
                self._initialized = true;
                self._draw();
            });
        },

        _initCanvas: function() {
            this._canvas = L.DomUtil.create('canvas', 'leaflet-webgl-layer leaflet-layer');
            var size = this._map.getSize();
            this._canvas.width = size.x;
            this._canvas.height = size.y;
            var animated = this._map.options.zoomAnimation && L.Browser.any3d;
            L.DomUtil.addClass(this._canvas, 'leaflet-zoom-' + (animated ? 'animated' : 'hide'));
        },

        _getProjection: function() {
            var bounds = this._map.getPixelBounds();
            var dim = Math.pow(2, this._map.getZoom()) * 256;
            return orthoMatrix(
                bounds.min.x,
                bounds.max.x,
                (dim - bounds.max.y),
                (dim - bounds.min.y),
                -1, 1);
        },

        _clearBackBuffer: function() {
            if (!this._gl) {
                return;
            }
            var gl = this._gl;
            gl.clear(gl.COLOR_BUFFER_BIT);
        },

        _animateZoom: function(e) {
            var scale = this._map.getZoomScale(e.zoom);
            var offset = this._map._getCenterOffset(e.center)._multiplyBy(-scale).subtract(this._map._getMapPanePos());
            this._canvas.style[L.DomUtil.TRANSFORM] = L.DomUtil.getTranslateString(offset) + ' scale(' + scale + ')';
        },

        _resize: function(resizeEvent) {
            var width = resizeEvent.newSize.x;
            var height = resizeEvent.newSize.y;
            if (this._initialized) {
                this._viewport.resize(width, height);
            }
        },

        _draw: function() {
            if (this._initialized && this._gl) {
                if (!this.isHidden()) {
                    // re-position canvas
                    if (!this._isZooming) {
                        var topLeft = this._map.containerPointToLayerPoint([0, 0]);
                        L.DomUtil.setPosition(this._canvas, topLeft);
                    }
                    this._beforeDraw();
                    this.beforeDraw();
                    this.draw();
                    this.afterDraw();
                    this._afterDraw();
                }
                requestAnimationFrame(this._draw.bind(this));
            }
        },

        beforeDraw: function() {
            // override
        },

        _beforeDraw: function() {
            this._viewport.push();
            this._shader.push();
            this._shader.setUniform('uProjectionMatrix', this._getProjection());
            this._shader.setUniform('uOpacity', this.getOpacity());
            this._shader.setUniform('uTextureSampler', 0);
        },

        afterDraw: function() {
            // override
        },

        _afterDraw: function() {
            this._shader.pop();
            this._viewport.pop();
        },

        draw: function() {
            var self = this;
            var dim = Math.pow(2, this._map.getZoom()) * 256;
            // for each tile
            _.forIn(this._cache, function(cached) {
                if (cached.isPending || !cached.data) {
                    return;
                }
                // bind tile texture to texture unit 0
                cached.data.push(0);
                _.forIn(cached.tiles, function(tile, key) {
                    // find the tiles position from its key
                    var kArr = key.split(':');
                    var x = parseInt(kArr[0], 10);
                    var y = parseInt(kArr[1], 10);
                    // create model matrix
                    var model = new translationMatrix([
                        256 * x,
                        dim - (256 * y),
                        0
                    ]);
                    self._shader.setUniform('uModelMatrix', model);
                    // draw the tile
                    self._renderable.draw();
                });
            // no need to unbind texture
            });
        },

        requestTile: function() {
            // override
        }

    });

    module.exports = WebGL;

}());

},{"esper":12}],50:[function(require,module,exports){
(function() {

    'use strict';

    // canvas renderers
    var Canvas = {
        Heatmap: require('./types/canvas/Heatmap')
    };

    // html renderers
    var HTML = {
        Heatmap: require('./types/html/Heatmap'),
        Ring: require('./types/html/Ring'),
        WordCloud: require('./types/html/WordCloud'),
        WordHistogram: require('./types/html/WordHistogram')
    };

    // webgl renderers
    var WebGL = {
        Heatmap: require('./types/webgl/Heatmap')
    };

    // pending layer renderers
    var Pending = {
        Blink: require('./types/pending/Blink'),
        Spin: require('./types/pending/Spin'),
        BlinkSpin: require('./types/pending/BlinkSpin'),
    };

    // pending layer renderers
    var Debug = {
        Coord: require('./types/debug/Coord')
    };

    module.exports = {
        HTML: HTML,
        Canvas: Canvas,
        WebGL: WebGL,
        Debug: Debug,
        Pending: Pending
    };

}());

},{"./types/canvas/Heatmap":52,"./types/debug/Coord":53,"./types/html/Heatmap":54,"./types/html/Ring":55,"./types/html/WordCloud":56,"./types/html/WordHistogram":57,"./types/pending/Blink":58,"./types/pending/BlinkSpin":59,"./types/pending/Spin":60,"./types/webgl/Heatmap":61}],51:[function(require,module,exports){
(function() {

    'use strict';

    var POSITIVE = '1';
    var NEUTRAL = '0';
    var NEGATIVE = '-1';

    function getClassFunc(min, max) {
        min = min !== undefined ? min : -1;
        max = max !== undefined ? max : 1;
        var positive = [0.25 * max, 0.5 * max, 0.75 * max];
        var negative = [-0.25 * min, -0.5 * min, -0.75 * min];
        return function(sentiment) {
            var prefix;
            var range;
            if (sentiment < 0) {
                prefix = 'neg-';
                range = negative;
            } else {
                prefix = 'pos-';
                range = positive;
            }
            var abs = Math.abs(sentiment);
            if (abs > range[2]) {
                return prefix + '4';
            } else if (abs > range[1]) {
                return prefix + '3';
            } else if (abs > range[0]) {
                return prefix + '2';
            }
            return prefix + '1';
        };
    }

    function getTotal(count) {
        if (!count) {
            return 0;
        }
        var pos = count[POSITIVE] ? count[POSITIVE] : 0;
        var neu = count[NEUTRAL] ? count[NEUTRAL] : 0;
        var neg = count[NEGATIVE] ? count[NEGATIVE] : 0;
        return pos + neu + neg;
    }

    function getAvg(count) {
        if (!count) {
            return 0;
        }
        var pos = count[POSITIVE] ? count[POSITIVE] : 0;
        var neu = count[NEUTRAL] ? count[NEUTRAL] : 0;
        var neg = count[NEGATIVE] ? count[NEGATIVE] : 0;
        var total = pos + neu + neg;
        return (total !== 0) ? (pos - neg) / total : 0;
    }

    module.exports = {
        getClassFunc: getClassFunc,
        getTotal: getTotal,
        getAvg: getAvg
    };

}());

},{}],52:[function(require,module,exports){
(function() {

    'use strict';

    var Canvas = require('../../core/Canvas');

    var Heatmap = Canvas.extend({

        renderCanvas: function(bins, resolution, rampFunc) {
            var canvas = document.createElement('canvas');
            canvas.height = resolution;
            canvas.width = resolution;
            var ctx = canvas.getContext('2d');
            var imageData = ctx.getImageData(0, 0, resolution, resolution);
            var data = imageData.data;
            var self = this;
            var color = [0, 0, 0, 0];
            var nval, rval, bin, i;
            for (i=0; i<bins.length; i++) {
                bin = bins[i];
                if (bin === 0) {
                    color[0] = 0;
                    color[1] = 0;
                    color[2] = 0;
                    color[3] = 0;
                } else {
                    nval = self.transformValue(bin);
                    rval = self.interpolateToRange(nval);
                    rampFunc(rval, color);
                }
                data[i * 4] = color[0];
                data[i * 4 + 1] = color[1];
                data[i * 4 + 2] = color[2];
                data[i * 4 + 3] = color[3];
            }
            ctx.putImageData(imageData, 0, 0);
            return canvas;
        },

        renderTile: function(canvas, data) {
            if (!data) {
                return;
            }
            var bins = new Float64Array(data);
            var resolution = Math.sqrt(bins.length);
            var ramp = this.getColorRamp();
            var tileCanvas = this.renderCanvas(bins, resolution, ramp);
            var ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(
                tileCanvas,
                0, 0,
                resolution, resolution,
                0, 0,
                canvas.width, canvas.height);
        }

    });

    module.exports = Heatmap;

}());

},{"../../core/Canvas":46}],53:[function(require,module,exports){
(function() {

    'use strict';

    module.exports = {

        renderTile: function(elem, coord) {
            $(elem).empty();
            $(elem).append('<div style="top:0; left:0;">' + coord.z + ', ' + coord.x + ', ' + coord.y + '</div>');
        }

    };

}());

},{}],54:[function(require,module,exports){
(function() {

    'use strict';

    var HTML = require('../../core/HTML');

    var TILE_SIZE = 256;

    var Heatmap = HTML.extend({

        isTargetLayer: function( elem ) {
            return this._container && $.contains(this._container, elem );
        },

        clearSelection: function() {
            $(this._container).removeClass('highlight');
            this.highlight = null;
        },

        onMouseOver: function(e) {
            var target = $(e.originalEvent.target);
            var value = target.attr('data-value');
            if (value) {
                if (this.options.handlers.mouseover) {
                    var $parent = target.parents('.leaflet-html-tile');
                    this.options.handlers.mouseover(target, {
                        value: parseInt(value, 10),
                        x: parseInt($parent.attr('data-x'), 10),
                        y: parseInt($parent.attr('data-y'), 10),
                        z: this._map.getZoom(),
                        bx: parseInt(target.attr('data-bx'), 10),
                        by: parseInt(target.attr('data-by'), 10),
                        type: 'heatmap',
                        layer: this
                    });
                }
            }
        },

        onMouseOut: function(e) {
            var target = $(e.originalEvent.target);
            var value = target.attr('data-value');
            if (value) {
                if (this.options.handlers.mouseout) {
                    var $parent = target.parents('.leaflet-html-tile');
                    this.options.handlers.mouseout(target, {
                        value: value,
                        x: parseInt($parent.attr('data-x'), 10),
                        y: parseInt($parent.attr('data-y'), 10),
                        z: this._map.getZoom(),
                        bx: parseInt(target.attr('data-bx'), 10),
                        by: parseInt(target.attr('data-by'), 10),
                        type: 'heatmap',
                        layer: this
                    });
                }
            }
        },

        onClick: function(e) {
            // un-select any prev selected pixel
            $('.heatmap-pixel').removeClass('highlight');
            // get target
            var target = $(e.originalEvent.target);
            if (!this.isTargetLayer(e.originalEvent.target)) {
                // this layer is not the target
                return;
            }
            if ( target.hasClass('heatmap-pixel') ) {
                target.addClass('highlight');
            }
            var value = target.attr('data-value');
            if (value) {
                if (this.options.handlers.click) {
                    var $parent = target.parents('.leaflet-html-tile');
                    this.options.handlers.click(target, {
                        value: value,
                        x: parseInt($parent.attr('data-x'), 10),
                        y: parseInt($parent.attr('data-y'), 10),
                        z: this._map.getZoom(),
                        bx: parseInt(target.attr('data-bx'), 10),
                        by: parseInt(target.attr('data-by'), 10),
                        type: 'heatmap',
                        layer: this
                    });
                }
            }
        },

        renderTile: function(container, data) {
            if (!data) {
                return;
            }
            var bins = new Float64Array(data);
            var resolution = Math.sqrt(bins.length);
            var rampFunc = this.getColorRamp();
            var pixelSize = TILE_SIZE / resolution;
            var self = this;
            var color = [0, 0, 0, 0];
            var html = '';
            var nval, rval, bin;
            var left, top;
            var i;
            for (i=0; i<bins.length; i++) {
                bin = bins[i];
                if (bin === 0) {
                    continue;
                } else {
                    left = (i % resolution);
                    top = Math.floor(i / resolution);
                    nval = self.transformValue(bin);
                    rval = self.interpolateToRange(nval);
                    rampFunc(rval, color);
                }
                var rgba = 'rgba(' +
                    color[0] + ',' +
                    color[1] + ',' +
                    color[2] + ',' +
                    (color[3] / 255) + ')';
                html += '<div class="heatmap-pixel" ' +
                    'data-value="' + bin + '" ' +
                    'data-bx="' + left + '" ' +
                    'data-by="' + top + '" ' +
                    'style="' +
                    'height:' + pixelSize + 'px;' +
                    'width:' + pixelSize + 'px;' +
                    'left:' + (left * pixelSize) + 'px;' +
                    'top:' + (top * pixelSize) + 'px;' +
                    'background-color:' + rgba + ';"></div>';
            }
            container.innerHTML = html;
        }

    });

    module.exports = Heatmap;

}());

},{"../../core/HTML":48}],55:[function(require,module,exports){
(function() {

    'use strict';

    var HTML = require('../../core/HTML');

    var TILE_SIZE = 256;

    var Heatmap = HTML.extend({

        onClick: function(e) {
            var target = $(e.originalEvent.target);
            $('.heatmap-ring').removeClass('highlight');
            if ( target.hasClass('heatmap-ring') ) {
                target.addClass('highlight');
            }
        },

        renderTile: function(container, data) {
            if (!data) {
                return;
            }
            var self = this;
            var bins = new Float64Array(data);
            var resolution = Math.sqrt(bins.length);
            var binSize = (TILE_SIZE / resolution);
            var html = '';
            bins.forEach(function(bin, index) {
                if (!bin) {
                    return;
                }
                var percent = self.transformValue(bin);
                var radius = percent * binSize;
                var offset = (binSize - radius) / 2;
                var left = (index % resolution) * binSize;
                var top = Math.floor(index / resolution) * binSize;
                html += '<div class="heatmap-ring" style="' +
                    'left:' + (left + offset) + 'px;' +
                    'top:' + (top + offset) + 'px;' +
                    'width:' + radius + 'px;' +
                    'height:' + radius + 'px;' +
                    '"></div>';
            });
            container.innerHTML = html;
        }

    });

    module.exports = Heatmap;

}());

},{"../../core/HTML":48}],56:[function(require,module,exports){
(function() {

    'use strict';

    var HTML = require('../../core/HTML');
    var sentiment = require('../../sentiment/Sentiment');
    var sentimentFunc = sentiment.getClassFunc(-1, 1);

    var TILE_SIZE = 256;
    var HALF_SIZE = TILE_SIZE / 2;
    var VERTICAL_OFFSET = 24;
    var HORIZONTAL_OFFSET = 10;
    var MAX_NUM_WORDS = 15;
    var MIN_FONT_SIZE = 10;
    var MAX_FONT_SIZE = 20;
    var NUM_ATTEMPTS = 1;

    /**
     * Given an initial position, return a new position, incrementally spiralled
     * outwards.
     */
    var spiralPosition = function(pos) {
        var pi2 = 2 * Math.PI;
        var circ = pi2 * pos.radius;
        var inc = (pos.arcLength > circ / 10) ? circ / 10 : pos.arcLength;
        var da = inc / pos.radius;
        var nt = (pos.t + da);
        if (nt > pi2) {
            nt = nt % pi2;
            pos.radius = pos.radius + pos.radiusInc;
        }
        pos.t = nt;
        pos.x = pos.radius * Math.cos(nt);
        pos.y = pos.radius * Math.sin(nt);
        return pos;
    };

    /**
     *  Returns true if bounding box a intersects bounding box b
     */
    var intersectTest = function(a, b) {
        return (Math.abs(a.x - b.x) * 2 < (a.width + b.width)) &&
            (Math.abs(a.y - b.y) * 2 < (a.height + b.height));
    };

    /**
     *  Returns true if bounding box a is not fully contained inside bounding box b
     */
    var overlapTest = function(a, b) {
        return (a.x + a.width / 2 > b.x + b.width / 2 ||
            a.x - a.width / 2 < b.x - b.width / 2 ||
            a.y + a.height / 2 > b.y + b.height / 2 ||
            a.y - a.height / 2 < b.y - b.height / 2);
    };

    /**
     * Check if a word intersects another word, or is not fully contained in the
     * tile bounding box
     */
    var intersectWord = function(position, word, cloud, bb) {
        var box = {
            x: position.x,
            y: position.y,
            height: word.height,
            width: word.width
        };
        var i;
        for (i = 0; i < cloud.length; i++) {
            if (intersectTest(box, cloud[i])) {
                return true;
            }
        }
        // make sure it doesn't intersect the border;
        if (overlapTest(box, bb)) {
            // if it hits a border, increment collision count
            // and extend arc length
            position.collisions++;
            position.arcLength = position.radius;
            return true;
        }
        return false;
    };

    var WordCloud = HTML.extend({

        isTargetLayer: function( elem ) {
            return this._container && $.contains(this._container, elem );
        },

        clearSelection: function() {
            $(this._container).removeClass('highlight');
            this.highlight = null;
        },

        onMouseOver: function(e) {
            var target = $(e.originalEvent.target);
            $('.word-cloud-label').removeClass('hover');
            var word = target.attr('data-word');
            if (word) {
                $('.word-cloud-label[data-word=' + word + ']').addClass('hover');
                if (this.options.handlers.mouseover) {
                    var $parent = target.parents('.leaflet-html-tile');
                    this.options.handlers.mouseover(target, {
                        value: word,
                        x: parseInt($parent.attr('data-x'), 10),
                        y: parseInt($parent.attr('data-y'), 10),
                        z: this._map.getZoom(),
                        type: 'word-cloud',
                        layer: this
                    });
                }
            }
        },

        onMouseOut: function(e) {
            var target = $(e.originalEvent.target);
            $('.word-cloud-label').removeClass('hover');
            var word = target.attr('data-word');
            if (word) {
                if (this.options.handlers.mouseout) {
                    var $parent = target.parents('.leaflet-html-tile');
                    this.options.handlers.mouseout(target, {
                        value: word,
                        x: parseInt($parent.attr('data-x'), 10),
                        y: parseInt($parent.attr('data-y'), 10),
                        z: this._map.getZoom(),
                        type: 'word-cloud',
                        layer: this
                    });
                }
            }
        },

        onClick: function(e) {
            // un-select any prev selected words
            $('.word-cloud-label').removeClass('highlight');
            $(this._container).removeClass('highlight');
            // get target
            var target = $(e.originalEvent.target);
            if (!this.isTargetLayer(e.originalEvent.target)) {
                // this layer is not the target
                return;
            }
            var word = target.attr('data-word');
            if (word) {
                $(this._container).addClass('highlight');
                $('.word-cloud-label[data-word=' + word + ']').addClass('highlight');
                this.highlight = word;
                if (this.options.handlers.click) {
                    var $parent = target.parents('.leaflet-html-tile');
                    this.options.handlers.click(target, {
                        value: word,
                        x: parseInt($parent.attr('data-x'), 10),
                        y: parseInt($parent.attr('data-y'), 10),
                        z: this._map.getZoom(),
                        type: 'word-cloud',
                        layer: this
                    });
                }
            } else {
                this.clearSelection();
            }
        },

        _measureWords: function(wordCounts) {
            // sort words by frequency
            wordCounts = wordCounts.sort(function(a, b) {
                return b.count - a.count;
            }).slice(0, MAX_NUM_WORDS);
            // build measurement html
            var html = '<div style="height:256px; width:256px;">';
            var self = this;
            wordCounts.forEach(function(word) {
                word.percent = self.transformValue(word.count);
                word.fontSize = MIN_FONT_SIZE + word.percent * (MAX_FONT_SIZE - MIN_FONT_SIZE);
                html += '<div class="word-cloud-label" style="' +
                    'visibility:hidden;' +
                    'font-size:' + word.fontSize + 'px;">' + word.text + '</div>';
            });
            html += '</div>';
            // append measurements
            var $temp = $(html);
            $('body').append($temp);
            $temp.children().each(function(index) {
                wordCounts[index].width = this.offsetWidth;
                wordCounts[index].height = this.offsetHeight;
            });
            $temp.remove();
            return wordCounts;
        },

        _createWordCloud: function(wordCounts) {
            var boundingBox = {
                width: TILE_SIZE - HORIZONTAL_OFFSET * 2,
                height: TILE_SIZE - VERTICAL_OFFSET * 2,
                x: 0,
                y: 0
            };
            var cloud = [];
            // sort words by frequency
            wordCounts = this._measureWords(wordCounts);
            // assemble word cloud
            wordCounts.forEach(function(wordCount) {
                // starting spiral position
                var pos = {
                    radius: 1,
                    radiusInc: 5,
                    arcLength: 10,
                    x: 0,
                    y: 0,
                    t: 0,
                    collisions: 0
                };
                // spiral outwards to find position
                while (pos.collisions < NUM_ATTEMPTS) {
                    // increment position in a spiral
                    pos = spiralPosition(pos);
                    // test for intersection
                    if (!intersectWord(pos, wordCount, cloud, boundingBox)) {
                        cloud.push({
                            text: wordCount.text,
                            fontSize: wordCount.fontSize,
                            percent: Math.round((wordCount.percent * 100) / 10) * 10, // round to nearest 10
                            x: pos.x,
                            y: pos.y,
                            width: wordCount.width,
                            height: wordCount.height,
                            sentiment: wordCount.sentiment,
                            avg: wordCount.avg
                        });
                        break;
                    }
                }
            });
            return cloud;
        },

        extractExtrema: function(data) {
            var sums = _.map(data, function(count) {
                if (_.isNumber(count)) {
                    return count;
                }
                return sentiment.getTotal(count);
            });
            return {
                min: _.min(sums),
                max: _.max(sums),
            };
        },

        renderTile: function(container, data) {
            if (!data || _.isEmpty(data)) {
                return;
            }
            var highlight = this.highlight;
            var wordCounts = _.map(data, function(count, key) {
                if (_.isNumber(count)) {
                    return {
                        count: count,
                        text: key
                    };
                }
                var total = sentiment.getTotal(count);
                var avg = sentiment.getAvg(count);
                return {
                    count: total,
                    text: key,
                    avg: avg,
                    sentiment: sentimentFunc(avg)
                };
            });
            // exit early if no words
            if (wordCounts.length === 0) {
                return;
            }
            // genereate the cloud
            var cloud = this._createWordCloud(wordCounts);
            // build html elements
            var html = '';
            cloud.forEach(function(word) {
                // create classes
                var classNames = [
                    'word-cloud-label',
                    'word-cloud-label-' + word.percent,
                    word.text === highlight ? 'highlight' : '',
                    word.sentiment ? word.sentiment : ''
                ].join(' ');
                // create styles
                var styles = [
                    'font-size:' + word.fontSize + 'px',
                    'left:' + (HALF_SIZE + word.x - (word.width / 2)) + 'px',
                    'top:' + (HALF_SIZE + word.y - (word.height / 2)) + 'px',
                    'width:' + word.width + 'px',
                    'height:' + word.height + 'px',
                ].join(';');
                // create html for entry
                html += '<div class="' + classNames + '"' +
                    'style="' + styles + '"' +
                    'data-sentiment="' + word.avg + '"' +
                    'data-word="' + word.text + '">' +
                    word.text +
                    '</div>';
            });
            container.innerHTML = html;
        }

    });

    module.exports = WordCloud;

}());

},{"../../core/HTML":48,"../../sentiment/Sentiment":51}],57:[function(require,module,exports){
(function() {

    'use strict';

    var HTML = require('../../core/HTML');
    var sentiment = require('../../sentiment/Sentiment');
    var sentimentFunc = sentiment.getClassFunc(-1, 1);

    var TILE_SIZE = 256;
    var HALF_SIZE = TILE_SIZE / 2;
    var MAX_NUM_WORDS = 8;
    var MIN_FONT_SIZE = 16;
    var MAX_FONT_SIZE = 22;

    var isSingleValue = function(count) {
        // single values are never null, and always numbers
        return count !== null && _.isNumber(count);
    };

    var extractCount = function(count) {
        if (isSingleValue(count)) {
            return count;
        }
        return sentiment.getTotal(count);
    };

    var extractSentimentClass = function(avg) {
        if (avg !== undefined) {
            return sentimentFunc(avg);
        }
        return '';
    };

    var extractFrequency = function(count) {
        if (isSingleValue(count)) {
            return {
                count: count
            };
        }
        return {
            count: sentiment.getTotal(count),
            avg: sentiment.getAvg(count)
        };
    };

    var extractAvg = function(frequencies) {
        if (frequencies[0].avg === undefined) {
            return;
        }
        var sum = _.sumBy(frequencies, function(frequency) {
            return frequency.avg;
        });
        return sum / frequencies.length;
    };

    var extractValues = function(data, key) {
        var frequencies = _.map(data, extractFrequency);
        var avg = extractAvg(frequencies);
        var max = _.maxBy(frequencies, function(val) {
            return val.count;
        }).count;
        var total = _.sumBy(frequencies, function(val) {
            return val.count;
        });
        return {
            topic: key,
            frequencies: frequencies,
            max: max,
            total: total,
            avg: avg
        };
    };

    var WordHistogram = HTML.extend({

        isTargetLayer: function( elem ) {
            return this._container && $.contains(this._container, elem );
        },

        clearSelection: function() {
            $(this._container).removeClass('highlight');
            this.highlight = null;
        },

        onMouseOver: function(e) {
            var target = $(e.originalEvent.target);
            $('.word-histogram-entry').removeClass('hover');
            var word = target.attr('data-word');
            if (word) {
                $('.word-histogram-entry[data-word=' + word + ']').addClass('hover');
                if (this.options.handlers.mouseover) {
                    var $parent = target.parents('.leaflet-html-tile');
                    this.options.handlers.mouseover(target, {
                        value: word,
                        x: parseInt($parent.attr('data-x'), 10),
                        y: parseInt($parent.attr('data-y'), 10),
                        z: this._map.getZoom(),
                        type: 'word-histogram',
                        layer: this
                    });
                }
            }
        },

        onMouseOut: function(e) {
            var target = $(e.originalEvent.target);
            $('.word-histogram-entry').removeClass('hover');
            var word = target.attr('data-word');
            if (word) {
                if (this.options.handlers.mouseout) {
                    var $parent = target.parents('.leaflet-html-tile');
                    this.options.handlers.mouseout(target, {
                        value: word,
                        x: parseInt($parent.attr('data-x'), 10),
                        y: parseInt($parent.attr('data-y'), 10),
                        z: this._map.getZoom(),
                        type: 'word-histogram',
                        layer: this
                    });
                }
            }
        },

        onClick: function(e) {
            // un-select and prev selected histogram
            $('.word-histogram-entry').removeClass('highlight');
            $(this._container).removeClass('highlight');
            // get target
            var target = $(e.originalEvent.target);
            if (!this.isTargetLayer(e.originalEvent.target)) {
                // this layer is not the target
                return;
            }
            var word = target.attr('data-word');
            if (word) {
                $(this._container).addClass('highlight');
                $('.word-histogram-entry[data-word=' + word + ']').addClass('highlight');
                this.highlight = word;
                if (this.options.handlers.click) {
                    var $parent = target.parents('.leaflet-html-tile');
                    this.options.handlers.click(target, {
                        value: word,
                        x: parseInt($parent.attr('data-x'), 10),
                        y: parseInt($parent.attr('data-y'), 10),
                        z: this._map.getZoom(),
                        type: 'word-histogram',
                        layer: this
                    });
                }
            } else {
                this.clearSelection();
            }
        },

        extractExtrema: function(data) {
            var sums = _.map(data, function(counts) {
                return _.sumBy(counts, extractCount);
            });
            return {
                min: _.min(sums),
                max: _.max(sums),
            };
        },

        renderTile: function(container, data) {
            if (!data || _.isEmpty(data)) {
                return;
            }
            var highlight = this.highlight;
            // convert object to array
            var values = _.map(data, extractValues).sort(function(a, b) {
                return b.total - a.total;
            });
            // get number of entries
            var numEntries = Math.min(values.length, MAX_NUM_WORDS);
            var $html = $('<div class="word-histograms" style="display:inline-block;"></div>');
            var totalHeight = 0;
            var self = this;
            values.slice(0, numEntries).forEach(function(value) {
                var topic = value.topic;
                var frequencies = value.frequencies;
                var max = value.max;
                var total = value.total;
                var avg = value.avg;
                var sentimentClass = extractSentimentClass(avg);
                var highlightClass = (topic === highlight) ? 'highlight' : '';
                // scale the height based on level min / max
                var percent = self.transformValue(total);
                var percentLabel = Math.round((percent * 100) / 10) * 10;
                var height = MIN_FONT_SIZE + percent * (MAX_FONT_SIZE - MIN_FONT_SIZE);
                totalHeight += height;
                // create container 'entry' for chart and hashtag
                var $entry = $('<div class="word-histogram-entry ' + highlightClass + '" ' +
                    'data-sentiment="' + avg + '"' +
                    'data-word="' + topic + '"' +
                    'style="' +
                    'height:' + height + 'px;"></div>');
                // create chart
                var $chart = $('<div class="word-histogram-left"' +
                    'data-sentiment="' + avg + '"' +
                    'data-word="' + topic + '"' +
                    '></div>');
                var barWidth = 'calc(' + (100 / frequencies.length) + '%)';
                // create bars
                frequencies.forEach(function(frequency) {
                    var count = frequency.count;
                    var avg = frequency.avg;
                    var sentimentClass = extractSentimentClass(avg);
                    // get the percent relative to the highest count in the tile
                    var relativePercent = (max !== 0) ? (count / max) * 100 : 0;
                    // make invisible if zero count
                    var visibility = relativePercent === 0 ? 'hidden' : '';
                    // Get the style class of the bar
                    var percentLabel = Math.round(relativePercent / 10) * 10;
                    var barClasses = [
                        'word-histogram-bar',
                        'word-histogram-bar-' + percentLabel,
                        sentimentClass + '-fill'
                    ].join(' ');
                    var barHeight;
                    var barTop;
                    // ensure there is at least a single pixel of color
                    if ((relativePercent / 100) * height < 3) {
                        barHeight = '3px';
                        barTop = 'calc(100% - 3px)';
                    } else {
                        barHeight = relativePercent + '%';
                        barTop = (100 - relativePercent) + '%';
                    }
                    // create bar
                    $chart.append('<div class="' + barClasses + '"' +
                        'data-word="' + topic + '"' +
                        'style="' +
                        'visibility:' + visibility + ';' +
                        'width:' + barWidth + ';' +
                        'height:' + barHeight + ';' +
                        'top:' + barTop + ';"></div>');
                });
                $entry.append($chart);
                var topicClasses = [
                    'word-histogram-label',
                    'word-histogram-label-' + percentLabel,
                    sentimentClass
                ].join(' ');
                // create tag label
                var $topic = $('<div class="word-histogram-right">' +
                    '<div class="' + topicClasses + '"' +
                    'data-sentiment="' + avg + '"' +
                    'data-word="' + topic + '"' +
                    'style="' +
                    'font-size:' + height + 'px;' +
                    'line-height:' + height + 'px;' +
                    'height:' + height + 'px">' + topic + '</div>' +
                    '</div>');
                $entry.append($topic);
                $html.append($entry);
            });
            $html.css('top', HALF_SIZE - (totalHeight / 2));
            container.innerHTML = $html[0].outerHTML;
        }
    });

    module.exports = WordHistogram;

}());

},{"../../core/HTML":48,"../../sentiment/Sentiment":51}],58:[function(require,module,exports){
(function() {

    'use strict';

    module.exports = {

        renderTile: function(elem) {
            elem.innerHtml = '<div class="blinking blinking-tile" style="animation-delay:' + -(Math.random() * 1200) + 'ms;"></div>';
        }

    };

}());

},{}],59:[function(require,module,exports){
(function() {

    'use strict';

    var DELAY = 1200;

    module.exports = {

        renderTile: function(elem) {
            var delay = -(Math.random() * DELAY) + 'ms';
            elem.innerHTML =
                '<div class="vertical-centered-box blinking" style="animation-delay:' + delay + '">' +
                    '<div class="content">' +
                        '<div class="loader-circle"></div>' +
                        '<div class="loader-line-mask" style="animation-delay:' + delay + '">' +
                            '<div class="loader-line"></div>' +
                        '</div>' +
                    '</div>' +
                '</div>';
        }

    };

}());

},{}],60:[function(require,module,exports){
(function() {

    'use strict';

    var DELAY = 1200;

    module.exports = {

        renderTile: function(elem) {
            var delay = -(Math.random() * DELAY) + 'ms';
            elem.innerHTML =
                '<div class="vertical-centered-box" style="animation-delay:' + delay + '">' +
                    '<div class="content">' +
                        '<div class="loader-circle"></div>' +
                        '<div class="loader-line-mask" style="animation-delay:' + delay + '">' +
                            '<div class="loader-line"></div>' +
                        '</div>' +
                    '</div>' +
                '</div>';
        }

    };

}());

},{}],61:[function(require,module,exports){
(function() {

    'use strict';

    var WebGL = require('../../core/WebGL');

    // TODO:
    //     - update to preceptual color ramps (layer is currently broken)

    var Heatmap = WebGL.extend({

        options: {
            shaders: {
                vert: '../../shaders/heatmap.vert',
                frag: '../../shaders/heatmap.frag',
            }
        },

        beforeDraw: function() {
            var ramp = this.getColorRamp();
            var color = [0, 0, 0, 0];
            this._shader.setUniform('uMin', this.getExtrema().min);
            this._shader.setUniform('uMax', this.getExtrema().max);
            this._shader.setUniform('uColorRampFrom', ramp(0.0, color));
            this._shader.setUniform('uColorRampTo', ramp(1.0, color));
        }

    });

    module.exports = Heatmap;

}());

},{"../../core/WebGL":49}],62:[function(require,module,exports){
(function() {

    'use strict';

    var Requestor = require('./Requestor');

    function MetaRequestor() {
        Requestor.apply(this, arguments);
    }

    MetaRequestor.prototype = Object.create(Requestor.prototype);

    MetaRequestor.prototype.getHash = function(req) {
        return req.type + '-' +
            req.index + '-' +
            req.store;
    };

    MetaRequestor.prototype.getURL = function(res) {
        return 'meta/' +
            res.type + '/' +
            res.endpoint + '/' +
            res.index + '/' +
            res.store;
    };

    module.exports = MetaRequestor;

}());

},{"./Requestor":63}],63:[function(require,module,exports){
(function() {

    'use strict';

    var retryInterval = 5000;

    function getHost() {
        var loc = window.location;
        var new_uri;
        if (loc.protocol === 'https:') {
            new_uri = 'wss:';
        } else {
            new_uri = 'ws:';
        }
        return new_uri + '//' + loc.host + loc.pathname;
    }

    function establishConnection(requestor, callback) {
        requestor.socket = new WebSocket(getHost() + requestor.url);
        // on open
        requestor.socket.onopen = function() {
            requestor.isOpen = true;
            console.log('Websocket connection established');
            callback.apply(this, arguments);
        };
        // on message
        requestor.socket.onmessage = function(event) {
            var res = JSON.parse(event.data);
            var hash = requestor.getHash(res);
            var request = requestor.requests[hash];
            delete requestor.requests[hash];
            if (res.success) {
                request.resolve(requestor.getURL(res), res);
            } else {
                request.reject(res);
            }
        };
        // on close
        requestor.socket.onclose = function() {
            // log close only if connection was ever open
            if (requestor.isOpen) {
                console.warn('Websocket connection closed');
            }
            requestor.socket = null;
            requestor.isOpen = false;
            // reject all pending requests
            Object.keys(requestor.requests).forEach(function(key) {
                requestor.requests[key].reject();
            });
            // clear request map
            requestor.requests = {};
            // attempt to re-establish connection
            setTimeout(function() {
                establishConnection(requestor, function() {
                    // once connection is re-established, send pending requests
                    requestor.pending.forEach(function(req) {
                        requestor.get(req);
                    });
                    requestor.pending = [];
                });
            }, retryInterval);
        };
    }

    function Requestor(url, callback) {
        this.url = url;
        this.requests = {};
        this.pending = [];
        this.isOpen = false;
        establishConnection(this, callback);
    }

    Requestor.prototype.getHash = function( /*req*/ ) {
        // override
    };

    Requestor.prototype.getURL = function( /*res*/ ) {
        // override
    };

    Requestor.prototype.get = function(req) {
        if (!this.isOpen) {
            // if no connection, add request to pending queue
            this.pending.push(req);
            return;
        }
        var hash = this.getHash(req);
        var request = this.requests[hash];
        if (request) {
            return request.promise();
        }
        request = this.requests[hash] = $.Deferred();
        this.socket.send(JSON.stringify(req));
        return request.promise();
    };

    Requestor.prototype.close = function() {
        this.socket.onclose = null;
        this.socket.close();
        this.socket = null;
    };

    module.exports = Requestor;

}());

},{}],64:[function(require,module,exports){
(function() {

    'use strict';

    var stringify = require('json-stable-stringify');
    var Requestor = require('./Requestor');

    function pruneEmpty(obj) {
        return function prune(current) {
            _.forOwn(current, function(value, key) {
              if (_.isUndefined(value) || _.isNull(value) || _.isNaN(value) ||
                (_.isString(value) && _.isEmpty(value)) ||
                (_.isObject(value) && _.isEmpty(prune(value)))) {
                delete current[key];
              }
            });
            // remove any leftover undefined values from the delete
            // operation on an array
            if (_.isArray(current)) {
                _.pull(current, undefined);
            }
            return current;
        }(_.cloneDeep(obj)); // do not modify the original object, create a clone instead
    }

    function TileRequestor() {
        Requestor.apply(this, arguments);
    }

    TileRequestor.prototype = Object.create(Requestor.prototype);

    TileRequestor.prototype.getHash = function(req) {
        var coord = req.coord;
        var hash = stringify(pruneEmpty(req.params));
        return req.type + '-' +
            req.index + '-' +
            req.store + '-' +
            coord.x + '-' +
            coord.y + '-' +
            coord.z + '-' +
            hash;
    };

    TileRequestor.prototype.getURL = function(res) {
        var coord = res.coord;
        return 'tile/' +
            res.type + '/' +
            res.index + '/' +
            res.store + '/' +
            coord.z + '/' +
            coord.x + '/' +
            coord.y;
    };

    module.exports = TileRequestor;

}());

},{"./Requestor":63,"json-stable-stringify":16}]},{},[21])(21)
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvZXNwZXIvc3JjL2NvcmUvSW5kZXhCdWZmZXIuanMiLCJub2RlX21vZHVsZXMvZXNwZXIvc3JjL2NvcmUvUmVuZGVyVGFyZ2V0LmpzIiwibm9kZV9tb2R1bGVzL2VzcGVyL3NyYy9jb3JlL1JlbmRlcmFibGUuanMiLCJub2RlX21vZHVsZXMvZXNwZXIvc3JjL2NvcmUvU2hhZGVyLmpzIiwibm9kZV9tb2R1bGVzL2VzcGVyL3NyYy9jb3JlL1NoYWRlclBhcnNlci5qcyIsIm5vZGVfbW9kdWxlcy9lc3Blci9zcmMvY29yZS9UZXh0dXJlMkQuanMiLCJub2RlX21vZHVsZXMvZXNwZXIvc3JjL2NvcmUvVGV4dHVyZUN1YmVNYXAuanMiLCJub2RlX21vZHVsZXMvZXNwZXIvc3JjL2NvcmUvVmVydGV4QnVmZmVyLmpzIiwibm9kZV9tb2R1bGVzL2VzcGVyL3NyYy9jb3JlL1ZlcnRleFBhY2thZ2UuanMiLCJub2RlX21vZHVsZXMvZXNwZXIvc3JjL2NvcmUvVmlld3BvcnQuanMiLCJub2RlX21vZHVsZXMvZXNwZXIvc3JjL2NvcmUvV2ViR0xDb250ZXh0LmpzIiwibm9kZV9tb2R1bGVzL2VzcGVyL3NyYy9leHBvcnRzLmpzIiwibm9kZV9tb2R1bGVzL2VzcGVyL3NyYy91dGlsL1N0YWNrLmpzIiwibm9kZV9tb2R1bGVzL2VzcGVyL3NyYy91dGlsL1V0aWwuanMiLCJub2RlX21vZHVsZXMvZXNwZXIvc3JjL3V0aWwvWEhSTG9hZGVyLmpzIiwibm9kZV9tb2R1bGVzL2pzb24tc3RhYmxlLXN0cmluZ2lmeS9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9qc29uaWZ5L2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2pzb25pZnkvbGliL3BhcnNlLmpzIiwibm9kZV9tb2R1bGVzL2pzb25pZnkvbGliL3N0cmluZ2lmeS5qcyIsIm5vZGVfbW9kdWxlcy9zaW1wbHktZGVmZXJyZWQvZGVmZXJyZWQuanMiLCJzY3JpcHRzL2V4cG9ydHMuanMiLCJzY3JpcHRzL2xheWVyL2NvcmUvRGVidWcuanMiLCJzY3JpcHRzL2xheWVyL2NvcmUvSW1hZ2UuanMiLCJzY3JpcHRzL2xheWVyL2NvcmUvTGl2ZS5qcyIsInNjcmlwdHMvbGF5ZXIvY29yZS9QZW5kaW5nLmpzIiwic2NyaXB0cy9sYXllci9leHBvcnRzLmpzIiwic2NyaXB0cy9sYXllci9taXhpbnMvQ29sb3JSYW1wLmpzIiwic2NyaXB0cy9sYXllci9taXhpbnMvVmFsdWVUcmFuc2Zvcm0uanMiLCJzY3JpcHRzL2xheWVyL3BhcmFtcy9CaW5uaW5nLmpzIiwic2NyaXB0cy9sYXllci9wYXJhbXMvQm9vbFF1ZXJ5LmpzIiwic2NyaXB0cy9sYXllci9wYXJhbXMvRGF0ZUhpc3RvZ3JhbS5qcyIsInNjcmlwdHMvbGF5ZXIvcGFyYW1zL0hpc3RvZ3JhbS5qcyIsInNjcmlwdHMvbGF5ZXIvcGFyYW1zL01ldHJpY0FnZy5qcyIsInNjcmlwdHMvbGF5ZXIvcGFyYW1zL1ByZWZpeEZpbHRlci5qcyIsInNjcmlwdHMvbGF5ZXIvcGFyYW1zL1F1ZXJ5U3RyaW5nLmpzIiwic2NyaXB0cy9sYXllci9wYXJhbXMvUmFuZ2UuanMiLCJzY3JpcHRzL2xheWVyL3BhcmFtcy9UZXJtc0FnZy5qcyIsInNjcmlwdHMvbGF5ZXIvcGFyYW1zL1Rlcm1zRmlsdGVyLmpzIiwic2NyaXB0cy9sYXllci9wYXJhbXMvVGlsaW5nLmpzIiwic2NyaXB0cy9sYXllci9wYXJhbXMvVG9wVGVybXMuanMiLCJzY3JpcHRzL2xheWVyL3R5cGVzL0hlYXRtYXAuanMiLCJzY3JpcHRzL2xheWVyL3R5cGVzL1RvcENvdW50LmpzIiwic2NyaXB0cy9sYXllci90eXBlcy9Ub3BGcmVxdWVuY3kuanMiLCJzY3JpcHRzL2xheWVyL3R5cGVzL1RvcGljQ291bnQuanMiLCJzY3JpcHRzL2xheWVyL3R5cGVzL1RvcGljRnJlcXVlbmN5LmpzIiwic2NyaXB0cy9yZW5kZXJlci9jb3JlL0NhbnZhcy5qcyIsInNjcmlwdHMvcmVuZGVyZXIvY29yZS9ET00uanMiLCJzY3JpcHRzL3JlbmRlcmVyL2NvcmUvSFRNTC5qcyIsInNjcmlwdHMvcmVuZGVyZXIvY29yZS9XZWJHTC5qcyIsInNjcmlwdHMvcmVuZGVyZXIvZXhwb3J0cy5qcyIsInNjcmlwdHMvcmVuZGVyZXIvc2VudGltZW50L1NlbnRpbWVudC5qcyIsInNjcmlwdHMvcmVuZGVyZXIvdHlwZXMvY2FudmFzL0hlYXRtYXAuanMiLCJzY3JpcHRzL3JlbmRlcmVyL3R5cGVzL2RlYnVnL0Nvb3JkLmpzIiwic2NyaXB0cy9yZW5kZXJlci90eXBlcy9odG1sL0hlYXRtYXAuanMiLCJzY3JpcHRzL3JlbmRlcmVyL3R5cGVzL2h0bWwvUmluZy5qcyIsInNjcmlwdHMvcmVuZGVyZXIvdHlwZXMvaHRtbC9Xb3JkQ2xvdWQuanMiLCJzY3JpcHRzL3JlbmRlcmVyL3R5cGVzL2h0bWwvV29yZEhpc3RvZ3JhbS5qcyIsInNjcmlwdHMvcmVuZGVyZXIvdHlwZXMvcGVuZGluZy9CbGluay5qcyIsInNjcmlwdHMvcmVuZGVyZXIvdHlwZXMvcGVuZGluZy9CbGlua1NwaW4uanMiLCJzY3JpcHRzL3JlbmRlcmVyL3R5cGVzL3BlbmRpbmcvU3Bpbi5qcyIsInNjcmlwdHMvcmVuZGVyZXIvdHlwZXMvd2ViZ2wvSGVhdG1hcC5qcyIsInNjcmlwdHMvcmVxdWVzdC9NZXRhUmVxdWVzdG9yLmpzIiwic2NyaXB0cy9yZXF1ZXN0L1JlcXVlc3Rvci5qcyIsInNjcmlwdHMvcmVxdWVzdC9UaWxlUmVxdWVzdG9yLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbGJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdFFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9UQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxT0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDelFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEZBO0FBQ0E7QUFDQTs7QUNGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdRQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0TkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1SEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2h0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pRQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIoZnVuY3Rpb24gKCkge1xyXG5cclxuICAgICd1c2Ugc3RyaWN0JztcclxuXHJcbiAgICB2YXIgV2ViR0xDb250ZXh0ID0gcmVxdWlyZSgnLi9XZWJHTENvbnRleHQnKSxcclxuICAgICAgICBfYm91bmRCdWZmZXIgPSBudWxsO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogSW5zdGFudGlhdGVzIGFuIEluZGV4QnVmZmVyIG9iamVjdC5cclxuICAgICAqIEBjbGFzcyBJbmRleEJ1ZmZlclxyXG4gICAgICogQGNsYXNzZGVzYyBBbiBpbmRleCBidWZmZXIgb2JqZWN0LlxyXG4gICAgICovXHJcbiAgICBmdW5jdGlvbiBJbmRleEJ1ZmZlciggYXJnLCBvcHRpb25zICkge1xyXG4gICAgICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xyXG4gICAgICAgIHRoaXMuZ2wgPSBXZWJHTENvbnRleHQuZ2V0KCk7XHJcbiAgICAgICAgdGhpcy5idWZmZXIgPSAwO1xyXG4gICAgICAgIGlmICggYXJnICkge1xyXG4gICAgICAgICAgICBpZiAoIGFyZyBpbnN0YW5jZW9mIFdlYkdMQnVmZmVyICkge1xyXG4gICAgICAgICAgICAgICAgLy8gaWYgdGhlIGFyZ3VtZW50IGlzIGFscmVhZHkgYSB3ZWJnbGJ1ZmZlciwgc2ltcGx5IHdyYXAgaXRcclxuICAgICAgICAgICAgICAgIHRoaXMuYnVmZmVyID0gYXJnO1xyXG4gICAgICAgICAgICAgICAgdGhpcy50eXBlID0gb3B0aW9ucy50eXBlIHx8ICdVTlNJR05FRF9TSE9SVCc7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNvdW50ID0gKCBvcHRpb25zLmNvdW50ICE9PSB1bmRlZmluZWQgKSA/IG9wdGlvbnMuY291bnQgOiAwO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgLy8gb3RoZXJ3aXNlLCBidWZmZXIgaXRcclxuICAgICAgICAgICAgICAgIHRoaXMuYnVmZmVyRGF0YSggYXJnICk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5vZmZzZXQgPSAoIG9wdGlvbnMub2Zmc2V0ICE9PSB1bmRlZmluZWQgKSA/IG9wdGlvbnMub2Zmc2V0IDogMDtcclxuICAgICAgICB0aGlzLm1vZGUgPSAoIG9wdGlvbnMubW9kZSAhPT0gdW5kZWZpbmVkICkgPyBvcHRpb25zLm1vZGUgOiAnVFJJQU5HTEVTJztcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIFVwbG9hZCBpbmRleCBkYXRhIHRvIHRoZSBHUFUuXHJcbiAgICAgKiBAbWVtYmVyb2YgSW5kZXhCdWZmZXJcclxuICAgICAqXHJcbiAgICAgKiBAcGFyYW0ge0FycmF5fFVpbnQxNkFycmF5fFVpbnQzMkFycmF5fSBhcmcgLSBUaGUgYXJyYXkgb2YgZGF0YSB0byBidWZmZXIuXHJcbiAgICAgKlxyXG4gICAgICogQHJldHVybnMge0luZGV4QnVmZmVyfSBUaGUgaW5kZXggYnVmZmVyIG9iamVjdCBmb3IgY2hhaW5pbmcuXHJcbiAgICAgKi9cclxuICAgIEluZGV4QnVmZmVyLnByb3RvdHlwZS5idWZmZXJEYXRhID0gZnVuY3Rpb24oIGFyZyApIHtcclxuICAgICAgICB2YXIgZ2wgPSB0aGlzLmdsO1xyXG4gICAgICAgIC8vIGNoZWNrIGZvciB0eXBlIHN1cHBvcnRcclxuICAgICAgICB2YXIgdWludDMyc3VwcG9ydCA9IFdlYkdMQ29udGV4dC5jaGVja0V4dGVuc2lvbiggJ09FU19lbGVtZW50X2luZGV4X3VpbnQnICk7XHJcbiAgICAgICAgaWYoICF1aW50MzJzdXBwb3J0ICkge1xyXG4gICAgICAgICAgICAvLyBubyBzdXBwb3J0IGZvciB1aW50MzJcclxuICAgICAgICAgICAgaWYgKCBhcmcgaW5zdGFuY2VvZiBBcnJheSApIHtcclxuICAgICAgICAgICAgICAgIC8vIGlmIGFycmF5LCBidWZmZXIgdG8gdWludDE2XHJcbiAgICAgICAgICAgICAgICBhcmcgPSBuZXcgVWludDE2QXJyYXkoIGFyZyApO1xyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKCBhcmcgaW5zdGFuY2VvZiBVaW50MzJBcnJheSApIHtcclxuICAgICAgICAgICAgICAgIC8vIGlmIHVpbnQzMiwgZG93bmdyYWRlIHRvIHVpbnQxNlxyXG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKCAnQ2Fubm90IGNyZWF0ZSBJbmRleEJ1ZmZlciBvZiBmb3JtYXQgJyArXHJcbiAgICAgICAgICAgICAgICAgICAgJ2dsLlVOU0lHTkVEX0lOVCBhcyBPRVNfZWxlbWVudF9pbmRleF91aW50IGlzIG5vdCAnICtcclxuICAgICAgICAgICAgICAgICAgICAnc3VwcG9ydGVkLCBkZWZhdWx0aW5nIHRvIGdsLlVOU0lHTkVEX1NIT1JULicgKTtcclxuICAgICAgICAgICAgICAgIGFyZyA9IG5ldyBVaW50MTZBcnJheSggYXJnICk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAvLyB1aW50MzIgaXMgc3VwcG9ydGVkXHJcbiAgICAgICAgICAgIGlmICggYXJnIGluc3RhbmNlb2YgQXJyYXkgKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBpZiBhcnJheSwgYnVmZmVyIHRvIHVpbnQzMlxyXG4gICAgICAgICAgICAgICAgYXJnID0gbmV3IFVpbnQzMkFycmF5KCBhcmcgKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICAvLyBzZXQgZGF0YSB0eXBlIGJhc2VkIG9uIGFycmF5XHJcbiAgICAgICAgaWYgKCBhcmcgaW5zdGFuY2VvZiBVaW50MTZBcnJheSApIHtcclxuICAgICAgICAgICAgdGhpcy50eXBlID0gJ1VOU0lHTkVEX1NIT1JUJztcclxuICAgICAgICB9IGVsc2UgaWYgKCBhcmcgaW5zdGFuY2VvZiBVaW50MzJBcnJheSApIHtcclxuICAgICAgICAgICAgdGhpcy50eXBlID0gJ1VOU0lHTkVEX0lOVCc7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgY29uc29sZS5lcnJvciggJ0luZGV4QnVmZmVyIHJlcXVpcmVzIGFuIEFycmF5IG9yICcgK1xyXG4gICAgICAgICAgICAgICAgJ0FycmF5QnVmZmVyIGFyZ3VtZW50LCBjb21tYW5kIGlnbm9yZWQuJyApO1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vIGNyZWF0ZSBidWZmZXIsIHN0b3JlIGNvdW50XHJcbiAgICAgICAgaWYgKCAhdGhpcy5idWZmZXIgKSB7XHJcbiAgICAgICAgICAgIHRoaXMuYnVmZmVyID0gZ2wuY3JlYXRlQnVmZmVyKCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMuY291bnQgPSBhcmcubGVuZ3RoO1xyXG4gICAgICAgIGdsLmJpbmRCdWZmZXIoIGdsLkVMRU1FTlRfQVJSQVlfQlVGRkVSLCB0aGlzLmJ1ZmZlciApO1xyXG4gICAgICAgIGdsLmJ1ZmZlckRhdGEoIGdsLkVMRU1FTlRfQVJSQVlfQlVGRkVSLCBhcmcsIGdsLlNUQVRJQ19EUkFXICk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9O1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogQmluZHMgdGhlIGluZGV4IGJ1ZmZlciBvYmplY3QuXHJcbiAgICAgKiBAbWVtYmVyb2YgSW5kZXhCdWZmZXJcclxuICAgICAqXHJcbiAgICAgKiBAcmV0dXJucyB7SW5kZXhCdWZmZXJ9IFJldHVybnMgdGhlIGluZGV4IGJ1ZmZlciBvYmplY3QgZm9yIGNoYWluaW5nLlxyXG4gICAgICovXHJcbiAgICBJbmRleEJ1ZmZlci5wcm90b3R5cGUuYmluZCA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIC8vIGlmIHRoaXMgYnVmZmVyIGlzIGFscmVhZHkgYm91bmQsIGV4aXQgZWFybHlcclxuICAgICAgICBpZiAoIF9ib3VuZEJ1ZmZlciA9PT0gdGhpcyApIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgZ2wgPSB0aGlzLmdsO1xyXG4gICAgICAgIGdsLmJpbmRCdWZmZXIoIGdsLkVMRU1FTlRfQVJSQVlfQlVGRkVSLCB0aGlzLmJ1ZmZlciApO1xyXG4gICAgICAgIF9ib3VuZEJ1ZmZlciA9IHRoaXM7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9O1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogVW5iaW5kcyB0aGUgaW5kZXggYnVmZmVyIG9iamVjdC5cclxuICAgICAqIEBtZW1iZXJvZiBJbmRleEJ1ZmZlclxyXG4gICAgICpcclxuICAgICAqIEByZXR1cm5zIHtJbmRleEJ1ZmZlcn0gUmV0dXJucyB0aGUgaW5kZXggYnVmZmVyIG9iamVjdCBmb3IgY2hhaW5pbmcuXHJcbiAgICAgKi9cclxuICAgIEluZGV4QnVmZmVyLnByb3RvdHlwZS51bmJpbmQgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICAvLyBpZiB0aGVyZSBpcyBubyBidWZmZXIgYm91bmQsIGV4aXQgZWFybHlcclxuICAgICAgICBpZiAoIF9ib3VuZEJ1ZmZlciA9PT0gbnVsbCApIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgZ2wgPSB0aGlzLmdsO1xyXG4gICAgICAgIGdsLmJpbmRCdWZmZXIoIGdsLkVMRU1FTlRfQVJSQVlfQlVGRkVSLCBudWxsICk7XHJcbiAgICAgICAgX2JvdW5kQnVmZmVyID0gbnVsbDtcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH07XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBFeGVjdXRlIHRoZSBkcmF3IGNvbW1hbmQgZm9yIHRoZSBib3VuZCBidWZmZXIuXHJcbiAgICAgKiBAbWVtYmVyb2YgSW5kZXhCdWZmZXJcclxuICAgICAqXHJcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyAtIFRoZSBvcHRpb25zIHRvIHBhc3MgdG8gJ2RyYXdFbGVtZW50cycuIE9wdGlvbmFsLlxyXG4gICAgICpcclxuICAgICAqIEByZXR1cm5zIHtJbmRleEJ1ZmZlcn0gUmV0dXJucyB0aGUgaW5kZXggYnVmZmVyIG9iamVjdCBmb3IgY2hhaW5pbmcuXHJcbiAgICAgKi9cclxuICAgIEluZGV4QnVmZmVyLnByb3RvdHlwZS5kcmF3ID0gZnVuY3Rpb24oIG9wdGlvbnMgKSB7XHJcbiAgICAgICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XHJcbiAgICAgICAgaWYgKCBfYm91bmRCdWZmZXIgPT09IG51bGwgKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUud2FybiggJ05vIEluZGV4QnVmZmVyIGlzIGJvdW5kLCBjb21tYW5kIGlnbm9yZWQuJyApO1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciBnbCA9IHRoaXMuZ2w7XHJcbiAgICAgICAgdmFyIG1vZGUgPSBnbFsgb3B0aW9ucy5tb2RlIHx8IHRoaXMubW9kZSB8fCAnVFJJQU5HTEVTJyBdO1xyXG4gICAgICAgIHZhciBvZmZzZXQgPSAoIG9wdGlvbnMub2Zmc2V0ICE9PSB1bmRlZmluZWQgKSA/IG9wdGlvbnMub2Zmc2V0IDogdGhpcy5vZmZzZXQ7XHJcbiAgICAgICAgdmFyIGNvdW50ID0gKCBvcHRpb25zLmNvdW50ICE9PSB1bmRlZmluZWQgKSA/IG9wdGlvbnMuY291bnQgOiB0aGlzLmNvdW50O1xyXG4gICAgICAgIGdsLmRyYXdFbGVtZW50cyhcclxuICAgICAgICAgICAgbW9kZSxcclxuICAgICAgICAgICAgY291bnQsXHJcbiAgICAgICAgICAgIGdsWyB0aGlzLnR5cGUgXSxcclxuICAgICAgICAgICAgb2Zmc2V0ICk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9O1xyXG5cclxuICAgIG1vZHVsZS5leHBvcnRzID0gSW5kZXhCdWZmZXI7XHJcblxyXG59KCkpO1xyXG4iLCIoZnVuY3Rpb24gKCkge1xyXG5cclxuICAgICd1c2Ugc3RyaWN0JztcclxuXHJcbiAgICB2YXIgV2ViR0xDb250ZXh0ID0gcmVxdWlyZSgnLi9XZWJHTENvbnRleHQnKSxcclxuICAgICAgICBTdGFjayA9IHJlcXVpcmUoJy4uL3V0aWwvU3RhY2snKSxcclxuICAgICAgICBfc3RhY2sgPSBuZXcgU3RhY2soKSxcclxuICAgICAgICBfYm91bmRCdWZmZXIgPSBudWxsO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogQmluZHMgdGhlIHJlbmRlclRhcmdldCBvYmplY3QsIGNhY2hpbmcgaXQgdG8gcHJldmVudCB1bm5lY2Vzc2FyeSByZWJpbmRzLlxyXG4gICAgICpcclxuICAgICAqIEBwYXJhbSB7UmVuZGVyVGFyZ2V0fSByZW5kZXJUYXJnZXQgLSBUaGUgUmVuZGVyVGFyZ2V0IG9iamVjdCB0byBiaW5kLlxyXG4gICAgICovXHJcbiAgICAgZnVuY3Rpb24gYmluZCggcmVuZGVyVGFyZ2V0ICkge1xyXG4gICAgICAgIC8vIGlmIHRoaXMgYnVmZmVyIGlzIGFscmVhZHkgYm91bmQsIGV4aXQgZWFybHlcclxuICAgICAgICBpZiAoIF9ib3VuZEJ1ZmZlciA9PT0gcmVuZGVyVGFyZ2V0ICkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciBnbCA9IHJlbmRlclRhcmdldC5nbDtcclxuICAgICAgICBnbC5iaW5kRnJhbWVidWZmZXIoIGdsLkZSQU1FQlVGRkVSLCByZW5kZXJUYXJnZXQuZnJhbWVidWZmZXIgKTtcclxuICAgICAgICBfYm91bmRCdWZmZXIgPSByZW5kZXJUYXJnZXQ7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBVbmJpbmRzIHRoZSByZW5kZXJUYXJnZXQgb2JqZWN0LiBQcmV2ZW50cyB1bm5lY2Vzc2FyeSB1bmJpbmRpbmcuXHJcbiAgICAgKlxyXG4gICAgICogQHBhcmFtIHtSZW5kZXJUYXJnZXR9IHJlbmRlclRhcmdldCAtIFRoZSBSZW5kZXJUYXJnZXQgb2JqZWN0IHRvIHVuYmluZC5cclxuICAgICAqL1xyXG4gICAgIGZ1bmN0aW9uIHVuYmluZCggcmVuZGVyVGFyZ2V0ICkge1xyXG4gICAgICAgIC8vIGlmIHRoZXJlIGlzIG5vIGJ1ZmZlciBib3VuZCwgZXhpdCBlYXJseVxyXG4gICAgICAgIGlmICggX2JvdW5kQnVmZmVyID09PSBudWxsICkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciBnbCA9IHJlbmRlclRhcmdldC5nbDtcclxuICAgICAgICBnbC5iaW5kRnJhbWVidWZmZXIoIGdsLkZSQU1FQlVGRkVSLCBudWxsICk7XHJcbiAgICAgICAgX2JvdW5kQnVmZmVyID0gbnVsbDtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIEluc3RhbnRpYXRlcyBhIFJlbmRlclRhcmdldCBvYmplY3QuXHJcbiAgICAgKiBAY2xhc3MgUmVuZGVyVGFyZ2V0XHJcbiAgICAgKiBAY2xhc3NkZXNjIEEgcmVuZGVyVGFyZ2V0IGNsYXNzIHRvIGFsbG93IHJlbmRlcmluZyB0byB0ZXh0dXJlcy5cclxuICAgICAqL1xyXG4gICAgZnVuY3Rpb24gUmVuZGVyVGFyZ2V0KCkge1xyXG4gICAgICAgIHZhciBnbCA9IHRoaXMuZ2wgPSBXZWJHTENvbnRleHQuZ2V0KCk7XHJcbiAgICAgICAgdGhpcy5mcmFtZWJ1ZmZlciA9IGdsLmNyZWF0ZUZyYW1lYnVmZmVyKCk7XHJcbiAgICAgICAgdGhpcy50ZXh0dXJlcyA9IHt9O1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQmluZHMgdGhlIHJlbmRlclRhcmdldCBvYmplY3QgYW5kIHB1c2hlcyBpdCB0byB0aGUgZnJvbnQgb2YgdGhlIHN0YWNrLlxyXG4gICAgICogQG1lbWJlcm9mIFJlbmRlclRhcmdldFxyXG4gICAgICpcclxuICAgICAqIEByZXR1cm5zIHtSZW5kZXJUYXJnZXR9IFRoZSByZW5kZXJUYXJnZXQgb2JqZWN0LCBmb3IgY2hhaW5pbmcuXHJcbiAgICAgKi9cclxuICAgIFJlbmRlclRhcmdldC5wcm90b3R5cGUucHVzaCA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIF9zdGFjay5wdXNoKCB0aGlzICk7XHJcbiAgICAgICAgYmluZCggdGhpcyApO1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfTtcclxuXHJcbiAgICAvKipcclxuICAgICAqIFVuYmluZHMgdGhlIHJlbmRlclRhcmdldCBvYmplY3QgYW5kIGJpbmRzIHRoZSByZW5kZXJUYXJnZXQgYmVuZWF0aCBpdCBvblxyXG4gICAgICogdGhpcyBzdGFjay4gSWYgdGhlcmUgaXMgbm8gdW5kZXJseWluZyByZW5kZXJUYXJnZXQsIGJpbmQgdGhlIGJhY2tidWZmZXIuXHJcbiAgICAgKiBAbWVtYmVyb2YgUmVuZGVyVGFyZ2V0XHJcbiAgICAgKlxyXG4gICAgICogQHJldHVybnMge1JlbmRlclRhcmdldH0gVGhlIHJlbmRlclRhcmdldCBvYmplY3QsIGZvciBjaGFpbmluZy5cclxuICAgICAqL1xyXG4gICAgUmVuZGVyVGFyZ2V0LnByb3RvdHlwZS5wb3AgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICB2YXIgdG9wO1xyXG4gICAgICAgIF9zdGFjay5wb3AoKTtcclxuICAgICAgICB0b3AgPSBfc3RhY2sudG9wKCk7XHJcbiAgICAgICAgaWYgKCB0b3AgKSB7XHJcbiAgICAgICAgICAgIGJpbmQoIHRvcCApO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHVuYmluZCggdGhpcyApO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH07XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBBdHRhY2hlcyB0aGUgcHJvdmlkZWQgdGV4dHVyZSB0byB0aGUgcHJvdmlkZWQgYXR0YWNobWVudCBsb2NhdGlvbi5cclxuICAgICAqIEBtZW1iZXJvZiBSZW5kZXJUYXJnZXRcclxuICAgICAqXHJcbiAgICAgKiBAcGFyYW0ge1RleHR1cmUyRH0gdGV4dHVyZSAtIFRoZSB0ZXh0dXJlIHRvIGF0dGFjaC5cclxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBpbmRleCAtIFRoZSBhdHRhY2htZW50IGluZGV4LiAob3B0aW9uYWwpXHJcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gdGFyZ2V0IC0gVGhlIHRleHR1cmUgdGFyZ2V0IHR5cGUuIChvcHRpb25hbClcclxuICAgICAqXHJcbiAgICAgKiBAcmV0dXJucyB7UmVuZGVyVGFyZ2V0fSBUaGUgcmVuZGVyVGFyZ2V0IG9iamVjdCwgZm9yIGNoYWluaW5nLlxyXG4gICAgICovXHJcbiAgICBSZW5kZXJUYXJnZXQucHJvdG90eXBlLnNldENvbG9yVGFyZ2V0ID0gZnVuY3Rpb24oIHRleHR1cmUsIGluZGV4LCB0YXJnZXQgKSB7XHJcbiAgICAgICAgdmFyIGdsID0gdGhpcy5nbDtcclxuICAgICAgICBpZiAoIHR5cGVvZiBpbmRleCA9PT0gJ3N0cmluZycgKSB7XHJcbiAgICAgICAgICAgIHRhcmdldCA9IGluZGV4O1xyXG4gICAgICAgICAgICBpbmRleCA9IHVuZGVmaW5lZDtcclxuICAgICAgICB9XHJcbiAgICAgICAgaW5kZXggPSAoIGluZGV4ICE9PSB1bmRlZmluZWQgKSA/IGluZGV4IDogMDtcclxuICAgICAgICB0aGlzLnRleHR1cmVzWyAnY29sb3InICsgaW5kZXggXSA9IHRleHR1cmU7XHJcbiAgICAgICAgdGhpcy5wdXNoKCk7XHJcbiAgICAgICAgZ2wuZnJhbWVidWZmZXJUZXh0dXJlMkQoXHJcbiAgICAgICAgICAgIGdsLkZSQU1FQlVGRkVSLFxyXG4gICAgICAgICAgICBnbFsgJ0NPTE9SX0FUVEFDSE1FTlQnICsgaW5kZXggXSxcclxuICAgICAgICAgICAgZ2xbIHRhcmdldCB8fCAnVEVYVFVSRV8yRCcgXSxcclxuICAgICAgICAgICAgdGV4dHVyZS50ZXh0dXJlLFxyXG4gICAgICAgICAgICAwICk7XHJcbiAgICAgICAgdGhpcy5wb3AoKTtcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH07XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBBdHRhY2hlcyB0aGUgcHJvdmlkZWQgdGV4dHVyZSB0byB0aGUgcHJvdmlkZWQgYXR0YWNobWVudCBsb2NhdGlvbi5cclxuICAgICAqIEBtZW1iZXJvZiBSZW5kZXJUYXJnZXRcclxuICAgICAqXHJcbiAgICAgKiBAcGFyYW0ge1RleHR1cmUyRH0gdGV4dHVyZSAtIFRoZSB0ZXh0dXJlIHRvIGF0dGFjaC5cclxuICAgICAqXHJcbiAgICAgKiBAcmV0dXJucyB7UmVuZGVyVGFyZ2V0fSBUaGUgcmVuZGVyVGFyZ2V0IG9iamVjdCwgZm9yIGNoYWluaW5nLlxyXG4gICAgICovXHJcbiAgICBSZW5kZXJUYXJnZXQucHJvdG90eXBlLnNldERlcHRoVGFyZ2V0ID0gZnVuY3Rpb24oIHRleHR1cmUgKSB7XHJcbiAgICAgICAgdmFyIGdsID0gdGhpcy5nbDtcclxuICAgICAgICB0aGlzLnRleHR1cmVzLmRlcHRoID0gdGV4dHVyZTtcclxuICAgICAgICB0aGlzLnB1c2goKTtcclxuICAgICAgICBnbC5mcmFtZWJ1ZmZlclRleHR1cmUyRChcclxuICAgICAgICAgICAgZ2wuRlJBTUVCVUZGRVIsXHJcbiAgICAgICAgICAgIGdsLkRFUFRIX0FUVEFDSE1FTlQsXHJcbiAgICAgICAgICAgIGdsLlRFWFRVUkVfMkQsXHJcbiAgICAgICAgICAgIHRleHR1cmUudGV4dHVyZSxcclxuICAgICAgICAgICAgMCApO1xyXG4gICAgICAgIHRoaXMucG9wKCk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9O1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogQ2xlYXJzIHRoZSBjb2xvciBiaXRzIG9mIHRoZSByZW5kZXJUYXJnZXQuXHJcbiAgICAgKiBAbWVtYmVyb2YgUmVuZGVyVGFyZ2V0XHJcbiAgICAgKlxyXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHIgLSBUaGUgcmVkIHZhbHVlLlxyXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGcgLSBUaGUgZ3JlZW4gdmFsdWUuXHJcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gYiAtIFRoZSBibHVlIHZhbHVlLlxyXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGEgLSBUaGUgYWxwaGEgdmFsdWUuXHJcbiAgICAgKlxyXG4gICAgICogQHJldHVybnMge1JlbmRlclRhcmdldH0gVGhlIHJlbmRlclRhcmdldCBvYmplY3QsIGZvciBjaGFpbmluZy5cclxuICAgICAqL1xyXG4gICAgUmVuZGVyVGFyZ2V0LnByb3RvdHlwZS5jbGVhckNvbG9yID0gZnVuY3Rpb24oIHIsIGcsIGIsIGEgKSB7XHJcbiAgICAgICAgdmFyIGdsID0gdGhpcy5nbDtcclxuICAgICAgICByID0gKCByICE9PSB1bmRlZmluZWQgKSA/IHIgOiAwO1xyXG4gICAgICAgIGcgPSAoIGcgIT09IHVuZGVmaW5lZCApID8gZyA6IDA7XHJcbiAgICAgICAgYiA9ICggYiAhPT0gdW5kZWZpbmVkICkgPyBiIDogMDtcclxuICAgICAgICBhID0gKCBhICE9PSB1bmRlZmluZWQgKSA/IGEgOiAwO1xyXG4gICAgICAgIHRoaXMucHVzaCgpO1xyXG4gICAgICAgIGdsLmNsZWFyQ29sb3IoIHIsIGcsIGIsIGEgKTtcclxuICAgICAgICBnbC5jbGVhciggZ2wuQ09MT1JfQlVGRkVSX0JJVCApO1xyXG4gICAgICAgIHRoaXMucG9wKCk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9O1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogQ2xlYXJzIHRoZSBkZXB0aCBiaXRzIG9mIHRoZSByZW5kZXJUYXJnZXQuXHJcbiAgICAgKiBAbWVtYmVyb2YgUmVuZGVyVGFyZ2V0XHJcbiAgICAgKlxyXG4gICAgICogQHJldHVybnMge1JlbmRlclRhcmdldH0gVGhlIHJlbmRlclRhcmdldCBvYmplY3QsIGZvciBjaGFpbmluZy5cclxuICAgICAqL1xyXG4gICAgUmVuZGVyVGFyZ2V0LnByb3RvdHlwZS5jbGVhckRlcHRoID0gZnVuY3Rpb24oIHIsIGcsIGIsIGEgKSB7XHJcbiAgICAgICAgdmFyIGdsID0gdGhpcy5nbDtcclxuICAgICAgICByID0gKCByICE9PSB1bmRlZmluZWQgKSA/IHIgOiAwO1xyXG4gICAgICAgIGcgPSAoIGcgIT09IHVuZGVmaW5lZCApID8gZyA6IDA7XHJcbiAgICAgICAgYiA9ICggYiAhPT0gdW5kZWZpbmVkICkgPyBiIDogMDtcclxuICAgICAgICBhID0gKCBhICE9PSB1bmRlZmluZWQgKSA/IGEgOiAwO1xyXG4gICAgICAgIHRoaXMucHVzaCgpO1xyXG4gICAgICAgIGdsLmNsZWFyQ29sb3IoIHIsIGcsIGIsIGEgKTtcclxuICAgICAgICBnbC5jbGVhciggZ2wuREVQVEhfQlVGRkVSX0JJVCApO1xyXG4gICAgICAgIHRoaXMucG9wKCk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9O1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogQ2xlYXJzIHRoZSBzdGVuY2lsIGJpdHMgb2YgdGhlIHJlbmRlclRhcmdldC5cclxuICAgICAqIEBtZW1iZXJvZiBSZW5kZXJUYXJnZXRcclxuICAgICAqXHJcbiAgICAgKiBAcmV0dXJucyB7UmVuZGVyVGFyZ2V0fSBUaGUgcmVuZGVyVGFyZ2V0IG9iamVjdCwgZm9yIGNoYWluaW5nLlxyXG4gICAgICovXHJcbiAgICBSZW5kZXJUYXJnZXQucHJvdG90eXBlLmNsZWFyU3RlbmNpbCA9IGZ1bmN0aW9uKCByLCBnLCBiLCBhICkge1xyXG4gICAgICAgIHZhciBnbCA9IHRoaXMuZ2w7XHJcbiAgICAgICAgciA9ICggciAhPT0gdW5kZWZpbmVkICkgPyByIDogMDtcclxuICAgICAgICBnID0gKCBnICE9PSB1bmRlZmluZWQgKSA/IGcgOiAwO1xyXG4gICAgICAgIGIgPSAoIGIgIT09IHVuZGVmaW5lZCApID8gYiA6IDA7XHJcbiAgICAgICAgYSA9ICggYSAhPT0gdW5kZWZpbmVkICkgPyBhIDogMDtcclxuICAgICAgICB0aGlzLnB1c2goKTtcclxuICAgICAgICBnbC5jbGVhckNvbG9yKCByLCBnLCBiLCBhICk7XHJcbiAgICAgICAgZ2wuY2xlYXIoIGdsLlNURU5DSUxfQlVGRkVSX0JJVCApO1xyXG4gICAgICAgIHRoaXMucG9wKCk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9O1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogQ2xlYXJzIGFsbCB0aGUgYml0cyBvZiB0aGUgcmVuZGVyVGFyZ2V0LlxyXG4gICAgICogQG1lbWJlcm9mIFJlbmRlclRhcmdldFxyXG4gICAgICpcclxuICAgICAqIEByZXR1cm5zIHtSZW5kZXJUYXJnZXR9IFRoZSByZW5kZXJUYXJnZXQgb2JqZWN0LCBmb3IgY2hhaW5pbmcuXHJcbiAgICAgKi9cclxuICAgIFJlbmRlclRhcmdldC5wcm90b3R5cGUuY2xlYXIgPSBmdW5jdGlvbiggciwgZywgYiwgYSApIHtcclxuICAgICAgICB2YXIgZ2wgPSB0aGlzLmdsO1xyXG4gICAgICAgIHIgPSAoIHIgIT09IHVuZGVmaW5lZCApID8gciA6IDA7XHJcbiAgICAgICAgZyA9ICggZyAhPT0gdW5kZWZpbmVkICkgPyBnIDogMDtcclxuICAgICAgICBiID0gKCBiICE9PSB1bmRlZmluZWQgKSA/IGIgOiAwO1xyXG4gICAgICAgIGEgPSAoIGEgIT09IHVuZGVmaW5lZCApID8gYSA6IDA7XHJcbiAgICAgICAgdGhpcy5wdXNoKCk7XHJcbiAgICAgICAgZ2wuY2xlYXJDb2xvciggciwgZywgYiwgYSApO1xyXG4gICAgICAgIGdsLmNsZWFyKCBnbC5DT0xPUl9CVUZGRVJfQklUIHwgZ2wuREVQVEhfQlVGRkVSX0JJVCB8IGdsLlNURU5DSUxfQlVGRkVSX0JJVCApO1xyXG4gICAgICAgIHRoaXMucG9wKCk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9O1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogUmVzaXplcyB0aGUgcmVuZGVyVGFyZ2V0IGFuZCBhbGwgYXR0YWNoZWQgdGV4dHVyZXMgYnkgdGhlIHByb3ZpZGVkIGhlaWdodFxyXG4gICAgICogYW5kIHdpZHRoLlxyXG4gICAgICogQG1lbWJlcm9mIFJlbmRlclRhcmdldFxyXG4gICAgICpcclxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSB3aWR0aCAtIFRoZSBuZXcgd2lkdGggb2YgdGhlIHJlbmRlclRhcmdldC5cclxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBoZWlnaHQgLSBUaGUgbmV3IGhlaWdodCBvZiB0aGUgcmVuZGVyVGFyZ2V0LlxyXG4gICAgICpcclxuICAgICAqIEByZXR1cm5zIHtSZW5kZXJUYXJnZXR9IFRoZSByZW5kZXJUYXJnZXQgb2JqZWN0LCBmb3IgY2hhaW5pbmcuXHJcbiAgICAgKi9cclxuICAgIFJlbmRlclRhcmdldC5wcm90b3R5cGUucmVzaXplID0gZnVuY3Rpb24oIHdpZHRoLCBoZWlnaHQgKSB7XHJcbiAgICAgICAgdmFyIGtleTtcclxuICAgICAgICBpZiAoICF3aWR0aCB8fCAhaGVpZ2h0ICkge1xyXG4gICAgICAgICAgICBjb25zb2xlLndhcm4oICdXaWR0aCBvciBoZWlnaHQgYXJndW1lbnRzIG1pc3NpbmcsIGNvbW1hbmQgaWdub3JlZC4nICk7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgICAgIH1cclxuICAgICAgICBmb3IgKCBrZXkgaW4gdGhpcy50ZXh0dXJlcyApIHtcclxuICAgICAgICAgICAgaWYgKCB0aGlzLnRleHR1cmVzLmhhc093blByb3BlcnR5KCBrZXkgKSApIHtcclxuICAgICAgICAgICAgICAgIHRoaXMudGV4dHVyZXNbIGtleSBdLnJlc2l6ZSggd2lkdGgsIGhlaWdodCApO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfTtcclxuXHJcbiAgICBtb2R1bGUuZXhwb3J0cyA9IFJlbmRlclRhcmdldDtcclxuXHJcbn0oKSk7XHJcbiIsIihmdW5jdGlvbiAoKSB7XHJcblxyXG4gICAgJ3VzZSBzdHJpY3QnO1xyXG5cclxuICAgIHZhciBWZXJ0ZXhQYWNrYWdlID0gcmVxdWlyZSgnLi4vY29yZS9WZXJ0ZXhQYWNrYWdlJyksXHJcbiAgICAgICAgVmVydGV4QnVmZmVyID0gcmVxdWlyZSgnLi4vY29yZS9WZXJ0ZXhCdWZmZXInKSxcclxuICAgICAgICBJbmRleEJ1ZmZlciA9IHJlcXVpcmUoJy4uL2NvcmUvSW5kZXhCdWZmZXInKTtcclxuXHJcbiAgICBmdW5jdGlvbiBSZW5kZXJhYmxlKCBzcGVjLCBvcHRpb25zICkge1xyXG4gICAgICAgIHNwZWMgPSBzcGVjIHx8IHt9O1xyXG4gICAgICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xyXG4gICAgICAgIGlmICggc3BlYy52ZXJ0ZXhCdWZmZXIgfHwgc3BlYy52ZXJ0ZXhCdWZmZXJzICkge1xyXG4gICAgICAgICAgICAvLyB1c2UgZXhpc3RpbmcgdmVydGV4IGJ1ZmZlclxyXG4gICAgICAgICAgICB0aGlzLnZlcnRleEJ1ZmZlcnMgPSBzcGVjLnZlcnRleEJ1ZmZlcnMgfHwgWyBzcGVjLnZlcnRleEJ1ZmZlciBdO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIC8vIGNyZWF0ZSB2ZXJ0ZXggcGFja2FnZVxyXG4gICAgICAgICAgICB2YXIgdmVydGV4UGFja2FnZSA9IG5ldyBWZXJ0ZXhQYWNrYWdlKCBzcGVjLnZlcnRpY2VzICk7XHJcbiAgICAgICAgICAgIC8vIGNyZWF0ZSB2ZXJ0ZXggYnVmZmVyXHJcbiAgICAgICAgICAgIHRoaXMudmVydGV4QnVmZmVycyA9IFsgbmV3IFZlcnRleEJ1ZmZlciggdmVydGV4UGFja2FnZSApIF07XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICggc3BlYy5pbmRleEJ1ZmZlciApIHtcclxuICAgICAgICAgICAgLy8gdXNlIGV4aXN0aW5nIGluZGV4IGJ1ZmZlclxyXG4gICAgICAgICAgICB0aGlzLmluZGV4QnVmZmVyID0gc3BlYy5pbmRleEJ1ZmZlcjtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBpZiAoIHNwZWMuaW5kaWNlcyApIHtcclxuICAgICAgICAgICAgICAgIC8vIGNyZWF0ZSBpbmRleCBidWZmZXJcclxuICAgICAgICAgICAgICAgIHRoaXMuaW5kZXhCdWZmZXIgPSBuZXcgSW5kZXhCdWZmZXIoIHNwZWMuaW5kaWNlcyApO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vIHN0b3JlIHJlbmRlcmluZyBvcHRpb25zXHJcbiAgICAgICAgdGhpcy5vcHRpb25zID0ge1xyXG4gICAgICAgICAgICBtb2RlOiBvcHRpb25zLm1vZGUsXHJcbiAgICAgICAgICAgIG9mZnNldDogb3B0aW9ucy5vZmZzZXQsXHJcbiAgICAgICAgICAgIGNvdW50OiBvcHRpb25zLmNvdW50XHJcbiAgICAgICAgfTtcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxuXHJcbiAgICBSZW5kZXJhYmxlLnByb3RvdHlwZS5kcmF3ID0gZnVuY3Rpb24oIG9wdGlvbnMgKSB7XHJcbiAgICAgICAgdmFyIG92ZXJyaWRlcyA9IG9wdGlvbnMgfHwge307XHJcbiAgICAgICAgLy8gb3ZlcnJpZGUgb3B0aW9ucyBpZiBwcm92aWRlZFxyXG4gICAgICAgIG92ZXJyaWRlcy5tb2RlID0gb3ZlcnJpZGVzLm1vZGUgfHwgdGhpcy5vcHRpb25zLm1vZGU7XHJcbiAgICAgICAgb3ZlcnJpZGVzLm9mZnNldCA9ICggb3ZlcnJpZGVzLm9mZnNldCAhPT0gdW5kZWZpbmVkICkgPyBvdmVycmlkZXMub2Zmc2V0IDogdGhpcy5vcHRpb25zLm9mZnNldDtcclxuICAgICAgICBvdmVycmlkZXMuY291bnQgPSAoIG92ZXJyaWRlcy5jb3VudCAhPT0gdW5kZWZpbmVkICkgPyBvdmVycmlkZXMuY291bnQgOiB0aGlzLm9wdGlvbnMuY291bnQ7XHJcbiAgICAgICAgLy8gZHJhdyB0aGUgcmVuZGVyYWJsZVxyXG4gICAgICAgIGlmICggdGhpcy5pbmRleEJ1ZmZlciApIHtcclxuICAgICAgICAgICAgLy8gdXNlIGluZGV4IGJ1ZmZlciB0byBkcmF3IGVsZW1lbnRzXHJcbiAgICAgICAgICAgIHRoaXMudmVydGV4QnVmZmVycy5mb3JFYWNoKCBmdW5jdGlvbiggdmVydGV4QnVmZmVyICkge1xyXG4gICAgICAgICAgICAgICAgdmVydGV4QnVmZmVyLmJpbmQoKTtcclxuICAgICAgICAgICAgICAgIC8vIG5vIGFkdmFudGFnZSB0byB1bmJpbmRpbmcgYXMgdGhlcmUgaXMgbm8gc3RhY2sgdXNlZFxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgdGhpcy5pbmRleEJ1ZmZlci5iaW5kKCk7XHJcbiAgICAgICAgICAgIHRoaXMuaW5kZXhCdWZmZXIuZHJhdyggb3ZlcnJpZGVzICk7XHJcbiAgICAgICAgICAgIC8vIG5vIGFkdmFudGFnZSB0byB1bmJpbmRpbmcgYXMgdGhlcmUgaXMgbm8gc3RhY2sgdXNlZFxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIC8vIG5vIGluZGV4IGJ1ZmZlciwgdXNlIGRyYXcgYXJyYXlzXHJcbiAgICAgICAgICAgIHRoaXMudmVydGV4QnVmZmVycy5mb3JFYWNoKCBmdW5jdGlvbiggdmVydGV4QnVmZmVyICkge1xyXG4gICAgICAgICAgICAgICAgdmVydGV4QnVmZmVyLmJpbmQoKTtcclxuICAgICAgICAgICAgICAgIHZlcnRleEJ1ZmZlci5kcmF3KCBvdmVycmlkZXMgKTtcclxuICAgICAgICAgICAgICAgIC8vIG5vIGFkdmFudGFnZSB0byB1bmJpbmRpbmcgYXMgdGhlcmUgaXMgbm8gc3RhY2sgdXNlZFxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9O1xyXG5cclxuICAgIG1vZHVsZS5leHBvcnRzID0gUmVuZGVyYWJsZTtcclxuXHJcbn0oKSk7XHJcbiIsIihmdW5jdGlvbiAoKSB7XHJcblxyXG4gICAgJ3VzZSBzdHJpY3QnO1xyXG5cclxuICAgIHZhciBXZWJHTENvbnRleHQgPSByZXF1aXJlKCcuL1dlYkdMQ29udGV4dCcpLFxyXG4gICAgICAgIFNoYWRlclBhcnNlciA9IHJlcXVpcmUoJy4vU2hhZGVyUGFyc2VyJyksXHJcbiAgICAgICAgVXRpbCA9IHJlcXVpcmUoJy4uL3V0aWwvVXRpbCcpLFxyXG4gICAgICAgIFhIUkxvYWRlciA9IHJlcXVpcmUoJy4uL3V0aWwvWEhSTG9hZGVyJyksXHJcbiAgICAgICAgU3RhY2sgPSByZXF1aXJlKCcuLi91dGlsL1N0YWNrJyksXHJcbiAgICAgICAgVU5JRk9STV9GVU5DVElPTlMgPSB7XHJcbiAgICAgICAgICAgICdib29sJzogJ3VuaWZvcm0xaScsXHJcbiAgICAgICAgICAgICdib29sW10nOiAndW5pZm9ybTFpdicsXHJcbiAgICAgICAgICAgICdmbG9hdCc6ICd1bmlmb3JtMWYnLFxyXG4gICAgICAgICAgICAnZmxvYXRbXSc6ICd1bmlmb3JtMWZ2JyxcclxuICAgICAgICAgICAgJ2ludCc6ICd1bmlmb3JtMWknLFxyXG4gICAgICAgICAgICAnaW50W10nOiAndW5pZm9ybTFpdicsXHJcbiAgICAgICAgICAgICd1aW50JzogJ3VuaWZvcm0xaScsXHJcbiAgICAgICAgICAgICd1aW50W10nOiAndW5pZm9ybTFpdicsXHJcbiAgICAgICAgICAgICd2ZWMyJzogJ3VuaWZvcm0yZnYnLFxyXG4gICAgICAgICAgICAndmVjMltdJzogJ3VuaWZvcm0yZnYnLFxyXG4gICAgICAgICAgICAnaXZlYzInOiAndW5pZm9ybTJpdicsXHJcbiAgICAgICAgICAgICdpdmVjMltdJzogJ3VuaWZvcm0yaXYnLFxyXG4gICAgICAgICAgICAndmVjMyc6ICd1bmlmb3JtM2Z2JyxcclxuICAgICAgICAgICAgJ3ZlYzNbXSc6ICd1bmlmb3JtM2Z2JyxcclxuICAgICAgICAgICAgJ2l2ZWMzJzogJ3VuaWZvcm0zaXYnLFxyXG4gICAgICAgICAgICAnaXZlYzNbXSc6ICd1bmlmb3JtM2l2JyxcclxuICAgICAgICAgICAgJ3ZlYzQnOiAndW5pZm9ybTRmdicsXHJcbiAgICAgICAgICAgICd2ZWM0W10nOiAndW5pZm9ybTRmdicsXHJcbiAgICAgICAgICAgICdpdmVjNCc6ICd1bmlmb3JtNGl2JyxcclxuICAgICAgICAgICAgJ2l2ZWM0W10nOiAndW5pZm9ybTRpdicsXHJcbiAgICAgICAgICAgICdtYXQyJzogJ3VuaWZvcm1NYXRyaXgyZnYnLFxyXG4gICAgICAgICAgICAnbWF0MltdJzogJ3VuaWZvcm1NYXRyaXgyZnYnLFxyXG4gICAgICAgICAgICAnbWF0Myc6ICd1bmlmb3JtTWF0cml4M2Z2JyxcclxuICAgICAgICAgICAgJ21hdDNbXSc6ICd1bmlmb3JtTWF0cml4M2Z2JyxcclxuICAgICAgICAgICAgJ21hdDQnOiAndW5pZm9ybU1hdHJpeDRmdicsXHJcbiAgICAgICAgICAgICdtYXQ0W10nOiAndW5pZm9ybU1hdHJpeDRmdicsXHJcbiAgICAgICAgICAgICdzYW1wbGVyMkQnOiAndW5pZm9ybTFpJyxcclxuICAgICAgICAgICAgJ3NhbXBsZXJDdWJlJzogJ3VuaWZvcm0xaSdcclxuICAgICAgICB9LFxyXG4gICAgICAgIF9zdGFjayA9IG5ldyBTdGFjaygpLFxyXG4gICAgICAgIF9ib3VuZFNoYWRlciA9IG51bGw7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBHaXZlbiB2ZXJ0ZXggYW5kIGZyYWdtZW50IHNoYWRlciBzb3VyY2UsIHJldHVybnMgYW4gb2JqZWN0IGNvbnRhaW5pbmdcclxuICAgICAqIGluZm9ybWF0aW9uIHBlcnRhaW5pbmcgdG8gdGhlIHVuaWZvcm1zIGFuZCBhdHRyaWJ0dWVzIGRlY2xhcmVkLlxyXG4gICAgICpcclxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSB2ZXJ0U291cmNlIC0gVGhlIHZlcnRleCBzaGFkZXIgc291cmNlLlxyXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGZyYWdTb3VyY2UgLSBUaGUgZnJhZ21lbnQgc2hhZGVyIHNvdXJjZS5cclxuICAgICAqXHJcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBUaGUgYXR0cmlidXRlIGFuZCB1bmlmb3JtIGluZm9ybWF0aW9uLlxyXG4gICAgICovXHJcbiAgICBmdW5jdGlvbiBnZXRBdHRyaWJ1dGVzQW5kVW5pZm9ybXNGcm9tU291cmNlKCB2ZXJ0U291cmNlLCBmcmFnU291cmNlICkge1xyXG4gICAgICAgIHZhciBkZWNsYXJhdGlvbnMgPSBTaGFkZXJQYXJzZXIucGFyc2VEZWNsYXJhdGlvbnMoXHJcbiAgICAgICAgICAgICAgICBbIHZlcnRTb3VyY2UsIGZyYWdTb3VyY2UgXSxcclxuICAgICAgICAgICAgICAgIFsgJ3VuaWZvcm0nLCAnYXR0cmlidXRlJyBdKSxcclxuICAgICAgICAgICAgYXR0cmlidXRlcyA9IHt9LFxyXG4gICAgICAgICAgICB1bmlmb3JtcyA9IHt9LFxyXG4gICAgICAgICAgICBhdHRyQ291bnQgPSAwLFxyXG4gICAgICAgICAgICBkZWNsYXJhdGlvbixcclxuICAgICAgICAgICAgaTtcclxuICAgICAgICAvLyBmb3IgZWFjaCBkZWNsYXJhdGlvbiBpbiB0aGUgc2hhZGVyXHJcbiAgICAgICAgZm9yICggaT0wOyBpPGRlY2xhcmF0aW9ucy5sZW5ndGg7IGkrKyApIHtcclxuICAgICAgICAgICAgZGVjbGFyYXRpb24gPSBkZWNsYXJhdGlvbnNbaV07XHJcbiAgICAgICAgICAgIC8vIGNoZWNrIGlmIGl0cyBhbiBhdHRyaWJ1dGUgb3IgdW5pZm9ybVxyXG4gICAgICAgICAgICBpZiAoIGRlY2xhcmF0aW9uLnF1YWxpZmllciA9PT0gJ2F0dHJpYnV0ZScgKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBpZiBhdHRyaWJ1dGUsIHN0b3JlIHR5cGUgYW5kIGluZGV4XHJcbiAgICAgICAgICAgICAgICBhdHRyaWJ1dGVzWyBkZWNsYXJhdGlvbi5uYW1lIF0gPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogZGVjbGFyYXRpb24udHlwZSxcclxuICAgICAgICAgICAgICAgICAgICBpbmRleDogYXR0ckNvdW50KytcclxuICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoIGRlY2xhcmF0aW9uLnF1YWxpZmllciA9PT0gJ3VuaWZvcm0nICkge1xyXG4gICAgICAgICAgICAgICAgLy8gaWYgdW5pZm9ybSwgc3RvcmUgdHlwZSBhbmQgYnVmZmVyIGZ1bmN0aW9uIG5hbWVcclxuICAgICAgICAgICAgICAgIHVuaWZvcm1zWyBkZWNsYXJhdGlvbi5uYW1lIF0gPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogZGVjbGFyYXRpb24udHlwZSxcclxuICAgICAgICAgICAgICAgICAgICBmdW5jOiBVTklGT1JNX0ZVTkNUSU9OU1sgZGVjbGFyYXRpb24udHlwZSArIChkZWNsYXJhdGlvbi5jb3VudCA+IDEgPyAnW10nIDogJycpIF1cclxuICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgYXR0cmlidXRlczogYXR0cmlidXRlcyxcclxuICAgICAgICAgICAgdW5pZm9ybXM6IHVuaWZvcm1zXHJcbiAgICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICAvKlxyXG4gICAgICogR2l2ZW4gYSBzaGFkZXIgc291cmNlIHN0cmluZyBhbmQgc2hhZGVyIHR5cGUsIGNvbXBpbGVzIHRoZSBzaGFkZXIgYW5kXHJcbiAgICAgKiByZXR1cm5zIHRoZSByZXN1bHRpbmcgV2ViR0xTaGFkZXIgb2JqZWN0LlxyXG4gICAgICpcclxuICAgICAqIEBwYXJhbSB7V2ViR0xSZW5kZXJpbmdDb250ZXh0fSBnbCAtIFRoZSB3ZWJnbCByZW5kZXJpbmcgY29udGV4dC5cclxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBzaGFkZXJTb3VyY2UgLSBUaGUgc2hhZGVyIHNvdXJjZS5cclxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSB0eXBlIC0gVGhlIHNoYWRlciB0eXBlLlxyXG4gICAgICpcclxuICAgICAqIEByZXR1cm5zIHtXZWJHTFNoYWRlcn0gVGhlIGNvbXBpbGVkIHNoYWRlciBvYmplY3QuXHJcbiAgICAgKi9cclxuICAgIGZ1bmN0aW9uIGNvbXBpbGVTaGFkZXIoIGdsLCBzaGFkZXJTb3VyY2UsIHR5cGUgKSB7XHJcbiAgICAgICAgdmFyIHNoYWRlciA9IGdsLmNyZWF0ZVNoYWRlciggZ2xbIHR5cGUgXSApO1xyXG4gICAgICAgIGdsLnNoYWRlclNvdXJjZSggc2hhZGVyLCBzaGFkZXJTb3VyY2UgKTtcclxuICAgICAgICBnbC5jb21waWxlU2hhZGVyKCBzaGFkZXIgKTtcclxuICAgICAgICBpZiAoICFnbC5nZXRTaGFkZXJQYXJhbWV0ZXIoIHNoYWRlciwgZ2wuQ09NUElMRV9TVEFUVVMgKSApIHtcclxuICAgICAgICAgICAgY29uc29sZS5lcnJvciggJ0FuIGVycm9yIG9jY3VycmVkIGNvbXBpbGluZyB0aGUgc2hhZGVyczogJyArXHJcbiAgICAgICAgICAgICAgICBnbC5nZXRTaGFkZXJJbmZvTG9nKCBzaGFkZXIgKSApO1xyXG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHNoYWRlcjtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIEJpbmRzIHRoZSBhdHRyaWJ1dGUgbG9jYXRpb25zIGZvciB0aGUgU2hhZGVyIG9iamVjdC5cclxuICAgICAqXHJcbiAgICAgKiBAcGFyYW0ge1NoYWRlcn0gc2hhZGVyIC0gVGhlIFNoYWRlciBvYmplY3QuXHJcbiAgICAgKi9cclxuICAgIGZ1bmN0aW9uIGJpbmRBdHRyaWJ1dGVMb2NhdGlvbnMoIHNoYWRlciApIHtcclxuICAgICAgICB2YXIgZ2wgPSBzaGFkZXIuZ2wsXHJcbiAgICAgICAgICAgIGF0dHJpYnV0ZXMgPSBzaGFkZXIuYXR0cmlidXRlcyxcclxuICAgICAgICAgICAgbmFtZTtcclxuICAgICAgICBmb3IgKCBuYW1lIGluIGF0dHJpYnV0ZXMgKSB7XHJcbiAgICAgICAgICAgIGlmICggYXR0cmlidXRlcy5oYXNPd25Qcm9wZXJ0eSggbmFtZSApICkge1xyXG4gICAgICAgICAgICAgICAgLy8gYmluZCB0aGUgYXR0cmlidXRlIGxvY2F0aW9uXHJcbiAgICAgICAgICAgICAgICBnbC5iaW5kQXR0cmliTG9jYXRpb24oXHJcbiAgICAgICAgICAgICAgICAgICAgc2hhZGVyLnByb2dyYW0sXHJcbiAgICAgICAgICAgICAgICAgICAgYXR0cmlidXRlc1sgbmFtZSBdLmluZGV4LFxyXG4gICAgICAgICAgICAgICAgICAgIG5hbWUgKTtcclxuICAgICAgICAgICAgICAgIC8qXHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyggJ0JvdW5kIHZlcnRleCBhdHRyaWJ1dGUgXFxgJyArIG5hbWUgK1xyXG4gICAgICAgICAgICAgICAgICAgICdcXCcgdG8gbG9jYXRpb24gJyArIGF0dHJpYnV0ZXNbIG5hbWUgXS5pbmRleCApO1xyXG4gICAgICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIFF1ZXJpZXMgdGhlIHdlYmdsIHJlbmRlcmluZyBjb250ZXh0IGZvciB0aGUgdW5pZm9ybSBsb2NhdGlvbnMuXHJcbiAgICAgKlxyXG4gICAgICogQHBhcmFtIHtTaGFkZXJ9IHNoYWRlciAtIFRoZSBTaGFkZXIgb2JqZWN0LlxyXG4gICAgICovXHJcbiAgICBmdW5jdGlvbiBnZXRVbmlmb3JtTG9jYXRpb25zKCBzaGFkZXIgKSB7XHJcbiAgICAgICAgdmFyIGdsID0gc2hhZGVyLmdsLFxyXG4gICAgICAgICAgICB1bmlmb3JtcyA9IHNoYWRlci51bmlmb3JtcyxcclxuICAgICAgICAgICAgdW5pZm9ybSxcclxuICAgICAgICAgICAgbmFtZTtcclxuICAgICAgICBmb3IgKCBuYW1lIGluIHVuaWZvcm1zICkge1xyXG4gICAgICAgICAgICBpZiAoIHVuaWZvcm1zLmhhc093blByb3BlcnR5KCBuYW1lICkgKSB7XHJcbiAgICAgICAgICAgICAgICB1bmlmb3JtID0gdW5pZm9ybXNbIG5hbWUgXTtcclxuICAgICAgICAgICAgICAgIC8vIGdldCB0aGUgdW5pZm9ybSBsb2NhdGlvblxyXG4gICAgICAgICAgICAgICAgdW5pZm9ybS5sb2NhdGlvbiA9IGdsLmdldFVuaWZvcm1Mb2NhdGlvbiggc2hhZGVyLnByb2dyYW0sIG5hbWUgKTtcclxuICAgICAgICAgICAgICAgIC8qXHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyggbmFtZSArICcsICcgK1xyXG4gICAgICAgICAgICAgICAgICAgIGdsLmdldFVuaWZvcm1Mb2NhdGlvbiggc2hhZGVyLnByb2dyYW0sIG5hbWUgKSArICcsJyApO1xyXG4gICAgICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIFJldHVybnMgYSBmdW5jdGlvbiB0byBsb2FkIHNoYWRlciBzb3VyY2UgZnJvbSBhIHVybC5cclxuICAgICAqXHJcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gdXJsIC0gVGhlIHVybCB0byBsb2FkIHRoZSByZXNvdXJjZSBmcm9tLlxyXG4gICAgICpcclxuICAgICAqIEByZXR1cm5zIHtGdW5jdGlvbn0gVGhlIGZ1bmN0aW9uIHRvIGxvYWQgdGhlIHNoYWRlciBzb3VyY2UuXHJcbiAgICAgKi9cclxuICAgIGZ1bmN0aW9uIGxvYWRTaGFkZXJTb3VyY2UoIHVybCApIHtcclxuICAgICAgICByZXR1cm4gZnVuY3Rpb24oIGRvbmUgKSB7XHJcbiAgICAgICAgICAgIFhIUkxvYWRlci5sb2FkKFxyXG4gICAgICAgICAgICAgICAgdXJsLFxyXG4gICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlVHlwZTogJ3RleHQnLFxyXG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGRvbmUsXHJcbiAgICAgICAgICAgICAgICAgICAgZXJyb3I6IGZ1bmN0aW9uKGVycikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCBlcnIgKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZG9uZSggbnVsbCApO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBSZXR1cm5zIGEgZnVuY3Rpb24gdG8gcGFzcyB0aHJvdWdoIHRoZSBzaGFkZXIgc291cmNlLlxyXG4gICAgICpcclxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBzb3VyY2UgLSBUaGUgc291cmNlIG9mIHRoZSBzaGFkZXIuXHJcbiAgICAgKlxyXG4gICAgICogQHJldHVybnMge0Z1bmN0aW9ufSBUaGUgZnVuY3Rpb24gdG8gcGFzcyB0aHJvdWdoIHRoZSBzaGFkZXIgc291cmNlLlxyXG4gICAgICovXHJcbiAgICBmdW5jdGlvbiBwYXNzVGhyb3VnaFNvdXJjZSggc291cmNlICkge1xyXG4gICAgICAgIHJldHVybiBmdW5jdGlvbiggZG9uZSApIHtcclxuICAgICAgICAgICAgZG9uZSggc291cmNlICk7XHJcbiAgICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIFJldHVybnMgYSBmdW5jdGlvbiB0aGF0IHRha2VzIGFuIGFycmF5IG9mIEdMU0wgc291cmNlIHN0cmluZ3MgYW5kIFVSTHMsXHJcbiAgICAgKiBhbmQgcmVzb2x2ZXMgdGhlbSBpbnRvIGFuZCBhcnJheSBvZiBHTFNMIHNvdXJjZS5cclxuICAgICAqL1xyXG4gICAgZnVuY3Rpb24gcmVzb2x2ZVNvdXJjZXMoIHNvdXJjZXMgKSB7XHJcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKCBkb25lICkge1xyXG4gICAgICAgICAgICB2YXIgam9icyA9IFtdO1xyXG4gICAgICAgICAgICBzb3VyY2VzID0gc291cmNlcyB8fCBbXTtcclxuICAgICAgICAgICAgc291cmNlcyA9ICggISggc291cmNlcyBpbnN0YW5jZW9mIEFycmF5ICkgKSA/IFsgc291cmNlcyBdIDogc291cmNlcztcclxuICAgICAgICAgICAgc291cmNlcy5mb3JFYWNoKCBmdW5jdGlvbiggc291cmNlICkge1xyXG4gICAgICAgICAgICAgICAgaWYgKCBTaGFkZXJQYXJzZXIuaXNHTFNMKCBzb3VyY2UgKSApIHtcclxuICAgICAgICAgICAgICAgICAgICBqb2JzLnB1c2goIHBhc3NUaHJvdWdoU291cmNlKCBzb3VyY2UgKSApO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBqb2JzLnB1c2goIGxvYWRTaGFkZXJTb3VyY2UoIHNvdXJjZSApICk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICBVdGlsLmFzeW5jKCBqb2JzLCBmdW5jdGlvbiggcmVzdWx0cyApIHtcclxuICAgICAgICAgICAgICAgIGRvbmUoIHJlc3VsdHMgKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIEJpbmRzIHRoZSBzaGFkZXIgb2JqZWN0LCBjYWNoaW5nIGl0IHRvIHByZXZlbnQgdW5uZWNlc3NhcnkgcmViaW5kcy5cclxuICAgICAqXHJcbiAgICAgKiBAcGFyYW0ge1NoYWRlcn0gc2hhZGVyIC0gVGhlIFNoYWRlciBvYmplY3QgdG8gYmluZC5cclxuICAgICAqL1xyXG4gICAgZnVuY3Rpb24gYmluZCggc2hhZGVyICkge1xyXG4gICAgICAgIC8vIGlmIHRoaXMgc2hhZGVyIGlzIGFscmVhZHkgYm91bmQsIGV4aXQgZWFybHlcclxuICAgICAgICBpZiAoIF9ib3VuZFNoYWRlciA9PT0gc2hhZGVyICkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHNoYWRlci5nbC51c2VQcm9ncmFtKCBzaGFkZXIucHJvZ3JhbSApO1xyXG4gICAgICAgIF9ib3VuZFNoYWRlciA9IHNoYWRlcjtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIFVuYmluZHMgdGhlIHNoYWRlciBvYmplY3QuIFByZXZlbnRzIHVubmVjZXNzYXJ5IHVuYmluZGluZy5cclxuICAgICAqXHJcbiAgICAgKiBAcGFyYW0ge1NoYWRlcn0gc2hhZGVyIC0gVGhlIFNoYWRlciBvYmplY3QgdG8gdW5iaW5kLlxyXG4gICAgICovXHJcbiAgICBmdW5jdGlvbiB1bmJpbmQoIHNoYWRlciApIHtcclxuICAgICAgICAvLyBpZiB0aGVyZSBpcyBubyBzaGFkZXIgYm91bmQsIGV4aXQgZWFybHlcclxuICAgICAgICBpZiAoIF9ib3VuZFNoYWRlciA9PT0gbnVsbCApIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgICBzaGFkZXIuZ2wudXNlUHJvZ3JhbSggbnVsbCApO1xyXG4gICAgICAgIF9ib3VuZFNoYWRlciA9IG51bGw7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBDbGVhcnMgdGhlIHNoYWRlciBhdHRyaWJ1dGVzIGR1ZSB0byBhYm9ydGluZyBvZiBpbml0aWFsaXphdGlvbi5cclxuICAgICAqXHJcbiAgICAgKiBAcGFyYW0ge1NoYWRlcn0gc2hhZGVyIC0gVGhlIFNoYWRlciBvYmplY3QuXHJcbiAgICAgKi9cclxuICAgIGZ1bmN0aW9uIGFib3J0U2hhZGVyKCBzaGFkZXIgKSB7XHJcbiAgICAgICAgc2hhZGVyLnByb2dyYW0gPSBudWxsO1xyXG4gICAgICAgIHNoYWRlci5hdHRyaWJ1dGVzID0gbnVsbDtcclxuICAgICAgICBzaGFkZXIudW5pZm9ybXMgPSBudWxsO1xyXG4gICAgICAgIHJldHVybiBzaGFkZXI7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBJbnN0YW50aWF0ZXMgYSBTaGFkZXIgb2JqZWN0LlxyXG4gICAgICogQGNsYXNzIFNoYWRlclxyXG4gICAgICogQGNsYXNzZGVzYyBBIHNoYWRlciBjbGFzcyB0byBhc3Npc3QgaW4gY29tcGlsaW5nIGFuZCBsaW5raW5nIHdlYmdsXHJcbiAgICAgKiBzaGFkZXJzLCBzdG9yaW5nIGF0dHJpYnV0ZSBhbmQgdW5pZm9ybSBsb2NhdGlvbnMsIGFuZCBidWZmZXJpbmcgdW5pZm9ybXMuXHJcbiAgICAgKi9cclxuICAgIGZ1bmN0aW9uIFNoYWRlciggc3BlYywgY2FsbGJhY2sgKSB7XHJcbiAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xyXG4gICAgICAgIHNwZWMgPSBzcGVjIHx8IHt9O1xyXG4gICAgICAgIHRoaXMucHJvZ3JhbSA9IDA7XHJcbiAgICAgICAgdGhpcy5nbCA9IFdlYkdMQ29udGV4dC5nZXQoKTtcclxuICAgICAgICB0aGlzLnZlcnNpb24gPSBzcGVjLnZlcnNpb24gfHwgJzEuMDAnO1xyXG4gICAgICAgIC8vIGNoZWNrIHNvdXJjZSBhcmd1bWVudHNcclxuICAgICAgICBpZiAoICFzcGVjLnZlcnQgKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoICdWZXJ0ZXggc2hhZGVyIGFyZ3VtZW50IGhhcyBub3QgYmVlbiBwcm92aWRlZCwgJyArXHJcbiAgICAgICAgICAgICAgICAnc2hhZGVyIGluaXRpYWxpemF0aW9uIGFib3J0ZWQuJyApO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoICFzcGVjLmZyYWcgKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoICdGcmFnbWVudCBzaGFkZXIgYXJndW1lbnQgaGFzIG5vdCBiZWVuIHByb3ZpZGVkLCAnICtcclxuICAgICAgICAgICAgICAgICdzaGFkZXIgaW5pdGlhbGl6YXRpb24gYWJvcnRlZC4nICk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vIGNyZWF0ZSB0aGUgc2hhZGVyXHJcbiAgICAgICAgVXRpbC5hc3luYyh7XHJcbiAgICAgICAgICAgIGNvbW1vbjogcmVzb2x2ZVNvdXJjZXMoIHNwZWMuY29tbW9uICksXHJcbiAgICAgICAgICAgIHZlcnQ6IHJlc29sdmVTb3VyY2VzKCBzcGVjLnZlcnQgKSxcclxuICAgICAgICAgICAgZnJhZzogcmVzb2x2ZVNvdXJjZXMoIHNwZWMuZnJhZyApLFxyXG4gICAgICAgIH0sIGZ1bmN0aW9uKCBzaGFkZXJzICkge1xyXG4gICAgICAgICAgICB0aGF0LmNyZWF0ZSggc2hhZGVycyApO1xyXG4gICAgICAgICAgICBpZiAoIGNhbGxiYWNrICkge1xyXG4gICAgICAgICAgICAgICAgY2FsbGJhY2soIHRoYXQgKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQ3JlYXRlcyB0aGUgc2hhZGVyIG9iamVjdCBmcm9tIHNvdXJjZSBzdHJpbmdzLiBUaGlzIGluY2x1ZGVzOlxyXG4gICAgICogICAgMSkgQ29tcGlsaW5nIGFuZCBsaW5raW5nIHRoZSBzaGFkZXIgcHJvZ3JhbS5cclxuICAgICAqICAgIDIpIFBhcnNpbmcgc2hhZGVyIHNvdXJjZSBmb3IgYXR0cmlidXRlIGFuZCB1bmlmb3JtIGluZm9ybWF0aW9uLlxyXG4gICAgICogICAgMykgQmluZGluZyBhdHRyaWJ1dGUgbG9jYXRpb25zLCBieSBvcmRlciBvZiBkZWxjYXJhdGlvbi5cclxuICAgICAqICAgIDQpIFF1ZXJ5aW5nIGFuZCBzdG9yaW5nIHVuaWZvcm0gbG9jYXRpb24uXHJcbiAgICAgKiBAbWVtYmVyb2YgU2hhZGVyXHJcbiAgICAgKlxyXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHNoYWRlcnMgLSBBIG1hcCBjb250YWluaW5nIHNvdXJjZXMgdW5kZXIgJ3ZlcnQnIGFuZFxyXG4gICAgICogICAgICdmcmFnJyBhdHRyaWJ1dGVzLlxyXG4gICAgICpcclxuICAgICAqIEByZXR1cm5zIHtTaGFkZXJ9IFRoZSBzaGFkZXIgb2JqZWN0LCBmb3IgY2hhaW5pbmcuXHJcbiAgICAgKi9cclxuICAgIFNoYWRlci5wcm90b3R5cGUuY3JlYXRlID0gZnVuY3Rpb24oIHNoYWRlcnMgKSB7XHJcbiAgICAgICAgLy8gb25jZSBhbGwgc2hhZGVyIHNvdXJjZXMgYXJlIGxvYWRlZFxyXG4gICAgICAgIHZhciBnbCA9IHRoaXMuZ2wsXHJcbiAgICAgICAgICAgIGNvbW1vbiA9IHNoYWRlcnMuY29tbW9uLmpvaW4oICcnICksXHJcbiAgICAgICAgICAgIHZlcnQgPSBzaGFkZXJzLnZlcnQuam9pbiggJycgKSxcclxuICAgICAgICAgICAgZnJhZyA9IHNoYWRlcnMuZnJhZy5qb2luKCAnJyApLFxyXG4gICAgICAgICAgICB2ZXJ0ZXhTaGFkZXIsXHJcbiAgICAgICAgICAgIGZyYWdtZW50U2hhZGVyLFxyXG4gICAgICAgICAgICBhdHRyaWJ1dGVzQW5kVW5pZm9ybXM7XHJcbiAgICAgICAgLy8gY29tcGlsZSBzaGFkZXJzXHJcbiAgICAgICAgdmVydGV4U2hhZGVyID0gY29tcGlsZVNoYWRlciggZ2wsIGNvbW1vbiArIHZlcnQsICdWRVJURVhfU0hBREVSJyApO1xyXG4gICAgICAgIGZyYWdtZW50U2hhZGVyID0gY29tcGlsZVNoYWRlciggZ2wsIGNvbW1vbiArIGZyYWcsICdGUkFHTUVOVF9TSEFERVInICk7XHJcbiAgICAgICAgaWYgKCAhdmVydGV4U2hhZGVyIHx8ICFmcmFnbWVudFNoYWRlciApIHtcclxuICAgICAgICAgICAgY29uc29sZS5lcnJvciggJ0Fib3J0aW5nIGluc3RhbnRpYXRpb24gb2Ygc2hhZGVyIGR1ZSB0byBjb21waWxhdGlvbiBlcnJvcnMuJyApO1xyXG4gICAgICAgICAgICByZXR1cm4gYWJvcnRTaGFkZXIoIHRoaXMgKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgLy8gcGFyc2Ugc291cmNlIGZvciBhdHRyaWJ1dGUgYW5kIHVuaWZvcm1zXHJcbiAgICAgICAgYXR0cmlidXRlc0FuZFVuaWZvcm1zID0gZ2V0QXR0cmlidXRlc0FuZFVuaWZvcm1zRnJvbVNvdXJjZSggdmVydCwgZnJhZyApO1xyXG4gICAgICAgIC8vIHNldCBtZW1iZXIgYXR0cmlidXRlc1xyXG4gICAgICAgIHRoaXMuYXR0cmlidXRlcyA9IGF0dHJpYnV0ZXNBbmRVbmlmb3Jtcy5hdHRyaWJ1dGVzO1xyXG4gICAgICAgIHRoaXMudW5pZm9ybXMgPSBhdHRyaWJ1dGVzQW5kVW5pZm9ybXMudW5pZm9ybXM7XHJcbiAgICAgICAgLy8gY3JlYXRlIHRoZSBzaGFkZXIgcHJvZ3JhbVxyXG4gICAgICAgIHRoaXMucHJvZ3JhbSA9IGdsLmNyZWF0ZVByb2dyYW0oKTtcclxuICAgICAgICAvLyBhdHRhY2ggdmVydGV4IGFuZCBmcmFnbWVudCBzaGFkZXJzXHJcbiAgICAgICAgZ2wuYXR0YWNoU2hhZGVyKCB0aGlzLnByb2dyYW0sIHZlcnRleFNoYWRlciApO1xyXG4gICAgICAgIGdsLmF0dGFjaFNoYWRlciggdGhpcy5wcm9ncmFtLCBmcmFnbWVudFNoYWRlciApO1xyXG4gICAgICAgIC8vIGJpbmQgdmVydGV4IGF0dHJpYnV0ZSBsb2NhdGlvbnMgQkVGT1JFIGxpbmtpbmdcclxuICAgICAgICBiaW5kQXR0cmlidXRlTG9jYXRpb25zKCB0aGlzICk7XHJcbiAgICAgICAgLy8gbGluayBzaGFkZXJcclxuICAgICAgICBnbC5saW5rUHJvZ3JhbSggdGhpcy5wcm9ncmFtICk7XHJcbiAgICAgICAgLy8gSWYgY3JlYXRpbmcgdGhlIHNoYWRlciBwcm9ncmFtIGZhaWxlZCwgYWxlcnRcclxuICAgICAgICBpZiAoICFnbC5nZXRQcm9ncmFtUGFyYW1ldGVyKCB0aGlzLnByb2dyYW0sIGdsLkxJTktfU1RBVFVTICkgKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoICdBbiBlcnJvciBvY2N1cmVkIGxpbmtpbmcgdGhlIHNoYWRlcjogJyArXHJcbiAgICAgICAgICAgICAgICBnbC5nZXRQcm9ncmFtSW5mb0xvZyggdGhpcy5wcm9ncmFtICkgKTtcclxuICAgICAgICAgICAgY29uc29sZS5lcnJvciggJ0Fib3J0aW5nIGluc3RhbnRpYXRpb24gb2Ygc2hhZGVyIGR1ZSB0byBsaW5raW5nIGVycm9ycy4nICk7XHJcbiAgICAgICAgICAgIHJldHVybiBhYm9ydFNoYWRlciggdGhpcyApO1xyXG4gICAgICAgIH1cclxuICAgICAgICAvLyBnZXQgc2hhZGVyIHVuaWZvcm0gbG9jYXRpb25zXHJcbiAgICAgICAgZ2V0VW5pZm9ybUxvY2F0aW9ucyggdGhpcyApO1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfTtcclxuXHJcbiAgICAvKipcclxuICAgICAqIEJpbmRzIHRoZSBzaGFkZXIgb2JqZWN0IGFuZCBwdXNoZXMgaXQgdG8gdGhlIGZyb250IG9mIHRoZSBzdGFjay5cclxuICAgICAqIEBtZW1iZXJvZiBTaGFkZXJcclxuICAgICAqXHJcbiAgICAgKiBAcmV0dXJucyB7U2hhZGVyfSBUaGUgc2hhZGVyIG9iamVjdCwgZm9yIGNoYWluaW5nLlxyXG4gICAgICovXHJcbiAgICBTaGFkZXIucHJvdG90eXBlLnB1c2ggPSBmdW5jdGlvbigpIHtcclxuICAgICAgICBfc3RhY2sucHVzaCggdGhpcyApO1xyXG4gICAgICAgIGJpbmQoIHRoaXMgKTtcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH07XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBVbmJpbmRzIHRoZSBzaGFkZXIgb2JqZWN0IGFuZCBiaW5kcyB0aGUgc2hhZGVyIGJlbmVhdGggaXQgb25cclxuICAgICAqIHRoaXMgc3RhY2suIElmIHRoZXJlIGlzIG5vIHVuZGVybHlpbmcgc2hhZGVyLCBiaW5kIHRoZSBiYWNrYnVmZmVyLlxyXG4gICAgICogQG1lbWJlcm9mIFNoYWRlclxyXG4gICAgICpcclxuICAgICAqIEByZXR1cm5zIHtTaGFkZXJ9IFRoZSBzaGFkZXIgb2JqZWN0LCBmb3IgY2hhaW5pbmcuXHJcbiAgICAgKi9cclxuICAgIFNoYWRlci5wcm90b3R5cGUucG9wID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgdmFyIHRvcDtcclxuICAgICAgICBfc3RhY2sucG9wKCk7XHJcbiAgICAgICAgdG9wID0gX3N0YWNrLnRvcCgpO1xyXG4gICAgICAgIGlmICggdG9wICkge1xyXG4gICAgICAgICAgICBiaW5kKCB0b3AgKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB1bmJpbmQoIHRoaXMgKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9O1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogQnVmZmVyIGEgdW5pZm9ybSB2YWx1ZSBieSBuYW1lLlxyXG4gICAgICogQG1lbWJlcm9mIFNoYWRlclxyXG4gICAgICpcclxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSB1bmlmb3JtTmFtZSAtIFRoZSB1bmlmb3JtIG5hbWUgaW4gdGhlIHNoYWRlciBzb3VyY2UuXHJcbiAgICAgKiBAcGFyYW0geyp9IHVuaWZvcm0gLSBUaGUgdW5pZm9ybSB2YWx1ZSB0byBidWZmZXIuXHJcbiAgICAgKlxyXG4gICAgICogQHJldHVybnMge1NoYWRlcn0gVGhlIHNoYWRlciBvYmplY3QsIGZvciBjaGFpbmluZy5cclxuICAgICAqL1xyXG4gICAgU2hhZGVyLnByb3RvdHlwZS5zZXRVbmlmb3JtID0gZnVuY3Rpb24oIHVuaWZvcm1OYW1lLCB1bmlmb3JtICkge1xyXG4gICAgICAgIGlmICggIXRoaXMucHJvZ3JhbSApIHtcclxuICAgICAgICAgICAgaWYgKCAhdGhpcy5oYXNMb2dnZWRFcnJvciApIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybiggJ0F0dGVtcHRpbmcgdG8gdXNlIGFuIGluY29tcGxldGUgc2hhZGVyLCBjb21tYW5kIGlnbm9yZWQuJyApO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5oYXNMb2dnZWRFcnJvciA9IHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoIHRoaXMgIT09IF9ib3VuZFNoYWRlciApIHtcclxuICAgICAgICAgICAgY29uc29sZS53YXJuKCAnQXR0ZW1wdGluZyB0byBzZXQgdW5pZm9ybSBgJyArIHVuaWZvcm1OYW1lICtcclxuICAgICAgICAgICAgICAgICdgIGZvciBhbiB1bmJvdW5kIHNoYWRlciwgY29tbWFuZCBpZ25vcmVkLicgKTtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgdW5pZm9ybVNwZWMgPSB0aGlzLnVuaWZvcm1zWyB1bmlmb3JtTmFtZSBdLFxyXG4gICAgICAgICAgICBmdW5jLFxyXG4gICAgICAgICAgICB0eXBlLFxyXG4gICAgICAgICAgICBsb2NhdGlvbixcclxuICAgICAgICAgICAgdmFsdWU7XHJcbiAgICAgICAgLy8gZW5zdXJlIHRoYXQgdGhlIHVuaWZvcm0gc3BlYyBleGlzdHMgZm9yIHRoZSBuYW1lXHJcbiAgICAgICAgaWYgKCAhdW5pZm9ybVNwZWMgKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUud2FybiggJ05vIHVuaWZvcm0gZm91bmQgdW5kZXIgbmFtZSBgJyArIHVuaWZvcm1OYW1lICtcclxuICAgICAgICAgICAgICAgICdgLCBjb21tYW5kIGlnbm9yZWQuJyApO1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vIGVuc3VyZSB0aGF0IHRoZSB1bmlmb3JtIGFyZ3VtZW50IGlzIGRlZmluZWRcclxuICAgICAgICBpZiAoIHVuaWZvcm0gPT09IHVuZGVmaW5lZCApIHtcclxuICAgICAgICAgICAgY29uc29sZS53YXJuKCAnQXJndW1lbnQgcGFzc2VkIGZvciB1bmlmb3JtIGAnICsgdW5pZm9ybU5hbWUgK1xyXG4gICAgICAgICAgICAgICAgJ2AgaXMgdW5kZWZpbmVkLCBjb21tYW5kIGlnbm9yZWQuJyApO1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vIGdldCB0aGUgdW5pZm9ybSBsb2NhdGlvbiwgdHlwZSwgYW5kIGJ1ZmZlciBmdW5jdGlvblxyXG4gICAgICAgIGZ1bmMgPSB1bmlmb3JtU3BlYy5mdW5jO1xyXG4gICAgICAgIHR5cGUgPSB1bmlmb3JtU3BlYy50eXBlO1xyXG4gICAgICAgIGxvY2F0aW9uID0gdW5pZm9ybVNwZWMubG9jYXRpb247XHJcbiAgICAgICAgdmFsdWUgPSB1bmlmb3JtLnRvQXJyYXkgPyB1bmlmb3JtLnRvQXJyYXkoKSA6IHVuaWZvcm07XHJcbiAgICAgICAgdmFsdWUgPSAoIHZhbHVlIGluc3RhbmNlb2YgQXJyYXkgKSA/IG5ldyBGbG9hdDMyQXJyYXkoIHZhbHVlICkgOiB2YWx1ZTtcclxuICAgICAgICAvLyBjb252ZXJ0IGJvb2xlYW4ncyB0byAwIG9yIDFcclxuICAgICAgICB2YWx1ZSA9ICggdHlwZW9mIHZhbHVlID09PSAnYm9vbGVhbicgKSA/ICggdmFsdWUgPyAxIDogMCApIDogdmFsdWU7XHJcbiAgICAgICAgLy8gcGFzcyB0aGUgYXJndW1lbnRzIGRlcGVuZGluZyBvbiB0aGUgdHlwZVxyXG4gICAgICAgIHN3aXRjaCAoIHR5cGUgKSB7XHJcbiAgICAgICAgICAgIGNhc2UgJ21hdDInOlxyXG4gICAgICAgICAgICBjYXNlICdtYXQzJzpcclxuICAgICAgICAgICAgY2FzZSAnbWF0NCc6XHJcbiAgICAgICAgICAgICAgICB0aGlzLmdsWyBmdW5jIF0oIGxvY2F0aW9uLCBmYWxzZSwgdmFsdWUgKTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgdGhpcy5nbFsgZnVuYyBdKCBsb2NhdGlvbiwgdmFsdWUgKTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH07XHJcblxyXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBTaGFkZXI7XHJcblxyXG59KCkpO1xyXG4iLCIoZnVuY3Rpb24gKCkge1xyXG5cclxuICAgICd1c2Ugc3RyaWN0JztcclxuXHJcbiAgICB2YXIgUFJFQ0lTSU9OX1FVQUxJRklFUlMgPSB7XHJcbiAgICAgICAgaGlnaHA6IHRydWUsXHJcbiAgICAgICAgbWVkaXVtcDogdHJ1ZSxcclxuICAgICAgICBsb3dwOiB0cnVlXHJcbiAgICB9O1xyXG5cclxuICAgIHZhciBQUkVDSVNJT05fVFlQRVMgPSB7XHJcbiAgICAgICAgZmxvYXQ6ICdmbG9hdCcsXHJcbiAgICAgICAgdmVjMjogJ2Zsb2F0JyxcclxuICAgICAgICB2ZWMzOiAnZmxvYXQnLFxyXG4gICAgICAgIHZlYzQ6ICdmbG9hdCcsXHJcbiAgICAgICAgaXZlYzI6ICdpbnQnLFxyXG4gICAgICAgIGl2ZWMzOiAnaW50JyxcclxuICAgICAgICBpdmVjNDogJ2ludCcsXHJcbiAgICAgICAgaW50OiAnaW50JyxcclxuICAgICAgICB1aW50OiAnaW50JyxcclxuICAgICAgICBzYW1wbGVyMkQ6ICdzYW1wbGVyMkQnLFxyXG4gICAgICAgIHNhbXBsZXJDdWJlOiAnc2FtcGxlckN1YmUnLFxyXG4gICAgfTtcclxuXHJcbiAgICB2YXIgQ09NTUVOVFNfUkVHRVhQID0gLyhcXC9cXCooW1xcc1xcU10qPylcXCpcXC8pfChcXC9cXC8oLiopJCkvZ207XHJcbiAgICB2YXIgRU5ETElORV9SRUdFWFAgPSAvKFxcclxcbnxcXG58XFxyKS9nbTtcclxuICAgIHZhciBXSElURVNQQUNFX1JFR0VYUCA9IC9cXHN7Mix9L2c7XHJcbiAgICB2YXIgQlJBQ0tFVF9XSElURVNQQUNFX1JFR0VYUCA9IC8oXFxzKikoXFxbKShcXHMqKShcXGQrKShcXHMqKShcXF0pKFxccyopL2c7XHJcbiAgICB2YXIgTkFNRV9DT1VOVF9SRUdFWFAgPSAvKFthLXpBLVpfXVthLXpBLVowLTlfXSopKD86XFxbKFxcZCspXFxdKT8vO1xyXG4gICAgdmFyIFBSRUNJU0lPTl9SRUdFWCA9IC9cXGIocHJlY2lzaW9uKVxccysoXFx3KylcXHMrKFxcdyspLztcclxuICAgIHZhciBHTFNMX1JFR0VYUCA9ICAvdm9pZFxccyttYWluXFxzKlxcKFxccypcXClcXHMqL21pO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogUmVtb3ZlcyBzdGFuZGFyZCBjb21tZW50cyBmcm9tIHRoZSBwcm92aWRlZCBzdHJpbmcuXHJcbiAgICAgKlxyXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHN0ciAtIFRoZSBzdHJpbmcgdG8gc3RyaXAgY29tbWVudHMgZnJvbS5cclxuICAgICAqXHJcbiAgICAgKiBAcmV0dXJuIHtTdHJpbmd9IFRoZSBjb21tZW50bGVzcyBzdHJpbmcuXHJcbiAgICAgKi9cclxuICAgIGZ1bmN0aW9uIHN0cmlwQ29tbWVudHMoIHN0ciApIHtcclxuICAgICAgICAvLyByZWdleCBzb3VyY2U6IGh0dHBzOi8vZ2l0aHViLmNvbS9tb2Fncml1cy9zdHJpcGNvbW1lbnRzXHJcbiAgICAgICAgcmV0dXJuIHN0ci5yZXBsYWNlKCBDT01NRU5UU19SRUdFWFAsICcnICk7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBDb252ZXJ0cyBhbGwgd2hpdGVzcGFjZSBpbnRvIGEgc2luZ2xlICcgJyBzcGFjZSBjaGFyYWN0ZXIuXHJcbiAgICAgKlxyXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHN0ciAtIFRoZSBzdHJpbmcgdG8gbm9ybWFsaXplIHdoaXRlc3BhY2UgZnJvbS5cclxuICAgICAqXHJcbiAgICAgKiBAcmV0dXJuIHtTdHJpbmd9IFRoZSBub3JtYWxpemVkIHN0cmluZy5cclxuICAgICAqL1xyXG4gICAgZnVuY3Rpb24gbm9ybWFsaXplV2hpdGVzcGFjZSggc3RyICkge1xyXG4gICAgICAgIHJldHVybiBzdHIucmVwbGFjZSggRU5ETElORV9SRUdFWFAsICcgJyApIC8vIHJlbW92ZSBsaW5lIGVuZGluZ3NcclxuICAgICAgICAgICAgLnJlcGxhY2UoIFdISVRFU1BBQ0VfUkVHRVhQLCAnICcgKSAvLyBub3JtYWxpemUgd2hpdGVzcGFjZSB0byBzaW5nbGUgJyAnXHJcbiAgICAgICAgICAgIC5yZXBsYWNlKCBCUkFDS0VUX1dISVRFU1BBQ0VfUkVHRVhQLCAnJDIkNCQ2JyApOyAvLyByZW1vdmUgd2hpdGVzcGFjZSBpbiBicmFja2V0c1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogUGFyc2VzIHRoZSBuYW1lIGFuZCBjb3VudCBvdXQgb2YgYSBuYW1lIHN0YXRlbWVudCwgcmV0dXJuaW5nIHRoZVxyXG4gICAgICogZGVjbGFyYXRpb24gb2JqZWN0LlxyXG4gICAgICpcclxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBxdWFsaWZpZXIgLSBUaGUgcXVhbGlmaWVyIHN0cmluZy5cclxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBwcmVjaXNpb24gLSBUaGUgcHJlY2lzaW9uIHN0cmluZy5cclxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSB0eXBlIC0gVGhlIHR5cGUgc3RyaW5nLlxyXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGVudHJ5IC0gVGhlIHZhcmlhYmxlIGRlY2xhcmF0aW9uIHN0cmluZy5cclxuICAgICAqL1xyXG4gICAgZnVuY3Rpb24gcGFyc2VOYW1lQW5kQ291bnQoIHF1YWxpZmllciwgcHJlY2lzaW9uLCB0eXBlLCBlbnRyeSApIHtcclxuICAgICAgICAvLyBkZXRlcm1pbmUgbmFtZSBhbmQgc2l6ZSBvZiB2YXJpYWJsZVxyXG4gICAgICAgIHZhciBtYXRjaGVzID0gZW50cnkubWF0Y2goIE5BTUVfQ09VTlRfUkVHRVhQICk7XHJcbiAgICAgICAgdmFyIG5hbWUgPSBtYXRjaGVzWzFdO1xyXG4gICAgICAgIHZhciBjb3VudCA9ICggbWF0Y2hlc1syXSA9PT0gdW5kZWZpbmVkICkgPyAxIDogcGFyc2VJbnQoIG1hdGNoZXNbMl0sIDEwICk7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgcXVhbGlmaWVyOiBxdWFsaWZpZXIsXHJcbiAgICAgICAgICAgIHByZWNpc2lvbjogcHJlY2lzaW9uLFxyXG4gICAgICAgICAgICB0eXBlOiB0eXBlLFxyXG4gICAgICAgICAgICBuYW1lOiBuYW1lLFxyXG4gICAgICAgICAgICBjb3VudDogY291bnRcclxuICAgICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogUGFyc2VzIGEgc2luZ2xlICdzdGF0ZW1lbnQnLiBBICdzdGF0ZW1lbnQnIGlzIGNvbnNpZGVyZWQgYW55IHNlcXVlbmNlIG9mXHJcbiAgICAgKiBjaGFyYWN0ZXJzIGZvbGxvd2VkIGJ5IGEgc2VtaS1jb2xvbi4gVGhlcmVmb3JlLCBhIHNpbmdsZSAnc3RhdGVtZW50JyBpblxyXG4gICAgICogdGhpcyBzZW5zZSBjb3VsZCBjb250YWluIHNldmVyYWwgY29tbWEgc2VwYXJhdGVkIGRlY2xhcmF0aW9ucy4gUmV0dXJuc1xyXG4gICAgICogYWxsIHJlc3VsdGluZyBkZWNsYXJhdGlvbnMuXHJcbiAgICAgKlxyXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHN0YXRlbWVudCAtIFRoZSBzdGF0ZW1lbnQgdG8gcGFyc2UuXHJcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcHJlY2lzaW9ucyAtIFRoZSBjdXJyZW50IHN0YXRlIG9mIGdsb2JhbCBwcmVjaXNpb25zLlxyXG4gICAgICpcclxuICAgICAqIEByZXR1cm5zIHtBcnJheX0gVGhlIGFycmF5IG9mIHBhcnNlZCBkZWNsYXJhdGlvbiBvYmplY3RzLlxyXG4gICAgICovXHJcbiAgICBmdW5jdGlvbiBwYXJzZVN0YXRlbWVudCggc3RhdGVtZW50LCBwcmVjaXNpb25zICkge1xyXG4gICAgICAgIC8vIHNwbGl0IHN0YXRlbWVudCBvbiBjb21tYXNcclxuICAgICAgICAvL1xyXG4gICAgICAgIC8vIFsgJ3VuaWZvcm0gaGlnaHAgbWF0NCBBWzEwXScsICdCJywgJ0NbMl0nIF1cclxuICAgICAgICAvL1xyXG4gICAgICAgIHZhciBjb21tYVNwbGl0ID0gc3RhdGVtZW50LnNwbGl0KCcsJykubWFwKCBmdW5jdGlvbiggZWxlbSApIHtcclxuICAgICAgICAgICAgcmV0dXJuIGVsZW0udHJpbSgpO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvLyBzcGxpdCBkZWNsYXJhdGlvbiBoZWFkZXIgZnJvbSBzdGF0ZW1lbnRcclxuICAgICAgICAvL1xyXG4gICAgICAgIC8vIFsgJ3VuaWZvcm0nLCAnaGlnaHAnLCAnbWF0NCcsICdBWzEwXScgXVxyXG4gICAgICAgIC8vXHJcbiAgICAgICAgdmFyIGhlYWRlciA9IGNvbW1hU3BsaXQuc2hpZnQoKS5zcGxpdCgnICcpO1xyXG5cclxuICAgICAgICAvLyBxdWFsaWZpZXIgaXMgYWx3YXlzIGZpcnN0IGVsZW1lbnRcclxuICAgICAgICAvL1xyXG4gICAgICAgIC8vICd1bmlmb3JtJ1xyXG4gICAgICAgIC8vXHJcbiAgICAgICAgdmFyIHF1YWxpZmllciA9IGhlYWRlci5zaGlmdCgpO1xyXG5cclxuICAgICAgICAvLyBwcmVjaXNpb24gbWF5IG9yIG1heSBub3QgYmUgZGVjbGFyZWRcclxuICAgICAgICAvL1xyXG4gICAgICAgIC8vICdoaWdocCcgfHwgKGlmIGl0IHdhcyBvbWl0ZWQpICdtYXQ0J1xyXG4gICAgICAgIC8vXHJcbiAgICAgICAgdmFyIHByZWNpc2lvbiA9IGhlYWRlci5zaGlmdCgpO1xyXG4gICAgICAgIHZhciB0eXBlO1xyXG4gICAgICAgIC8vIGlmIG5vdCBhIHByZWNpc2lvbiBrZXl3b3JkIGl0IGlzIHRoZSB0eXBlIGluc3RlYWRcclxuICAgICAgICBpZiAoICFQUkVDSVNJT05fUVVBTElGSUVSU1sgcHJlY2lzaW9uIF0gKSB7XHJcbiAgICAgICAgICAgIHR5cGUgPSBwcmVjaXNpb247XHJcbiAgICAgICAgICAgIHByZWNpc2lvbiA9IHByZWNpc2lvbnNbIFBSRUNJU0lPTl9UWVBFU1sgdHlwZSBdIF07XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdHlwZSA9IGhlYWRlci5zaGlmdCgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gbGFzdCBwYXJ0IG9mIGhlYWRlciB3aWxsIGJlIHRoZSBmaXJzdCwgYW5kIHBvc3NpYmxlIG9ubHkgdmFyaWFibGUgbmFtZVxyXG4gICAgICAgIC8vXHJcbiAgICAgICAgLy8gWyAnQVsxMF0nLCAnQicsICdDWzJdJyBdXHJcbiAgICAgICAgLy9cclxuICAgICAgICB2YXIgbmFtZXMgPSBoZWFkZXIuY29uY2F0KCBjb21tYVNwbGl0ICk7XHJcbiAgICAgICAgLy8gaWYgdGhlcmUgYXJlIG90aGVyIG5hbWVzIGFmdGVyIGEgJywnIGFkZCB0aGVtIGFzIHdlbGxcclxuICAgICAgICB2YXIgcmVzdWx0cyA9IFtdO1xyXG4gICAgICAgIG5hbWVzLmZvckVhY2goIGZ1bmN0aW9uKCBuYW1lICkge1xyXG4gICAgICAgICAgICByZXN1bHRzLnB1c2goIHBhcnNlTmFtZUFuZENvdW50KCBxdWFsaWZpZXIsIHByZWNpc2lvbiwgdHlwZSwgbmFtZSApICk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgcmV0dXJuIHJlc3VsdHM7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBTcGxpdHMgdGhlIHNvdXJjZSBzdHJpbmcgYnkgc2VtaS1jb2xvbnMgYW5kIGNvbnN0cnVjdHMgYW4gYXJyYXkgb2ZcclxuICAgICAqIGRlY2xhcmF0aW9uIG9iamVjdHMgYmFzZWQgb24gdGhlIHByb3ZpZGVkIHF1YWxpZmllciBrZXl3b3Jkcy5cclxuICAgICAqXHJcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gc291cmNlIC0gVGhlIHNoYWRlciBzb3VyY2Ugc3RyaW5nLlxyXG4gICAgICogQHBhcmFtIHtTdHJpbmd8QXJyYXl9IGtleXdvcmRzIC0gVGhlIHF1YWxpZmllciBkZWNsYXJhdGlvbiBrZXl3b3Jkcy5cclxuICAgICAqXHJcbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9IFRoZSBhcnJheSBvZiBxdWFsaWZpZXIgZGVjbGFyYXRpb24gb2JqZWN0cy5cclxuICAgICAqL1xyXG4gICAgZnVuY3Rpb24gcGFyc2VTb3VyY2UoIHNvdXJjZSwga2V5d29yZHMgKSB7XHJcbiAgICAgICAgLy8gcmVtb3ZlIGFsbCBjb21tZW50cyBmcm9tIHNvdXJjZVxyXG4gICAgICAgIHZhciBjb21tZW50bGVzc1NvdXJjZSA9IHN0cmlwQ29tbWVudHMoIHNvdXJjZSApO1xyXG4gICAgICAgIC8vIG5vcm1hbGl6ZSBhbGwgd2hpdGVzcGFjZSBpbiB0aGUgc291cmNlXHJcbiAgICAgICAgdmFyIG5vcm1hbGl6ZWQgPSBub3JtYWxpemVXaGl0ZXNwYWNlKCBjb21tZW50bGVzc1NvdXJjZSApO1xyXG4gICAgICAgIC8vIGdldCBpbmRpdmlkdWFsIHN0YXRlbWVudHMgKCBhbnkgc2VxdWVuY2UgZW5kaW5nIGluIDsgKVxyXG4gICAgICAgIHZhciBzdGF0ZW1lbnRzID0gbm9ybWFsaXplZC5zcGxpdCgnOycpO1xyXG4gICAgICAgIC8vIGJ1aWxkIHJlZ2V4IGZvciBwYXJzaW5nIHN0YXRlbWVudHMgd2l0aCB0YXJnZXR0ZWQga2V5d29yZHNcclxuICAgICAgICB2YXIga2V5d29yZFN0ciA9IGtleXdvcmRzLmpvaW4oJ3wnKTtcclxuICAgICAgICB2YXIga2V5d29yZFJlZ2V4ID0gbmV3IFJlZ0V4cCggJy4qXFxcXGIoJyArIGtleXdvcmRTdHIgKyAnKVxcXFxiLionICk7XHJcbiAgICAgICAgLy8gcGFyc2UgYW5kIHN0b3JlIGdsb2JhbCBwcmVjaXNpb24gc3RhdGVtZW50cyBhbmQgYW55IGRlY2xhcmF0aW9uc1xyXG4gICAgICAgIHZhciBwcmVjaXNpb25zID0ge307XHJcbiAgICAgICAgdmFyIG1hdGNoZWQgPSBbXTtcclxuICAgICAgICAvLyBmb3IgZWFjaCBzdGF0ZW1lbnRcclxuICAgICAgICBzdGF0ZW1lbnRzLmZvckVhY2goIGZ1bmN0aW9uKCBzdGF0ZW1lbnQgKSB7XHJcbiAgICAgICAgICAgIC8vIGNoZWNrIGlmIHByZWNpc2lvbiBzdGF0ZW1lbnRcclxuICAgICAgICAgICAgLy9cclxuICAgICAgICAgICAgLy8gWyAncHJlY2lzaW9uIGhpZ2hwIGZsb2F0JywgJ3ByZWNpc2lvbicsICdoaWdocCcsICdmbG9hdCcgXVxyXG4gICAgICAgICAgICAvL1xyXG4gICAgICAgICAgICB2YXIgcG1hdGNoID0gc3RhdGVtZW50Lm1hdGNoKCBQUkVDSVNJT05fUkVHRVggKTtcclxuICAgICAgICAgICAgaWYgKCBwbWF0Y2ggKSB7XHJcbiAgICAgICAgICAgICAgICBwcmVjaXNpb25zWyBwbWF0Y2hbM10gXSA9IHBtYXRjaFsyXTtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAvLyBjaGVjayBmb3Iga2V5d29yZHNcclxuICAgICAgICAgICAgLy9cclxuICAgICAgICAgICAgLy8gWyAndW5pZm9ybSBmbG9hdCB0aW1lJyBdXHJcbiAgICAgICAgICAgIC8vXHJcbiAgICAgICAgICAgIHZhciBrbWF0Y2ggPSBzdGF0ZW1lbnQubWF0Y2goIGtleXdvcmRSZWdleCApO1xyXG4gICAgICAgICAgICBpZiAoIGttYXRjaCApIHtcclxuICAgICAgICAgICAgICAgIC8vIHBhcnNlIHN0YXRlbWVudCBhbmQgYWRkIHRvIGFycmF5XHJcbiAgICAgICAgICAgICAgICBtYXRjaGVkID0gbWF0Y2hlZC5jb25jYXQoIHBhcnNlU3RhdGVtZW50KCBrbWF0Y2hbMF0sIHByZWNpc2lvbnMgKSApO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgcmV0dXJuIG1hdGNoZWQ7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBGaWx0ZXJzIG91dCBkdXBsaWNhdGUgZGVjbGFyYXRpb25zIHByZXNlbnQgYmV0d2VlbiBzaGFkZXJzLlxyXG4gICAgICpcclxuICAgICAqIEBwYXJhbSB7QXJyYXl9IGRlY2xhcmF0aW9ucyAtIFRoZSBhcnJheSBvZiBkZWNsYXJhdGlvbnMuXHJcbiAgICAgKlxyXG4gICAgICogQHJldHVybnMge0FycmF5fSBUaGUgZmlsdGVyZWQgYXJyYXkgb2YgZGVjbGFyYXRpb25zLlxyXG4gICAgICovXHJcbiAgICBmdW5jdGlvbiBmaWx0ZXJEdXBsaWNhdGVzQnlOYW1lKCBkZWNsYXJhdGlvbnMgKSB7XHJcbiAgICAgICAgLy8gaW4gY2FzZXMgd2hlcmUgdGhlIHNhbWUgZGVjbGFyYXRpb25zIGFyZSBwcmVzZW50IGluIG11bHRpcGxlXHJcbiAgICAgICAgLy8gc291cmNlcywgdGhpcyBmdW5jdGlvbiB3aWxsIHJlbW92ZSBkdXBsaWNhdGVzIGZyb20gdGhlIHJlc3VsdHNcclxuICAgICAgICB2YXIgc2VlbiA9IHt9O1xyXG4gICAgICAgIHJldHVybiBkZWNsYXJhdGlvbnMuZmlsdGVyKCBmdW5jdGlvbiggZGVjbGFyYXRpb24gKSB7XHJcbiAgICAgICAgICAgIGlmICggc2VlblsgZGVjbGFyYXRpb24ubmFtZSBdICkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHNlZW5bIGRlY2xhcmF0aW9uLm5hbWUgXSA9IHRydWU7XHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIG1vZHVsZS5leHBvcnRzID0ge1xyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBQYXJzZXMgdGhlIHByb3ZpZGVkIEdMU0wgc291cmNlLCBhbmQgcmV0dXJucyBhbGwgZGVjbGFyYXRpb24gc3RhdGVtZW50c1xyXG4gICAgICAgICAqIHRoYXQgY29udGFpbiB0aGUgcHJvdmlkZWQgcXVhbGlmaWVyIHR5cGUuIFRoaXMgY2FuIGJlIHVzZWQgdG8gZXh0cmFjdFxyXG4gICAgICAgICAqIGFsbCBhdHRyaWJ1dGVzIGFuZCB1bmlmb3JtIG5hbWVzIGFuZCB0eXBlcyBmcm9tIGEgc2hhZGVyLlxyXG4gICAgICAgICAqXHJcbiAgICAgICAgICogRm9yIGV4YW1wbGUsIHdoZW4gcHJvdmlkZWQgYSAndW5pZm9ybScgcXVhbGlmaWVycywgdGhlIGRlY2xhcmF0aW9uOlxyXG4gICAgICAgICAqIDxwcmU+XHJcbiAgICAgICAgICogICAgICd1bmlmb3JtIGhpZ2hwIHZlYzMgdVNwZWN1bGFyQ29sb3I7J1xyXG4gICAgICAgICAqIDwvcHJlPlxyXG4gICAgICAgICAqIFdvdWxkIGJlIHBhcnNlZCB0bzpcclxuICAgICAgICAgKiA8cHJlPlxyXG4gICAgICAgICAqICAgICB7XHJcbiAgICAgICAgICogICAgICAgICBxdWFsaWZpZXI6ICd1bmlmb3JtJyxcclxuICAgICAgICAgKiAgICAgICAgIHR5cGU6ICd2ZWMzJyxcclxuICAgICAgICAgKiAgICAgICAgIG5hbWU6ICd1U3BlY3VsYXJDb2xvcicsXHJcbiAgICAgICAgICogICAgICAgICBjb3VudDogMVxyXG4gICAgICAgICAqICAgICB9XHJcbiAgICAgICAgICogPC9wcmU+XHJcbiAgICAgICAgICogQHBhcmFtIHtTdHJpbmd8QXJyYXl9IHNvdXJjZXMgLSBUaGUgc2hhZGVyIHNvdXJjZXMuXHJcbiAgICAgICAgICogQHBhcmFtIHtTdHJpbmd8QXJyYXl9IHF1YWxpZmllcnMgLSBUaGUgcXVhbGlmaWVycyB0byBleHRyYWN0LlxyXG4gICAgICAgICAqXHJcbiAgICAgICAgICogQHJldHVybnMge0FycmF5fSBUaGUgYXJyYXkgb2YgcXVhbGlmaWVyIGRlY2xhcmF0aW9uIHN0YXRlbWVudHMuXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgcGFyc2VEZWNsYXJhdGlvbnM6IGZ1bmN0aW9uKCBzb3VyY2VzLCBxdWFsaWZpZXJzICkge1xyXG4gICAgICAgICAgICAvLyBpZiBubyBzb3VyY2VzIG9yIHF1YWxpZmllcnMgYXJlIHByb3ZpZGVkLCByZXR1cm4gZW1wdHkgYXJyYXlcclxuICAgICAgICAgICAgaWYgKCAhcXVhbGlmaWVycyB8fCBxdWFsaWZpZXJzLmxlbmd0aCA9PT0gMCB8fFxyXG4gICAgICAgICAgICAgICAgIXNvdXJjZXMgfHwgc291cmNlcy5sZW5ndGggPT09IDAgKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gW107XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgc291cmNlcyA9ICggc291cmNlcyBpbnN0YW5jZW9mIEFycmF5ICkgPyBzb3VyY2VzIDogWyBzb3VyY2VzIF07XHJcbiAgICAgICAgICAgIHF1YWxpZmllcnMgPSAoIHF1YWxpZmllcnMgaW5zdGFuY2VvZiBBcnJheSApID8gcXVhbGlmaWVycyA6IFsgcXVhbGlmaWVycyBdO1xyXG4gICAgICAgICAgICAvLyBwYXJzZSBvdXQgdGFyZ2V0dGVkIGRlY2xhcmF0aW9uc1xyXG4gICAgICAgICAgICB2YXIgZGVjbGFyYXRpb25zID0gW107XHJcbiAgICAgICAgICAgIHNvdXJjZXMuZm9yRWFjaCggZnVuY3Rpb24oIHNvdXJjZSApIHtcclxuICAgICAgICAgICAgICAgIGRlY2xhcmF0aW9ucyA9IGRlY2xhcmF0aW9ucy5jb25jYXQoIHBhcnNlU291cmNlKCBzb3VyY2UsIHF1YWxpZmllcnMgKSApO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgLy8gcmVtb3ZlIGR1cGxpY2F0ZXMgYW5kIHJldHVyblxyXG4gICAgICAgICAgICByZXR1cm4gZmlsdGVyRHVwbGljYXRlc0J5TmFtZSggZGVjbGFyYXRpb25zICk7XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogRGV0ZWN0cyBiYXNlZCBvbiB0aGUgZXhpc3RlbmNlIG9mIGEgJ3ZvaWQgbWFpbigpIHsnIHN0YXRlbWVudCwgaWZcclxuICAgICAgICAgKiB0aGUgc3RyaW5nIGlzIGdsc2wgc291cmNlIGNvZGUuXHJcbiAgICAgICAgICpcclxuICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gc3RyIC0gVGhlIGlucHV0IHN0cmluZyB0byB0ZXN0LlxyXG4gICAgICAgICAqXHJcbiAgICAgICAgICogQHJldHVybnMge2Jvb2xlYW59IC0gVHJ1ZSBpZiB0aGUgc3RyaW5nIGlzIGdsc2wgY29kZS5cclxuICAgICAgICAgKi9cclxuICAgICAgICBpc0dMU0w6IGZ1bmN0aW9uKCBzdHIgKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBHTFNMX1JFR0VYUC50ZXN0KCBzdHIgKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgfTtcclxuXHJcbn0oKSk7XHJcbiIsIihmdW5jdGlvbiAoKSB7XHJcblxyXG4gICAgJ3VzZSBzdHJpY3QnO1xyXG5cclxuICAgIHZhciBXZWJHTENvbnRleHQgPSByZXF1aXJlKCcuL1dlYkdMQ29udGV4dCcpLFxyXG4gICAgICAgIFV0aWwgPSByZXF1aXJlKCcuLi91dGlsL1V0aWwnKSxcclxuICAgICAgICBTdGFjayA9IHJlcXVpcmUoJy4uL3V0aWwvU3RhY2snKSxcclxuICAgICAgICBfc3RhY2sgPSB7fSxcclxuICAgICAgICBfYm91bmRUZXh0dXJlID0gbnVsbDtcclxuXHJcbiAgICAvKipcclxuICAgICAqIElmIHRoZSBwcm92aWRlZCBpbWFnZSBkaW1lbnNpb25zIGFyZSBub3QgcG93ZXJzIG9mIHR3bywgaXQgd2lsbCByZWRyYXdcclxuICAgICAqIHRoZSBpbWFnZSB0byB0aGUgbmV4dCBoaWdoZXN0IHBvd2VyIG9mIHR3by5cclxuICAgICAqXHJcbiAgICAgKiBAcGFyYW0ge0hUTUxJbWFnZUVsZW1lbnR9IGltYWdlIC0gVGhlIGltYWdlIG9iamVjdC5cclxuICAgICAqXHJcbiAgICAgKiBAcmV0dXJucyB7SFRNTEltYWdlRWxlbWVudH0gVGhlIG5ldyBpbWFnZSBvYmplY3QuXHJcbiAgICAgKi9cclxuICAgIGZ1bmN0aW9uIGVuc3VyZVBvd2VyT2ZUd28oIGltYWdlICkge1xyXG4gICAgICAgIGlmICggIVV0aWwuaXNQb3dlck9mVHdvKCBpbWFnZS53aWR0aCApIHx8XHJcbiAgICAgICAgICAgICFVdGlsLmlzUG93ZXJPZlR3byggaW1hZ2UuaGVpZ2h0ICkgKSB7XHJcbiAgICAgICAgICAgIHZhciBjYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCAnY2FudmFzJyApO1xyXG4gICAgICAgICAgICBjYW52YXMud2lkdGggPSBVdGlsLm5leHRIaWdoZXN0UG93ZXJPZlR3byggaW1hZ2Uud2lkdGggKTtcclxuICAgICAgICAgICAgY2FudmFzLmhlaWdodCA9IFV0aWwubmV4dEhpZ2hlc3RQb3dlck9mVHdvKCBpbWFnZS5oZWlnaHQgKTtcclxuICAgICAgICAgICAgdmFyIGN0eCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xyXG4gICAgICAgICAgICBjdHguZHJhd0ltYWdlKFxyXG4gICAgICAgICAgICAgICAgaW1hZ2UsXHJcbiAgICAgICAgICAgICAgICAwLCAwLFxyXG4gICAgICAgICAgICAgICAgaW1hZ2Uud2lkdGgsIGltYWdlLmhlaWdodCxcclxuICAgICAgICAgICAgICAgIDAsIDAsXHJcbiAgICAgICAgICAgICAgICBjYW52YXMud2lkdGgsIGNhbnZhcy5oZWlnaHQgKTtcclxuICAgICAgICAgICAgcmV0dXJuIGNhbnZhcztcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGltYWdlO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQmluZHMgdGhlIHRleHR1cmUgb2JqZWN0IHRvIGEgbG9jYXRpb24gYW5kIGFjdGl2YXRlcyB0aGUgdGV4dHVyZSB1bml0XHJcbiAgICAgKiB3aGlsZSBjYWNoaW5nIGl0IHRvIHByZXZlbnQgdW5uZWNlc3NhcnkgcmViaW5kcy5cclxuICAgICAqXHJcbiAgICAgKiBAcGFyYW0ge1RleHR1cmUyRH0gdGV4dHVyZSAtIFRoZSBUZXh0dXJlMkQgb2JqZWN0IHRvIGJpbmQuXHJcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gbG9jYXRpb24gLSBUaGUgdGV4dHVyZSB1bml0IGxvY2F0aW9uIGluZGV4LlxyXG4gICAgICovXHJcbiAgICBmdW5jdGlvbiBiaW5kKCB0ZXh0dXJlLCBsb2NhdGlvbiApIHtcclxuICAgICAgICAvLyBpZiB0aGlzIGJ1ZmZlciBpcyBhbHJlYWR5IGJvdW5kLCBleGl0IGVhcmx5XHJcbiAgICAgICAgaWYgKCBfYm91bmRUZXh0dXJlID09PSB0ZXh0dXJlICkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciBnbCA9IHRleHR1cmUuZ2w7XHJcbiAgICAgICAgbG9jYXRpb24gPSBnbFsgJ1RFWFRVUkUnICsgbG9jYXRpb24gXSB8fCBnbC5URVhUVVJFMDtcclxuICAgICAgICBnbC5hY3RpdmVUZXh0dXJlKCBsb2NhdGlvbiApO1xyXG4gICAgICAgIGdsLmJpbmRUZXh0dXJlKCBnbC5URVhUVVJFXzJELCB0ZXh0dXJlLnRleHR1cmUgKTtcclxuICAgICAgICBfYm91bmRUZXh0dXJlID0gdGV4dHVyZTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIFVuYmluZHMgdGhlIHRleHR1cmUgb2JqZWN0LiBQcmV2ZW50cyB1bm5lY2Vzc2FyeSB1bmJpbmRpbmcuXHJcbiAgICAgKlxyXG4gICAgICogQHBhcmFtIHtUZXh0dXJlMkR9IHRleHR1cmUgLSBUaGUgVGV4dHVyZTJEIG9iamVjdCB0byB1bmJpbmQuXHJcbiAgICAgKi9cclxuICAgIGZ1bmN0aW9uIHVuYmluZCggdGV4dHVyZSApIHtcclxuICAgICAgICAvLyBpZiBubyBidWZmZXIgaXMgYm91bmQsIGV4aXQgZWFybHlcclxuICAgICAgICBpZiAoIF9ib3VuZFRleHR1cmUgPT09IG51bGwgKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIGdsID0gdGV4dHVyZS5nbDtcclxuICAgICAgICBnbC5iaW5kVGV4dHVyZSggZ2wuVEVYVFVSRV8yRCwgbnVsbCApO1xyXG4gICAgICAgIF9ib3VuZFRleHR1cmUgPSBudWxsO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogSW5zdGFudGlhdGVzIGEgVGV4dHVyZTJEIG9iamVjdC5cclxuICAgICAqIEBjbGFzcyBUZXh0dXJlMkRcclxuICAgICAqIEBjbGFzc2Rlc2MgQSB0ZXh0dXJlIGNsYXNzIHRvIHJlcHJlc2VudCBhIDJEIHRleHR1cmUuXHJcbiAgICAgKi9cclxuICAgIGZ1bmN0aW9uIFRleHR1cmUyRCggc3BlYywgY2FsbGJhY2sgKSB7XHJcbiAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xyXG4gICAgICAgIC8vIGRlZmF1bHRcclxuICAgICAgICBzcGVjID0gc3BlYyB8fCB7fTtcclxuICAgICAgICB0aGlzLmdsID0gV2ViR0xDb250ZXh0LmdldCgpO1xyXG4gICAgICAgIC8vIGNyZWF0ZSB0ZXh0dXJlIG9iamVjdFxyXG4gICAgICAgIHRoaXMudGV4dHVyZSA9IHRoaXMuZ2wuY3JlYXRlVGV4dHVyZSgpO1xyXG4gICAgICAgIHRoaXMud3JhcCA9IHNwZWMud3JhcCB8fCAnUkVQRUFUJztcclxuICAgICAgICB0aGlzLmZpbHRlciA9IHNwZWMuZmlsdGVyIHx8ICdMSU5FQVInO1xyXG4gICAgICAgIHRoaXMuaW52ZXJ0WSA9IHNwZWMuaW52ZXJ0WSAhPT0gdW5kZWZpbmVkID8gc3BlYy5pbnZlcnRZIDogdHJ1ZTtcclxuICAgICAgICB0aGlzLm1pcE1hcCA9IHNwZWMubWlwTWFwICE9PSB1bmRlZmluZWQgPyBzcGVjLm1pcE1hcCA6IHRydWU7XHJcbiAgICAgICAgdGhpcy5wcmVNdWx0aXBseUFscGhhID0gc3BlYy5wcmVNdWx0aXBseUFscGhhICE9PSB1bmRlZmluZWQgPyBzcGVjLnByZU11bHRpcGx5QWxwaGEgOiB0cnVlO1xyXG4gICAgICAgIC8vIGJ1ZmZlciB0aGUgdGV4dHVyZSBiYXNlZCBvbiBhcmd1bWVudHNcclxuICAgICAgICBpZiAoIHNwZWMuaW1hZ2UgKSB7XHJcbiAgICAgICAgICAgIC8vIHVzZSBleGlzdGluZyBJbWFnZSBvYmplY3RcclxuICAgICAgICAgICAgdGhpcy5idWZmZXJEYXRhKCBzcGVjLmltYWdlICk7XHJcbiAgICAgICAgICAgIHRoaXMuc2V0UGFyYW1ldGVycyggdGhpcyApO1xyXG4gICAgICAgIH0gZWxzZSBpZiAoIHNwZWMudXJsICkge1xyXG4gICAgICAgICAgICAvLyByZXF1ZXN0IGltYWdlIHNvdXJjZSBmcm9tIHVybFxyXG4gICAgICAgICAgICB2YXIgaW1hZ2UgPSBuZXcgSW1hZ2UoKTtcclxuICAgICAgICAgICAgaW1hZ2Uub25sb2FkID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICB0aGF0LmJ1ZmZlckRhdGEoIGltYWdlICk7XHJcbiAgICAgICAgICAgICAgICB0aGF0LnNldFBhcmFtZXRlcnMoIHRoYXQgKTtcclxuICAgICAgICAgICAgICAgIGNhbGxiYWNrKCB0aGF0ICk7XHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIGltYWdlLnNyYyA9IHNwZWMudXJsO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIC8vIGFzc3VtZSB0aGlzIHRleHR1cmUgd2lsbCBiZSAgcmVuZGVyZWQgdG8uIEluIHRoaXMgY2FzZSBkaXNhYmxlXHJcbiAgICAgICAgICAgIC8vIG1pcG1hcHBpbmcsIHRoZXJlIGlzIG5vIG5lZWQgYW5kIGl0IHdpbGwgb25seSBpbnRyb2R1Y2UgdmVyeVxyXG4gICAgICAgICAgICAvLyBwZWN1bGlhciByZW5kZXJpbmcgYnVncyBpbiB3aGljaCB0aGUgdGV4dHVyZSAndHJhbnNmb3JtcycgYXRcclxuICAgICAgICAgICAgLy8gY2VydGFpbiBhbmdsZXMgLyBkaXN0YW5jZXMgdG8gdGhlIG1pcG1hcHBlZCAoZW1wdHkpIHBvcnRpb25zLlxyXG4gICAgICAgICAgICB0aGlzLm1pcE1hcCA9IGZhbHNlO1xyXG4gICAgICAgICAgICAvLyBidWZmZXIgZGF0YVxyXG4gICAgICAgICAgICBpZiAoIHNwZWMuZm9ybWF0ID09PSAnREVQVEhfQ09NUE9ORU5UJyApIHtcclxuICAgICAgICAgICAgICAgIC8vIGRlcHRoIHRleHR1cmVcclxuICAgICAgICAgICAgICAgIHZhciBkZXB0aFRleHR1cmVFeHQgPSBXZWJHTENvbnRleHQuY2hlY2tFeHRlbnNpb24oICdXRUJHTF9kZXB0aF90ZXh0dXJlJyApO1xyXG4gICAgICAgICAgICAgICAgaWYoICFkZXB0aFRleHR1cmVFeHQgKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS53YXJuKCAnQ2Fubm90IGNyZWF0ZSBUZXh0dXJlMkQgb2YgZm9ybWF0ICcgK1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAnZ2wuREVQVEhfQ09NUE9ORU5UIGFzIFdFQkdMX2RlcHRoX3RleHR1cmUgaXMgJyArXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICd1bnN1cHBvcnRlZCBieSB0aGlzIGJyb3dzZXIsIGNvbW1hbmQgaWdub3JlZCcgKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAvLyBzZXQgZm9ybWF0XHJcbiAgICAgICAgICAgICAgICB0aGlzLmZvcm1hdCA9IHNwZWMuZm9ybWF0O1xyXG4gICAgICAgICAgICAgICAgLy8gc2V0IHR5cGVcclxuICAgICAgICAgICAgICAgIGlmICggIXNwZWMudHlwZSApIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyBkZWZhdWx0IHRvIHVuc2lnbmVkIGludCBmb3IgaGlnaGVyIHByZWNpc2lvblxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMudHlwZSA9ICdVTlNJR05FRF9JTlQnO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICggc3BlYy50eXBlID09PSAnVU5TSUdORURfU0hPUlQnIHx8IHNwZWMudHlwZSA9PT0gJ1VOU0lHTkVEX0lOVCcgKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gc2V0IHRvIGFjY2VwdCB0eXBlc1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMudHlwZSA9IHNwZWMudHlwZTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gZXJyb3JcclxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oICdEZXB0aCB0ZXh0dXJlcyBkbyBub3Qgc3VwcG9ydCB0eXBlYCcgK1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzcGVjLnR5cGUgKyAnYCwgZGVmYXVsdGluZyB0byBgVU5TSUdORURfSU5UYC4nKTtcclxuICAgICAgICAgICAgICAgICAgICAvLyBkZWZhdWx0XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50eXBlID0gJ1VOU0lHTkVEX0lOVCc7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAvLyBhbHdheXMgZGlzYWJsZSBtaXAgbWFwcGluZyBmb3IgZGVwdGggdGV4dHVyZVxyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgLy8gb3RoZXJcclxuICAgICAgICAgICAgICAgIHRoaXMuZm9ybWF0ID0gc3BlYy5mb3JtYXQgfHwgJ1JHQkEnO1xyXG4gICAgICAgICAgICAgICAgdGhpcy50eXBlID0gc3BlYy50eXBlIHx8ICdVTlNJR05FRF9CWVRFJztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0aGlzLmludGVybmFsRm9ybWF0ID0gdGhpcy5mb3JtYXQ7IC8vIHdlYmdsIHJlcXVpcmVzIGZvcm1hdCA9PT0gaW50ZXJuYWxGb3JtYXRcclxuICAgICAgICAgICAgdGhpcy5idWZmZXJEYXRhKCBzcGVjLmRhdGEgfHwgbnVsbCwgc3BlYy53aWR0aCwgc3BlYy5oZWlnaHQgKTtcclxuICAgICAgICAgICAgdGhpcy5zZXRQYXJhbWV0ZXJzKCB0aGlzICk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQmluZHMgdGhlIHRleHR1cmUgb2JqZWN0IGFuZCBwdXNoZXMgaXQgdG8gdGhlIGZyb250IG9mIHRoZSBzdGFjay5cclxuICAgICAqIEBtZW1iZXJvZiBUZXh0dXJlMkRcclxuICAgICAqXHJcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gbG9jYXRpb24gLSBUaGUgdGV4dHVyZSB1bml0IGxvY2F0aW9uIGluZGV4LlxyXG4gICAgICpcclxuICAgICAqIEByZXR1cm5zIHtUZXh0dXJlMkR9IFRoZSB0ZXh0dXJlIG9iamVjdCwgZm9yIGNoYWluaW5nLlxyXG4gICAgICovXHJcbiAgICBUZXh0dXJlMkQucHJvdG90eXBlLnB1c2ggPSBmdW5jdGlvbiggbG9jYXRpb24gKSB7XHJcbiAgICAgICAgX3N0YWNrWyBsb2NhdGlvbiBdID0gX3N0YWNrWyBsb2NhdGlvbiBdIHx8IG5ldyBTdGFjaygpO1xyXG4gICAgICAgIF9zdGFja1sgbG9jYXRpb24gXS5wdXNoKCB0aGlzICk7XHJcbiAgICAgICAgYmluZCggdGhpcywgbG9jYXRpb24gKTtcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH07XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBVbmJpbmRzIHRoZSB0ZXh0dXJlIG9iamVjdCBhbmQgYmluZHMgdGhlIHRleHR1cmUgYmVuZWF0aCBpdCBvblxyXG4gICAgICogdGhpcyBzdGFjay4gSWYgdGhlcmUgaXMgbm8gdW5kZXJseWluZyB0ZXh0dXJlLCB1bmJpbmRzIHRoZSB1bml0LlxyXG4gICAgICogQG1lbWJlcm9mIFRleHR1cmUyRFxyXG4gICAgICpcclxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBsb2NhdGlvbiAtIFRoZSB0ZXh0dXJlIHVuaXQgbG9jYXRpb24gaW5kZXguXHJcbiAgICAgKlxyXG4gICAgICogQHJldHVybnMge1RleHR1cmUyRH0gVGhlIHRleHR1cmUgb2JqZWN0LCBmb3IgY2hhaW5pbmcuXHJcbiAgICAgKi9cclxuICAgIFRleHR1cmUyRC5wcm90b3R5cGUucG9wID0gZnVuY3Rpb24oIGxvY2F0aW9uICkge1xyXG4gICAgICAgIHZhciB0b3A7XHJcbiAgICAgICAgaWYgKCAhX3N0YWNrWyBsb2NhdGlvbiBdICkge1xyXG4gICAgICAgICAgICBjb25zb2xlLndhcm4oICdObyB0ZXh0dXJlIHdhcyBib3VuZCB0byB0ZXh0dXJlIHVuaXQgYCcgKyBsb2NhdGlvbiArXHJcbiAgICAgICAgICAgICAgICAnYCwgY29tbWFuZCBpZ25vcmVkLicgKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgX3N0YWNrWyBsb2NhdGlvbiBdLnBvcCgpO1xyXG4gICAgICAgIHRvcCA9IF9zdGFja1sgbG9jYXRpb24gXS50b3AoKTtcclxuICAgICAgICBpZiAoIHRvcCApIHtcclxuICAgICAgICAgICAgYmluZCggdG9wLCBsb2NhdGlvbiApO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHVuYmluZCggdGhpcyApO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH07XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBCdWZmZXIgZGF0YSBpbnRvIHRoZSB0ZXh0dXJlLlxyXG4gICAgICogQG1lbWJlcm9mIFRleHR1cmUyRFxyXG4gICAgICpcclxuICAgICAqIEBwYXJhbSB7SW1hZ2VEYXRhfEFycmF5QnVmZmVyVmlld3xIVE1MSW1hZ2VFbGVtZW50fSBkYXRhIC0gVGhlIGRhdGEuXHJcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gd2lkdGggLSBUaGUgd2lkdGggb2YgdGhlIGRhdGEuXHJcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gaGVpZ2h0IC0gVGhlIGhlaWdodCBvZiB0aGUgZGF0YS5cclxuICAgICAqXHJcbiAgICAgKiBAcmV0dXJucyB7VGV4dHVyZTJEfSBUaGUgdGV4dHVyZSBvYmplY3QsIGZvciBjaGFpbmluZy5cclxuICAgICAqL1xyXG4gICAgVGV4dHVyZTJELnByb3RvdHlwZS5idWZmZXJEYXRhID0gZnVuY3Rpb24oIGRhdGEsIHdpZHRoLCBoZWlnaHQgKSB7XHJcbiAgICAgICAgdmFyIGdsID0gdGhpcy5nbDtcclxuICAgICAgICB0aGlzLnB1c2goKTtcclxuICAgICAgICAvLyBpbnZlcnQgeSBpZiBzcGVjaWZpZWRcclxuICAgICAgICBnbC5waXhlbFN0b3JlaSggZ2wuVU5QQUNLX0ZMSVBfWV9XRUJHTCwgdGhpcy5pbnZlcnRZICk7XHJcbiAgICAgICAgLy8gcHJlbXVsdGlwbGUgYWxwaGEgaWYgc3BlY2lmaWVkXHJcbiAgICAgICAgZ2wucGl4ZWxTdG9yZWkoIGdsLlVOUEFDS19QUkVNVUxUSVBMWV9BTFBIQV9XRUJHTCwgdGhpcy5wcmVNdWx0aXBseUFscGhhICk7XHJcbiAgICAgICAgLy8gYnVmZmVyIHRleHR1cmUgYmFzZWQgb24gdHlwZSBvZiBkYXRhXHJcbiAgICAgICAgaWYgKCBkYXRhIGluc3RhbmNlb2YgSFRNTEltYWdlRWxlbWVudCApIHtcclxuICAgICAgICAgICAgLy8gc2V0IGRpbWVuc2lvbnMgb2Ygb3JpZ2luYWwgaW1hZ2UgYmVmb3JlIHJlc2l6aW5nXHJcbiAgICAgICAgICAgIHRoaXMud2lkdGggPSBkYXRhLndpZHRoO1xyXG4gICAgICAgICAgICB0aGlzLmhlaWdodCA9IGRhdGEuaGVpZ2h0O1xyXG4gICAgICAgICAgICBkYXRhID0gZW5zdXJlUG93ZXJPZlR3byggZGF0YSApO1xyXG4gICAgICAgICAgICB0aGlzLmltYWdlID0gZGF0YTtcclxuICAgICAgICAgICAgZ2wudGV4SW1hZ2UyRChcclxuICAgICAgICAgICAgICAgIGdsLlRFWFRVUkVfMkQsXHJcbiAgICAgICAgICAgICAgICAwLCAvLyBsZXZlbFxyXG4gICAgICAgICAgICAgICAgZ2wuUkdCQSxcclxuICAgICAgICAgICAgICAgIGdsLlJHQkEsXHJcbiAgICAgICAgICAgICAgICBnbC5VTlNJR05FRF9CWVRFLFxyXG4gICAgICAgICAgICAgICAgZGF0YSApO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXMuZGF0YSA9IGRhdGE7XHJcbiAgICAgICAgICAgIHRoaXMud2lkdGggPSB3aWR0aCB8fCB0aGlzLndpZHRoO1xyXG4gICAgICAgICAgICB0aGlzLmhlaWdodCA9IGhlaWdodCB8fCB0aGlzLmhlaWdodDtcclxuICAgICAgICAgICAgZ2wudGV4SW1hZ2UyRChcclxuICAgICAgICAgICAgICAgIGdsLlRFWFRVUkVfMkQsXHJcbiAgICAgICAgICAgICAgICAwLCAvLyBsZXZlbFxyXG4gICAgICAgICAgICAgICAgZ2xbIHRoaXMuaW50ZXJuYWxGb3JtYXQgXSxcclxuICAgICAgICAgICAgICAgIHRoaXMud2lkdGgsXHJcbiAgICAgICAgICAgICAgICB0aGlzLmhlaWdodCxcclxuICAgICAgICAgICAgICAgIDAsIC8vIGJvcmRlciwgbXVzdCBiZSAwXHJcbiAgICAgICAgICAgICAgICBnbFsgdGhpcy5mb3JtYXQgXSxcclxuICAgICAgICAgICAgICAgIGdsWyB0aGlzLnR5cGUgXSxcclxuICAgICAgICAgICAgICAgIHRoaXMuZGF0YSApO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoIHRoaXMubWlwTWFwICkge1xyXG4gICAgICAgICAgICBnbC5nZW5lcmF0ZU1pcG1hcCggZ2wuVEVYVFVSRV8yRCApO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLnBvcCgpO1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfTtcclxuXHJcbiAgICAvKipcclxuICAgICAqIFNldCB0aGUgdGV4dHVyZSBwYXJhbWV0ZXJzLlxyXG4gICAgICogQG1lbWJlcm9mIFRleHR1cmUyRFxyXG4gICAgICpcclxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBwYXJhbWV0ZXJzIC0gVGhlIHBhcmFtZXRlcnMgYnkgbmFtZS5cclxuICAgICAqIDxwcmU+XHJcbiAgICAgKiAgICAgd3JhcCB8IHdyYXAucyB8IHdyYXAudCAtIFRoZSB3cmFwcGluZyB0eXBlLlxyXG4gICAgICogICAgIGZpbHRlciB8IGZpbHRlci5taW4gfCBmaWx0ZXIubWFnIC0gVGhlIGZpbHRlciB0eXBlLlxyXG4gICAgICogPC9wcmU+XHJcbiAgICAgKiBAcmV0dXJucyB7VGV4dHVyZTJEfSBUaGUgdGV4dHVyZSBvYmplY3QsIGZvciBjaGFpbmluZy5cclxuICAgICAqL1xyXG4gICAgVGV4dHVyZTJELnByb3RvdHlwZS5zZXRQYXJhbWV0ZXJzID0gZnVuY3Rpb24oIHBhcmFtZXRlcnMgKSB7XHJcbiAgICAgICAgdmFyIGdsID0gdGhpcy5nbDtcclxuICAgICAgICB0aGlzLnB1c2goKTtcclxuICAgICAgICBpZiAoIHBhcmFtZXRlcnMud3JhcCApIHtcclxuICAgICAgICAgICAgLy8gc2V0IHdyYXAgcGFyYW1ldGVyc1xyXG4gICAgICAgICAgICB0aGlzLndyYXAgPSBwYXJhbWV0ZXJzLndyYXA7XHJcbiAgICAgICAgICAgIGdsLnRleFBhcmFtZXRlcmkoXHJcbiAgICAgICAgICAgICAgICBnbC5URVhUVVJFXzJELFxyXG4gICAgICAgICAgICAgICAgZ2wuVEVYVFVSRV9XUkFQX1MsXHJcbiAgICAgICAgICAgICAgICBnbFsgdGhpcy53cmFwLnMgfHwgdGhpcy53cmFwIF0gKTtcclxuICAgICAgICAgICAgZ2wudGV4UGFyYW1ldGVyaShcclxuICAgICAgICAgICAgICAgIGdsLlRFWFRVUkVfMkQsXHJcbiAgICAgICAgICAgICAgICBnbC5URVhUVVJFX1dSQVBfVCxcclxuICAgICAgICAgICAgICAgIGdsWyB0aGlzLndyYXAudCB8fCB0aGlzLndyYXAgXSApO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoIHBhcmFtZXRlcnMuZmlsdGVyICkge1xyXG4gICAgICAgICAgICAvLyBzZXQgZmlsdGVyIHBhcmFtZXRlcnNcclxuICAgICAgICAgICAgdGhpcy5maWx0ZXIgPSBwYXJhbWV0ZXJzLmZpbHRlcjtcclxuICAgICAgICAgICAgdmFyIG1pbkZpbHRlciA9IHRoaXMuZmlsdGVyLm1pbiB8fCB0aGlzLmZpbHRlcjtcclxuICAgICAgICAgICAgaWYgKCB0aGlzLm1pcE1hcCApIHtcclxuICAgICAgICAgICAgICAgIC8vIGFwcGVuZCBtaXBtYXAgc3VmZml4IHRvIG1pbiBmaWx0ZXJcclxuICAgICAgICAgICAgICAgIG1pbkZpbHRlciArPSAnX01JUE1BUF9MSU5FQVInO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGdsLnRleFBhcmFtZXRlcmkoXHJcbiAgICAgICAgICAgICAgICBnbC5URVhUVVJFXzJELFxyXG4gICAgICAgICAgICAgICAgZ2wuVEVYVFVSRV9NQUdfRklMVEVSLFxyXG4gICAgICAgICAgICAgICAgZ2xbIHRoaXMuZmlsdGVyLm1hZyB8fCB0aGlzLmZpbHRlciBdICk7XHJcbiAgICAgICAgICAgIGdsLnRleFBhcmFtZXRlcmkoXHJcbiAgICAgICAgICAgICAgICBnbC5URVhUVVJFXzJELFxyXG4gICAgICAgICAgICAgICAgZ2wuVEVYVFVSRV9NSU5fRklMVEVSLFxyXG4gICAgICAgICAgICAgICAgZ2xbIG1pbkZpbHRlcl0gKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5wb3AoKTtcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH07XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBSZXNpemUgdGhlIHRleHR1cmUuXHJcbiAgICAgKiBAbWVtYmVyb2YgVGV4dHVyZTJEXHJcbiAgICAgKlxyXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHdpZHRoIC0gVGhlIG5ldyB3aWR0aCBvZiB0aGUgdGV4dHVyZS5cclxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBoZWlnaHQgLSBUaGUgbmV3IGhlaWdodCBvZiB0aGUgdGV4dHVyZS5cclxuICAgICAqXHJcbiAgICAgKiBAcmV0dXJucyB7VGV4dHVyZTJEfSBUaGUgdGV4dHVyZSBvYmplY3QsIGZvciBjaGFpbmluZy5cclxuICAgICAqL1xyXG4gICAgVGV4dHVyZTJELnByb3RvdHlwZS5yZXNpemUgPSBmdW5jdGlvbiggd2lkdGgsIGhlaWdodCApIHtcclxuICAgICAgICBpZiAoIHRoaXMuaW1hZ2UgKSB7XHJcbiAgICAgICAgICAgIC8vIHRoZXJlIGlzIG5vIG5lZWQgdG8gZXZlciByZXNpemUgYSB0ZXh0dXJlIHRoYXQgaXMgYmFzZWRcclxuICAgICAgICAgICAgLy8gb2YgYW4gYWN0dWFsIGltYWdlLiBUaGF0IGlzIHdoYXQgc2FtcGxpbmcgaXMgZm9yLlxyXG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCAnQ2Fubm90IHJlc2l6ZSBpbWFnZSBiYXNlZCBUZXh0dXJlMkQnICk7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKCAhd2lkdGggfHwgIWhlaWdodCApIHtcclxuICAgICAgICAgICAgY29uc29sZS53YXJuKCAnV2lkdGggb3IgaGVpZ2h0IGFyZ3VtZW50cyBtaXNzaW5nLCBjb21tYW5kIGlnbm9yZWQuJyApO1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMuYnVmZmVyRGF0YSggdGhpcy5kYXRhLCB3aWR0aCwgaGVpZ2h0ICk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9O1xyXG5cclxuICAgIG1vZHVsZS5leHBvcnRzID0gVGV4dHVyZTJEO1xyXG5cclxufSgpKTtcclxuIiwiKGZ1bmN0aW9uICgpIHtcclxuXHJcbiAgICAndXNlIHN0cmljdCc7XHJcblxyXG4gICAgdmFyIFdlYkdMQ29udGV4dCA9IHJlcXVpcmUoJy4vV2ViR0xDb250ZXh0JyksXHJcbiAgICAgICAgVXRpbCA9IHJlcXVpcmUoJy4uL3V0aWwvVXRpbCcpLFxyXG4gICAgICAgIFN0YWNrID0gcmVxdWlyZSgnLi4vdXRpbC9TdGFjaycpLFxyXG4gICAgICAgIEZBQ0VTID0gW1xyXG4gICAgICAgICAgICAnLXgnLCAnK3gnLFxyXG4gICAgICAgICAgICAnLXknLCAnK3knLFxyXG4gICAgICAgICAgICAnLXonLCAnK3onXHJcbiAgICAgICAgXSxcclxuICAgICAgICBGQUNFX1RBUkdFVFMgPSB7XHJcbiAgICAgICAgICAgICcreic6ICdURVhUVVJFX0NVQkVfTUFQX1BPU0lUSVZFX1onLFxyXG4gICAgICAgICAgICAnLXonOiAnVEVYVFVSRV9DVUJFX01BUF9ORUdBVElWRV9aJyxcclxuICAgICAgICAgICAgJyt4JzogJ1RFWFRVUkVfQ1VCRV9NQVBfUE9TSVRJVkVfWCcsXHJcbiAgICAgICAgICAgICcteCc6ICdURVhUVVJFX0NVQkVfTUFQX05FR0FUSVZFX1gnLFxyXG4gICAgICAgICAgICAnK3knOiAnVEVYVFVSRV9DVUJFX01BUF9QT1NJVElWRV9ZJyxcclxuICAgICAgICAgICAgJy15JzogJ1RFWFRVUkVfQ1VCRV9NQVBfTkVHQVRJVkVfWSdcclxuICAgICAgICB9LFxyXG4gICAgICAgIF9zdGFjayA9IHt9LFxyXG4gICAgICAgIF9ib3VuZFRleHR1cmUgPSBudWxsO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogSWYgdGhlIHByb3ZpZGVkIGltYWdlIGRpbWVuc2lvbnMgYXJlIG5vdCBwb3dlcnMgb2YgdHdvLCBpdCB3aWxsIHJlZHJhd1xyXG4gICAgICogdGhlIGltYWdlIHRvIHRoZSBuZXh0IGhpZ2hlc3QgcG93ZXIgb2YgdHdvLlxyXG4gICAgICpcclxuICAgICAqIEBwYXJhbSB7SFRNTEltYWdlRWxlbWVudH0gaW1hZ2UgLSBUaGUgaW1hZ2Ugb2JqZWN0LlxyXG4gICAgICpcclxuICAgICAqIEByZXR1cm5zIHtIVE1MSW1hZ2VFbGVtZW50fSBUaGUgbmV3IGltYWdlIG9iamVjdC5cclxuICAgICAqL1xyXG4gICAgZnVuY3Rpb24gZW5zdXJlUG93ZXJPZlR3byggaW1hZ2UgKSB7XHJcbiAgICAgICAgaWYgKCAhVXRpbC5pc1Bvd2VyT2ZUd28oIGltYWdlLndpZHRoICkgfHxcclxuICAgICAgICAgICAgIVV0aWwuaXNQb3dlck9mVHdvKCBpbWFnZS5oZWlnaHQgKSApIHtcclxuICAgICAgICAgICAgdmFyIGNhbnZhcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoICdjYW52YXMnICk7XHJcbiAgICAgICAgICAgIGNhbnZhcy53aWR0aCA9IFV0aWwubmV4dEhpZ2hlc3RQb3dlck9mVHdvKCBpbWFnZS53aWR0aCApO1xyXG4gICAgICAgICAgICBjYW52YXMuaGVpZ2h0ID0gVXRpbC5uZXh0SGlnaGVzdFBvd2VyT2ZUd28oIGltYWdlLmhlaWdodCApO1xyXG4gICAgICAgICAgICB2YXIgY3R4ID0gY2FudmFzLmdldENvbnRleHQoJzJkJyk7XHJcbiAgICAgICAgICAgIGN0eC5kcmF3SW1hZ2UoXHJcbiAgICAgICAgICAgICAgICBpbWFnZSxcclxuICAgICAgICAgICAgICAgIDAsIDAsXHJcbiAgICAgICAgICAgICAgICBpbWFnZS53aWR0aCwgaW1hZ2UuaGVpZ2h0LFxyXG4gICAgICAgICAgICAgICAgMCwgMCxcclxuICAgICAgICAgICAgICAgIGNhbnZhcy53aWR0aCwgY2FudmFzLmhlaWdodCApO1xyXG4gICAgICAgICAgICByZXR1cm4gY2FudmFzO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gaW1hZ2U7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBCaW5kcyB0aGUgdGV4dHVyZSBvYmplY3QgdG8gYSBsb2NhdGlvbiBhbmQgYWN0aXZhdGVzIHRoZSB0ZXh0dXJlIHVuaXRcclxuICAgICAqIHdoaWxlIGNhY2hpbmcgaXQgdG8gcHJldmVudCB1bm5lY2Vzc2FyeSByZWJpbmRzLlxyXG4gICAgICpcclxuICAgICAqIEBwYXJhbSB7VGV4dHVyZUN1YmVNYXB9IHRleHR1cmUgLSBUaGUgVGV4dHVyZUN1YmVNYXAgb2JqZWN0IHRvIGJpbmQuXHJcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gbG9jYXRpb24gLSBUaGUgdGV4dHVyZSB1bml0IGxvY2F0aW9uIGluZGV4LlxyXG4gICAgICovXHJcbiAgICBmdW5jdGlvbiBiaW5kKCB0ZXh0dXJlLCBsb2NhdGlvbiApIHtcclxuICAgICAgICAvLyBpZiB0aGlzIGJ1ZmZlciBpcyBhbHJlYWR5IGJvdW5kLCBleGl0IGVhcmx5XHJcbiAgICAgICAgaWYgKCBfYm91bmRUZXh0dXJlID09PSB0ZXh0dXJlICkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciBnbCA9IHRleHR1cmUuZ2w7XHJcbiAgICAgICAgbG9jYXRpb24gPSBnbFsgJ1RFWFRVUkUnICsgbG9jYXRpb24gXSB8fCBnbC5URVhUVVJFMDtcclxuICAgICAgICBnbC5hY3RpdmVUZXh0dXJlKCBsb2NhdGlvbiApO1xyXG4gICAgICAgIGdsLmJpbmRUZXh0dXJlKCBnbC5URVhUVVJFX0NVQkVfTUFQLCB0ZXh0dXJlLnRleHR1cmUgKTtcclxuICAgICAgICBfYm91bmRUZXh0dXJlID0gdGV4dHVyZTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIFVuYmluZHMgdGhlIHRleHR1cmUgb2JqZWN0LiBQcmV2ZW50cyB1bm5lY2Vzc2FyeSB1bmJpbmRpbmcuXHJcbiAgICAgKlxyXG4gICAgICogQHBhcmFtIHtUZXh0dXJlQ3ViZU1hcH0gdGV4dHVyZSAtIFRoZSBUZXh0dXJlQ3ViZU1hcCBvYmplY3QgdG8gdW5iaW5kLlxyXG4gICAgICovXHJcbiAgICBmdW5jdGlvbiB1bmJpbmQoIHRleHR1cmUgKSB7XHJcbiAgICAgICAgLy8gaWYgbm8gYnVmZmVyIGlzIGJvdW5kLCBleGl0IGVhcmx5XHJcbiAgICAgICAgaWYgKCBfYm91bmRUZXh0dXJlID09PSBudWxsICkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciBnbCA9IHRleHR1cmUuZ2w7XHJcbiAgICAgICAgZ2wuYmluZFRleHR1cmUoIGdsLlRFWFRVUkVfQ1VCRV9NQVAsIG51bGwgKTtcclxuICAgICAgICBfYm91bmRUZXh0dXJlID0gbnVsbDtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIFJldHVybnMgYSBmdW5jdGlvbiB0byBsb2FkIGFuZCBidWZmZXIgYSBnaXZlbiBjdWJlIG1hcCBmYWNlLlxyXG4gICAgICpcclxuICAgICAqIEBwYXJhbSB7VGV4dHVyZUN1YmVNYXB9IGN1YmVNYXAgLSBUaGUgY3ViZSBtYXAgb2JqZWN0LlxyXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHVybCAtIFRoZSB1cmwgdG8gbG9hZCB0aGUgaW1hZ2UuXHJcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gZmFjZSAtIFRoZSBmYWNlIGlkZW50aWZpY2F0aW9uIHN0cmluZy5cclxuICAgICAqXHJcbiAgICAgKiBAcmV0dXJucyB7RnVuY3Rpb259IFRoZSByZXN1bHRpbmcgZnVuY3Rpb24uXHJcbiAgICAgKi9cclxuICAgIGZ1bmN0aW9uIGxvYWRBbmRCdWZmZXJJbWFnZSggY3ViZU1hcCwgdXJsLCBmYWNlICkge1xyXG4gICAgICAgIHJldHVybiBmdW5jdGlvbiggZG9uZSApIHtcclxuICAgICAgICAgICAgdmFyIGltYWdlID0gbmV3IEltYWdlKCk7XHJcbiAgICAgICAgICAgIGltYWdlLm9ubG9hZCA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICAgLy8gYnVmZmVyIGZhY2UgdGV4dHVyZVxyXG4gICAgICAgICAgICAgICAgY3ViZU1hcC5idWZmZXJGYWNlRGF0YSggZmFjZSwgaW1hZ2UgKTtcclxuICAgICAgICAgICAgICAgIGRvbmUoKTtcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgaW1hZ2Uuc3JjID0gdXJsO1xyXG4gICAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBJbnN0YW50aWF0ZXMgYSBUZXh0dXJlQ3ViZU1hcCBvYmplY3QuXHJcbiAgICAgKiBAY2xhc3MgVGV4dHVyZUN1YmVNYXBcclxuICAgICAqIEBjbGFzc2Rlc2MgQSB0ZXh0dXJlIGNsYXNzIHRvIHJlcHJlc2VudCBhIGN1YmUgbWFwIHRleHR1cmUuXHJcbiAgICAgKi9cclxuICAgIGZ1bmN0aW9uIFRleHR1cmVDdWJlTWFwKCBzcGVjLCBjYWxsYmFjayApIHtcclxuICAgICAgICB2YXIgdGhhdCA9IHRoaXMsXHJcbiAgICAgICAgICAgIGZhY2UsXHJcbiAgICAgICAgICAgIGpvYnM7XHJcbiAgICAgICAgLy8gc3RvcmUgZ2wgY29udGV4dFxyXG4gICAgICAgIHRoaXMuZ2wgPSBXZWJHTENvbnRleHQuZ2V0KCk7XHJcbiAgICAgICAgdGhpcy50ZXh0dXJlID0gdGhpcy5nbC5jcmVhdGVUZXh0dXJlKCk7XHJcbiAgICAgICAgdGhpcy53cmFwID0gc3BlYy53cmFwIHx8ICdDTEFNUF9UT19FREdFJztcclxuICAgICAgICB0aGlzLmZpbHRlciA9IHNwZWMuZmlsdGVyIHx8ICdMSU5FQVInO1xyXG4gICAgICAgIHRoaXMuaW52ZXJ0WSA9IHNwZWMuaW52ZXJ0WSAhPT0gdW5kZWZpbmVkID8gc3BlYy5pbnZlcnRZIDogZmFsc2U7XHJcbiAgICAgICAgLy8gY3JlYXRlIGN1YmUgbWFwIGJhc2VkIG9uIGlucHV0XHJcbiAgICAgICAgaWYgKCBzcGVjLmltYWdlcyApIHtcclxuICAgICAgICAgICAgLy8gbXVsdGlwbGUgSW1hZ2Ugb2JqZWN0c1xyXG4gICAgICAgICAgICBmb3IgKCBmYWNlIGluIHNwZWMuaW1hZ2VzICkge1xyXG4gICAgICAgICAgICAgICAgaWYgKCBzcGVjLmltYWdlcy5oYXNPd25Qcm9wZXJ0eSggZmFjZSApICkge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIGJ1ZmZlciBmYWNlIHRleHR1cmVcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmJ1ZmZlckZhY2VEYXRhKCBmYWNlLCBzcGVjLmltYWdlc1sgZmFjZSBdICk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhpcy5zZXRQYXJhbWV0ZXJzKCB0aGlzICk7XHJcbiAgICAgICAgfSBlbHNlIGlmICggc3BlYy51cmxzICkge1xyXG4gICAgICAgICAgICAvLyBtdWx0aXBsZSB1cmxzXHJcbiAgICAgICAgICAgIGpvYnMgPSB7fTtcclxuICAgICAgICAgICAgZm9yICggZmFjZSBpbiBzcGVjLnVybHMgKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoIHNwZWMudXJscy5oYXNPd25Qcm9wZXJ0eSggZmFjZSApICkge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIGFkZCBqb2IgdG8gbWFwXHJcbiAgICAgICAgICAgICAgICAgICAgam9ic1sgZmFjZSBdID0gbG9hZEFuZEJ1ZmZlckltYWdlKFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzcGVjLnVybHNbIGZhY2UgXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZmFjZSApO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIFV0aWwuYXN5bmMoIGpvYnMsIGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICAgdGhhdC5zZXRQYXJhbWV0ZXJzKCB0aGF0ICk7XHJcbiAgICAgICAgICAgICAgICBjYWxsYmFjayggdGhhdCApO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAvLyBlbXB0eSBjdWJlIG1hcFxyXG4gICAgICAgICAgICB0aGlzLmZvcm1hdCA9IHNwZWMuZm9ybWF0IHx8ICdSR0JBJztcclxuICAgICAgICAgICAgdGhpcy5pbnRlcm5hbEZvcm1hdCA9IHRoaXMuZm9ybWF0OyAvLyB3ZWJnbCByZXF1aXJlcyBmb3JtYXQgPT09IGludGVybmFsRm9ybWF0XHJcbiAgICAgICAgICAgIHRoaXMudHlwZSA9IHNwZWMudHlwZSB8fCAnVU5TSUdORURfQllURSc7XHJcbiAgICAgICAgICAgIHRoaXMubWlwTWFwID0gc3BlYy5taXBNYXAgIT09IHVuZGVmaW5lZCA/IHNwZWMubWlwTWFwIDogZmFsc2U7XHJcbiAgICAgICAgICAgIEZBQ0VTLmZvckVhY2goIGZ1bmN0aW9uKCBmYWNlICkge1xyXG4gICAgICAgICAgICAgICAgdmFyIGRhdGEgPSAoIHNwZWMuZGF0YSA/IHNwZWMuZGF0YVtmYWNlXSA6IHNwZWMuZGF0YSApIHx8IG51bGw7XHJcbiAgICAgICAgICAgICAgICB0aGF0LmJ1ZmZlckZhY2VEYXRhKCBmYWNlLCBkYXRhLCBzcGVjLndpZHRoLCBzcGVjLmhlaWdodCApO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgdGhpcy5zZXRQYXJhbWV0ZXJzKCB0aGlzICk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQmluZHMgdGhlIHRleHR1cmUgb2JqZWN0IGFuZCBwdXNoZXMgaXQgdG8gdGhlIGZyb250IG9mIHRoZSBzdGFjay5cclxuICAgICAqIEBtZW1iZXJvZiBUZXh0dXJlQ3ViZU1hcFxyXG4gICAgICpcclxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBsb2NhdGlvbiAtIFRoZSB0ZXh0dXJlIHVuaXQgbG9jYXRpb24gaW5kZXguXHJcbiAgICAgKlxyXG4gICAgICogQHJldHVybnMge1RleHR1cmVDdWJlTWFwfSBUaGUgdGV4dHVyZSBvYmplY3QsIGZvciBjaGFpbmluZy5cclxuICAgICAqL1xyXG4gICAgIFRleHR1cmVDdWJlTWFwLnByb3RvdHlwZS5wdXNoID0gZnVuY3Rpb24oIGxvY2F0aW9uICkge1xyXG4gICAgICAgIF9zdGFja1sgbG9jYXRpb24gXSA9IF9zdGFja1sgbG9jYXRpb24gXSB8fCBuZXcgU3RhY2soKTtcclxuICAgICAgICBfc3RhY2tbIGxvY2F0aW9uIF0ucHVzaCggdGhpcyApO1xyXG4gICAgICAgIGJpbmQoIHRoaXMsIGxvY2F0aW9uICk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9O1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogVW5iaW5kcyB0aGUgdGV4dHVyZSBvYmplY3QgYW5kIGJpbmRzIHRoZSB0ZXh0dXJlIGJlbmVhdGggaXQgb25cclxuICAgICAqIHRoaXMgc3RhY2suIElmIHRoZXJlIGlzIG5vIHVuZGVybHlpbmcgdGV4dHVyZSwgdW5iaW5kcyB0aGUgdW5pdC5cclxuICAgICAqIEBtZW1iZXJvZiBUZXh0dXJlQ3ViZU1hcFxyXG4gICAgICpcclxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBsb2NhdGlvbiAtIFRoZSB0ZXh0dXJlIHVuaXQgbG9jYXRpb24gaW5kZXguXHJcbiAgICAgKlxyXG4gICAgICogQHJldHVybnMge1RleHR1cmVDdWJlTWFwfSBUaGUgdGV4dHVyZSBvYmplY3QsIGZvciBjaGFpbmluZy5cclxuICAgICAqL1xyXG4gICAgIFRleHR1cmVDdWJlTWFwLnByb3RvdHlwZS5wb3AgPSBmdW5jdGlvbiggbG9jYXRpb24gKSB7XHJcbiAgICAgICAgdmFyIHRvcDtcclxuICAgICAgICBpZiAoICFfc3RhY2tbIGxvY2F0aW9uIF0gKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdObyB0ZXh0dXJlIHdhcyBib3VuZCB0byB0ZXh0dXJlIHVuaXQgYCcgKyBsb2NhdGlvbiArXHJcbiAgICAgICAgICAgICAgICAnYCwgY29tbWFuZCBpZ25vcmVkLicpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBfc3RhY2tbIGxvY2F0aW9uIF0ucG9wKCk7XHJcbiAgICAgICAgdG9wID0gX3N0YWNrWyBsb2NhdGlvbiBdLnRvcCgpO1xyXG4gICAgICAgIGlmICggdG9wICkge1xyXG4gICAgICAgICAgICBiaW5kKCB0b3AsIGxvY2F0aW9uICk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdW5iaW5kKCB0aGlzICk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfTtcclxuXHJcbiAgICAvKipcclxuICAgICAqIEJ1ZmZlciBkYXRhIGludG8gdGhlIHJlc3BlY3RpdmUgY3ViZSBtYXAgZmFjZS5cclxuICAgICAqIEBtZW1iZXJvZiBUZXh0dXJlQ3ViZU1hcFxyXG4gICAgICpcclxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBmYWNlIC0gVGhlIGZhY2UgaWRlbnRpZmljYXRpb24gc3RyaW5nLlxyXG4gICAgICogQHBhcmFtIHtJbWFnZURhdGF8QXJyYXlCdWZmZXJWaWV3fEhUTUxJbWFnZUVsZW1lbnR9IGRhdGEgLSBUaGUgZGF0YS5cclxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSB3aWR0aCAtIFRoZSB3aWR0aCBvZiB0aGUgZGF0YS5cclxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBoZWlnaHQgLSBUaGUgaGVpZ2h0IG9mIHRoZSBkYXRhLlxyXG4gICAgICpcclxuICAgICAqIEByZXR1cm5zIHtUZXh0dXJlQ3ViZU1hcH0gVGhlIHRleHR1cmUgb2JqZWN0LCBmb3IgY2hhaW5pbmcuXHJcbiAgICAgKi9cclxuICAgIFRleHR1cmVDdWJlTWFwLnByb3RvdHlwZS5idWZmZXJGYWNlRGF0YSA9IGZ1bmN0aW9uKCBmYWNlLCBkYXRhLCB3aWR0aCwgaGVpZ2h0ICkge1xyXG4gICAgICAgIHZhciBnbCA9IHRoaXMuZ2wsXHJcbiAgICAgICAgICAgIGZhY2VUYXJnZXQgPSBnbFsgRkFDRV9UQVJHRVRTWyBmYWNlIF0gXTtcclxuICAgICAgICBpZiAoICFmYWNlVGFyZ2V0ICkge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnSW52YWxpZCBmYWNlIGVudW1lcmF0aW9uIGAnICsgZmFjZSArICdgIHByb3ZpZGVkLCAnICtcclxuICAgICAgICAgICAgICAgICdjb21tYW5kIGlnbm9yZWQuJyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vIGJ1ZmZlciBmYWNlIHRleHR1cmVcclxuICAgICAgICB0aGlzLnB1c2goKTtcclxuICAgICAgICBpZiAoIGRhdGEgaW5zdGFuY2VvZiBIVE1MSW1hZ2VFbGVtZW50ICkge1xyXG4gICAgICAgICAgICB0aGlzLmltYWdlcyA9IHRoaXMuaW1hZ2VzIHx8IHt9O1xyXG4gICAgICAgICAgICB0aGlzLmltYWdlc1sgZmFjZSBdID0gZW5zdXJlUG93ZXJPZlR3byggZGF0YSApO1xyXG4gICAgICAgICAgICB0aGlzLmZpbHRlciA9ICdMSU5FQVInOyAvLyBtdXN0IGJlIGxpbmVhciBmb3IgbWlwbWFwcGluZ1xyXG4gICAgICAgICAgICB0aGlzLm1pcE1hcCA9IHRydWU7XHJcbiAgICAgICAgICAgIGdsLnBpeGVsU3RvcmVpKCBnbC5VTlBBQ0tfRkxJUF9ZX1dFQkdMLCB0aGlzLmludmVydFkgKTtcclxuICAgICAgICAgICAgZ2wudGV4SW1hZ2UyRChcclxuICAgICAgICAgICAgICAgIGZhY2VUYXJnZXQsXHJcbiAgICAgICAgICAgICAgICAwLCAvLyBsZXZlbFxyXG4gICAgICAgICAgICAgICAgZ2wuUkdCQSxcclxuICAgICAgICAgICAgICAgIGdsLlJHQkEsXHJcbiAgICAgICAgICAgICAgICBnbC5VTlNJR05FRF9CWVRFLFxyXG4gICAgICAgICAgICAgICAgdGhpcy5pbWFnZXNbIGZhY2UgXSApO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXMuZGF0YSA9IHRoaXMuZGF0YSB8fCB7fTtcclxuICAgICAgICAgICAgdGhpcy5kYXRhWyBmYWNlIF0gPSBkYXRhO1xyXG4gICAgICAgICAgICB0aGlzLndpZHRoID0gd2lkdGggfHwgdGhpcy53aWR0aDtcclxuICAgICAgICAgICAgdGhpcy5oZWlnaHQgPSBoZWlnaHQgfHwgdGhpcy5oZWlnaHQ7XHJcbiAgICAgICAgICAgIGdsLnRleEltYWdlMkQoXHJcbiAgICAgICAgICAgICAgICBmYWNlVGFyZ2V0LFxyXG4gICAgICAgICAgICAgICAgMCwgLy8gbGV2ZWxcclxuICAgICAgICAgICAgICAgIGdsWyB0aGlzLmludGVybmFsRm9ybWF0IF0sXHJcbiAgICAgICAgICAgICAgICB0aGlzLndpZHRoLFxyXG4gICAgICAgICAgICAgICAgdGhpcy5oZWlnaHQsXHJcbiAgICAgICAgICAgICAgICAwLCAvLyBib3JkZXIsIG11c3QgYmUgMFxyXG4gICAgICAgICAgICAgICAgZ2xbIHRoaXMuZm9ybWF0IF0sXHJcbiAgICAgICAgICAgICAgICBnbFsgdGhpcy50eXBlIF0sXHJcbiAgICAgICAgICAgICAgICBkYXRhICk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vIG9ubHkgZ2VuZXJhdGUgbWlwbWFwcyBpZiBhbGwgZmFjZXMgYXJlIGJ1ZmZlcmVkXHJcbiAgICAgICAgdGhpcy5idWZmZXJlZEZhY2VzID0gdGhpcy5idWZmZXJlZEZhY2VzIHx8IHt9O1xyXG4gICAgICAgIHRoaXMuYnVmZmVyZWRGYWNlc1sgZmFjZSBdID0gdHJ1ZTtcclxuICAgICAgICAvLyBvbmNlIGFsbCBmYWNlcyBhcmUgYnVmZmVyZWRcclxuICAgICAgICBpZiAoIHRoaXMubWlwTWFwICYmXHJcbiAgICAgICAgICAgIHRoaXMuYnVmZmVyZWRGYWNlc1snLXgnXSAmJiB0aGlzLmJ1ZmZlcmVkRmFjZXNbJyt4J10gJiZcclxuICAgICAgICAgICAgdGhpcy5idWZmZXJlZEZhY2VzWycteSddICYmIHRoaXMuYnVmZmVyZWRGYWNlc1snK3knXSAmJlxyXG4gICAgICAgICAgICB0aGlzLmJ1ZmZlcmVkRmFjZXNbJy16J10gJiYgdGhpcy5idWZmZXJlZEZhY2VzWycreiddICkge1xyXG4gICAgICAgICAgICAvLyBnZW5lcmF0ZSBtaXBtYXBzIG9uY2UgYWxsIGZhY2VzIGFyZSBidWZmZXJlZFxyXG4gICAgICAgICAgICBnbC5nZW5lcmF0ZU1pcG1hcCggZ2wuVEVYVFVSRV9DVUJFX01BUCApO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLnBvcCgpO1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfTtcclxuXHJcbiAgICAvKipcclxuICAgICAqIFNldCB0aGUgdGV4dHVyZSBwYXJhbWV0ZXJzLlxyXG4gICAgICogQG1lbWJlcm9mIFRleHR1cmVDdWJlTWFwXHJcbiAgICAgKlxyXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHBhcmFtZXRlcnMgLSBUaGUgcGFyYW1ldGVycyBieSBuYW1lLlxyXG4gICAgICogPHByZT5cclxuICAgICAqICAgICB3cmFwIHwgd3JhcC5zIHwgd3JhcC50IC0gVGhlIHdyYXBwaW5nIHR5cGUuXHJcbiAgICAgKiAgICAgZmlsdGVyIHwgZmlsdGVyLm1pbiB8IGZpbHRlci5tYWcgLSBUaGUgZmlsdGVyIHR5cGUuXHJcbiAgICAgKiA8L3ByZT5cclxuICAgICAqIEByZXR1cm5zIHtUZXh0dXJlQ3ViZU1hcH0gVGhlIHRleHR1cmUgb2JqZWN0LCBmb3IgY2hhaW5pbmcuXHJcbiAgICAgKi9cclxuICAgIFRleHR1cmVDdWJlTWFwLnByb3RvdHlwZS5zZXRQYXJhbWV0ZXJzID0gZnVuY3Rpb24oIHBhcmFtZXRlcnMgKSB7XHJcbiAgICAgICAgdmFyIGdsID0gdGhpcy5nbDtcclxuICAgICAgICB0aGlzLnB1c2goKTtcclxuICAgICAgICBpZiAoIHBhcmFtZXRlcnMud3JhcCApIHtcclxuICAgICAgICAgICAgLy8gc2V0IHdyYXAgcGFyYW1ldGVyc1xyXG4gICAgICAgICAgICB0aGlzLndyYXAgPSBwYXJhbWV0ZXJzLndyYXA7XHJcbiAgICAgICAgICAgIGdsLnRleFBhcmFtZXRlcmkoXHJcbiAgICAgICAgICAgICAgICBnbC5URVhUVVJFX0NVQkVfTUFQLFxyXG4gICAgICAgICAgICAgICAgZ2wuVEVYVFVSRV9XUkFQX1MsXHJcbiAgICAgICAgICAgICAgICBnbFsgdGhpcy53cmFwLnMgfHwgdGhpcy53cmFwIF0gKTtcclxuICAgICAgICAgICAgZ2wudGV4UGFyYW1ldGVyaShcclxuICAgICAgICAgICAgICAgIGdsLlRFWFRVUkVfQ1VCRV9NQVAsXHJcbiAgICAgICAgICAgICAgICBnbC5URVhUVVJFX1dSQVBfVCxcclxuICAgICAgICAgICAgICAgIGdsWyB0aGlzLndyYXAudCB8fCB0aGlzLndyYXAgXSApO1xyXG4gICAgICAgICAgICAvKiBub3Qgc3VwcG9ydGVkIGluIHdlYmdsIDEuMFxyXG4gICAgICAgICAgICBnbC50ZXhQYXJhbWV0ZXJpKFxyXG4gICAgICAgICAgICAgICAgZ2wuVEVYVFVSRV9DVUJFX01BUCxcclxuICAgICAgICAgICAgICAgIGdsLlRFWFRVUkVfV1JBUF9SLFxyXG4gICAgICAgICAgICAgICAgZ2xbIHRoaXMud3JhcC5yIHx8IHRoaXMud3JhcCBdICk7XHJcbiAgICAgICAgICAgICovXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICggcGFyYW1ldGVycy5maWx0ZXIgKSB7XHJcbiAgICAgICAgICAgIC8vIHNldCBmaWx0ZXIgcGFyYW1ldGVyc1xyXG4gICAgICAgICAgICB0aGlzLmZpbHRlciA9IHBhcmFtZXRlcnMuZmlsdGVyO1xyXG4gICAgICAgICAgICB2YXIgbWluRmlsdGVyID0gdGhpcy5maWx0ZXIubWluIHx8IHRoaXMuZmlsdGVyO1xyXG4gICAgICAgICAgICBpZiAoIHRoaXMubWluTWFwICkge1xyXG4gICAgICAgICAgICAgICAgLy8gYXBwZW5kIG1pbiBtcGEgc3VmZml4IHRvIG1pbiBmaWx0ZXJcclxuICAgICAgICAgICAgICAgIG1pbkZpbHRlciArPSAnX01JUE1BUF9MSU5FQVInO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGdsLnRleFBhcmFtZXRlcmkoXHJcbiAgICAgICAgICAgICAgICBnbC5URVhUVVJFX0NVQkVfTUFQLFxyXG4gICAgICAgICAgICAgICAgZ2wuVEVYVFVSRV9NQUdfRklMVEVSLFxyXG4gICAgICAgICAgICAgICAgZ2xbIHRoaXMuZmlsdGVyLm1hZyB8fCB0aGlzLmZpbHRlciBdICk7XHJcbiAgICAgICAgICAgIGdsLnRleFBhcmFtZXRlcmkoXHJcbiAgICAgICAgICAgICAgICBnbC5URVhUVVJFX0NVQkVfTUFQLFxyXG4gICAgICAgICAgICAgICAgZ2wuVEVYVFVSRV9NSU5fRklMVEVSLFxyXG4gICAgICAgICAgICAgICAgZ2xbIG1pbkZpbHRlcl0gKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5wb3AoKTtcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH07XHJcblxyXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBUZXh0dXJlQ3ViZU1hcDtcclxuXHJcbn0oKSk7XHJcbiIsIihmdW5jdGlvbiAoKSB7XHJcblxyXG4gICAgJ3VzZSBzdHJpY3QnO1xyXG5cclxuICAgIHZhciBXZWJHTENvbnRleHQgPSByZXF1aXJlKCcuL1dlYkdMQ29udGV4dCcpLFxyXG4gICAgICAgIFZlcnRleFBhY2thZ2UgPSByZXF1aXJlKCcuL1ZlcnRleFBhY2thZ2UnKSxcclxuICAgICAgICBVdGlsID0gcmVxdWlyZSgnLi4vdXRpbC9VdGlsJyksXHJcbiAgICAgICAgX2JvdW5kQnVmZmVyID0gbnVsbCxcclxuICAgICAgICBfZW5hYmxlZEF0dHJpYnV0ZXMgPSBudWxsO1xyXG5cclxuICAgIGZ1bmN0aW9uIGdldFN0cmlkZSggYXR0cmlidXRlUG9pbnRlcnMgKSB7XHJcbiAgICAgICAgdmFyIEJZVEVTX1BFUl9DT01QT05FTlQgPSA0O1xyXG4gICAgICAgIHZhciBtYXhPZmZzZXQgPSAwO1xyXG4gICAgICAgIHZhciBzdHJpZGUgPSAwO1xyXG4gICAgICAgIE9iamVjdC5rZXlzKCBhdHRyaWJ1dGVQb2ludGVycyApLmZvckVhY2goIGZ1bmN0aW9uKCBrZXkgKSB7XHJcbiAgICAgICAgICAgIC8vIHRyYWNrIHRoZSBsYXJnZXN0IG9mZnNldCB0byBkZXRlcm1pbmUgdGhlIHN0cmlkZSBvZiB0aGUgYnVmZmVyXHJcbiAgICAgICAgICAgIHZhciBwb2ludGVyID0gYXR0cmlidXRlUG9pbnRlcnNbIGtleSBdO1xyXG4gICAgICAgICAgICB2YXIgb2Zmc2V0ID0gcG9pbnRlci5vZmZzZXQ7XHJcbiAgICAgICAgICAgIGlmICggb2Zmc2V0ID4gbWF4T2Zmc2V0ICkge1xyXG4gICAgICAgICAgICAgICAgbWF4T2Zmc2V0ID0gb2Zmc2V0O1xyXG4gICAgICAgICAgICAgICAgc3RyaWRlID0gb2Zmc2V0ICsgKCBwb2ludGVyLnNpemUgKiBCWVRFU19QRVJfQ09NUE9ORU5UICk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgICAgICByZXR1cm4gc3RyaWRlO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGdldEF0dHJpYnV0ZVBvaW50ZXJzKCBhdHRyaWJ1dGVQb2ludGVycyApIHtcclxuICAgICAgICAvLyBlbnN1cmUgdGhlcmUgYXJlIHBvaW50ZXJzIHByb3ZpZGVkXHJcbiAgICAgICAgaWYgKCAhYXR0cmlidXRlUG9pbnRlcnMgfHwgT2JqZWN0LmtleXMoIGF0dHJpYnV0ZVBvaW50ZXJzICkubGVuZ3RoID09PSAwICkge1xyXG4gICAgICAgICAgICBjb25zb2xlLndhcm5pbmcoICdWZXJ0ZXhCdWZmZXIgcmVxdWlyZXMgYXR0cmlidXRlIHBvaW50ZXJzIHRvIGJlICcgK1xyXG4gICAgICAgICAgICAgICAgJ3NwZWNpZmllZCB1cG9uIGluc3RhbnRpYXRpb24sIHRoaXMgYnVmZmVyIHdpbGwgbm90IGRyYXcgY29ycmVjdGx5LicgKTtcclxuICAgICAgICAgICAgcmV0dXJuIHt9O1xyXG4gICAgICAgIH1cclxuICAgICAgICAvLyBwYXJzZSBwb2ludGVycyB0byBlbnN1cmUgdGhleSBhcmUgdmFsaWRcclxuICAgICAgICB2YXIgcG9pbnRlcnMgPSB7fTtcclxuICAgICAgICBPYmplY3Qua2V5cyggYXR0cmlidXRlUG9pbnRlcnMgKS5mb3JFYWNoKCBmdW5jdGlvbigga2V5ICkge1xyXG4gICAgICAgICAgICB2YXIgaW5kZXggPSBwYXJzZUludCgga2V5LCAxMCApO1xyXG4gICAgICAgICAgICAvLyBjaGVjayB0aGF0IGtleSBpcyBhbiB2YWxpZCBpbnRlZ2VyXHJcbiAgICAgICAgICAgIGlmICggaXNOYU4oIGluZGV4ICkgKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oJ0F0dHJpYnV0ZSBpbmRleCBgJyArIGtleSArICdgIGRvZXMgbm90IHJlcHJlc2VudCBhbiBpbnRlZ2VyLCBkaXNjYXJkaW5nIGF0dHJpYnV0ZSBwb2ludGVyLicpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHZhciBwb2ludGVyID0gYXR0cmlidXRlUG9pbnRlcnNba2V5XTtcclxuICAgICAgICAgICAgdmFyIHNpemUgPSBwb2ludGVyLnNpemU7XHJcbiAgICAgICAgICAgIHZhciB0eXBlID0gcG9pbnRlci50eXBlO1xyXG4gICAgICAgICAgICB2YXIgb2Zmc2V0ID0gcG9pbnRlci5vZmZzZXQ7XHJcbiAgICAgICAgICAgIC8vIGNoZWNrIHNpemVcclxuICAgICAgICAgICAgaWYgKCAhc2l6ZSB8fCBzaXplIDwgMSB8fCBzaXplID4gNCApIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybignQXR0cmlidXRlIHBvaW50ZXIgYHNpemVgIHBhcmFtZXRlciBpcyBpbnZhbGlkLCAnICtcclxuICAgICAgICAgICAgICAgICAgICAnZGVmYXVsdGluZyB0byA0LicpO1xyXG4gICAgICAgICAgICAgICAgc2l6ZSA9IDQ7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgLy8gY2hlY2sgdHlwZVxyXG4gICAgICAgICAgICBpZiAoICF0eXBlIHx8IHR5cGUgIT09ICdGTE9BVCcgKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oJ0F0dHJpYnV0ZSBwb2ludGVyIGB0eXBlYCBwYXJhbWV0ZXIgaXMgaW52YWxpZCwgJyArXHJcbiAgICAgICAgICAgICAgICAgICAgJ2RlZmF1bHRpbmcgdG8gYEZMT0FUYC4nKTtcclxuICAgICAgICAgICAgICAgIHR5cGUgPSAnRkxPQVQnO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHBvaW50ZXJzWyBpbmRleCBdID0ge1xyXG4gICAgICAgICAgICAgICAgc2l6ZTogc2l6ZSxcclxuICAgICAgICAgICAgICAgIHR5cGU6IHR5cGUsXHJcbiAgICAgICAgICAgICAgICBvZmZzZXQ6ICggb2Zmc2V0ICE9PSB1bmRlZmluZWQgKSA/IG9mZnNldCA6IDBcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9KTtcclxuICAgICAgICByZXR1cm4gcG9pbnRlcnM7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gZ2V0TnVtQ29tcG9uZW50cyhwb2ludGVycykge1xyXG4gICAgICAgIHZhciBzaXplID0gMDtcclxuICAgICAgICB2YXIgaW5kZXg7XHJcbiAgICAgICAgZm9yICggaW5kZXggaW4gcG9pbnRlcnMgKSB7XHJcbiAgICAgICAgICAgIGlmICggcG9pbnRlcnMuaGFzT3duUHJvcGVydHkoIGluZGV4ICkgKSB7XHJcbiAgICAgICAgICAgICAgICBzaXplICs9IHBvaW50ZXJzWyBpbmRleCBdLnNpemU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHNpemU7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gVmVydGV4QnVmZmVyKCBhcmcsIGF0dHJpYnV0ZVBvaW50ZXJzLCBvcHRpb25zICkge1xyXG4gICAgICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xyXG4gICAgICAgIHRoaXMuYnVmZmVyID0gMDtcclxuICAgICAgICB0aGlzLmdsID0gV2ViR0xDb250ZXh0LmdldCgpO1xyXG4gICAgICAgIC8vIGZpcnN0LCBzZXQgdGhlIGF0dHJpYnV0ZSBwb2ludGVyc1xyXG4gICAgICAgIGlmICggYXJnIGluc3RhbmNlb2YgVmVydGV4UGFja2FnZSApIHtcclxuICAgICAgICAgICAgLy8gVmVydGV4UGFja2FnZSBhcmd1bWVudCwgdXNlIGl0cyBhdHRyaWJ1dGUgcG9pbnRlcnNcclxuICAgICAgICAgICAgdGhpcy5wb2ludGVycyA9IGFyZy5hdHRyaWJ1dGVQb2ludGVycygpO1xyXG4gICAgICAgICAgICAvLyBzaGlmdCBvcHRpb25zIGFyZyBzaW5jZSB0aGVyZSB3aWxsIGJlIG5vIGF0dHJpYiBwb2ludGVycyBhcmdcclxuICAgICAgICAgICAgb3B0aW9ucyA9IGF0dHJpYnV0ZVBvaW50ZXJzIHx8IHt9O1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXMucG9pbnRlcnMgPSBnZXRBdHRyaWJ1dGVQb2ludGVycyggYXR0cmlidXRlUG9pbnRlcnMgKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgLy8gdGhlbiBidWZmZXIgdGhlIGRhdGFcclxuICAgICAgICBpZiAoIGFyZyApIHtcclxuICAgICAgICAgICAgaWYgKCBhcmcgaW5zdGFuY2VvZiBWZXJ0ZXhQYWNrYWdlICkge1xyXG4gICAgICAgICAgICAgICAgLy8gVmVydGV4UGFja2FnZSBhcmd1bWVudFxyXG4gICAgICAgICAgICAgICAgdGhpcy5idWZmZXJEYXRhKCBhcmcuYnVmZmVyKCkgKTtcclxuICAgICAgICAgICAgfSBlbHNlIGlmICggYXJnIGluc3RhbmNlb2YgV2ViR0xCdWZmZXIgKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBXZWJHTEJ1ZmZlciBhcmd1bWVudFxyXG4gICAgICAgICAgICAgICAgdGhpcy5idWZmZXIgPSBhcmc7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNvdW50ID0gKCBvcHRpb25zLmNvdW50ICE9PSB1bmRlZmluZWQgKSA/IG9wdGlvbnMuY291bnQgOiAwO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgLy8gQXJyYXkgb3IgQXJyYXlCdWZmZXIgb3IgbnVtYmVyIGFyZ3VtZW50XHJcbiAgICAgICAgICAgICAgICB0aGlzLmJ1ZmZlckRhdGEoIGFyZyApO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vIHNldCBzdHJpZGVcclxuICAgICAgICB0aGlzLnN0cmlkZSA9IGdldFN0cmlkZSggdGhpcy5wb2ludGVycyApO1xyXG4gICAgICAgIC8vIHNldCBkcmF3IG9mZnNldCBhbmQgbW9kZVxyXG4gICAgICAgIHRoaXMub2Zmc2V0ID0gKCBvcHRpb25zLm9mZnNldCAhPT0gdW5kZWZpbmVkICkgPyBvcHRpb25zLm9mZnNldCA6IDA7XHJcbiAgICAgICAgdGhpcy5tb2RlID0gKCBvcHRpb25zLm1vZGUgIT09IHVuZGVmaW5lZCApID8gb3B0aW9ucy5tb2RlIDogJ1RSSUFOR0xFUyc7XHJcbiAgICB9XHJcblxyXG4gICAgVmVydGV4QnVmZmVyLnByb3RvdHlwZS5idWZmZXJEYXRhID0gZnVuY3Rpb24oIGFyZyApIHtcclxuICAgICAgICB2YXIgZ2wgPSB0aGlzLmdsO1xyXG4gICAgICAgIGlmICggYXJnIGluc3RhbmNlb2YgQXJyYXkgKSB7XHJcbiAgICAgICAgICAgIC8vIGNhc3QgYXJyYXlzIGludG8gYnVmZmVydmlld1xyXG4gICAgICAgICAgICBhcmcgPSBuZXcgRmxvYXQzMkFycmF5KCBhcmcgKTtcclxuICAgICAgICB9IGVsc2UgaWYgKCAhVXRpbC5pc1R5cGVkQXJyYXkoIGFyZyApICYmIHR5cGVvZiBhcmcgIT09ICdudW1iZXInICkge1xyXG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCAnVmVydGV4QnVmZmVyIHJlcXVpcmVzIGFuIEFycmF5IG9yIEFycmF5QnVmZmVyLCAnICtcclxuICAgICAgICAgICAgICAgICdvciBhIHNpemUgYXJndW1lbnQsIGNvbW1hbmQgaWdub3JlZC4nICk7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKCAhdGhpcy5idWZmZXIgKSB7XHJcbiAgICAgICAgICAgIHRoaXMuYnVmZmVyID0gZ2wuY3JlYXRlQnVmZmVyKCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vIGdldCB0aGUgdG90YWwgbnVtYmVyIG9mIGF0dHJpYnV0ZSBjb21wb25lbnRzIGZyb20gcG9pbnRlcnNcclxuICAgICAgICB2YXIgbnVtQ29tcG9uZW50cyA9IGdldE51bUNvbXBvbmVudHModGhpcy5wb2ludGVycyk7XHJcbiAgICAgICAgLy8gc2V0IGNvdW50IGJhc2VkIG9uIHNpemUgb2YgYnVmZmVyIGFuZCBudW1iZXIgb2YgY29tcG9uZW50c1xyXG4gICAgICAgIGlmICh0eXBlb2YgYXJnID09PSAnbnVtYmVyJykge1xyXG4gICAgICAgICAgICB0aGlzLmNvdW50ID0gYXJnIC8gbnVtQ29tcG9uZW50cztcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLmNvdW50ID0gYXJnLmxlbmd0aCAvIG51bUNvbXBvbmVudHM7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGdsLmJpbmRCdWZmZXIoIGdsLkFSUkFZX0JVRkZFUiwgdGhpcy5idWZmZXIgKTtcclxuICAgICAgICBnbC5idWZmZXJEYXRhKCBnbC5BUlJBWV9CVUZGRVIsIGFyZywgZ2wuU1RBVElDX0RSQVcgKTtcclxuICAgIH07XHJcblxyXG4gICAgVmVydGV4QnVmZmVyLnByb3RvdHlwZS5idWZmZXJTdWJEYXRhID0gZnVuY3Rpb24oIGFycmF5LCBvZmZzZXQgKSB7XHJcbiAgICAgICAgdmFyIGdsID0gdGhpcy5nbDtcclxuICAgICAgICBpZiAoICF0aGlzLmJ1ZmZlciApIHtcclxuICAgICAgICAgICAgY29uc29sZS5lcnJvciggJ1ZlcnRleEJ1ZmZlciBoYXMgbm90IGJlZW4gaW5pdGlhbGx5IGJ1ZmZlcmVkLCAnICtcclxuICAgICAgICAgICAgICAgICdjb21tYW5kIGlnbm9yZWQuJyApO1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICggYXJyYXkgaW5zdGFuY2VvZiBBcnJheSApIHtcclxuICAgICAgICAgICAgYXJyYXkgPSBuZXcgRmxvYXQzMkFycmF5KCBhcnJheSApO1xyXG4gICAgICAgIH0gZWxzZSBpZiAoICFVdGlsLmlzVHlwZWRBcnJheSggYXJyYXkgKSApIHtcclxuICAgICAgICAgICAgY29uc29sZS5lcnJvciggJ1ZlcnRleEJ1ZmZlciByZXF1aXJlcyBhbiBBcnJheSBvciBBcnJheUJ1ZmZlciAnICtcclxuICAgICAgICAgICAgICAgICdhcmd1bWVudCwgY29tbWFuZCBpZ25vcmVkLicgKTtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgICBvZmZzZXQgPSAoIG9mZnNldCAhPT0gdW5kZWZpbmVkICkgPyBvZmZzZXQgOiAwO1xyXG4gICAgICAgIGdsLmJpbmRCdWZmZXIoIGdsLkFSUkFZX0JVRkZFUiwgdGhpcy5idWZmZXIgKTtcclxuICAgICAgICBnbC5idWZmZXJTdWJEYXRhKCBnbC5BUlJBWV9CVUZGRVIsIG9mZnNldCwgYXJyYXkgKTtcclxuICAgIH07XHJcblxyXG4gICAgVmVydGV4QnVmZmVyLnByb3RvdHlwZS5iaW5kID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgLy8gaWYgdGhpcyBidWZmZXIgaXMgYWxyZWFkeSBib3VuZCwgZXhpdCBlYXJseVxyXG4gICAgICAgIGlmICggX2JvdW5kQnVmZmVyID09PSB0aGlzICkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciBnbCA9IHRoaXMuZ2wsXHJcbiAgICAgICAgICAgIHBvaW50ZXJzID0gdGhpcy5wb2ludGVycyxcclxuICAgICAgICAgICAgcHJldmlvdXNseUVuYWJsZWRBdHRyaWJ1dGVzID0gX2VuYWJsZWRBdHRyaWJ1dGVzIHx8IHt9LFxyXG4gICAgICAgICAgICBwb2ludGVyLFxyXG4gICAgICAgICAgICBpbmRleDtcclxuICAgICAgICAvLyBjYWNoZSB0aGlzIHZlcnRleCBidWZmZXJcclxuICAgICAgICBfYm91bmRCdWZmZXIgPSB0aGlzO1xyXG4gICAgICAgIF9lbmFibGVkQXR0cmlidXRlcyA9IHt9O1xyXG4gICAgICAgIC8vIGJpbmQgYnVmZmVyXHJcbiAgICAgICAgZ2wuYmluZEJ1ZmZlciggZ2wuQVJSQVlfQlVGRkVSLCB0aGlzLmJ1ZmZlciApO1xyXG4gICAgICAgIGZvciAoIGluZGV4IGluIHBvaW50ZXJzICkge1xyXG4gICAgICAgICAgICBpZiAoIHBvaW50ZXJzLmhhc093blByb3BlcnR5KCBpbmRleCApICkge1xyXG4gICAgICAgICAgICAgICAgcG9pbnRlciA9IHRoaXMucG9pbnRlcnNbIGluZGV4IF07XHJcbiAgICAgICAgICAgICAgICAvLyBzZXQgYXR0cmlidXRlIHBvaW50ZXJcclxuICAgICAgICAgICAgICAgIGdsLnZlcnRleEF0dHJpYlBvaW50ZXIoIGluZGV4LFxyXG4gICAgICAgICAgICAgICAgICAgIHBvaW50ZXIuc2l6ZSxcclxuICAgICAgICAgICAgICAgICAgICBnbFsgcG9pbnRlci50eXBlIF0sXHJcbiAgICAgICAgICAgICAgICAgICAgZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zdHJpZGUsXHJcbiAgICAgICAgICAgICAgICAgICAgcG9pbnRlci5vZmZzZXQgKTtcclxuICAgICAgICAgICAgICAgIC8vIGVuYWJsZWQgYXR0cmlidXRlIGFycmF5XHJcbiAgICAgICAgICAgICAgICBnbC5lbmFibGVWZXJ0ZXhBdHRyaWJBcnJheSggaW5kZXggKTtcclxuICAgICAgICAgICAgICAgIC8vIGNhY2hlIGF0dHJpYnV0ZVxyXG4gICAgICAgICAgICAgICAgX2VuYWJsZWRBdHRyaWJ1dGVzWyBpbmRleCBdID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIC8vIHJlbW92ZSBmcm9tIHByZXZpb3VzIGxpc3RcclxuICAgICAgICAgICAgICAgIGRlbGV0ZSBwcmV2aW91c2x5RW5hYmxlZEF0dHJpYnV0ZXNbIGluZGV4IF07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgLy8gZW5zdXJlIGxlYWtlZCBhdHRyaWJ1dGUgYXJyYXlzIGFyZSBkaXNhYmxlZFxyXG4gICAgICAgIGZvciAoIGluZGV4IGluIHByZXZpb3VzbHlFbmFibGVkQXR0cmlidXRlcyApIHtcclxuICAgICAgICAgICAgaWYgKCBwcmV2aW91c2x5RW5hYmxlZEF0dHJpYnV0ZXMuaGFzT3duUHJvcGVydHkoIGluZGV4ICkgKSB7XHJcbiAgICAgICAgICAgICAgICBnbC5kaXNhYmxlVmVydGV4QXR0cmliQXJyYXkoIGluZGV4ICk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9O1xyXG5cclxuICAgIFZlcnRleEJ1ZmZlci5wcm90b3R5cGUuZHJhdyA9IGZ1bmN0aW9uKCBvcHRpb25zICkge1xyXG4gICAgICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xyXG4gICAgICAgIGlmICggX2JvdW5kQnVmZmVyID09PSBudWxsICkge1xyXG4gICAgICAgICAgICBjb25zb2xlLndhcm4oICdObyBWZXJ0ZXhCdWZmZXIgaXMgYm91bmQsIGNvbW1hbmQgaWdub3JlZC4nICk7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIGdsID0gdGhpcy5nbDtcclxuICAgICAgICB2YXIgbW9kZSA9IGdsWyBvcHRpb25zLm1vZGUgfHwgdGhpcy5tb2RlIHx8ICdUUklBTkdMRVMnIF07XHJcbiAgICAgICAgdmFyIG9mZnNldCA9ICggb3B0aW9ucy5vZmZzZXQgIT09IHVuZGVmaW5lZCApID8gb3B0aW9ucy5vZmZzZXQgOiB0aGlzLm9mZnNldDtcclxuICAgICAgICB2YXIgY291bnQgPSAoIG9wdGlvbnMuY291bnQgIT09IHVuZGVmaW5lZCApID8gb3B0aW9ucy5jb3VudCA6IHRoaXMuY291bnQ7XHJcbiAgICAgICAgZ2wuZHJhd0FycmF5cyhcclxuICAgICAgICAgICAgbW9kZSwgLy8gcHJpbWl0aXZlIHR5cGVcclxuICAgICAgICAgICAgb2Zmc2V0LCAvLyBvZmZzZXRcclxuICAgICAgICAgICAgY291bnQgKTsgLy8gY291bnRcclxuICAgIH07XHJcblxyXG4gICAgVmVydGV4QnVmZmVyLnByb3RvdHlwZS51bmJpbmQgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICAvLyBpZiBubyBidWZmZXIgaXMgYm91bmQsIGV4aXQgZWFybHlcclxuICAgICAgICBpZiAoIF9ib3VuZEJ1ZmZlciA9PT0gbnVsbCApIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgZ2wgPSB0aGlzLmdsLFxyXG4gICAgICAgICAgICBwb2ludGVycyA9IHRoaXMucG9pbnRlcnMsXHJcbiAgICAgICAgICAgIGluZGV4O1xyXG4gICAgICAgIGZvciAoIGluZGV4IGluIHBvaW50ZXJzICkge1xyXG4gICAgICAgICAgICBpZiAoIHBvaW50ZXJzLmhhc093blByb3BlcnR5KCBpbmRleCApICkge1xyXG4gICAgICAgICAgICAgICAgZ2wuZGlzYWJsZVZlcnRleEF0dHJpYkFycmF5KCBpbmRleCApO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGdsLmJpbmRCdWZmZXIoIGdsLkFSUkFZX0JVRkZFUiwgbnVsbCApO1xyXG4gICAgICAgIF9ib3VuZEJ1ZmZlciA9IG51bGw7XHJcbiAgICAgICAgX2VuYWJsZWRBdHRyaWJ1dGVzID0ge307XHJcbiAgICB9O1xyXG5cclxuICAgIG1vZHVsZS5leHBvcnRzID0gVmVydGV4QnVmZmVyO1xyXG5cclxufSgpKTtcclxuIiwiKGZ1bmN0aW9uICgpIHtcclxuXHJcbiAgICAndXNlIHN0cmljdCc7XHJcblxyXG4gICAgdmFyIENPTVBPTkVOVF9UWVBFID0gJ0ZMT0FUJztcclxuICAgIHZhciBCWVRFU19QRVJfQ09NUE9ORU5UID0gNDtcclxuXHJcbiAgICAvKipcclxuICAgICAqIFJlbW92ZXMgaW52YWxpZCBhdHRyaWJ1dGUgYXJndW1lbnRzLiBBIHZhbGlkIGFyZ3VtZW50XHJcbiAgICAgKiBtdXN0IGJlIGFuIEFycmF5IG9mIGxlbmd0aCA+IDAga2V5IGJ5IGEgc3RyaW5nIHJlcHJlc2VudGluZyBhbiBpbnQuXHJcbiAgICAgKlxyXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGF0dHJpYnV0ZXMgLSBUaGUgbWFwIG9mIHZlcnRleCBhdHRyaWJ1dGVzLlxyXG4gICAgICpcclxuICAgICAqIEByZXR1cm5zIHtBcnJheX0gVGhlIHZhbGlkIGFycmF5IG9mIGFyZ3VtZW50cy5cclxuICAgICAqL1xyXG4gICAgZnVuY3Rpb24gcGFyc2VBdHRyaWJ1dGVNYXAoIGF0dHJpYnV0ZXMgKSB7XHJcbiAgICAgICAgdmFyIGdvb2RBdHRyaWJ1dGVzID0gW107XHJcbiAgICAgICAgT2JqZWN0LmtleXMoIGF0dHJpYnV0ZXMgKS5mb3JFYWNoKCBmdW5jdGlvbigga2V5ICkge1xyXG4gICAgICAgICAgICB2YXIgaW5kZXggPSBwYXJzZUludCgga2V5LCAxMCApO1xyXG4gICAgICAgICAgICAvLyBjaGVjayB0aGF0IGtleSBpcyBhbiB2YWxpZCBpbnRlZ2VyXHJcbiAgICAgICAgICAgIGlmICggaXNOYU4oIGluZGV4ICkgKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oJ0F0dHJpYnV0ZSBpbmRleCBgJyArIGtleSArICdgIGRvZXMgbm90ICcgK1xyXG4gICAgICAgICAgICAgICAgICAgICdyZXByZXNlbnQgYW4gaW50ZWdlciwgZGlzY2FyZGluZyBhdHRyaWJ1dGUgcG9pbnRlci4nKTtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB2YXIgdmVydGljZXMgPSBhdHRyaWJ1dGVzW2tleV07XHJcbiAgICAgICAgICAgIC8vIGVuc3VyZSBhdHRyaWJ1dGUgaXMgdmFsaWRcclxuICAgICAgICAgICAgaWYgKCB2ZXJ0aWNlcyAmJlxyXG4gICAgICAgICAgICAgICAgdmVydGljZXMgaW5zdGFuY2VvZiBBcnJheSAmJlxyXG4gICAgICAgICAgICAgICAgdmVydGljZXMubGVuZ3RoID4gMCApIHtcclxuICAgICAgICAgICAgICAgIC8vIGFkZCBhdHRyaWJ1dGUgZGF0YSBhbmQgaW5kZXhcclxuICAgICAgICAgICAgICAgIGdvb2RBdHRyaWJ1dGVzLnB1c2goe1xyXG4gICAgICAgICAgICAgICAgICAgIGluZGV4OiBpbmRleCxcclxuICAgICAgICAgICAgICAgICAgICBkYXRhOiB2ZXJ0aWNlc1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oICdFcnJvciBwYXJzaW5nIGF0dHJpYnV0ZSBvZiBpbmRleCBgJyArIGtleSArXHJcbiAgICAgICAgICAgICAgICAgICAgJ2AsIGF0dHJpYnV0ZSBkaXNjYXJkZWQuJyApO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgLy8gc29ydCBhdHRyaWJ1dGVzIGFzY2VuZGluZyBieSBpbmRleFxyXG4gICAgICAgIGdvb2RBdHRyaWJ1dGVzLnNvcnQoZnVuY3Rpb24oYSxiKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBhLmluZGV4IC0gYi5pbmRleDtcclxuICAgICAgICB9KTtcclxuICAgICAgICByZXR1cm4gZ29vZEF0dHJpYnV0ZXM7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBSZXR1cm5zIGEgY29tcG9uZW50J3MgYnl0ZSBzaXplLlxyXG4gICAgICpcclxuICAgICAqIEBwYXJhbSB7T2JqZWN0fEFycmF5fSBjb21wb25lbnQgLSBUaGUgY29tcG9uZW50IHRvIG1lYXN1cmUuXHJcbiAgICAgKlxyXG4gICAgICogQHJldHVybnMge2ludGVnZXJ9IFRoZSBieXRlIHNpemUgb2YgdGhlIGNvbXBvbmVudC5cclxuICAgICAqL1xyXG4gICAgZnVuY3Rpb24gZ2V0Q29tcG9uZW50U2l6ZSggY29tcG9uZW50ICkge1xyXG4gICAgICAgIC8vIGNoZWNrIGlmIHZlY3RvclxyXG4gICAgICAgIGlmICggY29tcG9uZW50LnggIT09IHVuZGVmaW5lZCApIHtcclxuICAgICAgICAgICAgLy8gMSBjb21wb25lbnQgdmVjdG9yXHJcbiAgICAgICAgICAgIGlmICggY29tcG9uZW50LnkgIT09IHVuZGVmaW5lZCApIHtcclxuICAgICAgICAgICAgICAgIC8vIDIgY29tcG9uZW50IHZlY3RvclxyXG4gICAgICAgICAgICAgICAgaWYgKCBjb21wb25lbnQueiAhPT0gdW5kZWZpbmVkICkge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIDMgY29tcG9uZW50IHZlY3RvclxyXG4gICAgICAgICAgICAgICAgICAgIGlmICggY29tcG9uZW50LncgIT09IHVuZGVmaW5lZCApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gNCBjb21wb25lbnQgdmVjdG9yXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiA0O1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gMztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJldHVybiAyO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiAxO1xyXG4gICAgICAgIH1cclxuICAgICAgICAvLyBjaGVjayBpZiBhcnJheVxyXG4gICAgICAgIGlmICggY29tcG9uZW50IGluc3RhbmNlb2YgQXJyYXkgKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBjb21wb25lbnQubGVuZ3RoO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gMTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIENhbGN1bGF0ZXMgdGhlIHR5cGUsIHNpemUsIGFuZCBvZmZzZXQgZm9yIGVhY2ggYXR0cmlidXRlIGluIHRoZVxyXG4gICAgICogYXR0cmlidXRlIGFycmF5IGFsb25nIHdpdGggdGhlIGxlbmd0aCBhbmQgc3RyaWRlIG9mIHRoZSBwYWNrYWdlLlxyXG4gICAgICpcclxuICAgICAqIEBwYXJhbSB7VmVydGV4UGFja2FnZX0gdmVydGV4UGFja2FnZSAtIFRoZSBWZXJ0ZXhQYWNrYWdlIG9iamVjdC5cclxuICAgICAqIEBwYXJhbSB7QXJyYXl9IGF0dHJpYnV0ZXMgLSBUaGUgYXJyYXkgb2YgdmVydGV4IGF0dHJpYnV0ZXMuXHJcbiAgICAgKi9cclxuICAgIGZ1bmN0aW9uIHNldFBvaW50ZXJzQW5kU3RyaWRlKCB2ZXJ0ZXhQYWNrYWdlLCBhdHRyaWJ1dGVzICkge1xyXG4gICAgICAgIHZhciBzaG9ydGVzdEFycmF5ID0gTnVtYmVyLk1BWF9WQUxVRTtcclxuICAgICAgICB2YXIgb2Zmc2V0ID0gMDtcclxuICAgICAgICAvLyBjbGVhciBwb2ludGVyc1xyXG4gICAgICAgIHZlcnRleFBhY2thZ2UucG9pbnRlcnMgPSB7fTtcclxuICAgICAgICAvLyBmb3IgZWFjaCBhdHRyaWJ1dGVcclxuICAgICAgICBhdHRyaWJ1dGVzLmZvckVhY2goIGZ1bmN0aW9uKCB2ZXJ0aWNlcyApIHtcclxuICAgICAgICAgICAgLy8gc2V0IHNpemUgdG8gbnVtYmVyIG9mIGNvbXBvbmVudHMgaW4gdGhlIGF0dHJpYnV0ZVxyXG4gICAgICAgICAgICB2YXIgc2l6ZSA9IGdldENvbXBvbmVudFNpemUoIHZlcnRpY2VzLmRhdGFbMF0gKTtcclxuICAgICAgICAgICAgLy8gbGVuZ3RoIG9mIHRoZSBwYWNrYWdlIHdpbGwgYmUgdGhlIHNob3J0ZXN0IGF0dHJpYnV0ZSBhcnJheSBsZW5ndGhcclxuICAgICAgICAgICAgc2hvcnRlc3RBcnJheSA9IE1hdGgubWluKCBzaG9ydGVzdEFycmF5LCB2ZXJ0aWNlcy5kYXRhLmxlbmd0aCApO1xyXG4gICAgICAgICAgICAvLyBzdG9yZSBwb2ludGVyIHVuZGVyIGluZGV4XHJcbiAgICAgICAgICAgIHZlcnRleFBhY2thZ2UucG9pbnRlcnNbIHZlcnRpY2VzLmluZGV4IF0gPSB7XHJcbiAgICAgICAgICAgICAgICB0eXBlIDogQ09NUE9ORU5UX1RZUEUsXHJcbiAgICAgICAgICAgICAgICBzaXplIDogc2l6ZSxcclxuICAgICAgICAgICAgICAgIG9mZnNldCA6IG9mZnNldCAqIEJZVEVTX1BFUl9DT01QT05FTlRcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgLy8gYWNjdW11bGF0ZSBhdHRyaWJ1dGUgb2Zmc2V0XHJcbiAgICAgICAgICAgIG9mZnNldCArPSBzaXplO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIC8vIHNldCBzdHJpZGUgdG8gdG90YWwgb2Zmc2V0XHJcbiAgICAgICAgdmVydGV4UGFja2FnZS5zdHJpZGUgPSBvZmZzZXQgKiBCWVRFU19QRVJfQ09NUE9ORU5UO1xyXG4gICAgICAgIC8vIHNldCBsZW5ndGggb2YgcGFja2FnZSB0byB0aGUgc2hvcnRlc3QgYXR0cmlidXRlIGFycmF5IGxlbmd0aFxyXG4gICAgICAgIHZlcnRleFBhY2thZ2UubGVuZ3RoID0gc2hvcnRlc3RBcnJheTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBWZXJ0ZXhQYWNrYWdlKCBhdHRyaWJ1dGVzICkge1xyXG4gICAgICAgIGlmICggYXR0cmlidXRlcyAhPT0gdW5kZWZpbmVkICkge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5zZXQoIGF0dHJpYnV0ZXMgKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLmRhdGEgPSBuZXcgRmxvYXQzMkFycmF5KDApO1xyXG4gICAgICAgICAgICB0aGlzLnBvaW50ZXJzID0ge307XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIFZlcnRleFBhY2thZ2UucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uKCBhdHRyaWJ1dGVNYXAgKSB7XHJcbiAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xyXG4gICAgICAgIC8vIHJlbW92ZSBiYWQgYXR0cmlidXRlc1xyXG4gICAgICAgIHZhciBhdHRyaWJ1dGVzID0gcGFyc2VBdHRyaWJ1dGVNYXAoIGF0dHJpYnV0ZU1hcCApO1xyXG4gICAgICAgIC8vIHNldCBhdHRyaWJ1dGUgcG9pbnRlcnMgYW5kIHN0cmlkZVxyXG4gICAgICAgIHNldFBvaW50ZXJzQW5kU3RyaWRlKCB0aGlzLCBhdHRyaWJ1dGVzICk7XHJcbiAgICAgICAgLy8gc2V0IHNpemUgb2YgZGF0YSB2ZWN0b3JcclxuICAgICAgICB0aGlzLmRhdGEgPSBuZXcgRmxvYXQzMkFycmF5KCB0aGlzLmxlbmd0aCAqICggdGhpcy5zdHJpZGUgLyBCWVRFU19QRVJfQ09NUE9ORU5UICkgKTtcclxuICAgICAgICAvLyBmb3IgZWFjaCB2ZXJ0ZXggYXR0cmlidXRlIGFycmF5XHJcbiAgICAgICAgYXR0cmlidXRlcy5mb3JFYWNoKCBmdW5jdGlvbiggdmVydGljZXMgKSB7XHJcbiAgICAgICAgICAgIC8vIGdldCB0aGUgcG9pbnRlclxyXG4gICAgICAgICAgICB2YXIgcG9pbnRlciA9IHRoYXQucG9pbnRlcnNbIHZlcnRpY2VzLmluZGV4IF07XHJcbiAgICAgICAgICAgIC8vIGdldCB0aGUgcG9pbnRlcnMgb2Zmc2V0XHJcbiAgICAgICAgICAgIHZhciBvZmZzZXQgPSBwb2ludGVyLm9mZnNldCAvIEJZVEVTX1BFUl9DT01QT05FTlQ7XHJcbiAgICAgICAgICAgIC8vIGdldCB0aGUgcGFja2FnZSBzdHJpZGVcclxuICAgICAgICAgICAgdmFyIHN0cmlkZSA9IHRoYXQuc3RyaWRlIC8gQllURVNfUEVSX0NPTVBPTkVOVDtcclxuICAgICAgICAgICAgLy8gZm9yIGVhY2ggdmVydGV4XHJcbiAgICAgICAgICAgIHZhciB2ZXJ0ZXgsIGksIGo7XHJcbiAgICAgICAgICAgIGZvciAoIGk9MDsgaTx0aGF0Lmxlbmd0aDsgaSsrICkge1xyXG4gICAgICAgICAgICAgICAgdmVydGV4ID0gdmVydGljZXMuZGF0YVtpXTtcclxuICAgICAgICAgICAgICAgIC8vIGdldCB0aGUgaW5kZXggaW4gdGhlIGJ1ZmZlciB0byB0aGUgcGFydGljdWxhciB2ZXJ0ZXhcclxuICAgICAgICAgICAgICAgIGogPSBvZmZzZXQgKyAoIHN0cmlkZSAqIGkgKTtcclxuICAgICAgICAgICAgICAgIHN3aXRjaCAoIHBvaW50ZXIuc2l6ZSApIHtcclxuICAgICAgICAgICAgICAgICAgICBjYXNlIDI6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQuZGF0YVtqXSA9ICggdmVydGV4LnggIT09IHVuZGVmaW5lZCApID8gdmVydGV4LnggOiB2ZXJ0ZXhbMF07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQuZGF0YVtqKzFdID0gKCB2ZXJ0ZXgueSAhPT0gdW5kZWZpbmVkICkgPyB2ZXJ0ZXgueSA6IHZlcnRleFsxXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAzOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0LmRhdGFbal0gPSAoIHZlcnRleC54ICE9PSB1bmRlZmluZWQgKSA/IHZlcnRleC54IDogdmVydGV4WzBdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0LmRhdGFbaisxXSA9ICggdmVydGV4LnkgIT09IHVuZGVmaW5lZCApID8gdmVydGV4LnkgOiB2ZXJ0ZXhbMV07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQuZGF0YVtqKzJdID0gKCB2ZXJ0ZXgueiAhPT0gdW5kZWZpbmVkICkgPyB2ZXJ0ZXgueiA6IHZlcnRleFsyXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSA0OlxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0LmRhdGFbal0gPSAoIHZlcnRleC54ICE9PSB1bmRlZmluZWQgKSA/IHZlcnRleC54IDogdmVydGV4WzBdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0LmRhdGFbaisxXSA9ICggdmVydGV4LnkgIT09IHVuZGVmaW5lZCApID8gdmVydGV4LnkgOiB2ZXJ0ZXhbMV07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQuZGF0YVtqKzJdID0gKCB2ZXJ0ZXgueiAhPT0gdW5kZWZpbmVkICkgPyB2ZXJ0ZXgueiA6IHZlcnRleFsyXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5kYXRhW2orM10gPSAoIHZlcnRleC53ICE9PSB1bmRlZmluZWQgKSA/IHZlcnRleC53IDogdmVydGV4WzNdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIHZlcnRleC54ICE9PSB1bmRlZmluZWQgKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0LmRhdGFbal0gPSB2ZXJ0ZXgueDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmICggdmVydGV4WzBdICE9PSB1bmRlZmluZWQgKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0LmRhdGFbal0gPSB2ZXJ0ZXhbMF07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0LmRhdGFbal0gPSB2ZXJ0ZXg7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH07XHJcblxyXG4gICAgVmVydGV4UGFja2FnZS5wcm90b3R5cGUuYnVmZmVyID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuZGF0YTtcclxuICAgIH07XHJcblxyXG4gICAgVmVydGV4UGFja2FnZS5wcm90b3R5cGUuYXR0cmlidXRlUG9pbnRlcnMgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5wb2ludGVycztcclxuICAgIH07XHJcblxyXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBWZXJ0ZXhQYWNrYWdlO1xyXG5cclxufSgpKTtcclxuIiwiKGZ1bmN0aW9uKCkge1xyXG5cclxuICAgICd1c2Ugc3RyaWN0JztcclxuXHJcbiAgICB2YXIgV2ViR0xDb250ZXh0ID0gcmVxdWlyZSgnLi9XZWJHTENvbnRleHQnKSxcclxuICAgICAgICBTdGFjayA9IHJlcXVpcmUoJy4uL3V0aWwvU3RhY2snKSxcclxuICAgICAgICBfc3RhY2sgPSBuZXcgU3RhY2soKTtcclxuXHJcbiAgICBmdW5jdGlvbiBzZXQoIHZpZXdwb3J0LCB4LCB5LCB3aWR0aCwgaGVpZ2h0ICkge1xyXG4gICAgICAgIHZhciBnbCA9IHZpZXdwb3J0LmdsO1xyXG4gICAgICAgIHggPSAoIHggIT09IHVuZGVmaW5lZCApID8geCA6IHZpZXdwb3J0Lng7XHJcbiAgICAgICAgeSA9ICggeSAhPT0gdW5kZWZpbmVkICkgPyB5IDogdmlld3BvcnQueTtcclxuICAgICAgICB3aWR0aCA9ICggd2lkdGggIT09IHVuZGVmaW5lZCApID8gd2lkdGggOiB2aWV3cG9ydC53aWR0aDtcclxuICAgICAgICBoZWlnaHQgPSAoIGhlaWdodCAhPT0gdW5kZWZpbmVkICkgPyBoZWlnaHQgOiB2aWV3cG9ydC5oZWlnaHQ7XHJcbiAgICAgICAgZ2wudmlld3BvcnQoIHgsIHksIHdpZHRoLCBoZWlnaHQgKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBWaWV3cG9ydCggc3BlYyApIHtcclxuICAgICAgICBzcGVjID0gc3BlYyB8fCB7fTtcclxuICAgICAgICB0aGlzLmdsID0gV2ViR0xDb250ZXh0LmdldCgpO1xyXG4gICAgICAgIC8vIHNldCBzaXplXHJcbiAgICAgICAgdGhpcy5yZXNpemUoXHJcbiAgICAgICAgICAgIHNwZWMud2lkdGggfHwgdGhpcy5nbC5jYW52YXMud2lkdGgsXHJcbiAgICAgICAgICAgIHNwZWMuaGVpZ2h0IHx8IHRoaXMuZ2wuY2FudmFzLmhlaWdodCApO1xyXG4gICAgICAgIC8vIHNldCBvZmZzZXRcclxuICAgICAgICB0aGlzLm9mZnNldChcclxuICAgICAgICAgICAgc3BlYy54ICE9PSB1bmRlZmluZWQgPyBzcGVjLnggOiAwLFxyXG4gICAgICAgICAgICBzcGVjLnkgIT09IHVuZGVmaW5lZCA/IHNwZWMueSA6IDApO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogVXBkYXRlcyB0aGUgdmlld3BvcnQgb2JqZWN0cyB3aWR0aCBhbmQgaGVpZ2h0LlxyXG4gICAgICogQG1lbWJlcm9mIFZpZXdwb3J0XHJcbiAgICAgKlxyXG4gICAgICogQHJldHVybnMge1ZpZXdwb3J0fSBUaGUgdmlld3BvcnQgb2JqZWN0LCBmb3IgY2hhaW5pbmcuXHJcbiAgICAgKi9cclxuICAgIFZpZXdwb3J0LnByb3RvdHlwZS5yZXNpemUgPSBmdW5jdGlvbiggd2lkdGgsIGhlaWdodCApIHtcclxuICAgICAgICBpZiAoIHdpZHRoICE9PSB1bmRlZmluZWQgJiYgaGVpZ2h0ICE9PSB1bmRlZmluZWQgKSB7XHJcbiAgICAgICAgICAgIHRoaXMud2lkdGggPSB3aWR0aDtcclxuICAgICAgICAgICAgdGhpcy5oZWlnaHQgPSBoZWlnaHQ7XHJcbiAgICAgICAgICAgIHRoaXMuZ2wuY2FudmFzLndpZHRoID0gd2lkdGggKyB0aGlzLng7XHJcbiAgICAgICAgICAgIHRoaXMuZ2wuY2FudmFzLmhlaWdodCA9IGhlaWdodCArIHRoaXMueTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9O1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogVXBkYXRlcyB0aGUgdmlld3BvcnQgb2JqZWN0cyB4IGFuZCB5IG9mZnNldHMuXHJcbiAgICAgKiBAbWVtYmVyb2YgVmlld3BvcnRcclxuICAgICAqXHJcbiAgICAgKiBAcmV0dXJucyB7Vmlld3BvcnR9IFRoZSB2aWV3cG9ydCBvYmplY3QsIGZvciBjaGFpbmluZy5cclxuICAgICAqL1xyXG4gICAgVmlld3BvcnQucHJvdG90eXBlLm9mZnNldCA9IGZ1bmN0aW9uKCB4LCB5ICkge1xyXG4gICAgICAgIGlmICggeCAhPT0gdW5kZWZpbmVkICYmIHkgIT09IHVuZGVmaW5lZCApIHtcclxuICAgICAgICAgICAgdGhpcy54ID0geDtcclxuICAgICAgICAgICAgdGhpcy55ID0geTtcclxuICAgICAgICAgICAgdGhpcy5nbC5jYW52YXMud2lkdGggPSB0aGlzLndpZHRoICsgeDtcclxuICAgICAgICAgICAgdGhpcy5nbC5jYW52YXMuaGVpZ2h0ID0gdGhpcy5oZWlnaHQgKyB5O1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH07XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBTZXRzIHRoZSB2aWV3cG9ydCBvYmplY3QgYW5kIHB1c2hlcyBpdCB0byB0aGUgZnJvbnQgb2YgdGhlIHN0YWNrLlxyXG4gICAgICogQG1lbWJlcm9mIFZpZXdwb3J0XHJcbiAgICAgKlxyXG4gICAgICogQHJldHVybnMge1ZpZXdwb3J0fSBUaGUgdmlld3BvcnQgb2JqZWN0LCBmb3IgY2hhaW5pbmcuXHJcbiAgICAgKi9cclxuICAgICBWaWV3cG9ydC5wcm90b3R5cGUucHVzaCA9IGZ1bmN0aW9uKCB4LCB5LCB3aWR0aCwgaGVpZ2h0ICkge1xyXG4gICAgICAgIF9zdGFjay5wdXNoKHtcclxuICAgICAgICAgICAgdmlld3BvcnQ6IHRoaXMsXHJcbiAgICAgICAgICAgIHg6IHgsXHJcbiAgICAgICAgICAgIHk6IHksXHJcbiAgICAgICAgICAgIHdpZHRoOiB3aWR0aCxcclxuICAgICAgICAgICAgaGVpZ2h0OiBoZWlnaHRcclxuICAgICAgICB9KTtcclxuICAgICAgICBzZXQoIHRoaXMsIHgsIHksIHdpZHRoLCBoZWlnaHQgKTtcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH07XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBQb3BzIGN1cnJlbnQgdGhlIHZpZXdwb3J0IG9iamVjdCBhbmQgc2V0cyB0aGUgdmlld3BvcnQgYmVuZWF0aCBpdC5cclxuICAgICAqIEBtZW1iZXJvZiBWaWV3cG9ydFxyXG4gICAgICpcclxuICAgICAqIEByZXR1cm5zIHtWaWV3cG9ydH0gVGhlIHZpZXdwb3J0IG9iamVjdCwgZm9yIGNoYWluaW5nLlxyXG4gICAgICovXHJcbiAgICAgVmlld3BvcnQucHJvdG90eXBlLnBvcCA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHZhciB0b3A7XHJcbiAgICAgICAgX3N0YWNrLnBvcCgpO1xyXG4gICAgICAgIHRvcCA9IF9zdGFjay50b3AoKTtcclxuICAgICAgICBpZiAoIHRvcCApIHtcclxuICAgICAgICAgICAgc2V0KCB0b3Audmlld3BvcnQsIHRvcC54LCB0b3AueSwgdG9wLndpZHRoLCB0b3AuaGVpZ2h0ICk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgc2V0KCB0aGlzICk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfTtcclxuXHJcbiAgICBtb2R1bGUuZXhwb3J0cyA9IFZpZXdwb3J0O1xyXG5cclxufSgpKTtcclxuIiwiKGZ1bmN0aW9uKCkge1xyXG5cclxuICAgICd1c2Ugc3RyaWN0JztcclxuXHJcbiAgICB2YXIgX2JvdW5kQ29udGV4dCA9IG51bGwsXHJcbiAgICAgICAgX2NvbnRleHRzQnlJZCA9IHt9LFxyXG4gICAgICAgIEVYVEVOU0lPTlMgPSBbXHJcbiAgICAgICAgICAgIC8vIHJhdGlmaWVkXHJcbiAgICAgICAgICAgICdPRVNfdGV4dHVyZV9mbG9hdCcsXHJcbiAgICAgICAgICAgICdPRVNfdGV4dHVyZV9oYWxmX2Zsb2F0JyxcclxuICAgICAgICAgICAgJ1dFQkdMX2xvc2VfY29udGV4dCcsXHJcbiAgICAgICAgICAgICdPRVNfc3RhbmRhcmRfZGVyaXZhdGl2ZXMnLFxyXG4gICAgICAgICAgICAnT0VTX3ZlcnRleF9hcnJheV9vYmplY3QnLFxyXG4gICAgICAgICAgICAnV0VCR0xfZGVidWdfcmVuZGVyZXJfaW5mbycsXHJcbiAgICAgICAgICAgICdXRUJHTF9kZWJ1Z19zaGFkZXJzJyxcclxuICAgICAgICAgICAgJ1dFQkdMX2NvbXByZXNzZWRfdGV4dHVyZV9zM3RjJyxcclxuICAgICAgICAgICAgJ1dFQkdMX2RlcHRoX3RleHR1cmUnLFxyXG4gICAgICAgICAgICAnT0VTX2VsZW1lbnRfaW5kZXhfdWludCcsXHJcbiAgICAgICAgICAgICdFWFRfdGV4dHVyZV9maWx0ZXJfYW5pc290cm9waWMnLFxyXG4gICAgICAgICAgICAnV0VCR0xfZHJhd19idWZmZXJzJyxcclxuICAgICAgICAgICAgJ0FOR0xFX2luc3RhbmNlZF9hcnJheXMnLFxyXG4gICAgICAgICAgICAnT0VTX3RleHR1cmVfZmxvYXRfbGluZWFyJyxcclxuICAgICAgICAgICAgJ09FU190ZXh0dXJlX2hhbGZfZmxvYXRfbGluZWFyJyxcclxuICAgICAgICAgICAgLy8gY29tbXVuaXR5XHJcbiAgICAgICAgICAgICdXRUJHTF9jb21wcmVzc2VkX3RleHR1cmVfYXRjJyxcclxuICAgICAgICAgICAgJ1dFQkdMX2NvbXByZXNzZWRfdGV4dHVyZV9wdnJ0YycsXHJcbiAgICAgICAgICAgICdFWFRfY29sb3JfYnVmZmVyX2hhbGZfZmxvYXQnLFxyXG4gICAgICAgICAgICAnV0VCR0xfY29sb3JfYnVmZmVyX2Zsb2F0JyxcclxuICAgICAgICAgICAgJ0VYVF9mcmFnX2RlcHRoJyxcclxuICAgICAgICAgICAgJ0VYVF9zUkdCJyxcclxuICAgICAgICAgICAgJ1dFQkdMX2NvbXByZXNzZWRfdGV4dHVyZV9ldGMxJyxcclxuICAgICAgICAgICAgJ0VYVF9ibGVuZF9taW5tYXgnLFxyXG4gICAgICAgICAgICAnRVhUX3NoYWRlcl90ZXh0dXJlX2xvZCdcclxuICAgICAgICBdO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogUmV0dXJucyBhIENhbnZhcyBlbGVtZW50IG9iamVjdCBmcm9tIGVpdGhlciBhbiBleGlzdGluZyBvYmplY3QsIG9yXHJcbiAgICAgKiBpZGVudGlmaWNhdGlvbiBzdHJpbmcuXHJcbiAgICAgKlxyXG4gICAgICogQHBhcmFtIHtIVE1MQ2FudmFzRWxlbWVudHxTdHJpbmd9IGFyZyAtIFRoZSBDYW52YXNcclxuICAgICAqICAgICBvYmplY3Qgb3IgQ2FudmFzIGlkZW50aWZpY2F0aW9uIHN0cmluZy5cclxuICAgICAqXHJcbiAgICAgKiBAcmV0dXJucyB7SFRNTENhbnZhc0VsZW1lbnR9IFRoZSBDYW52YXMgZWxlbWVudCBvYmplY3QuXHJcbiAgICAgKi9cclxuICAgIGZ1bmN0aW9uIGdldENhbnZhcyggYXJnICkge1xyXG4gICAgICAgIGlmICggYXJnIGluc3RhbmNlb2YgSFRNTEltYWdlRWxlbWVudCB8fFxyXG4gICAgICAgICAgICAgYXJnIGluc3RhbmNlb2YgSFRNTENhbnZhc0VsZW1lbnQgKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBhcmc7XHJcbiAgICAgICAgfSBlbHNlIGlmICggdHlwZW9mIGFyZyA9PT0gJ3N0cmluZycgKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCggYXJnICk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQXR0ZW1wdHMgdG8gcmV0cmVpdmUgYSB3cmFwcGVkIFdlYkdMUmVuZGVyaW5nQ29udGV4dC5cclxuICAgICAqXHJcbiAgICAgKiBAcGFyYW0ge0hUTUxDYW52YXNFbGVtZW50fSBUaGUgQ2FudmFzIGVsZW1lbnQgb2JqZWN0IHRvIGNyZWF0ZSB0aGUgY29udGV4dCB1bmRlci5cclxuICAgICAqXHJcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBUaGUgY29udGV4dCB3cmFwcGVyLlxyXG4gICAgICovXHJcbiAgICBmdW5jdGlvbiBnZXRDb250ZXh0V3JhcHBlciggYXJnICkge1xyXG4gICAgICAgIGlmICggIWFyZyApIHtcclxuICAgICAgICAgICAgaWYgKCBfYm91bmRDb250ZXh0ICkge1xyXG4gICAgICAgICAgICAgICAgLy8gcmV0dXJuIGxhc3QgYm91bmQgY29udGV4dFxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIF9ib3VuZENvbnRleHQ7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB2YXIgY2FudmFzID0gZ2V0Q2FudmFzKCBhcmcgKTtcclxuICAgICAgICAgICAgaWYgKCBjYW52YXMgKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gX2NvbnRleHRzQnlJZFsgY2FudmFzLmlkIF07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgLy8gbm8gYm91bmQgY29udGV4dCBvciBhcmd1bWVudFxyXG4gICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQXR0ZW1wdHMgdG8gbG9hZCBhbGwga25vd24gZXh0ZW5zaW9ucyBmb3IgYSBwcm92aWRlZFxyXG4gICAgICogV2ViR0xSZW5kZXJpbmdDb250ZXh0LiBTdG9yZXMgdGhlIHJlc3VsdHMgaW4gdGhlIGNvbnRleHQgd3JhcHBlciBmb3JcclxuICAgICAqIGxhdGVyIHF1ZXJpZXMuXHJcbiAgICAgKlxyXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGNvbnRleHRXcmFwcGVyIC0gVGhlIGNvbnRleHQgd3JhcHBlci5cclxuICAgICAqL1xyXG4gICAgZnVuY3Rpb24gbG9hZEV4dGVuc2lvbnMoIGNvbnRleHRXcmFwcGVyICkge1xyXG4gICAgICAgIHZhciBnbCA9IGNvbnRleHRXcmFwcGVyLmdsLFxyXG4gICAgICAgICAgICBleHRlbnNpb24sXHJcbiAgICAgICAgICAgIGk7XHJcbiAgICAgICAgZm9yICggaT0wOyBpPEVYVEVOU0lPTlMubGVuZ3RoOyBpKysgKSB7XHJcbiAgICAgICAgICAgIGV4dGVuc2lvbiA9IEVYVEVOU0lPTlNbaV07XHJcbiAgICAgICAgICAgIGNvbnRleHRXcmFwcGVyLmV4dGVuc2lvbnNbIGV4dGVuc2lvbiBdID0gZ2wuZ2V0RXh0ZW5zaW9uKCBleHRlbnNpb24gKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBBdHRlbXB0cyB0byBjcmVhdGUgYSBXZWJHTFJlbmRlcmluZ0NvbnRleHQgd3JhcHBlZCBpbnNpZGUgYW4gb2JqZWN0IHdoaWNoXHJcbiAgICAgKiB3aWxsIGFsc28gc3RvcmUgdGhlIGV4dGVuc2lvbiBxdWVyeSByZXN1bHRzLlxyXG4gICAgICpcclxuICAgICAqIEBwYXJhbSB7SFRNTENhbnZhc0VsZW1lbnR9IFRoZSBDYW52YXMgZWxlbWVudCBvYmplY3QgdG8gY3JlYXRlIHRoZSBjb250ZXh0IHVuZGVyLlxyXG4gICAgICogQHBhcmFtIHtPYmplY3R9fSBvcHRpb25zIC0gUGFyYW1ldGVycyB0byB0aGUgd2ViZ2wgY29udGV4dCwgb25seSB1c2VkIGR1cmluZyBpbnN0YW50aWF0aW9uLiBPcHRpb25hbC5cclxuICAgICAqXHJcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBUaGUgY29udGV4dCB3cmFwcGVyLlxyXG4gICAgICovXHJcbiAgICBmdW5jdGlvbiBjcmVhdGVDb250ZXh0V3JhcHBlciggY2FudmFzLCBvcHRpb25zICkge1xyXG4gICAgICAgIHZhciBjb250ZXh0V3JhcHBlcixcclxuICAgICAgICAgICAgZ2w7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgLy8gZ2V0IFdlYkdMIGNvbnRleHQsIGZhbGxiYWNrIHRvIGV4cGVyaW1lbnRhbFxyXG4gICAgICAgICAgICBnbCA9IGNhbnZhcy5nZXRDb250ZXh0KCAnd2ViZ2wnLCBvcHRpb25zICkgfHwgY2FudmFzLmdldENvbnRleHQoICdleHBlcmltZW50YWwtd2ViZ2wnLCBvcHRpb25zICk7XHJcbiAgICAgICAgICAgIC8vIHdyYXAgY29udGV4dFxyXG4gICAgICAgICAgICBjb250ZXh0V3JhcHBlciA9IHtcclxuICAgICAgICAgICAgICAgIGlkOiBjYW52YXMuaWQsXHJcbiAgICAgICAgICAgICAgICBnbDogZ2wsXHJcbiAgICAgICAgICAgICAgICBleHRlbnNpb25zOiB7fVxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAvLyBsb2FkIFdlYkdMIGV4dGVuc2lvbnNcclxuICAgICAgICAgICAgbG9hZEV4dGVuc2lvbnMoIGNvbnRleHRXcmFwcGVyICk7XHJcbiAgICAgICAgICAgIC8vIGFkZCBjb250ZXh0IHdyYXBwZXIgdG8gbWFwXHJcbiAgICAgICAgICAgIF9jb250ZXh0c0J5SWRbIGNhbnZhcy5pZCBdID0gY29udGV4dFdyYXBwZXI7XHJcbiAgICAgICAgICAgIC8vIGJpbmQgdGhlIGNvbnRleHRcclxuICAgICAgICAgICAgX2JvdW5kQ29udGV4dCA9IGNvbnRleHRXcmFwcGVyO1xyXG4gICAgICAgIH0gY2F0Y2goIGVyciApIHtcclxuICAgICAgICAgICAgY29uc29sZS5lcnJvciggZXJyLm1lc3NhZ2UgKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKCAhZ2wgKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoICdVbmFibGUgdG8gaW5pdGlhbGl6ZSBXZWJHTC4gWW91ciBicm93c2VyIG1heSBub3QgJyArXHJcbiAgICAgICAgICAgICAgICAnc3VwcG9ydCBpdC4nICk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBjb250ZXh0V3JhcHBlcjtcclxuICAgIH1cclxuXHJcbiAgICBtb2R1bGUuZXhwb3J0cyA9IHtcclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogQmluZHMgYSBzcGVjaWZpYyBXZWJHTCBjb250ZXh0IGFzIHRoZSBhY3RpdmUgY29udGV4dC4gVGhpcyBjb250ZXh0XHJcbiAgICAgICAgICogd2lsbCBiZSB1c2VkIGZvciBhbGwgY29kZSAvd2ViZ2wuXHJcbiAgICAgICAgICpcclxuICAgICAgICAgKiBAcGFyYW0ge0hUTUxDYW52YXNFbGVtZW50fFN0cmluZ30gYXJnIC0gVGhlIENhbnZhcyBvYmplY3Qgb3IgQ2FudmFzIGlkZW50aWZpY2F0aW9uIHN0cmluZy5cclxuICAgICAgICAgKlxyXG4gICAgICAgICAqIEByZXR1cm5zIHtXZWJHTENvbnRleHR9IFRoaXMgbmFtZXNwYWNlLCB1c2VkIGZvciBjaGFpbmluZy5cclxuICAgICAgICAgKi9cclxuICAgICAgICBiaW5kOiBmdW5jdGlvbiggYXJnICkge1xyXG4gICAgICAgICAgICB2YXIgd3JhcHBlciA9IGdldENvbnRleHRXcmFwcGVyKCBhcmcgKTtcclxuICAgICAgICAgICAgaWYgKCB3cmFwcGVyICkge1xyXG4gICAgICAgICAgICAgICAgX2JvdW5kQ29udGV4dCA9IHdyYXBwZXI7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCAnTm8gY29udGV4dCBleGlzdHMgZm9yIHByb3ZpZGVkIGFyZ3VtZW50IGAnICsgYXJnICtcclxuICAgICAgICAgICAgICAgICdgLCBjb21tYW5kIGlnbm9yZWQuJyApO1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBDcmVhdGVzIGEgbmV3IG9yIHJldHJlaXZlcyBhbiBleGlzdGluZyBXZWJHTCBjb250ZXh0IGZvciBhIHByb3ZpZGVkXHJcbiAgICAgICAgICogY2FudmFzIG9iamVjdC4gRHVyaW5nIGNyZWF0aW9uIGF0dGVtcHRzIHRvIGxvYWQgYWxsIGV4dGVuc2lvbnMgZm91bmRcclxuICAgICAgICAgKiBhdDogaHR0cHM6Ly93d3cua2hyb25vcy5vcmcvcmVnaXN0cnkvd2ViZ2wvZXh0ZW5zaW9ucy8uIElmIG5vXHJcbiAgICAgICAgICogYXJndW1lbnQgaXMgcHJvdmlkZWQgaXQgd2lsbCBhdHRlbXB0IHRvIHJldHVybiB0aGUgY3VycmVudGx5IGJvdW5kXHJcbiAgICAgICAgICogY29udGV4dC4gSWYgbm8gY29udGV4dCBpcyBib3VuZCwgaXQgd2lsbCByZXR1cm4gJ251bGwnLlxyXG4gICAgICAgICAqXHJcbiAgICAgICAgICogQHBhcmFtIHtIVE1MQ2FudmFzRWxlbWVudHxTdHJpbmd9IGFyZyAtIFRoZSBDYW52YXMgb2JqZWN0IG9yIENhbnZhcyBpZGVudGlmaWNhdGlvbiBzdHJpbmcuIE9wdGlvbmFsLlxyXG4gICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fX0gb3B0aW9ucyAtIFBhcmFtZXRlcnMgdG8gdGhlIHdlYmdsIGNvbnRleHQsIG9ubHkgdXNlZCBkdXJpbmcgaW5zdGFudGlhdGlvbi4gT3B0aW9uYWwuXHJcbiAgICAgICAgICpcclxuICAgICAgICAgKiBAcmV0dXJucyB7V2ViR0xSZW5kZXJpbmdDb250ZXh0fSBUaGUgV2ViR0xSZW5kZXJpbmdDb250ZXh0IGNvbnRleHQgb2JqZWN0LlxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIGdldDogZnVuY3Rpb24oIGFyZywgb3B0aW9ucyApIHtcclxuICAgICAgICAgICAgdmFyIHdyYXBwZXIgPSBnZXRDb250ZXh0V3JhcHBlciggYXJnICk7XHJcbiAgICAgICAgICAgIGlmICggd3JhcHBlciApIHtcclxuICAgICAgICAgICAgICAgIC8vIHJldHVybiB0aGUgbmF0aXZlIFdlYkdMUmVuZGVyaW5nQ29udGV4dFxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHdyYXBwZXIuZ2w7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgLy8gZ2V0IGNhbnZhcyBlbGVtZW50XHJcbiAgICAgICAgICAgIHZhciBjYW52YXMgPSBnZXRDYW52YXMoIGFyZyApO1xyXG4gICAgICAgICAgICAvLyB0cnkgdG8gZmluZCBvciBjcmVhdGUgY29udGV4dFxyXG4gICAgICAgICAgICBpZiAoICFjYW52YXMgfHwgIWNyZWF0ZUNvbnRleHRXcmFwcGVyKCBjYW52YXMsIG9wdGlvbnMgKSApIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoICdDb250ZXh0IGNvdWxkIG5vdCBiZSBmb3VuZCBvciBjcmVhdGVkIGZvciAnICtcclxuICAgICAgICAgICAgICAgICAgICAnYXJndW1lbnQgb2YgdHlwZWAnICsgKCB0eXBlb2YgYXJnICkgKyAnYCwgcmV0dXJuaW5nIGBudWxsYC4nICk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAvLyByZXR1cm4gY29udGV4dFxyXG4gICAgICAgICAgICByZXR1cm4gX2NvbnRleHRzQnlJZFsgY2FudmFzLmlkIF0uZ2w7XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogUmV0dXJucyBhbiBhcnJheSBvZiBhbGwgc3VwcG9ydGVkIGV4dGVuc2lvbnMgZm9yIHRoZSBwcm92aWRlZCBjYW52YXNcclxuICAgICAgICAgKiBvYmplY3QuIElmIG5vIGFyZ3VtZW50IGlzIHByb3ZpZGVkIGl0IHdpbGwgYXR0ZW1wdCB0byBxdWVyeSB0aGVcclxuICAgICAgICAgKiBjdXJyZW50bHkgYm91bmQgY29udGV4dC4gSWYgbm8gY29udGV4dCBpcyBib3VuZCwgaXQgd2lsbCByZXR1cm5cclxuICAgICAgICAgKiBhbiBlbXB0eSBhcnJheS5cclxuICAgICAgICAgKlxyXG4gICAgICAgICAqIEBwYXJhbSB7SFRNTENhbnZhc0VsZW1lbnR8U3RyaW5nfSBhcmcgLSBUaGUgQ2FudmFzIG9iamVjdCBvciBDYW52YXMgaWRlbnRpZmljYXRpb24gc3RyaW5nLiBPcHRpb25hbC5cclxuICAgICAgICAgKlxyXG4gICAgICAgICAqIEByZXR1cm5zIHtBcnJheX0gQWxsIHN1cHBvcnRlZCBleHRlbnNpb25zLlxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHN1cHBvcnRlZEV4dGVuc2lvbnM6IGZ1bmN0aW9uKCBhcmcgKSB7XHJcbiAgICAgICAgICAgIHZhciB3cmFwcGVyID0gZ2V0Q29udGV4dFdyYXBwZXIoIGFyZyApO1xyXG4gICAgICAgICAgICBpZiAoIHdyYXBwZXIgKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgZXh0ZW5zaW9ucyA9IHdyYXBwZXIuZXh0ZW5zaW9ucztcclxuICAgICAgICAgICAgICAgIHZhciBzdXBwb3J0ZWQgPSBbXTtcclxuICAgICAgICAgICAgICAgIGZvciAoIHZhciBrZXkgaW4gZXh0ZW5zaW9ucyApIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoIGV4dGVuc2lvbnMuaGFzT3duUHJvcGVydHkoIGtleSApICYmIGV4dGVuc2lvbnNbIGtleSBdICkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdXBwb3J0ZWQucHVzaCgga2V5ICk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHN1cHBvcnRlZDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdObyBjb250ZXh0IGlzIGN1cnJlbnRseSBib3VuZCBvciB3YXMgcHJvdmlkZWQsICcgK1xyXG4gICAgICAgICAgICAgICAgJ3JldHVybmluZyBhbiBlbXB0eSBhcnJheS4nKTtcclxuICAgICAgICAgICAgcmV0dXJuIFtdO1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIFJldHVybnMgYW4gYXJyYXkgb2YgYWxsIHVuc3VwcG9ydGVkIGV4dGVuc2lvbnMgZm9yIHRoZSBwcm92aWRlZCBjYW52YXNcclxuICAgICAgICAgKiBvYmplY3QuIElmIG5vIGFyZ3VtZW50IGlzIHByb3ZpZGVkIGl0IHdpbGwgYXR0ZW1wdCB0byBxdWVyeSB0aGVcclxuICAgICAgICAgKiBjdXJyZW50bHkgYm91bmQgY29udGV4dC4gSWYgbm8gY29udGV4dCBpcyBib3VuZCwgaXQgd2lsbCByZXR1cm5cclxuICAgICAgICAgKiBhbiBlbXB0eSBhcnJheS5cclxuICAgICAgICAgKlxyXG4gICAgICAgICAqIEBwYXJhbSB7SFRNTENhbnZhc0VsZW1lbnR8U3RyaW5nfSBhcmcgLSBUaGUgQ2FudmFzIG9iamVjdCBvciBDYW52YXMgaWRlbnRpZmljYXRpb24gc3RyaW5nLiBPcHRpb25hbC5cclxuICAgICAgICAgKlxyXG4gICAgICAgICAqIEByZXR1cm5zIHtBcnJheX0gQWxsIHVuc3VwcG9ydGVkIGV4dGVuc2lvbnMuXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgdW5zdXBwb3J0ZWRFeHRlbnNpb25zOiBmdW5jdGlvbiggYXJnICkge1xyXG4gICAgICAgICAgICB2YXIgd3JhcHBlciA9IGdldENvbnRleHRXcmFwcGVyKCBhcmcgKTtcclxuICAgICAgICAgICAgaWYgKCB3cmFwcGVyICkge1xyXG4gICAgICAgICAgICAgICAgdmFyIGV4dGVuc2lvbnMgPSB3cmFwcGVyLmV4dGVuc2lvbnM7XHJcbiAgICAgICAgICAgICAgICB2YXIgdW5zdXBwb3J0ZWQgPSBbXTtcclxuICAgICAgICAgICAgICAgIGZvciAoIHZhciBrZXkgaW4gZXh0ZW5zaW9ucyApIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoIGV4dGVuc2lvbnMuaGFzT3duUHJvcGVydHkoIGtleSApICYmICFleHRlbnNpb25zWyBrZXkgXSApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdW5zdXBwb3J0ZWQucHVzaCgga2V5ICk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHVuc3VwcG9ydGVkO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ05vIGNvbnRleHQgaXMgY3VycmVudGx5IGJvdW5kIG9yIHdhcyBwcm92aWRlZCwgJyArXHJcbiAgICAgICAgICAgICAgICAncmV0dXJuaW5nIGFuIGVtcHR5IGFycmF5LicpO1xyXG4gICAgICAgICAgICByZXR1cm4gW107XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogQ2hlY2tzIGlmIGFuIGV4dGVuc2lvbiBoYXMgYmVlbiBzdWNjZXNzZnVsbHkgbG9hZGVkIGJ5IHRoZSBwcm92aWRlZFxyXG4gICAgICAgICAqIGNhbnZhcyBvYmplY3QuIElmIG5vIGFyZ3VtZW50IGlzIHByb3ZpZGVkIGl0IHdpbGwgYXR0ZW1wdCB0byByZXR1cm5cclxuICAgICAgICAgKiB0aGUgY3VycmVudGx5IGJvdW5kIGNvbnRleHQuIElmIG5vIGNvbnRleHQgaXMgYm91bmQsIGl0IHdpbGwgcmV0dXJuXHJcbiAgICAgICAgICogJ2ZhbHNlJy5cclxuICAgICAgICAgKlxyXG4gICAgICAgICAqIEBwYXJhbSB7SFRNTENhbnZhc0VsZW1lbnR8U3RyaW5nfSBhcmcgLSBUaGUgQ2FudmFzIG9iamVjdCBvciBDYW52YXMgaWRlbnRpZmljYXRpb24gc3RyaW5nLiBPcHRpb25hbC5cclxuICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gZXh0ZW5zaW9uIC0gVGhlIGV4dGVuc2lvbiBuYW1lLlxyXG4gICAgICAgICAqXHJcbiAgICAgICAgICogQHJldHVybnMge2Jvb2xlYW59IFdoZXRoZXIgb3Igbm90IHRoZSBwcm92aWRlZCBleHRlbnNpb24gaGFzIGJlZW4gbG9hZGVkIHN1Y2Nlc3NmdWxseS5cclxuICAgICAgICAgKi9cclxuICAgICAgICBjaGVja0V4dGVuc2lvbjogZnVuY3Rpb24oIGFyZywgZXh0ZW5zaW9uICkge1xyXG4gICAgICAgICAgICBpZiAoICFleHRlbnNpb24gKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBzaGlmdCBwYXJhbWV0ZXJzIGlmIG5vIGNhbnZhcyBhcmcgaXMgcHJvdmlkZWRcclxuICAgICAgICAgICAgICAgIGV4dGVuc2lvbiA9IGFyZztcclxuICAgICAgICAgICAgICAgIGFyZyA9IG51bGw7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdmFyIHdyYXBwZXIgPSBnZXRDb250ZXh0V3JhcHBlciggYXJnICk7XHJcbiAgICAgICAgICAgIGlmICggd3JhcHBlciApIHtcclxuICAgICAgICAgICAgICAgIHZhciBleHRlbnNpb25zID0gd3JhcHBlci5leHRlbnNpb25zO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGV4dGVuc2lvbnNbIGV4dGVuc2lvbiBdID8gZXh0ZW5zaW9uc1sgZXh0ZW5zaW9uIF0gOiBmYWxzZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdObyBjb250ZXh0IGlzIGN1cnJlbnRseSBib3VuZCBvciBwcm92aWRlZCBhcyAnICtcclxuICAgICAgICAgICAgICAgICdhcmd1bWVudCwgcmV0dXJuaW5nIGZhbHNlLicpO1xyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuXHJcbn0oKSk7XHJcbiIsIihmdW5jdGlvbiAoKSB7XHJcblxyXG4gICAgJ3VzZSBzdHJpY3QnO1xyXG5cclxuICAgIG1vZHVsZS5leHBvcnRzID0ge1xyXG4gICAgICAgIEluZGV4QnVmZmVyOiByZXF1aXJlKCcuL2NvcmUvSW5kZXhCdWZmZXInKSxcclxuICAgICAgICBSZW5kZXJhYmxlOiByZXF1aXJlKCcuL2NvcmUvUmVuZGVyYWJsZScpLFxyXG4gICAgICAgIFJlbmRlclRhcmdldDogcmVxdWlyZSgnLi9jb3JlL1JlbmRlclRhcmdldCcpLFxyXG4gICAgICAgIFNoYWRlcjogcmVxdWlyZSgnLi9jb3JlL1NoYWRlcicpLFxyXG4gICAgICAgIFRleHR1cmUyRDogcmVxdWlyZSgnLi9jb3JlL1RleHR1cmUyRCcpLFxyXG4gICAgICAgIFRleHR1cmVDdWJlTWFwOiByZXF1aXJlKCcuL2NvcmUvVGV4dHVyZUN1YmVNYXAnKSxcclxuICAgICAgICBWZXJ0ZXhCdWZmZXI6IHJlcXVpcmUoJy4vY29yZS9WZXJ0ZXhCdWZmZXInKSxcclxuICAgICAgICBWZXJ0ZXhQYWNrYWdlOiByZXF1aXJlKCcuL2NvcmUvVmVydGV4UGFja2FnZScpLFxyXG4gICAgICAgIFZpZXdwb3J0OiByZXF1aXJlKCcuL2NvcmUvVmlld3BvcnQnKSxcclxuICAgICAgICBXZWJHTENvbnRleHQ6IHJlcXVpcmUoJy4vY29yZS9XZWJHTENvbnRleHQnKVxyXG4gICAgfTtcclxuXHJcbn0oKSk7XHJcbiIsIihmdW5jdGlvbiAoKSB7XHJcblxyXG4gICAgJ3VzZSBzdHJpY3QnO1xyXG5cclxuICAgIGZ1bmN0aW9uIFN0YWNrKCkge1xyXG4gICAgICAgIHRoaXMuZGF0YSA9IFtdO1xyXG4gICAgfVxyXG5cclxuICAgIFN0YWNrLnByb3RvdHlwZS5wdXNoID0gZnVuY3Rpb24oIHZhbHVlICkge1xyXG4gICAgICAgIHRoaXMuZGF0YS5wdXNoKCB2YWx1ZSApO1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfTtcclxuXHJcbiAgICBTdGFjay5wcm90b3R5cGUucG9wID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgdGhpcy5kYXRhLnBvcCgpO1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfTtcclxuXHJcbiAgICBTdGFjay5wcm90b3R5cGUudG9wID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgdmFyIGluZGV4ID0gdGhpcy5kYXRhLmxlbmd0aCAtIDE7XHJcbiAgICAgICAgaWYgKCBpbmRleCA8IDAgKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gdGhpcy5kYXRhWyBpbmRleCBdO1xyXG4gICAgfTtcclxuXHJcbiAgICBtb2R1bGUuZXhwb3J0cyA9IFN0YWNrO1xyXG5cclxufSgpKTtcclxuIiwiKGZ1bmN0aW9uICgpIHtcclxuXHJcbiAgICAndXNlIHN0cmljdCc7XHJcblxyXG4gICAgdmFyIHNpbXBseURlZmVycmVkID0gcmVxdWlyZSgnc2ltcGx5LWRlZmVycmVkJyksXHJcbiAgICAgICAgRGVmZXJyZWQgPSBzaW1wbHlEZWZlcnJlZC5EZWZlcnJlZCxcclxuICAgICAgICB3aGVuID0gc2ltcGx5RGVmZXJyZWQud2hlbjtcclxuXHJcbiAgICAvKipcclxuICAgICAqIFJldHVybnMgYSBmdW5jdGlvbiB0aGF0IHJlc29sdmVzIHRoZSBwcm92aWRlZCBkZWZlcnJlZC5cclxuICAgICAqXHJcbiAgICAgKiBAcGFyYW0ge0RlZmVycmVkfSBkZWZlcnJlZCAtIFRoZSBkZWZlcnJlZCBvYmplY3QuXHJcbiAgICAgKlxyXG4gICAgICogQHJldHVybnMge0Z1bmN0aW9ufSBUaGUgZnVuY3Rpb24gdG8gcmVzb2x2ZSB0aGUgZGVmZXJyZWQuXHJcbiAgICAgKi9cclxuICAgIGZ1bmN0aW9uIHJlc29sdmVEZWZlcnJlZCggZGVmZXJyZWQgKSB7XHJcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKCByZXN1bHQgKSB7XHJcbiAgICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUoIHJlc3VsdCApO1xyXG4gICAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBEaXNwYXRjaGVzIGFuIGFycmF5IG9mIGpvYnMsIGFjY3VtdWxhdGluZyB0aGUgcmVzdWx0cyBhbmRcclxuICAgICAqIHBhc3NpbmcgdGhlbSB0byB0aGUgY2FsbGJhY2sgZnVuY3Rpb24gaW4gY29ycmVzcG9uZGluZyBpbmRpY2VzLlxyXG4gICAgICpcclxuICAgICAqIEBwYXJhbSB7QXJyYXl9IGpvYnMgLSBUaGUgam9iIGFycmF5LlxyXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24uXHJcbiAgICAgKi9cclxuICAgICBmdW5jdGlvbiBhc3luY0FycmF5KCBqb2JzLCBjYWxsYmFjayApIHtcclxuICAgICAgICB2YXIgZGVmZXJyZWRzID0gW10sXHJcbiAgICAgICAgICAgIGRlZmVycmVkLFxyXG4gICAgICAgICAgICBpO1xyXG4gICAgICAgIGZvciAoIGk9MDsgaTxqb2JzLmxlbmd0aDsgaSsrICkge1xyXG4gICAgICAgICAgICBkZWZlcnJlZCA9IG5ldyBEZWZlcnJlZCgpO1xyXG4gICAgICAgICAgICBkZWZlcnJlZHMucHVzaCggZGVmZXJyZWQgKTtcclxuICAgICAgICAgICAgam9ic1tpXSggcmVzb2x2ZURlZmVycmVkKCBkZWZlcnJlZCApICk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHdoZW4uYXBwbHkoIHdoZW4sIGRlZmVycmVkcyApLnRoZW4oIGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICB2YXIgcmVzdWx0cyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKCBhcmd1bWVudHMsIDAgKTtcclxuICAgICAgICAgICAgY2FsbGJhY2soIHJlc3VsdHMgKTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIERpc3BhdGNoZXMgYSBtYXAgb2Ygam9icywgYWNjdW11bGF0aW5nIHRoZSByZXN1bHRzIGFuZFxyXG4gICAgICogcGFzc2luZyB0aGVtIHRvIHRoZSBjYWxsYmFjayBmdW5jdGlvbiB1bmRlciBjb3JyZXNwb25kaW5nXHJcbiAgICAgKiBrZXlzLlxyXG4gICAgICpcclxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBqb2JzIC0gVGhlIGpvYiBtYXAuXHJcbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbi5cclxuICAgICAqL1xyXG4gICAgIGZ1bmN0aW9uIGFzeW5jT2JqKCBqb2JzLCBjYWxsYmFjayApIHtcclxuICAgICAgICB2YXIgam9ic0J5SW5kZXggPSBbXSxcclxuICAgICAgICAgICAgZGVmZXJyZWRzID0gW10sXHJcbiAgICAgICAgICAgIGRlZmVycmVkLFxyXG4gICAgICAgICAgICBrZXk7XHJcbiAgICAgICAgZm9yICgga2V5IGluIGpvYnMgKSB7XHJcbiAgICAgICAgICAgIGlmICggam9icy5oYXNPd25Qcm9wZXJ0eSgga2V5ICkgKSB7XHJcbiAgICAgICAgICAgICAgICBkZWZlcnJlZCA9IG5ldyBEZWZlcnJlZCgpO1xyXG4gICAgICAgICAgICAgICAgZGVmZXJyZWRzLnB1c2goIGRlZmVycmVkICk7XHJcbiAgICAgICAgICAgICAgICBqb2JzQnlJbmRleC5wdXNoKCBrZXkgKTtcclxuICAgICAgICAgICAgICAgIGpvYnNbIGtleSBdKCByZXNvbHZlRGVmZXJyZWQoIGRlZmVycmVkICkgKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICB3aGVuLmFwcGx5KCB3aGVuLCBkZWZlcnJlZHMgKS5kb25lKCBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgdmFyIHJlc3VsdHMgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbCggYXJndW1lbnRzLCAwICksXHJcbiAgICAgICAgICAgICAgICByZXN1bHRzQnlLZXkgPSB7fSxcclxuICAgICAgICAgICAgICAgIGk7XHJcbiAgICAgICAgICAgIGZvciAoIGk9MDsgaTxqb2JzQnlJbmRleC5sZW5ndGg7IGkrKyApIHtcclxuICAgICAgICAgICAgICAgIHJlc3VsdHNCeUtleVsgam9ic0J5SW5kZXhbaV0gXSA9IHJlc3VsdHNbaV07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY2FsbGJhY2soIHJlc3VsdHNCeUtleSApO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIG1vZHVsZS5leHBvcnRzID0ge1xyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBFeGVjdXRlIGEgc2V0IG9mIGZ1bmN0aW9ucyBhc3luY2hyb25vdXNseSwgb25jZSBhbGwgaGF2ZSBiZWVuXHJcbiAgICAgICAgICogY29tcGxldGVkLCBleGVjdXRlIHRoZSBwcm92aWRlZCBjYWxsYmFjayBmdW5jdGlvbi4gSm9icyBtYXkgYmUgcGFzc2VkXHJcbiAgICAgICAgICogYXMgYW4gYXJyYXkgb3Igb2JqZWN0LiBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gd2lsbCBiZSBwYXNzZWQgdGhlXHJcbiAgICAgICAgICogcmVzdWx0cyBpbiB0aGUgc2FtZSBmb3JtYXQgYXMgdGhlIGpvYnMuIEFsbCBqb2JzIG11c3QgaGF2ZSBhY2NlcHQgYW5kXHJcbiAgICAgICAgICogZXhlY3V0ZSBhIGNhbGxiYWNrIGZ1bmN0aW9uIHVwb24gY29tcGxldGlvbi5cclxuICAgICAgICAgKlxyXG4gICAgICAgICAqIEBwYXJhbSB7QXJyYXl8T2JqZWN0fSBqb2JzIC0gVGhlIHNldCBvZiBmdW5jdGlvbnMgdG8gZXhlY3V0ZS5cclxuICAgICAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBleGVjdXRlZCB1cG9uIGNvbXBsZXRpb24uXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgYXN5bmM6IGZ1bmN0aW9uKCBqb2JzLCBjYWxsYmFjayApIHtcclxuICAgICAgICAgICAgaWYgKCBqb2JzIGluc3RhbmNlb2YgQXJyYXkgKSB7XHJcbiAgICAgICAgICAgICAgICBhc3luY0FycmF5KCBqb2JzLCBjYWxsYmFjayApO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgYXN5bmNPYmooIGpvYnMsIGNhbGxiYWNrICk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBSZXR1cm5zIHRydWUgaWYgYSBwcm92aWRlZCBhcnJheSBpcyBhIGphdnNjcmlwdCBUeXBlZEFycmF5LlxyXG4gICAgICAgICAqXHJcbiAgICAgICAgICogQHBhcmFtIHsqfSBhcnJheSAtIFRoZSB2YXJpYWJsZSB0byB0ZXN0LlxyXG4gICAgICAgICAqXHJcbiAgICAgICAgICogQHJldHVybnMge2Jvb2xlYW59IC0gV2hldGhlciBvciBub3QgdGhlIHZhcmlhYmxlIGlzIGEgVHlwZWRBcnJheS5cclxuICAgICAgICAgKi9cclxuICAgICAgICBpc1R5cGVkQXJyYXk6IGZ1bmN0aW9uKCBhcnJheSApIHtcclxuICAgICAgICAgICAgcmV0dXJuIGFycmF5ICYmXHJcbiAgICAgICAgICAgICAgICBhcnJheS5idWZmZXIgaW5zdGFuY2VvZiBBcnJheUJ1ZmZlciAmJlxyXG4gICAgICAgICAgICAgICAgYXJyYXkuYnl0ZUxlbmd0aCAhPT0gdW5kZWZpbmVkO1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIFJldHVybnMgdHJ1ZSBpZiB0aGUgcHJvdmlkZWQgaW50ZWdlciBpcyBhIHBvd2VyIG9mIHR3by5cclxuICAgICAgICAgKlxyXG4gICAgICAgICAqIEBwYXJhbSB7aW50ZWdlcn0gbnVtIC0gVGhlIG51bWJlciB0byB0ZXN0LlxyXG4gICAgICAgICAqXHJcbiAgICAgICAgICogQHJldHVybnMge2Jvb2xlYW59IC0gV2hldGhlciBvciBub3QgdGhlIG51bWJlciBpcyBhIHBvd2VyIG9mIHR3by5cclxuICAgICAgICAgKi9cclxuICAgICAgICBpc1Bvd2VyT2ZUd286IGZ1bmN0aW9uKCBudW0gKSB7XHJcbiAgICAgICAgICAgIHJldHVybiAoIG51bSAhPT0gMCApID8gKCBudW0gJiAoIG51bSAtIDEgKSApID09PSAwIDogZmFsc2U7XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogUmV0dXJucyB0aGUgbmV4dCBoaWdoZXN0IHBvd2VyIG9mIHR3byBmb3IgYSBudW1iZXIuXHJcbiAgICAgICAgICpcclxuICAgICAgICAgKiBFeC5cclxuICAgICAgICAgKlxyXG4gICAgICAgICAqICAgICAyMDAgLT4gMjU2XHJcbiAgICAgICAgICogICAgIDI1NiAtPiAyNTZcclxuICAgICAgICAgKiAgICAgMjU3IC0+IDUxMlxyXG4gICAgICAgICAqXHJcbiAgICAgICAgICogQHBhcmFtIHtpbnRlZ2VyfSBudW0gLSBUaGUgbnVtYmVyIHRvIG1vZGlmeS5cclxuICAgICAgICAgKlxyXG4gICAgICAgICAqIEByZXR1cm5zIHtpbnRlZ2VyfSAtIE5leHQgaGlnaGVzdCBwb3dlciBvZiB0d28uXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgbmV4dEhpZ2hlc3RQb3dlck9mVHdvOiBmdW5jdGlvbiggbnVtICkge1xyXG4gICAgICAgICAgICB2YXIgaTtcclxuICAgICAgICAgICAgaWYgKCBudW0gIT09IDAgKSB7XHJcbiAgICAgICAgICAgICAgICBudW0gPSBudW0tMTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBmb3IgKCBpPTE7IGk8MzI7IGk8PD0xICkge1xyXG4gICAgICAgICAgICAgICAgbnVtID0gbnVtIHwgbnVtID4+IGk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIG51bSArIDE7XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuXHJcbn0oKSk7XHJcbiIsIihmdW5jdGlvbigpIHtcblxuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIG1vZHVsZS5leHBvcnRzID0ge1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBTZW5kcyBhbiBYTUxIdHRwUmVxdWVzdCBHRVQgcmVxdWVzdCB0byB0aGUgc3VwcGxpZWQgdXJsLlxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gdXJsIC0gVGhlIFVSTCBmb3IgdGhlIHJlc291cmNlLlxuICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyAtIENvbnRhaW5zIHRoZSBmb2xsb3dpbmcgb3B0aW9uczpcbiAgICAgICAgICogPHByZT5cbiAgICAgICAgICogICAgIHtcbiAgICAgICAgICogICAgICAgICB7U3RyaW5nfSBzdWNjZXNzIC0gVGhlIHN1Y2Nlc3MgY2FsbGJhY2sgZnVuY3Rpb24uXG4gICAgICAgICAqICAgICAgICAge1N0cmluZ30gZXJyb3IgLSBUaGUgZXJyb3IgY2FsbGJhY2sgZnVuY3Rpb24uXG4gICAgICAgICAqICAgICAgICAge1N0cmluZ30gcHJvZ3Jlc3MgLSBUaGUgcHJvZ3Jlc3MgY2FsbGJhY2sgZnVuY3Rpb24uXG4gICAgICAgICAqICAgICAgICAge1N0cmluZ30gcmVzcG9uc2VUeXBlIC0gVGhlIHJlc3BvbnNlVHlwZSBvZiB0aGUgWEhSLlxuICAgICAgICAgKiAgICAgfVxuICAgICAgICAgKiA8L3ByZT5cbiAgICAgICAgICovXG4gICAgICAgIGxvYWQ6IGZ1bmN0aW9uICggdXJsLCBvcHRpb25zICkge1xuICAgICAgICAgICAgdmFyIHJlcXVlc3QgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcbiAgICAgICAgICAgIHJlcXVlc3Qub3BlbiggJ0dFVCcsIHVybCwgdHJ1ZSApO1xuICAgICAgICAgICAgcmVxdWVzdC5yZXNwb25zZVR5cGUgPSBvcHRpb25zLnJlc3BvbnNlVHlwZTtcbiAgICAgICAgICAgIHJlcXVlc3QuYWRkRXZlbnRMaXN0ZW5lciggJ2xvYWQnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgaWYgKCBvcHRpb25zLnN1Y2Nlc3MgKSB7XG4gICAgICAgICAgICAgICAgICAgIG9wdGlvbnMuc3VjY2VzcyggdGhpcy5yZXNwb25zZSApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaWYgKCBvcHRpb25zLnByb2dyZXNzICkge1xuICAgICAgICAgICAgICAgIHJlcXVlc3QuYWRkRXZlbnRMaXN0ZW5lciggJ3Byb2dyZXNzJywgZnVuY3Rpb24gKCBldmVudCApIHtcbiAgICAgICAgICAgICAgICAgICAgb3B0aW9ucy5wcm9ncmVzcyggZXZlbnQgKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICggb3B0aW9ucy5lcnJvciApIHtcbiAgICAgICAgICAgICAgICByZXF1ZXN0LmFkZEV2ZW50TGlzdGVuZXIoICdlcnJvcicsIGZ1bmN0aW9uICggZXZlbnQgKSB7XG4gICAgICAgICAgICAgICAgICAgIG9wdGlvbnMuZXJyb3IoIGV2ZW50ICk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXF1ZXN0LnNlbmQoKTtcbiAgICAgICAgfVxuICAgIH07XG5cbn0oKSk7XG4iLCJ2YXIganNvbiA9IHR5cGVvZiBKU09OICE9PSAndW5kZWZpbmVkJyA/IEpTT04gOiByZXF1aXJlKCdqc29uaWZ5Jyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKG9iaiwgb3B0cykge1xuICAgIGlmICghb3B0cykgb3B0cyA9IHt9O1xuICAgIGlmICh0eXBlb2Ygb3B0cyA9PT0gJ2Z1bmN0aW9uJykgb3B0cyA9IHsgY21wOiBvcHRzIH07XG4gICAgdmFyIHNwYWNlID0gb3B0cy5zcGFjZSB8fCAnJztcbiAgICBpZiAodHlwZW9mIHNwYWNlID09PSAnbnVtYmVyJykgc3BhY2UgPSBBcnJheShzcGFjZSsxKS5qb2luKCcgJyk7XG4gICAgdmFyIGN5Y2xlcyA9ICh0eXBlb2Ygb3B0cy5jeWNsZXMgPT09ICdib29sZWFuJykgPyBvcHRzLmN5Y2xlcyA6IGZhbHNlO1xuICAgIHZhciByZXBsYWNlciA9IG9wdHMucmVwbGFjZXIgfHwgZnVuY3Rpb24oa2V5LCB2YWx1ZSkgeyByZXR1cm4gdmFsdWU7IH07XG5cbiAgICB2YXIgY21wID0gb3B0cy5jbXAgJiYgKGZ1bmN0aW9uIChmKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAobm9kZSkge1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgICAgICAgICAgdmFyIGFvYmogPSB7IGtleTogYSwgdmFsdWU6IG5vZGVbYV0gfTtcbiAgICAgICAgICAgICAgICB2YXIgYm9iaiA9IHsga2V5OiBiLCB2YWx1ZTogbm9kZVtiXSB9O1xuICAgICAgICAgICAgICAgIHJldHVybiBmKGFvYmosIGJvYmopO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfTtcbiAgICB9KShvcHRzLmNtcCk7XG5cbiAgICB2YXIgc2VlbiA9IFtdO1xuICAgIHJldHVybiAoZnVuY3Rpb24gc3RyaW5naWZ5IChwYXJlbnQsIGtleSwgbm9kZSwgbGV2ZWwpIHtcbiAgICAgICAgdmFyIGluZGVudCA9IHNwYWNlID8gKCdcXG4nICsgbmV3IEFycmF5KGxldmVsICsgMSkuam9pbihzcGFjZSkpIDogJyc7XG4gICAgICAgIHZhciBjb2xvblNlcGFyYXRvciA9IHNwYWNlID8gJzogJyA6ICc6JztcblxuICAgICAgICBpZiAobm9kZSAmJiBub2RlLnRvSlNPTiAmJiB0eXBlb2Ygbm9kZS50b0pTT04gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIG5vZGUgPSBub2RlLnRvSlNPTigpO1xuICAgICAgICB9XG5cbiAgICAgICAgbm9kZSA9IHJlcGxhY2VyLmNhbGwocGFyZW50LCBrZXksIG5vZGUpO1xuXG4gICAgICAgIGlmIChub2RlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAodHlwZW9mIG5vZGUgIT09ICdvYmplY3QnIHx8IG5vZGUgPT09IG51bGwpIHtcbiAgICAgICAgICAgIHJldHVybiBqc29uLnN0cmluZ2lmeShub2RlKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaXNBcnJheShub2RlKSkge1xuICAgICAgICAgICAgdmFyIG91dCA9IFtdO1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBub2RlLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGl0ZW0gPSBzdHJpbmdpZnkobm9kZSwgaSwgbm9kZVtpXSwgbGV2ZWwrMSkgfHwganNvbi5zdHJpbmdpZnkobnVsbCk7XG4gICAgICAgICAgICAgICAgb3V0LnB1c2goaW5kZW50ICsgc3BhY2UgKyBpdGVtKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiAnWycgKyBvdXQuam9pbignLCcpICsgaW5kZW50ICsgJ10nO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgaWYgKHNlZW4uaW5kZXhPZihub2RlKSAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICBpZiAoY3ljbGVzKSByZXR1cm4ganNvbi5zdHJpbmdpZnkoJ19fY3ljbGVfXycpO1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0NvbnZlcnRpbmcgY2lyY3VsYXIgc3RydWN0dXJlIHRvIEpTT04nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Ugc2Vlbi5wdXNoKG5vZGUpO1xuXG4gICAgICAgICAgICB2YXIga2V5cyA9IG9iamVjdEtleXMobm9kZSkuc29ydChjbXAgJiYgY21wKG5vZGUpKTtcbiAgICAgICAgICAgIHZhciBvdXQgPSBbXTtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwga2V5cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIHZhciBrZXkgPSBrZXlzW2ldO1xuICAgICAgICAgICAgICAgIHZhciB2YWx1ZSA9IHN0cmluZ2lmeShub2RlLCBrZXksIG5vZGVba2V5XSwgbGV2ZWwrMSk7XG5cbiAgICAgICAgICAgICAgICBpZighdmFsdWUpIGNvbnRpbnVlO1xuXG4gICAgICAgICAgICAgICAgdmFyIGtleVZhbHVlID0ganNvbi5zdHJpbmdpZnkoa2V5KVxuICAgICAgICAgICAgICAgICAgICArIGNvbG9uU2VwYXJhdG9yXG4gICAgICAgICAgICAgICAgICAgICsgdmFsdWU7XG4gICAgICAgICAgICAgICAgO1xuICAgICAgICAgICAgICAgIG91dC5wdXNoKGluZGVudCArIHNwYWNlICsga2V5VmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc2Vlbi5zcGxpY2Uoc2Vlbi5pbmRleE9mKG5vZGUpLCAxKTtcbiAgICAgICAgICAgIHJldHVybiAneycgKyBvdXQuam9pbignLCcpICsgaW5kZW50ICsgJ30nO1xuICAgICAgICB9XG4gICAgfSkoeyAnJzogb2JqIH0sICcnLCBvYmosIDApO1xufTtcblxudmFyIGlzQXJyYXkgPSBBcnJheS5pc0FycmF5IHx8IGZ1bmN0aW9uICh4KSB7XG4gICAgcmV0dXJuIHt9LnRvU3RyaW5nLmNhbGwoeCkgPT09ICdbb2JqZWN0IEFycmF5XSc7XG59O1xuXG52YXIgb2JqZWN0S2V5cyA9IE9iamVjdC5rZXlzIHx8IGZ1bmN0aW9uIChvYmopIHtcbiAgICB2YXIgaGFzID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eSB8fCBmdW5jdGlvbiAoKSB7IHJldHVybiB0cnVlIH07XG4gICAgdmFyIGtleXMgPSBbXTtcbiAgICBmb3IgKHZhciBrZXkgaW4gb2JqKSB7XG4gICAgICAgIGlmIChoYXMuY2FsbChvYmosIGtleSkpIGtleXMucHVzaChrZXkpO1xuICAgIH1cbiAgICByZXR1cm4ga2V5cztcbn07XG4iLCJleHBvcnRzLnBhcnNlID0gcmVxdWlyZSgnLi9saWIvcGFyc2UnKTtcbmV4cG9ydHMuc3RyaW5naWZ5ID0gcmVxdWlyZSgnLi9saWIvc3RyaW5naWZ5Jyk7XG4iLCJ2YXIgYXQsIC8vIFRoZSBpbmRleCBvZiB0aGUgY3VycmVudCBjaGFyYWN0ZXJcbiAgICBjaCwgLy8gVGhlIGN1cnJlbnQgY2hhcmFjdGVyXG4gICAgZXNjYXBlZSA9IHtcbiAgICAgICAgJ1wiJzogICdcIicsXG4gICAgICAgICdcXFxcJzogJ1xcXFwnLFxuICAgICAgICAnLyc6ICAnLycsXG4gICAgICAgIGI6ICAgICdcXGInLFxuICAgICAgICBmOiAgICAnXFxmJyxcbiAgICAgICAgbjogICAgJ1xcbicsXG4gICAgICAgIHI6ICAgICdcXHInLFxuICAgICAgICB0OiAgICAnXFx0J1xuICAgIH0sXG4gICAgdGV4dCxcblxuICAgIGVycm9yID0gZnVuY3Rpb24gKG0pIHtcbiAgICAgICAgLy8gQ2FsbCBlcnJvciB3aGVuIHNvbWV0aGluZyBpcyB3cm9uZy5cbiAgICAgICAgdGhyb3cge1xuICAgICAgICAgICAgbmFtZTogICAgJ1N5bnRheEVycm9yJyxcbiAgICAgICAgICAgIG1lc3NhZ2U6IG0sXG4gICAgICAgICAgICBhdDogICAgICBhdCxcbiAgICAgICAgICAgIHRleHQ6ICAgIHRleHRcbiAgICAgICAgfTtcbiAgICB9LFxuICAgIFxuICAgIG5leHQgPSBmdW5jdGlvbiAoYykge1xuICAgICAgICAvLyBJZiBhIGMgcGFyYW1ldGVyIGlzIHByb3ZpZGVkLCB2ZXJpZnkgdGhhdCBpdCBtYXRjaGVzIHRoZSBjdXJyZW50IGNoYXJhY3Rlci5cbiAgICAgICAgaWYgKGMgJiYgYyAhPT0gY2gpIHtcbiAgICAgICAgICAgIGVycm9yKFwiRXhwZWN0ZWQgJ1wiICsgYyArIFwiJyBpbnN0ZWFkIG9mICdcIiArIGNoICsgXCInXCIpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBHZXQgdGhlIG5leHQgY2hhcmFjdGVyLiBXaGVuIHRoZXJlIGFyZSBubyBtb3JlIGNoYXJhY3RlcnMsXG4gICAgICAgIC8vIHJldHVybiB0aGUgZW1wdHkgc3RyaW5nLlxuICAgICAgICBcbiAgICAgICAgY2ggPSB0ZXh0LmNoYXJBdChhdCk7XG4gICAgICAgIGF0ICs9IDE7XG4gICAgICAgIHJldHVybiBjaDtcbiAgICB9LFxuICAgIFxuICAgIG51bWJlciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgLy8gUGFyc2UgYSBudW1iZXIgdmFsdWUuXG4gICAgICAgIHZhciBudW1iZXIsXG4gICAgICAgICAgICBzdHJpbmcgPSAnJztcbiAgICAgICAgXG4gICAgICAgIGlmIChjaCA9PT0gJy0nKSB7XG4gICAgICAgICAgICBzdHJpbmcgPSAnLSc7XG4gICAgICAgICAgICBuZXh0KCctJyk7XG4gICAgICAgIH1cbiAgICAgICAgd2hpbGUgKGNoID49ICcwJyAmJiBjaCA8PSAnOScpIHtcbiAgICAgICAgICAgIHN0cmluZyArPSBjaDtcbiAgICAgICAgICAgIG5leHQoKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoY2ggPT09ICcuJykge1xuICAgICAgICAgICAgc3RyaW5nICs9ICcuJztcbiAgICAgICAgICAgIHdoaWxlIChuZXh0KCkgJiYgY2ggPj0gJzAnICYmIGNoIDw9ICc5Jykge1xuICAgICAgICAgICAgICAgIHN0cmluZyArPSBjaDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoY2ggPT09ICdlJyB8fCBjaCA9PT0gJ0UnKSB7XG4gICAgICAgICAgICBzdHJpbmcgKz0gY2g7XG4gICAgICAgICAgICBuZXh0KCk7XG4gICAgICAgICAgICBpZiAoY2ggPT09ICctJyB8fCBjaCA9PT0gJysnKSB7XG4gICAgICAgICAgICAgICAgc3RyaW5nICs9IGNoO1xuICAgICAgICAgICAgICAgIG5leHQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHdoaWxlIChjaCA+PSAnMCcgJiYgY2ggPD0gJzknKSB7XG4gICAgICAgICAgICAgICAgc3RyaW5nICs9IGNoO1xuICAgICAgICAgICAgICAgIG5leHQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBudW1iZXIgPSArc3RyaW5nO1xuICAgICAgICBpZiAoIWlzRmluaXRlKG51bWJlcikpIHtcbiAgICAgICAgICAgIGVycm9yKFwiQmFkIG51bWJlclwiKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBudW1iZXI7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIHN0cmluZyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgLy8gUGFyc2UgYSBzdHJpbmcgdmFsdWUuXG4gICAgICAgIHZhciBoZXgsXG4gICAgICAgICAgICBpLFxuICAgICAgICAgICAgc3RyaW5nID0gJycsXG4gICAgICAgICAgICB1ZmZmZjtcbiAgICAgICAgXG4gICAgICAgIC8vIFdoZW4gcGFyc2luZyBmb3Igc3RyaW5nIHZhbHVlcywgd2UgbXVzdCBsb29rIGZvciBcIiBhbmQgXFwgY2hhcmFjdGVycy5cbiAgICAgICAgaWYgKGNoID09PSAnXCInKSB7XG4gICAgICAgICAgICB3aGlsZSAobmV4dCgpKSB7XG4gICAgICAgICAgICAgICAgaWYgKGNoID09PSAnXCInKSB7XG4gICAgICAgICAgICAgICAgICAgIG5leHQoKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHN0cmluZztcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGNoID09PSAnXFxcXCcpIHtcbiAgICAgICAgICAgICAgICAgICAgbmV4dCgpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoY2ggPT09ICd1Jykge1xuICAgICAgICAgICAgICAgICAgICAgICAgdWZmZmYgPSAwO1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChpID0gMDsgaSA8IDQ7IGkgKz0gMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhleCA9IHBhcnNlSW50KG5leHQoKSwgMTYpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghaXNGaW5pdGUoaGV4KSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdWZmZmYgPSB1ZmZmZiAqIDE2ICsgaGV4O1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgc3RyaW5nICs9IFN0cmluZy5mcm9tQ2hhckNvZGUodWZmZmYpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBlc2NhcGVlW2NoXSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0cmluZyArPSBlc2NhcGVlW2NoXTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgc3RyaW5nICs9IGNoO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlcnJvcihcIkJhZCBzdHJpbmdcIik7XG4gICAgfSxcblxuICAgIHdoaXRlID0gZnVuY3Rpb24gKCkge1xuXG4vLyBTa2lwIHdoaXRlc3BhY2UuXG5cbiAgICAgICAgd2hpbGUgKGNoICYmIGNoIDw9ICcgJykge1xuICAgICAgICAgICAgbmV4dCgpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIHdvcmQgPSBmdW5jdGlvbiAoKSB7XG5cbi8vIHRydWUsIGZhbHNlLCBvciBudWxsLlxuXG4gICAgICAgIHN3aXRjaCAoY2gpIHtcbiAgICAgICAgY2FzZSAndCc6XG4gICAgICAgICAgICBuZXh0KCd0Jyk7XG4gICAgICAgICAgICBuZXh0KCdyJyk7XG4gICAgICAgICAgICBuZXh0KCd1Jyk7XG4gICAgICAgICAgICBuZXh0KCdlJyk7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgY2FzZSAnZic6XG4gICAgICAgICAgICBuZXh0KCdmJyk7XG4gICAgICAgICAgICBuZXh0KCdhJyk7XG4gICAgICAgICAgICBuZXh0KCdsJyk7XG4gICAgICAgICAgICBuZXh0KCdzJyk7XG4gICAgICAgICAgICBuZXh0KCdlJyk7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIGNhc2UgJ24nOlxuICAgICAgICAgICAgbmV4dCgnbicpO1xuICAgICAgICAgICAgbmV4dCgndScpO1xuICAgICAgICAgICAgbmV4dCgnbCcpO1xuICAgICAgICAgICAgbmV4dCgnbCcpO1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgZXJyb3IoXCJVbmV4cGVjdGVkICdcIiArIGNoICsgXCInXCIpO1xuICAgIH0sXG5cbiAgICB2YWx1ZSwgIC8vIFBsYWNlIGhvbGRlciBmb3IgdGhlIHZhbHVlIGZ1bmN0aW9uLlxuXG4gICAgYXJyYXkgPSBmdW5jdGlvbiAoKSB7XG5cbi8vIFBhcnNlIGFuIGFycmF5IHZhbHVlLlxuXG4gICAgICAgIHZhciBhcnJheSA9IFtdO1xuXG4gICAgICAgIGlmIChjaCA9PT0gJ1snKSB7XG4gICAgICAgICAgICBuZXh0KCdbJyk7XG4gICAgICAgICAgICB3aGl0ZSgpO1xuICAgICAgICAgICAgaWYgKGNoID09PSAnXScpIHtcbiAgICAgICAgICAgICAgICBuZXh0KCddJyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGFycmF5OyAgIC8vIGVtcHR5IGFycmF5XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB3aGlsZSAoY2gpIHtcbiAgICAgICAgICAgICAgICBhcnJheS5wdXNoKHZhbHVlKCkpO1xuICAgICAgICAgICAgICAgIHdoaXRlKCk7XG4gICAgICAgICAgICAgICAgaWYgKGNoID09PSAnXScpIHtcbiAgICAgICAgICAgICAgICAgICAgbmV4dCgnXScpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXJyYXk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIG5leHQoJywnKTtcbiAgICAgICAgICAgICAgICB3aGl0ZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVycm9yKFwiQmFkIGFycmF5XCIpO1xuICAgIH0sXG5cbiAgICBvYmplY3QgPSBmdW5jdGlvbiAoKSB7XG5cbi8vIFBhcnNlIGFuIG9iamVjdCB2YWx1ZS5cblxuICAgICAgICB2YXIga2V5LFxuICAgICAgICAgICAgb2JqZWN0ID0ge307XG5cbiAgICAgICAgaWYgKGNoID09PSAneycpIHtcbiAgICAgICAgICAgIG5leHQoJ3snKTtcbiAgICAgICAgICAgIHdoaXRlKCk7XG4gICAgICAgICAgICBpZiAoY2ggPT09ICd9Jykge1xuICAgICAgICAgICAgICAgIG5leHQoJ30nKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gb2JqZWN0OyAgIC8vIGVtcHR5IG9iamVjdFxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgd2hpbGUgKGNoKSB7XG4gICAgICAgICAgICAgICAga2V5ID0gc3RyaW5nKCk7XG4gICAgICAgICAgICAgICAgd2hpdGUoKTtcbiAgICAgICAgICAgICAgICBuZXh0KCc6Jyk7XG4gICAgICAgICAgICAgICAgaWYgKE9iamVjdC5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iamVjdCwga2V5KSkge1xuICAgICAgICAgICAgICAgICAgICBlcnJvcignRHVwbGljYXRlIGtleSBcIicgKyBrZXkgKyAnXCInKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgb2JqZWN0W2tleV0gPSB2YWx1ZSgpO1xuICAgICAgICAgICAgICAgIHdoaXRlKCk7XG4gICAgICAgICAgICAgICAgaWYgKGNoID09PSAnfScpIHtcbiAgICAgICAgICAgICAgICAgICAgbmV4dCgnfScpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gb2JqZWN0O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBuZXh0KCcsJyk7XG4gICAgICAgICAgICAgICAgd2hpdGUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlcnJvcihcIkJhZCBvYmplY3RcIik7XG4gICAgfTtcblxudmFsdWUgPSBmdW5jdGlvbiAoKSB7XG5cbi8vIFBhcnNlIGEgSlNPTiB2YWx1ZS4gSXQgY291bGQgYmUgYW4gb2JqZWN0LCBhbiBhcnJheSwgYSBzdHJpbmcsIGEgbnVtYmVyLFxuLy8gb3IgYSB3b3JkLlxuXG4gICAgd2hpdGUoKTtcbiAgICBzd2l0Y2ggKGNoKSB7XG4gICAgY2FzZSAneyc6XG4gICAgICAgIHJldHVybiBvYmplY3QoKTtcbiAgICBjYXNlICdbJzpcbiAgICAgICAgcmV0dXJuIGFycmF5KCk7XG4gICAgY2FzZSAnXCInOlxuICAgICAgICByZXR1cm4gc3RyaW5nKCk7XG4gICAgY2FzZSAnLSc6XG4gICAgICAgIHJldHVybiBudW1iZXIoKTtcbiAgICBkZWZhdWx0OlxuICAgICAgICByZXR1cm4gY2ggPj0gJzAnICYmIGNoIDw9ICc5JyA/IG51bWJlcigpIDogd29yZCgpO1xuICAgIH1cbn07XG5cbi8vIFJldHVybiB0aGUganNvbl9wYXJzZSBmdW5jdGlvbi4gSXQgd2lsbCBoYXZlIGFjY2VzcyB0byBhbGwgb2YgdGhlIGFib3ZlXG4vLyBmdW5jdGlvbnMgYW5kIHZhcmlhYmxlcy5cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoc291cmNlLCByZXZpdmVyKSB7XG4gICAgdmFyIHJlc3VsdDtcbiAgICBcbiAgICB0ZXh0ID0gc291cmNlO1xuICAgIGF0ID0gMDtcbiAgICBjaCA9ICcgJztcbiAgICByZXN1bHQgPSB2YWx1ZSgpO1xuICAgIHdoaXRlKCk7XG4gICAgaWYgKGNoKSB7XG4gICAgICAgIGVycm9yKFwiU3ludGF4IGVycm9yXCIpO1xuICAgIH1cblxuICAgIC8vIElmIHRoZXJlIGlzIGEgcmV2aXZlciBmdW5jdGlvbiwgd2UgcmVjdXJzaXZlbHkgd2FsayB0aGUgbmV3IHN0cnVjdHVyZSxcbiAgICAvLyBwYXNzaW5nIGVhY2ggbmFtZS92YWx1ZSBwYWlyIHRvIHRoZSByZXZpdmVyIGZ1bmN0aW9uIGZvciBwb3NzaWJsZVxuICAgIC8vIHRyYW5zZm9ybWF0aW9uLCBzdGFydGluZyB3aXRoIGEgdGVtcG9yYXJ5IHJvb3Qgb2JqZWN0IHRoYXQgaG9sZHMgdGhlIHJlc3VsdFxuICAgIC8vIGluIGFuIGVtcHR5IGtleS4gSWYgdGhlcmUgaXMgbm90IGEgcmV2aXZlciBmdW5jdGlvbiwgd2Ugc2ltcGx5IHJldHVybiB0aGVcbiAgICAvLyByZXN1bHQuXG5cbiAgICByZXR1cm4gdHlwZW9mIHJldml2ZXIgPT09ICdmdW5jdGlvbicgPyAoZnVuY3Rpb24gd2Fsayhob2xkZXIsIGtleSkge1xuICAgICAgICB2YXIgaywgdiwgdmFsdWUgPSBob2xkZXJba2V5XTtcbiAgICAgICAgaWYgKHZhbHVlICYmIHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgIGZvciAoayBpbiB2YWx1ZSkge1xuICAgICAgICAgICAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwodmFsdWUsIGspKSB7XG4gICAgICAgICAgICAgICAgICAgIHYgPSB3YWxrKHZhbHVlLCBrKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHYgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWVba10gPSB2O1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHZhbHVlW2tdO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXZpdmVyLmNhbGwoaG9sZGVyLCBrZXksIHZhbHVlKTtcbiAgICB9KHsnJzogcmVzdWx0fSwgJycpKSA6IHJlc3VsdDtcbn07XG4iLCJ2YXIgY3ggPSAvW1xcdTAwMDBcXHUwMGFkXFx1MDYwMC1cXHUwNjA0XFx1MDcwZlxcdTE3YjRcXHUxN2I1XFx1MjAwYy1cXHUyMDBmXFx1MjAyOC1cXHUyMDJmXFx1MjA2MC1cXHUyMDZmXFx1ZmVmZlxcdWZmZjAtXFx1ZmZmZl0vZyxcbiAgICBlc2NhcGFibGUgPSAvW1xcXFxcXFwiXFx4MDAtXFx4MWZcXHg3Zi1cXHg5ZlxcdTAwYWRcXHUwNjAwLVxcdTA2MDRcXHUwNzBmXFx1MTdiNFxcdTE3YjVcXHUyMDBjLVxcdTIwMGZcXHUyMDI4LVxcdTIwMmZcXHUyMDYwLVxcdTIwNmZcXHVmZWZmXFx1ZmZmMC1cXHVmZmZmXS9nLFxuICAgIGdhcCxcbiAgICBpbmRlbnQsXG4gICAgbWV0YSA9IHsgICAgLy8gdGFibGUgb2YgY2hhcmFjdGVyIHN1YnN0aXR1dGlvbnNcbiAgICAgICAgJ1xcYic6ICdcXFxcYicsXG4gICAgICAgICdcXHQnOiAnXFxcXHQnLFxuICAgICAgICAnXFxuJzogJ1xcXFxuJyxcbiAgICAgICAgJ1xcZic6ICdcXFxcZicsXG4gICAgICAgICdcXHInOiAnXFxcXHInLFxuICAgICAgICAnXCInIDogJ1xcXFxcIicsXG4gICAgICAgICdcXFxcJzogJ1xcXFxcXFxcJ1xuICAgIH0sXG4gICAgcmVwO1xuXG5mdW5jdGlvbiBxdW90ZShzdHJpbmcpIHtcbiAgICAvLyBJZiB0aGUgc3RyaW5nIGNvbnRhaW5zIG5vIGNvbnRyb2wgY2hhcmFjdGVycywgbm8gcXVvdGUgY2hhcmFjdGVycywgYW5kIG5vXG4gICAgLy8gYmFja3NsYXNoIGNoYXJhY3RlcnMsIHRoZW4gd2UgY2FuIHNhZmVseSBzbGFwIHNvbWUgcXVvdGVzIGFyb3VuZCBpdC5cbiAgICAvLyBPdGhlcndpc2Ugd2UgbXVzdCBhbHNvIHJlcGxhY2UgdGhlIG9mZmVuZGluZyBjaGFyYWN0ZXJzIHdpdGggc2FmZSBlc2NhcGVcbiAgICAvLyBzZXF1ZW5jZXMuXG4gICAgXG4gICAgZXNjYXBhYmxlLmxhc3RJbmRleCA9IDA7XG4gICAgcmV0dXJuIGVzY2FwYWJsZS50ZXN0KHN0cmluZykgPyAnXCInICsgc3RyaW5nLnJlcGxhY2UoZXNjYXBhYmxlLCBmdW5jdGlvbiAoYSkge1xuICAgICAgICB2YXIgYyA9IG1ldGFbYV07XG4gICAgICAgIHJldHVybiB0eXBlb2YgYyA9PT0gJ3N0cmluZycgPyBjIDpcbiAgICAgICAgICAgICdcXFxcdScgKyAoJzAwMDAnICsgYS5jaGFyQ29kZUF0KDApLnRvU3RyaW5nKDE2KSkuc2xpY2UoLTQpO1xuICAgIH0pICsgJ1wiJyA6ICdcIicgKyBzdHJpbmcgKyAnXCInO1xufVxuXG5mdW5jdGlvbiBzdHIoa2V5LCBob2xkZXIpIHtcbiAgICAvLyBQcm9kdWNlIGEgc3RyaW5nIGZyb20gaG9sZGVyW2tleV0uXG4gICAgdmFyIGksICAgICAgICAgIC8vIFRoZSBsb29wIGNvdW50ZXIuXG4gICAgICAgIGssICAgICAgICAgIC8vIFRoZSBtZW1iZXIga2V5LlxuICAgICAgICB2LCAgICAgICAgICAvLyBUaGUgbWVtYmVyIHZhbHVlLlxuICAgICAgICBsZW5ndGgsXG4gICAgICAgIG1pbmQgPSBnYXAsXG4gICAgICAgIHBhcnRpYWwsXG4gICAgICAgIHZhbHVlID0gaG9sZGVyW2tleV07XG4gICAgXG4gICAgLy8gSWYgdGhlIHZhbHVlIGhhcyBhIHRvSlNPTiBtZXRob2QsIGNhbGwgaXQgdG8gb2J0YWluIGEgcmVwbGFjZW1lbnQgdmFsdWUuXG4gICAgaWYgKHZhbHVlICYmIHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcgJiZcbiAgICAgICAgICAgIHR5cGVvZiB2YWx1ZS50b0pTT04gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgdmFsdWUgPSB2YWx1ZS50b0pTT04oa2V5KTtcbiAgICB9XG4gICAgXG4gICAgLy8gSWYgd2Ugd2VyZSBjYWxsZWQgd2l0aCBhIHJlcGxhY2VyIGZ1bmN0aW9uLCB0aGVuIGNhbGwgdGhlIHJlcGxhY2VyIHRvXG4gICAgLy8gb2J0YWluIGEgcmVwbGFjZW1lbnQgdmFsdWUuXG4gICAgaWYgKHR5cGVvZiByZXAgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgdmFsdWUgPSByZXAuY2FsbChob2xkZXIsIGtleSwgdmFsdWUpO1xuICAgIH1cbiAgICBcbiAgICAvLyBXaGF0IGhhcHBlbnMgbmV4dCBkZXBlbmRzIG9uIHRoZSB2YWx1ZSdzIHR5cGUuXG4gICAgc3dpdGNoICh0eXBlb2YgdmFsdWUpIHtcbiAgICAgICAgY2FzZSAnc3RyaW5nJzpcbiAgICAgICAgICAgIHJldHVybiBxdW90ZSh2YWx1ZSk7XG4gICAgICAgIFxuICAgICAgICBjYXNlICdudW1iZXInOlxuICAgICAgICAgICAgLy8gSlNPTiBudW1iZXJzIG11c3QgYmUgZmluaXRlLiBFbmNvZGUgbm9uLWZpbml0ZSBudW1iZXJzIGFzIG51bGwuXG4gICAgICAgICAgICByZXR1cm4gaXNGaW5pdGUodmFsdWUpID8gU3RyaW5nKHZhbHVlKSA6ICdudWxsJztcbiAgICAgICAgXG4gICAgICAgIGNhc2UgJ2Jvb2xlYW4nOlxuICAgICAgICBjYXNlICdudWxsJzpcbiAgICAgICAgICAgIC8vIElmIHRoZSB2YWx1ZSBpcyBhIGJvb2xlYW4gb3IgbnVsbCwgY29udmVydCBpdCB0byBhIHN0cmluZy4gTm90ZTpcbiAgICAgICAgICAgIC8vIHR5cGVvZiBudWxsIGRvZXMgbm90IHByb2R1Y2UgJ251bGwnLiBUaGUgY2FzZSBpcyBpbmNsdWRlZCBoZXJlIGluXG4gICAgICAgICAgICAvLyB0aGUgcmVtb3RlIGNoYW5jZSB0aGF0IHRoaXMgZ2V0cyBmaXhlZCBzb21lZGF5LlxuICAgICAgICAgICAgcmV0dXJuIFN0cmluZyh2YWx1ZSk7XG4gICAgICAgICAgICBcbiAgICAgICAgY2FzZSAnb2JqZWN0JzpcbiAgICAgICAgICAgIGlmICghdmFsdWUpIHJldHVybiAnbnVsbCc7XG4gICAgICAgICAgICBnYXAgKz0gaW5kZW50O1xuICAgICAgICAgICAgcGFydGlhbCA9IFtdO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBBcnJheS5pc0FycmF5XG4gICAgICAgICAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5hcHBseSh2YWx1ZSkgPT09ICdbb2JqZWN0IEFycmF5XScpIHtcbiAgICAgICAgICAgICAgICBsZW5ndGggPSB2YWx1ZS5sZW5ndGg7XG4gICAgICAgICAgICAgICAgZm9yIChpID0gMDsgaSA8IGxlbmd0aDsgaSArPSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIHBhcnRpYWxbaV0gPSBzdHIoaSwgdmFsdWUpIHx8ICdudWxsJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gSm9pbiBhbGwgb2YgdGhlIGVsZW1lbnRzIHRvZ2V0aGVyLCBzZXBhcmF0ZWQgd2l0aCBjb21tYXMsIGFuZFxuICAgICAgICAgICAgICAgIC8vIHdyYXAgdGhlbSBpbiBicmFja2V0cy5cbiAgICAgICAgICAgICAgICB2ID0gcGFydGlhbC5sZW5ndGggPT09IDAgPyAnW10nIDogZ2FwID9cbiAgICAgICAgICAgICAgICAgICAgJ1tcXG4nICsgZ2FwICsgcGFydGlhbC5qb2luKCcsXFxuJyArIGdhcCkgKyAnXFxuJyArIG1pbmQgKyAnXScgOlxuICAgICAgICAgICAgICAgICAgICAnWycgKyBwYXJ0aWFsLmpvaW4oJywnKSArICddJztcbiAgICAgICAgICAgICAgICBnYXAgPSBtaW5kO1xuICAgICAgICAgICAgICAgIHJldHVybiB2O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBJZiB0aGUgcmVwbGFjZXIgaXMgYW4gYXJyYXksIHVzZSBpdCB0byBzZWxlY3QgdGhlIG1lbWJlcnMgdG8gYmVcbiAgICAgICAgICAgIC8vIHN0cmluZ2lmaWVkLlxuICAgICAgICAgICAgaWYgKHJlcCAmJiB0eXBlb2YgcmVwID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgICAgIGxlbmd0aCA9IHJlcC5sZW5ndGg7XG4gICAgICAgICAgICAgICAgZm9yIChpID0gMDsgaSA8IGxlbmd0aDsgaSArPSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIGsgPSByZXBbaV07XG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgayA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHYgPSBzdHIoaywgdmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHYpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJ0aWFsLnB1c2gocXVvdGUoaykgKyAoZ2FwID8gJzogJyA6ICc6JykgKyB2KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIE90aGVyd2lzZSwgaXRlcmF0ZSB0aHJvdWdoIGFsbCBvZiB0aGUga2V5cyBpbiB0aGUgb2JqZWN0LlxuICAgICAgICAgICAgICAgIGZvciAoayBpbiB2YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHZhbHVlLCBrKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdiA9IHN0cihrLCB2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcnRpYWwucHVzaChxdW90ZShrKSArIChnYXAgPyAnOiAnIDogJzonKSArIHYpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgIC8vIEpvaW4gYWxsIG9mIHRoZSBtZW1iZXIgdGV4dHMgdG9nZXRoZXIsIHNlcGFyYXRlZCB3aXRoIGNvbW1hcyxcbiAgICAgICAgLy8gYW5kIHdyYXAgdGhlbSBpbiBicmFjZXMuXG5cbiAgICAgICAgdiA9IHBhcnRpYWwubGVuZ3RoID09PSAwID8gJ3t9JyA6IGdhcCA/XG4gICAgICAgICAgICAne1xcbicgKyBnYXAgKyBwYXJ0aWFsLmpvaW4oJyxcXG4nICsgZ2FwKSArICdcXG4nICsgbWluZCArICd9JyA6XG4gICAgICAgICAgICAneycgKyBwYXJ0aWFsLmpvaW4oJywnKSArICd9JztcbiAgICAgICAgZ2FwID0gbWluZDtcbiAgICAgICAgcmV0dXJuIHY7XG4gICAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uICh2YWx1ZSwgcmVwbGFjZXIsIHNwYWNlKSB7XG4gICAgdmFyIGk7XG4gICAgZ2FwID0gJyc7XG4gICAgaW5kZW50ID0gJyc7XG4gICAgXG4gICAgLy8gSWYgdGhlIHNwYWNlIHBhcmFtZXRlciBpcyBhIG51bWJlciwgbWFrZSBhbiBpbmRlbnQgc3RyaW5nIGNvbnRhaW5pbmcgdGhhdFxuICAgIC8vIG1hbnkgc3BhY2VzLlxuICAgIGlmICh0eXBlb2Ygc3BhY2UgPT09ICdudW1iZXInKSB7XG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBzcGFjZTsgaSArPSAxKSB7XG4gICAgICAgICAgICBpbmRlbnQgKz0gJyAnO1xuICAgICAgICB9XG4gICAgfVxuICAgIC8vIElmIHRoZSBzcGFjZSBwYXJhbWV0ZXIgaXMgYSBzdHJpbmcsIGl0IHdpbGwgYmUgdXNlZCBhcyB0aGUgaW5kZW50IHN0cmluZy5cbiAgICBlbHNlIGlmICh0eXBlb2Ygc3BhY2UgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIGluZGVudCA9IHNwYWNlO1xuICAgIH1cblxuICAgIC8vIElmIHRoZXJlIGlzIGEgcmVwbGFjZXIsIGl0IG11c3QgYmUgYSBmdW5jdGlvbiBvciBhbiBhcnJheS5cbiAgICAvLyBPdGhlcndpc2UsIHRocm93IGFuIGVycm9yLlxuICAgIHJlcCA9IHJlcGxhY2VyO1xuICAgIGlmIChyZXBsYWNlciAmJiB0eXBlb2YgcmVwbGFjZXIgIT09ICdmdW5jdGlvbidcbiAgICAmJiAodHlwZW9mIHJlcGxhY2VyICE9PSAnb2JqZWN0JyB8fCB0eXBlb2YgcmVwbGFjZXIubGVuZ3RoICE9PSAnbnVtYmVyJykpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdKU09OLnN0cmluZ2lmeScpO1xuICAgIH1cbiAgICBcbiAgICAvLyBNYWtlIGEgZmFrZSByb290IG9iamVjdCBjb250YWluaW5nIG91ciB2YWx1ZSB1bmRlciB0aGUga2V5IG9mICcnLlxuICAgIC8vIFJldHVybiB0aGUgcmVzdWx0IG9mIHN0cmluZ2lmeWluZyB0aGUgdmFsdWUuXG4gICAgcmV0dXJuIHN0cignJywgeycnOiB2YWx1ZX0pO1xufTtcbiIsIi8vIEdlbmVyYXRlZCBieSBDb2ZmZWVTY3JpcHQgMS42LjNcbihmdW5jdGlvbigpIHtcbiAgdmFyIERlZmVycmVkLCBQRU5ESU5HLCBSRUpFQ1RFRCwgUkVTT0xWRUQsIFZFUlNJT04sIGFmdGVyLCBleGVjdXRlLCBmbGF0dGVuLCBoYXMsIGluc3RhbGxJbnRvLCBpc0FyZ3VtZW50cywgaXNQcm9taXNlLCB3cmFwLCBfd2hlbixcbiAgICBfX3NsaWNlID0gW10uc2xpY2U7XG5cbiAgVkVSU0lPTiA9ICczLjAuMCc7XG5cbiAgUEVORElORyA9IFwicGVuZGluZ1wiO1xuXG4gIFJFU09MVkVEID0gXCJyZXNvbHZlZFwiO1xuXG4gIFJFSkVDVEVEID0gXCJyZWplY3RlZFwiO1xuXG4gIGhhcyA9IGZ1bmN0aW9uKG9iaiwgcHJvcCkge1xuICAgIHJldHVybiBvYmogIT0gbnVsbCA/IG9iai5oYXNPd25Qcm9wZXJ0eShwcm9wKSA6IHZvaWQgMDtcbiAgfTtcblxuICBpc0FyZ3VtZW50cyA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHJldHVybiBoYXMob2JqLCAnbGVuZ3RoJykgJiYgaGFzKG9iaiwgJ2NhbGxlZScpO1xuICB9O1xuXG4gIGlzUHJvbWlzZSA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHJldHVybiBoYXMob2JqLCAncHJvbWlzZScpICYmIHR5cGVvZiAob2JqICE9IG51bGwgPyBvYmoucHJvbWlzZSA6IHZvaWQgMCkgPT09ICdmdW5jdGlvbic7XG4gIH07XG5cbiAgZmxhdHRlbiA9IGZ1bmN0aW9uKGFycmF5KSB7XG4gICAgaWYgKGlzQXJndW1lbnRzKGFycmF5KSkge1xuICAgICAgcmV0dXJuIGZsYXR0ZW4oQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJyYXkpKTtcbiAgICB9XG4gICAgaWYgKCFBcnJheS5pc0FycmF5KGFycmF5KSkge1xuICAgICAgcmV0dXJuIFthcnJheV07XG4gICAgfVxuICAgIHJldHVybiBhcnJheS5yZWR1Y2UoZnVuY3Rpb24obWVtbywgdmFsdWUpIHtcbiAgICAgIGlmIChBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgICByZXR1cm4gbWVtby5jb25jYXQoZmxhdHRlbih2YWx1ZSkpO1xuICAgICAgfVxuICAgICAgbWVtby5wdXNoKHZhbHVlKTtcbiAgICAgIHJldHVybiBtZW1vO1xuICAgIH0sIFtdKTtcbiAgfTtcblxuICBhZnRlciA9IGZ1bmN0aW9uKHRpbWVzLCBmdW5jKSB7XG4gICAgaWYgKHRpbWVzIDw9IDApIHtcbiAgICAgIHJldHVybiBmdW5jKCk7XG4gICAgfVxuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIGlmICgtLXRpbWVzIDwgMSkge1xuICAgICAgICByZXR1cm4gZnVuYy5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgfVxuICAgIH07XG4gIH07XG5cbiAgd3JhcCA9IGZ1bmN0aW9uKGZ1bmMsIHdyYXBwZXIpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgYXJncztcbiAgICAgIGFyZ3MgPSBbZnVuY10uY29uY2F0KEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMCkpO1xuICAgICAgcmV0dXJuIHdyYXBwZXIuYXBwbHkodGhpcywgYXJncyk7XG4gICAgfTtcbiAgfTtcblxuICBleGVjdXRlID0gZnVuY3Rpb24oY2FsbGJhY2tzLCBhcmdzLCBjb250ZXh0KSB7XG4gICAgdmFyIGNhbGxiYWNrLCBfaSwgX2xlbiwgX3JlZiwgX3Jlc3VsdHM7XG4gICAgX3JlZiA9IGZsYXR0ZW4oY2FsbGJhY2tzKTtcbiAgICBfcmVzdWx0cyA9IFtdO1xuICAgIGZvciAoX2kgPSAwLCBfbGVuID0gX3JlZi5sZW5ndGg7IF9pIDwgX2xlbjsgX2krKykge1xuICAgICAgY2FsbGJhY2sgPSBfcmVmW19pXTtcbiAgICAgIF9yZXN1bHRzLnB1c2goY2FsbGJhY2suY2FsbC5hcHBseShjYWxsYmFjaywgW2NvbnRleHRdLmNvbmNhdChfX3NsaWNlLmNhbGwoYXJncykpKSk7XG4gICAgfVxuICAgIHJldHVybiBfcmVzdWx0cztcbiAgfTtcblxuICBEZWZlcnJlZCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBjYW5kaWRhdGUsIGNsb3NlLCBjbG9zaW5nQXJndW1lbnRzLCBkb25lQ2FsbGJhY2tzLCBmYWlsQ2FsbGJhY2tzLCBwcm9ncmVzc0NhbGxiYWNrcywgc3RhdGU7XG4gICAgc3RhdGUgPSBQRU5ESU5HO1xuICAgIGRvbmVDYWxsYmFja3MgPSBbXTtcbiAgICBmYWlsQ2FsbGJhY2tzID0gW107XG4gICAgcHJvZ3Jlc3NDYWxsYmFja3MgPSBbXTtcbiAgICBjbG9zaW5nQXJndW1lbnRzID0ge1xuICAgICAgJ3Jlc29sdmVkJzoge30sXG4gICAgICAncmVqZWN0ZWQnOiB7fSxcbiAgICAgICdwZW5kaW5nJzoge31cbiAgICB9O1xuICAgIHRoaXMucHJvbWlzZSA9IGZ1bmN0aW9uKGNhbmRpZGF0ZSkge1xuICAgICAgdmFyIHBpcGUsIHN0b3JlQ2FsbGJhY2tzO1xuICAgICAgY2FuZGlkYXRlID0gY2FuZGlkYXRlIHx8IHt9O1xuICAgICAgY2FuZGlkYXRlLnN0YXRlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBzdGF0ZTtcbiAgICAgIH07XG4gICAgICBzdG9yZUNhbGxiYWNrcyA9IGZ1bmN0aW9uKHNob3VsZEV4ZWN1dGVJbW1lZGlhdGVseSwgaG9sZGVyLCBob2xkZXJTdGF0ZSkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgaWYgKHN0YXRlID09PSBQRU5ESU5HKSB7XG4gICAgICAgICAgICBob2xkZXIucHVzaC5hcHBseShob2xkZXIsIGZsYXR0ZW4oYXJndW1lbnRzKSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChzaG91bGRFeGVjdXRlSW1tZWRpYXRlbHkoKSkge1xuICAgICAgICAgICAgZXhlY3V0ZShhcmd1bWVudHMsIGNsb3NpbmdBcmd1bWVudHNbaG9sZGVyU3RhdGVdKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIGNhbmRpZGF0ZTtcbiAgICAgICAgfTtcbiAgICAgIH07XG4gICAgICBjYW5kaWRhdGUuZG9uZSA9IHN0b3JlQ2FsbGJhY2tzKChmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHN0YXRlID09PSBSRVNPTFZFRDtcbiAgICAgIH0pLCBkb25lQ2FsbGJhY2tzLCBSRVNPTFZFRCk7XG4gICAgICBjYW5kaWRhdGUuZmFpbCA9IHN0b3JlQ2FsbGJhY2tzKChmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHN0YXRlID09PSBSRUpFQ1RFRDtcbiAgICAgIH0pLCBmYWlsQ2FsbGJhY2tzLCBSRUpFQ1RFRCk7XG4gICAgICBjYW5kaWRhdGUucHJvZ3Jlc3MgPSBzdG9yZUNhbGxiYWNrcygoZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBzdGF0ZSAhPT0gUEVORElORztcbiAgICAgIH0pLCBwcm9ncmVzc0NhbGxiYWNrcywgUEVORElORyk7XG4gICAgICBjYW5kaWRhdGUuYWx3YXlzID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBfcmVmO1xuICAgICAgICByZXR1cm4gKF9yZWYgPSBjYW5kaWRhdGUuZG9uZS5hcHBseShjYW5kaWRhdGUsIGFyZ3VtZW50cykpLmZhaWwuYXBwbHkoX3JlZiwgYXJndW1lbnRzKTtcbiAgICAgIH07XG4gICAgICBwaXBlID0gZnVuY3Rpb24oZG9uZUZpbHRlciwgZmFpbEZpbHRlciwgcHJvZ3Jlc3NGaWx0ZXIpIHtcbiAgICAgICAgdmFyIGZpbHRlciwgbWFzdGVyO1xuICAgICAgICBtYXN0ZXIgPSBuZXcgRGVmZXJyZWQoKTtcbiAgICAgICAgZmlsdGVyID0gZnVuY3Rpb24oc291cmNlLCBmdW5uZWwsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgaWYgKCFjYWxsYmFjaykge1xuICAgICAgICAgICAgcmV0dXJuIGNhbmRpZGF0ZVtzb3VyY2VdKG1hc3RlcltmdW5uZWxdKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIGNhbmRpZGF0ZVtzb3VyY2VdKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIGFyZ3MsIHZhbHVlO1xuICAgICAgICAgICAgYXJncyA9IDEgPD0gYXJndW1lbnRzLmxlbmd0aCA/IF9fc2xpY2UuY2FsbChhcmd1bWVudHMsIDApIDogW107XG4gICAgICAgICAgICB2YWx1ZSA9IGNhbGxiYWNrLmFwcGx5KG51bGwsIGFyZ3MpO1xuICAgICAgICAgICAgaWYgKGlzUHJvbWlzZSh2YWx1ZSkpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIHZhbHVlLmRvbmUobWFzdGVyLnJlc29sdmUpLmZhaWwobWFzdGVyLnJlamVjdCkucHJvZ3Jlc3MobWFzdGVyLm5vdGlmeSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICByZXR1cm4gbWFzdGVyW2Z1bm5lbF0odmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuICAgICAgICBmaWx0ZXIoJ2RvbmUnLCAncmVzb2x2ZScsIGRvbmVGaWx0ZXIpO1xuICAgICAgICBmaWx0ZXIoJ2ZhaWwnLCAncmVqZWN0JywgZmFpbEZpbHRlcik7XG4gICAgICAgIGZpbHRlcigncHJvZ3Jlc3MnLCAnbm90aWZ5JywgcHJvZ3Jlc3NGaWx0ZXIpO1xuICAgICAgICByZXR1cm4gbWFzdGVyO1xuICAgICAgfTtcbiAgICAgIGNhbmRpZGF0ZS5waXBlID0gcGlwZTtcbiAgICAgIGNhbmRpZGF0ZS50aGVuID0gcGlwZTtcbiAgICAgIGlmIChjYW5kaWRhdGUucHJvbWlzZSA9PSBudWxsKSB7XG4gICAgICAgIGNhbmRpZGF0ZS5wcm9taXNlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgcmV0dXJuIGNhbmRpZGF0ZTtcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBjYW5kaWRhdGU7XG4gICAgfTtcbiAgICB0aGlzLnByb21pc2UodGhpcyk7XG4gICAgY2FuZGlkYXRlID0gdGhpcztcbiAgICBjbG9zZSA9IGZ1bmN0aW9uKGZpbmFsU3RhdGUsIGNhbGxiYWNrcywgY29udGV4dCkge1xuICAgICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAoc3RhdGUgPT09IFBFTkRJTkcpIHtcbiAgICAgICAgICBzdGF0ZSA9IGZpbmFsU3RhdGU7XG4gICAgICAgICAgY2xvc2luZ0FyZ3VtZW50c1tmaW5hbFN0YXRlXSA9IGFyZ3VtZW50cztcbiAgICAgICAgICBleGVjdXRlKGNhbGxiYWNrcywgY2xvc2luZ0FyZ3VtZW50c1tmaW5hbFN0YXRlXSwgY29udGV4dCk7XG4gICAgICAgICAgcmV0dXJuIGNhbmRpZGF0ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgIH07XG4gICAgfTtcbiAgICB0aGlzLnJlc29sdmUgPSBjbG9zZShSRVNPTFZFRCwgZG9uZUNhbGxiYWNrcyk7XG4gICAgdGhpcy5yZWplY3QgPSBjbG9zZShSRUpFQ1RFRCwgZmFpbENhbGxiYWNrcyk7XG4gICAgdGhpcy5ub3RpZnkgPSBjbG9zZShQRU5ESU5HLCBwcm9ncmVzc0NhbGxiYWNrcyk7XG4gICAgdGhpcy5yZXNvbHZlV2l0aCA9IGZ1bmN0aW9uKGNvbnRleHQsIGFyZ3MpIHtcbiAgICAgIHJldHVybiBjbG9zZShSRVNPTFZFRCwgZG9uZUNhbGxiYWNrcywgY29udGV4dCkuYXBwbHkobnVsbCwgYXJncyk7XG4gICAgfTtcbiAgICB0aGlzLnJlamVjdFdpdGggPSBmdW5jdGlvbihjb250ZXh0LCBhcmdzKSB7XG4gICAgICByZXR1cm4gY2xvc2UoUkVKRUNURUQsIGZhaWxDYWxsYmFja3MsIGNvbnRleHQpLmFwcGx5KG51bGwsIGFyZ3MpO1xuICAgIH07XG4gICAgdGhpcy5ub3RpZnlXaXRoID0gZnVuY3Rpb24oY29udGV4dCwgYXJncykge1xuICAgICAgcmV0dXJuIGNsb3NlKFBFTkRJTkcsIHByb2dyZXNzQ2FsbGJhY2tzLCBjb250ZXh0KS5hcHBseShudWxsLCBhcmdzKTtcbiAgICB9O1xuICAgIHJldHVybiB0aGlzO1xuICB9O1xuXG4gIF93aGVuID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGRlZiwgZGVmcywgZmluaXNoLCByZXNvbHV0aW9uQXJncywgdHJpZ2dlciwgX2ksIF9sZW47XG4gICAgZGVmcyA9IGZsYXR0ZW4oYXJndW1lbnRzKTtcbiAgICBpZiAoZGVmcy5sZW5ndGggPT09IDEpIHtcbiAgICAgIGlmIChpc1Byb21pc2UoZGVmc1swXSkpIHtcbiAgICAgICAgcmV0dXJuIGRlZnNbMF07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gKG5ldyBEZWZlcnJlZCgpKS5yZXNvbHZlKGRlZnNbMF0pLnByb21pc2UoKTtcbiAgICAgIH1cbiAgICB9XG4gICAgdHJpZ2dlciA9IG5ldyBEZWZlcnJlZCgpO1xuICAgIGlmICghZGVmcy5sZW5ndGgpIHtcbiAgICAgIHJldHVybiB0cmlnZ2VyLnJlc29sdmUoKS5wcm9taXNlKCk7XG4gICAgfVxuICAgIHJlc29sdXRpb25BcmdzID0gW107XG4gICAgZmluaXNoID0gYWZ0ZXIoZGVmcy5sZW5ndGgsIGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRyaWdnZXIucmVzb2x2ZS5hcHBseSh0cmlnZ2VyLCByZXNvbHV0aW9uQXJncyk7XG4gICAgfSk7XG4gICAgZGVmcy5mb3JFYWNoKGZ1bmN0aW9uKGRlZiwgaW5kZXgpIHtcbiAgICAgIGlmIChpc1Byb21pc2UoZGVmKSkge1xuICAgICAgICByZXR1cm4gZGVmLmRvbmUoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgdmFyIGFyZ3M7XG4gICAgICAgICAgYXJncyA9IDEgPD0gYXJndW1lbnRzLmxlbmd0aCA/IF9fc2xpY2UuY2FsbChhcmd1bWVudHMsIDApIDogW107XG4gICAgICAgICAgcmVzb2x1dGlvbkFyZ3NbaW5kZXhdID0gYXJncy5sZW5ndGggPiAxID8gYXJncyA6IGFyZ3NbMF07XG4gICAgICAgICAgcmV0dXJuIGZpbmlzaCgpO1xuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlc29sdXRpb25BcmdzW2luZGV4XSA9IGRlZjtcbiAgICAgICAgcmV0dXJuIGZpbmlzaCgpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIGZvciAoX2kgPSAwLCBfbGVuID0gZGVmcy5sZW5ndGg7IF9pIDwgX2xlbjsgX2krKykge1xuICAgICAgZGVmID0gZGVmc1tfaV07XG4gICAgICBpc1Byb21pc2UoZGVmKSAmJiBkZWYuZmFpbCh0cmlnZ2VyLnJlamVjdCk7XG4gICAgfVxuICAgIHJldHVybiB0cmlnZ2VyLnByb21pc2UoKTtcbiAgfTtcblxuICBpbnN0YWxsSW50byA9IGZ1bmN0aW9uKGZ3KSB7XG4gICAgZncuRGVmZXJyZWQgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBuZXcgRGVmZXJyZWQoKTtcbiAgICB9O1xuICAgIGZ3LmFqYXggPSB3cmFwKGZ3LmFqYXgsIGZ1bmN0aW9uKGFqYXgsIG9wdGlvbnMpIHtcbiAgICAgIHZhciBjcmVhdGVXcmFwcGVyLCBkZWYsIHByb21pc2UsIHhocjtcbiAgICAgIGlmIChvcHRpb25zID09IG51bGwpIHtcbiAgICAgICAgb3B0aW9ucyA9IHt9O1xuICAgICAgfVxuICAgICAgZGVmID0gbmV3IERlZmVycmVkKCk7XG4gICAgICBjcmVhdGVXcmFwcGVyID0gZnVuY3Rpb24od3JhcHBlZCwgZmluaXNoZXIpIHtcbiAgICAgICAgcmV0dXJuIHdyYXAod3JhcHBlZCwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgdmFyIGFyZ3MsIGZ1bmM7XG4gICAgICAgICAgZnVuYyA9IGFyZ3VtZW50c1swXSwgYXJncyA9IDIgPD0gYXJndW1lbnRzLmxlbmd0aCA/IF9fc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpIDogW107XG4gICAgICAgICAgaWYgKGZ1bmMpIHtcbiAgICAgICAgICAgIGZ1bmMuYXBwbHkobnVsbCwgYXJncyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBmaW5pc2hlci5hcHBseShudWxsLCBhcmdzKTtcbiAgICAgICAgfSk7XG4gICAgICB9O1xuICAgICAgb3B0aW9ucy5zdWNjZXNzID0gY3JlYXRlV3JhcHBlcihvcHRpb25zLnN1Y2Nlc3MsIGRlZi5yZXNvbHZlKTtcbiAgICAgIG9wdGlvbnMuZXJyb3IgPSBjcmVhdGVXcmFwcGVyKG9wdGlvbnMuZXJyb3IsIGRlZi5yZWplY3QpO1xuICAgICAgeGhyID0gYWpheChvcHRpb25zKTtcbiAgICAgIHByb21pc2UgPSBkZWYucHJvbWlzZSgpO1xuICAgICAgcHJvbWlzZS5hYm9ydCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4geGhyLmFib3J0KCk7XG4gICAgICB9O1xuICAgICAgcmV0dXJuIHByb21pc2U7XG4gICAgfSk7XG4gICAgcmV0dXJuIGZ3LndoZW4gPSBfd2hlbjtcbiAgfTtcblxuICBpZiAodHlwZW9mIGV4cG9ydHMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgZXhwb3J0cy5EZWZlcnJlZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIG5ldyBEZWZlcnJlZCgpO1xuICAgIH07XG4gICAgZXhwb3J0cy53aGVuID0gX3doZW47XG4gICAgZXhwb3J0cy5pbnN0YWxsSW50byA9IGluc3RhbGxJbnRvO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgIGRlZmluZShmdW5jdGlvbigpIHtcbiAgICAgIGlmICh0eXBlb2YgWmVwdG8gIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIHJldHVybiBpbnN0YWxsSW50byhaZXB0byk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBEZWZlcnJlZC53aGVuID0gX3doZW47XG4gICAgICAgIERlZmVycmVkLmluc3RhbGxJbnRvID0gaW5zdGFsbEludG87XG4gICAgICAgIHJldHVybiBEZWZlcnJlZDtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgWmVwdG8gIT09ICd1bmRlZmluZWQnKSB7XG4gICAgaW5zdGFsbEludG8oWmVwdG8pO1xuICB9IGVsc2Uge1xuICAgIHRoaXMuRGVmZXJyZWQgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBuZXcgRGVmZXJyZWQoKTtcbiAgICB9O1xuICAgIHRoaXMuRGVmZXJyZWQud2hlbiA9IF93aGVuO1xuICAgIHRoaXMuRGVmZXJyZWQuaW5zdGFsbEludG8gPSBpbnN0YWxsSW50bztcbiAgfVxuXG59KS5jYWxsKHRoaXMpO1xuIiwiKGZ1bmN0aW9uICgpIHtcblxuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIG1vZHVsZS5leHBvcnRzID0ge1xuICAgICAgICBUaWxlTGF5ZXI6IHJlcXVpcmUoJy4vbGF5ZXIvZXhwb3J0cycpLFxuICAgICAgICBSZW5kZXJlcjogcmVxdWlyZSgnLi9yZW5kZXJlci9leHBvcnRzJyksXG4gICAgICAgIFRpbGVSZXF1ZXN0b3I6IHJlcXVpcmUoJy4vcmVxdWVzdC9UaWxlUmVxdWVzdG9yJyksXG4gICAgICAgIE1ldGFSZXF1ZXN0b3I6IHJlcXVpcmUoJy4vcmVxdWVzdC9NZXRhUmVxdWVzdG9yJylcbiAgICB9O1xuXG59KCkpO1xuIiwiKGZ1bmN0aW9uKCkge1xuXG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgdmFyIEltYWdlID0gcmVxdWlyZSgnLi9JbWFnZScpO1xuXG4gICAgdmFyIERlYnVnID0gSW1hZ2UuZXh0ZW5kKHtcblxuICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgICB1bmxvYWRJbnZpc2libGVUaWxlczogdHJ1ZSxcbiAgICAgICAgICAgIHpJbmRleDogNTAwMFxuICAgICAgICB9LFxuXG4gICAgICAgIGluaXRpYWxpemU6IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICAgICAgICAgIC8vIHNldCByZW5kZXJlclxuICAgICAgICAgICAgaWYgKCFvcHRpb25zLnJlbmRlcmVyQ2xhc3MpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oJ05vIGByZW5kZXJlckNsYXNzYCBvcHRpb24gZm91bmQsIHRoaXMgbGF5ZXIgd2lsbCBub3QgcmVuZGVyIGFueSBkYXRhLicpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyByZWN1cnNpdmVseSBleHRlbmRcbiAgICAgICAgICAgICAgICAkLmV4dGVuZCh0cnVlLCB0aGlzLCBvcHRpb25zLnJlbmRlcmVyQ2xhc3MpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gc2V0IG9wdGlvbnNcbiAgICAgICAgICAgIEwuc2V0T3B0aW9ucyh0aGlzLCBvcHRpb25zKTtcbiAgICAgICAgfSxcblxuICAgICAgICByZWRyYXc6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgaWYgKHRoaXMuX21hcCkge1xuICAgICAgICAgICAgICAgIHRoaXMuX3Jlc2V0KHtcbiAgICAgICAgICAgICAgICAgICAgaGFyZDogdHJ1ZVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHRoaXMuX3VwZGF0ZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH0sXG5cbiAgICAgICAgX3JlZHJhd1RpbGU6IGZ1bmN0aW9uKHRpbGUpIHtcbiAgICAgICAgICAgIHZhciBjb29yZCA9IHtcbiAgICAgICAgICAgICAgICB4OiB0aWxlLl90aWxlUG9pbnQueCxcbiAgICAgICAgICAgICAgICB5OiB0aWxlLl90aWxlUG9pbnQueSxcbiAgICAgICAgICAgICAgICB6OiB0aGlzLl9tYXAuX3pvb21cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICB0aGlzLnJlbmRlclRpbGUodGlsZSwgY29vcmQpO1xuICAgICAgICAgICAgdGhpcy50aWxlRHJhd24odGlsZSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgX2NyZWF0ZVRpbGU6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIHRpbGUgPSBMLkRvbVV0aWwuY3JlYXRlKCdkaXYnLCAnbGVhZmxldC10aWxlIGxlYWZsZXQtZGVidWctdGlsZScpO1xuICAgICAgICAgICAgdGlsZS53aWR0aCA9IHRoaXMub3B0aW9ucy50aWxlU2l6ZTtcbiAgICAgICAgICAgIHRpbGUuaGVpZ2h0ID0gdGhpcy5vcHRpb25zLnRpbGVTaXplO1xuICAgICAgICAgICAgdGlsZS5vbnNlbGVjdHN0YXJ0ID0gTC5VdGlsLmZhbHNlRm47XG4gICAgICAgICAgICB0aWxlLm9ubW91c2Vtb3ZlID0gTC5VdGlsLmZhbHNlRm47XG4gICAgICAgICAgICByZXR1cm4gdGlsZTtcbiAgICAgICAgfSxcblxuICAgICAgICBfbG9hZFRpbGU6IGZ1bmN0aW9uKHRpbGUsIHRpbGVQb2ludCkge1xuICAgICAgICAgICAgdGlsZS5fbGF5ZXIgPSB0aGlzO1xuICAgICAgICAgICAgdGlsZS5fdGlsZVBvaW50ID0gdGlsZVBvaW50O1xuICAgICAgICAgICAgdGhpcy5fYWRqdXN0VGlsZVBvaW50KHRpbGVQb2ludCk7XG4gICAgICAgICAgICB0aGlzLl9yZWRyYXdUaWxlKHRpbGUpO1xuICAgICAgICB9LFxuXG4gICAgICAgIHJlbmRlclRpbGU6IGZ1bmN0aW9uKCAvKmVsZW0sIGNvb3JkKi8gKSB7XG4gICAgICAgICAgICAvLyBvdmVycmlkZVxuICAgICAgICB9LFxuXG4gICAgICAgIHRpbGVEcmF3bjogZnVuY3Rpb24odGlsZSkge1xuICAgICAgICAgICAgdGhpcy5fdGlsZU9uTG9hZC5jYWxsKHRpbGUpO1xuICAgICAgICB9XG5cbiAgICB9KTtcblxuICAgIG1vZHVsZS5leHBvcnRzID0gRGVidWc7XG5cbn0oKSk7XG4iLCIoZnVuY3Rpb24oKSB7XG5cbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICB2YXIgSW1hZ2UgPSBMLlRpbGVMYXllci5leHRlbmQoe1xuXG4gICAgICAgIGdldE9wYWNpdHk6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMub3B0aW9ucy5vcGFjaXR5O1xuICAgICAgICB9LFxuXG4gICAgICAgIHNob3c6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdGhpcy5faGlkZGVuID0gZmFsc2U7XG4gICAgICAgICAgICB0aGlzLl9wcmV2TWFwLmFkZExheWVyKHRoaXMpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGhpZGU6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdGhpcy5faGlkZGVuID0gdHJ1ZTtcbiAgICAgICAgICAgIHRoaXMuX3ByZXZNYXAgPSB0aGlzLl9tYXA7XG4gICAgICAgICAgICB0aGlzLl9tYXAucmVtb3ZlTGF5ZXIodGhpcyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgaXNIaWRkZW46IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2hpZGRlbjtcbiAgICAgICAgfSxcblxuICAgICAgICBzZXRCcmlnaHRuZXNzOiBmdW5jdGlvbihicmlnaHRuZXNzKSB7XG4gICAgICAgICAgICB0aGlzLl9icmlnaHRuZXNzID0gYnJpZ2h0bmVzcztcbiAgICAgICAgICAgICQodGhpcy5fY29udGFpbmVyKS5jc3MoJy13ZWJraXQtZmlsdGVyJywgJ2JyaWdodG5lc3MoJyArICh0aGlzLl9icmlnaHRuZXNzICogMTAwKSArICclKScpO1xuICAgICAgICAgICAgJCh0aGlzLl9jb250YWluZXIpLmNzcygnZmlsdGVyJywgJ2JyaWdodG5lc3MoJyArICh0aGlzLl9icmlnaHRuZXNzICogMTAwKSArICclKScpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGdldEJyaWdodG5lc3M6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuICh0aGlzLl9icmlnaHRuZXNzICE9PSB1bmRlZmluZWQpID8gdGhpcy5fYnJpZ2h0bmVzcyA6IDE7XG4gICAgICAgIH1cblxuICAgIH0pO1xuXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBJbWFnZTtcblxufSgpKTtcbiIsIihmdW5jdGlvbigpIHtcblxuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIHZhciBNSU4gPSBOdW1iZXIuTUFYX1ZBTFVFO1xuICAgIHZhciBNQVggPSAwO1xuXG4gICAgdmFyIExpdmUgPSBMLkNsYXNzLmV4dGVuZCh7XG5cbiAgICAgICAgaW5pdGlhbGl6ZTogZnVuY3Rpb24obWV0YSwgb3B0aW9ucykge1xuICAgICAgICAgICAgLy8gc2V0IHJlbmRlcmVyXG4gICAgICAgICAgICBpZiAoIW9wdGlvbnMucmVuZGVyZXJDbGFzcykge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybignTm8gYHJlbmRlcmVyQ2xhc3NgIG9wdGlvbiBmb3VuZCwgdGhpcyBsYXllciB3aWxsIG5vdCByZW5kZXIgYW55IGRhdGEuJyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIHJlY3Vyc2l2ZWx5IGV4dGVuZCBhbmQgaW5pdGlhbGl6ZVxuICAgICAgICAgICAgICAgIGlmIChvcHRpb25zLnJlbmRlcmVyQ2xhc3MucHJvdG90eXBlKSB7XG4gICAgICAgICAgICAgICAgICAgICQuZXh0ZW5kKHRydWUsIHRoaXMsIG9wdGlvbnMucmVuZGVyZXJDbGFzcy5wcm90b3R5cGUpO1xuICAgICAgICAgICAgICAgICAgICBvcHRpb25zLnJlbmRlcmVyQ2xhc3MucHJvdG90eXBlLmluaXRpYWxpemUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAkLmV4dGVuZCh0cnVlLCB0aGlzLCBvcHRpb25zLnJlbmRlcmVyQ2xhc3MpO1xuICAgICAgICAgICAgICAgICAgICBvcHRpb25zLnJlbmRlcmVyQ2xhc3MuaW5pdGlhbGl6ZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIHNldCBvcHRpb25zXG4gICAgICAgICAgICBMLnNldE9wdGlvbnModGhpcywgb3B0aW9ucyk7XG4gICAgICAgICAgICAvLyBzZXQgbWV0YVxuICAgICAgICAgICAgdGhpcy5fbWV0YSA9IG1ldGE7XG4gICAgICAgICAgICAvLyBzZXQgcGFyYW1zXG4gICAgICAgICAgICB0aGlzLl9wYXJhbXMgPSB7XG4gICAgICAgICAgICAgICAgYmlubmluZzoge31cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICB0aGlzLmNsZWFyRXh0cmVtYSgpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGNsZWFyRXh0cmVtYTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB0aGlzLl9leHRyZW1hID0ge1xuICAgICAgICAgICAgICAgIG1pbjogTUlOLFxuICAgICAgICAgICAgICAgIG1heDogTUFYXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgdGhpcy5fY2FjaGUgPSB7fTtcbiAgICAgICAgfSxcblxuICAgICAgICBnZXRFeHRyZW1hOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9leHRyZW1hO1xuICAgICAgICB9LFxuXG4gICAgICAgIHVwZGF0ZUV4dHJlbWE6IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgICAgIHZhciBleHRyZW1hID0gdGhpcy5leHRyYWN0RXh0cmVtYShkYXRhKTtcbiAgICAgICAgICAgIHZhciBjaGFuZ2VkID0gZmFsc2U7XG4gICAgICAgICAgICBpZiAoZXh0cmVtYS5taW4gPCB0aGlzLl9leHRyZW1hLm1pbikge1xuICAgICAgICAgICAgICAgIGNoYW5nZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHRoaXMuX2V4dHJlbWEubWluID0gZXh0cmVtYS5taW47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoZXh0cmVtYS5tYXggPiB0aGlzLl9leHRyZW1hLm1heCkge1xuICAgICAgICAgICAgICAgIGNoYW5nZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHRoaXMuX2V4dHJlbWEubWF4ID0gZXh0cmVtYS5tYXg7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gY2hhbmdlZDtcbiAgICAgICAgfSxcblxuICAgICAgICBleHRyYWN0RXh0cmVtYTogZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBtaW46IF8ubWluKGRhdGEpLFxuICAgICAgICAgICAgICAgIG1heDogXy5tYXgoZGF0YSlcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0sXG5cbiAgICAgICAgc2V0TWV0YTogZnVuY3Rpb24obWV0YSkge1xuICAgICAgICAgICAgdGhpcy5fbWV0YSA9IG1ldGE7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfSxcblxuICAgICAgICBnZXRNZXRhOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9tZXRhO1xuICAgICAgICB9LFxuXG4gICAgICAgIHNldFBhcmFtczogZnVuY3Rpb24ocGFyYW1zKSB7XG4gICAgICAgICAgICB0aGlzLl9wYXJhbXMgPSBwYXJhbXM7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZ2V0UGFyYW1zOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9wYXJhbXM7XG4gICAgICAgIH1cblxuICAgIH0pO1xuXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBMaXZlO1xuXG59KCkpO1xuIiwiKGZ1bmN0aW9uKCkge1xuXG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgdmFyIEltYWdlID0gcmVxdWlyZSgnLi9JbWFnZScpO1xuXG4gICAgdmFyIFBlbmRpbmcgPSBJbWFnZS5leHRlbmQoe1xuXG4gICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICAgIHVubG9hZEludmlzaWJsZVRpbGVzOiB0cnVlLFxuICAgICAgICAgICAgekluZGV4OiA1MDAwXG4gICAgICAgIH0sXG5cbiAgICAgICAgaW5pdGlhbGl6ZTogZnVuY3Rpb24ob3B0aW9ucykge1xuICAgICAgICAgICAgdGhpcy5fcGVuZGluZ1RpbGVzID0ge307XG4gICAgICAgICAgICAvLyBzZXQgcmVuZGVyZXJcbiAgICAgICAgICAgIGlmICghb3B0aW9ucy5yZW5kZXJlckNsYXNzKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKCdObyBgcmVuZGVyZXJDbGFzc2Agb3B0aW9uIGZvdW5kLCB0aGlzIGxheWVyIHdpbGwgbm90IHJlbmRlciBhbnkgZGF0YS4nKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gcmVjdXJzaXZlbHkgZXh0ZW5kXG4gICAgICAgICAgICAgICAgJC5leHRlbmQodHJ1ZSwgdGhpcywgb3B0aW9ucy5yZW5kZXJlckNsYXNzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIHNldCBvcHRpb25zXG4gICAgICAgICAgICBMLnNldE9wdGlvbnModGhpcywgb3B0aW9ucyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgaW5jcmVtZW50OiBmdW5jdGlvbihjb29yZCkge1xuICAgICAgICAgICAgdmFyIGhhc2ggPSB0aGlzLl9nZXRUaWxlSGFzaChjb29yZCk7XG4gICAgICAgICAgICBpZiAodGhpcy5fcGVuZGluZ1RpbGVzW2hhc2hdID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9wZW5kaW5nVGlsZXNbaGFzaF0gPSAxO1xuICAgICAgICAgICAgICAgIHZhciB0aWxlcyA9IHRoaXMuX2dldFRpbGVzV2l0aEhhc2goaGFzaCk7XG4gICAgICAgICAgICAgICAgdGlsZXMuZm9yRWFjaChmdW5jdGlvbih0aWxlKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX3JlZHJhd1RpbGUodGlsZSk7XG4gICAgICAgICAgICAgICAgfSwgdGhpcyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuX3BlbmRpbmdUaWxlc1toYXNoXSsrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIGRlY3JlbWVudDogZnVuY3Rpb24oY29vcmQpIHtcbiAgICAgICAgICAgIHZhciBoYXNoID0gdGhpcy5fZ2V0VGlsZUhhc2goY29vcmQpO1xuICAgICAgICAgICAgdGhpcy5fcGVuZGluZ1RpbGVzW2hhc2hdLS07XG4gICAgICAgICAgICBpZiAodGhpcy5fcGVuZGluZ1RpbGVzW2hhc2hdID09PSAwKSB7XG4gICAgICAgICAgICAgICAgZGVsZXRlIHRoaXMuX3BlbmRpbmdUaWxlc1toYXNoXTtcbiAgICAgICAgICAgICAgICB2YXIgdGlsZXMgPSB0aGlzLl9nZXRUaWxlc1dpdGhIYXNoKGhhc2gpO1xuICAgICAgICAgICAgICAgIHRpbGVzLmZvckVhY2goZnVuY3Rpb24odGlsZSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9yZWRyYXdUaWxlKHRpbGUpO1xuICAgICAgICAgICAgICAgIH0sIHRoaXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIHJlZHJhdzogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5fbWFwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fcmVzZXQoe1xuICAgICAgICAgICAgICAgICAgICBoYXJkOiB0cnVlXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgdGhpcy5fdXBkYXRlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfSxcblxuICAgICAgICBfZ2V0VGlsZUNsYXNzOiBmdW5jdGlvbihoYXNoKSB7XG4gICAgICAgICAgICByZXR1cm4gJ3BlbmRpbmctJyArIGhhc2g7XG4gICAgICAgIH0sXG5cbiAgICAgICAgX2dldFRpbGVIYXNoOiBmdW5jdGlvbihjb29yZCkge1xuICAgICAgICAgICAgcmV0dXJuIGNvb3JkLnogKyAnLScgKyBjb29yZC54ICsgJy0nICsgY29vcmQueTtcbiAgICAgICAgfSxcblxuICAgICAgICBfZ2V0VGlsZXNXaXRoSGFzaDogZnVuY3Rpb24oaGFzaCkge1xuICAgICAgICAgICAgdmFyIGNsYXNzTmFtZSA9IHRoaXMuX2dldFRpbGVDbGFzcyhoYXNoKTtcbiAgICAgICAgICAgIHZhciB0aWxlcyA9IFtdO1xuICAgICAgICAgICAgJCh0aGlzLl9jb250YWluZXIpLmZpbmQoJy4nICsgY2xhc3NOYW1lKS5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHRpbGVzLnB1c2godGhpcyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiB0aWxlcztcbiAgICAgICAgfSxcblxuICAgICAgICBfcmVkcmF3VGlsZTogZnVuY3Rpb24odGlsZSkge1xuICAgICAgICAgICAgdmFyIGNvb3JkID0ge1xuICAgICAgICAgICAgICAgIHg6IHRpbGUuX3RpbGVQb2ludC54LFxuICAgICAgICAgICAgICAgIHk6IHRpbGUuX3RpbGVQb2ludC55LFxuICAgICAgICAgICAgICAgIHo6IHRoaXMuX21hcC5fem9vbVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHZhciBoYXNoID0gdGhpcy5fZ2V0VGlsZUhhc2goY29vcmQpO1xuICAgICAgICAgICAgJCh0aWxlKS5hZGRDbGFzcyh0aGlzLl9nZXRUaWxlQ2xhc3MoaGFzaCkpO1xuICAgICAgICAgICAgaWYgKHRoaXMuX3BlbmRpbmdUaWxlc1toYXNoXSA+IDApIHtcbiAgICAgICAgICAgICAgICB0aGlzLnJlbmRlclRpbGUodGlsZSwgY29vcmQpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aWxlLmlubmVySFRNTCA9ICcnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy50aWxlRHJhd24odGlsZSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgX2NyZWF0ZVRpbGU6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIHRpbGUgPSBMLkRvbVV0aWwuY3JlYXRlKCdkaXYnLCAnbGVhZmxldC10aWxlIGxlYWZsZXQtcGVuZGluZy10aWxlJyk7XG4gICAgICAgICAgICB0aWxlLndpZHRoID0gdGhpcy5vcHRpb25zLnRpbGVTaXplO1xuICAgICAgICAgICAgdGlsZS5oZWlnaHQgPSB0aGlzLm9wdGlvbnMudGlsZVNpemU7XG4gICAgICAgICAgICB0aWxlLm9uc2VsZWN0c3RhcnQgPSBMLlV0aWwuZmFsc2VGbjtcbiAgICAgICAgICAgIHRpbGUub25tb3VzZW1vdmUgPSBMLlV0aWwuZmFsc2VGbjtcbiAgICAgICAgICAgIHJldHVybiB0aWxlO1xuICAgICAgICB9LFxuXG4gICAgICAgIF9sb2FkVGlsZTogZnVuY3Rpb24odGlsZSwgdGlsZVBvaW50KSB7XG4gICAgICAgICAgICB0aWxlLl9sYXllciA9IHRoaXM7XG4gICAgICAgICAgICB0aWxlLl90aWxlUG9pbnQgPSB0aWxlUG9pbnQ7XG4gICAgICAgICAgICB0aGlzLl9hZGp1c3RUaWxlUG9pbnQodGlsZVBvaW50KTtcbiAgICAgICAgICAgIHRoaXMuX3JlZHJhd1RpbGUodGlsZSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgcmVuZGVyVGlsZTogZnVuY3Rpb24oIC8qZWxlbSovICkge1xuICAgICAgICAgICAgLy8gb3ZlcnJpZGVcbiAgICAgICAgfSxcblxuICAgICAgICB0aWxlRHJhd246IGZ1bmN0aW9uKHRpbGUpIHtcbiAgICAgICAgICAgIHRoaXMuX3RpbGVPbkxvYWQuY2FsbCh0aWxlKTtcbiAgICAgICAgfVxuXG4gICAgfSk7XG5cbiAgICBtb2R1bGUuZXhwb3J0cyA9IFBlbmRpbmc7XG5cbn0oKSk7XG4iLCIoZnVuY3Rpb24oKSB7XG5cbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICAvLyBkZWJ1ZyB0aWxlIGxheWVyXG4gICAgdmFyIERlYnVnID0gcmVxdWlyZSgnLi9jb3JlL0RlYnVnJyk7XG5cbiAgICAvLyBwZW5kaW5nIHRpbGUgbGF5ZXJcbiAgICB2YXIgUGVuZGluZyA9IHJlcXVpcmUoJy4vY29yZS9QZW5kaW5nJyk7XG5cbiAgICAvLyBzdGFuZGFyZCBYWVogLyBUTVggaW1hZ2UgbGF5ZXJcbiAgICB2YXIgSW1hZ2UgPSByZXF1aXJlKCcuL2NvcmUvSW1hZ2UnKTtcblxuICAgIC8vIGxpdmUgdGlsZSBsYXllcnNcbiAgICB2YXIgSGVhdG1hcCA9IHJlcXVpcmUoJy4vdHlwZXMvSGVhdG1hcCcpO1xuICAgIHZhciBUb3BDb3VudCA9IHJlcXVpcmUoJy4vdHlwZXMvVG9wQ291bnQnKTtcbiAgICB2YXIgVG9wRnJlcXVlbmN5ID0gcmVxdWlyZSgnLi90eXBlcy9Ub3BGcmVxdWVuY3knKTtcbiAgICB2YXIgVG9waWNDb3VudCA9IHJlcXVpcmUoJy4vdHlwZXMvVG9waWNDb3VudCcpO1xuICAgIHZhciBUb3BpY0ZyZXF1ZW5jeSA9IHJlcXVpcmUoJy4vdHlwZXMvVG9waWNGcmVxdWVuY3knKTtcblxuICAgIG1vZHVsZS5leHBvcnRzID0ge1xuICAgICAgICBEZWJ1ZzogRGVidWcsXG4gICAgICAgIFBlbmRpbmc6IFBlbmRpbmcsXG4gICAgICAgIEltYWdlOiBJbWFnZSxcbiAgICAgICAgSGVhdG1hcDogSGVhdG1hcCxcbiAgICAgICAgVG9wQ291bnQ6IFRvcENvdW50LFxuICAgICAgICBUb3BGcmVxdWVuY3k6IFRvcEZyZXF1ZW5jeSxcbiAgICAgICAgVG9waWNDb3VudDogVG9waWNDb3VudCxcbiAgICAgICAgVG9waWNGcmVxdWVuY3k6IFRvcGljRnJlcXVlbmN5XG4gICAgfTtcblxufSgpKTtcbiIsIihmdW5jdGlvbigpIHtcblxuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIGZ1bmN0aW9uIHJnYjJsYWIocmdiKSB7XG4gICAgICAgIHZhciByID0gcmdiWzBdID4gMC4wNDA0NSA/IE1hdGgucG93KChyZ2JbMF0gKyAwLjA1NSkgLyAxLjA1NSwgMi40KSA6IHJnYlswXSAvIDEyLjkyO1xuICAgICAgICB2YXIgZyA9IHJnYlsxXSA+IDAuMDQwNDUgPyBNYXRoLnBvdygocmdiWzFdICsgMC4wNTUpIC8gMS4wNTUsIDIuNCkgOiByZ2JbMV0gLyAxMi45MjtcbiAgICAgICAgdmFyIGIgPSByZ2JbMl0gPiAwLjA0MDQ1ID8gTWF0aC5wb3coKHJnYlsyXSArIDAuMDU1KSAvIDEuMDU1LCAyLjQpIDogcmdiWzJdIC8gMTIuOTI7XG4gICAgICAgIC8vT2JzZXJ2ZXIuID0gMsKwLCBJbGx1bWluYW50ID0gRDY1XG4gICAgICAgIHZhciB4ID0gciAqIDAuNDEyNDU2NCArIGcgKiAwLjM1NzU3NjEgKyBiICogMC4xODA0Mzc1O1xuICAgICAgICB2YXIgeSA9IHIgKiAwLjIxMjY3MjkgKyBnICogMC43MTUxNTIyICsgYiAqIDAuMDcyMTc1MDtcbiAgICAgICAgdmFyIHogPSByICogMC4wMTkzMzM5ICsgZyAqIDAuMTE5MTkyMCArIGIgKiAwLjk1MDMwNDE7XG4gICAgICAgIHggPSB4IC8gMC45NTA0NzsgLy8gT2JzZXJ2ZXI9IDLCsCwgSWxsdW1pbmFudD0gRDY1XG4gICAgICAgIHkgPSB5IC8gMS4wMDAwMDtcbiAgICAgICAgeiA9IHogLyAxLjA4ODgzO1xuICAgICAgICB4ID0geCA+IDAuMDA4ODU2ID8gTWF0aC5wb3coeCwgMSAvIDMpIDogKDcuNzg3MDM3ICogeCkgKyAoMTYgLyAxMTYpO1xuICAgICAgICB5ID0geSA+IDAuMDA4ODU2ID8gTWF0aC5wb3coeSwgMSAvIDMpIDogKDcuNzg3MDM3ICogeSkgKyAoMTYgLyAxMTYpO1xuICAgICAgICB6ID0geiA+IDAuMDA4ODU2ID8gTWF0aC5wb3coeiwgMSAvIDMpIDogKDcuNzg3MDM3ICogeikgKyAoMTYgLyAxMTYpO1xuICAgICAgICByZXR1cm4gWygxMTYgKiB5KSAtIDE2LFxuICAgICAgICAgICAgNTAwICogKHggLSB5KSxcbiAgICAgICAgICAgIDIwMCAqICh5IC0geiksXG4gICAgICAgICAgICByZ2JbM11dO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGxhYjJyZ2IobGFiKSB7XG4gICAgICAgIHZhciB5ID0gKGxhYlswXSArIDE2KSAvIDExNjtcbiAgICAgICAgdmFyIHggPSB5ICsgbGFiWzFdIC8gNTAwO1xuICAgICAgICB2YXIgeiA9IHkgLSBsYWJbMl0gLyAyMDA7XG4gICAgICAgIHggPSB4ID4gMC4yMDY4OTMwMzQgPyB4ICogeCAqIHggOiAoeCAtIDQgLyAyOSkgLyA3Ljc4NzAzNztcbiAgICAgICAgeSA9IHkgPiAwLjIwNjg5MzAzNCA/IHkgKiB5ICogeSA6ICh5IC0gNCAvIDI5KSAvIDcuNzg3MDM3O1xuICAgICAgICB6ID0geiA+IDAuMjA2ODkzMDM0ID8geiAqIHogKiB6IDogKHogLSA0IC8gMjkpIC8gNy43ODcwMzc7XG4gICAgICAgIHggPSB4ICogMC45NTA0NzsgLy8gT2JzZXJ2ZXI9IDLCsCwgSWxsdW1pbmFudD0gRDY1XG4gICAgICAgIHkgPSB5ICogMS4wMDAwMDtcbiAgICAgICAgeiA9IHogKiAxLjA4ODgzO1xuICAgICAgICB2YXIgciA9IHggKiAzLjI0MDQ1NDIgKyB5ICogLTEuNTM3MTM4NSArIHogKiAtMC40OTg1MzE0O1xuICAgICAgICB2YXIgZyA9IHggKiAtMC45NjkyNjYwICsgeSAqIDEuODc2MDEwOCArIHogKiAwLjA0MTU1NjA7XG4gICAgICAgIHZhciBiID0geCAqIDAuMDU1NjQzNCArIHkgKiAtMC4yMDQwMjU5ICsgeiAqIDEuMDU3MjI1MjtcbiAgICAgICAgciA9IHIgPiAwLjAwMzA0ID8gMS4wNTUgKiBNYXRoLnBvdyhyLCAxIC8gMi40KSAtIDAuMDU1IDogMTIuOTIgKiByO1xuICAgICAgICBnID0gZyA+IDAuMDAzMDQgPyAxLjA1NSAqIE1hdGgucG93KGcsIDEgLyAyLjQpIC0gMC4wNTUgOiAxMi45MiAqIGc7XG4gICAgICAgIGIgPSBiID4gMC4wMDMwNCA/IDEuMDU1ICogTWF0aC5wb3coYiwgMSAvIDIuNCkgLSAwLjA1NSA6IDEyLjkyICogYjtcbiAgICAgICAgcmV0dXJuIFtNYXRoLm1heChNYXRoLm1pbihyLCAxKSwgMCksIE1hdGgubWF4KE1hdGgubWluKGcsIDEpLCAwKSwgTWF0aC5tYXgoTWF0aC5taW4oYiwgMSksIDApLCBsYWJbM11dO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGRpc3RhbmNlKGMxLCBjMikge1xuICAgICAgICByZXR1cm4gTWF0aC5zcXJ0KFxuICAgICAgICAgICAgKGMxWzBdIC0gYzJbMF0pICogKGMxWzBdIC0gYzJbMF0pICtcbiAgICAgICAgICAgIChjMVsxXSAtIGMyWzFdKSAqIChjMVsxXSAtIGMyWzFdKSArXG4gICAgICAgICAgICAoYzFbMl0gLSBjMlsyXSkgKiAoYzFbMl0gLSBjMlsyXSkgK1xuICAgICAgICAgICAgKGMxWzNdIC0gYzJbM10pICogKGMxWzNdIC0gYzJbM10pXG4gICAgICAgICk7XG4gICAgfVxuXG4gICAgdmFyIEdSQURJRU5UX1NURVBTID0gMjAwO1xuXG4gICAgLy8gSW50ZXJwb2xhdGUgYmV0d2VlbiBhIHNldCBvZiBjb2xvcnMgdXNpbmcgZXZlbiBwZXJjZXB0dWFsIGRpc3RhbmNlIGFuZCBpbnRlcnBvbGF0aW9uIGluIENJRSBMKmEqYiogc3BhY2VcbiAgICB2YXIgYnVpbGRQZXJjZXB0dWFsTG9va3VwVGFibGUgPSBmdW5jdGlvbihiYXNlQ29sb3JzKSB7XG4gICAgICAgIHZhciBvdXRwdXRHcmFkaWVudCA9IFtdO1xuICAgICAgICAvLyBDYWxjdWxhdGUgcGVyY2VwdHVhbCBzcHJlYWQgaW4gTCphKmIqIHNwYWNlXG4gICAgICAgIHZhciBsYWJzID0gXy5tYXAoYmFzZUNvbG9ycywgZnVuY3Rpb24oY29sb3IpIHtcbiAgICAgICAgICAgIHJldHVybiByZ2IybGFiKFtjb2xvclswXSAvIDI1NSwgY29sb3JbMV0gLyAyNTUsIGNvbG9yWzJdIC8gMjU1LCBjb2xvclszXSAvIDI1NV0pO1xuICAgICAgICB9KTtcbiAgICAgICAgdmFyIGRpc3RhbmNlcyA9IF8ubWFwKGxhYnMsIGZ1bmN0aW9uKGNvbG9yLCBpbmRleCwgY29sb3JzKSB7XG4gICAgICAgICAgICByZXR1cm4gaW5kZXggPiAwID8gZGlzdGFuY2UoY29sb3IsIGNvbG9yc1tpbmRleCAtIDFdKSA6IDA7XG4gICAgICAgIH0pO1xuICAgICAgICAvLyBDYWxjdWxhdGUgY3VtdWxhdGl2ZSBkaXN0YW5jZXMgaW4gWzAsMV1cbiAgICAgICAgdmFyIHRvdGFsRGlzdGFuY2UgPSBfLnJlZHVjZShkaXN0YW5jZXMsIGZ1bmN0aW9uKGEsIGIpIHtcbiAgICAgICAgICAgIHJldHVybiBhICsgYjtcbiAgICAgICAgfSwgMCk7XG4gICAgICAgIGRpc3RhbmNlcyA9IF8ubWFwKGRpc3RhbmNlcywgZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgcmV0dXJuIGQgLyB0b3RhbERpc3RhbmNlO1xuICAgICAgICB9KTtcbiAgICAgICAgdmFyIGRpc3RhbmNlVHJhdmVyc2VkID0gMDtcbiAgICAgICAgdmFyIGtleSA9IDA7XG4gICAgICAgIHZhciBwcm9ncmVzcztcbiAgICAgICAgdmFyIHN0ZXBQcm9ncmVzcztcbiAgICAgICAgdmFyIHJnYjtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBHUkFESUVOVF9TVEVQUzsgaSsrKSB7XG4gICAgICAgICAgICBwcm9ncmVzcyA9IGkgLyAoR1JBRElFTlRfU1RFUFMgLSAxKTtcbiAgICAgICAgICAgIGlmIChwcm9ncmVzcyA+IGRpc3RhbmNlVHJhdmVyc2VkICsgZGlzdGFuY2VzW2tleSArIDFdICYmIGtleSArIDEgPCBsYWJzLmxlbmd0aCAtIDEpIHtcbiAgICAgICAgICAgICAgICBrZXkgKz0gMTtcbiAgICAgICAgICAgICAgICBkaXN0YW5jZVRyYXZlcnNlZCArPSBkaXN0YW5jZXNba2V5XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHN0ZXBQcm9ncmVzcyA9IChwcm9ncmVzcyAtIGRpc3RhbmNlVHJhdmVyc2VkKSAvIGRpc3RhbmNlc1trZXkgKyAxXTtcbiAgICAgICAgICAgIHJnYiA9IGxhYjJyZ2IoW1xuICAgICAgICAgICAgICAgIGxhYnNba2V5XVswXSArIChsYWJzW2tleSArIDFdWzBdIC0gbGFic1trZXldWzBdKSAqIHN0ZXBQcm9ncmVzcyxcbiAgICAgICAgICAgICAgICBsYWJzW2tleV1bMV0gKyAobGFic1trZXkgKyAxXVsxXSAtIGxhYnNba2V5XVsxXSkgKiBzdGVwUHJvZ3Jlc3MsXG4gICAgICAgICAgICAgICAgbGFic1trZXldWzJdICsgKGxhYnNba2V5ICsgMV1bMl0gLSBsYWJzW2tleV1bMl0pICogc3RlcFByb2dyZXNzLFxuICAgICAgICAgICAgICAgIGxhYnNba2V5XVszXSArIChsYWJzW2tleSArIDFdWzNdIC0gbGFic1trZXldWzNdKSAqIHN0ZXBQcm9ncmVzc1xuICAgICAgICAgICAgXSk7XG4gICAgICAgICAgICBvdXRwdXRHcmFkaWVudC5wdXNoKFtcbiAgICAgICAgICAgICAgICBNYXRoLnJvdW5kKHJnYlswXSAqIDI1NSksXG4gICAgICAgICAgICAgICAgTWF0aC5yb3VuZChyZ2JbMV0gKiAyNTUpLFxuICAgICAgICAgICAgICAgIE1hdGgucm91bmQocmdiWzJdICogMjU1KSxcbiAgICAgICAgICAgICAgICBNYXRoLnJvdW5kKHJnYlszXSAqIDI1NSlcbiAgICAgICAgICAgIF0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBvdXRwdXRHcmFkaWVudDtcbiAgICB9O1xuXG4gICAgdmFyIENPT0wgPSBidWlsZFBlcmNlcHR1YWxMb29rdXBUYWJsZShbXG4gICAgICAgIFsweDA0LCAweDIwLCAweDQwLCAweDUwXSxcbiAgICAgICAgWzB4MDgsIDB4NDAsIDB4ODEsIDB4N2ZdLFxuICAgICAgICBbMHgwOCwgMHg2OCwgMHhhYywgMHhmZl0sXG4gICAgICAgIFsweDJiLCAweDhjLCAweGJlLCAweGZmXSxcbiAgICAgICAgWzB4NGUsIDB4YjMsIDB4ZDMsIDB4ZmZdLFxuICAgICAgICBbMHg3YiwgMHhjYywgMHhjNCwgMHhmZl0sXG4gICAgICAgIFsweGE4LCAweGRkLCAweGI1LCAweGZmXSxcbiAgICAgICAgWzB4Y2MsIDB4ZWIsIDB4YzUsIDB4ZmZdLFxuICAgICAgICBbMHhlMCwgMHhmMywgMHhkYiwgMHhmZl0sXG4gICAgICAgIFsweGY3LCAweGZjLCAweGYwLCAweGZmXVxuICAgIF0pO1xuXG4gICAgdmFyIEhPVCA9IGJ1aWxkUGVyY2VwdHVhbExvb2t1cFRhYmxlKFtcbiAgICAgICAgWzB4NDAsIDB4MDAsIDB4MTMsIDB4NTBdLFxuICAgICAgICBbMHg4MCwgMHgwMCwgMHgyNiwgMHg3Zl0sXG4gICAgICAgIFsweGJkLCAweDAwLCAweDI2LCAweGZmXSxcbiAgICAgICAgWzB4ZTMsIDB4MWEsIDB4MWMsIDB4ZmZdLFxuICAgICAgICBbMHhmYywgMHg0ZSwgMHgyYSwgMHhmZl0sXG4gICAgICAgIFsweGZkLCAweDhkLCAweDNjLCAweGZmXSxcbiAgICAgICAgWzB4ZmUsIDB4YjIsIDB4NGMsIDB4ZmZdLFxuICAgICAgICBbMHhmZSwgMHhkOSwgMHg3NiwgMHhmZl0sXG4gICAgICAgIFsweGZmLCAweGVkLCAweGEwLCAweGZmXVxuICAgIF0pO1xuXG4gICAgdmFyIFZFUkRBTlQgPSBidWlsZFBlcmNlcHR1YWxMb29rdXBUYWJsZShbXG4gICAgICAgIFsweDAwLCAweDQwLCAweDI2LCAweDUwXSxcbiAgICAgICAgWzB4MDAsIDB4NWEsIDB4MzIsIDB4N2ZdLFxuICAgICAgICBbMHgyMywgMHg4NCwgMHg0MywgMHhmZl0sXG4gICAgICAgIFsweDQxLCAweGFiLCAweDVkLCAweGZmXSxcbiAgICAgICAgWzB4NzgsIDB4YzYsIDB4NzksIDB4ZmZdLFxuICAgICAgICBbMHhhZCwgMHhkZCwgMHg4ZSwgMHhmZl0sXG4gICAgICAgIFsweGQ5LCAweGYwLCAweGEzLCAweGZmXSxcbiAgICAgICAgWzB4ZjcsIDB4ZmMsIDB4YjksIDB4ZmZdLFxuICAgICAgICBbMHhmZiwgMHhmZiwgMHhlNSwgMHhmZl1cbiAgICBdKTtcblxuICAgIHZhciBTUEVDVFJBTCA9IGJ1aWxkUGVyY2VwdHVhbExvb2t1cFRhYmxlKFtcbiAgICAgICAgWzB4MjYsIDB4MWEsIDB4NDAsIDB4NTBdLFxuICAgICAgICBbMHg0NCwgMHgyZiwgMHg3MiwgMHg3Zl0sXG4gICAgICAgIFsweGUxLCAweDJiLCAweDAyLCAweGZmXSxcbiAgICAgICAgWzB4MDIsIDB4ZGMsIDB4MDEsIDB4ZmZdLFxuICAgICAgICBbMHhmZiwgMHhkMiwgMHgwMiwgMHhmZl0sXG4gICAgICAgIFsweGZmLCAweGZmLCAweGZmLCAweGZmXVxuICAgIF0pO1xuXG4gICAgdmFyIFRFTVBFUkFUVVJFID0gYnVpbGRQZXJjZXB0dWFsTG9va3VwVGFibGUoW1xuICAgICAgICBbMHgwMCwgMHgxNiwgMHg0MCwgMHg1MF0sXG4gICAgICAgIFsweDAwLCAweDM5LCAweDY2LCAweDdmXSwgLy9ibHVlXG4gICAgICAgIFsweDMxLCAweDNkLCAweDY2LCAweGZmXSwgLy9wdXJwbGVcbiAgICAgICAgWzB4ZTEsIDB4MmIsIDB4MDIsIDB4ZmZdLCAvL3JlZFxuICAgICAgICBbMHhmZiwgMHhkMiwgMHgwMiwgMHhmZl0sIC8veWVsbG93XG4gICAgICAgIFsweGZmLCAweGZmLCAweGZmLCAweGZmXSAvL3doaXRlXG4gICAgXSk7XG5cbiAgICB2YXIgR1JFWVNDQUxFID0gYnVpbGRQZXJjZXB0dWFsTG9va3VwVGFibGUoW1xuICAgICAgICBbMHgwMCwgMHgwMCwgMHgwMCwgMHg3Zl0sXG4gICAgICAgIFsweDQwLCAweDQwLCAweDQwLCAweGZmXSxcbiAgICAgICAgWzB4ZmYsIDB4ZmYsIDB4ZmYsIDB4ZmZdXG4gICAgXSk7XG5cbiAgICB2YXIgUE9MQVJfSE9UID0gYnVpbGRQZXJjZXB0dWFsTG9va3VwVGFibGUoW1xuICAgICAgICBbIDB4ZmYsIDB4NDQsIDB4MDAsIDB4ZmYgXSxcbiAgICAgICAgWyAweGJkLCAweGJkLCAweGJkLCAweGIwIF1cbiAgICBdKTtcblxuICAgIHZhciBQT0xBUl9DT0xEID0gYnVpbGRQZXJjZXB0dWFsTG9va3VwVGFibGUoW1xuICAgICAgICBbIDB4YmQsIDB4YmQsIDB4YmQsIDB4YjAgXSxcbiAgICAgICAgWyAweDMyLCAweGE1LCAweGY5LCAweGZmIF1cbiAgICBdKTtcblxuICAgIHZhciBidWlsZExvb2t1cEZ1bmN0aW9uID0gZnVuY3Rpb24oUkFNUCkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24oc2NhbGVkVmFsdWUsIGluQ29sb3IpIHtcbiAgICAgICAgICAgIHZhciBjb2xvciA9IFJBTVBbTWF0aC5mbG9vcihzY2FsZWRWYWx1ZSAqIChSQU1QLmxlbmd0aCAtIDEpKV07XG4gICAgICAgICAgICBpbkNvbG9yWzBdID0gY29sb3JbMF07XG4gICAgICAgICAgICBpbkNvbG9yWzFdID0gY29sb3JbMV07XG4gICAgICAgICAgICBpbkNvbG9yWzJdID0gY29sb3JbMl07XG4gICAgICAgICAgICBpbkNvbG9yWzNdID0gY29sb3JbM107XG4gICAgICAgICAgICByZXR1cm4gaW5Db2xvcjtcbiAgICAgICAgfTtcbiAgICB9O1xuXG4gICAgdmFyIENvbG9yUmFtcCA9IHtcbiAgICAgICAgY29vbDogYnVpbGRMb29rdXBGdW5jdGlvbihDT09MKSxcbiAgICAgICAgaG90OiBidWlsZExvb2t1cEZ1bmN0aW9uKEhPVCksXG4gICAgICAgIHZlcmRhbnQ6IGJ1aWxkTG9va3VwRnVuY3Rpb24oVkVSREFOVCksXG4gICAgICAgIHNwZWN0cmFsOiBidWlsZExvb2t1cEZ1bmN0aW9uKFNQRUNUUkFMKSxcbiAgICAgICAgdGVtcGVyYXR1cmU6IGJ1aWxkTG9va3VwRnVuY3Rpb24oVEVNUEVSQVRVUkUpLFxuICAgICAgICBncmV5OiBidWlsZExvb2t1cEZ1bmN0aW9uKEdSRVlTQ0FMRSksXG4gICAgICAgIHBvbGFyOiBidWlsZExvb2t1cEZ1bmN0aW9uKFBPTEFSX0hPVC5jb25jYXQoUE9MQVJfQ09MRCkpXG4gICAgfTtcblxuICAgIHZhciBzZXRDb2xvclJhbXAgPSBmdW5jdGlvbih0eXBlKSB7XG4gICAgICAgIHZhciBmdW5jID0gQ29sb3JSYW1wW3R5cGUudG9Mb3dlckNhc2UoKV07XG4gICAgICAgIGlmIChmdW5jKSB7XG4gICAgICAgICAgICB0aGlzLl9jb2xvclJhbXAgPSBmdW5jO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07XG5cbiAgICB2YXIgZ2V0Q29sb3JSYW1wID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9jb2xvclJhbXA7XG4gICAgfTtcblxuICAgIHZhciBpbml0aWFsaXplID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMuX2NvbG9yUmFtcCA9IENvbG9yUmFtcC52ZXJkYW50O1xuICAgIH07XG5cbiAgICBtb2R1bGUuZXhwb3J0cyA9IHtcbiAgICAgICAgaW5pdGlhbGl6ZTogaW5pdGlhbGl6ZSxcbiAgICAgICAgc2V0Q29sb3JSYW1wOiBzZXRDb2xvclJhbXAsXG4gICAgICAgIGdldENvbG9yUmFtcDogZ2V0Q29sb3JSYW1wXG4gICAgfTtcblxufSgpKTtcbiIsIihmdW5jdGlvbigpIHtcblxuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIHZhciBTSUdNT0lEX1NDQUxFID0gMC4xNTtcblxuICAgIC8vIGxvZzEwXG5cbiAgICBmdW5jdGlvbiBsb2cxMFRyYW5zZm9ybSh2YWwsIG1pbiwgbWF4KSB7XG4gICAgICAgIHZhciBsb2dNaW4gPSBNYXRoLmxvZzEwKG1pbiB8fCAxKTtcbiAgICAgICAgdmFyIGxvZ01heCA9IE1hdGgubG9nMTAobWF4IHx8IDEpO1xuICAgICAgICB2YXIgbG9nVmFsID0gTWF0aC5sb2cxMCh2YWwgfHwgMSk7XG4gICAgICAgIHJldHVybiAobG9nVmFsIC0gbG9nTWluKSAvICgobG9nTWF4IC0gbG9nTWluKSB8fCAxKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpbnZlcnNlTG9nMTBUcmFuc2Zvcm0obnZhbCwgbWluLCBtYXgpIHtcbiAgICAgICAgdmFyIGxvZ01pbiA9IE1hdGgubG9nMTAobWluIHx8IDEpO1xuICAgICAgICB2YXIgbG9nTWF4ID0gTWF0aC5sb2cxMChtYXggfHwgMSk7XG4gICAgICAgIHJldHVybiBNYXRoLnBvdygxMCwgKG52YWwgKiBsb2dNYXggLSBudmFsICogbG9nTWluKSArIGxvZ01pbik7XG4gICAgfVxuXG4gICAgLy8gc2lnbW9pZFxuXG4gICAgZnVuY3Rpb24gc2lnbW9pZFRyYW5zZm9ybSh2YWwsIG1pbiwgbWF4KSB7XG4gICAgICAgIHZhciBhYnNNaW4gPSBNYXRoLmFicyhtaW4pO1xuICAgICAgICB2YXIgYWJzTWF4ID0gTWF0aC5hYnMobWF4KTtcbiAgICAgICAgdmFyIGRpc3RhbmNlID0gTWF0aC5tYXgoYWJzTWluLCBhYnNNYXgpO1xuICAgICAgICB2YXIgc2NhbGVkVmFsID0gdmFsIC8gKFNJR01PSURfU0NBTEUgKiBkaXN0YW5jZSk7XG4gICAgICAgIHJldHVybiAxIC8gKDEgKyBNYXRoLmV4cCgtc2NhbGVkVmFsKSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaW52ZXJzZVNpZ21vaWRUcmFuc2Zvcm0obnZhbCwgbWluLCBtYXgpIHtcbiAgICAgICAgdmFyIGFic01pbiA9IE1hdGguYWJzKG1pbik7XG4gICAgICAgIHZhciBhYnNNYXggPSBNYXRoLmFicyhtYXgpO1xuICAgICAgICB2YXIgZGlzdGFuY2UgPSBNYXRoLm1heChhYnNNaW4sIGFic01heCk7XG4gICAgICAgIHJldHVybiBNYXRoLmxvZygoMS9udmFsKSAtIDEpICogLShTSUdNT0lEX1NDQUxFICogZGlzdGFuY2UpO1xuICAgIH1cblxuICAgIC8vIGxpbmVhclxuXG4gICAgZnVuY3Rpb24gbGluZWFyVHJhbnNmb3JtKHZhbCwgbWluLCBtYXgpIHtcbiAgICAgICAgdmFyIHJhbmdlID0gbWF4IC0gbWluO1xuICAgICAgICByZXR1cm4gKHZhbCAtIG1pbikgLyByYW5nZTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpbnZlcnNlTGluZWFyVHJhbnNmb3JtKG52YWwsIG1pbiwgbWF4KSB7XG4gICAgICAgIHZhciByYW5nZSA9IG1heCAtIG1pbjtcbiAgICAgICAgcmV0dXJuIG1pbiArIG52YWwgKiByYW5nZTtcbiAgICB9XG5cbiAgICB2YXIgVHJhbnNmb3JtID0ge1xuICAgICAgICBsaW5lYXI6IGxpbmVhclRyYW5zZm9ybSxcbiAgICAgICAgbG9nMTA6IGxvZzEwVHJhbnNmb3JtLFxuICAgICAgICBzaWdtb2lkOiBzaWdtb2lkVHJhbnNmb3JtXG4gICAgfTtcblxuICAgIHZhciBJbnZlcnNlID0ge1xuICAgICAgICBsaW5lYXI6IGludmVyc2VMaW5lYXJUcmFuc2Zvcm0sXG4gICAgICAgIGxvZzEwOiBpbnZlcnNlTG9nMTBUcmFuc2Zvcm0sXG4gICAgICAgIHNpZ21vaWQ6IGludmVyc2VTaWdtb2lkVHJhbnNmb3JtXG4gICAgfTtcblxuICAgIHZhciBpbml0aWFsaXplID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMuX3JhbmdlID0ge1xuICAgICAgICAgICAgbWluOiAwLFxuICAgICAgICAgICAgbWF4OiAxXG4gICAgICAgIH07XG4gICAgICAgIHRoaXMuX3RyYW5zZm9ybUZ1bmMgPSBsb2cxMFRyYW5zZm9ybTtcbiAgICAgICAgdGhpcy5faW52ZXJzZUZ1bmMgPSBpbnZlcnNlTG9nMTBUcmFuc2Zvcm07XG4gICAgfTtcblxuICAgIHZhciBzZXRUcmFuc2Zvcm1GdW5jID0gZnVuY3Rpb24odHlwZSkge1xuICAgICAgICB2YXIgZnVuYyA9IHR5cGUudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgdGhpcy5fdHJhbnNmb3JtRnVuYyA9IFRyYW5zZm9ybVtmdW5jXTtcbiAgICAgICAgdGhpcy5faW52ZXJzZUZ1bmMgPSBJbnZlcnNlW2Z1bmNdO1xuICAgIH07XG5cbiAgICB2YXIgc2V0VmFsdWVSYW5nZSA9IGZ1bmN0aW9uKHJhbmdlKSB7XG4gICAgICAgIHRoaXMuX3JhbmdlLm1pbiA9IHJhbmdlLm1pbjtcbiAgICAgICAgdGhpcy5fcmFuZ2UubWF4ID0gcmFuZ2UubWF4O1xuICAgIH07XG5cbiAgICB2YXIgZ2V0VmFsdWVSYW5nZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fcmFuZ2U7XG4gICAgfTtcblxuICAgIHZhciBpbnRlcnBvbGF0ZVRvUmFuZ2UgPSBmdW5jdGlvbihudmFsKSB7XG4gICAgICAgIC8vIGludGVycG9sYXRlIGJldHdlZW4gdGhlIGZpbHRlciByYW5nZVxuICAgICAgICB2YXIgck1pbiA9IHRoaXMuX3JhbmdlLm1pbjtcbiAgICAgICAgdmFyIHJNYXggPSB0aGlzLl9yYW5nZS5tYXg7XG4gICAgICAgIHZhciBydmFsID0gKG52YWwgLSByTWluKSAvIChyTWF4IC0gck1pbik7XG4gICAgICAgIC8vIGVuc3VyZSBvdXRwdXQgaXMgWzA6MV1cbiAgICAgICAgcmV0dXJuIE1hdGgubWF4KDAsIE1hdGgubWluKDEsIHJ2YWwpKTtcbiAgICB9O1xuXG4gICAgdmFyIHRyYW5zZm9ybVZhbHVlID0gZnVuY3Rpb24odmFsKSB7XG4gICAgICAgIC8vIGNsYW1wIHRoZSB2YWx1ZSBiZXR3ZWVuIHRoZSBleHRyZW1lIChzaG91bGRuJ3QgYmUgbmVjZXNzYXJ5KVxuICAgICAgICB2YXIgbWluID0gdGhpcy5fZXh0cmVtYS5taW47XG4gICAgICAgIHZhciBtYXggPSB0aGlzLl9leHRyZW1hLm1heDtcbiAgICAgICAgdmFyIGNsYW1wZWQgPSBNYXRoLm1heChNYXRoLm1pbih2YWwsIG1heCksIG1pbik7XG4gICAgICAgIC8vIG5vcm1hbGl6ZSB0aGUgdmFsdWVcbiAgICAgICAgcmV0dXJuIHRoaXMuX3RyYW5zZm9ybUZ1bmMoY2xhbXBlZCwgbWluLCBtYXgpO1xuICAgIH07XG5cbiAgICB2YXIgdW50cmFuc2Zvcm1WYWx1ZSA9IGZ1bmN0aW9uKG52YWwpIHtcbiAgICAgICAgdmFyIG1pbiA9IHRoaXMuX2V4dHJlbWEubWluO1xuICAgICAgICB2YXIgbWF4ID0gdGhpcy5fZXh0cmVtYS5tYXg7XG4gICAgICAgIC8vIGNsYW1wIHRoZSB2YWx1ZSBiZXR3ZWVuIHRoZSBleHRyZW1lIChzaG91bGRuJ3QgYmUgbmVjZXNzYXJ5KVxuICAgICAgICB2YXIgY2xhbXBlZCA9IE1hdGgubWF4KE1hdGgubWluKG52YWwsIDEpLCAwKTtcbiAgICAgICAgLy8gdW5ub3JtYWxpemUgdGhlIHZhbHVlXG4gICAgICAgIHJldHVybiB0aGlzLl9pbnZlcnNlRnVuYyhjbGFtcGVkLCBtaW4sIG1heCk7XG4gICAgfTtcblxuICAgIG1vZHVsZS5leHBvcnRzID0ge1xuICAgICAgICBpbml0aWFsaXplOiBpbml0aWFsaXplLFxuICAgICAgICBzZXRUcmFuc2Zvcm1GdW5jOiBzZXRUcmFuc2Zvcm1GdW5jLFxuICAgICAgICBzZXRWYWx1ZVJhbmdlOiBzZXRWYWx1ZVJhbmdlLFxuICAgICAgICBnZXRWYWx1ZVJhbmdlOiBnZXRWYWx1ZVJhbmdlLFxuICAgICAgICB0cmFuc2Zvcm1WYWx1ZTogdHJhbnNmb3JtVmFsdWUsXG4gICAgICAgIHVudHJhbnNmb3JtVmFsdWU6IHVudHJhbnNmb3JtVmFsdWUsXG4gICAgICAgIGludGVycG9sYXRlVG9SYW5nZTogaW50ZXJwb2xhdGVUb1JhbmdlXG4gICAgfTtcblxufSgpKTtcbiIsIihmdW5jdGlvbigpIHtcblxuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIHZhciBUaWxpbmcgPSByZXF1aXJlKCcuL1RpbGluZycpO1xuXG4gICAgdmFyIHNldFJlc29sdXRpb24gPSBmdW5jdGlvbihyZXNvbHV0aW9uKSB7XG4gICAgICAgIGlmIChyZXNvbHV0aW9uICE9PSB0aGlzLl9wYXJhbXMuYmlubmluZy5yZXNvbHV0aW9uKSB7XG4gICAgICAgICAgICB0aGlzLl9wYXJhbXMuYmlubmluZy5yZXNvbHV0aW9uID0gcmVzb2x1dGlvbjtcbiAgICAgICAgICAgIHRoaXMuY2xlYXJFeHRyZW1hKCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcblxuICAgIHZhciBnZXRSZXNvbHV0aW9uID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9wYXJhbXMuYmlubmluZy5yZXNvbHV0aW9uO1xuICAgIH07XG5cbiAgICBtb2R1bGUuZXhwb3J0cyA9IHtcbiAgICAgICAgLy8gdGlsaW5nXG4gICAgICAgIHNldFhGaWVsZDogVGlsaW5nLnNldFhGaWVsZCxcbiAgICAgICAgZ2V0WEZpZWxkOiBUaWxpbmcuZ2V0WEZpZWxkLFxuICAgICAgICBzZXRZRmllbGQ6IFRpbGluZy5zZXRZRmllbGQsXG4gICAgICAgIGdldFlGaWVsZDogVGlsaW5nLmdldFlGaWVsZCxcbiAgICAgICAgLy8gYmlubmluZ1xuICAgICAgICBzZXRSZXNvbHV0aW9uOiBzZXRSZXNvbHV0aW9uLFxuICAgICAgICBnZXRSZXNvbHV0aW9uOiBnZXRSZXNvbHV0aW9uXG4gICAgfTtcblxufSgpKTtcbiIsIihmdW5jdGlvbigpe1xuXG4gICd1c2Ugc3RyaWN0JztcblxuICBmdW5jdGlvbiBpc1ZhbGlkUXVlcnkobWV0YSwgcXVlcnkpe1xuICAgIGlmIChxdWVyeSAmJiBBcnJheS5pc0FycmF5KHF1ZXJ5Lm11c3QpKXtcbiAgICAgIHZhciBxdWVyeUNvbXBvbmVudENoZWNrID0gdHJ1ZTtcbiAgICAgIHF1ZXJ5Lm11c3QuZm9yRWFjaChmdW5jdGlvbihxdWVyeUJsb2NrKXtcbiAgICAgICAgaWYgKHF1ZXJ5QmxvY2sudGVybSkge1xuICAgICAgICAgICAgaWYgKCFtZXRhW3F1ZXJ5QmxvY2sudGVybS5maWVsZF0pe1xuICAgICAgICAgICAgICBxdWVyeUNvbXBvbmVudENoZWNrID0gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAocXVlcnlCbG9jay5yYW5nZSkge1xuICAgICAgICAgIGlmICghbWV0YVtxdWVyeUJsb2NrLnJhbmdlLmZpZWxkXSl7XG4gICAgICAgICAgICBxdWVyeUNvbXBvbmVudENoZWNrID0gZmFsc2U7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHF1ZXJ5Q29tcG9uZW50Q2hlY2sgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICByZXR1cm4gcXVlcnlDb21wb25lbnRDaGVjaztcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGFkZEJvb2xRdWVyeShxdWVyeSl7XG5cbiAgICB2YXIgbWV0YSA9IHRoaXMuX21ldGE7XG5cbiAgICBpZiAoaXNWYWxpZFF1ZXJ5KG1ldGEsIHF1ZXJ5KSkge1xuICAgICAgY29uc29sZS5sb2coJ1ZhbGlkIGJvb2xfcXVlcnknKTtcbiAgICAgIHRoaXMuX3BhcmFtcy5ib29sX3F1ZXJ5ID0gcXVlcnk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnNvbGUud2FybignSW52YWxpZCBib29sX3F1ZXJ5Jyk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gcmVtb3ZlQm9vbFF1ZXJ5KCl7XG4gICAgdGhpcy5fcGFyYW1zLmJvb2xfcXVlcnkgPSBudWxsO1xuICAgIGRlbGV0ZSB0aGlzLl9wYXJhbXMuYm9vbF9xdWVyeTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldEJvb2xRdWVyeSgpe1xuICAgIHJldHVybiB0aGlzLl9wYXJhbXMuYm9vbF9xdWVyeTtcbiAgfVxuXG4gIG1vZHVsZS5leHBvcnRzID0ge1xuICAgIGFkZEJvb2xRdWVyeSA6IGFkZEJvb2xRdWVyeSxcbiAgICByZW1vdmVCb29sUXVlcnkgOiByZW1vdmVCb29sUXVlcnksXG4gICAgZ2V0Qm9vbFF1ZXJ5IDogZ2V0Qm9vbFF1ZXJ5XG4gIH07XG59KCkpO1xuIiwiKGZ1bmN0aW9uKCkge1xuXG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgdmFyIHNldERhdGVIaXN0b2dyYW0gPSBmdW5jdGlvbihmaWVsZCwgZnJvbSwgdG8sIGludGVydmFsKSB7XG4gICAgICAgIGlmICghZmllbGQpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybignRGF0ZUhpc3RvZ3JhbSBgZmllbGRgIGlzIG1pc3NpbmcgZnJvbSBhcmd1bWVudC4gSWdub3JpbmcgY29tbWFuZC4nKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZnJvbSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oJ0RhdGVIaXN0b2dyYW0gYGZyb21gIGFyZSBtaXNzaW5nIGZyb20gYXJndW1lbnQuIElnbm9yaW5nIGNvbW1hbmQuJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRvID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybignRGF0ZUhpc3RvZ3JhbSBgdG9gIGFyZSBtaXNzaW5nIGZyb20gYXJndW1lbnQuIElnbm9yaW5nIGNvbW1hbmQuJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fcGFyYW1zLmRhdGVfaGlzdG9ncmFtID0ge1xuICAgICAgICAgICAgZmllbGQ6IGZpZWxkLFxuICAgICAgICAgICAgZnJvbTogZnJvbSxcbiAgICAgICAgICAgIHRvOiB0byxcbiAgICAgICAgICAgIGludGVydmFsOiBpbnRlcnZhbFxuICAgICAgICB9O1xuICAgICAgICB0aGlzLmNsZWFyRXh0cmVtYSgpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9O1xuXG4gICAgdmFyIGdldERhdGVIaXN0b2dyYW0gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3BhcmFtcy5kYXRlX2hpc3RvZ3JhbTtcbiAgICB9O1xuXG4gICAgbW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgICAgIHNldERhdGVIaXN0b2dyYW06IHNldERhdGVIaXN0b2dyYW0sXG4gICAgICAgIGdldERhdGVIaXN0b2dyYW06IGdldERhdGVIaXN0b2dyYW1cbiAgICB9O1xuXG59KCkpO1xuIiwiKGZ1bmN0aW9uKCkge1xuXG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgdmFyIHNldEhpc3RvZ3JhbSA9IGZ1bmN0aW9uKGZpZWxkLCBpbnRlcnZhbCkge1xuICAgICAgICBpZiAoIWZpZWxkKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oJ0hpc3RvZ3JhbSBgZmllbGRgIGlzIG1pc3NpbmcgZnJvbSBhcmd1bWVudC4gSWdub3JpbmcgY29tbWFuZC4nKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIWludGVydmFsKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oJ0hpc3RvZ3JhbSBgaW50ZXJ2YWxgIGFyZSBtaXNzaW5nIGZyb20gYXJndW1lbnQuIElnbm9yaW5nIGNvbW1hbmQuJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fcGFyYW1zLmhpc3RvZ3JhbSA9IHtcbiAgICAgICAgICAgIGZpZWxkOiBmaWVsZCxcbiAgICAgICAgICAgIGludGVydmFsOiBpbnRlcnZhbFxuICAgICAgICB9O1xuICAgICAgICB0aGlzLmNsZWFyRXh0cmVtYSgpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9O1xuXG4gICAgdmFyIGdldEhpc3RvZ3JhbSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fcGFyYW1zLmhpc3RvZ3JhbTtcbiAgICB9O1xuXG4gICAgbW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgICAgIHNldEhpc3RvZ3JhbTogc2V0SGlzdG9ncmFtLFxuICAgICAgICBnZXRIaXN0b2dyYW06IGdldEhpc3RvZ3JhbVxuICAgIH07XG5cbn0oKSk7XG4iLCIoZnVuY3Rpb24oKSB7XG5cbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICB2YXIgTUVUUklDUyA9IHtcbiAgICAgICAgJ21pbic6IHRydWUsXG4gICAgICAgICdtYXgnOiB0cnVlLFxuICAgICAgICAnc3VtJzogdHJ1ZSxcbiAgICAgICAgJ2F2Zyc6IHRydWVcbiAgICB9O1xuXG4gICAgdmFyIGNoZWNrRmllbGQgPSBmdW5jdGlvbihtZXRhLCBmaWVsZCkge1xuICAgICAgICBpZiAobWV0YSkge1xuICAgICAgICAgICAgaWYgKG1ldGEuZXh0cmVtYSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oJ0ZpZWxkIGAnICsgZmllbGQgKyAnYCBpcyBub3Qgb3JkaW5hbCBpbiBtZXRhIGRhdGEuIElnbm9yaW5nIGNvbW1hbmQuJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oJ0ZpZWxkIGAnICsgZmllbGQgKyAnYCBpcyBub3QgcmVjb2duaXplZCBpbiBtZXRhIGRhdGEuIElnbm9yaW5nIGNvbW1hbmQuJyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH07XG5cbiAgICB2YXIgc2V0TWV0cmljQWdnID0gZnVuY3Rpb24oZmllbGQsIHR5cGUpIHtcbiAgICAgICAgaWYgKCFmaWVsZCkge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKCdNZXRyaWNBZ2cgYGZpZWxkYCBpcyBtaXNzaW5nIGZyb20gYXJndW1lbnQuIElnbm9yaW5nIGNvbW1hbmQuJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCF0eXBlKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oJ01ldHJpY0FnZyBgdHlwZWAgaXMgbWlzc2luZyBmcm9tIGFyZ3VtZW50LiBJZ25vcmluZyBjb21tYW5kLicpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHZhciBtZXRhID0gdGhpcy5fbWV0YVtmaWVsZF07XG4gICAgICAgIGlmIChjaGVja0ZpZWxkKG1ldGEsIGZpZWxkKSkge1xuICAgICAgICAgICAgaWYgKCFNRVRSSUNTW3R5cGVdKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKCdNZXRyaWNBZ2cgdHlwZSBgJyArIHR5cGUgKyAnYCBpcyBub3Qgc3VwcG9ydGVkLiBJZ25vcmluZyBjb21tYW5kLicpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuX3BhcmFtcy5tZXRyaWNfYWdnID0ge1xuICAgICAgICAgICAgICAgIGZpZWxkOiBmaWVsZCxcbiAgICAgICAgICAgICAgICB0eXBlOiB0eXBlXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgdGhpcy5jbGVhckV4dHJlbWEoKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9O1xuXG4gICAgdmFyIGdldE1ldHJpY0FnZyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fcGFyYW1zLm1ldHJpY19hZ2c7XG4gICAgfTtcblxuICAgIG1vZHVsZS5leHBvcnRzID0ge1xuICAgICAgICAvLyB0aWxpbmdcbiAgICAgICAgc2V0TWV0cmljQWdnOiBzZXRNZXRyaWNBZ2csXG4gICAgICAgIGdldE1ldHJpY0FnZzogZ2V0TWV0cmljQWdnLFxuICAgIH07XG5cbn0oKSk7XG4iLCIoZnVuY3Rpb24oKSB7XG5cbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICB2YXIgY2hlY2tGaWVsZCA9IGZ1bmN0aW9uKG1ldGEsIGZpZWxkKSB7XG4gICAgICAgIGlmIChtZXRhKSB7XG4gICAgICAgICAgICBpZiAobWV0YS50eXBlID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oJ0ZpZWxkIGAnICsgZmllbGQgKyAnYCBpcyBub3Qgb2YgdHlwZSBgc3RyaW5nYCBpbiBtZXRhIGRhdGEuIElnbm9yaW5nIGNvbW1hbmQuJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oJ0ZpZWxkIGAnICsgZmllbGQgKyAnYCBpcyBub3QgcmVjb2duaXplZCBpbiBtZXRhIGRhdGEuIElnbm9yaW5nIGNvbW1hbmQuJyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH07XG5cbiAgICB2YXIgbm9ybWFsaXplVGVybXMgPSBmdW5jdGlvbihwcmVmaXhlcykge1xuICAgICAgICBwcmVmaXhlcy5zb3J0KGZ1bmN0aW9uKGEsIGIpIHtcbiAgICAgICAgICAgIGlmIChhIDwgYikge1xuICAgICAgICAgICAgICAgIHJldHVybiAtMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChhID4gYikge1xuICAgICAgICAgICAgICAgIHJldHVybiAxO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gcHJlZml4ZXM7XG4gICAgfTtcblxuICAgIHZhciBhZGRQcmVmaXhGaWx0ZXIgPSBmdW5jdGlvbihmaWVsZCwgcHJlZml4ZXMpIHtcbiAgICAgICAgaWYgKCFmaWVsZCkge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKCdQcmVmaXhGaWx0ZXIgYGZpZWxkYCBpcyBtaXNzaW5nIGZyb20gYXJndW1lbnQuIElnbm9yaW5nIGNvbW1hbmQuJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHByZWZpeGVzID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybignUHJlZml4RmlsdGVyIGBwcmVmaXhlc2AgYXJlIG1pc3NpbmcgZnJvbSBhcmd1bWVudC4gSWdub3JpbmcgY29tbWFuZC4nKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB2YXIgbWV0YSA9IHRoaXMuX21ldGFbZmllbGRdO1xuICAgICAgICBpZiAoY2hlY2tGaWVsZChtZXRhLCBmaWVsZCkpIHtcbiAgICAgICAgICAgIHZhciBmaWx0ZXIgPSBfLmZpbmQodGhpcy5fcGFyYW1zLnByZWZpeF9maWx0ZXIsIGZ1bmN0aW9uKGZpbHRlcikge1xuICAgICAgICAgICAgICAgIHJldHVybiBmaWx0ZXIuZmllbGQgPT09IGZpZWxkO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBpZiAoZmlsdGVyKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKCdSYW5nZSB3aXRoIGBmaWVsZGAgb2YgYCcgKyBmaWVsZCArICdgIGFscmVhZHkgZXhpc3RzLCB1c2VkIGB1cGRhdGVSYW5nZWAgaW5zdGVhZC4nKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLl9wYXJhbXMucHJlZml4X2ZpbHRlciA9IHRoaXMuX3BhcmFtcy5wcmVmaXhfZmlsdGVyIHx8IFtdO1xuICAgICAgICAgICAgdGhpcy5fcGFyYW1zLnByZWZpeF9maWx0ZXIucHVzaCh7XG4gICAgICAgICAgICAgICAgZmllbGQ6IGZpZWxkLFxuICAgICAgICAgICAgICAgIHByZWZpeGVzOiBub3JtYWxpemVUZXJtcyhwcmVmaXhlcylcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgdGhpcy5jbGVhckV4dHJlbWEoKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9O1xuXG4gICAgdmFyIHVwZGF0ZVByZWZpeEZpbHRlciA9IGZ1bmN0aW9uKGZpZWxkLCBwcmVmaXhlcykge1xuICAgICAgICB2YXIgZmlsdGVyID0gXy5maW5kKHRoaXMuX3BhcmFtcy5wcmVmaXhfZmlsdGVyLCBmdW5jdGlvbihmaWx0ZXIpIHtcbiAgICAgICAgICAgIHJldHVybiBmaWx0ZXIuZmllbGQgPT09IGZpZWxkO1xuICAgICAgICB9KTtcbiAgICAgICAgaWYgKCFmaWx0ZXIpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybignUmFuZ2Ugd2l0aCBgZmllbGRgIG9mIGAnICsgZmllbGQgKyAnYCBkb2VzIG5vdCBleGlzdC4gSWdub3JpbmcgY29tbWFuZC4nKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAocHJlZml4ZXMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgZmlsdGVyLnByZWZpeGVzID0gbm9ybWFsaXplVGVybXMocHJlZml4ZXMpO1xuICAgICAgICAgICAgdGhpcy5jbGVhckV4dHJlbWEoKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9O1xuXG4gICAgdmFyIHJlbW92ZVByZWZpeEZpbHRlciA9IGZ1bmN0aW9uKGZpZWxkKSB7XG4gICAgICAgIHZhciBmaWx0ZXIgPSBfLmZpbmQodGhpcy5fcGFyYW1zLnByZWZpeF9maWx0ZXIsIGZ1bmN0aW9uKGZpbHRlcikge1xuICAgICAgICAgICAgcmV0dXJuIGZpbHRlci5maWVsZCA9PT0gZmllbGQ7XG4gICAgICAgIH0pO1xuICAgICAgICBpZiAoIWZpbHRlcikge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKCdSYW5nZSB3aXRoIGBmaWVsZGAgb2YgYCcgKyBmaWVsZCArICdgIGRvZXMgbm90IGV4aXN0LiBJZ25vcmluZyBjb21tYW5kLicpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX3BhcmFtcy5wcmVmaXhfZmlsdGVyID0gXy5maWx0ZXIodGhpcy5fcGFyYW1zLnByZWZpeF9maWx0ZXIsIGZ1bmN0aW9uKGZpbHRlcikge1xuICAgICAgICAgICAgcmV0dXJuIGZpbHRlci5maWVsZCAhPT0gZmllbGQ7XG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLmNsZWFyRXh0cmVtYSgpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9O1xuXG4gICAgdmFyIGdldFByZWZpeEZpbHRlciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fcGFyYW1zLnByZWZpeF9maWx0ZXI7XG4gICAgfTtcblxuICAgIG1vZHVsZS5leHBvcnRzID0ge1xuICAgICAgICBhZGRQcmVmaXhGaWx0ZXI6IGFkZFByZWZpeEZpbHRlcixcbiAgICAgICAgdXBkYXRlUHJlZml4RmlsdGVyOiB1cGRhdGVQcmVmaXhGaWx0ZXIsXG4gICAgICAgIHJlbW92ZVByZWZpeEZpbHRlcjogcmVtb3ZlUHJlZml4RmlsdGVyLFxuICAgICAgICBnZXRQcmVmaXhGaWx0ZXI6IGdldFByZWZpeEZpbHRlclxuICAgIH07XG5cbn0oKSk7XG4iLCIoZnVuY3Rpb24oKSB7XG5cbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICB2YXIgY2hlY2tGaWVsZCA9IGZ1bmN0aW9uKG1ldGEsIGZpZWxkKSB7XG4gICAgICAgIGlmIChtZXRhKSB7XG4gICAgICAgICAgICBpZiAobWV0YS50eXBlID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oJ0ZpZWxkIGAnICsgZmllbGQgKyAnYCBpcyBub3QgYHN0cmluZ2AgaW4gbWV0YSBkYXRhLiBJZ25vcmluZyBjb21tYW5kLicpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKCdGaWVsZCBgJyArIGZpZWxkICsgJ2AgaXMgbm90IHJlY29nbml6ZWQgaW4gbWV0YSBkYXRhLiBJZ25vcmluZyBjb21tYW5kLicpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9O1xuXG4gICAgdmFyIGFkZFF1ZXJ5U3RyaW5nID0gZnVuY3Rpb24oZmllbGQsIHN0cikge1xuICAgICAgICBpZiAoIWZpZWxkKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oJ1F1ZXJ5U3RyaW5nIGBmaWVsZGAgaXMgbWlzc2luZyBmcm9tIGFyZ3VtZW50LiBJZ25vcmluZyBjb21tYW5kLicpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmICghc3RyKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oJ1F1ZXJ5U3RyaW5nIGBzdHJpbmdgIGlzIG1pc3NpbmcgZnJvbSBhcmd1bWVudC4gSWdub3JpbmcgY29tbWFuZC4nKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB2YXIgbWV0YSA9IHRoaXMuX21ldGFbZmllbGRdO1xuICAgICAgICBpZiAoY2hlY2tGaWVsZChtZXRhLCBmaWVsZCkpIHtcbiAgICAgICAgICAgIHZhciBxdWVyeSA9IF8uZmluZCh0aGlzLl9wYXJhbXMucXVlcnlfc3RyaW5nLCBmdW5jdGlvbihxdWVyeSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBxdWVyeS5maWVsZCA9PT0gZmllbGQ7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGlmIChxdWVyeSkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybignUXVlcnlTdHJpbmcgd2l0aCBgZmllbGRgIG9mIGAnICsgZmllbGQgKyAnYCBhbHJlYWR5IGV4aXN0cywgdXNlZCBgdXBkYXRlUXVlcnlTdHJpbmdgIGluc3RlYWQuJyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5fcGFyYW1zLnF1ZXJ5X3N0cmluZyA9IHRoaXMuX3BhcmFtcy5xdWVyeV9zdHJpbmcgfHwgW107XG4gICAgICAgICAgICB0aGlzLl9wYXJhbXMucXVlcnlfc3RyaW5nLnB1c2goe1xuICAgICAgICAgICAgICAgIGZpZWxkOiBmaWVsZCxcbiAgICAgICAgICAgICAgICBzdHJpbmc6IHN0clxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB0aGlzLmNsZWFyRXh0cmVtYSgpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07XG5cbiAgICB2YXIgdXBkYXRlUXVlcnlTdHJpbmcgPSBmdW5jdGlvbihmaWVsZCwgc3RyKSB7XG4gICAgICAgIHZhciBxdWVyeSA9IF8uZmluZCh0aGlzLl9wYXJhbXMucXVlcnlfc3RyaW5nLCBmdW5jdGlvbihxdWVyeSkge1xuICAgICAgICAgICAgcmV0dXJuIHF1ZXJ5LmZpZWxkID09PSBmaWVsZDtcbiAgICAgICAgfSk7XG4gICAgICAgIGlmICghcXVlcnkpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybignUXVlcnlTdHJpbmcgd2l0aCBgZmllbGRgIG9mIGAnICsgZmllbGQgKyAnYCBkb2VzIG5vdCBleGlzdC4gSWdub3JpbmcgY29tbWFuZC4nKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB2YXIgY2hhbmdlZCA9IGZhbHNlO1xuICAgICAgICBpZiAoc3RyICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGNoYW5nZWQgPSB0cnVlO1xuICAgICAgICAgICAgcXVlcnkuc3RyaW5nID0gc3RyO1xuICAgICAgICB9XG4gICAgICAgIGlmIChjaGFuZ2VkKSB7XG4gICAgICAgICAgICB0aGlzLmNsZWFyRXh0cmVtYSgpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07XG5cbiAgICB2YXIgcmVtb3ZlUXVlcnlTdHJpbmcgPSBmdW5jdGlvbihmaWVsZCkge1xuICAgICAgICB2YXIgcXVlcnkgPSBfLmZpbmQodGhpcy5fcGFyYW1zLnF1ZXJ5X3N0cmluZywgZnVuY3Rpb24ocXVlcnkpIHtcbiAgICAgICAgICAgIHJldHVybiBxdWVyeS5maWVsZCA9PT0gZmllbGQ7XG4gICAgICAgIH0pO1xuICAgICAgICBpZiAoIXF1ZXJ5KSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oJ1F1ZXJ5U3RyaW5nIHdpdGggYGZpZWxkYCBvZiBgJyArIGZpZWxkICsgJ2AgZG9lcyBub3QgZXhpc3QuIElnbm9yaW5nIGNvbW1hbmQuJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fcGFyYW1zLnF1ZXJ5X3N0cmluZyA9IF8uZmlsdGVyKHRoaXMuX3BhcmFtcy5xdWVyeV9zdHJpbmcsIGZ1bmN0aW9uKHF1ZXJ5KSB7XG4gICAgICAgICAgICByZXR1cm4gcXVlcnkuZmllbGQgIT09IGZpZWxkO1xuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5jbGVhckV4dHJlbWEoKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcblxuICAgIHZhciBnZXRRdWVyeVN0cmluZyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fcGFyYW1zLnF1ZXJ5X3N0cmluZztcbiAgICB9O1xuXG4gICAgbW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgICAgIGFkZFF1ZXJ5U3RyaW5nOiBhZGRRdWVyeVN0cmluZyxcbiAgICAgICAgdXBkYXRlUXVlcnlTdHJpbmc6IHVwZGF0ZVF1ZXJ5U3RyaW5nLFxuICAgICAgICByZW1vdmVRdWVyeVN0cmluZzogcmVtb3ZlUXVlcnlTdHJpbmcsXG4gICAgICAgIGdldFF1ZXJ5U3RyaW5nOiBnZXRRdWVyeVN0cmluZ1xuICAgIH07XG5cbn0oKSk7XG4iLCIoZnVuY3Rpb24oKSB7XG5cbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICB2YXIgY2hlY2tGaWVsZCA9IGZ1bmN0aW9uKG1ldGEsIGZpZWxkKSB7XG4gICAgICAgIGlmIChtZXRhKSB7XG4gICAgICAgICAgICBpZiAobWV0YS5leHRyZW1hKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybignRmllbGQgYCcgKyBmaWVsZCArICdgIGlzIG5vdCBvcmRpbmFsIGluIG1ldGEgZGF0YS4gSWdub3JpbmcgY29tbWFuZC4nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybignRmllbGQgYCcgKyBmaWVsZCArICdgIGlzIG5vdCByZWNvZ25pemVkIGluIG1ldGEgZGF0YS4gSWdub3JpbmcgY29tbWFuZC4nKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfTtcblxuICAgIHZhciBhZGRSYW5nZSA9IGZ1bmN0aW9uKGZpZWxkLCBmcm9tLCB0bykge1xuICAgICAgICBpZiAoIWZpZWxkKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oJ1JhbmdlIGBmaWVsZGAgaXMgbWlzc2luZyBmcm9tIGFyZ3VtZW50LiBJZ25vcmluZyBjb21tYW5kLicpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmIChmcm9tID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybignUmFuZ2UgYGZyb21gIGlzIG1pc3NpbmcgZnJvbSBhcmd1bWVudC4gSWdub3JpbmcgY29tbWFuZC4nKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAodG8gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKCdSYW5nZSBgdG9gIGlzIG1pc3NpbmcgZnJvbSBhcmd1bWVudC4gSWdub3JpbmcgY29tbWFuZC4nKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB2YXIgbWV0YSA9IHRoaXMuX21ldGFbZmllbGRdO1xuICAgICAgICBpZiAoY2hlY2tGaWVsZChtZXRhLCBmaWVsZCkpIHtcbiAgICAgICAgICAgIHZhciByYW5nZSA9IF8uZmluZCh0aGlzLl9wYXJhbXMucmFuZ2UsIGZ1bmN0aW9uKHJhbmdlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJhbmdlLmZpZWxkID09PSBmaWVsZDtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaWYgKHJhbmdlKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKCdSYW5nZSB3aXRoIGBmaWVsZGAgb2YgYCcgKyBmaWVsZCArICdgIGFscmVhZHkgZXhpc3RzLCB1c2VkIGB1cGRhdGVSYW5nZWAgaW5zdGVhZC4nKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLl9wYXJhbXMucmFuZ2UgPSB0aGlzLl9wYXJhbXMucmFuZ2UgfHwgW107XG4gICAgICAgICAgICB0aGlzLl9wYXJhbXMucmFuZ2UucHVzaCh7XG4gICAgICAgICAgICAgICAgZmllbGQ6IGZpZWxkLFxuICAgICAgICAgICAgICAgIGZyb206IGZyb20sXG4gICAgICAgICAgICAgICAgdG86IHRvXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHRoaXMuY2xlYXJFeHRyZW1hKCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcblxuICAgIHZhciB1cGRhdGVSYW5nZSA9IGZ1bmN0aW9uKGZpZWxkLCBmcm9tLCB0bykge1xuICAgICAgICB2YXIgcmFuZ2UgPSBfLmZpbmQodGhpcy5fcGFyYW1zLnJhbmdlLCBmdW5jdGlvbihyYW5nZSkge1xuICAgICAgICAgICAgcmV0dXJuIHJhbmdlLmZpZWxkID09PSBmaWVsZDtcbiAgICAgICAgfSk7XG4gICAgICAgIGlmICghcmFuZ2UpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybignUmFuZ2Ugd2l0aCBgZmllbGRgIG9mIGAnICsgZmllbGQgKyAnYCBkb2VzIG5vdCBleGlzdC4gSWdub3JpbmcgY29tbWFuZC4nKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB2YXIgY2hhbmdlZCA9IGZhbHNlO1xuICAgICAgICBpZiAoZnJvbSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBjaGFuZ2VkID0gdHJ1ZTtcbiAgICAgICAgICAgIHJhbmdlLmZyb20gPSBmcm9tO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0byAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBjaGFuZ2VkID0gdHJ1ZTtcbiAgICAgICAgICAgIHJhbmdlLnRvID0gdG87XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNoYW5nZWQpIHtcbiAgICAgICAgICAgIHRoaXMuY2xlYXJFeHRyZW1hKCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcblxuICAgIHZhciByZW1vdmVSYW5nZSA9IGZ1bmN0aW9uKGZpZWxkKSB7XG4gICAgICAgIHZhciByYW5nZSA9IF8uZmluZCh0aGlzLl9wYXJhbXMucmFuZ2UsIGZ1bmN0aW9uKHJhbmdlKSB7XG4gICAgICAgICAgICByZXR1cm4gcmFuZ2UuZmllbGQgPT09IGZpZWxkO1xuICAgICAgICB9KTtcbiAgICAgICAgaWYgKCFyYW5nZSkge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKCdSYW5nZSB3aXRoIGBmaWVsZGAgb2YgYCcgKyBmaWVsZCArICdgIGRvZXMgbm90IGV4aXN0LiBJZ25vcmluZyBjb21tYW5kLicpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX3BhcmFtcy5yYW5nZSA9IF8uZmlsdGVyKHRoaXMuX3BhcmFtcy5yYW5nZSwgZnVuY3Rpb24ocmFuZ2UpIHtcbiAgICAgICAgICAgIHJldHVybiByYW5nZS5maWVsZCAhPT0gZmllbGQ7XG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLmNsZWFyRXh0cmVtYSgpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9O1xuXG4gICAgdmFyIGdldFJhbmdlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9wYXJhbXMucmFuZ2U7XG4gICAgfTtcblxuICAgIG1vZHVsZS5leHBvcnRzID0ge1xuICAgICAgICBhZGRSYW5nZTogYWRkUmFuZ2UsXG4gICAgICAgIHVwZGF0ZVJhbmdlOiB1cGRhdGVSYW5nZSxcbiAgICAgICAgcmVtb3ZlUmFuZ2U6IHJlbW92ZVJhbmdlLFxuICAgICAgICBnZXRSYW5nZTogZ2V0UmFuZ2VcbiAgICB9O1xuXG59KCkpO1xuIiwiKGZ1bmN0aW9uKCkge1xuXG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgdmFyIGNoZWNrRmllbGQgPSBmdW5jdGlvbihtZXRhLCBmaWVsZCkge1xuICAgICAgICBpZiAobWV0YSkge1xuICAgICAgICAgICAgaWYgKG1ldGEudHlwZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKCdGaWVsZCBgJyArIGZpZWxkICsgJ2AgaXMgbm90IG9mIHR5cGUgYHN0cmluZ2AgaW4gbWV0YSBkYXRhLiBJZ25vcmluZyBjb21tYW5kLicpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKCdGaWVsZCBgJyArIGZpZWxkICsgJ2AgaXMgbm90IHJlY29nbml6ZWQgaW4gbWV0YSBkYXRhLiBJZ25vcmluZyBjb21tYW5kLicpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9O1xuXG4gICAgdmFyIG5vcm1hbGl6ZVRlcm1zID0gZnVuY3Rpb24odGVybXMpIHtcbiAgICAgICAgdGVybXMuc29ydChmdW5jdGlvbihhLCBiKSB7XG4gICAgICAgICAgICBpZiAoYSA8IGIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gLTE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoYSA+IGIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHRlcm1zO1xuICAgIH07XG5cbiAgICB2YXIgc2V0VGVybXNBZ2cgPSBmdW5jdGlvbihmaWVsZCwgdGVybXMpIHtcbiAgICAgICAgaWYgKCFmaWVsZCkge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKCdUZXJtc0FnZyBgZmllbGRgIGlzIG1pc3NpbmcgZnJvbSBhcmd1bWVudC4gSWdub3JpbmcgY29tbWFuZC4nKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGVybXMgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKCdUZXJtc0FnZyBgdGVybXNgIGFyZSBtaXNzaW5nIGZyb20gYXJndW1lbnQuIElnbm9yaW5nIGNvbW1hbmQuJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdmFyIG1ldGEgPSB0aGlzLl9tZXRhW2ZpZWxkXTtcbiAgICAgICAgaWYgKGNoZWNrRmllbGQobWV0YSwgZmllbGQpKSB7XG4gICAgICAgICAgICB0aGlzLl9wYXJhbXMudGVybXNfYWdnID0ge1xuICAgICAgICAgICAgICAgIGZpZWxkOiBmaWVsZCxcbiAgICAgICAgICAgICAgICB0ZXJtczogbm9ybWFsaXplVGVybXModGVybXMpXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgdGhpcy5jbGVhckV4dHJlbWEoKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9O1xuXG4gICAgdmFyIGdldFRlcm1zQWdnID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9wYXJhbXMudGVybXNfYWdnO1xuICAgIH07XG5cbiAgICBtb2R1bGUuZXhwb3J0cyA9IHtcbiAgICAgICAgc2V0VGVybXNBZ2c6IHNldFRlcm1zQWdnLFxuICAgICAgICBnZXRUZXJtc0FnZzogZ2V0VGVybXNBZ2dcbiAgICB9O1xuXG59KCkpO1xuIiwiKGZ1bmN0aW9uKCkge1xuXG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgdmFyIGNoZWNrRmllbGQgPSBmdW5jdGlvbihtZXRhLCBmaWVsZCkge1xuICAgICAgICBpZiAobWV0YSkge1xuICAgICAgICAgICAgaWYgKG1ldGEudHlwZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKCdGaWVsZCBgJyArIGZpZWxkICsgJ2AgaXMgbm90IG9mIHR5cGUgYHN0cmluZ2AgaW4gbWV0YSBkYXRhLiBJZ25vcmluZyBjb21tYW5kLicpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKCdGaWVsZCBgJyArIGZpZWxkICsgJ2AgaXMgbm90IHJlY29nbml6ZWQgaW4gbWV0YSBkYXRhLiBJZ25vcmluZyBjb21tYW5kLicpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9O1xuXG4gICAgdmFyIG5vcm1hbGl6ZVRlcm1zID0gZnVuY3Rpb24odGVybXMpIHtcbiAgICAgICAgdGVybXMuc29ydChmdW5jdGlvbihhLCBiKSB7XG4gICAgICAgICAgICBpZiAoYSA8IGIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gLTE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoYSA+IGIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHRlcm1zO1xuICAgIH07XG5cbiAgICB2YXIgYWRkVGVybXNGaWx0ZXIgPSBmdW5jdGlvbihmaWVsZCwgdGVybXMpIHtcbiAgICAgICAgaWYgKCFmaWVsZCkge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKCdUZXJtc0ZpbHRlciBgZmllbGRgIGlzIG1pc3NpbmcgZnJvbSBhcmd1bWVudC4gSWdub3JpbmcgY29tbWFuZC4nKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGVybXMgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKCdUZXJtc0ZpbHRlciBgdGVybXNgIGFyZSBtaXNzaW5nIGZyb20gYXJndW1lbnQuIElnbm9yaW5nIGNvbW1hbmQuJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdmFyIG1ldGEgPSB0aGlzLl9tZXRhW2ZpZWxkXTtcbiAgICAgICAgaWYgKGNoZWNrRmllbGQobWV0YSwgZmllbGQpKSB7XG4gICAgICAgICAgICB2YXIgZmlsdGVyID0gXy5maW5kKHRoaXMuX3BhcmFtcy50ZXJtc19maWx0ZXIsIGZ1bmN0aW9uKGZpbHRlcikge1xuICAgICAgICAgICAgICAgIHJldHVybiBmaWx0ZXIuZmllbGQgPT09IGZpZWxkO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBpZiAoZmlsdGVyKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKCdUZXJtc0ZpbHRlciB3aXRoIGBmaWVsZGAgb2YgYCcgKyBmaWVsZCArICdgIGFscmVhZHkgZXhpc3RzLCB1c2VkIGB1cGRhdGVSYW5nZWAgaW5zdGVhZC4nKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLl9wYXJhbXMudGVybXNfZmlsdGVyID0gdGhpcy5fcGFyYW1zLnRlcm1zX2ZpbHRlciB8fCBbXTtcbiAgICAgICAgICAgIHRoaXMuX3BhcmFtcy50ZXJtc19maWx0ZXIucHVzaCh7XG4gICAgICAgICAgICAgICAgZmllbGQ6IGZpZWxkLFxuICAgICAgICAgICAgICAgIHRlcm1zOiBub3JtYWxpemVUZXJtcyh0ZXJtcylcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgdGhpcy5jbGVhckV4dHJlbWEoKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9O1xuXG4gICAgdmFyIHVwZGF0ZVRlcm1zRmlsdGVyID0gZnVuY3Rpb24oZmllbGQsIHRlcm1zKSB7XG4gICAgICAgIHZhciBmaWx0ZXIgPSBfLmZpbmQodGhpcy5fcGFyYW1zLnRlcm1zX2ZpbHRlciwgZnVuY3Rpb24oZmlsdGVyKSB7XG4gICAgICAgICAgICByZXR1cm4gZmlsdGVyLmZpZWxkID09PSBmaWVsZDtcbiAgICAgICAgfSk7XG4gICAgICAgIGlmICghZmlsdGVyKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oJ1JhbmdlIHdpdGggYGZpZWxkYCBvZiBgJyArIGZpZWxkICsgJ2AgZG9lcyBub3QgZXhpc3QuIElnbm9yaW5nIGNvbW1hbmQuJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRlcm1zICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGZpbHRlci50ZXJtcyA9IG5vcm1hbGl6ZVRlcm1zKHRlcm1zKTtcbiAgICAgICAgICAgIHRoaXMuY2xlYXJFeHRyZW1hKCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcblxuICAgIHZhciByZW1vdmVUZXJtc0ZpbHRlciA9IGZ1bmN0aW9uKGZpZWxkKSB7XG4gICAgICAgIHZhciBmaWx0ZXIgPSBfLmZpbmQodGhpcy5fcGFyYW1zLnRlcm1zX2ZpbHRlciwgZnVuY3Rpb24oZmlsdGVyKSB7XG4gICAgICAgICAgICByZXR1cm4gZmlsdGVyLmZpZWxkID09PSBmaWVsZDtcbiAgICAgICAgfSk7XG4gICAgICAgIGlmICghZmlsdGVyKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oJ1JhbmdlIHdpdGggYGZpZWxkYCBvZiBgJyArIGZpZWxkICsgJ2AgZG9lcyBub3QgZXhpc3QuIElnbm9yaW5nIGNvbW1hbmQuJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fcGFyYW1zLnRlcm1zX2ZpbHRlciA9IF8uZmlsdGVyKHRoaXMuX3BhcmFtcy50ZXJtc19maWx0ZXIsIGZ1bmN0aW9uKGZpbHRlcikge1xuICAgICAgICAgICAgcmV0dXJuIGZpbHRlci5maWVsZCAhPT0gZmllbGQ7XG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLmNsZWFyRXh0cmVtYSgpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9O1xuXG4gICAgdmFyIGdldFRlcm1zRmlsdGVyID0gZnVuY3Rpb24oZmllbGQpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3BhcmFtcy50ZXJtc19maWx0ZXJbZmllbGRdO1xuICAgIH07XG5cbiAgICBtb2R1bGUuZXhwb3J0cyA9IHtcbiAgICAgICAgYWRkVGVybXNGaWx0ZXI6IGFkZFRlcm1zRmlsdGVyLFxuICAgICAgICB1cGRhdGVUZXJtc0ZpbHRlcjogdXBkYXRlVGVybXNGaWx0ZXIsXG4gICAgICAgIHJlbW92ZVRlcm1zRmlsdGVyOiByZW1vdmVUZXJtc0ZpbHRlcixcbiAgICAgICAgZ2V0VGVybXNGaWx0ZXI6IGdldFRlcm1zRmlsdGVyXG4gICAgfTtcblxufSgpKTtcbiIsIihmdW5jdGlvbigpIHtcblxuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIHZhciBERUZBVUxUX1hfRklFTEQgPSAncGl4ZWwueCc7XG4gICAgdmFyIERFRkFVTFRfWV9GSUVMRCA9ICdwaXhlbC55JztcblxuICAgIHZhciBjaGVja0ZpZWxkID0gZnVuY3Rpb24obWV0YSwgZmllbGQpIHtcbiAgICAgICAgaWYgKG1ldGEpIHtcbiAgICAgICAgICAgIGlmIChtZXRhLmV4dHJlbWEpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKCdGaWVsZCBgJyArIGZpZWxkICsgJ2AgaXMgbm90IG9yZGluYWwgaW4gbWV0YSBkYXRhLiBJZ25vcmluZyBjb21tYW5kLicpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKCdGaWVsZCBgJyArIGZpZWxkICsgJ2AgaXMgbm90IHJlY29nbml6ZWQgaW4gbWV0YSBkYXRhLiBJZ25vcmluZyBjb21tYW5kLicpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9O1xuXG4gICAgdmFyIHNldFhGaWVsZCA9IGZ1bmN0aW9uKGZpZWxkKSB7XG4gICAgICAgIGlmIChmaWVsZCAhPT0gdGhpcy5fcGFyYW1zLmJpbm5pbmcueCkge1xuICAgICAgICAgICAgaWYgKGZpZWxkID09PSBERUZBVUxUX1hfRklFTEQpIHtcbiAgICAgICAgICAgICAgICAvLyByZXNldCBpZiBkZWZhdWx0XG4gICAgICAgICAgICAgICAgdGhpcy5fcGFyYW1zLmJpbm5pbmcueCA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICB0aGlzLl9wYXJhbXMuYmlubmluZy5sZWZ0ID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgIHRoaXMuX3BhcmFtcy5iaW5uaW5nLnJpZ2h0ID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgIHRoaXMuY2xlYXJFeHRyZW1hKCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHZhciBtZXRhID0gdGhpcy5fbWV0YVtmaWVsZF07XG4gICAgICAgICAgICAgICAgaWYgKGNoZWNrRmllbGQobWV0YSwgZmllbGQpKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX3BhcmFtcy5iaW5uaW5nLnggPSBmaWVsZDtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fcGFyYW1zLmJpbm5pbmcubGVmdCA9IG1ldGEuZXh0cmVtYS5taW47XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX3BhcmFtcy5iaW5uaW5nLnJpZ2h0ID0gbWV0YS5leHRyZW1hLm1heDtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jbGVhckV4dHJlbWEoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcblxuICAgIHZhciBnZXRYRmllbGQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3BhcmFtcy5iaW5uaW5nLng7XG4gICAgfTtcblxuICAgIHZhciBzZXRZRmllbGQgPSBmdW5jdGlvbihmaWVsZCkge1xuICAgICAgICBpZiAoZmllbGQgIT09IHRoaXMuX3BhcmFtcy5iaW5uaW5nLnkpIHtcbiAgICAgICAgICAgIGlmIChmaWVsZCA9PT0gREVGQVVMVF9ZX0ZJRUxEKSB7XG4gICAgICAgICAgICAgICAgLy8gcmVzZXQgaWYgZGVmYXVsdFxuICAgICAgICAgICAgICAgIHRoaXMuX3BhcmFtcy5iaW5uaW5nLnkgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgdGhpcy5fcGFyYW1zLmJpbm5pbmcuYm90dG9tID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgIHRoaXMuX3BhcmFtcy5iaW5uaW5nLnRvcCA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICB0aGlzLmNsZWFyRXh0cmVtYSgpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB2YXIgbWV0YSA9IHRoaXMuX21ldGFbZmllbGRdO1xuICAgICAgICAgICAgICAgIGlmIChjaGVja0ZpZWxkKG1ldGEsIGZpZWxkKSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9wYXJhbXMuYmlubmluZy55ID0gZmllbGQ7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX3BhcmFtcy5iaW5uaW5nLmJvdHRvbSA9IG1ldGEuZXh0cmVtYS5taW47XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX3BhcmFtcy5iaW5uaW5nLnRvcCA9IG1ldGEuZXh0cmVtYS5tYXg7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY2xlYXJFeHRyZW1hKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07XG5cbiAgICB2YXIgZ2V0WUZpZWxkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9wYXJhbXMuYmlubmluZy55O1xuICAgIH07XG5cbiAgICBtb2R1bGUuZXhwb3J0cyA9IHtcbiAgICAgICAgc2V0WEZpZWxkOiBzZXRYRmllbGQsXG4gICAgICAgIGdldFhGaWVsZDogZ2V0WEZpZWxkLFxuICAgICAgICBzZXRZRmllbGQ6IHNldFlGaWVsZCxcbiAgICAgICAgZ2V0WUZpZWxkOiBnZXRZRmllbGQsXG4gICAgICAgIERFRkFVTFRfWF9GSUVMRDogREVGQVVMVF9YX0ZJRUxELFxuICAgICAgICBERUZBVUxUX1lfRklFTEQ6IERFRkFVTFRfWV9GSUVMRFxuICAgIH07XG5cbn0oKSk7XG4iLCIoZnVuY3Rpb24oKSB7XG5cbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICB2YXIgY2hlY2tGaWVsZCA9IGZ1bmN0aW9uKG1ldGEsIGZpZWxkKSB7XG4gICAgICAgIGlmIChtZXRhKSB7XG4gICAgICAgICAgICBpZiAobWV0YS50eXBlID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oJ0ZpZWxkIGAnICsgZmllbGQgKyAnYCBpcyBub3Qgb2YgdHlwZSBgc3RyaW5nYCBpbiBtZXRhIGRhdGEuIElnbm9yaW5nIGNvbW1hbmQuJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oJ0ZpZWxkIGAnICsgZmllbGQgKyAnYCBpcyBub3QgcmVjb2duaXplZCBpbiBtZXRhIGRhdGEuIElnbm9yaW5nIGNvbW1hbmQuJyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH07XG5cbiAgICB2YXIgc2V0VG9wVGVybXMgPSBmdW5jdGlvbihmaWVsZCwgc2l6ZSkge1xuICAgICAgICBpZiAoIWZpZWxkKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oJ1RvcFRlcm1zIGBmaWVsZGAgaXMgbWlzc2luZyBmcm9tIGFyZ3VtZW50LiBJZ25vcmluZyBjb21tYW5kLicpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHZhciBtZXRhID0gdGhpcy5fbWV0YVtmaWVsZF07XG4gICAgICAgIGlmIChjaGVja0ZpZWxkKG1ldGEsIGZpZWxkKSkge1xuICAgICAgICAgICAgdGhpcy5fcGFyYW1zLnRvcF90ZXJtcyA9IHtcbiAgICAgICAgICAgICAgICBmaWVsZDogZmllbGQsXG4gICAgICAgICAgICAgICAgc2l6ZTogc2l6ZVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHRoaXMuY2xlYXJFeHRyZW1hKCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcblxuICAgIHZhciBnZXRUb3BUZXJtcyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fcGFyYW1zLnRvcF90ZXJtcztcbiAgICB9O1xuXG4gICAgbW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgICAgIHNldFRvcFRlcm1zOiBzZXRUb3BUZXJtcyxcbiAgICAgICAgZ2V0VG9wVGVybXM6IGdldFRvcFRlcm1zXG4gICAgfTtcblxufSgpKTtcbiIsIihmdW5jdGlvbigpIHtcblxuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIHZhciBMaXZlID0gcmVxdWlyZSgnLi4vY29yZS9MaXZlJyk7XG4gICAgdmFyIEJpbm5pbmcgPSByZXF1aXJlKCcuLi9wYXJhbXMvQmlubmluZycpO1xuICAgIHZhciBNZXRyaWNBZ2cgPSByZXF1aXJlKCcuLi9wYXJhbXMvTWV0cmljQWdnJyk7XG4gICAgdmFyIFRlcm1zRmlsdGVyID0gcmVxdWlyZSgnLi4vcGFyYW1zL1Rlcm1zRmlsdGVyJyk7XG4gICAgdmFyIEJvb2xRdWVyeSA9IHJlcXVpcmUoJy4uL3BhcmFtcy9Cb29sUXVlcnknKTtcbiAgICB2YXIgUHJlZml4RmlsdGVyID0gcmVxdWlyZSgnLi4vcGFyYW1zL1ByZWZpeEZpbHRlcicpO1xuICAgIHZhciBSYW5nZSA9IHJlcXVpcmUoJy4uL3BhcmFtcy9SYW5nZScpO1xuICAgIHZhciBRdWVyeVN0cmluZyA9IHJlcXVpcmUoJy4uL3BhcmFtcy9RdWVyeVN0cmluZycpO1xuICAgIHZhciBDb2xvclJhbXAgPSByZXF1aXJlKCcuLi9taXhpbnMvQ29sb3JSYW1wJyk7XG4gICAgdmFyIFZhbHVlVHJhbnNmb3JtID0gcmVxdWlyZSgnLi4vbWl4aW5zL1ZhbHVlVHJhbnNmb3JtJyk7XG5cbiAgICB2YXIgSGVhdG1hcCA9IExpdmUuZXh0ZW5kKHtcblxuICAgICAgICBpbmNsdWRlczogW1xuICAgICAgICAgICAgLy8gcGFyYW1zXG4gICAgICAgICAgICBCaW5uaW5nLFxuICAgICAgICAgICAgTWV0cmljQWdnLFxuICAgICAgICAgICAgVGVybXNGaWx0ZXIsXG4gICAgICAgICAgICBCb29sUXVlcnksXG4gICAgICAgICAgICBQcmVmaXhGaWx0ZXIsXG4gICAgICAgICAgICBSYW5nZSxcbiAgICAgICAgICAgIFF1ZXJ5U3RyaW5nLFxuICAgICAgICAgICAgLy8gbWl4aW5zXG4gICAgICAgICAgICBDb2xvclJhbXAsXG4gICAgICAgICAgICBWYWx1ZVRyYW5zZm9ybVxuICAgICAgICBdLFxuXG4gICAgICAgIHR5cGU6ICdoZWF0bWFwJyxcblxuICAgICAgICBpbml0aWFsaXplOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIENvbG9yUmFtcC5pbml0aWFsaXplLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgICAgICBWYWx1ZVRyYW5zZm9ybS5pbml0aWFsaXplLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgICAgICAvLyBiYXNlXG4gICAgICAgICAgICBMaXZlLnByb3RvdHlwZS5pbml0aWFsaXplLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZXh0cmFjdEV4dHJlbWE6IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgICAgIHZhciBiaW5zID0gbmV3IEZsb2F0NjRBcnJheShkYXRhKTtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgbWluOiBfLm1pbihiaW5zKSxcbiAgICAgICAgICAgICAgICBtYXg6IF8ubWF4KGJpbnMpXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICB9KTtcblxuICAgIG1vZHVsZS5leHBvcnRzID0gSGVhdG1hcDtcblxufSgpKTtcbiIsIihmdW5jdGlvbigpIHtcblxuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIHZhciBMaXZlID0gcmVxdWlyZSgnLi4vY29yZS9MaXZlJyk7XG4gICAgdmFyIFRpbGluZyA9IHJlcXVpcmUoJy4uL3BhcmFtcy9UaWxpbmcnKTtcbiAgICB2YXIgVGVybXNGaWx0ZXIgPSByZXF1aXJlKCcuLi9wYXJhbXMvVGVybXNGaWx0ZXInKTtcbiAgICB2YXIgUHJlZml4RmlsdGVyID0gcmVxdWlyZSgnLi4vcGFyYW1zL1ByZWZpeEZpbHRlcicpO1xuICAgIHZhciBUb3BUZXJtcyA9IHJlcXVpcmUoJy4uL3BhcmFtcy9Ub3BUZXJtcycpO1xuICAgIHZhciBSYW5nZSA9IHJlcXVpcmUoJy4uL3BhcmFtcy9SYW5nZScpO1xuICAgIHZhciBIaXN0b2dyYW0gPSByZXF1aXJlKCcuLi9wYXJhbXMvSGlzdG9ncmFtJyk7XG4gICAgdmFyIFZhbHVlVHJhbnNmb3JtID0gcmVxdWlyZSgnLi4vbWl4aW5zL1ZhbHVlVHJhbnNmb3JtJyk7XG5cbiAgICB2YXIgVG9wQ291bnQgPSBMaXZlLmV4dGVuZCh7XG5cbiAgICAgICAgaW5jbHVkZXM6IFtcbiAgICAgICAgICAgIC8vIHBhcmFtc1xuICAgICAgICAgICAgVGlsaW5nLFxuICAgICAgICAgICAgVG9wVGVybXMsXG4gICAgICAgICAgICBUZXJtc0ZpbHRlcixcbiAgICAgICAgICAgIFByZWZpeEZpbHRlcixcbiAgICAgICAgICAgIFJhbmdlLFxuICAgICAgICAgICAgSGlzdG9ncmFtLFxuICAgICAgICAgICAgLy8gbWl4aW5zXG4gICAgICAgICAgICBWYWx1ZVRyYW5zZm9ybVxuICAgICAgICBdLFxuXG4gICAgICAgIHR5cGU6ICd0b3BfY291bnQnLFxuXG4gICAgICAgIGluaXRpYWxpemU6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgVmFsdWVUcmFuc2Zvcm0uaW5pdGlhbGl6ZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgLy8gYmFzZVxuICAgICAgICAgICAgTGl2ZS5wcm90b3R5cGUuaW5pdGlhbGl6ZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgICB9LFxuXG4gICAgfSk7XG5cbiAgICBtb2R1bGUuZXhwb3J0cyA9IFRvcENvdW50O1xuXG59KCkpO1xuIiwiKGZ1bmN0aW9uKCkge1xuXG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgdmFyIExpdmUgPSByZXF1aXJlKCcuLi9jb3JlL0xpdmUnKTtcbiAgICB2YXIgVGlsaW5nID0gcmVxdWlyZSgnLi4vcGFyYW1zL1RpbGluZycpO1xuICAgIHZhciBUb3BUZXJtcyA9IHJlcXVpcmUoJy4uL3BhcmFtcy9Ub3BUZXJtcycpO1xuICAgIHZhciBUZXJtc0ZpbHRlciA9IHJlcXVpcmUoJy4uL3BhcmFtcy9UZXJtc0ZpbHRlcicpO1xuICAgIHZhciBQcmVmaXhGaWx0ZXIgPSByZXF1aXJlKCcuLi9wYXJhbXMvUHJlZml4RmlsdGVyJyk7XG4gICAgdmFyIFJhbmdlID0gcmVxdWlyZSgnLi4vcGFyYW1zL1JhbmdlJyk7XG4gICAgdmFyIERhdGVIaXN0b2dyYW0gPSByZXF1aXJlKCcuLi9wYXJhbXMvRGF0ZUhpc3RvZ3JhbScpO1xuICAgIHZhciBIaXN0b2dyYW0gPSByZXF1aXJlKCcuLi9wYXJhbXMvSGlzdG9ncmFtJyk7XG4gICAgdmFyIFZhbHVlVHJhbnNmb3JtID0gcmVxdWlyZSgnLi4vbWl4aW5zL1ZhbHVlVHJhbnNmb3JtJyk7XG5cbiAgICB2YXIgVG9wRnJlcXVlbmN5ID0gTGl2ZS5leHRlbmQoe1xuXG4gICAgICAgIGluY2x1ZGVzOiBbXG4gICAgICAgICAgICAvLyBwYXJhbXNcbiAgICAgICAgICAgIFRpbGluZyxcbiAgICAgICAgICAgIFRvcFRlcm1zLFxuICAgICAgICAgICAgVGVybXNGaWx0ZXIsXG4gICAgICAgICAgICBQcmVmaXhGaWx0ZXIsXG4gICAgICAgICAgICBSYW5nZSxcbiAgICAgICAgICAgIERhdGVIaXN0b2dyYW0sXG4gICAgICAgICAgICBIaXN0b2dyYW0sXG4gICAgICAgICAgICAvLyBtaXhpbnNcbiAgICAgICAgICAgIFZhbHVlVHJhbnNmb3JtXG4gICAgICAgIF0sXG5cbiAgICAgICAgdHlwZTogJ3RvcF9mcmVxdWVuY3knLFxuXG4gICAgICAgIGluaXRpYWxpemU6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgVmFsdWVUcmFuc2Zvcm0uaW5pdGlhbGl6ZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgLy8gYmFzZVxuICAgICAgICAgICAgTGl2ZS5wcm90b3R5cGUuaW5pdGlhbGl6ZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgICB9LFxuXG4gICAgfSk7XG5cbiAgICBtb2R1bGUuZXhwb3J0cyA9IFRvcEZyZXF1ZW5jeTtcblxufSgpKTtcbiIsIihmdW5jdGlvbigpIHtcblxuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIHZhciBMaXZlID0gcmVxdWlyZSgnLi4vY29yZS9MaXZlJyk7XG4gICAgdmFyIFRpbGluZyA9IHJlcXVpcmUoJy4uL3BhcmFtcy9UaWxpbmcnKTtcbiAgICB2YXIgVGVybXNBZ2cgPSByZXF1aXJlKCcuLi9wYXJhbXMvVGVybXNBZ2cnKTtcbiAgICB2YXIgUmFuZ2UgPSByZXF1aXJlKCcuLi9wYXJhbXMvUmFuZ2UnKTtcbiAgICB2YXIgSGlzdG9ncmFtID0gcmVxdWlyZSgnLi4vcGFyYW1zL0hpc3RvZ3JhbScpO1xuICAgIHZhciBWYWx1ZVRyYW5zZm9ybSA9IHJlcXVpcmUoJy4uL21peGlucy9WYWx1ZVRyYW5zZm9ybScpO1xuXG4gICAgdmFyIFRvcGljQ291bnQgPSBMaXZlLmV4dGVuZCh7XG5cbiAgICAgICAgaW5jbHVkZXM6IFtcbiAgICAgICAgICAgIC8vIHBhcmFtc1xuICAgICAgICAgICAgVGlsaW5nLFxuICAgICAgICAgICAgVGVybXNBZ2csXG4gICAgICAgICAgICBSYW5nZSxcbiAgICAgICAgICAgIEhpc3RvZ3JhbSxcbiAgICAgICAgICAgIC8vIG1peGluc1xuICAgICAgICAgICAgVmFsdWVUcmFuc2Zvcm1cbiAgICAgICAgXSxcblxuICAgICAgICB0eXBlOiAndG9waWNfY291bnQnLFxuXG4gICAgICAgIGluaXRpYWxpemU6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgVmFsdWVUcmFuc2Zvcm0uaW5pdGlhbGl6ZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgLy8gYmFzZVxuICAgICAgICAgICAgTGl2ZS5wcm90b3R5cGUuaW5pdGlhbGl6ZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgICB9LFxuXG4gICAgfSk7XG5cbiAgICBtb2R1bGUuZXhwb3J0cyA9IFRvcGljQ291bnQ7XG5cbn0oKSk7XG4iLCIoZnVuY3Rpb24oKSB7XG5cbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICB2YXIgTGl2ZSA9IHJlcXVpcmUoJy4uL2NvcmUvTGl2ZScpO1xuICAgIHZhciBUaWxpbmcgPSByZXF1aXJlKCcuLi9wYXJhbXMvVGlsaW5nJyk7XG4gICAgdmFyIFRlcm1zQWdnID0gcmVxdWlyZSgnLi4vcGFyYW1zL1Rlcm1zQWdnJyk7XG4gICAgdmFyIFJhbmdlID0gcmVxdWlyZSgnLi4vcGFyYW1zL1JhbmdlJyk7XG4gICAgdmFyIERhdGVIaXN0b2dyYW0gPSByZXF1aXJlKCcuLi9wYXJhbXMvRGF0ZUhpc3RvZ3JhbScpO1xuICAgIHZhciBIaXN0b2dyYW0gPSByZXF1aXJlKCcuLi9wYXJhbXMvSGlzdG9ncmFtJyk7XG4gICAgdmFyIFZhbHVlVHJhbnNmb3JtID0gcmVxdWlyZSgnLi4vbWl4aW5zL1ZhbHVlVHJhbnNmb3JtJyk7XG5cbiAgICB2YXIgVG9waWNGcmVxdWVuY3kgPSBMaXZlLmV4dGVuZCh7XG5cbiAgICAgICAgaW5jbHVkZXM6IFtcbiAgICAgICAgICAgIC8vIHBhcmFtc1xuICAgICAgICAgICAgVGlsaW5nLFxuICAgICAgICAgICAgVGVybXNBZ2csXG4gICAgICAgICAgICBSYW5nZSxcbiAgICAgICAgICAgIERhdGVIaXN0b2dyYW0sXG4gICAgICAgICAgICBIaXN0b2dyYW0sXG4gICAgICAgICAgICAvLyBtaXhpbnNcbiAgICAgICAgICAgIFZhbHVlVHJhbnNmb3JtXG4gICAgICAgIF0sXG5cbiAgICAgICAgdHlwZTogJ3RvcGljX2ZyZXF1ZW5jeScsXG5cbiAgICAgICAgaW5pdGlhbGl6ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBWYWx1ZVRyYW5zZm9ybS5pbml0aWFsaXplLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgICAgICAvLyBiYXNlXG4gICAgICAgICAgICBMaXZlLnByb3RvdHlwZS5pbml0aWFsaXplLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgIH0sXG5cbiAgICB9KTtcblxuICAgIG1vZHVsZS5leHBvcnRzID0gVG9waWNGcmVxdWVuY3k7XG5cbn0oKSk7XG4iLCIoZnVuY3Rpb24oKSB7XG5cbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICB2YXIgRE9NID0gcmVxdWlyZSgnLi9ET00nKTtcblxuICAgIHZhciBDYW52YXMgPSBET00uZXh0ZW5kKHtcblxuICAgICAgICBfY3JlYXRlVGlsZTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgdGlsZSA9IEwuRG9tVXRpbC5jcmVhdGUoJ2NhbnZhcycsICdsZWFmbGV0LXRpbGUnKTtcbiAgICAgICAgICAgIHRpbGUud2lkdGggPSB0aWxlLmhlaWdodCA9IHRoaXMub3B0aW9ucy50aWxlU2l6ZTtcbiAgICAgICAgICAgIHRpbGUub25zZWxlY3RzdGFydCA9IHRpbGUub25tb3VzZW1vdmUgPSBMLlV0aWwuZmFsc2VGbjtcbiAgICAgICAgICAgIHJldHVybiB0aWxlO1xuICAgICAgICB9XG5cbiAgICB9KTtcblxuICAgIG1vZHVsZS5leHBvcnRzID0gQ2FudmFzO1xuXG59KCkpO1xuIiwiKGZ1bmN0aW9uKCkge1xuXG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgdmFyIEltYWdlID0gcmVxdWlyZSgnLi4vLi4vbGF5ZXIvY29yZS9JbWFnZScpO1xuXG4gICAgdmFyIERPTSA9IEltYWdlLmV4dGVuZCh7XG5cbiAgICAgICAgb25BZGQ6IGZ1bmN0aW9uKG1hcCkge1xuICAgICAgICAgICAgTC5UaWxlTGF5ZXIucHJvdG90eXBlLm9uQWRkLmNhbGwodGhpcywgbWFwKTtcbiAgICAgICAgICAgIG1hcC5vbignem9vbXN0YXJ0JywgdGhpcy5jbGVhckV4dHJlbWEsIHRoaXMpO1xuICAgICAgICB9LFxuXG4gICAgICAgIG9uUmVtb3ZlOiBmdW5jdGlvbihtYXApIHtcbiAgICAgICAgICAgIG1hcC5vZmYoJ3pvb21zdGFydCcsIHRoaXMuY2xlYXJFeHRyZW1hLCB0aGlzKTtcbiAgICAgICAgICAgIEwuVGlsZUxheWVyLnByb3RvdHlwZS5vblJlbW92ZS5jYWxsKHRoaXMsIG1hcCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgcmVkcmF3OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLl9tYXApIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9yZXNldCh7XG4gICAgICAgICAgICAgICAgICAgIGhhcmQ6IHRydWVcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB0aGlzLl91cGRhdGUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9LFxuXG4gICAgICAgIF9jcmVhdGVUaWxlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIC8vIG92ZXJyaWRlXG4gICAgICAgIH0sXG5cbiAgICAgICAgX2xvYWRUaWxlOiBmdW5jdGlvbih0aWxlLCB0aWxlUG9pbnQpIHtcbiAgICAgICAgICAgIHRpbGUuX2xheWVyID0gdGhpcztcbiAgICAgICAgICAgIHRpbGUuX3RpbGVQb2ludCA9IHRpbGVQb2ludDtcbiAgICAgICAgICAgIHRpbGUuX3VuYWRqdXN0ZWRUaWxlUG9pbnQgPSB7XG4gICAgICAgICAgICAgICAgeDogdGlsZVBvaW50LngsXG4gICAgICAgICAgICAgICAgeTogdGlsZVBvaW50LnlcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICB0aWxlLmRhdGFzZXQueCA9IHRpbGVQb2ludC54O1xuICAgICAgICAgICAgdGlsZS5kYXRhc2V0LnkgPSB0aWxlUG9pbnQueTtcbiAgICAgICAgICAgIHRoaXMuX2FkanVzdFRpbGVQb2ludCh0aWxlUG9pbnQpO1xuICAgICAgICAgICAgdGhpcy5fcmVkcmF3VGlsZSh0aWxlKTtcbiAgICAgICAgfSxcblxuICAgICAgICBfYWRqdXN0VGlsZUtleTogZnVuY3Rpb24oa2V5KSB7XG4gICAgICAgICAgICAvLyB3aGVuIGRlYWxpbmcgd2l0aCB3cmFwcGVkIHRpbGVzLCBpbnRlcm5hbGx5IGxlYWZldCB3aWxsIHVzZVxuICAgICAgICAgICAgLy8gY29vcmRpbmF0ZXMgbiA8IDAgYW5kIG4gPiAoMl56KSB0byBwb3NpdGlvbiB0aGVtIGNvcnJlY3RseS5cbiAgICAgICAgICAgIC8vIHRoaXMgZnVuY3Rpb24gY29udmVydHMgdGhhdCB0byB0aGUgbW9kdWxvcyBrZXkgdXNlZCB0byBjYWNoZSB0aGVtXG4gICAgICAgICAgICAvLyBkYXRhLlxuICAgICAgICAgICAgLy8gRXguICctMTozJyBhdCB6ID0gMiBiZWNvbWVzICczOjMnXG4gICAgICAgICAgICB2YXIga0FyciA9IGtleS5zcGxpdCgnOicpO1xuICAgICAgICAgICAgdmFyIHggPSBwYXJzZUludChrQXJyWzBdLCAxMCk7XG4gICAgICAgICAgICB2YXIgeSA9IHBhcnNlSW50KGtBcnJbMV0sIDEwKTtcbiAgICAgICAgICAgIHZhciB0aWxlUG9pbnQgPSB7XG4gICAgICAgICAgICAgICAgeDogeCxcbiAgICAgICAgICAgICAgICB5OiB5XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgdGhpcy5fYWRqdXN0VGlsZVBvaW50KHRpbGVQb2ludCk7XG4gICAgICAgICAgICByZXR1cm4gdGlsZVBvaW50LnggKyAnOicgKyB0aWxlUG9pbnQueSArICc6JyArIHRpbGVQb2ludC56O1xuICAgICAgICB9LFxuXG4gICAgICAgIF9yZW1vdmVUaWxlOiBmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgICAgIHZhciBhZGp1c3RlZEtleSA9IHRoaXMuX2FkanVzdFRpbGVLZXkoa2V5KTtcbiAgICAgICAgICAgIHZhciBjYWNoZWQgPSB0aGlzLl9jYWNoZVthZGp1c3RlZEtleV07XG4gICAgICAgICAgICAvLyByZW1vdmUgdGhlIHRpbGUgZnJvbSB0aGUgY2FjaGVcbiAgICAgICAgICAgIGRlbGV0ZSBjYWNoZWQudGlsZXNba2V5XTtcbiAgICAgICAgICAgIGlmIChfLmtleXMoY2FjaGVkLnRpbGVzKS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICAvLyBubyBtb3JlIHRpbGVzIHVzZSB0aGlzIGNhY2hlZCBkYXRhLCBzbyBkZWxldGUgaXRcbiAgICAgICAgICAgICAgICBkZWxldGUgdGhpcy5fY2FjaGVbYWRqdXN0ZWRLZXldO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gY2FsbCBwYXJlbnQgbWV0aG9kXG4gICAgICAgICAgICBMLlRpbGVMYXllci5wcm90b3R5cGUuX3JlbW92ZVRpbGUuY2FsbCh0aGlzLCBrZXkpO1xuICAgICAgICB9LFxuXG4gICAgICAgIF9yZWRyYXdUaWxlOiBmdW5jdGlvbih0aWxlKSB7XG4gICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgICB2YXIgY2FjaGUgPSB0aGlzLl9jYWNoZTtcbiAgICAgICAgICAgIHZhciBjb29yZCA9IHtcbiAgICAgICAgICAgICAgICB4OiB0aWxlLl90aWxlUG9pbnQueCxcbiAgICAgICAgICAgICAgICB5OiB0aWxlLl90aWxlUG9pbnQueSxcbiAgICAgICAgICAgICAgICB6OiB0aGlzLl9tYXAuX3pvb21cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICAvLyB1c2UgdGhlIGFkanVzdGVkIGNvb3JkaW5hdGVzIHRvIGhhc2ggdGhlIHRoZSBjYWNoZSB2YWx1ZXMsIHRoaXNcbiAgICAgICAgICAgIC8vIGlzIGJlY2F1c2Ugd2Ugd2FudCB0byBvbmx5IGhhdmUgb25lIGNvcHkgb2YgdGhlIGRhdGFcbiAgICAgICAgICAgIHZhciBoYXNoID0gY29vcmQueCArICc6JyArIGNvb3JkLnkgKyAnOicgKyBjb29yZC56O1xuICAgICAgICAgICAgLy8gdXNlIHRoZSB1bmFkanN1dGVkIGNvb3JkaW5hdGVzIHRvIHRyYWNrIHdoaWNoICd3cmFwcGVkJyB0aWxlc1xuICAgICAgICAgICAgLy8gdXNlZCB0aGUgY2FjaGVkIGRhdGFcbiAgICAgICAgICAgIHZhciB1bmFkanVzdGVkSGFzaCA9IHRpbGUuX3VuYWRqdXN0ZWRUaWxlUG9pbnQueCArICc6JyArIHRpbGUuX3VuYWRqdXN0ZWRUaWxlUG9pbnQueTtcbiAgICAgICAgICAgIC8vIGNoZWNrIGNhY2hlXG4gICAgICAgICAgICB2YXIgY2FjaGVkID0gY2FjaGVbaGFzaF07XG4gICAgICAgICAgICBpZiAoY2FjaGVkKSB7XG4gICAgICAgICAgICAgICAgaWYgKGNhY2hlZC5pc1BlbmRpbmcpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gY3VycmVudGx5IHBlbmRpbmdcbiAgICAgICAgICAgICAgICAgICAgLy8gc3RvcmUgdGhlIHRpbGUgaW4gdGhlIGNhY2hlIHRvIGRyYXcgdG8gbGF0ZXJcbiAgICAgICAgICAgICAgICAgICAgY2FjaGVkLnRpbGVzW3VuYWRqdXN0ZWRIYXNoXSA9IHRpbGU7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gYWxyZWFkeSByZXF1ZXN0ZWRcbiAgICAgICAgICAgICAgICAgICAgLy8gc3RvcmUgdGhlIHRpbGUgaW4gdGhlIGNhY2hlXG4gICAgICAgICAgICAgICAgICAgIGNhY2hlZC50aWxlc1t1bmFkanVzdGVkSGFzaF0gPSB0aWxlO1xuICAgICAgICAgICAgICAgICAgICAvLyBkcmF3IHRoZSB0aWxlXG4gICAgICAgICAgICAgICAgICAgIHNlbGYucmVuZGVyVGlsZSh0aWxlLCBjYWNoZWQuZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgIHNlbGYudGlsZURyYXduKHRpbGUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gY3JlYXRlIGEgY2FjaGUgZW50cnlcbiAgICAgICAgICAgICAgICBjYWNoZVtoYXNoXSA9IHtcbiAgICAgICAgICAgICAgICAgICAgaXNQZW5kaW5nOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICB0aWxlczoge30sXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6IG51bGxcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIC8vIGFkZCB0aWxlIHRvIHRoZSBjYWNoZSBlbnRyeVxuICAgICAgICAgICAgICAgIGNhY2hlW2hhc2hdLnRpbGVzW3VuYWRqdXN0ZWRIYXNoXSA9IHRpbGU7XG4gICAgICAgICAgICAgICAgLy8gcmVxdWVzdCB0aGUgdGlsZVxuICAgICAgICAgICAgICAgIHRoaXMucmVxdWVzdFRpbGUoY29vcmQsIGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGNhY2hlZCA9IGNhY2hlW2hhc2hdO1xuICAgICAgICAgICAgICAgICAgICBpZiAoIWNhY2hlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gdGlsZSBpcyBubyBsb25nZXIgYmVpbmcgdHJhY2tlZCwgaWdub3JlXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgY2FjaGVkLmlzUGVuZGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICBjYWNoZWQuZGF0YSA9IGRhdGE7XG4gICAgICAgICAgICAgICAgICAgIC8vIHVwZGF0ZSB0aGUgZXh0cmVtYVxuICAgICAgICAgICAgICAgICAgICBpZiAoZGF0YSAmJiBzZWxmLnVwZGF0ZUV4dHJlbWEoZGF0YSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGV4dHJlbWEgY2hhbmdlZCwgcmVkcmF3IGFsbCB0aWxlc1xuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5yZWRyYXcoKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHNhbWUgZXh0cmVtYSwgd2UgYXJlIGdvb2QgdG8gcmVuZGVyIHRoZSB0aWxlcy4gSW5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHRoZSBjYXNlIG9mIGEgbWFwIHdpdGggd3JhcGFyb3VuZCwgd2UgbWF5IGhhdmVcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIG11bHRpcGxlIHRpbGVzIGRlcGVuZGVudCBvbiB0aGUgcmVzcG9uc2UsIHNvIGl0ZXJhdGVcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIG92ZXIgZWFjaCB0aWxlIGFuZCBkcmF3IGl0LlxuICAgICAgICAgICAgICAgICAgICAgICAgXy5mb3JJbihjYWNoZWQudGlsZXMsIGZ1bmN0aW9uKHRpbGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxmLnJlbmRlclRpbGUodGlsZSwgZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi50aWxlRHJhd24odGlsZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIHRpbGVEcmF3bjogZnVuY3Rpb24odGlsZSkge1xuICAgICAgICAgICAgdGhpcy5fdGlsZU9uTG9hZC5jYWxsKHRpbGUpO1xuICAgICAgICB9LFxuXG4gICAgICAgIHJlcXVlc3RUaWxlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIC8vIG92ZXJyaWRlXG4gICAgICAgIH0sXG5cbiAgICAgICAgcmVuZGVyVGlsZTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAvLyBvdmVycmlkZVxuICAgICAgICB9LFxuXG4gICAgfSk7XG5cbiAgICBtb2R1bGUuZXhwb3J0cyA9IERPTTtcblxufSgpKTtcbiIsIihmdW5jdGlvbigpIHtcblxuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIHZhciBET00gPSByZXF1aXJlKCcuL0RPTScpO1xuXG4gICAgdmFyIEhUTUwgPSBET00uZXh0ZW5kKHtcblxuICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgICBoYW5kbGVyczoge31cbiAgICAgICAgfSxcblxuICAgICAgICBvbkFkZDogZnVuY3Rpb24obWFwKSB7XG4gICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgICBET00ucHJvdG90eXBlLm9uQWRkLmNhbGwodGhpcywgbWFwKTtcbiAgICAgICAgICAgIG1hcC5vbignY2xpY2snLCB0aGlzLm9uQ2xpY2ssIHRoaXMpO1xuICAgICAgICAgICAgJCh0aGlzLl9jb250YWluZXIpLm9uKCdtb3VzZW92ZXInLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICAgICAgc2VsZi5vbk1vdXNlT3ZlcihlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgJCh0aGlzLl9jb250YWluZXIpLm9uKCdtb3VzZW91dCcsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgICAgICBzZWxmLm9uTW91c2VPdXQoZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcblxuICAgICAgICBvblJlbW92ZTogZnVuY3Rpb24obWFwKSB7XG4gICAgICAgICAgICBtYXAub2ZmKCdjbGljaycsIHRoaXMub25DbGljaywgdGhpcyk7XG4gICAgICAgICAgICAkKHRoaXMuX2NvbnRhaW5lcikub2ZmKCdtb3VzZW92ZXInKTtcbiAgICAgICAgICAgICQodGhpcy5fY29udGFpbmVyKS5vZmYoJ21vdXNlb3V0Jyk7XG4gICAgICAgICAgICBET00ucHJvdG90eXBlLm9uUmVtb3ZlLmNhbGwodGhpcywgbWFwKTtcbiAgICAgICAgfSxcblxuICAgICAgICBfY3JlYXRlVGlsZTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgdGlsZSA9IEwuRG9tVXRpbC5jcmVhdGUoJ2RpdicsICdsZWFmbGV0LXRpbGUgbGVhZmxldC1odG1sLXRpbGUnKTtcbiAgICAgICAgICAgIHRpbGUud2lkdGggPSB0aGlzLm9wdGlvbnMudGlsZVNpemU7XG4gICAgICAgICAgICB0aWxlLmhlaWdodCA9IHRoaXMub3B0aW9ucy50aWxlU2l6ZTtcbiAgICAgICAgICAgIHRpbGUub25zZWxlY3RzdGFydCA9IEwuVXRpbC5mYWxzZUZuO1xuICAgICAgICAgICAgdGlsZS5vbm1vdXNlbW92ZSA9IEwuVXRpbC5mYWxzZUZuO1xuICAgICAgICAgICAgcmV0dXJuIHRpbGU7XG4gICAgICAgIH0sXG5cbiAgICAgICAgb25Nb3VzZU92ZXI6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgLy8gb3ZlcnJpZGVcbiAgICAgICAgfSxcblxuICAgICAgICBvbk1vdXNlT3V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIC8vIG92ZXJyaWRlXG4gICAgICAgIH0sXG5cblxuICAgICAgICBvbkNsaWNrOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIC8vIG92ZXJyaWRlXG4gICAgICAgIH1cblxuICAgIH0pO1xuXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBIVE1MO1xuXG59KCkpO1xuIiwiKGZ1bmN0aW9uKCkge1xuXG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgdmFyIGVzcGVyID0gcmVxdWlyZSgnZXNwZXInKTtcblxuICAgIGZ1bmN0aW9uIHRyYW5zbGF0aW9uTWF0cml4KHRyYW5zbGF0aW9uKSB7XG4gICAgICAgIHJldHVybiBuZXcgRmxvYXQzMkFycmF5KFtcbiAgICAgICAgICAgIDEsIDAsIDAsIDAsXG4gICAgICAgICAgICAwLCAxLCAwLCAwLFxuICAgICAgICAgICAgMCwgMCwgMSwgMCxcbiAgICAgICAgICAgIHRyYW5zbGF0aW9uWzBdLCB0cmFuc2xhdGlvblsxXSwgdHJhbnNsYXRpb25bMl0sIDFcbiAgICAgICAgXSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gb3J0aG9NYXRyaXgobGVmdCwgcmlnaHQsIGJvdHRvbSwgdG9wLCBuZWFyLCBmYXIpIHtcbiAgICAgICAgdmFyIG1hdCA9IG5ldyBGbG9hdDMyQXJyYXkoMTYpO1xuICAgICAgICBtYXRbMF0gPSAyIC8gKCByaWdodCAtIGxlZnQgKTtcbiAgICAgICAgbWF0WzFdID0gMDtcbiAgICAgICAgbWF0WzJdID0gMDtcbiAgICAgICAgbWF0WzNdID0gMDtcbiAgICAgICAgbWF0WzRdID0gMDtcbiAgICAgICAgbWF0WzVdID0gMiAvICggdG9wIC0gYm90dG9tICk7XG4gICAgICAgIG1hdFs2XSA9IDA7XG4gICAgICAgIG1hdFs3XSA9IDA7XG4gICAgICAgIG1hdFs4XSA9IDA7XG4gICAgICAgIG1hdFs5XSA9IDA7XG4gICAgICAgIG1hdFsxMF0gPSAtMiAvICggZmFyIC0gbmVhciApO1xuICAgICAgICBtYXRbMTFdID0gMDtcbiAgICAgICAgbWF0WzEyXSA9IC0oICggcmlnaHQgKyBsZWZ0ICkgLyAoIHJpZ2h0IC0gbGVmdCApICk7XG4gICAgICAgIG1hdFsxM10gPSAtKCAoIHRvcCArIGJvdHRvbSApIC8gKCB0b3AgLSBib3R0b20gKSApO1xuICAgICAgICBtYXRbMTRdID0gLSggKCBmYXIgKyBuZWFyICkgLyAoIGZhciAtIG5lYXIgKSApO1xuICAgICAgICBtYXRbMTVdID0gMTtcbiAgICAgICAgcmV0dXJuIG1hdDtcbiAgICB9XG5cbiAgICAvLyBUT0RPOlxuICAgIC8vICAgICAtIGZpeCB6b29tIHRyYW5zaXRpb24gYW5pbWF0aW9uIGJ1Z1xuICAgIC8vICAgICAtIGZpeCBzaG93IC8gaGlkZSBidWdcblxuICAgIHZhciBXZWJHTCA9IEwuQ2xhc3MuZXh0ZW5kKHtcblxuICAgICAgICBpbmNsdWRlczogW1xuICAgICAgICAgICAgTC5NaXhpbi5FdmVudHNcbiAgICAgICAgXSxcblxuICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgICBtaW5ab29tOiAwLFxuICAgICAgICAgICAgbWF4Wm9vbTogMTgsXG4gICAgICAgICAgICB6b29tT2Zmc2V0OiAwLFxuICAgICAgICAgICAgb3BhY2l0eTogMSxcbiAgICAgICAgICAgIHNoYWRlcnM6IHtcbiAgICAgICAgICAgICAgICB2ZXJ0OiBudWxsLFxuICAgICAgICAgICAgICAgIGZyYWc6IG51bGxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB1bmxvYWRJbnZpc2libGVUaWxlczogTC5Ccm93c2VyLm1vYmlsZSxcbiAgICAgICAgICAgIHVwZGF0ZVdoZW5JZGxlOiBMLkJyb3dzZXIubW9iaWxlXG4gICAgICAgIH0sXG5cbiAgICAgICAgaW5pdGlhbGl6ZTogZnVuY3Rpb24obWV0YSwgb3B0aW9ucykge1xuICAgICAgICAgICAgb3B0aW9ucyA9IEwuc2V0T3B0aW9ucyh0aGlzLCBvcHRpb25zKTtcbiAgICAgICAgICAgIGlmIChvcHRpb25zLmJvdW5kcykge1xuICAgICAgICAgICAgICAgIG9wdGlvbnMuYm91bmRzID0gTC5sYXRMbmdCb3VuZHMob3B0aW9ucy5ib3VuZHMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIGdldE9wYWNpdHk6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMub3B0aW9ucy5vcGFjaXR5O1xuICAgICAgICB9LFxuXG4gICAgICAgIHNob3c6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdGhpcy5faGlkZGVuID0gZmFsc2U7XG4gICAgICAgICAgICB0aGlzLl9wcmV2TWFwLmFkZExheWVyKHRoaXMpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGhpZGU6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdGhpcy5faGlkZGVuID0gdHJ1ZTtcbiAgICAgICAgICAgIHRoaXMuX3ByZXZNYXAgPSB0aGlzLl9tYXA7XG4gICAgICAgICAgICB0aGlzLl9tYXAucmVtb3ZlTGF5ZXIodGhpcyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgaXNIaWRkZW46IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2hpZGRlbjtcbiAgICAgICAgfSxcblxuICAgICAgICBvbkFkZDogZnVuY3Rpb24obWFwKSB7XG4gICAgICAgICAgICB0aGlzLl9tYXAgPSBtYXA7XG4gICAgICAgICAgICB0aGlzLl9hbmltYXRlZCA9IG1hcC5fem9vbUFuaW1hdGVkO1xuICAgICAgICAgICAgaWYgKCF0aGlzLl9jYW52YXMpIHtcbiAgICAgICAgICAgICAgICAvLyBjcmVhdGUgY2FudmFzXG4gICAgICAgICAgICAgICAgdGhpcy5faW5pdENhbnZhcygpO1xuICAgICAgICAgICAgICAgIG1hcC5fcGFuZXMudGlsZVBhbmUuYXBwZW5kQ2hpbGQodGhpcy5fY2FudmFzKTtcbiAgICAgICAgICAgICAgICAvLyBpbml0aWFsaXplIHRoZSB3ZWJnbCBjb250ZXh0XG4gICAgICAgICAgICAgICAgdGhpcy5faW5pdEdMKCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIG1hcC5fcGFuZXMudGlsZVBhbmUuYXBwZW5kQ2hpbGQodGhpcy5fY2FudmFzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIHNldCB1cCBldmVudHNcbiAgICAgICAgICAgIG1hcC5vbih7XG4gICAgICAgICAgICAgICAgJ3Jlc2l6ZSc6IHRoaXMuX3Jlc2l6ZSxcbiAgICAgICAgICAgICAgICAndmlld3Jlc2V0JzogdGhpcy5fcmVzZXQsXG4gICAgICAgICAgICAgICAgJ21vdmVlbmQnOiB0aGlzLl91cGRhdGUsXG4gICAgICAgICAgICAgICAgJ3pvb21zdGFydCc6IHRoaXMuY2xlYXJFeHRyZW1hXG4gICAgICAgICAgICB9LCB0aGlzKTtcbiAgICAgICAgICAgIGlmIChtYXAub3B0aW9ucy56b29tQW5pbWF0aW9uICYmIEwuQnJvd3Nlci5hbnkzZCkge1xuICAgICAgICAgICAgICAgIG1hcC5vbih7XG4gICAgICAgICAgICAgICAgICAgICd6b29tc3RhcnQnOiB0aGlzLl9lbmFibGVab29taW5nLFxuICAgICAgICAgICAgICAgICAgICAnem9vbWFuaW0nOiB0aGlzLl9hbmltYXRlWm9vbSxcbiAgICAgICAgICAgICAgICAgICAgJ3pvb21lbmQnOiB0aGlzLl9kaXNhYmxlWm9vbWluZyxcbiAgICAgICAgICAgICAgICB9LCB0aGlzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghdGhpcy5vcHRpb25zLnVwZGF0ZVdoZW5JZGxlKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fbGltaXRlZFVwZGF0ZSA9IEwuVXRpbC5saW1pdEV4ZWNCeUludGVydmFsKHRoaXMuX3VwZGF0ZSwgMTUwLCB0aGlzKTtcbiAgICAgICAgICAgICAgICBtYXAub24oJ21vdmUnLCB0aGlzLl9saW1pdGVkVXBkYXRlLCB0aGlzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuX3Jlc2V0KCk7XG4gICAgICAgICAgICB0aGlzLl91cGRhdGUoKTtcbiAgICAgICAgfSxcblxuICAgICAgICBhZGRUbzogZnVuY3Rpb24obWFwKSB7XG4gICAgICAgICAgICBtYXAuYWRkTGF5ZXIodGhpcyk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfSxcblxuICAgICAgICBvblJlbW92ZTogZnVuY3Rpb24obWFwKSB7XG4gICAgICAgICAgICAvLyBjbGVhciB0aGUgY3VycmVudCBidWZmZXJcbiAgICAgICAgICAgIHRoaXMuX2NsZWFyQmFja0J1ZmZlcigpO1xuICAgICAgICAgICAgbWFwLmdldFBhbmVzKCkudGlsZVBhbmUucmVtb3ZlQ2hpbGQodGhpcy5fY2FudmFzKTtcbiAgICAgICAgICAgIG1hcC5vZmYoe1xuICAgICAgICAgICAgICAgICdyZXNpemUnOiB0aGlzLl9yZXNpemUsXG4gICAgICAgICAgICAgICAgJ3ZpZXdyZXNldCc6IHRoaXMuX3Jlc2V0LFxuICAgICAgICAgICAgICAgICdtb3ZlZW5kJzogdGhpcy5fdXBkYXRlLFxuICAgICAgICAgICAgICAgICd6b29tc3RhcnQnOiB0aGlzLmNsZWFyRXh0cmVtYVxuICAgICAgICAgICAgfSwgdGhpcyk7XG4gICAgICAgICAgICBpZiAobWFwLm9wdGlvbnMuem9vbUFuaW1hdGlvbikge1xuICAgICAgICAgICAgICAgIG1hcC5vZmYoe1xuICAgICAgICAgICAgICAgICAgICAnem9vbXN0YXJ0JzogdGhpcy5fZW5hYmxlWm9vbWluZyxcbiAgICAgICAgICAgICAgICAgICAgJ3pvb21hbmltJzogdGhpcy5fYW5pbWF0ZVpvb20sXG4gICAgICAgICAgICAgICAgICAgICd6b29tZW5kJzogdGhpcy5fZGlzYWJsZVpvb21pbmdcbiAgICAgICAgICAgICAgICB9LCB0aGlzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghdGhpcy5vcHRpb25zLnVwZGF0ZVdoZW5JZGxlKSB7XG4gICAgICAgICAgICAgICAgbWFwLm9mZignbW92ZScsIHRoaXMuX2xpbWl0ZWRVcGRhdGUsIHRoaXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5fbWFwID0gbnVsbDtcbiAgICAgICAgICAgIHRoaXMuX2FuaW1hdGVkID0gbnVsbDtcbiAgICAgICAgICAgIHRoaXMuX2lzWm9vbWluZyA9IGZhbHNlO1xuICAgICAgICAgICAgdGhpcy5fY2FjaGUgPSB7fTtcbiAgICAgICAgfSxcblxuICAgICAgICBfZW5hYmxlWm9vbWluZzogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB0aGlzLl9pc1pvb21pbmcgPSB0cnVlO1xuICAgICAgICB9LFxuXG4gICAgICAgIF9kaXNhYmxlWm9vbWluZzogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB0aGlzLl9pc1pvb21pbmcgPSBmYWxzZTtcbiAgICAgICAgICAgIHRoaXMuX2NsZWFyQmFja0J1ZmZlcigpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGJyaW5nVG9Gcm9udDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgcGFuZSA9IHRoaXMuX21hcC5fcGFuZXMudGlsZVBhbmU7XG4gICAgICAgICAgICBpZiAodGhpcy5fY2FudmFzKSB7XG4gICAgICAgICAgICAgICAgcGFuZS5hcHBlbmRDaGlsZCh0aGlzLl9jYW52YXMpO1xuICAgICAgICAgICAgICAgIHRoaXMuX3NldEF1dG9aSW5kZXgocGFuZSwgTWF0aC5tYXgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH0sXG5cbiAgICAgICAgYnJpbmdUb0JhY2s6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIHBhbmUgPSB0aGlzLl9tYXAuX3BhbmVzLnRpbGVQYW5lO1xuICAgICAgICAgICAgaWYgKHRoaXMuX2NhbnZhcykge1xuICAgICAgICAgICAgICAgIHBhbmUuaW5zZXJ0QmVmb3JlKHRoaXMuX2NhbnZhcywgcGFuZS5maXJzdENoaWxkKTtcbiAgICAgICAgICAgICAgICB0aGlzLl9zZXRBdXRvWkluZGV4KHBhbmUsIE1hdGgubWluKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9LFxuXG4gICAgICAgIF9zZXRBdXRvWkluZGV4OiBmdW5jdGlvbihwYW5lLCBjb21wYXJlKSB7XG4gICAgICAgICAgICB2YXIgbGF5ZXJzID0gcGFuZS5jaGlsZHJlbjtcbiAgICAgICAgICAgIHZhciBlZGdlWkluZGV4ID0gLWNvbXBhcmUoSW5maW5pdHksIC1JbmZpbml0eSk7IC8vIC1JbmZpbml0eSBmb3IgbWF4LCBJbmZpbml0eSBmb3IgbWluXG4gICAgICAgICAgICB2YXIgekluZGV4O1xuICAgICAgICAgICAgdmFyIGk7XG4gICAgICAgICAgICB2YXIgbGVuO1xuICAgICAgICAgICAgZm9yIChpID0gMCwgbGVuID0gbGF5ZXJzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgICAgICAgICAgaWYgKGxheWVyc1tpXSAhPT0gdGhpcy5fY2FudmFzKSB7XG4gICAgICAgICAgICAgICAgICAgIHpJbmRleCA9IHBhcnNlSW50KGxheWVyc1tpXS5zdHlsZS56SW5kZXgsIDEwKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFpc05hTih6SW5kZXgpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBlZGdlWkluZGV4ID0gY29tcGFyZShlZGdlWkluZGV4LCB6SW5kZXgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5vcHRpb25zLnpJbmRleCA9IHRoaXMuX2NhbnZhcy5zdHlsZS56SW5kZXggPSAoaXNGaW5pdGUoZWRnZVpJbmRleCkgPyBlZGdlWkluZGV4IDogMCkgKyBjb21wYXJlKDEsIC0xKTtcbiAgICAgICAgfSxcblxuICAgICAgICBzZXRPcGFjaXR5OiBmdW5jdGlvbihvcGFjaXR5KSB7XG4gICAgICAgICAgICB0aGlzLm9wdGlvbnMub3BhY2l0eSA9IG9wYWNpdHk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfSxcblxuICAgICAgICBzZXRaSW5kZXg6IGZ1bmN0aW9uKHpJbmRleCkge1xuICAgICAgICAgICAgdGhpcy5vcHRpb25zLnpJbmRleCA9IHpJbmRleDtcbiAgICAgICAgICAgIHRoaXMuX3VwZGF0ZVpJbmRleCgpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH0sXG5cbiAgICAgICAgX3VwZGF0ZVpJbmRleDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5fY2FudmFzICYmIHRoaXMub3B0aW9ucy56SW5kZXggIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIHRoaXMuX2NhbnZhcy5zdHlsZS56SW5kZXggPSB0aGlzLm9wdGlvbnMuekluZGV4O1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIF9yZXNldDogZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAgICAgXy5mb3JJbih0aGlzLl90aWxlcywgZnVuY3Rpb24odGlsZSkge1xuICAgICAgICAgICAgICAgIHNlbGYuZmlyZSgndGlsZXVubG9hZCcsIHtcbiAgICAgICAgICAgICAgICAgICAgdGlsZTogdGlsZVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB0aGlzLl90aWxlcyA9IHt9O1xuICAgICAgICAgICAgdGhpcy5fdGlsZXNUb0xvYWQgPSAwO1xuICAgICAgICAgICAgaWYgKHRoaXMuX2FuaW1hdGVkICYmIGUgJiYgZS5oYXJkKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fY2xlYXJCYWNrQnVmZmVyKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgX3VwZGF0ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBpZiAoIXRoaXMuX21hcCkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBtYXAgPSB0aGlzLl9tYXA7XG4gICAgICAgICAgICB2YXIgYm91bmRzID0gbWFwLmdldFBpeGVsQm91bmRzKCk7XG4gICAgICAgICAgICB2YXIgem9vbSA9IG1hcC5nZXRab29tKCk7XG4gICAgICAgICAgICB2YXIgdGlsZVNpemUgPSB0aGlzLl9nZXRUaWxlU2l6ZSgpO1xuICAgICAgICAgICAgaWYgKHpvb20gPiB0aGlzLm9wdGlvbnMubWF4Wm9vbSB8fFxuICAgICAgICAgICAgICAgIHpvb20gPCB0aGlzLm9wdGlvbnMubWluWm9vbSkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciB0aWxlQm91bmRzID0gTC5ib3VuZHMoXG4gICAgICAgICAgICAgICAgYm91bmRzLm1pbi5kaXZpZGVCeSh0aWxlU2l6ZSkuX2Zsb29yKCksXG4gICAgICAgICAgICAgICAgYm91bmRzLm1heC5kaXZpZGVCeSh0aWxlU2l6ZSkuX2Zsb29yKCkpO1xuICAgICAgICAgICAgdGhpcy5fYWRkVGlsZXNGcm9tQ2VudGVyT3V0KHRpbGVCb3VuZHMpO1xuICAgICAgICAgICAgaWYgKHRoaXMub3B0aW9ucy51bmxvYWRJbnZpc2libGVUaWxlcykge1xuICAgICAgICAgICAgICAgIHRoaXMuX3JlbW92ZU90aGVyVGlsZXModGlsZUJvdW5kcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgX2FkZFRpbGVzRnJvbUNlbnRlck91dDogZnVuY3Rpb24oYm91bmRzKSB7XG4gICAgICAgICAgICB2YXIgcXVldWUgPSBbXTtcbiAgICAgICAgICAgIHZhciBjZW50ZXIgPSBib3VuZHMuZ2V0Q2VudGVyKCk7XG4gICAgICAgICAgICB2YXIgajtcbiAgICAgICAgICAgIHZhciBpO1xuICAgICAgICAgICAgdmFyIHBvaW50O1xuICAgICAgICAgICAgZm9yIChqID0gYm91bmRzLm1pbi55OyBqIDw9IGJvdW5kcy5tYXgueTsgaisrKSB7XG4gICAgICAgICAgICAgICAgZm9yIChpID0gYm91bmRzLm1pbi54OyBpIDw9IGJvdW5kcy5tYXgueDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIHBvaW50ID0gbmV3IEwuUG9pbnQoaSwgaik7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLl90aWxlU2hvdWxkQmVMb2FkZWQocG9pbnQpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBxdWV1ZS5wdXNoKHBvaW50KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciB0aWxlc1RvTG9hZCA9IHF1ZXVlLmxlbmd0aDtcbiAgICAgICAgICAgIGlmICh0aWxlc1RvTG9hZCA9PT0gMCkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIGxvYWQgdGlsZXMgaW4gb3JkZXIgb2YgdGhlaXIgZGlzdGFuY2UgdG8gY2VudGVyXG4gICAgICAgICAgICBxdWV1ZS5zb3J0KGZ1bmN0aW9uKGEsIGIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gYS5kaXN0YW5jZVRvKGNlbnRlcikgLSBiLmRpc3RhbmNlVG8oY2VudGVyKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgLy8gaWYgaXRzIHRoZSBmaXJzdCBiYXRjaCBvZiB0aWxlcyB0byBsb2FkXG4gICAgICAgICAgICBpZiAoIXRoaXMuX3RpbGVzVG9Mb2FkKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5maXJlKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLl90aWxlc1RvTG9hZCArPSB0aWxlc1RvTG9hZDtcbiAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCB0aWxlc1RvTG9hZDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fYWRkVGlsZShxdWV1ZVtpXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgX3RpbGVTaG91bGRCZUxvYWRlZDogZnVuY3Rpb24odGlsZVBvaW50KSB7XG4gICAgICAgICAgICBpZiAoKHRpbGVQb2ludC54ICsgJzonICsgdGlsZVBvaW50LnkpIGluIHRoaXMuX3RpbGVzKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlOyAvLyBhbHJlYWR5IGxvYWRlZFxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIG9wdGlvbnMgPSB0aGlzLm9wdGlvbnM7XG4gICAgICAgICAgICBpZiAoIW9wdGlvbnMuY29udGludW91c1dvcmxkKSB7XG4gICAgICAgICAgICAgICAgdmFyIGxpbWl0ID0gdGhpcy5fZ2V0V3JhcFRpbGVOdW0oKTtcbiAgICAgICAgICAgICAgICAvLyBkb24ndCBsb2FkIGlmIGV4Y2VlZHMgd29ybGQgYm91bmRzXG4gICAgICAgICAgICAgICAgaWYgKChvcHRpb25zLm5vV3JhcCAmJiAodGlsZVBvaW50LnggPCAwIHx8IHRpbGVQb2ludC54ID49IGxpbWl0LngpKSB8fFxuICAgICAgICAgICAgICAgICAgICB0aWxlUG9pbnQueSA8IDAgfHwgdGlsZVBvaW50LnkgPj0gbGltaXQueSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG9wdGlvbnMuYm91bmRzKSB7XG4gICAgICAgICAgICAgICAgdmFyIHRpbGVTaXplID0gdGhpcy5fZ2V0VGlsZVNpemUoKTtcbiAgICAgICAgICAgICAgICB2YXIgbndQb2ludCA9IHRpbGVQb2ludC5tdWx0aXBseUJ5KHRpbGVTaXplKTtcbiAgICAgICAgICAgICAgICB2YXIgc2VQb2ludCA9IG53UG9pbnQuYWRkKFt0aWxlU2l6ZSwgdGlsZVNpemVdKTtcbiAgICAgICAgICAgICAgICB2YXIgbncgPSB0aGlzLl9tYXAudW5wcm9qZWN0KG53UG9pbnQpO1xuICAgICAgICAgICAgICAgIHZhciBzZSA9IHRoaXMuX21hcC51bnByb2plY3Qoc2VQb2ludCk7XG4gICAgICAgICAgICAgICAgLy8gVE9ETyB0ZW1wb3JhcnkgaGFjaywgd2lsbCBiZSByZW1vdmVkIGFmdGVyIHJlZmFjdG9yaW5nIHByb2plY3Rpb25zXG4gICAgICAgICAgICAgICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL0xlYWZsZXQvTGVhZmxldC9pc3N1ZXMvMTYxOFxuICAgICAgICAgICAgICAgIGlmICghb3B0aW9ucy5jb250aW51b3VzV29ybGQgJiYgIW9wdGlvbnMubm9XcmFwKSB7XG4gICAgICAgICAgICAgICAgICAgIG53ID0gbncud3JhcCgpO1xuICAgICAgICAgICAgICAgICAgICBzZSA9IHNlLndyYXAoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKCFvcHRpb25zLmJvdW5kcy5pbnRlcnNlY3RzKFtudywgc2VdKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0sXG5cbiAgICAgICAgX3JlbW92ZU90aGVyVGlsZXM6IGZ1bmN0aW9uKGJvdW5kcykge1xuICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAgICAgXy5mb3JJbih0aGlzLl90aWxlcywgZnVuY3Rpb24odGlsZSwga2V5KSB7XG4gICAgICAgICAgICAgICAgdmFyIGtBcnIgPSBrZXkuc3BsaXQoJzonKTtcbiAgICAgICAgICAgICAgICB2YXIgeCA9IHBhcnNlSW50KGtBcnJbMF0sIDEwKTtcbiAgICAgICAgICAgICAgICB2YXIgeSA9IHBhcnNlSW50KGtBcnJbMV0sIDEwKTtcbiAgICAgICAgICAgICAgICAvLyByZW1vdmUgdGlsZSBpZiBpdCdzIG91dCBvZiBib3VuZHNcbiAgICAgICAgICAgICAgICBpZiAoeCA8IGJvdW5kcy5taW4ueCB8fFxuICAgICAgICAgICAgICAgICAgICB4ID4gYm91bmRzLm1heC54IHx8XG4gICAgICAgICAgICAgICAgICAgIHkgPCBib3VuZHMubWluLnkgfHxcbiAgICAgICAgICAgICAgICAgICAgeSA+IGJvdW5kcy5tYXgueSkge1xuICAgICAgICAgICAgICAgICAgICBzZWxmLl9yZW1vdmVUaWxlKGtleSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgX2dldFRpbGVTaXplOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciBtYXAgPSB0aGlzLl9tYXA7XG4gICAgICAgICAgICB2YXIgem9vbSA9IG1hcC5nZXRab29tKCkgKyB0aGlzLm9wdGlvbnMuem9vbU9mZnNldDtcbiAgICAgICAgICAgIHZhciB6b29tTiA9IHRoaXMub3B0aW9ucy5tYXhOYXRpdmVab29tO1xuICAgICAgICAgICAgdmFyIHRpbGVTaXplID0gMjU2O1xuICAgICAgICAgICAgaWYgKHpvb21OICYmIHpvb20gPiB6b29tTikge1xuICAgICAgICAgICAgICAgIHRpbGVTaXplID0gTWF0aC5yb3VuZChtYXAuZ2V0Wm9vbVNjYWxlKHpvb20pIC8gbWFwLmdldFpvb21TY2FsZSh6b29tTikgKiB0aWxlU2l6ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdGlsZVNpemU7XG4gICAgICAgIH0sXG5cbiAgICAgICAgcmVkcmF3OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLl9tYXApIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9yZXNldCh7XG4gICAgICAgICAgICAgICAgICAgIGhhcmQ6IHRydWVcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB0aGlzLl91cGRhdGUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9LFxuXG4gICAgICAgIF9jcmVhdGVUaWxlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB7fTtcbiAgICAgICAgfSxcblxuICAgICAgICBfYWRkVGlsZTogZnVuY3Rpb24odGlsZVBvaW50KSB7XG4gICAgICAgICAgICAvLyBjcmVhdGUgYSBuZXcgdGlsZVxuICAgICAgICAgICAgdmFyIHRpbGUgPSB0aGlzLl9jcmVhdGVUaWxlKCk7XG4gICAgICAgICAgICB0aGlzLl90aWxlc1t0aWxlUG9pbnQueCArICc6JyArIHRpbGVQb2ludC55XSA9IHRpbGU7XG4gICAgICAgICAgICB0aGlzLl9sb2FkVGlsZSh0aWxlLCB0aWxlUG9pbnQpO1xuICAgICAgICB9LFxuXG4gICAgICAgIF9sb2FkVGlsZTogZnVuY3Rpb24odGlsZSwgdGlsZVBvaW50KSB7XG4gICAgICAgICAgICB0aWxlLl9sYXllciA9IHRoaXM7XG4gICAgICAgICAgICB0aWxlLl90aWxlUG9pbnQgPSB0aWxlUG9pbnQ7XG4gICAgICAgICAgICB0aWxlLl91bmFkanVzdGVkVGlsZVBvaW50ID0ge1xuICAgICAgICAgICAgICAgIHg6IHRpbGVQb2ludC54LFxuICAgICAgICAgICAgICAgIHk6IHRpbGVQb2ludC55XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgdGhpcy5fYWRqdXN0VGlsZVBvaW50KHRpbGVQb2ludCk7XG4gICAgICAgICAgICB0aGlzLl9yZWRyYXdUaWxlKHRpbGUpO1xuICAgICAgICB9LFxuXG4gICAgICAgIF9hZGp1c3RUaWxlS2V5OiBmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgICAgIC8vIHdoZW4gZGVhbGluZyB3aXRoIHdyYXBwZWQgdGlsZXMsIGludGVybmFsbHkgbGVhZmV0IHdpbGwgdXNlXG4gICAgICAgICAgICAvLyBjb29yZGluYXRlcyBuIDwgMCBhbmQgbiA+ICgyXnopIHRvIHBvc2l0aW9uIHRoZW0gY29ycmVjdGx5LlxuICAgICAgICAgICAgLy8gdGhpcyBmdW5jdGlvbiBjb252ZXJ0cyB0aGF0IHRvIHRoZSBtb2R1bG9zIGtleSB1c2VkIHRvIGNhY2hlIHRoZW1cbiAgICAgICAgICAgIC8vIGRhdGEuXG4gICAgICAgICAgICAvLyBFeC4gJy0xOjMnIGF0IHogPSAyIGJlY29tZXMgJzM6MydcbiAgICAgICAgICAgIHZhciBrQXJyID0ga2V5LnNwbGl0KCc6Jyk7XG4gICAgICAgICAgICB2YXIgeCA9IHBhcnNlSW50KGtBcnJbMF0sIDEwKTtcbiAgICAgICAgICAgIHZhciB5ID0gcGFyc2VJbnQoa0FyclsxXSwgMTApO1xuICAgICAgICAgICAgdmFyIHRpbGVQb2ludCA9IHtcbiAgICAgICAgICAgICAgICB4OiB4LFxuICAgICAgICAgICAgICAgIHk6IHlcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICB0aGlzLl9hZGp1c3RUaWxlUG9pbnQodGlsZVBvaW50KTtcbiAgICAgICAgICAgIHJldHVybiB0aWxlUG9pbnQueCArICc6JyArIHRpbGVQb2ludC55ICsgJzonICsgdGlsZVBvaW50Lno7XG4gICAgICAgIH0sXG5cbiAgICAgICAgX2dldFpvb21Gb3JVcmw6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIG9wdGlvbnMgPSB0aGlzLm9wdGlvbnM7XG4gICAgICAgICAgICB2YXIgem9vbSA9IHRoaXMuX21hcC5nZXRab29tKCk7XG4gICAgICAgICAgICBpZiAob3B0aW9ucy56b29tUmV2ZXJzZSkge1xuICAgICAgICAgICAgICAgIHpvb20gPSBvcHRpb25zLm1heFpvb20gLSB6b29tO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgem9vbSArPSBvcHRpb25zLnpvb21PZmZzZXQ7XG4gICAgICAgICAgICByZXR1cm4gb3B0aW9ucy5tYXhOYXRpdmVab29tID8gTWF0aC5taW4oem9vbSwgb3B0aW9ucy5tYXhOYXRpdmVab29tKSA6IHpvb207XG4gICAgICAgIH0sXG5cbiAgICAgICAgX2dldFRpbGVQb3M6IGZ1bmN0aW9uKHRpbGVQb2ludCkge1xuICAgICAgICAgICAgdmFyIG9yaWdpbiA9IHRoaXMuX21hcC5nZXRQaXhlbE9yaWdpbigpO1xuICAgICAgICAgICAgdmFyIHRpbGVTaXplID0gdGhpcy5fZ2V0VGlsZVNpemUoKTtcbiAgICAgICAgICAgIHJldHVybiB0aWxlUG9pbnQubXVsdGlwbHlCeSh0aWxlU2l6ZSkuc3VidHJhY3Qob3JpZ2luKTtcbiAgICAgICAgfSxcblxuICAgICAgICBfZ2V0V3JhcFRpbGVOdW06IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIGNycyA9IHRoaXMuX21hcC5vcHRpb25zLmNycztcbiAgICAgICAgICAgIHZhciBzaXplID0gY3JzLmdldFNpemUodGhpcy5fbWFwLmdldFpvb20oKSk7XG4gICAgICAgICAgICByZXR1cm4gc2l6ZS5kaXZpZGVCeSh0aGlzLl9nZXRUaWxlU2l6ZSgpKS5fZmxvb3IoKTtcbiAgICAgICAgfSxcblxuICAgICAgICBfYWRqdXN0VGlsZVBvaW50OiBmdW5jdGlvbih0aWxlUG9pbnQpIHtcbiAgICAgICAgICAgIHZhciBsaW1pdCA9IHRoaXMuX2dldFdyYXBUaWxlTnVtKCk7XG4gICAgICAgICAgICAvLyB3cmFwIHRpbGUgY29vcmRpbmF0ZXNcbiAgICAgICAgICAgIGlmICghdGhpcy5vcHRpb25zLmNvbnRpbnVvdXNXb3JsZCAmJiAhdGhpcy5vcHRpb25zLm5vV3JhcCkge1xuICAgICAgICAgICAgICAgIHRpbGVQb2ludC54ID0gKCh0aWxlUG9pbnQueCAlIGxpbWl0LngpICsgbGltaXQueCkgJSBsaW1pdC54O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHRoaXMub3B0aW9ucy50bXMpIHtcbiAgICAgICAgICAgICAgICB0aWxlUG9pbnQueSA9IGxpbWl0LnkgLSB0aWxlUG9pbnQueSAtIDE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aWxlUG9pbnQueiA9IHRoaXMuX2dldFpvb21Gb3JVcmwoKTtcbiAgICAgICAgfSxcblxuICAgICAgICBfcmVtb3ZlVGlsZTogZnVuY3Rpb24oa2V5KSB7XG4gICAgICAgICAgICB2YXIgYWRqdXN0ZWRLZXkgPSB0aGlzLl9hZGp1c3RUaWxlS2V5KGtleSk7XG4gICAgICAgICAgICB2YXIgY2FjaGVkID0gdGhpcy5fY2FjaGVbYWRqdXN0ZWRLZXldO1xuICAgICAgICAgICAgLy8gcmVtb3ZlIHRoZSB0aWxlIGZyb20gdGhlIGNhY2hlXG4gICAgICAgICAgICBkZWxldGUgY2FjaGVkLnRpbGVzW2tleV07XG4gICAgICAgICAgICBpZiAoXy5rZXlzKGNhY2hlZC50aWxlcykubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgLy8gbm8gbW9yZSB0aWxlcyB1c2UgdGhpcyBjYWNoZWQgZGF0YSwgc28gZGVsZXRlIGl0XG4gICAgICAgICAgICAgICAgZGVsZXRlIHRoaXMuX2NhY2hlW2FkanVzdGVkS2V5XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIHVubG9hZCB0aGUgdGlsZVxuICAgICAgICAgICAgdmFyIHRpbGUgPSB0aGlzLl90aWxlc1trZXldO1xuICAgICAgICAgICAgdGhpcy5maXJlKCd0aWxldW5sb2FkJywge1xuICAgICAgICAgICAgICAgIHRpbGU6IHRpbGVcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgZGVsZXRlIHRoaXMuX3RpbGVzW2tleV07XG4gICAgICAgIH0sXG5cbiAgICAgICAgX3RpbGVMb2FkZWQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdGhpcy5fdGlsZXNUb0xvYWQtLTtcbiAgICAgICAgICAgIGlmICh0aGlzLl9hbmltYXRlZCkge1xuICAgICAgICAgICAgICAgIEwuRG9tVXRpbC5hZGRDbGFzcyh0aGlzLl9jYW52YXMsICdsZWFmbGV0LXpvb20tYW5pbWF0ZWQnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghdGhpcy5fdGlsZXNUb0xvYWQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmZpcmUoJ2xvYWQnKTtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5fYW5pbWF0ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gY2xlYXIgc2NhbGVkIHRpbGVzIGFmdGVyIGFsbCBuZXcgdGlsZXMgYXJlIGxvYWRlZCAoZm9yIHBlcmZvcm1hbmNlKVxuICAgICAgICAgICAgICAgICAgICBjbGVhclRpbWVvdXQodGhpcy5fY2xlYXJCdWZmZXJUaW1lcik7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2NsZWFyQnVmZmVyVGltZXIgPSBzZXRUaW1lb3V0KEwuYmluZCh0aGlzLl9jbGVhckJhY2tCdWZmZXIsIHRoaXMpLCA1MDApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICBfdGlsZU9uTG9hZDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgbGF5ZXIgPSB0aGlzLl9sYXllcjtcbiAgICAgICAgICAgIEwuRG9tVXRpbC5hZGRDbGFzcyh0aGlzLCAnbGVhZmxldC10aWxlLWxvYWRlZCcpO1xuICAgICAgICAgICAgbGF5ZXIuZmlyZSgndGlsZWxvYWQnLCB7XG4gICAgICAgICAgICAgICAgdGlsZTogdGhpc1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBsYXllci5fdGlsZUxvYWRlZCgpO1xuICAgICAgICB9LFxuXG4gICAgICAgIF90aWxlT25FcnJvcjogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgbGF5ZXIgPSB0aGlzLl9sYXllcjtcbiAgICAgICAgICAgIGxheWVyLmZpcmUoJ3RpbGVlcnJvcicsIHtcbiAgICAgICAgICAgICAgICB0aWxlOiB0aGlzXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGxheWVyLl90aWxlTG9hZGVkKCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgX2VuY29kZUZsb2F0QXNVaW50ODogZnVuY3Rpb24obnVtKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IFVpbnQ4QXJyYXkoW1xuICAgICAgICAgICAgICAgIChudW0gJiAweGZmMDAwMDAwKSA+PiAyNCxcbiAgICAgICAgICAgICAgICAobnVtICYgMHgwMGZmMDAwMCkgPj4gMTYsXG4gICAgICAgICAgICAgICAgKG51bSAmIDB4MDAwMGZmMDApID4+IDgsXG4gICAgICAgICAgICAgICAgKG51bSAmIDB4MDAwMDAwZmYpXG4gICAgICAgICAgICBdKTtcbiAgICAgICAgfSxcblxuICAgICAgICBfY3JlYXRlRGF0YVRleHR1cmU6IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgICAgIHZhciBkb3VibGVzID0gbmV3IEZsb2F0NjRBcnJheShkYXRhKTtcbiAgICAgICAgICAgIHZhciByZXNvbHV0aW9uID0gTWF0aC5zcXJ0KGRvdWJsZXMubGVuZ3RoKTtcbiAgICAgICAgICAgIHZhciBidWZmZXIgPSBuZXcgQXJyYXlCdWZmZXIocmVzb2x1dGlvbiAqIHJlc29sdXRpb24gKiA0KTtcbiAgICAgICAgICAgIHZhciBlbmNvZGVkQmlucyA9IG5ldyBVaW50OEFycmF5KGJ1ZmZlcik7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHJlc29sdXRpb24gKiByZXNvbHV0aW9uOyBpKyspIHtcbiAgICAgICAgICAgICAgICAvLyBjYXN0IGZyb20gZmxvYXQ2NCB0byBmbG9hdDMyXG4gICAgICAgICAgICAgICAgdmFyIGVuYyA9IHRoaXMuX2VuY29kZUZsb2F0QXNVaW50OChkb3VibGVzW2ldKTtcbiAgICAgICAgICAgICAgICBlbmNvZGVkQmluc1tpICogNF0gPSBlbmNbMF07XG4gICAgICAgICAgICAgICAgZW5jb2RlZEJpbnNbaSAqIDQgKyAxXSA9IGVuY1sxXTtcbiAgICAgICAgICAgICAgICBlbmNvZGVkQmluc1tpICogNCArIDJdID0gZW5jWzJdO1xuICAgICAgICAgICAgICAgIGVuY29kZWRCaW5zW2kgKiA0ICsgM10gPSBlbmNbM107XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gbmV3IGVzcGVyLlRleHR1cmUyRCh7XG4gICAgICAgICAgICAgICAgaGVpZ2h0OiByZXNvbHV0aW9uLFxuICAgICAgICAgICAgICAgIHdpZHRoOiByZXNvbHV0aW9uLFxuICAgICAgICAgICAgICAgIGRhdGE6IGVuY29kZWRCaW5zLFxuICAgICAgICAgICAgICAgIGZvcm1hdDogJ1JHQkEnLFxuICAgICAgICAgICAgICAgIHR5cGU6ICdVTlNJR05FRF9CWVRFJyxcbiAgICAgICAgICAgICAgICB3cmFwOiAnQ0xBTVBfVE9fRURHRScsXG4gICAgICAgICAgICAgICAgZmlsdGVyOiAnTkVBUkVTVCcsXG4gICAgICAgICAgICAgICAgaW52ZXJ0WTogdHJ1ZVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgX3JlZHJhd1RpbGU6IGZ1bmN0aW9uKHRpbGUpIHtcbiAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgICAgIHZhciBjYWNoZSA9IHRoaXMuX2NhY2hlO1xuICAgICAgICAgICAgdmFyIGNvb3JkID0ge1xuICAgICAgICAgICAgICAgIHg6IHRpbGUuX3RpbGVQb2ludC54LFxuICAgICAgICAgICAgICAgIHk6IHRpbGUuX3RpbGVQb2ludC55LFxuICAgICAgICAgICAgICAgIHo6IHRoaXMuX21hcC5fem9vbVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIC8vIHVzZSB0aGUgYWRqdXN0ZWQgY29vcmRpbmF0ZXMgdG8gaGFzaCB0aGUgdGhlIGNhY2hlIHZhbHVlcywgdGhpc1xuICAgICAgICAgICAgLy8gaXMgYmVjYXVzZSB3ZSB3YW50IHRvIG9ubHkgaGF2ZSBvbmUgY29weSBvZiB0aGUgZGF0YVxuICAgICAgICAgICAgdmFyIGhhc2ggPSBjb29yZC54ICsgJzonICsgY29vcmQueSArICc6JyArIGNvb3JkLno7XG4gICAgICAgICAgICAvLyB1c2UgdGhlIHVuYWRqc3V0ZWQgY29vcmRpbmF0ZXMgdG8gdHJhY2sgd2hpY2ggJ3dyYXBwZWQnIHRpbGVzXG4gICAgICAgICAgICAvLyB1c2VkIHRoZSBjYWNoZWQgZGF0YVxuICAgICAgICAgICAgdmFyIHVuYWRqdXN0ZWRIYXNoID0gdGlsZS5fdW5hZGp1c3RlZFRpbGVQb2ludC54ICsgJzonICsgdGlsZS5fdW5hZGp1c3RlZFRpbGVQb2ludC55O1xuICAgICAgICAgICAgLy8gY2hlY2sgY2FjaGVcbiAgICAgICAgICAgIHZhciBjYWNoZWQgPSBjYWNoZVtoYXNoXTtcbiAgICAgICAgICAgIGlmIChjYWNoZWQpIHtcbiAgICAgICAgICAgICAgICAvLyBzdG9yZSB0aGUgdGlsZSBpbiB0aGUgY2FjaGUgdG8gZHJhdyB0byBsYXRlclxuICAgICAgICAgICAgICAgIGNhY2hlZC50aWxlc1t1bmFkanVzdGVkSGFzaF0gPSB0aWxlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBjcmVhdGUgYSBjYWNoZSBlbnRyeVxuICAgICAgICAgICAgICAgIGNhY2hlW2hhc2hdID0ge1xuICAgICAgICAgICAgICAgICAgICBpc1BlbmRpbmc6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHRpbGVzOiB7fSxcbiAgICAgICAgICAgICAgICAgICAgZGF0YTogbnVsbFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgLy8gYWRkIHRpbGUgdG8gdGhlIGNhY2hlIGVudHJ5XG4gICAgICAgICAgICAgICAgY2FjaGVbaGFzaF0udGlsZXNbdW5hZGp1c3RlZEhhc2hdID0gdGlsZTtcbiAgICAgICAgICAgICAgICAvLyByZXF1ZXN0IHRoZSB0aWxlXG4gICAgICAgICAgICAgICAgdGhpcy5yZXF1ZXN0VGlsZShjb29yZCwgZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgY2FjaGVkID0gY2FjaGVbaGFzaF07XG4gICAgICAgICAgICAgICAgICAgIGlmICghY2FjaGVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyB0aWxlIGlzIG5vIGxvbmdlciBiZWluZyB0cmFja2VkLCBpZ25vcmVcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBjYWNoZWQuaXNQZW5kaW5nID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIC8vIGlmIGRhdGEgaXMgbnVsbCwgZXhpdCBlYXJseVxuICAgICAgICAgICAgICAgICAgICBpZiAoZGF0YSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIC8vIHVwZGF0ZSB0aGUgZXh0cmVtYVxuICAgICAgICAgICAgICAgICAgICBzZWxmLnVwZGF0ZUV4dHJlbWEoZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgIGNhY2hlZC5kYXRhID0gc2VsZi5fY3JlYXRlRGF0YVRleHR1cmUoZGF0YSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgX2luaXRHTDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgICB2YXIgZ2wgPSB0aGlzLl9nbCA9IGVzcGVyLldlYkdMQ29udGV4dC5nZXQodGhpcy5fY2FudmFzKTtcbiAgICAgICAgICAgIC8vIGhhbmRsZSBtaXNzaW5nIGNvbnRleHRcbiAgICAgICAgICAgIGlmICghZ2wpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdVbmFibGUgdG8gYWNxdWlyZSBhIFdlYkdMIGNvbnRleHQuJyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gaW5pdCB0aGUgd2ViZ2wgc3RhdGVcbiAgICAgICAgICAgIGdsLmNsZWFyQ29sb3IoMCwgMCwgMCwgMCk7XG4gICAgICAgICAgICBnbC5lbmFibGUoZ2wuQkxFTkQpO1xuICAgICAgICAgICAgZ2wuYmxlbmRGdW5jKGdsLlNSQ19BTFBIQSwgZ2wuT05FKTtcbiAgICAgICAgICAgIGdsLmRpc2FibGUoZ2wuREVQVEhfVEVTVCk7XG4gICAgICAgICAgICAvLyBjcmVhdGUgdGlsZSByZW5kZXJhYmxlXG4gICAgICAgICAgICBzZWxmLl9yZW5kZXJhYmxlID0gbmV3IGVzcGVyLlJlbmRlcmFibGUoe1xuICAgICAgICAgICAgICAgIHZlcnRpY2VzOiB7XG4gICAgICAgICAgICAgICAgICAgIDA6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgIFswLCAtMjU2XSxcbiAgICAgICAgICAgICAgICAgICAgICAgIFsyNTYsIC0yNTZdLFxuICAgICAgICAgICAgICAgICAgICAgICAgWzI1NiwgMF0sXG4gICAgICAgICAgICAgICAgICAgICAgICBbMCwgMF1cbiAgICAgICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICAgICAgMTogW1xuICAgICAgICAgICAgICAgICAgICAgICAgWzAsIDBdLFxuICAgICAgICAgICAgICAgICAgICAgICAgWzEsIDBdLFxuICAgICAgICAgICAgICAgICAgICAgICAgWzEsIDFdLFxuICAgICAgICAgICAgICAgICAgICAgICAgWzAsIDFdXG4gICAgICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGluZGljZXM6IFtcbiAgICAgICAgICAgICAgICAgICAgMCwgMSwgMixcbiAgICAgICAgICAgICAgICAgICAgMCwgMiwgM1xuICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgLy8gbG9hZCBzaGFkZXJzXG4gICAgICAgICAgICB0aGlzLl9zaGFkZXIgPSBuZXcgZXNwZXIuU2hhZGVyKHtcbiAgICAgICAgICAgICAgICB2ZXJ0OiB0aGlzLm9wdGlvbnMuc2hhZGVycy52ZXJ0LFxuICAgICAgICAgICAgICAgIGZyYWc6IHRoaXMub3B0aW9ucy5zaGFkZXJzLmZyYWdcbiAgICAgICAgICAgIH0sIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIC8vIGV4ZWN1dGUgY2FsbGJhY2tcbiAgICAgICAgICAgICAgICB2YXIgd2lkdGggPSBzZWxmLl9jYW52YXMud2lkdGg7XG4gICAgICAgICAgICAgICAgdmFyIGhlaWdodCA9IHNlbGYuX2NhbnZhcy5oZWlnaHQ7XG4gICAgICAgICAgICAgICAgc2VsZi5fdmlld3BvcnQgPSBuZXcgZXNwZXIuVmlld3BvcnQoe1xuICAgICAgICAgICAgICAgICAgICB3aWR0aDogd2lkdGgsXG4gICAgICAgICAgICAgICAgICAgIGhlaWdodDogaGVpZ2h0XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgc2VsZi5faW5pdGlhbGl6ZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHNlbGYuX2RyYXcoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuXG4gICAgICAgIF9pbml0Q2FudmFzOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHRoaXMuX2NhbnZhcyA9IEwuRG9tVXRpbC5jcmVhdGUoJ2NhbnZhcycsICdsZWFmbGV0LXdlYmdsLWxheWVyIGxlYWZsZXQtbGF5ZXInKTtcbiAgICAgICAgICAgIHZhciBzaXplID0gdGhpcy5fbWFwLmdldFNpemUoKTtcbiAgICAgICAgICAgIHRoaXMuX2NhbnZhcy53aWR0aCA9IHNpemUueDtcbiAgICAgICAgICAgIHRoaXMuX2NhbnZhcy5oZWlnaHQgPSBzaXplLnk7XG4gICAgICAgICAgICB2YXIgYW5pbWF0ZWQgPSB0aGlzLl9tYXAub3B0aW9ucy56b29tQW5pbWF0aW9uICYmIEwuQnJvd3Nlci5hbnkzZDtcbiAgICAgICAgICAgIEwuRG9tVXRpbC5hZGRDbGFzcyh0aGlzLl9jYW52YXMsICdsZWFmbGV0LXpvb20tJyArIChhbmltYXRlZCA/ICdhbmltYXRlZCcgOiAnaGlkZScpKTtcbiAgICAgICAgfSxcblxuICAgICAgICBfZ2V0UHJvamVjdGlvbjogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgYm91bmRzID0gdGhpcy5fbWFwLmdldFBpeGVsQm91bmRzKCk7XG4gICAgICAgICAgICB2YXIgZGltID0gTWF0aC5wb3coMiwgdGhpcy5fbWFwLmdldFpvb20oKSkgKiAyNTY7XG4gICAgICAgICAgICByZXR1cm4gb3J0aG9NYXRyaXgoXG4gICAgICAgICAgICAgICAgYm91bmRzLm1pbi54LFxuICAgICAgICAgICAgICAgIGJvdW5kcy5tYXgueCxcbiAgICAgICAgICAgICAgICAoZGltIC0gYm91bmRzLm1heC55KSxcbiAgICAgICAgICAgICAgICAoZGltIC0gYm91bmRzLm1pbi55KSxcbiAgICAgICAgICAgICAgICAtMSwgMSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgX2NsZWFyQmFja0J1ZmZlcjogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBpZiAoIXRoaXMuX2dsKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIGdsID0gdGhpcy5fZ2w7XG4gICAgICAgICAgICBnbC5jbGVhcihnbC5DT0xPUl9CVUZGRVJfQklUKTtcbiAgICAgICAgfSxcblxuICAgICAgICBfYW5pbWF0ZVpvb206IGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgIHZhciBzY2FsZSA9IHRoaXMuX21hcC5nZXRab29tU2NhbGUoZS56b29tKTtcbiAgICAgICAgICAgIHZhciBvZmZzZXQgPSB0aGlzLl9tYXAuX2dldENlbnRlck9mZnNldChlLmNlbnRlcikuX211bHRpcGx5QnkoLXNjYWxlKS5zdWJ0cmFjdCh0aGlzLl9tYXAuX2dldE1hcFBhbmVQb3MoKSk7XG4gICAgICAgICAgICB0aGlzLl9jYW52YXMuc3R5bGVbTC5Eb21VdGlsLlRSQU5TRk9STV0gPSBMLkRvbVV0aWwuZ2V0VHJhbnNsYXRlU3RyaW5nKG9mZnNldCkgKyAnIHNjYWxlKCcgKyBzY2FsZSArICcpJztcbiAgICAgICAgfSxcblxuICAgICAgICBfcmVzaXplOiBmdW5jdGlvbihyZXNpemVFdmVudCkge1xuICAgICAgICAgICAgdmFyIHdpZHRoID0gcmVzaXplRXZlbnQubmV3U2l6ZS54O1xuICAgICAgICAgICAgdmFyIGhlaWdodCA9IHJlc2l6ZUV2ZW50Lm5ld1NpemUueTtcbiAgICAgICAgICAgIGlmICh0aGlzLl9pbml0aWFsaXplZCkge1xuICAgICAgICAgICAgICAgIHRoaXMuX3ZpZXdwb3J0LnJlc2l6ZSh3aWR0aCwgaGVpZ2h0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICBfZHJhdzogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5faW5pdGlhbGl6ZWQgJiYgdGhpcy5fZ2wpIHtcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMuaXNIaWRkZW4oKSkge1xuICAgICAgICAgICAgICAgICAgICAvLyByZS1wb3NpdGlvbiBjYW52YXNcbiAgICAgICAgICAgICAgICAgICAgaWYgKCF0aGlzLl9pc1pvb21pbmcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciB0b3BMZWZ0ID0gdGhpcy5fbWFwLmNvbnRhaW5lclBvaW50VG9MYXllclBvaW50KFswLCAwXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBMLkRvbVV0aWwuc2V0UG9zaXRpb24odGhpcy5fY2FudmFzLCB0b3BMZWZ0KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9iZWZvcmVEcmF3KCk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYmVmb3JlRHJhdygpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmRyYXcoKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5hZnRlckRyYXcoKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fYWZ0ZXJEcmF3KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSh0aGlzLl9kcmF3LmJpbmQodGhpcykpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIGJlZm9yZURyYXc6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgLy8gb3ZlcnJpZGVcbiAgICAgICAgfSxcblxuICAgICAgICBfYmVmb3JlRHJhdzogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB0aGlzLl92aWV3cG9ydC5wdXNoKCk7XG4gICAgICAgICAgICB0aGlzLl9zaGFkZXIucHVzaCgpO1xuICAgICAgICAgICAgdGhpcy5fc2hhZGVyLnNldFVuaWZvcm0oJ3VQcm9qZWN0aW9uTWF0cml4JywgdGhpcy5fZ2V0UHJvamVjdGlvbigpKTtcbiAgICAgICAgICAgIHRoaXMuX3NoYWRlci5zZXRVbmlmb3JtKCd1T3BhY2l0eScsIHRoaXMuZ2V0T3BhY2l0eSgpKTtcbiAgICAgICAgICAgIHRoaXMuX3NoYWRlci5zZXRVbmlmb3JtKCd1VGV4dHVyZVNhbXBsZXInLCAwKTtcbiAgICAgICAgfSxcblxuICAgICAgICBhZnRlckRyYXc6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgLy8gb3ZlcnJpZGVcbiAgICAgICAgfSxcblxuICAgICAgICBfYWZ0ZXJEcmF3OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHRoaXMuX3NoYWRlci5wb3AoKTtcbiAgICAgICAgICAgIHRoaXMuX3ZpZXdwb3J0LnBvcCgpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGRyYXc6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAgICAgdmFyIGRpbSA9IE1hdGgucG93KDIsIHRoaXMuX21hcC5nZXRab29tKCkpICogMjU2O1xuICAgICAgICAgICAgLy8gZm9yIGVhY2ggdGlsZVxuICAgICAgICAgICAgXy5mb3JJbih0aGlzLl9jYWNoZSwgZnVuY3Rpb24oY2FjaGVkKSB7XG4gICAgICAgICAgICAgICAgaWYgKGNhY2hlZC5pc1BlbmRpbmcgfHwgIWNhY2hlZC5kYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gYmluZCB0aWxlIHRleHR1cmUgdG8gdGV4dHVyZSB1bml0IDBcbiAgICAgICAgICAgICAgICBjYWNoZWQuZGF0YS5wdXNoKDApO1xuICAgICAgICAgICAgICAgIF8uZm9ySW4oY2FjaGVkLnRpbGVzLCBmdW5jdGlvbih0aWxlLCBrZXkpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gZmluZCB0aGUgdGlsZXMgcG9zaXRpb24gZnJvbSBpdHMga2V5XG4gICAgICAgICAgICAgICAgICAgIHZhciBrQXJyID0ga2V5LnNwbGl0KCc6Jyk7XG4gICAgICAgICAgICAgICAgICAgIHZhciB4ID0gcGFyc2VJbnQoa0FyclswXSwgMTApO1xuICAgICAgICAgICAgICAgICAgICB2YXIgeSA9IHBhcnNlSW50KGtBcnJbMV0sIDEwKTtcbiAgICAgICAgICAgICAgICAgICAgLy8gY3JlYXRlIG1vZGVsIG1hdHJpeFxuICAgICAgICAgICAgICAgICAgICB2YXIgbW9kZWwgPSBuZXcgdHJhbnNsYXRpb25NYXRyaXgoW1xuICAgICAgICAgICAgICAgICAgICAgICAgMjU2ICogeCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRpbSAtICgyNTYgKiB5KSxcbiAgICAgICAgICAgICAgICAgICAgICAgIDBcbiAgICAgICAgICAgICAgICAgICAgXSk7XG4gICAgICAgICAgICAgICAgICAgIHNlbGYuX3NoYWRlci5zZXRVbmlmb3JtKCd1TW9kZWxNYXRyaXgnLCBtb2RlbCk7XG4gICAgICAgICAgICAgICAgICAgIC8vIGRyYXcgdGhlIHRpbGVcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5fcmVuZGVyYWJsZS5kcmF3KCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAvLyBubyBuZWVkIHRvIHVuYmluZCB0ZXh0dXJlXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcblxuICAgICAgICByZXF1ZXN0VGlsZTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAvLyBvdmVycmlkZVxuICAgICAgICB9XG5cbiAgICB9KTtcblxuICAgIG1vZHVsZS5leHBvcnRzID0gV2ViR0w7XG5cbn0oKSk7XG4iLCIoZnVuY3Rpb24oKSB7XG5cbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICAvLyBjYW52YXMgcmVuZGVyZXJzXG4gICAgdmFyIENhbnZhcyA9IHtcbiAgICAgICAgSGVhdG1hcDogcmVxdWlyZSgnLi90eXBlcy9jYW52YXMvSGVhdG1hcCcpXG4gICAgfTtcblxuICAgIC8vIGh0bWwgcmVuZGVyZXJzXG4gICAgdmFyIEhUTUwgPSB7XG4gICAgICAgIEhlYXRtYXA6IHJlcXVpcmUoJy4vdHlwZXMvaHRtbC9IZWF0bWFwJyksXG4gICAgICAgIFJpbmc6IHJlcXVpcmUoJy4vdHlwZXMvaHRtbC9SaW5nJyksXG4gICAgICAgIFdvcmRDbG91ZDogcmVxdWlyZSgnLi90eXBlcy9odG1sL1dvcmRDbG91ZCcpLFxuICAgICAgICBXb3JkSGlzdG9ncmFtOiByZXF1aXJlKCcuL3R5cGVzL2h0bWwvV29yZEhpc3RvZ3JhbScpXG4gICAgfTtcblxuICAgIC8vIHdlYmdsIHJlbmRlcmVyc1xuICAgIHZhciBXZWJHTCA9IHtcbiAgICAgICAgSGVhdG1hcDogcmVxdWlyZSgnLi90eXBlcy93ZWJnbC9IZWF0bWFwJylcbiAgICB9O1xuXG4gICAgLy8gcGVuZGluZyBsYXllciByZW5kZXJlcnNcbiAgICB2YXIgUGVuZGluZyA9IHtcbiAgICAgICAgQmxpbms6IHJlcXVpcmUoJy4vdHlwZXMvcGVuZGluZy9CbGluaycpLFxuICAgICAgICBTcGluOiByZXF1aXJlKCcuL3R5cGVzL3BlbmRpbmcvU3BpbicpLFxuICAgICAgICBCbGlua1NwaW46IHJlcXVpcmUoJy4vdHlwZXMvcGVuZGluZy9CbGlua1NwaW4nKSxcbiAgICB9O1xuXG4gICAgLy8gcGVuZGluZyBsYXllciByZW5kZXJlcnNcbiAgICB2YXIgRGVidWcgPSB7XG4gICAgICAgIENvb3JkOiByZXF1aXJlKCcuL3R5cGVzL2RlYnVnL0Nvb3JkJylcbiAgICB9O1xuXG4gICAgbW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgICAgIEhUTUw6IEhUTUwsXG4gICAgICAgIENhbnZhczogQ2FudmFzLFxuICAgICAgICBXZWJHTDogV2ViR0wsXG4gICAgICAgIERlYnVnOiBEZWJ1ZyxcbiAgICAgICAgUGVuZGluZzogUGVuZGluZ1xuICAgIH07XG5cbn0oKSk7XG4iLCIoZnVuY3Rpb24oKSB7XG5cbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICB2YXIgUE9TSVRJVkUgPSAnMSc7XG4gICAgdmFyIE5FVVRSQUwgPSAnMCc7XG4gICAgdmFyIE5FR0FUSVZFID0gJy0xJztcblxuICAgIGZ1bmN0aW9uIGdldENsYXNzRnVuYyhtaW4sIG1heCkge1xuICAgICAgICBtaW4gPSBtaW4gIT09IHVuZGVmaW5lZCA/IG1pbiA6IC0xO1xuICAgICAgICBtYXggPSBtYXggIT09IHVuZGVmaW5lZCA/IG1heCA6IDE7XG4gICAgICAgIHZhciBwb3NpdGl2ZSA9IFswLjI1ICogbWF4LCAwLjUgKiBtYXgsIDAuNzUgKiBtYXhdO1xuICAgICAgICB2YXIgbmVnYXRpdmUgPSBbLTAuMjUgKiBtaW4sIC0wLjUgKiBtaW4sIC0wLjc1ICogbWluXTtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKHNlbnRpbWVudCkge1xuICAgICAgICAgICAgdmFyIHByZWZpeDtcbiAgICAgICAgICAgIHZhciByYW5nZTtcbiAgICAgICAgICAgIGlmIChzZW50aW1lbnQgPCAwKSB7XG4gICAgICAgICAgICAgICAgcHJlZml4ID0gJ25lZy0nO1xuICAgICAgICAgICAgICAgIHJhbmdlID0gbmVnYXRpdmU7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHByZWZpeCA9ICdwb3MtJztcbiAgICAgICAgICAgICAgICByYW5nZSA9IHBvc2l0aXZlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIGFicyA9IE1hdGguYWJzKHNlbnRpbWVudCk7XG4gICAgICAgICAgICBpZiAoYWJzID4gcmFuZ2VbMl0pIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcHJlZml4ICsgJzQnO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChhYnMgPiByYW5nZVsxXSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBwcmVmaXggKyAnMyc7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGFicyA+IHJhbmdlWzBdKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHByZWZpeCArICcyJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBwcmVmaXggKyAnMSc7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0VG90YWwoY291bnQpIHtcbiAgICAgICAgaWYgKCFjb3VudCkge1xuICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHBvcyA9IGNvdW50W1BPU0lUSVZFXSA/IGNvdW50W1BPU0lUSVZFXSA6IDA7XG4gICAgICAgIHZhciBuZXUgPSBjb3VudFtORVVUUkFMXSA/IGNvdW50W05FVVRSQUxdIDogMDtcbiAgICAgICAgdmFyIG5lZyA9IGNvdW50W05FR0FUSVZFXSA/IGNvdW50W05FR0FUSVZFXSA6IDA7XG4gICAgICAgIHJldHVybiBwb3MgKyBuZXUgKyBuZWc7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0QXZnKGNvdW50KSB7XG4gICAgICAgIGlmICghY291bnQpIHtcbiAgICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICB9XG4gICAgICAgIHZhciBwb3MgPSBjb3VudFtQT1NJVElWRV0gPyBjb3VudFtQT1NJVElWRV0gOiAwO1xuICAgICAgICB2YXIgbmV1ID0gY291bnRbTkVVVFJBTF0gPyBjb3VudFtORVVUUkFMXSA6IDA7XG4gICAgICAgIHZhciBuZWcgPSBjb3VudFtORUdBVElWRV0gPyBjb3VudFtORUdBVElWRV0gOiAwO1xuICAgICAgICB2YXIgdG90YWwgPSBwb3MgKyBuZXUgKyBuZWc7XG4gICAgICAgIHJldHVybiAodG90YWwgIT09IDApID8gKHBvcyAtIG5lZykgLyB0b3RhbCA6IDA7XG4gICAgfVxuXG4gICAgbW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgICAgIGdldENsYXNzRnVuYzogZ2V0Q2xhc3NGdW5jLFxuICAgICAgICBnZXRUb3RhbDogZ2V0VG90YWwsXG4gICAgICAgIGdldEF2ZzogZ2V0QXZnXG4gICAgfTtcblxufSgpKTtcbiIsIihmdW5jdGlvbigpIHtcblxuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIHZhciBDYW52YXMgPSByZXF1aXJlKCcuLi8uLi9jb3JlL0NhbnZhcycpO1xuXG4gICAgdmFyIEhlYXRtYXAgPSBDYW52YXMuZXh0ZW5kKHtcblxuICAgICAgICByZW5kZXJDYW52YXM6IGZ1bmN0aW9uKGJpbnMsIHJlc29sdXRpb24sIHJhbXBGdW5jKSB7XG4gICAgICAgICAgICB2YXIgY2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG4gICAgICAgICAgICBjYW52YXMuaGVpZ2h0ID0gcmVzb2x1dGlvbjtcbiAgICAgICAgICAgIGNhbnZhcy53aWR0aCA9IHJlc29sdXRpb247XG4gICAgICAgICAgICB2YXIgY3R4ID0gY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG4gICAgICAgICAgICB2YXIgaW1hZ2VEYXRhID0gY3R4LmdldEltYWdlRGF0YSgwLCAwLCByZXNvbHV0aW9uLCByZXNvbHV0aW9uKTtcbiAgICAgICAgICAgIHZhciBkYXRhID0gaW1hZ2VEYXRhLmRhdGE7XG4gICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgICB2YXIgY29sb3IgPSBbMCwgMCwgMCwgMF07XG4gICAgICAgICAgICB2YXIgbnZhbCwgcnZhbCwgYmluLCBpO1xuICAgICAgICAgICAgZm9yIChpPTA7IGk8Ymlucy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIGJpbiA9IGJpbnNbaV07XG4gICAgICAgICAgICAgICAgaWYgKGJpbiA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICBjb2xvclswXSA9IDA7XG4gICAgICAgICAgICAgICAgICAgIGNvbG9yWzFdID0gMDtcbiAgICAgICAgICAgICAgICAgICAgY29sb3JbMl0gPSAwO1xuICAgICAgICAgICAgICAgICAgICBjb2xvclszXSA9IDA7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgbnZhbCA9IHNlbGYudHJhbnNmb3JtVmFsdWUoYmluKTtcbiAgICAgICAgICAgICAgICAgICAgcnZhbCA9IHNlbGYuaW50ZXJwb2xhdGVUb1JhbmdlKG52YWwpO1xuICAgICAgICAgICAgICAgICAgICByYW1wRnVuYyhydmFsLCBjb2xvcik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGRhdGFbaSAqIDRdID0gY29sb3JbMF07XG4gICAgICAgICAgICAgICAgZGF0YVtpICogNCArIDFdID0gY29sb3JbMV07XG4gICAgICAgICAgICAgICAgZGF0YVtpICogNCArIDJdID0gY29sb3JbMl07XG4gICAgICAgICAgICAgICAgZGF0YVtpICogNCArIDNdID0gY29sb3JbM107XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjdHgucHV0SW1hZ2VEYXRhKGltYWdlRGF0YSwgMCwgMCk7XG4gICAgICAgICAgICByZXR1cm4gY2FudmFzO1xuICAgICAgICB9LFxuXG4gICAgICAgIHJlbmRlclRpbGU6IGZ1bmN0aW9uKGNhbnZhcywgZGF0YSkge1xuICAgICAgICAgICAgaWYgKCFkYXRhKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIGJpbnMgPSBuZXcgRmxvYXQ2NEFycmF5KGRhdGEpO1xuICAgICAgICAgICAgdmFyIHJlc29sdXRpb24gPSBNYXRoLnNxcnQoYmlucy5sZW5ndGgpO1xuICAgICAgICAgICAgdmFyIHJhbXAgPSB0aGlzLmdldENvbG9yUmFtcCgpO1xuICAgICAgICAgICAgdmFyIHRpbGVDYW52YXMgPSB0aGlzLnJlbmRlckNhbnZhcyhiaW5zLCByZXNvbHV0aW9uLCByYW1wKTtcbiAgICAgICAgICAgIHZhciBjdHggPSBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcbiAgICAgICAgICAgIGN0eC5pbWFnZVNtb290aGluZ0VuYWJsZWQgPSBmYWxzZTtcbiAgICAgICAgICAgIGN0eC5kcmF3SW1hZ2UoXG4gICAgICAgICAgICAgICAgdGlsZUNhbnZhcyxcbiAgICAgICAgICAgICAgICAwLCAwLFxuICAgICAgICAgICAgICAgIHJlc29sdXRpb24sIHJlc29sdXRpb24sXG4gICAgICAgICAgICAgICAgMCwgMCxcbiAgICAgICAgICAgICAgICBjYW52YXMud2lkdGgsIGNhbnZhcy5oZWlnaHQpO1xuICAgICAgICB9XG5cbiAgICB9KTtcblxuICAgIG1vZHVsZS5leHBvcnRzID0gSGVhdG1hcDtcblxufSgpKTtcbiIsIihmdW5jdGlvbigpIHtcblxuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIG1vZHVsZS5leHBvcnRzID0ge1xuXG4gICAgICAgIHJlbmRlclRpbGU6IGZ1bmN0aW9uKGVsZW0sIGNvb3JkKSB7XG4gICAgICAgICAgICAkKGVsZW0pLmVtcHR5KCk7XG4gICAgICAgICAgICAkKGVsZW0pLmFwcGVuZCgnPGRpdiBzdHlsZT1cInRvcDowOyBsZWZ0OjA7XCI+JyArIGNvb3JkLnogKyAnLCAnICsgY29vcmQueCArICcsICcgKyBjb29yZC55ICsgJzwvZGl2PicpO1xuICAgICAgICB9XG5cbiAgICB9O1xuXG59KCkpO1xuIiwiKGZ1bmN0aW9uKCkge1xuXG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgdmFyIEhUTUwgPSByZXF1aXJlKCcuLi8uLi9jb3JlL0hUTUwnKTtcblxuICAgIHZhciBUSUxFX1NJWkUgPSAyNTY7XG5cbiAgICB2YXIgSGVhdG1hcCA9IEhUTUwuZXh0ZW5kKHtcblxuICAgICAgICBpc1RhcmdldExheWVyOiBmdW5jdGlvbiggZWxlbSApIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9jb250YWluZXIgJiYgJC5jb250YWlucyh0aGlzLl9jb250YWluZXIsIGVsZW0gKTtcbiAgICAgICAgfSxcblxuICAgICAgICBjbGVhclNlbGVjdGlvbjogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAkKHRoaXMuX2NvbnRhaW5lcikucmVtb3ZlQ2xhc3MoJ2hpZ2hsaWdodCcpO1xuICAgICAgICAgICAgdGhpcy5oaWdobGlnaHQgPSBudWxsO1xuICAgICAgICB9LFxuXG4gICAgICAgIG9uTW91c2VPdmVyOiBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICB2YXIgdGFyZ2V0ID0gJChlLm9yaWdpbmFsRXZlbnQudGFyZ2V0KTtcbiAgICAgICAgICAgIHZhciB2YWx1ZSA9IHRhcmdldC5hdHRyKCdkYXRhLXZhbHVlJyk7XG4gICAgICAgICAgICBpZiAodmFsdWUpIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5vcHRpb25zLmhhbmRsZXJzLm1vdXNlb3Zlcikge1xuICAgICAgICAgICAgICAgICAgICB2YXIgJHBhcmVudCA9IHRhcmdldC5wYXJlbnRzKCcubGVhZmxldC1odG1sLXRpbGUnKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5vcHRpb25zLmhhbmRsZXJzLm1vdXNlb3Zlcih0YXJnZXQsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiBwYXJzZUludCh2YWx1ZSwgMTApLFxuICAgICAgICAgICAgICAgICAgICAgICAgeDogcGFyc2VJbnQoJHBhcmVudC5hdHRyKCdkYXRhLXgnKSwgMTApLFxuICAgICAgICAgICAgICAgICAgICAgICAgeTogcGFyc2VJbnQoJHBhcmVudC5hdHRyKCdkYXRhLXknKSwgMTApLFxuICAgICAgICAgICAgICAgICAgICAgICAgejogdGhpcy5fbWFwLmdldFpvb20oKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGJ4OiBwYXJzZUludCh0YXJnZXQuYXR0cignZGF0YS1ieCcpLCAxMCksXG4gICAgICAgICAgICAgICAgICAgICAgICBieTogcGFyc2VJbnQodGFyZ2V0LmF0dHIoJ2RhdGEtYnknKSwgMTApLFxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2hlYXRtYXAnLFxuICAgICAgICAgICAgICAgICAgICAgICAgbGF5ZXI6IHRoaXNcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIG9uTW91c2VPdXQ6IGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgIHZhciB0YXJnZXQgPSAkKGUub3JpZ2luYWxFdmVudC50YXJnZXQpO1xuICAgICAgICAgICAgdmFyIHZhbHVlID0gdGFyZ2V0LmF0dHIoJ2RhdGEtdmFsdWUnKTtcbiAgICAgICAgICAgIGlmICh2YWx1ZSkge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLm9wdGlvbnMuaGFuZGxlcnMubW91c2VvdXQpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyICRwYXJlbnQgPSB0YXJnZXQucGFyZW50cygnLmxlYWZsZXQtaHRtbC10aWxlJyk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMub3B0aW9ucy5oYW5kbGVycy5tb3VzZW91dCh0YXJnZXQsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiB2YWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHg6IHBhcnNlSW50KCRwYXJlbnQuYXR0cignZGF0YS14JyksIDEwKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHk6IHBhcnNlSW50KCRwYXJlbnQuYXR0cignZGF0YS15JyksIDEwKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHo6IHRoaXMuX21hcC5nZXRab29tKCksXG4gICAgICAgICAgICAgICAgICAgICAgICBieDogcGFyc2VJbnQodGFyZ2V0LmF0dHIoJ2RhdGEtYngnKSwgMTApLFxuICAgICAgICAgICAgICAgICAgICAgICAgYnk6IHBhcnNlSW50KHRhcmdldC5hdHRyKCdkYXRhLWJ5JyksIDEwKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdoZWF0bWFwJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGxheWVyOiB0aGlzXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICBvbkNsaWNrOiBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICAvLyB1bi1zZWxlY3QgYW55IHByZXYgc2VsZWN0ZWQgcGl4ZWxcbiAgICAgICAgICAgICQoJy5oZWF0bWFwLXBpeGVsJykucmVtb3ZlQ2xhc3MoJ2hpZ2hsaWdodCcpO1xuICAgICAgICAgICAgLy8gZ2V0IHRhcmdldFxuICAgICAgICAgICAgdmFyIHRhcmdldCA9ICQoZS5vcmlnaW5hbEV2ZW50LnRhcmdldCk7XG4gICAgICAgICAgICBpZiAoIXRoaXMuaXNUYXJnZXRMYXllcihlLm9yaWdpbmFsRXZlbnQudGFyZ2V0KSkge1xuICAgICAgICAgICAgICAgIC8vIHRoaXMgbGF5ZXIgaXMgbm90IHRoZSB0YXJnZXRcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIHRhcmdldC5oYXNDbGFzcygnaGVhdG1hcC1waXhlbCcpICkge1xuICAgICAgICAgICAgICAgIHRhcmdldC5hZGRDbGFzcygnaGlnaGxpZ2h0Jyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgdmFsdWUgPSB0YXJnZXQuYXR0cignZGF0YS12YWx1ZScpO1xuICAgICAgICAgICAgaWYgKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMub3B0aW9ucy5oYW5kbGVycy5jbGljaykge1xuICAgICAgICAgICAgICAgICAgICB2YXIgJHBhcmVudCA9IHRhcmdldC5wYXJlbnRzKCcubGVhZmxldC1odG1sLXRpbGUnKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5vcHRpb25zLmhhbmRsZXJzLmNsaWNrKHRhcmdldCwge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHZhbHVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgeDogcGFyc2VJbnQoJHBhcmVudC5hdHRyKCdkYXRhLXgnKSwgMTApLFxuICAgICAgICAgICAgICAgICAgICAgICAgeTogcGFyc2VJbnQoJHBhcmVudC5hdHRyKCdkYXRhLXknKSwgMTApLFxuICAgICAgICAgICAgICAgICAgICAgICAgejogdGhpcy5fbWFwLmdldFpvb20oKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGJ4OiBwYXJzZUludCh0YXJnZXQuYXR0cignZGF0YS1ieCcpLCAxMCksXG4gICAgICAgICAgICAgICAgICAgICAgICBieTogcGFyc2VJbnQodGFyZ2V0LmF0dHIoJ2RhdGEtYnknKSwgMTApLFxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2hlYXRtYXAnLFxuICAgICAgICAgICAgICAgICAgICAgICAgbGF5ZXI6IHRoaXNcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIHJlbmRlclRpbGU6IGZ1bmN0aW9uKGNvbnRhaW5lciwgZGF0YSkge1xuICAgICAgICAgICAgaWYgKCFkYXRhKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIGJpbnMgPSBuZXcgRmxvYXQ2NEFycmF5KGRhdGEpO1xuICAgICAgICAgICAgdmFyIHJlc29sdXRpb24gPSBNYXRoLnNxcnQoYmlucy5sZW5ndGgpO1xuICAgICAgICAgICAgdmFyIHJhbXBGdW5jID0gdGhpcy5nZXRDb2xvclJhbXAoKTtcbiAgICAgICAgICAgIHZhciBwaXhlbFNpemUgPSBUSUxFX1NJWkUgLyByZXNvbHV0aW9uO1xuICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAgICAgdmFyIGNvbG9yID0gWzAsIDAsIDAsIDBdO1xuICAgICAgICAgICAgdmFyIGh0bWwgPSAnJztcbiAgICAgICAgICAgIHZhciBudmFsLCBydmFsLCBiaW47XG4gICAgICAgICAgICB2YXIgbGVmdCwgdG9wO1xuICAgICAgICAgICAgdmFyIGk7XG4gICAgICAgICAgICBmb3IgKGk9MDsgaTxiaW5zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgYmluID0gYmluc1tpXTtcbiAgICAgICAgICAgICAgICBpZiAoYmluID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGxlZnQgPSAoaSAlIHJlc29sdXRpb24pO1xuICAgICAgICAgICAgICAgICAgICB0b3AgPSBNYXRoLmZsb29yKGkgLyByZXNvbHV0aW9uKTtcbiAgICAgICAgICAgICAgICAgICAgbnZhbCA9IHNlbGYudHJhbnNmb3JtVmFsdWUoYmluKTtcbiAgICAgICAgICAgICAgICAgICAgcnZhbCA9IHNlbGYuaW50ZXJwb2xhdGVUb1JhbmdlKG52YWwpO1xuICAgICAgICAgICAgICAgICAgICByYW1wRnVuYyhydmFsLCBjb2xvcik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhciByZ2JhID0gJ3JnYmEoJyArXG4gICAgICAgICAgICAgICAgICAgIGNvbG9yWzBdICsgJywnICtcbiAgICAgICAgICAgICAgICAgICAgY29sb3JbMV0gKyAnLCcgK1xuICAgICAgICAgICAgICAgICAgICBjb2xvclsyXSArICcsJyArXG4gICAgICAgICAgICAgICAgICAgIChjb2xvclszXSAvIDI1NSkgKyAnKSc7XG4gICAgICAgICAgICAgICAgaHRtbCArPSAnPGRpdiBjbGFzcz1cImhlYXRtYXAtcGl4ZWxcIiAnICtcbiAgICAgICAgICAgICAgICAgICAgJ2RhdGEtdmFsdWU9XCInICsgYmluICsgJ1wiICcgK1xuICAgICAgICAgICAgICAgICAgICAnZGF0YS1ieD1cIicgKyBsZWZ0ICsgJ1wiICcgK1xuICAgICAgICAgICAgICAgICAgICAnZGF0YS1ieT1cIicgKyB0b3AgKyAnXCIgJyArXG4gICAgICAgICAgICAgICAgICAgICdzdHlsZT1cIicgK1xuICAgICAgICAgICAgICAgICAgICAnaGVpZ2h0OicgKyBwaXhlbFNpemUgKyAncHg7JyArXG4gICAgICAgICAgICAgICAgICAgICd3aWR0aDonICsgcGl4ZWxTaXplICsgJ3B4OycgK1xuICAgICAgICAgICAgICAgICAgICAnbGVmdDonICsgKGxlZnQgKiBwaXhlbFNpemUpICsgJ3B4OycgK1xuICAgICAgICAgICAgICAgICAgICAndG9wOicgKyAodG9wICogcGl4ZWxTaXplKSArICdweDsnICtcbiAgICAgICAgICAgICAgICAgICAgJ2JhY2tncm91bmQtY29sb3I6JyArIHJnYmEgKyAnO1wiPjwvZGl2Pic7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb250YWluZXIuaW5uZXJIVE1MID0gaHRtbDtcbiAgICAgICAgfVxuXG4gICAgfSk7XG5cbiAgICBtb2R1bGUuZXhwb3J0cyA9IEhlYXRtYXA7XG5cbn0oKSk7XG4iLCIoZnVuY3Rpb24oKSB7XG5cbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICB2YXIgSFRNTCA9IHJlcXVpcmUoJy4uLy4uL2NvcmUvSFRNTCcpO1xuXG4gICAgdmFyIFRJTEVfU0laRSA9IDI1NjtcblxuICAgIHZhciBIZWF0bWFwID0gSFRNTC5leHRlbmQoe1xuXG4gICAgICAgIG9uQ2xpY2s6IGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgIHZhciB0YXJnZXQgPSAkKGUub3JpZ2luYWxFdmVudC50YXJnZXQpO1xuICAgICAgICAgICAgJCgnLmhlYXRtYXAtcmluZycpLnJlbW92ZUNsYXNzKCdoaWdobGlnaHQnKTtcbiAgICAgICAgICAgIGlmICggdGFyZ2V0Lmhhc0NsYXNzKCdoZWF0bWFwLXJpbmcnKSApIHtcbiAgICAgICAgICAgICAgICB0YXJnZXQuYWRkQ2xhc3MoJ2hpZ2hsaWdodCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIHJlbmRlclRpbGU6IGZ1bmN0aW9uKGNvbnRhaW5lciwgZGF0YSkge1xuICAgICAgICAgICAgaWYgKCFkYXRhKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAgICAgdmFyIGJpbnMgPSBuZXcgRmxvYXQ2NEFycmF5KGRhdGEpO1xuICAgICAgICAgICAgdmFyIHJlc29sdXRpb24gPSBNYXRoLnNxcnQoYmlucy5sZW5ndGgpO1xuICAgICAgICAgICAgdmFyIGJpblNpemUgPSAoVElMRV9TSVpFIC8gcmVzb2x1dGlvbik7XG4gICAgICAgICAgICB2YXIgaHRtbCA9ICcnO1xuICAgICAgICAgICAgYmlucy5mb3JFYWNoKGZ1bmN0aW9uKGJpbiwgaW5kZXgpIHtcbiAgICAgICAgICAgICAgICBpZiAoIWJpbikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhciBwZXJjZW50ID0gc2VsZi50cmFuc2Zvcm1WYWx1ZShiaW4pO1xuICAgICAgICAgICAgICAgIHZhciByYWRpdXMgPSBwZXJjZW50ICogYmluU2l6ZTtcbiAgICAgICAgICAgICAgICB2YXIgb2Zmc2V0ID0gKGJpblNpemUgLSByYWRpdXMpIC8gMjtcbiAgICAgICAgICAgICAgICB2YXIgbGVmdCA9IChpbmRleCAlIHJlc29sdXRpb24pICogYmluU2l6ZTtcbiAgICAgICAgICAgICAgICB2YXIgdG9wID0gTWF0aC5mbG9vcihpbmRleCAvIHJlc29sdXRpb24pICogYmluU2l6ZTtcbiAgICAgICAgICAgICAgICBodG1sICs9ICc8ZGl2IGNsYXNzPVwiaGVhdG1hcC1yaW5nXCIgc3R5bGU9XCInICtcbiAgICAgICAgICAgICAgICAgICAgJ2xlZnQ6JyArIChsZWZ0ICsgb2Zmc2V0KSArICdweDsnICtcbiAgICAgICAgICAgICAgICAgICAgJ3RvcDonICsgKHRvcCArIG9mZnNldCkgKyAncHg7JyArXG4gICAgICAgICAgICAgICAgICAgICd3aWR0aDonICsgcmFkaXVzICsgJ3B4OycgK1xuICAgICAgICAgICAgICAgICAgICAnaGVpZ2h0OicgKyByYWRpdXMgKyAncHg7JyArXG4gICAgICAgICAgICAgICAgICAgICdcIj48L2Rpdj4nO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBjb250YWluZXIuaW5uZXJIVE1MID0gaHRtbDtcbiAgICAgICAgfVxuXG4gICAgfSk7XG5cbiAgICBtb2R1bGUuZXhwb3J0cyA9IEhlYXRtYXA7XG5cbn0oKSk7XG4iLCIoZnVuY3Rpb24oKSB7XG5cbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICB2YXIgSFRNTCA9IHJlcXVpcmUoJy4uLy4uL2NvcmUvSFRNTCcpO1xuICAgIHZhciBzZW50aW1lbnQgPSByZXF1aXJlKCcuLi8uLi9zZW50aW1lbnQvU2VudGltZW50Jyk7XG4gICAgdmFyIHNlbnRpbWVudEZ1bmMgPSBzZW50aW1lbnQuZ2V0Q2xhc3NGdW5jKC0xLCAxKTtcblxuICAgIHZhciBUSUxFX1NJWkUgPSAyNTY7XG4gICAgdmFyIEhBTEZfU0laRSA9IFRJTEVfU0laRSAvIDI7XG4gICAgdmFyIFZFUlRJQ0FMX09GRlNFVCA9IDI0O1xuICAgIHZhciBIT1JJWk9OVEFMX09GRlNFVCA9IDEwO1xuICAgIHZhciBNQVhfTlVNX1dPUkRTID0gMTU7XG4gICAgdmFyIE1JTl9GT05UX1NJWkUgPSAxMDtcbiAgICB2YXIgTUFYX0ZPTlRfU0laRSA9IDIwO1xuICAgIHZhciBOVU1fQVRURU1QVFMgPSAxO1xuXG4gICAgLyoqXG4gICAgICogR2l2ZW4gYW4gaW5pdGlhbCBwb3NpdGlvbiwgcmV0dXJuIGEgbmV3IHBvc2l0aW9uLCBpbmNyZW1lbnRhbGx5IHNwaXJhbGxlZFxuICAgICAqIG91dHdhcmRzLlxuICAgICAqL1xuICAgIHZhciBzcGlyYWxQb3NpdGlvbiA9IGZ1bmN0aW9uKHBvcykge1xuICAgICAgICB2YXIgcGkyID0gMiAqIE1hdGguUEk7XG4gICAgICAgIHZhciBjaXJjID0gcGkyICogcG9zLnJhZGl1cztcbiAgICAgICAgdmFyIGluYyA9IChwb3MuYXJjTGVuZ3RoID4gY2lyYyAvIDEwKSA/IGNpcmMgLyAxMCA6IHBvcy5hcmNMZW5ndGg7XG4gICAgICAgIHZhciBkYSA9IGluYyAvIHBvcy5yYWRpdXM7XG4gICAgICAgIHZhciBudCA9IChwb3MudCArIGRhKTtcbiAgICAgICAgaWYgKG50ID4gcGkyKSB7XG4gICAgICAgICAgICBudCA9IG50ICUgcGkyO1xuICAgICAgICAgICAgcG9zLnJhZGl1cyA9IHBvcy5yYWRpdXMgKyBwb3MucmFkaXVzSW5jO1xuICAgICAgICB9XG4gICAgICAgIHBvcy50ID0gbnQ7XG4gICAgICAgIHBvcy54ID0gcG9zLnJhZGl1cyAqIE1hdGguY29zKG50KTtcbiAgICAgICAgcG9zLnkgPSBwb3MucmFkaXVzICogTWF0aC5zaW4obnQpO1xuICAgICAgICByZXR1cm4gcG9zO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiAgUmV0dXJucyB0cnVlIGlmIGJvdW5kaW5nIGJveCBhIGludGVyc2VjdHMgYm91bmRpbmcgYm94IGJcbiAgICAgKi9cbiAgICB2YXIgaW50ZXJzZWN0VGVzdCA9IGZ1bmN0aW9uKGEsIGIpIHtcbiAgICAgICAgcmV0dXJuIChNYXRoLmFicyhhLnggLSBiLngpICogMiA8IChhLndpZHRoICsgYi53aWR0aCkpICYmXG4gICAgICAgICAgICAoTWF0aC5hYnMoYS55IC0gYi55KSAqIDIgPCAoYS5oZWlnaHQgKyBiLmhlaWdodCkpO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiAgUmV0dXJucyB0cnVlIGlmIGJvdW5kaW5nIGJveCBhIGlzIG5vdCBmdWxseSBjb250YWluZWQgaW5zaWRlIGJvdW5kaW5nIGJveCBiXG4gICAgICovXG4gICAgdmFyIG92ZXJsYXBUZXN0ID0gZnVuY3Rpb24oYSwgYikge1xuICAgICAgICByZXR1cm4gKGEueCArIGEud2lkdGggLyAyID4gYi54ICsgYi53aWR0aCAvIDIgfHxcbiAgICAgICAgICAgIGEueCAtIGEud2lkdGggLyAyIDwgYi54IC0gYi53aWR0aCAvIDIgfHxcbiAgICAgICAgICAgIGEueSArIGEuaGVpZ2h0IC8gMiA+IGIueSArIGIuaGVpZ2h0IC8gMiB8fFxuICAgICAgICAgICAgYS55IC0gYS5oZWlnaHQgLyAyIDwgYi55IC0gYi5oZWlnaHQgLyAyKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogQ2hlY2sgaWYgYSB3b3JkIGludGVyc2VjdHMgYW5vdGhlciB3b3JkLCBvciBpcyBub3QgZnVsbHkgY29udGFpbmVkIGluIHRoZVxuICAgICAqIHRpbGUgYm91bmRpbmcgYm94XG4gICAgICovXG4gICAgdmFyIGludGVyc2VjdFdvcmQgPSBmdW5jdGlvbihwb3NpdGlvbiwgd29yZCwgY2xvdWQsIGJiKSB7XG4gICAgICAgIHZhciBib3ggPSB7XG4gICAgICAgICAgICB4OiBwb3NpdGlvbi54LFxuICAgICAgICAgICAgeTogcG9zaXRpb24ueSxcbiAgICAgICAgICAgIGhlaWdodDogd29yZC5oZWlnaHQsXG4gICAgICAgICAgICB3aWR0aDogd29yZC53aWR0aFxuICAgICAgICB9O1xuICAgICAgICB2YXIgaTtcbiAgICAgICAgZm9yIChpID0gMDsgaSA8IGNsb3VkLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBpZiAoaW50ZXJzZWN0VGVzdChib3gsIGNsb3VkW2ldKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vIG1ha2Ugc3VyZSBpdCBkb2Vzbid0IGludGVyc2VjdCB0aGUgYm9yZGVyO1xuICAgICAgICBpZiAob3ZlcmxhcFRlc3QoYm94LCBiYikpIHtcbiAgICAgICAgICAgIC8vIGlmIGl0IGhpdHMgYSBib3JkZXIsIGluY3JlbWVudCBjb2xsaXNpb24gY291bnRcbiAgICAgICAgICAgIC8vIGFuZCBleHRlbmQgYXJjIGxlbmd0aFxuICAgICAgICAgICAgcG9zaXRpb24uY29sbGlzaW9ucysrO1xuICAgICAgICAgICAgcG9zaXRpb24uYXJjTGVuZ3RoID0gcG9zaXRpb24ucmFkaXVzO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH07XG5cbiAgICB2YXIgV29yZENsb3VkID0gSFRNTC5leHRlbmQoe1xuXG4gICAgICAgIGlzVGFyZ2V0TGF5ZXI6IGZ1bmN0aW9uKCBlbGVtICkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2NvbnRhaW5lciAmJiAkLmNvbnRhaW5zKHRoaXMuX2NvbnRhaW5lciwgZWxlbSApO1xuICAgICAgICB9LFxuXG4gICAgICAgIGNsZWFyU2VsZWN0aW9uOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICQodGhpcy5fY29udGFpbmVyKS5yZW1vdmVDbGFzcygnaGlnaGxpZ2h0Jyk7XG4gICAgICAgICAgICB0aGlzLmhpZ2hsaWdodCA9IG51bGw7XG4gICAgICAgIH0sXG5cbiAgICAgICAgb25Nb3VzZU92ZXI6IGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgIHZhciB0YXJnZXQgPSAkKGUub3JpZ2luYWxFdmVudC50YXJnZXQpO1xuICAgICAgICAgICAgJCgnLndvcmQtY2xvdWQtbGFiZWwnKS5yZW1vdmVDbGFzcygnaG92ZXInKTtcbiAgICAgICAgICAgIHZhciB3b3JkID0gdGFyZ2V0LmF0dHIoJ2RhdGEtd29yZCcpO1xuICAgICAgICAgICAgaWYgKHdvcmQpIHtcbiAgICAgICAgICAgICAgICAkKCcud29yZC1jbG91ZC1sYWJlbFtkYXRhLXdvcmQ9JyArIHdvcmQgKyAnXScpLmFkZENsYXNzKCdob3ZlcicpO1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLm9wdGlvbnMuaGFuZGxlcnMubW91c2VvdmVyKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciAkcGFyZW50ID0gdGFyZ2V0LnBhcmVudHMoJy5sZWFmbGV0LWh0bWwtdGlsZScpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLm9wdGlvbnMuaGFuZGxlcnMubW91c2VvdmVyKHRhcmdldCwge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHdvcmQsXG4gICAgICAgICAgICAgICAgICAgICAgICB4OiBwYXJzZUludCgkcGFyZW50LmF0dHIoJ2RhdGEteCcpLCAxMCksXG4gICAgICAgICAgICAgICAgICAgICAgICB5OiBwYXJzZUludCgkcGFyZW50LmF0dHIoJ2RhdGEteScpLCAxMCksXG4gICAgICAgICAgICAgICAgICAgICAgICB6OiB0aGlzLl9tYXAuZ2V0Wm9vbSgpLFxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3dvcmQtY2xvdWQnLFxuICAgICAgICAgICAgICAgICAgICAgICAgbGF5ZXI6IHRoaXNcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIG9uTW91c2VPdXQ6IGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgIHZhciB0YXJnZXQgPSAkKGUub3JpZ2luYWxFdmVudC50YXJnZXQpO1xuICAgICAgICAgICAgJCgnLndvcmQtY2xvdWQtbGFiZWwnKS5yZW1vdmVDbGFzcygnaG92ZXInKTtcbiAgICAgICAgICAgIHZhciB3b3JkID0gdGFyZ2V0LmF0dHIoJ2RhdGEtd29yZCcpO1xuICAgICAgICAgICAgaWYgKHdvcmQpIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5vcHRpb25zLmhhbmRsZXJzLm1vdXNlb3V0KSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciAkcGFyZW50ID0gdGFyZ2V0LnBhcmVudHMoJy5sZWFmbGV0LWh0bWwtdGlsZScpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLm9wdGlvbnMuaGFuZGxlcnMubW91c2VvdXQodGFyZ2V0LCB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogd29yZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHg6IHBhcnNlSW50KCRwYXJlbnQuYXR0cignZGF0YS14JyksIDEwKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHk6IHBhcnNlSW50KCRwYXJlbnQuYXR0cignZGF0YS15JyksIDEwKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHo6IHRoaXMuX21hcC5nZXRab29tKCksXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnd29yZC1jbG91ZCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBsYXllcjogdGhpc1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgb25DbGljazogZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgLy8gdW4tc2VsZWN0IGFueSBwcmV2IHNlbGVjdGVkIHdvcmRzXG4gICAgICAgICAgICAkKCcud29yZC1jbG91ZC1sYWJlbCcpLnJlbW92ZUNsYXNzKCdoaWdobGlnaHQnKTtcbiAgICAgICAgICAgICQodGhpcy5fY29udGFpbmVyKS5yZW1vdmVDbGFzcygnaGlnaGxpZ2h0Jyk7XG4gICAgICAgICAgICAvLyBnZXQgdGFyZ2V0XG4gICAgICAgICAgICB2YXIgdGFyZ2V0ID0gJChlLm9yaWdpbmFsRXZlbnQudGFyZ2V0KTtcbiAgICAgICAgICAgIGlmICghdGhpcy5pc1RhcmdldExheWVyKGUub3JpZ2luYWxFdmVudC50YXJnZXQpKSB7XG4gICAgICAgICAgICAgICAgLy8gdGhpcyBsYXllciBpcyBub3QgdGhlIHRhcmdldFxuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciB3b3JkID0gdGFyZ2V0LmF0dHIoJ2RhdGEtd29yZCcpO1xuICAgICAgICAgICAgaWYgKHdvcmQpIHtcbiAgICAgICAgICAgICAgICAkKHRoaXMuX2NvbnRhaW5lcikuYWRkQ2xhc3MoJ2hpZ2hsaWdodCcpO1xuICAgICAgICAgICAgICAgICQoJy53b3JkLWNsb3VkLWxhYmVsW2RhdGEtd29yZD0nICsgd29yZCArICddJykuYWRkQ2xhc3MoJ2hpZ2hsaWdodCcpO1xuICAgICAgICAgICAgICAgIHRoaXMuaGlnaGxpZ2h0ID0gd29yZDtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5vcHRpb25zLmhhbmRsZXJzLmNsaWNrKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciAkcGFyZW50ID0gdGFyZ2V0LnBhcmVudHMoJy5sZWFmbGV0LWh0bWwtdGlsZScpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLm9wdGlvbnMuaGFuZGxlcnMuY2xpY2sodGFyZ2V0LCB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogd29yZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHg6IHBhcnNlSW50KCRwYXJlbnQuYXR0cignZGF0YS14JyksIDEwKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHk6IHBhcnNlSW50KCRwYXJlbnQuYXR0cignZGF0YS15JyksIDEwKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHo6IHRoaXMuX21hcC5nZXRab29tKCksXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnd29yZC1jbG91ZCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBsYXllcjogdGhpc1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuY2xlYXJTZWxlY3Rpb24oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICBfbWVhc3VyZVdvcmRzOiBmdW5jdGlvbih3b3JkQ291bnRzKSB7XG4gICAgICAgICAgICAvLyBzb3J0IHdvcmRzIGJ5IGZyZXF1ZW5jeVxuICAgICAgICAgICAgd29yZENvdW50cyA9IHdvcmRDb3VudHMuc29ydChmdW5jdGlvbihhLCBiKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGIuY291bnQgLSBhLmNvdW50O1xuICAgICAgICAgICAgfSkuc2xpY2UoMCwgTUFYX05VTV9XT1JEUyk7XG4gICAgICAgICAgICAvLyBidWlsZCBtZWFzdXJlbWVudCBodG1sXG4gICAgICAgICAgICB2YXIgaHRtbCA9ICc8ZGl2IHN0eWxlPVwiaGVpZ2h0OjI1NnB4OyB3aWR0aDoyNTZweDtcIj4nO1xuICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAgICAgd29yZENvdW50cy5mb3JFYWNoKGZ1bmN0aW9uKHdvcmQpIHtcbiAgICAgICAgICAgICAgICB3b3JkLnBlcmNlbnQgPSBzZWxmLnRyYW5zZm9ybVZhbHVlKHdvcmQuY291bnQpO1xuICAgICAgICAgICAgICAgIHdvcmQuZm9udFNpemUgPSBNSU5fRk9OVF9TSVpFICsgd29yZC5wZXJjZW50ICogKE1BWF9GT05UX1NJWkUgLSBNSU5fRk9OVF9TSVpFKTtcbiAgICAgICAgICAgICAgICBodG1sICs9ICc8ZGl2IGNsYXNzPVwid29yZC1jbG91ZC1sYWJlbFwiIHN0eWxlPVwiJyArXG4gICAgICAgICAgICAgICAgICAgICd2aXNpYmlsaXR5OmhpZGRlbjsnICtcbiAgICAgICAgICAgICAgICAgICAgJ2ZvbnQtc2l6ZTonICsgd29yZC5mb250U2l6ZSArICdweDtcIj4nICsgd29yZC50ZXh0ICsgJzwvZGl2Pic7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGh0bWwgKz0gJzwvZGl2Pic7XG4gICAgICAgICAgICAvLyBhcHBlbmQgbWVhc3VyZW1lbnRzXG4gICAgICAgICAgICB2YXIgJHRlbXAgPSAkKGh0bWwpO1xuICAgICAgICAgICAgJCgnYm9keScpLmFwcGVuZCgkdGVtcCk7XG4gICAgICAgICAgICAkdGVtcC5jaGlsZHJlbigpLmVhY2goZnVuY3Rpb24oaW5kZXgpIHtcbiAgICAgICAgICAgICAgICB3b3JkQ291bnRzW2luZGV4XS53aWR0aCA9IHRoaXMub2Zmc2V0V2lkdGg7XG4gICAgICAgICAgICAgICAgd29yZENvdW50c1tpbmRleF0uaGVpZ2h0ID0gdGhpcy5vZmZzZXRIZWlnaHQ7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICR0ZW1wLnJlbW92ZSgpO1xuICAgICAgICAgICAgcmV0dXJuIHdvcmRDb3VudHM7XG4gICAgICAgIH0sXG5cbiAgICAgICAgX2NyZWF0ZVdvcmRDbG91ZDogZnVuY3Rpb24od29yZENvdW50cykge1xuICAgICAgICAgICAgdmFyIGJvdW5kaW5nQm94ID0ge1xuICAgICAgICAgICAgICAgIHdpZHRoOiBUSUxFX1NJWkUgLSBIT1JJWk9OVEFMX09GRlNFVCAqIDIsXG4gICAgICAgICAgICAgICAgaGVpZ2h0OiBUSUxFX1NJWkUgLSBWRVJUSUNBTF9PRkZTRVQgKiAyLFxuICAgICAgICAgICAgICAgIHg6IDAsXG4gICAgICAgICAgICAgICAgeTogMFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHZhciBjbG91ZCA9IFtdO1xuICAgICAgICAgICAgLy8gc29ydCB3b3JkcyBieSBmcmVxdWVuY3lcbiAgICAgICAgICAgIHdvcmRDb3VudHMgPSB0aGlzLl9tZWFzdXJlV29yZHMod29yZENvdW50cyk7XG4gICAgICAgICAgICAvLyBhc3NlbWJsZSB3b3JkIGNsb3VkXG4gICAgICAgICAgICB3b3JkQ291bnRzLmZvckVhY2goZnVuY3Rpb24od29yZENvdW50KSB7XG4gICAgICAgICAgICAgICAgLy8gc3RhcnRpbmcgc3BpcmFsIHBvc2l0aW9uXG4gICAgICAgICAgICAgICAgdmFyIHBvcyA9IHtcbiAgICAgICAgICAgICAgICAgICAgcmFkaXVzOiAxLFxuICAgICAgICAgICAgICAgICAgICByYWRpdXNJbmM6IDUsXG4gICAgICAgICAgICAgICAgICAgIGFyY0xlbmd0aDogMTAsXG4gICAgICAgICAgICAgICAgICAgIHg6IDAsXG4gICAgICAgICAgICAgICAgICAgIHk6IDAsXG4gICAgICAgICAgICAgICAgICAgIHQ6IDAsXG4gICAgICAgICAgICAgICAgICAgIGNvbGxpc2lvbnM6IDBcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIC8vIHNwaXJhbCBvdXR3YXJkcyB0byBmaW5kIHBvc2l0aW9uXG4gICAgICAgICAgICAgICAgd2hpbGUgKHBvcy5jb2xsaXNpb25zIDwgTlVNX0FUVEVNUFRTKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGluY3JlbWVudCBwb3NpdGlvbiBpbiBhIHNwaXJhbFxuICAgICAgICAgICAgICAgICAgICBwb3MgPSBzcGlyYWxQb3NpdGlvbihwb3MpO1xuICAgICAgICAgICAgICAgICAgICAvLyB0ZXN0IGZvciBpbnRlcnNlY3Rpb25cbiAgICAgICAgICAgICAgICAgICAgaWYgKCFpbnRlcnNlY3RXb3JkKHBvcywgd29yZENvdW50LCBjbG91ZCwgYm91bmRpbmdCb3gpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjbG91ZC5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZXh0OiB3b3JkQ291bnQudGV4dCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb250U2l6ZTogd29yZENvdW50LmZvbnRTaXplLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBlcmNlbnQ6IE1hdGgucm91bmQoKHdvcmRDb3VudC5wZXJjZW50ICogMTAwKSAvIDEwKSAqIDEwLCAvLyByb3VuZCB0byBuZWFyZXN0IDEwXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgeDogcG9zLngsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgeTogcG9zLnksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgd2lkdGg6IHdvcmRDb3VudC53aWR0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBoZWlnaHQ6IHdvcmRDb3VudC5oZWlnaHQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VudGltZW50OiB3b3JkQ291bnQuc2VudGltZW50LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF2Zzogd29yZENvdW50LmF2Z1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuIGNsb3VkO1xuICAgICAgICB9LFxuXG4gICAgICAgIGV4dHJhY3RFeHRyZW1hOiBmdW5jdGlvbihkYXRhKSB7XG4gICAgICAgICAgICB2YXIgc3VtcyA9IF8ubWFwKGRhdGEsIGZ1bmN0aW9uKGNvdW50KSB7XG4gICAgICAgICAgICAgICAgaWYgKF8uaXNOdW1iZXIoY291bnQpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBjb3VudDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHNlbnRpbWVudC5nZXRUb3RhbChjb3VudCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgbWluOiBfLm1pbihzdW1zKSxcbiAgICAgICAgICAgICAgICBtYXg6IF8ubWF4KHN1bXMpLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSxcblxuICAgICAgICByZW5kZXJUaWxlOiBmdW5jdGlvbihjb250YWluZXIsIGRhdGEpIHtcbiAgICAgICAgICAgIGlmICghZGF0YSB8fCBfLmlzRW1wdHkoZGF0YSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgaGlnaGxpZ2h0ID0gdGhpcy5oaWdobGlnaHQ7XG4gICAgICAgICAgICB2YXIgd29yZENvdW50cyA9IF8ubWFwKGRhdGEsIGZ1bmN0aW9uKGNvdW50LCBrZXkpIHtcbiAgICAgICAgICAgICAgICBpZiAoXy5pc051bWJlcihjb3VudCkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvdW50OiBjb3VudCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHRleHQ6IGtleVxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2YXIgdG90YWwgPSBzZW50aW1lbnQuZ2V0VG90YWwoY291bnQpO1xuICAgICAgICAgICAgICAgIHZhciBhdmcgPSBzZW50aW1lbnQuZ2V0QXZnKGNvdW50KTtcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICBjb3VudDogdG90YWwsXG4gICAgICAgICAgICAgICAgICAgIHRleHQ6IGtleSxcbiAgICAgICAgICAgICAgICAgICAgYXZnOiBhdmcsXG4gICAgICAgICAgICAgICAgICAgIHNlbnRpbWVudDogc2VudGltZW50RnVuYyhhdmcpXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgLy8gZXhpdCBlYXJseSBpZiBubyB3b3Jkc1xuICAgICAgICAgICAgaWYgKHdvcmRDb3VudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gZ2VuZXJlYXRlIHRoZSBjbG91ZFxuICAgICAgICAgICAgdmFyIGNsb3VkID0gdGhpcy5fY3JlYXRlV29yZENsb3VkKHdvcmRDb3VudHMpO1xuICAgICAgICAgICAgLy8gYnVpbGQgaHRtbCBlbGVtZW50c1xuICAgICAgICAgICAgdmFyIGh0bWwgPSAnJztcbiAgICAgICAgICAgIGNsb3VkLmZvckVhY2goZnVuY3Rpb24od29yZCkge1xuICAgICAgICAgICAgICAgIC8vIGNyZWF0ZSBjbGFzc2VzXG4gICAgICAgICAgICAgICAgdmFyIGNsYXNzTmFtZXMgPSBbXG4gICAgICAgICAgICAgICAgICAgICd3b3JkLWNsb3VkLWxhYmVsJyxcbiAgICAgICAgICAgICAgICAgICAgJ3dvcmQtY2xvdWQtbGFiZWwtJyArIHdvcmQucGVyY2VudCxcbiAgICAgICAgICAgICAgICAgICAgd29yZC50ZXh0ID09PSBoaWdobGlnaHQgPyAnaGlnaGxpZ2h0JyA6ICcnLFxuICAgICAgICAgICAgICAgICAgICB3b3JkLnNlbnRpbWVudCA/IHdvcmQuc2VudGltZW50IDogJydcbiAgICAgICAgICAgICAgICBdLmpvaW4oJyAnKTtcbiAgICAgICAgICAgICAgICAvLyBjcmVhdGUgc3R5bGVzXG4gICAgICAgICAgICAgICAgdmFyIHN0eWxlcyA9IFtcbiAgICAgICAgICAgICAgICAgICAgJ2ZvbnQtc2l6ZTonICsgd29yZC5mb250U2l6ZSArICdweCcsXG4gICAgICAgICAgICAgICAgICAgICdsZWZ0OicgKyAoSEFMRl9TSVpFICsgd29yZC54IC0gKHdvcmQud2lkdGggLyAyKSkgKyAncHgnLFxuICAgICAgICAgICAgICAgICAgICAndG9wOicgKyAoSEFMRl9TSVpFICsgd29yZC55IC0gKHdvcmQuaGVpZ2h0IC8gMikpICsgJ3B4JyxcbiAgICAgICAgICAgICAgICAgICAgJ3dpZHRoOicgKyB3b3JkLndpZHRoICsgJ3B4JyxcbiAgICAgICAgICAgICAgICAgICAgJ2hlaWdodDonICsgd29yZC5oZWlnaHQgKyAncHgnLFxuICAgICAgICAgICAgICAgIF0uam9pbignOycpO1xuICAgICAgICAgICAgICAgIC8vIGNyZWF0ZSBodG1sIGZvciBlbnRyeVxuICAgICAgICAgICAgICAgIGh0bWwgKz0gJzxkaXYgY2xhc3M9XCInICsgY2xhc3NOYW1lcyArICdcIicgK1xuICAgICAgICAgICAgICAgICAgICAnc3R5bGU9XCInICsgc3R5bGVzICsgJ1wiJyArXG4gICAgICAgICAgICAgICAgICAgICdkYXRhLXNlbnRpbWVudD1cIicgKyB3b3JkLmF2ZyArICdcIicgK1xuICAgICAgICAgICAgICAgICAgICAnZGF0YS13b3JkPVwiJyArIHdvcmQudGV4dCArICdcIj4nICtcbiAgICAgICAgICAgICAgICAgICAgd29yZC50ZXh0ICtcbiAgICAgICAgICAgICAgICAgICAgJzwvZGl2Pic7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGNvbnRhaW5lci5pbm5lckhUTUwgPSBodG1sO1xuICAgICAgICB9XG5cbiAgICB9KTtcblxuICAgIG1vZHVsZS5leHBvcnRzID0gV29yZENsb3VkO1xuXG59KCkpO1xuIiwiKGZ1bmN0aW9uKCkge1xuXG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgdmFyIEhUTUwgPSByZXF1aXJlKCcuLi8uLi9jb3JlL0hUTUwnKTtcbiAgICB2YXIgc2VudGltZW50ID0gcmVxdWlyZSgnLi4vLi4vc2VudGltZW50L1NlbnRpbWVudCcpO1xuICAgIHZhciBzZW50aW1lbnRGdW5jID0gc2VudGltZW50LmdldENsYXNzRnVuYygtMSwgMSk7XG5cbiAgICB2YXIgVElMRV9TSVpFID0gMjU2O1xuICAgIHZhciBIQUxGX1NJWkUgPSBUSUxFX1NJWkUgLyAyO1xuICAgIHZhciBNQVhfTlVNX1dPUkRTID0gODtcbiAgICB2YXIgTUlOX0ZPTlRfU0laRSA9IDE2O1xuICAgIHZhciBNQVhfRk9OVF9TSVpFID0gMjI7XG5cbiAgICB2YXIgaXNTaW5nbGVWYWx1ZSA9IGZ1bmN0aW9uKGNvdW50KSB7XG4gICAgICAgIC8vIHNpbmdsZSB2YWx1ZXMgYXJlIG5ldmVyIG51bGwsIGFuZCBhbHdheXMgbnVtYmVyc1xuICAgICAgICByZXR1cm4gY291bnQgIT09IG51bGwgJiYgXy5pc051bWJlcihjb3VudCk7XG4gICAgfTtcblxuICAgIHZhciBleHRyYWN0Q291bnQgPSBmdW5jdGlvbihjb3VudCkge1xuICAgICAgICBpZiAoaXNTaW5nbGVWYWx1ZShjb3VudCkpIHtcbiAgICAgICAgICAgIHJldHVybiBjb3VudDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc2VudGltZW50LmdldFRvdGFsKGNvdW50KTtcbiAgICB9O1xuXG4gICAgdmFyIGV4dHJhY3RTZW50aW1lbnRDbGFzcyA9IGZ1bmN0aW9uKGF2Zykge1xuICAgICAgICBpZiAoYXZnICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHJldHVybiBzZW50aW1lbnRGdW5jKGF2Zyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICcnO1xuICAgIH07XG5cbiAgICB2YXIgZXh0cmFjdEZyZXF1ZW5jeSA9IGZ1bmN0aW9uKGNvdW50KSB7XG4gICAgICAgIGlmIChpc1NpbmdsZVZhbHVlKGNvdW50KSkge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBjb3VudDogY291bnRcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGNvdW50OiBzZW50aW1lbnQuZ2V0VG90YWwoY291bnQpLFxuICAgICAgICAgICAgYXZnOiBzZW50aW1lbnQuZ2V0QXZnKGNvdW50KVxuICAgICAgICB9O1xuICAgIH07XG5cbiAgICB2YXIgZXh0cmFjdEF2ZyA9IGZ1bmN0aW9uKGZyZXF1ZW5jaWVzKSB7XG4gICAgICAgIGlmIChmcmVxdWVuY2llc1swXS5hdmcgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHZhciBzdW0gPSBfLnN1bUJ5KGZyZXF1ZW5jaWVzLCBmdW5jdGlvbihmcmVxdWVuY3kpIHtcbiAgICAgICAgICAgIHJldHVybiBmcmVxdWVuY3kuYXZnO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHN1bSAvIGZyZXF1ZW5jaWVzLmxlbmd0aDtcbiAgICB9O1xuXG4gICAgdmFyIGV4dHJhY3RWYWx1ZXMgPSBmdW5jdGlvbihkYXRhLCBrZXkpIHtcbiAgICAgICAgdmFyIGZyZXF1ZW5jaWVzID0gXy5tYXAoZGF0YSwgZXh0cmFjdEZyZXF1ZW5jeSk7XG4gICAgICAgIHZhciBhdmcgPSBleHRyYWN0QXZnKGZyZXF1ZW5jaWVzKTtcbiAgICAgICAgdmFyIG1heCA9IF8ubWF4QnkoZnJlcXVlbmNpZXMsIGZ1bmN0aW9uKHZhbCkge1xuICAgICAgICAgICAgcmV0dXJuIHZhbC5jb3VudDtcbiAgICAgICAgfSkuY291bnQ7XG4gICAgICAgIHZhciB0b3RhbCA9IF8uc3VtQnkoZnJlcXVlbmNpZXMsIGZ1bmN0aW9uKHZhbCkge1xuICAgICAgICAgICAgcmV0dXJuIHZhbC5jb3VudDtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0b3BpYzoga2V5LFxuICAgICAgICAgICAgZnJlcXVlbmNpZXM6IGZyZXF1ZW5jaWVzLFxuICAgICAgICAgICAgbWF4OiBtYXgsXG4gICAgICAgICAgICB0b3RhbDogdG90YWwsXG4gICAgICAgICAgICBhdmc6IGF2Z1xuICAgICAgICB9O1xuICAgIH07XG5cbiAgICB2YXIgV29yZEhpc3RvZ3JhbSA9IEhUTUwuZXh0ZW5kKHtcblxuICAgICAgICBpc1RhcmdldExheWVyOiBmdW5jdGlvbiggZWxlbSApIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9jb250YWluZXIgJiYgJC5jb250YWlucyh0aGlzLl9jb250YWluZXIsIGVsZW0gKTtcbiAgICAgICAgfSxcblxuICAgICAgICBjbGVhclNlbGVjdGlvbjogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAkKHRoaXMuX2NvbnRhaW5lcikucmVtb3ZlQ2xhc3MoJ2hpZ2hsaWdodCcpO1xuICAgICAgICAgICAgdGhpcy5oaWdobGlnaHQgPSBudWxsO1xuICAgICAgICB9LFxuXG4gICAgICAgIG9uTW91c2VPdmVyOiBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICB2YXIgdGFyZ2V0ID0gJChlLm9yaWdpbmFsRXZlbnQudGFyZ2V0KTtcbiAgICAgICAgICAgICQoJy53b3JkLWhpc3RvZ3JhbS1lbnRyeScpLnJlbW92ZUNsYXNzKCdob3ZlcicpO1xuICAgICAgICAgICAgdmFyIHdvcmQgPSB0YXJnZXQuYXR0cignZGF0YS13b3JkJyk7XG4gICAgICAgICAgICBpZiAod29yZCkge1xuICAgICAgICAgICAgICAgICQoJy53b3JkLWhpc3RvZ3JhbS1lbnRyeVtkYXRhLXdvcmQ9JyArIHdvcmQgKyAnXScpLmFkZENsYXNzKCdob3ZlcicpO1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLm9wdGlvbnMuaGFuZGxlcnMubW91c2VvdmVyKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciAkcGFyZW50ID0gdGFyZ2V0LnBhcmVudHMoJy5sZWFmbGV0LWh0bWwtdGlsZScpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLm9wdGlvbnMuaGFuZGxlcnMubW91c2VvdmVyKHRhcmdldCwge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHdvcmQsXG4gICAgICAgICAgICAgICAgICAgICAgICB4OiBwYXJzZUludCgkcGFyZW50LmF0dHIoJ2RhdGEteCcpLCAxMCksXG4gICAgICAgICAgICAgICAgICAgICAgICB5OiBwYXJzZUludCgkcGFyZW50LmF0dHIoJ2RhdGEteScpLCAxMCksXG4gICAgICAgICAgICAgICAgICAgICAgICB6OiB0aGlzLl9tYXAuZ2V0Wm9vbSgpLFxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3dvcmQtaGlzdG9ncmFtJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGxheWVyOiB0aGlzXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICBvbk1vdXNlT3V0OiBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICB2YXIgdGFyZ2V0ID0gJChlLm9yaWdpbmFsRXZlbnQudGFyZ2V0KTtcbiAgICAgICAgICAgICQoJy53b3JkLWhpc3RvZ3JhbS1lbnRyeScpLnJlbW92ZUNsYXNzKCdob3ZlcicpO1xuICAgICAgICAgICAgdmFyIHdvcmQgPSB0YXJnZXQuYXR0cignZGF0YS13b3JkJyk7XG4gICAgICAgICAgICBpZiAod29yZCkge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLm9wdGlvbnMuaGFuZGxlcnMubW91c2VvdXQpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyICRwYXJlbnQgPSB0YXJnZXQucGFyZW50cygnLmxlYWZsZXQtaHRtbC10aWxlJyk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMub3B0aW9ucy5oYW5kbGVycy5tb3VzZW91dCh0YXJnZXQsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiB3b3JkLFxuICAgICAgICAgICAgICAgICAgICAgICAgeDogcGFyc2VJbnQoJHBhcmVudC5hdHRyKCdkYXRhLXgnKSwgMTApLFxuICAgICAgICAgICAgICAgICAgICAgICAgeTogcGFyc2VJbnQoJHBhcmVudC5hdHRyKCdkYXRhLXknKSwgMTApLFxuICAgICAgICAgICAgICAgICAgICAgICAgejogdGhpcy5fbWFwLmdldFpvb20oKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICd3b3JkLWhpc3RvZ3JhbScsXG4gICAgICAgICAgICAgICAgICAgICAgICBsYXllcjogdGhpc1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgb25DbGljazogZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgLy8gdW4tc2VsZWN0IGFuZCBwcmV2IHNlbGVjdGVkIGhpc3RvZ3JhbVxuICAgICAgICAgICAgJCgnLndvcmQtaGlzdG9ncmFtLWVudHJ5JykucmVtb3ZlQ2xhc3MoJ2hpZ2hsaWdodCcpO1xuICAgICAgICAgICAgJCh0aGlzLl9jb250YWluZXIpLnJlbW92ZUNsYXNzKCdoaWdobGlnaHQnKTtcbiAgICAgICAgICAgIC8vIGdldCB0YXJnZXRcbiAgICAgICAgICAgIHZhciB0YXJnZXQgPSAkKGUub3JpZ2luYWxFdmVudC50YXJnZXQpO1xuICAgICAgICAgICAgaWYgKCF0aGlzLmlzVGFyZ2V0TGF5ZXIoZS5vcmlnaW5hbEV2ZW50LnRhcmdldCkpIHtcbiAgICAgICAgICAgICAgICAvLyB0aGlzIGxheWVyIGlzIG5vdCB0aGUgdGFyZ2V0XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIHdvcmQgPSB0YXJnZXQuYXR0cignZGF0YS13b3JkJyk7XG4gICAgICAgICAgICBpZiAod29yZCkge1xuICAgICAgICAgICAgICAgICQodGhpcy5fY29udGFpbmVyKS5hZGRDbGFzcygnaGlnaGxpZ2h0Jyk7XG4gICAgICAgICAgICAgICAgJCgnLndvcmQtaGlzdG9ncmFtLWVudHJ5W2RhdGEtd29yZD0nICsgd29yZCArICddJykuYWRkQ2xhc3MoJ2hpZ2hsaWdodCcpO1xuICAgICAgICAgICAgICAgIHRoaXMuaGlnaGxpZ2h0ID0gd29yZDtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5vcHRpb25zLmhhbmRsZXJzLmNsaWNrKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciAkcGFyZW50ID0gdGFyZ2V0LnBhcmVudHMoJy5sZWFmbGV0LWh0bWwtdGlsZScpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLm9wdGlvbnMuaGFuZGxlcnMuY2xpY2sodGFyZ2V0LCB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogd29yZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHg6IHBhcnNlSW50KCRwYXJlbnQuYXR0cignZGF0YS14JyksIDEwKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHk6IHBhcnNlSW50KCRwYXJlbnQuYXR0cignZGF0YS15JyksIDEwKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHo6IHRoaXMuX21hcC5nZXRab29tKCksXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnd29yZC1oaXN0b2dyYW0nLFxuICAgICAgICAgICAgICAgICAgICAgICAgbGF5ZXI6IHRoaXNcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLmNsZWFyU2VsZWN0aW9uKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgZXh0cmFjdEV4dHJlbWE6IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgICAgIHZhciBzdW1zID0gXy5tYXAoZGF0YSwgZnVuY3Rpb24oY291bnRzKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIF8uc3VtQnkoY291bnRzLCBleHRyYWN0Q291bnQpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIG1pbjogXy5taW4oc3VtcyksXG4gICAgICAgICAgICAgICAgbWF4OiBfLm1heChzdW1zKSxcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0sXG5cbiAgICAgICAgcmVuZGVyVGlsZTogZnVuY3Rpb24oY29udGFpbmVyLCBkYXRhKSB7XG4gICAgICAgICAgICBpZiAoIWRhdGEgfHwgXy5pc0VtcHR5KGRhdGEpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIGhpZ2hsaWdodCA9IHRoaXMuaGlnaGxpZ2h0O1xuICAgICAgICAgICAgLy8gY29udmVydCBvYmplY3QgdG8gYXJyYXlcbiAgICAgICAgICAgIHZhciB2YWx1ZXMgPSBfLm1hcChkYXRhLCBleHRyYWN0VmFsdWVzKS5zb3J0KGZ1bmN0aW9uKGEsIGIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gYi50b3RhbCAtIGEudG90YWw7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIC8vIGdldCBudW1iZXIgb2YgZW50cmllc1xuICAgICAgICAgICAgdmFyIG51bUVudHJpZXMgPSBNYXRoLm1pbih2YWx1ZXMubGVuZ3RoLCBNQVhfTlVNX1dPUkRTKTtcbiAgICAgICAgICAgIHZhciAkaHRtbCA9ICQoJzxkaXYgY2xhc3M9XCJ3b3JkLWhpc3RvZ3JhbXNcIiBzdHlsZT1cImRpc3BsYXk6aW5saW5lLWJsb2NrO1wiPjwvZGl2PicpO1xuICAgICAgICAgICAgdmFyIHRvdGFsSGVpZ2h0ID0gMDtcbiAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgICAgIHZhbHVlcy5zbGljZSgwLCBudW1FbnRyaWVzKS5mb3JFYWNoKGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgdmFyIHRvcGljID0gdmFsdWUudG9waWM7XG4gICAgICAgICAgICAgICAgdmFyIGZyZXF1ZW5jaWVzID0gdmFsdWUuZnJlcXVlbmNpZXM7XG4gICAgICAgICAgICAgICAgdmFyIG1heCA9IHZhbHVlLm1heDtcbiAgICAgICAgICAgICAgICB2YXIgdG90YWwgPSB2YWx1ZS50b3RhbDtcbiAgICAgICAgICAgICAgICB2YXIgYXZnID0gdmFsdWUuYXZnO1xuICAgICAgICAgICAgICAgIHZhciBzZW50aW1lbnRDbGFzcyA9IGV4dHJhY3RTZW50aW1lbnRDbGFzcyhhdmcpO1xuICAgICAgICAgICAgICAgIHZhciBoaWdobGlnaHRDbGFzcyA9ICh0b3BpYyA9PT0gaGlnaGxpZ2h0KSA/ICdoaWdobGlnaHQnIDogJyc7XG4gICAgICAgICAgICAgICAgLy8gc2NhbGUgdGhlIGhlaWdodCBiYXNlZCBvbiBsZXZlbCBtaW4gLyBtYXhcbiAgICAgICAgICAgICAgICB2YXIgcGVyY2VudCA9IHNlbGYudHJhbnNmb3JtVmFsdWUodG90YWwpO1xuICAgICAgICAgICAgICAgIHZhciBwZXJjZW50TGFiZWwgPSBNYXRoLnJvdW5kKChwZXJjZW50ICogMTAwKSAvIDEwKSAqIDEwO1xuICAgICAgICAgICAgICAgIHZhciBoZWlnaHQgPSBNSU5fRk9OVF9TSVpFICsgcGVyY2VudCAqIChNQVhfRk9OVF9TSVpFIC0gTUlOX0ZPTlRfU0laRSk7XG4gICAgICAgICAgICAgICAgdG90YWxIZWlnaHQgKz0gaGVpZ2h0O1xuICAgICAgICAgICAgICAgIC8vIGNyZWF0ZSBjb250YWluZXIgJ2VudHJ5JyBmb3IgY2hhcnQgYW5kIGhhc2h0YWdcbiAgICAgICAgICAgICAgICB2YXIgJGVudHJ5ID0gJCgnPGRpdiBjbGFzcz1cIndvcmQtaGlzdG9ncmFtLWVudHJ5ICcgKyBoaWdobGlnaHRDbGFzcyArICdcIiAnICtcbiAgICAgICAgICAgICAgICAgICAgJ2RhdGEtc2VudGltZW50PVwiJyArIGF2ZyArICdcIicgK1xuICAgICAgICAgICAgICAgICAgICAnZGF0YS13b3JkPVwiJyArIHRvcGljICsgJ1wiJyArXG4gICAgICAgICAgICAgICAgICAgICdzdHlsZT1cIicgK1xuICAgICAgICAgICAgICAgICAgICAnaGVpZ2h0OicgKyBoZWlnaHQgKyAncHg7XCI+PC9kaXY+Jyk7XG4gICAgICAgICAgICAgICAgLy8gY3JlYXRlIGNoYXJ0XG4gICAgICAgICAgICAgICAgdmFyICRjaGFydCA9ICQoJzxkaXYgY2xhc3M9XCJ3b3JkLWhpc3RvZ3JhbS1sZWZ0XCInICtcbiAgICAgICAgICAgICAgICAgICAgJ2RhdGEtc2VudGltZW50PVwiJyArIGF2ZyArICdcIicgK1xuICAgICAgICAgICAgICAgICAgICAnZGF0YS13b3JkPVwiJyArIHRvcGljICsgJ1wiJyArXG4gICAgICAgICAgICAgICAgICAgICc+PC9kaXY+Jyk7XG4gICAgICAgICAgICAgICAgdmFyIGJhcldpZHRoID0gJ2NhbGMoJyArICgxMDAgLyBmcmVxdWVuY2llcy5sZW5ndGgpICsgJyUpJztcbiAgICAgICAgICAgICAgICAvLyBjcmVhdGUgYmFyc1xuICAgICAgICAgICAgICAgIGZyZXF1ZW5jaWVzLmZvckVhY2goZnVuY3Rpb24oZnJlcXVlbmN5KSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBjb3VudCA9IGZyZXF1ZW5jeS5jb3VudDtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGF2ZyA9IGZyZXF1ZW5jeS5hdmc7XG4gICAgICAgICAgICAgICAgICAgIHZhciBzZW50aW1lbnRDbGFzcyA9IGV4dHJhY3RTZW50aW1lbnRDbGFzcyhhdmcpO1xuICAgICAgICAgICAgICAgICAgICAvLyBnZXQgdGhlIHBlcmNlbnQgcmVsYXRpdmUgdG8gdGhlIGhpZ2hlc3QgY291bnQgaW4gdGhlIHRpbGVcbiAgICAgICAgICAgICAgICAgICAgdmFyIHJlbGF0aXZlUGVyY2VudCA9IChtYXggIT09IDApID8gKGNvdW50IC8gbWF4KSAqIDEwMCA6IDA7XG4gICAgICAgICAgICAgICAgICAgIC8vIG1ha2UgaW52aXNpYmxlIGlmIHplcm8gY291bnRcbiAgICAgICAgICAgICAgICAgICAgdmFyIHZpc2liaWxpdHkgPSByZWxhdGl2ZVBlcmNlbnQgPT09IDAgPyAnaGlkZGVuJyA6ICcnO1xuICAgICAgICAgICAgICAgICAgICAvLyBHZXQgdGhlIHN0eWxlIGNsYXNzIG9mIHRoZSBiYXJcbiAgICAgICAgICAgICAgICAgICAgdmFyIHBlcmNlbnRMYWJlbCA9IE1hdGgucm91bmQocmVsYXRpdmVQZXJjZW50IC8gMTApICogMTA7XG4gICAgICAgICAgICAgICAgICAgIHZhciBiYXJDbGFzc2VzID0gW1xuICAgICAgICAgICAgICAgICAgICAgICAgJ3dvcmQtaGlzdG9ncmFtLWJhcicsXG4gICAgICAgICAgICAgICAgICAgICAgICAnd29yZC1oaXN0b2dyYW0tYmFyLScgKyBwZXJjZW50TGFiZWwsXG4gICAgICAgICAgICAgICAgICAgICAgICBzZW50aW1lbnRDbGFzcyArICctZmlsbCdcbiAgICAgICAgICAgICAgICAgICAgXS5qb2luKCcgJyk7XG4gICAgICAgICAgICAgICAgICAgIHZhciBiYXJIZWlnaHQ7XG4gICAgICAgICAgICAgICAgICAgIHZhciBiYXJUb3A7XG4gICAgICAgICAgICAgICAgICAgIC8vIGVuc3VyZSB0aGVyZSBpcyBhdCBsZWFzdCBhIHNpbmdsZSBwaXhlbCBvZiBjb2xvclxuICAgICAgICAgICAgICAgICAgICBpZiAoKHJlbGF0aXZlUGVyY2VudCAvIDEwMCkgKiBoZWlnaHQgPCAzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBiYXJIZWlnaHQgPSAnM3B4JztcbiAgICAgICAgICAgICAgICAgICAgICAgIGJhclRvcCA9ICdjYWxjKDEwMCUgLSAzcHgpJztcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJhckhlaWdodCA9IHJlbGF0aXZlUGVyY2VudCArICclJztcbiAgICAgICAgICAgICAgICAgICAgICAgIGJhclRvcCA9ICgxMDAgLSByZWxhdGl2ZVBlcmNlbnQpICsgJyUnO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIC8vIGNyZWF0ZSBiYXJcbiAgICAgICAgICAgICAgICAgICAgJGNoYXJ0LmFwcGVuZCgnPGRpdiBjbGFzcz1cIicgKyBiYXJDbGFzc2VzICsgJ1wiJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAnZGF0YS13b3JkPVwiJyArIHRvcGljICsgJ1wiJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAnc3R5bGU9XCInICtcbiAgICAgICAgICAgICAgICAgICAgICAgICd2aXNpYmlsaXR5OicgKyB2aXNpYmlsaXR5ICsgJzsnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICd3aWR0aDonICsgYmFyV2lkdGggKyAnOycgK1xuICAgICAgICAgICAgICAgICAgICAgICAgJ2hlaWdodDonICsgYmFySGVpZ2h0ICsgJzsnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICd0b3A6JyArIGJhclRvcCArICc7XCI+PC9kaXY+Jyk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgJGVudHJ5LmFwcGVuZCgkY2hhcnQpO1xuICAgICAgICAgICAgICAgIHZhciB0b3BpY0NsYXNzZXMgPSBbXG4gICAgICAgICAgICAgICAgICAgICd3b3JkLWhpc3RvZ3JhbS1sYWJlbCcsXG4gICAgICAgICAgICAgICAgICAgICd3b3JkLWhpc3RvZ3JhbS1sYWJlbC0nICsgcGVyY2VudExhYmVsLFxuICAgICAgICAgICAgICAgICAgICBzZW50aW1lbnRDbGFzc1xuICAgICAgICAgICAgICAgIF0uam9pbignICcpO1xuICAgICAgICAgICAgICAgIC8vIGNyZWF0ZSB0YWcgbGFiZWxcbiAgICAgICAgICAgICAgICB2YXIgJHRvcGljID0gJCgnPGRpdiBjbGFzcz1cIndvcmQtaGlzdG9ncmFtLXJpZ2h0XCI+JyArXG4gICAgICAgICAgICAgICAgICAgICc8ZGl2IGNsYXNzPVwiJyArIHRvcGljQ2xhc3NlcyArICdcIicgK1xuICAgICAgICAgICAgICAgICAgICAnZGF0YS1zZW50aW1lbnQ9XCInICsgYXZnICsgJ1wiJyArXG4gICAgICAgICAgICAgICAgICAgICdkYXRhLXdvcmQ9XCInICsgdG9waWMgKyAnXCInICtcbiAgICAgICAgICAgICAgICAgICAgJ3N0eWxlPVwiJyArXG4gICAgICAgICAgICAgICAgICAgICdmb250LXNpemU6JyArIGhlaWdodCArICdweDsnICtcbiAgICAgICAgICAgICAgICAgICAgJ2xpbmUtaGVpZ2h0OicgKyBoZWlnaHQgKyAncHg7JyArXG4gICAgICAgICAgICAgICAgICAgICdoZWlnaHQ6JyArIGhlaWdodCArICdweFwiPicgKyB0b3BpYyArICc8L2Rpdj4nICtcbiAgICAgICAgICAgICAgICAgICAgJzwvZGl2PicpO1xuICAgICAgICAgICAgICAgICRlbnRyeS5hcHBlbmQoJHRvcGljKTtcbiAgICAgICAgICAgICAgICAkaHRtbC5hcHBlbmQoJGVudHJ5KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgJGh0bWwuY3NzKCd0b3AnLCBIQUxGX1NJWkUgLSAodG90YWxIZWlnaHQgLyAyKSk7XG4gICAgICAgICAgICBjb250YWluZXIuaW5uZXJIVE1MID0gJGh0bWxbMF0ub3V0ZXJIVE1MO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICBtb2R1bGUuZXhwb3J0cyA9IFdvcmRIaXN0b2dyYW07XG5cbn0oKSk7XG4iLCIoZnVuY3Rpb24oKSB7XG5cbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICBtb2R1bGUuZXhwb3J0cyA9IHtcblxuICAgICAgICByZW5kZXJUaWxlOiBmdW5jdGlvbihlbGVtKSB7XG4gICAgICAgICAgICBlbGVtLmlubmVySHRtbCA9ICc8ZGl2IGNsYXNzPVwiYmxpbmtpbmcgYmxpbmtpbmctdGlsZVwiIHN0eWxlPVwiYW5pbWF0aW9uLWRlbGF5OicgKyAtKE1hdGgucmFuZG9tKCkgKiAxMjAwKSArICdtcztcIj48L2Rpdj4nO1xuICAgICAgICB9XG5cbiAgICB9O1xuXG59KCkpO1xuIiwiKGZ1bmN0aW9uKCkge1xuXG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgdmFyIERFTEFZID0gMTIwMDtcblxuICAgIG1vZHVsZS5leHBvcnRzID0ge1xuXG4gICAgICAgIHJlbmRlclRpbGU6IGZ1bmN0aW9uKGVsZW0pIHtcbiAgICAgICAgICAgIHZhciBkZWxheSA9IC0oTWF0aC5yYW5kb20oKSAqIERFTEFZKSArICdtcyc7XG4gICAgICAgICAgICBlbGVtLmlubmVySFRNTCA9XG4gICAgICAgICAgICAgICAgJzxkaXYgY2xhc3M9XCJ2ZXJ0aWNhbC1jZW50ZXJlZC1ib3ggYmxpbmtpbmdcIiBzdHlsZT1cImFuaW1hdGlvbi1kZWxheTonICsgZGVsYXkgKyAnXCI+JyArXG4gICAgICAgICAgICAgICAgICAgICc8ZGl2IGNsYXNzPVwiY29udGVudFwiPicgK1xuICAgICAgICAgICAgICAgICAgICAgICAgJzxkaXYgY2xhc3M9XCJsb2FkZXItY2lyY2xlXCI+PC9kaXY+JyArXG4gICAgICAgICAgICAgICAgICAgICAgICAnPGRpdiBjbGFzcz1cImxvYWRlci1saW5lLW1hc2tcIiBzdHlsZT1cImFuaW1hdGlvbi1kZWxheTonICsgZGVsYXkgKyAnXCI+JyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJzxkaXYgY2xhc3M9XCJsb2FkZXItbGluZVwiPjwvZGl2PicgK1xuICAgICAgICAgICAgICAgICAgICAgICAgJzwvZGl2PicgK1xuICAgICAgICAgICAgICAgICAgICAnPC9kaXY+JyArXG4gICAgICAgICAgICAgICAgJzwvZGl2Pic7XG4gICAgICAgIH1cblxuICAgIH07XG5cbn0oKSk7XG4iLCIoZnVuY3Rpb24oKSB7XG5cbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICB2YXIgREVMQVkgPSAxMjAwO1xuXG4gICAgbW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgICAgICAgcmVuZGVyVGlsZTogZnVuY3Rpb24oZWxlbSkge1xuICAgICAgICAgICAgdmFyIGRlbGF5ID0gLShNYXRoLnJhbmRvbSgpICogREVMQVkpICsgJ21zJztcbiAgICAgICAgICAgIGVsZW0uaW5uZXJIVE1MID1cbiAgICAgICAgICAgICAgICAnPGRpdiBjbGFzcz1cInZlcnRpY2FsLWNlbnRlcmVkLWJveFwiIHN0eWxlPVwiYW5pbWF0aW9uLWRlbGF5OicgKyBkZWxheSArICdcIj4nICtcbiAgICAgICAgICAgICAgICAgICAgJzxkaXYgY2xhc3M9XCJjb250ZW50XCI+JyArXG4gICAgICAgICAgICAgICAgICAgICAgICAnPGRpdiBjbGFzcz1cImxvYWRlci1jaXJjbGVcIj48L2Rpdj4nICtcbiAgICAgICAgICAgICAgICAgICAgICAgICc8ZGl2IGNsYXNzPVwibG9hZGVyLWxpbmUtbWFza1wiIHN0eWxlPVwiYW5pbWF0aW9uLWRlbGF5OicgKyBkZWxheSArICdcIj4nICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnPGRpdiBjbGFzcz1cImxvYWRlci1saW5lXCI+PC9kaXY+JyArXG4gICAgICAgICAgICAgICAgICAgICAgICAnPC9kaXY+JyArXG4gICAgICAgICAgICAgICAgICAgICc8L2Rpdj4nICtcbiAgICAgICAgICAgICAgICAnPC9kaXY+JztcbiAgICAgICAgfVxuXG4gICAgfTtcblxufSgpKTtcbiIsIihmdW5jdGlvbigpIHtcblxuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIHZhciBXZWJHTCA9IHJlcXVpcmUoJy4uLy4uL2NvcmUvV2ViR0wnKTtcblxuICAgIC8vIFRPRE86XG4gICAgLy8gICAgIC0gdXBkYXRlIHRvIHByZWNlcHR1YWwgY29sb3IgcmFtcHMgKGxheWVyIGlzIGN1cnJlbnRseSBicm9rZW4pXG5cbiAgICB2YXIgSGVhdG1hcCA9IFdlYkdMLmV4dGVuZCh7XG5cbiAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgICAgc2hhZGVyczoge1xuICAgICAgICAgICAgICAgIHZlcnQ6ICcuLi8uLi9zaGFkZXJzL2hlYXRtYXAudmVydCcsXG4gICAgICAgICAgICAgICAgZnJhZzogJy4uLy4uL3NoYWRlcnMvaGVhdG1hcC5mcmFnJyxcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICBiZWZvcmVEcmF3OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciByYW1wID0gdGhpcy5nZXRDb2xvclJhbXAoKTtcbiAgICAgICAgICAgIHZhciBjb2xvciA9IFswLCAwLCAwLCAwXTtcbiAgICAgICAgICAgIHRoaXMuX3NoYWRlci5zZXRVbmlmb3JtKCd1TWluJywgdGhpcy5nZXRFeHRyZW1hKCkubWluKTtcbiAgICAgICAgICAgIHRoaXMuX3NoYWRlci5zZXRVbmlmb3JtKCd1TWF4JywgdGhpcy5nZXRFeHRyZW1hKCkubWF4KTtcbiAgICAgICAgICAgIHRoaXMuX3NoYWRlci5zZXRVbmlmb3JtKCd1Q29sb3JSYW1wRnJvbScsIHJhbXAoMC4wLCBjb2xvcikpO1xuICAgICAgICAgICAgdGhpcy5fc2hhZGVyLnNldFVuaWZvcm0oJ3VDb2xvclJhbXBUbycsIHJhbXAoMS4wLCBjb2xvcikpO1xuICAgICAgICB9XG5cbiAgICB9KTtcblxuICAgIG1vZHVsZS5leHBvcnRzID0gSGVhdG1hcDtcblxufSgpKTtcbiIsIihmdW5jdGlvbigpIHtcblxuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIHZhciBSZXF1ZXN0b3IgPSByZXF1aXJlKCcuL1JlcXVlc3RvcicpO1xuXG4gICAgZnVuY3Rpb24gTWV0YVJlcXVlc3RvcigpIHtcbiAgICAgICAgUmVxdWVzdG9yLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuXG4gICAgTWV0YVJlcXVlc3Rvci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKFJlcXVlc3Rvci5wcm90b3R5cGUpO1xuXG4gICAgTWV0YVJlcXVlc3Rvci5wcm90b3R5cGUuZ2V0SGFzaCA9IGZ1bmN0aW9uKHJlcSkge1xuICAgICAgICByZXR1cm4gcmVxLnR5cGUgKyAnLScgK1xuICAgICAgICAgICAgcmVxLmluZGV4ICsgJy0nICtcbiAgICAgICAgICAgIHJlcS5zdG9yZTtcbiAgICB9O1xuXG4gICAgTWV0YVJlcXVlc3Rvci5wcm90b3R5cGUuZ2V0VVJMID0gZnVuY3Rpb24ocmVzKSB7XG4gICAgICAgIHJldHVybiAnbWV0YS8nICtcbiAgICAgICAgICAgIHJlcy50eXBlICsgJy8nICtcbiAgICAgICAgICAgIHJlcy5lbmRwb2ludCArICcvJyArXG4gICAgICAgICAgICByZXMuaW5kZXggKyAnLycgK1xuICAgICAgICAgICAgcmVzLnN0b3JlO1xuICAgIH07XG5cbiAgICBtb2R1bGUuZXhwb3J0cyA9IE1ldGFSZXF1ZXN0b3I7XG5cbn0oKSk7XG4iLCIoZnVuY3Rpb24oKSB7XG5cbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICB2YXIgcmV0cnlJbnRlcnZhbCA9IDUwMDA7XG5cbiAgICBmdW5jdGlvbiBnZXRIb3N0KCkge1xuICAgICAgICB2YXIgbG9jID0gd2luZG93LmxvY2F0aW9uO1xuICAgICAgICB2YXIgbmV3X3VyaTtcbiAgICAgICAgaWYgKGxvYy5wcm90b2NvbCA9PT0gJ2h0dHBzOicpIHtcbiAgICAgICAgICAgIG5ld191cmkgPSAnd3NzOic7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBuZXdfdXJpID0gJ3dzOic7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG5ld191cmkgKyAnLy8nICsgbG9jLmhvc3QgKyBsb2MucGF0aG5hbWU7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZXN0YWJsaXNoQ29ubmVjdGlvbihyZXF1ZXN0b3IsIGNhbGxiYWNrKSB7XG4gICAgICAgIHJlcXVlc3Rvci5zb2NrZXQgPSBuZXcgV2ViU29ja2V0KGdldEhvc3QoKSArIHJlcXVlc3Rvci51cmwpO1xuICAgICAgICAvLyBvbiBvcGVuXG4gICAgICAgIHJlcXVlc3Rvci5zb2NrZXQub25vcGVuID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXF1ZXN0b3IuaXNPcGVuID0gdHJ1ZTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdXZWJzb2NrZXQgY29ubmVjdGlvbiBlc3RhYmxpc2hlZCcpO1xuICAgICAgICAgICAgY2FsbGJhY2suYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgfTtcbiAgICAgICAgLy8gb24gbWVzc2FnZVxuICAgICAgICByZXF1ZXN0b3Iuc29ja2V0Lm9ubWVzc2FnZSA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgICAgICB2YXIgcmVzID0gSlNPTi5wYXJzZShldmVudC5kYXRhKTtcbiAgICAgICAgICAgIHZhciBoYXNoID0gcmVxdWVzdG9yLmdldEhhc2gocmVzKTtcbiAgICAgICAgICAgIHZhciByZXF1ZXN0ID0gcmVxdWVzdG9yLnJlcXVlc3RzW2hhc2hdO1xuICAgICAgICAgICAgZGVsZXRlIHJlcXVlc3Rvci5yZXF1ZXN0c1toYXNoXTtcbiAgICAgICAgICAgIGlmIChyZXMuc3VjY2Vzcykge1xuICAgICAgICAgICAgICAgIHJlcXVlc3QucmVzb2x2ZShyZXF1ZXN0b3IuZ2V0VVJMKHJlcyksIHJlcyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlcXVlc3QucmVqZWN0KHJlcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIC8vIG9uIGNsb3NlXG4gICAgICAgIHJlcXVlc3Rvci5zb2NrZXQub25jbG9zZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgLy8gbG9nIGNsb3NlIG9ubHkgaWYgY29ubmVjdGlvbiB3YXMgZXZlciBvcGVuXG4gICAgICAgICAgICBpZiAocmVxdWVzdG9yLmlzT3Blbikge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybignV2Vic29ja2V0IGNvbm5lY3Rpb24gY2xvc2VkJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXF1ZXN0b3Iuc29ja2V0ID0gbnVsbDtcbiAgICAgICAgICAgIHJlcXVlc3Rvci5pc09wZW4gPSBmYWxzZTtcbiAgICAgICAgICAgIC8vIHJlamVjdCBhbGwgcGVuZGluZyByZXF1ZXN0c1xuICAgICAgICAgICAgT2JqZWN0LmtleXMocmVxdWVzdG9yLnJlcXVlc3RzKS5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgICAgICAgICAgICAgIHJlcXVlc3Rvci5yZXF1ZXN0c1trZXldLnJlamVjdCgpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAvLyBjbGVhciByZXF1ZXN0IG1hcFxuICAgICAgICAgICAgcmVxdWVzdG9yLnJlcXVlc3RzID0ge307XG4gICAgICAgICAgICAvLyBhdHRlbXB0IHRvIHJlLWVzdGFibGlzaCBjb25uZWN0aW9uXG4gICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIGVzdGFibGlzaENvbm5lY3Rpb24ocmVxdWVzdG9yLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gb25jZSBjb25uZWN0aW9uIGlzIHJlLWVzdGFibGlzaGVkLCBzZW5kIHBlbmRpbmcgcmVxdWVzdHNcbiAgICAgICAgICAgICAgICAgICAgcmVxdWVzdG9yLnBlbmRpbmcuZm9yRWFjaChmdW5jdGlvbihyZXEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlcXVlc3Rvci5nZXQocmVxKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHJlcXVlc3Rvci5wZW5kaW5nID0gW107XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9LCByZXRyeUludGVydmFsKTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBSZXF1ZXN0b3IodXJsLCBjYWxsYmFjaykge1xuICAgICAgICB0aGlzLnVybCA9IHVybDtcbiAgICAgICAgdGhpcy5yZXF1ZXN0cyA9IHt9O1xuICAgICAgICB0aGlzLnBlbmRpbmcgPSBbXTtcbiAgICAgICAgdGhpcy5pc09wZW4gPSBmYWxzZTtcbiAgICAgICAgZXN0YWJsaXNoQ29ubmVjdGlvbih0aGlzLCBjYWxsYmFjayk7XG4gICAgfVxuXG4gICAgUmVxdWVzdG9yLnByb3RvdHlwZS5nZXRIYXNoID0gZnVuY3Rpb24oIC8qcmVxKi8gKSB7XG4gICAgICAgIC8vIG92ZXJyaWRlXG4gICAgfTtcblxuICAgIFJlcXVlc3Rvci5wcm90b3R5cGUuZ2V0VVJMID0gZnVuY3Rpb24oIC8qcmVzKi8gKSB7XG4gICAgICAgIC8vIG92ZXJyaWRlXG4gICAgfTtcblxuICAgIFJlcXVlc3Rvci5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24ocmVxKSB7XG4gICAgICAgIGlmICghdGhpcy5pc09wZW4pIHtcbiAgICAgICAgICAgIC8vIGlmIG5vIGNvbm5lY3Rpb24sIGFkZCByZXF1ZXN0IHRvIHBlbmRpbmcgcXVldWVcbiAgICAgICAgICAgIHRoaXMucGVuZGluZy5wdXNoKHJlcSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGhhc2ggPSB0aGlzLmdldEhhc2gocmVxKTtcbiAgICAgICAgdmFyIHJlcXVlc3QgPSB0aGlzLnJlcXVlc3RzW2hhc2hdO1xuICAgICAgICBpZiAocmVxdWVzdCkge1xuICAgICAgICAgICAgcmV0dXJuIHJlcXVlc3QucHJvbWlzZSgpO1xuICAgICAgICB9XG4gICAgICAgIHJlcXVlc3QgPSB0aGlzLnJlcXVlc3RzW2hhc2hdID0gJC5EZWZlcnJlZCgpO1xuICAgICAgICB0aGlzLnNvY2tldC5zZW5kKEpTT04uc3RyaW5naWZ5KHJlcSkpO1xuICAgICAgICByZXR1cm4gcmVxdWVzdC5wcm9taXNlKCk7XG4gICAgfTtcblxuICAgIFJlcXVlc3Rvci5wcm90b3R5cGUuY2xvc2UgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy5zb2NrZXQub25jbG9zZSA9IG51bGw7XG4gICAgICAgIHRoaXMuc29ja2V0LmNsb3NlKCk7XG4gICAgICAgIHRoaXMuc29ja2V0ID0gbnVsbDtcbiAgICB9O1xuXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBSZXF1ZXN0b3I7XG5cbn0oKSk7XG4iLCIoZnVuY3Rpb24oKSB7XG5cbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICB2YXIgc3RyaW5naWZ5ID0gcmVxdWlyZSgnanNvbi1zdGFibGUtc3RyaW5naWZ5Jyk7XG4gICAgdmFyIFJlcXVlc3RvciA9IHJlcXVpcmUoJy4vUmVxdWVzdG9yJyk7XG5cbiAgICBmdW5jdGlvbiBwcnVuZUVtcHR5KG9iaikge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gcHJ1bmUoY3VycmVudCkge1xuICAgICAgICAgICAgXy5mb3JPd24oY3VycmVudCwgZnVuY3Rpb24odmFsdWUsIGtleSkge1xuICAgICAgICAgICAgICBpZiAoXy5pc1VuZGVmaW5lZCh2YWx1ZSkgfHwgXy5pc051bGwodmFsdWUpIHx8IF8uaXNOYU4odmFsdWUpIHx8XG4gICAgICAgICAgICAgICAgKF8uaXNTdHJpbmcodmFsdWUpICYmIF8uaXNFbXB0eSh2YWx1ZSkpIHx8XG4gICAgICAgICAgICAgICAgKF8uaXNPYmplY3QodmFsdWUpICYmIF8uaXNFbXB0eShwcnVuZSh2YWx1ZSkpKSkge1xuICAgICAgICAgICAgICAgIGRlbGV0ZSBjdXJyZW50W2tleV07XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgLy8gcmVtb3ZlIGFueSBsZWZ0b3ZlciB1bmRlZmluZWQgdmFsdWVzIGZyb20gdGhlIGRlbGV0ZVxuICAgICAgICAgICAgLy8gb3BlcmF0aW9uIG9uIGFuIGFycmF5XG4gICAgICAgICAgICBpZiAoXy5pc0FycmF5KGN1cnJlbnQpKSB7XG4gICAgICAgICAgICAgICAgXy5wdWxsKGN1cnJlbnQsIHVuZGVmaW5lZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gY3VycmVudDtcbiAgICAgICAgfShfLmNsb25lRGVlcChvYmopKTsgLy8gZG8gbm90IG1vZGlmeSB0aGUgb3JpZ2luYWwgb2JqZWN0LCBjcmVhdGUgYSBjbG9uZSBpbnN0ZWFkXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gVGlsZVJlcXVlc3RvcigpIHtcbiAgICAgICAgUmVxdWVzdG9yLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuXG4gICAgVGlsZVJlcXVlc3Rvci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKFJlcXVlc3Rvci5wcm90b3R5cGUpO1xuXG4gICAgVGlsZVJlcXVlc3Rvci5wcm90b3R5cGUuZ2V0SGFzaCA9IGZ1bmN0aW9uKHJlcSkge1xuICAgICAgICB2YXIgY29vcmQgPSByZXEuY29vcmQ7XG4gICAgICAgIHZhciBoYXNoID0gc3RyaW5naWZ5KHBydW5lRW1wdHkocmVxLnBhcmFtcykpO1xuICAgICAgICByZXR1cm4gcmVxLnR5cGUgKyAnLScgK1xuICAgICAgICAgICAgcmVxLmluZGV4ICsgJy0nICtcbiAgICAgICAgICAgIHJlcS5zdG9yZSArICctJyArXG4gICAgICAgICAgICBjb29yZC54ICsgJy0nICtcbiAgICAgICAgICAgIGNvb3JkLnkgKyAnLScgK1xuICAgICAgICAgICAgY29vcmQueiArICctJyArXG4gICAgICAgICAgICBoYXNoO1xuICAgIH07XG5cbiAgICBUaWxlUmVxdWVzdG9yLnByb3RvdHlwZS5nZXRVUkwgPSBmdW5jdGlvbihyZXMpIHtcbiAgICAgICAgdmFyIGNvb3JkID0gcmVzLmNvb3JkO1xuICAgICAgICByZXR1cm4gJ3RpbGUvJyArXG4gICAgICAgICAgICByZXMudHlwZSArICcvJyArXG4gICAgICAgICAgICByZXMuaW5kZXggKyAnLycgK1xuICAgICAgICAgICAgcmVzLnN0b3JlICsgJy8nICtcbiAgICAgICAgICAgIGNvb3JkLnogKyAnLycgK1xuICAgICAgICAgICAgY29vcmQueCArICcvJyArXG4gICAgICAgICAgICBjb29yZC55O1xuICAgIH07XG5cbiAgICBtb2R1bGUuZXhwb3J0cyA9IFRpbGVSZXF1ZXN0b3I7XG5cbn0oKSk7XG4iXX0=
