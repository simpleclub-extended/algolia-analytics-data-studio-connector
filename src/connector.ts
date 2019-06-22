interface AlgoliaConnectorConfig {
	indices: string
	analyticsType: AnalyticsType
}

enum AnalyticsType {
	topSearches = "top_searches",
	topNoResults = "top_no_results",
	topHits = "top_hits",
	topFilterAttributes = "top_filter_attributes",
	// topFiltersNoResult = "top_filters_no_result",
}

interface DataStudioRequest {
	configParams?: AlgoliaConnectorConfig
	fields?: Schema
	userPass?: {
		username: string,
		password: string
	},
	userToken?: {
		username: string,
		token: string,
	},
	key?: string
}

/**
 * Contains core functionality for Data Studio connector.
 */
class AlgoliaConnector {

	/** @const */
	FIELD_TYPES = ['STRING', 'NUMBER', 'BOOLEAN', 'TIMESTAMP'];
	/** @const */
	TIMESTAMP_SEMANTICS = {
		conceptType: 'DIMENSION',
		semanticGroup: 'DATE_AND_TIME',
		semanticType: 'YEAR_MONTH_DAY_HOUR'
	};
	/** @const */
	aloglia: Algolia;
	/** @const */
	enableLogging: boolean;

	constructor(enableLogging = true) {
		this.aloglia = new Algolia();

		this.enableLogging = enableLogging;
	}

	/**
	 * Stringifies parameters and responses for a given function and logs them to
	 * Stackdriver.
	 *
	 * @param {string} functionName Function to be logged and executed.
	 * @param {Object} parameter Parameter for the `functionName` function.
	 * @returns {any} Returns the response of `functionName` function.
	 */
	logAndExecute(functionName: string, parameter: object): any {
		if (this.enableLogging) {
			const paramString = JSON.stringify(parameter, null, 2);
			console.log([functionName, 'request', paramString]);
		}

		const returnObject = this[functionName](parameter);

		if (this.enableLogging) {
			const returnString = JSON.stringify(returnObject, null, 2);
			console.log([functionName, 'response', returnString]);
		}

		return returnObject;
	}

	/**
	 * Predefined Data Studio function for checking the user is a admin.
	 */
	isAdminUser(request: DataStudioRequest): boolean {
		return true;
	}

	/**
	 * Predefined Data Studio function for specifying connector configuration.
	 *
	 * @param {Object} request Config request parameters.
	 * @return {Object} Connector configuration to be displayed to the user.
	 */
	getConfig(request: DataStudioRequest): object {
		return {
			configParams: [
				{
					name: 'indices',
					type: 'TEXTINPUT',
					displayName: 'Indices',
					helpText:
						'Select the Algolia indices to use for this Data Source. \
				To use multiple indices, separate each index by comma.'
				},
				{
					name: 'analyticsType',
					type: 'SELECT_SINGLE',
					displayName: 'Type of Analytics',
					helpText: 'Select which results you want to get',
					options: [
						{ label: 'Top Searches', value: AnalyticsType.topSearches },
						{ label: 'Top Search with no Results', value: AnalyticsType.topNoResults },
						{ label: 'Top Hits', value: AnalyticsType.topHits },
						{ label: 'Top Filter Attributes', value: AnalyticsType.topFilterAttributes },
						// { label: 'Top Filters for a No Result Search', value: SchemaType.topFiltersNoResult }
					]
				}
			]
		};
	}

	/**
	 * Predefined Data Studio function for generating schema from user input.
	 *
	 * @param {Object} request Schema request parameters.
	 * @return {Object} Schema for the given request.
	 */
	getSchema(request: DataStudioRequest): { schema: Schema } {
		// Convert the user input to a Data Studio schema
		const analyticsType: AnalyticsType = request.configParams.analyticsType;

		const schema = new AlgoliaSchema().schemaForType(analyticsType);
		// Add predefined fields
		schema.push({
			name: 'type',
			label: 'type',
			dataType: DataType.string,
			description: 'The type of analytics for this data set.'
		});

		return { schema: schema };
	}

	/**
	 * Predefined Data Studio function for fetching user-defined data.
	 *
	 * @param {DataStudioRequest} request Data request parameters.
	 * @return {Object} Contains the schema and data for the given request.
	 */
	getData(request: DataStudioRequest): object {
		const indicesValue = request.configParams.indices;
		if (!indicesValue) {
			throw 'Missing Algolia Indices';
		}
		const analyticsType = request.configParams.analyticsType;
		if (!analyticsType) {
			throw 'Missing Analytics Type';
		}

		// Prepare the schema for the fields requested.
		const requestedSchema = this.getFilteredSchema(request);

		// Fetch and filter the requested data from Algolia
		const algolia = new Algolia();
		const indices = indicesValue.split(',');
		let rows = [];
		indices.forEach(function (index) {
			const data = algolia.getData(
				analyticsType,
				index,
				requestedSchema
			);
			rows = rows.concat(data);
		});

		return { schema: requestedSchema, rows: rows };
	}

	/**
	 * Filters the base schema by the requested fields.
	 *
	 * @param {DataStudioRequest} request Data request parameters.
	 * @return {Object} The schema filtered by the current request parameters.
	 */
	getFilteredSchema(request: DataStudioRequest): Schema {
		const schema = this.getSchema(request).schema;
		const requestedSchema = [];
		request.fields.forEach(function (field) {
			for (const _field of schema) {
				if (_field.name === field.name) {
					requestedSchema.push(_field);
					break;
				}
			}
		});
		return requestedSchema;
	}

	/** Predefined Data Studio function for defining auth. */
	getAuthType(): {type: string, helpUrl?: string} {
		return {
			"type": "USER_PASS"
		};
	}

	/** Predefined Data Studio function for resetting auth creds. */
	resetAuth() {
		const userProperties = PropertiesService.getUserProperties();
		userProperties.deleteProperty('dscc.appId');
		userProperties.deleteProperty('dscc.key');
	}

	/** Predefined Data Studio function for validating auth creds. */
	isAuthValid(): boolean {
		const userProperties = PropertiesService.getUserProperties();
		const appId = userProperties.getProperty('dscc.appId');
		const apiKey = userProperties.getProperty('dscc.key');
		return appId !== null && appId !== ''
			&& apiKey !== null && apiKey !== '';
	}

	/** Predefined Data Studio function for setting auth creds. */
	setCredentials(request: DataStudioRequest) {
		const appId = request.userPass.username;
		const apiKey = request.userPass.password;

		const userProperties = PropertiesService.getUserProperties();
		userProperties.setProperty('dscc.appId', appId);
		userProperties.setProperty('dscc.key', apiKey);
		return {
			errorCode: 'NONE'
		};
	}
}