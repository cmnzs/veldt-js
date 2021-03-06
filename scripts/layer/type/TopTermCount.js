'use strict';

const values = require('lodash/values');
const defaultTo = require('lodash/defaultTo');
const Bivariate = require('./Bivariate');

class TopTermCount extends Bivariate {

	constructor(options = {}) {
		super(options);
		this.termsField = options.termsField;
		this.termsCount = defaultTo(options.termsCount, 10);
		this.fieldType = options.fieldType;
	}

	extractExtrema(data) {
		const vals = values(data);
		let min = Infinity;
		let max = -Infinity;
		for (let i=0; i<vals.length; i++) {
			const val = vals[i];
			if (val > max) {
				max = val;
			}
			if (val < min) {
				min = val;
			}
		}
		return {
			min: min,
			max: max
		};
	}

	setTermsField(field) {
		this.termsField = field;
	}

	setTermsCount(count) {
		this.termsCount = count;
	}

	setFieldType(fieldType) {
		this.fieldType = fieldType;
	}

	getTile(name = 'top-term-count') {
		return {
			[name]: {
				xField: this.xField,
				yField: this.yField,
				left: this.left,
				right: this.right,
				bottom: this.bottom,
				top: this.top,
				termsField: this.termsField,
				termsCount: this.termsCount,
				fieldType: this.fieldType
			}
		};
	}
}

module.exports = TopTermCount;
