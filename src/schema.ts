enum DataType {
	string = "STRING",
	number = "NUMBER",
	boolean = "BOOLEAN"
}

enum ConceptType {
	dimension = "DIMENSION",
	metric = "METRIC"
}

enum SemanticType {
	text = "TEXT",
	number = "NUMBBER"
}

enum SemanticGroup {
	search = "SEARCH",
	item = "ITEM",
	attribute = "ATTRIBUTE",
	numeric = "NUMERIC"
}

interface SchemaField {
	name: string
	label: string
	description: string
	dataType: DataType
	isDefault?: boolean
	semantics?: {
		conceptType: ConceptType,
		semanticType: SemanticType,
		semanticGroup?: SemanticGroup,
		isReaggregatable: boolean
	}
}

type Schema = SchemaField[];

class AlgoliaSchema {
	schemaForType(type: AnalyticsType) {
		switch (type) {
			case AnalyticsType.topSearches: return this.schemaForSearches();
			case AnalyticsType.topNoResults: return this.schemaForSearches(true);
			case AnalyticsType.topHits: return this.schemaForHits();
			case AnalyticsType.topFilterAttributes: return this.schemaForAttributes();
			// case SchemaType.topFiltersNoResult: break;
		}
	}

	schemaForSearches(includeFilterCount = false): Schema {
		const schema: Schema = [
			{
				"name": "search",
				"label": "Search",
				"description": "The performed search",
				"dataType": DataType.string,
				"isDefault": true,
				// "semantics": {
				// 	"conceptType": ConceptType.dimension,
				// 	"semanticType": SemanticType.text,
				// 	// "semanticGroup": SemanticGroup.search,
				// 	"isReaggregatable": false
				// }
			}
		];
		if (includeFilterCount) {
			schema.push({
				"name": "withFilterCount",
				"label": "With Filter Count",
				"description": "How many times the search occurred with a filter",
				"dataType": DataType.number,
				"isDefault": false,
				// "semantics": {
				// 	"conceptType": ConceptType.metric,
				// 	"semanticType": SemanticType.number,
				// 	// "semanticGroup": SemanticGroup.numeric,
				// 	"isReaggregatable": true
				// }
			})
		}
		return this._addCountSchemaField(schema, "How many times the search occurred");
	}

	schemaForHits(): Schema {
		const schema: Schema = [
			{
				"name": "hit",
				"label": "Hit",
				"description": "The hit item",
				"dataType": DataType.string,
				"isDefault": true,
				// "semantics": {
				// 	"conceptType": ConceptType.dimension,
				// 	"semanticType": SemanticType.text,
				// 	// "semanticGroup": SemanticGroup.item,
				// 	"isReaggregatable": false
				// }
			}
		];
		return this._addCountSchemaField(schema, "How many times this item was shown in a search query.");
	}

	schemaForAttributes(): Schema {
		const schema: Schema = [
			{
				"name": "attribute",
				"label": "Attribute",
				"description": "The attribute used in the searches",
				"dataType": DataType.string,
				"isDefault": true,
				// "semantics": {
				// 	"conceptType": ConceptType.dimension,
				// 	"semanticType": SemanticType.text,
				// 	// "semanticGroup": SemanticGroup.attribute,
				// 	"isReaggregatable": false
				// }
			}
		];
		return this._addCountSchemaField(schema, "How many times this attribute was used in a search query.");
	}

	_addCountSchemaField(schema: Schema, description: string): Schema {
		schema.push({
			"name": "count",
			"label": "Count",
			"description": description,
			"dataType": DataType.number,
			"isDefault": true,
			// "semantics": {
			// 	"conceptType": ConceptType.metric,
			// 	"semanticType": SemanticType.number,
			// 	// "semanticGroup": SemanticGroup.numeric,
			// 	"isReaggregatable": true
			// }
		});
		return schema;
	}
}