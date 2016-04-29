(function() {

    'use strict';

    var Live = require('../core/Live');
    var Tiling = require('../param/Tiling');
    var TermsFilter = require('../agg/TermsFilter');
    var Histogram = require('../agg/Histogram');
    var ValueTransform = require('../mixin/ValueTransform');

    var TopicCount = Live.extend({

        includes: [
            // params
            Tiling,
            TermsFilter,
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