interface ChartMogulConnectorConfig {
	dateRange: DateRangeType
	interval: IntervalType
	geo: string
	plans: string
}

enum DateRangeType {
	thisYear = "this_year",
	// lastYear = "last_year",
	// thisQuater = "this_quater",
	// lastQuater = "last_quater",
	// thisMonth = "this_month",
	// lastMonth = "last_month",
	// thisWeek = "this_week",
	// lastWeek = "last_week",
}

enum IntervalType {
	day = "day",
	week = "week",
	month = "month",
}

interface DataStudioRequest {
	configParams?: ChartMogulConnectorConfig
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
class ChartMogulConnector {

	/** @const */
	FIELD_TYPES = ['STRING', 'NUMBER', 'BOOLEAN', 'TIMESTAMP'];
	/** @const */
	TIMESTAMP_SEMANTICS = {
		conceptType: 'DIMENSION',
		semanticGroup: 'DATE_AND_TIME',
		semanticType: 'YEAR_MONTH_DAY_HOUR'
	};
	/** @const */
	chartMogul: ChartMogul;
	/** @const */
	enableLogging: boolean;

	constructor(enableLogging = true) {
		this.chartMogul = new ChartMogul();

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
					name: 'dateRange',
					type: 'SELECT_SINGLE',
					displayName: 'The range to fetch the data for',
					helpText: 'Select which date range you want to get',
					options: [
						{ label: 'This year', value: DateRangeType.thisYear },
					]
				},
				{
					name: 'interval',
					type: 'SELECT_SINGLE',
					displayName: 'The interval in which entries should be retrieved',
					helpText: 'In the selected interval retrieves entries by this interval',
					options: [
						{ label: 'Day', value: IntervalType.day },
						{ label: 'Week', value: IntervalType.week },
						{ label: 'Month', value: IntervalType.month },
					]
				},
				{
					name: 'geo',
					type: 'TEXTINPUT',
					displayName: 'The countries to filter the results',
					helpText:
						'A comma-separated list of ISO 3166-1 Alpha-2 formatted \
						country codes to filter the results to, e.g. US,GB,DE.'
				},
				{
					name: 'plans',
					type: 'TEXTINPUT',
					displayName: 'The planes to filter the results',
					helpText:
						'A comma-separated list of plan names (as configured in your \
							ChartMogul account) to filter the results to. '
				},
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

		const schema = new ChartMogulSchema().getSchema();

		return { schema: schema };
	}

	/**
	 * Predefined Data Studio function for fetching user-defined data.
	 *
	 * @param {DataStudioRequest} request Data request parameters.
	 * @return {Object} Contains the schema and data for the given request.
	 */
	getData(request: DataStudioRequest): object {
		const dateRange = request.configParams.dateRange;
		if (!dateRange) {
			throw 'Missing date range';
		}
		const interval = request.configParams.interval;
		const geo = request.configParams.geo;
		const plans = request.configParams.plans;

		// Prepare the schema for the fields requested.
		const requestedSchema = this.getFilteredSchema(request);

		// Fetch and filter the requested data from ChartMogul
		const rows = this.chartMogul.getData(
			dateRange,
			interval,
			geo,
			plans,
			requestedSchema
		);

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
		userProperties.deleteProperty('dscc.accountToken');
		userProperties.deleteProperty('dscc.secret');
	}

	/** Predefined Data Studio function for validating auth creds. */
	isAuthValid(): boolean {
		const userProperties = PropertiesService.getUserProperties();
		const accountToken = userProperties.getProperty('dscc.accountToken');
		const secret = userProperties.getProperty('dscc.secret');
		return accountToken !== null && accountToken !== ''
			&& secret !== null && secret !== '';
	}

	/** Predefined Data Studio function for setting auth creds. */
	setCredentials(request: DataStudioRequest) {
		const accountToken = request.userPass.username;
		const secret = request.userPass.password;

		const userProperties = PropertiesService.getUserProperties();
		userProperties.setProperty('dscc.accountToken', accountToken);
		userProperties.setProperty('dscc.secret', secret);
		return {
			errorCode: 'NONE'
		};
	}
}