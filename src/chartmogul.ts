interface ChartMogulEntry { 
	date: string
	"customer-churn-rate": number
	"mrr-churn-rate": number
	ltv: number
	customers: number
	asp: number
	arpa: number
	arr: number
	mrr: number
};

interface ChartMogulMetricsRequestQuery {
	"start-date": string
	"end-date": string
	interval: string
	geo: string
	plans: string
};

type ChartMogulEntries = ChartMogulEntry[];

String.prototype.addQuery = function(obj) {
	return this + Object.keys(obj).reduce(function(previous, current, i) {
		if (obj[current] === undefined) return previous + "";
		return previous + (i == 0 ? "?" : "&") +
			(Array.isArray(obj[current]) ? obj[current].reduce(function(str, f, j) {
				return str + current + "=" + encodeURIComponent(f) + (j != obj[current].length - 1 ? "&" : "")
			},"") : current + "=" + encodeURIComponent(obj[current]));
	},"");
  }

/**
 * Handles fetching data from ChartModul
 */
class ChartMogul {

	/** @const */
	PREDEFINED_FIELDS = ["date", "mrrchurnrate", "customerchurnrate", "ltv", "asp", "arpa", "arr", "mrr" ];

	/** @const */
	RETRIES = 3;

	/** @const */
	CACHE_TTL = 20; // seconds

	/** @const */
	cache: GoogleAppsScript.Cache.Cache

	/** @const */
	accountToken: string

	/** @const */
	secret: string

	constructor() {
		this.cache = CacheService.getScriptCache();
		const userProperties = PropertiesService.getUserProperties();
		this.accountToken = userProperties.getProperty('dscc.accountToken');
		this.secret = userProperties.getProperty('dscc.secret');
	}

	getData(
			dateRange: DateRangeType,
			interval: IntervalType,
			geo: string,
			plans: string, 
			schema: Schema) {
		const items = this.fetchMetrics(dateRange, interval, geo, plans);
		var data = [];

		const instance = this;
		items.forEach(function (item) {
			var values = [];
			// Provide values in the order defined by the schema.
			schema.forEach(function (field) {
				if (instance.PREDEFINED_FIELDS.indexOf(field.name) >= 0) {
					var value = item[field.name];
					switch (field.name) {
						case "date": 
							values.push(value.split("-").join(""));
							break;
						case "customerchurnrate":
							values.push(item["customer-churn-rate"] / 100);
							break;
						case "mrrchurnrate":
							values.push(item["mrr-churn-rate"] / 100);
							break;
						case "ltv":
							values.push(item["ltv"] / 100);
							break;
						case "asp":
							values.push(item["asp"] / 100);
							break;
						case "arpa":
							values.push(item["arpa"] / 100);
							break;
						case "arr":
							values.push(item["arr"] / 100);
							break;
						case "mrr":
							values.push(item["mrr"] / 100);
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

	fetchMetrics(
			dateRange: DateRangeType, interval: IntervalType, geo: string, plans: string): ChartMogulEntries {
		const url = "https://api.chartmogul.com/v1/metrics/all";
		const query = {
			...this._parseDateRange(dateRange),
			interval,
			geo,
			plans
		};

		const cacheKey = url + dateRange + interval + geo + plans;
		const cached = this.cache.get(cacheKey);
		if (cached) {
			return JSON.parse((<any>Utilities.unzip(<any>cached)).getDataAsString());
		}
		const items = [];
		const response = this.apiCall(query, url);
		if (response.entries && response.entries.length > 0) {
			Array.prototype.push.apply(items, response.entries);
		}

		try {
			const zip = Utilities.zip(<any>Utilities.newBlob(JSON.stringify(items)));
			this.cache.put(cacheKey, <any>zip, this.CACHE_TTL);
		} catch (e) {
			// Ignore. This usually means the data is too big to cache (which does make
			// the cache less useful...).
		}
		return items;
	}

	_parseDateRange(dateRange: DateRangeType) : {"start-date": string, "end-date": string} {
		switch (dateRange) {
			case DateRangeType.thisYear: 
				const endDate = new Date();
				const startDate = new Date();
				startDate.setMonth(0);
				startDate.setDate(1);
				return {
					"start-date": this._dateToChartMogulDate(startDate),
					"end-date": this._dateToChartMogulDate(endDate)
				};
		}
	}

	_dateToChartMogulDate(date: Date) : string {
		const month = date.getMonth() + 1;
		const day = date.getDate();
		return `${date.getFullYear()}-${month < 10 ? "0" + month : month}-${day < 10 ? "0" + day : day}`;
	}

	apiCall(query: ChartMogulMetricsRequestQuery, url: string): { entries: ChartMogulEntries } {
		const headers = {};
		if (this.accountToken && this.secret) {
			headers["Authorization"] = "Basic " + 
				Utilities.base64Encode(this.accountToken + ":" + this.secret)
		}

		const options = { 
			headers,
		};

		var tries = this.RETRIES;
		while (tries > 0) {
			try {
				const response = UrlFetchApp.fetch(url.addQuery(query), options);
				const json = JSON.parse(response.getContentText());
				return json;
			} catch (e) {
				console.error(e);
				console.error(<any>'Request to ChartMogul failed.');
				tries--;
			}
		}
		throw `Failed to complete fetch from ChartMogul after ${this.RETRIES} attempts. Account Token: ${this.accountToken}, URL: ${url}`;
	}
};