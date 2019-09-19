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
	number = "NUMBER",
	yearMonthDay = "YEAR_MONTH_DAY",
	yearMonthDayHour = "YEAR_MONTH_DAY_HOUR",
	percent = "PERCENT",
	currencyEUR = "CURRENCY_EUR"
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

class ChartMogulSchema {
	getSchema(): Schema {
		return [
			{
				"name": "date",
				"label": "Date",
				"description": "The date of the item",
				"dataType": DataType.string,
				"isDefault": true,
				"semantics": {
					"conceptType": ConceptType.dimension,
					"semanticType": SemanticType.yearMonthDayHour,
					"isReaggregatable": false
				}
			},
			{
				"name": "customerchurnrate",
				"label": "Customer churn rate",
				"description": "The customer churn rate",
				"dataType": DataType.number,
				// "isDefault": true,
				"semantics": {
					"conceptType": ConceptType.metric,
					"semanticType": SemanticType.percent,
					"isReaggregatable": false
				}
			},
			{
				"name": "mrrchurnrate",
				"label": "MRR churn rate",
				"description": "The monthly recurring revenue churn rate",
				"dataType": DataType.number,
				// "isDefault": true,
				"semantics": {
					"conceptType": ConceptType.metric,
					"semanticType": SemanticType.percent,
					"isReaggregatable": false
				}
			},
			{
				"name": "ltv",
				"label": "LTV",
				"description": "The long term value of a customer",
				"dataType": DataType.number,
				// "isDefault": true,
				"semantics": {
					"conceptType": ConceptType.metric,
					"semanticType": SemanticType.currencyEUR,
					"isReaggregatable": false
				}
			},
			{
				"name": "customers",
				"label": "Customers",
				"description": "The amount of customers",
				"dataType": DataType.number,
				// "isDefault": true,
				"semantics": {
					"conceptType": ConceptType.metric,
					"semanticType": SemanticType.number,
					"isReaggregatable": false
				}
			},
			{
				"name": "asp",
				"label": "ASP",
				"description": "The average sale price",
				"dataType": DataType.number,
				// "isDefault": true,
				"semantics": {
					"conceptType": ConceptType.metric,
					"semanticType": SemanticType.currencyEUR,
					"isReaggregatable": false
				}
			},
			{
				"name": "arpa",
				"label": "ARPA",
				"description": "The average revenue per account",
				"dataType": DataType.number,
				// "isDefault": true,
				"semantics": {
					"conceptType": ConceptType.metric,
					"semanticType": SemanticType.currencyEUR,
					"isReaggregatable": false
				}
			},
			{
				"name": "arr",
				"label": "ARR",
				"description": "The annual run rate",
				"dataType": DataType.number,
				// "isDefault": true,
				"semantics": {
					"conceptType": ConceptType.metric,
					"semanticType": SemanticType.currencyEUR,
					"isReaggregatable": false
				}
			},
			{
				"name": "mrr",
				"label": "MRR",
				"description": "The monthly recurring revenue",
				"dataType": DataType.number,
				// "isDefault": true,
				"semantics": {
					"conceptType": ConceptType.metric,
					"semanticType": SemanticType.currencyEUR,
					"isReaggregatable": false
				}
			}
		];
	}
}