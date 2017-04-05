'use strict';

module.exports = {
	// debug
	Debug: require('./core/Debug'),
	// base
	Base: require('./core/Base'),
	// live
	Live: require('./core/Live'),
	// group
	Group: require('./core/Group'),
	// live-result pair
	LivePair: require('./core/LivePair'),
	// types
	Count: require('./type/Count'),
	Community: require('./type/Community'),
	Heatmap: require('./type/Heatmap'),
	Macro: require('./type/Macro'),
	Micro: require('./type/Micro'),
	MacroEdge: require('./type/MacroEdge'),
	Rest: require('./type/Rest'),
	TopTermCount: require('./type/TopTermCount'),
	BinnedTopHits: require('./type/BinnedTopHits')
};
