(function() {

    'use strict';

    var _ = require('lodash');
    var alfador = require('alfador');
    var esper = require('esper');

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
            console.log('WebGL initialize');
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
            // create canvas
            this._initCanvas();
            map._panes.tilePane.appendChild(this._canvas);
            // initialize the webgl context
            this._initGL();
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
                });
            }
            if (!this.options.updateWhenIdle) {
                map.off('move', this._limitedUpdate);
            }
            this._map = null;
            this._animated = null;
            this._gl = null;
            this._canvas = null;
            this._viewport = null;
            this._initialized = false;
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
            return alfador.Mat44.ortho(
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
                    var model = new alfador.Mat44.translation([
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