type AlgoliaItems = { [key: string]: any }[];

/**
 * Handles fetching data from Algolia
 */
class Algolia {

	/** @const */
	PREDEFINED_FIELDS = ['type'];

	/** @const */
	RETRIES = 3;

	/** @const */
	CACHE_TTL = 20; // seconds

	/** @const */
	cache: GoogleAppsScript.Cache.Cache

	/** @const */
	appId: string

	/** @const */
	apiKey: string

	constructor() {
		this.cache = CacheService.getScriptCache();
		const userProperties = PropertiesService.getUserProperties();
		this.appId = userProperties.getProperty('dscc.appId');
		this.apiKey = userProperties.getProperty('dscc.key');
	}

	getData(analyticsType: AnalyticsType, index: string, schema: Schema) {
		const items = this.fetchAnalytics(analyticsType, index);
		var data = [];

		const instance = this;
		items.forEach(function (item) {
			var values = [];
			// Provide values in the order defined by the schema.
			schema.forEach(function (field) {
				if (instance.PREDEFINED_FIELDS.indexOf(field.name) > 0) {
					var value = item[field.name];
					switch (field.name) {
						case 'type':
							values.push(analyticsType);
							break;
						default:
							values.push(value);
					}
				} else {
					const value = item[field.name];
					values.push(value !== undefined ? value : null);
				}
			});
			data.push({
				values: values
			});
		});

		return data;
	}

	fetchAnalytics(analyticsType: AnalyticsType, index: string): AlgoliaItems {
		const urlComponents = [
			'https://analytics.us.algolia.com',
			this.apiPath(analyticsType),
			'?index=',
			index
		];
		const url = urlComponents.join('');

		const cached = this.cache.get(url);
		if (cached) {
			return JSON.parse((<any>Utilities.unzip(<any>cached)).getDataAsString());
		}
		const items = [];
		const response = this.apiCall(analyticsType, url);
		if (response.items && response.items.length > 0) {
			Array.prototype.push.apply(items, response.items);
		}

		try {
			const zip = Utilities.zip(<any>Utilities.newBlob(JSON.stringify(items)));
			this.cache.put(url, <any>zip, this.CACHE_TTL);
		} catch (e) {
			// Ignore. This usually means the data is too big to cache (which does make
			// the cache less useful...).
		}
		return items;
	}

	apiPath(analyticsType: AnalyticsType): string {
		switch (analyticsType) {
			case AnalyticsType.topSearches: return "/2/searches";
			case AnalyticsType.topNoResults: return "/2/searches/noResults";
			case AnalyticsType.topHits: return "/2/hits";
			case AnalyticsType.topFilterAttributes: return "/2/filters";
			// case SchemaType.topFiltersNoResult: break;
		}
	}

	apiCall(analyticsType: AnalyticsType, url: string): { items: AlgoliaItems } {
		const headers = {};
		if (this.appId) {
			headers["X-Algolia-Application-Id"] = this.appId;
		}
		if (this.apiKey) {
			headers["X-Algolia-API-Key"] = this.apiKey;
		}

		const options = { headers };

		var tries = this.RETRIES;
		while (tries > 0) {
			try {
				const response = UrlFetchApp.fetch(url, options);
				const json = JSON.parse(response.getContentText());
				switch (analyticsType) {
					case AnalyticsType.topSearches: return {
						items: json.searches
					};
					case AnalyticsType.topNoResults: return {
						items: json.searches
					};
					case AnalyticsType.topHits: return {
						items: json.hits
					};
					case AnalyticsType.topFilterAttributes: return {
						items: json.attributes
					};
					// case SchemaType.topFiltersNoResult: break;
				}
			} catch (e) {
				console.error(<any>'Request to Algolia failed.');
				tries--;
			}
		}
		throw `Failed to complete fetch from Algolia after ${this.RETRIES} attempts. App Id: ${this.appId}, Analytics Type: ${analyticsType}, URL: ${url}`;
	}
};